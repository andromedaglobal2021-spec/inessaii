const axios = require('axios');
const Call = require('../models/Call');
const { Op } = require('sequelize');

const VOXIMPLANT_API_URL = 'https://api.voximplant.com/platform_api';

class VoximplantService {
  constructor() {
    this.accountId = process.env.VOXIMPLANT_ACCOUNT_ID;
    this.apiKey = process.env.VOXIMPLANT_API_KEY;
    this.isSyncing = false;
  }

  /**
   * Fetches call history from Voximplant API
   * @param {Date} fromDate 
   * @param {Date} toDate 
   */
  async fetchCallHistory(fromDate, toDate) {
    if (!this.accountId || !this.apiKey) {
      console.warn('Voximplant credentials are missing. Skipping sync.');
      return { result: [] };
    }

    try {
      // Default to last 24 hours if not specified
      const from = fromDate ? fromDate.toISOString().split('T')[0] : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const to = toDate ? toDate.toISOString().split('T')[0] : new Date().toISOString();

      // Voximplant GetCallHistory usually expects timestamps or formatted dates
      // Using standard API params based on documentation patterns
      const params = {
        account_id: this.accountId,
        api_key: this.apiKey,
        from_date: from,
        to_date: to,
        count: 100,
        with_records: true // To get audio URLs if available
      };

      const response = await axios.get(`${VOXIMPLANT_API_URL}/GetCallHistory`, { params });

      return response.data;
    } catch (error) {
      console.error('Error fetching call history from Voximplant:', error.message);
      // Don't throw, just return empty to allow sync to continue gracefully
      return { result: [] };
    }
  }

  /**
   * Processes a single call record and saves/updates it in the database
   * @param {Object} callRecord 
   */
  async processCallRecord(callRecord) {
    try {
      // Check if call already exists
      const existingCall = await Call.findOne({ where: { external_id: String(callRecord.call_session_history_id) } });
      if (existingCall) {
        return;
      }

      // Map Voximplant status to our status
      // Successful if duration > 0 and successful flag is true (if available)
      const isSuccessful = callRecord.duration > 0 && callRecord.successful !== false;
      const status = isSuccessful ? 'completed' : 'missed';
      const sentiment = isSuccessful ? 'neutral' : 'negative'; // Basic heuristic

      await Call.create({
        external_id: String(callRecord.call_session_history_id),
        agent_id: null, // Voximplant might not have "agent" concept in the same way
        caller_number: callRecord.remote_number || 'Unknown',
        duration: callRecord.duration || 0,
        status: status,
        transcription: null, // Voximplant calls might not have transcription by default here
        audio_url: callRecord.record_url || null,
        timestamp: new Date(callRecord.start_date),
        sentiment: sentiment,
        source: 'Voximplant'
      });

      console.log(`Saved new Voximplant call: ${callRecord.call_session_history_id}`);
    } catch (error) {
      console.error(`Error processing Voximplant call ${callRecord.call_session_history_id}:`, error.message);
    }
  }

  /**
   * Main sync function to be called periodically
   */
  async syncCalls() {
    if (this.isSyncing) {
      console.log('Voximplant sync already in progress. Skipping.');
      return;
    }

    this.isSyncing = true;
    console.log('Starting Voximplant sync...');

    try {
      // Sync last 7 days to catch up
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 7);
      
      const data = await this.fetchCallHistory(fromDate);
      const calls = data.result || []; // Voximplant API returns { result: [...] } or similar

      if (calls.length === 0) {
        console.log('No new Voximplant calls found.');
      }

      for (const call of calls) {
        await this.processCallRecord(call);
      }

      console.log('Voximplant sync completed successfully.');
    } catch (error) {
      console.error('Voximplant sync failed:', error.message);
    } finally {
      this.isSyncing = false;
    }
  }
}

module.exports = new VoximplantService();
