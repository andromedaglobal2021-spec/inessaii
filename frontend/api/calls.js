import axios from 'axios';

const VOXIMPLANT_API_URL = 'https://api.voximplant.com/platform_api';
const ELEVEN_LABS_API_URL = 'https://api.elevenlabs.io/v1';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { search, status, from_date, to_date } = req.query;

  try {
    const voximplantCalls = await fetchVoximplantCalls(from_date, to_date);
    const elevenLabsCalls = await fetchElevenLabsCalls(); // TODO: Implement date filtering for ElevenLabs too if needed

    let allCalls = [...voximplantCalls, ...elevenLabsCalls];

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      allCalls = allCalls.filter(call => 
        (call.caller_number && call.caller_number.toLowerCase().includes(searchLower)) ||
        (call.transcription && call.transcription.toLowerCase().includes(searchLower))
      );
    }

    // Filter by status
    if (status && status !== 'all') {
      allCalls = allCalls.filter(call => call.status === status);
    }

    // Sort by timestamp descending
    allCalls.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json(allCalls);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}

async function fetchVoximplantCalls(fromDateStr, toDateStr) {
  const accountId = process.env.VOXIMPLANT_ACCOUNT_ID;
  const apiKey = process.env.VOXIMPLANT_API_KEY;

  if (!accountId || !apiKey) {
    console.warn('Voximplant credentials missing');
    return [];
  }

  try {
    const params = {
      account_id: accountId,
      api_key: apiKey,
      count: 1000, // Increased limit for real-time fetch
      with_records: true,
      from_date: formatDateForVoximplant(fromDateStr || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    };

    if (toDateStr) {
      params.to_date = formatDateForVoximplant(toDateStr);
    }

    console.log('Fetching Voximplant calls with params:', JSON.stringify(params)); // Debug log

    const response = await axios.get(`${VOXIMPLANT_API_URL}/GetCallHistory`, { params });
    
    if (!response.data || !response.data.result) return [];

    return response.data.result.map(record => ({
      id: `vox-${record.call_session_history_id}`,
      external_id: String(record.call_session_history_id),
      caller_number: record.remote_number || 'Unknown',
      duration: record.duration || 0,
      status: (record.duration > 0 && record.successful !== false) ? 'completed' : 'missed',
      transcription: null,
      audio_url: record.record_url || null,
      cost: record.cost || 0,
      timestamp: new Date(record.start_date + 'Z').toISOString(), // Ensure UTC if missing
      sentiment: (record.duration > 0 && record.successful !== false) ? 'neutral' : 'negative',
      source: 'Voximplant'
    }));
  } catch (error) {
    console.error('Voximplant fetch error:', error.message);
    return [];
  }
}

function formatDateForVoximplant(isoDateStr) {
  if (!isoDateStr) return undefined;
  // Convert ISO string (2025-01-15T12:00:00.000Z) to YYYY-MM-DD HH:mm:ss
  return isoDateStr.replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

async function fetchElevenLabsCalls() {
  const apiKey = process.env.ELEVEN_LABS_API_KEY;

  if (!apiKey) {
    console.warn('Eleven Labs API Key missing');
    return [];
  }

  try {
    const response = await axios.get(`${ELEVEN_LABS_API_URL}/convai/conversations`, {
      headers: { 'xi-api-key': apiKey },
      params: { page_size: 50 }
    });

    if (!response.data || !response.data.conversations) return [];

    // Limit to recent 20 calls to avoid rate limits and timeouts
    const recentConversations = response.data.conversations.slice(0, 20);

    const detailedCalls = await Promise.all(recentConversations.map(async (conv) => {
      try {
        const detailResponse = await axios.get(`${ELEVEN_LABS_API_URL}/convai/conversations/${conv.conversation_id}`, {
          headers: { 'xi-api-key': apiKey }
        });
        const details = detailResponse.data;
        
        // Format transcript
        const transcriptText = details.transcript 
          ? details.transcript.map(msg => `${msg.role === 'agent' ? 'Agent' : 'User'}: ${msg.message}`).join('\n')
          : 'No transcript available';

        // Get summary
        const summary = details.analysis && details.analysis.transcript_summary 
          ? details.analysis.transcript_summary 
          : 'No summary available';

        return {
          id: `el-${conv.conversation_id}`,
          external_id: conv.conversation_id,
          caller_number: 'Hidden', // Eleven Labs often hides this
          duration: conv.duration_secs || 0,
          status: conv.status === 'completed' ? 'completed' : 'missed',
          transcription: transcriptText,
          summary: summary,
          audio_url: `${ELEVEN_LABS_API_URL}/convai/conversations/${conv.conversation_id}/audio`, // Audio endpoint
          timestamp: new Date(conv.start_time_unix_secs * 1000).toISOString(),
          sentiment: conv.call_successful === 'success' ? 'positive' : 'neutral',
          source: 'ElevenLabs'
        };
      } catch (err) {
        console.error(`Failed to fetch details for conversation ${conv.conversation_id}:`, err.message);
        // Fallback to basic info if detail fetch fails
        return {
          id: `el-${conv.conversation_id}`,
          external_id: conv.conversation_id,
          caller_number: 'Hidden',
          duration: conv.duration_secs || 0,
          status: (conv.status === 'completed' || conv.status === 'success' || conv.duration_secs > 0) ? 'completed' : 'missed',
          transcription: 'Failed to load details',
          summary: 'Failed to load details',
          audio_url: `/api/audio?conversation_id=${conv.conversation_id}`,
          timestamp: new Date(conv.start_time_unix_secs * 1000).toISOString(),
          sentiment: conv.call_successful === 'success' ? 'positive' : 'neutral',
          source: 'ElevenLabs'
        };
      }
    }));

    return detailedCalls;
  } catch (error) {
    console.error('Eleven Labs fetch error:', error.message);
    return [];
  }
}
