import axios from 'axios';

const VOXIMPLANT_API_URL = 'https://api.voximplant.com/platform_api';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const accountId = process.env.VOXIMPLANT_ACCOUNT_ID;
  const apiKey = process.env.VOXIMPLANT_API_KEY;

  if (!accountId || !apiKey) {
    // Return mock balance for demo if keys are missing
    return res.status(200).json({ balance: 0, currency: 'RUB' });
  }

  try {
    const params = {
      account_id: accountId,
      api_key: apiKey
    };

    const response = await axios.get(`${VOXIMPLANT_API_URL}/GetAccountInfo`, { params });

    if (response.data && response.data.result) {
      return res.status(200).json({
        balance: response.data.result.balance,
        currency: response.data.result.currency
      });
    }

    res.status(200).json({ balance: 0, currency: 'RUB' });
  } catch (error) {
    console.error('Error fetching Voximplant balance:', error);
    res.status(500).json({ message: 'Error fetching balance' });
  }
}
