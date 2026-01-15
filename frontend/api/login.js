export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { password } = req.body;

  if (password === '1234') {
    return res.status(200).json({ success: true, token: 'vercel-token-12345' });
  } else {
    return res.status(401).json({ success: false, message: 'Invalid password' });
  }
}
