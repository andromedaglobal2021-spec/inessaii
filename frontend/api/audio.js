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
    const audioUrl = `https://api.elevenlabs.io/v1/convai/conversations/${conversation_id}/audio`;
    
    const response = await axios.get(audioUrl, {
      headers: { 'xi-api-key': apiKey },
      responseType: 'stream'
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    response.data.pipe(res);
  } catch (error) {
    console.error('Audio proxy error:', error.message);
    res.status(500).json({ error: 'Failed to fetch audio' });
  }
}
