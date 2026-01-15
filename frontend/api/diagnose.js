
import axios from 'axios';

export default async function handler(req, res) {
  const VOXIMPLANT_API_URL = 'https://api.voximplant.com/platform_api';
  const accountId = process.env.VOXIMPLANT_ACCOUNT_ID;
  const apiKey = process.env.VOXIMPLANT_API_KEY;

  const report = {
    timestamp: new Date().toISOString(),
    configuration: {
      account_id_present: !!accountId,
      api_key_present: !!apiKey,
      api_url: VOXIMPLANT_API_URL
    },
    tests: {
      healthcheck: { status: 'pending', details: null },
      history: { status: 'pending', details: null },
      real_time: { status: 'skipped', details: 'Requires manual call initiation' }
    }
  };

  if (!accountId || !apiKey) {
    report.configuration.error = 'Missing Voximplant credentials';
    return res.status(500).json(report);
  }

  try {
    // 1. Healthcheck (GetAccountInfo)
    try {
      const healthParams = { account_id: accountId, api_key: apiKey };
      const healthRes = await axios.get(`${VOXIMPLANT_API_URL}/GetAccountInfo`, { params: healthParams });
      
      if (healthRes.data && healthRes.data.result) {
        report.tests.healthcheck.status = 'success';
        report.tests.healthcheck.details = 'Connection established, account info retrieved';
      } else {
        report.tests.healthcheck.status = 'failed';
        report.tests.healthcheck.details = healthRes.data;
      }
    } catch (err) {
      report.tests.healthcheck.status = 'error';
      report.tests.healthcheck.details = err.message;
    }

    // 2. History Check (GetCallHistory)
    try {
      const historyParams = {
        account_id: accountId,
        api_key: apiKey,
        count: 1,
        with_records: false
      };
      const historyRes = await axios.get(`${VOXIMPLANT_API_URL}/GetCallHistory`, { params: historyParams });
      
      if (historyRes.data && historyRes.data.result) {
        report.tests.history.status = 'success';
        report.tests.history.details = `Retrieved ${historyRes.data.result.length} records. Total count: ${historyRes.data.count}`;
        report.tests.history.sample_data = historyRes.data.result[0] || 'No calls found';
      } else {
        report.tests.history.status = 'failed';
        report.tests.history.details = historyRes.data;
      }
    } catch (err) {
      report.tests.history.status = 'error';
      report.tests.history.details = err.message;
    }

    res.status(200).json(report);

  } catch (error) {
    res.status(500).json({ 
      message: 'Diagnostic tool failed', 
      error: error.message,
      report 
    });
  }
}
