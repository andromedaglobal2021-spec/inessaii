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
    return res.status(200).json({ balance: 0, expenses: 0, currency: 'RUB' });
  }

  try {
    const authParams = {
      account_id: accountId,
      api_key: apiKey
    };

    // 1. Get Balance
    const balanceResponse = await axios.get(`${VOXIMPLANT_API_URL}/GetAccountInfo`, { params: authParams });
    const balance = balanceResponse.data?.result?.balance || 0;
    const currency = balanceResponse.data?.result?.currency || 'RUB';

    // 2. Get Expenses for the current month
    // Determine the start of the current month
    const now = new Date();
    // Format: YYYY-MM-DD HH:mm:ss
    const formatDate = (date) => date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthStr = formatDate(startOfMonth);
    const endOfTodayStr = formatDate(now);

    const historyParams = {
      ...authParams,
      from_date: startOfMonthStr,
      to_date: endOfTodayStr,
      count: 1000 // Ensure we get enough records. Pagination might be needed for heavy usage.
    };

    const historyResponse = await axios.get(`${VOXIMPLANT_API_URL}/GetTransactionHistory`, { params: historyParams });
    
    let expenses = 0;
    if (historyResponse.data && historyResponse.data.result) {
      // Sum up all negative amounts (spendings).
      // Usually transactions are: negative for cost, positive for refill.
      // We want to show "Expenses", so we sum negative values and make them positive.
      expenses = historyResponse.data.result.reduce((acc, tx) => {
        const amount = parseFloat(tx.amount);
        return amount < 0 ? acc + Math.abs(amount) : acc;
      }, 0);
    }

    return res.status(200).json({
      balance: balance,
      expenses: parseFloat(expenses.toFixed(2)),
      currency: currency
    });

  } catch (error) {
    console.error('Error fetching Voximplant data:', error);
    res.status(500).json({ message: 'Error fetching data', error: error.message });
  }
}
