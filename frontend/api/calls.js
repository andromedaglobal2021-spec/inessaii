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
    const elevenLabsResult = await fetchElevenLabsCalls(); 
    const elevenLabsCalls = elevenLabsResult.calls || []; 

    // Merge logic: Match Eleven Labs calls to Voximplant calls based on timestamp
    const mergedCalls = [];
    const usedElevenLabsIds = new Set();

    // 1. Process Voximplant calls and try to find matching Eleven Labs calls
    voximplantCalls.forEach(voxCall => {
      const voxTime = new Date(voxCall.timestamp).getTime();
      
      // Find a matching Eleven Labs call that hasn't been used yet
      // Allowing a buffer of 5 minutes (300000ms) to account for any clock skew or long delays
      const match = elevenLabsCalls.find(elCall => {
        if (usedElevenLabsIds.has(elCall.id)) return false;
        const elTime = new Date(elCall.timestamp).getTime();
        return Math.abs(voxTime - elTime) < 300000; // 5 minutes diff
      });

      if (match) {
        // Merge them
        mergedCalls.push({
          ...voxCall, // Keep Voximplant base data (ID, Number, Cost)
          id: voxCall.id, // Prefer Voximplant ID as primary
          eleven_labs_id: match.id,
          // Enrich with Eleven Labs data
          transcription: match.transcription,
          summary: match.summary,
          audio_url: match.audio_url,
          sentiment: match.sentiment,
          source: 'Voximplant + AI', // Combined source
          has_details: match.has_details,
          external_id: match.external_id // Needed for details fetch
        });
        usedElevenLabsIds.add(match.id);
      } else {
        mergedCalls.push(voxCall);
      }
    });

    // 2. Add remaining Eleven Labs calls that weren't matched
    elevenLabsCalls.forEach(elCall => {
      if (!usedElevenLabsIds.has(elCall.id)) {
        mergedCalls.push(elCall);
      }
    });

    // DIAGNOSTIC: Debug row to check timestamps and counts
    if (mergedCalls.length > 0) {
      const vFirst = voximplantCalls[0] ? new Date(voximplantCalls[0].timestamp).toISOString() : 'N/A';
      const eFirst = elevenLabsCalls[0] ? new Date(elevenLabsCalls[0].timestamp).toISOString() : 'N/A';
      
      mergedCalls.unshift({
        id: 'sys-debug-info',
        caller_number: 'DEBUG INFO',
        duration: 0,
        status: 'missed',
        transcription: `Vox calls: ${voximplantCalls.length}, EL calls: ${elevenLabsCalls.length}\nVox First: ${vFirst}\nEL First: ${eFirst}\nWindow: 4 hours`,
        summary: 'Technical debug info. Please ignore.',
        source: 'System',
        timestamp: new Date().toISOString(),
        sentiment: 'neutral'
      });
    }

    // DIAGNOSTIC: Check if we have missing keys and add a system notification call
    if (voximplantCalls.length === 0 && (!process.env.VOXIMPLANT_ACCOUNT_ID || !process.env.VOXIMPLANT_API_KEY)) {
      mergedCalls.unshift({
        id: 'sys-error-vox',
        caller_number: 'СИСТЕМА',
        duration: 0,
        status: 'missed',
        transcription: 'ОШИБКА: Не настроены ключи Voximplant (VOXIMPLANT_ACCOUNT_ID, VOXIMPLANT_API_KEY). Номера телефонов не могут быть загружены.',
        summary: 'Проверьте настройки Environment Variables в Vercel.',
        source: 'System',
        timestamp: new Date().toISOString(),
        sentiment: 'negative'
      });
    }

    if (elevenLabsCalls.length === 0 && !process.env.ELEVEN_LABS_API_KEY) {
      mergedCalls.unshift({
        id: 'sys-error-el',
        caller_number: 'СИСТЕМА',
        duration: 0,
        status: 'missed',
        transcription: 'ОШИБКА: Не настроен ключ Eleven Labs (ELEVEN_LABS_API_KEY). Звонки ИИ не могут быть загружены.',
        summary: 'Проверьте настройки Environment Variables в Vercel.',
        source: 'System',
        timestamp: new Date().toISOString(),
        sentiment: 'negative'
      });
    }

    let allCalls = mergedCalls;

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      allCalls = allCalls.filter(call => 
        (call.caller_number && call.caller_number.toLowerCase().includes(searchLower)) ||
        (call.transcription && call.transcription.toLowerCase().includes(searchLower)) ||
        (call.summary && call.summary.toLowerCase().includes(searchLower))
      );
    }

    // Filter by status
    if (status && status !== 'all') {
      allCalls = allCalls.filter(call => call.status === status);
    }

    // Filter by date (Client-side for merged list to be safe)
    if (from_date || to_date) {
      const from = from_date ? new Date(from_date).getTime() : 0;
      const to = to_date ? new Date(to_date).getTime() : Infinity;
      allCalls = allCalls.filter(call => {
        const time = new Date(call.timestamp).getTime();
        return time >= from && time <= to;
      });
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

    return response.data.result.map(record => {
      // Deep search for phone number in nested records if top-level is missing
      let phoneNumber = record.remote_number || record.destination_number;
      
      if ((!phoneNumber || phoneNumber === 'Unknown') && record.records && Array.isArray(record.records)) {
        // Try to find a record with a destination number (outbound) or remote number (inbound)
        const recordWithNumber = record.records.find(r => r.destination_number || r.remote_number);
        if (recordWithNumber) {
          phoneNumber = recordWithNumber.destination_number || recordWithNumber.remote_number;
        }
      }

      return {
        id: `vox-${record.call_session_history_id}`,
        external_id: String(record.call_session_history_id),
        caller_number: phoneNumber || 'Unknown',
        duration: record.duration || 0,
        status: (record.duration > 0 && record.successful !== false) ? 'completed' : 'missed',
        transcription: null,
        audio_url: record.record_url || null,
        cost: record.cost || 0,
        timestamp: new Date(record.start_date + 'Z').toISOString(), // Ensure UTC if missing
        sentiment: (record.duration > 0 && record.successful !== false) ? 'neutral' : 'negative',
        source: 'Voximplant'
      };
    });
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
      params: { page_size: 1000 } // Fetch all calls
    });

    if (!response.data || !response.data.conversations) return [];

    const allConversations = response.data.conversations;

    // Map all conversations to standard format without fetching details eagerly
    return allConversations.map(conv => {
      // Use transcript_summary from list response if available
      const summary = conv.transcript_summary || conv.analysis?.transcript_summary || 'No summary available';
      
      return {
        id: `el-${conv.conversation_id}`,
        external_id: conv.conversation_id,
        caller_number: 'Hidden', // Eleven Labs often hides this
        duration: conv.duration_secs || 0,
        status: (conv.status === 'completed' || conv.status === 'success' || conv.duration_secs > 0) ? 'completed' : 'missed',
        transcription: conv.transcript_summary || 'Click expand to load details', // Placeholder
        summary: summary,
        audio_url: `/api/audio?conversation_id=${conv.conversation_id}`, // Use proxy endpoint
        timestamp: new Date(conv.start_time_unix_secs * 1000).toISOString(),
        sentiment: conv.call_successful === 'success' ? 'positive' : 'neutral',
        source: 'ElevenLabs',
        has_details: false // Flag to indicate we need to fetch full details
      };
    });
  } catch (error) {
    console.error('Eleven Labs fetch error:', error.message);
    return [];
  }
}
