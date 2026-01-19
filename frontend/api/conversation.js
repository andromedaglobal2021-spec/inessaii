import axios from 'axios';

export default async function handler(req, res) {
  const { conversation_id } = req.query;
  const apiKey = process.env.ELEVEN_LABS_API_KEY;

  if (!conversation_id) {
    return res.status(400).json({ error: 'Missing conversation_id' });
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const detailResponse = await axios.get(`https://api.elevenlabs.io/v1/convai/conversations/${conversation_id}`, {
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

    res.status(200).json({
      transcription: transcriptText,
      summary: summary
    });
  } catch (error) {
    console.error('Conversation details error:', error.message);
    res.status(500).json({ error: 'Failed to fetch details' });
  }
}
