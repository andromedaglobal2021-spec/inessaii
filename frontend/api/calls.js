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

async function fetchVoximplantCalls(fromDateStr) {
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
      from_date: fromDateStr || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    };

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
      timestamp: new Date(record.start_date).toISOString(),
      sentiment: (record.duration > 0 && record.successful !== false) ? 'neutral' : 'negative',
      source: 'Voximplant'
    }));
  } catch (error) {
    console.error('Voximplant fetch error:', error.message);
    return [];
  }
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

    // Note: To get full details/transcription, we'd need N+1 calls, 
    // but for list view we'll skip detailed transcript fetch to be fast.
    // We can implement a separate endpoint for call details.
    
    return response.data.conversations.map(conv => ({
      id: `el-${conv.conversation_id}`,
      external_id: conv.conversation_id,
      caller_number: 'Hidden', // Eleven Labs often hides this
      duration: conv.duration_secs || 0,
      status: conv.status === 'completed' ? 'completed' : 'missed',
      transcription: conv.transcript_summary || 'No transcription summary', // Use summary if available
      audio_url: null, // Requires detail fetch
      timestamp: new Date(conv.start_time_unix_secs * 1000).toISOString(),
      sentiment: conv.call_successful === 'success' ? 'positive' : 'neutral',
      source: 'ElevenLabs'
    }));
  } catch (error) {
    console.error('Eleven Labs fetch error:', error.message);
    return [];
  }
}
