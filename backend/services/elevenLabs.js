const axios = require('axios');
const Call = require('../models/Call');
const { Op } = require('sequelize');

const ELEVEN_LABS_API_URL = 'https://api.elevenlabs.io/v1';
const API_KEY = process.env.ELEVEN_LABS_API_KEY;

class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVEN_LABS_API_KEY;
    this.isSyncing = false;
  }

  /**
   * Fetches conversations from Eleven Labs API
   * @param {number} pageSize 
   * @param {string} cursor 
   */
  async fetchConversations(pageSize = 100, cursor = null) {
    if (!this.apiKey) {
      console.warn('Eleven Labs API Key is missing. Skipping sync.');
      return { conversations: [], has_more: false, next_cursor: null };
    }

    try {
      const params = { page_size: pageSize };
      if (cursor) params.cursor = cursor;

      const response = await axios.get(`${ELEVEN_LABS_API_URL}/convai/conversations`, {
        headers: { 'xi-api-key': this.apiKey },
        params
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching conversations from Eleven Labs:', error.message);
      throw error;
    }
  }

  /**
   * Fetches details for a specific conversation including audio and transcript
   * @param {string} conversationId 
   */
  async fetchConversationDetails(conversationId) {
    if (!this.apiKey) return null;

    try {
      const response = await axios.get(`${ELEVEN_LABS_API_URL}/convai/conversations/${conversationId}`, {
        headers: { 'xi-api-key': this.apiKey }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching details for conversation ${conversationId}:`, error.message);
      return null;
    }
  }

  /**
   * Processes a single conversation and saves/updates it in the database
   * @param {Object} conversation 
   */
  async processConversation(conversation) {
    try {
      // Check if call already exists
      const existingCall = await Call.findOne({ where: { external_id: conversation.conversation_id } });
      if (existingCall) {
        // Optional: Update status if changed
        return;
      }

      // Fetch full details for transcription and analysis
      const details = await this.fetchConversationDetails(conversation.conversation_id);
      
      let transcriptionText = '';
      if (details && details.transcript) {
        transcriptionText = details.transcript.map(t => `${t.role}: ${t.message}`).join('\n');
      }

      // Determine sentiment based on duration and success (heuristic) or analysis if available
      // Real implementation would use LLM or sentiment analysis API
      const sentiment = conversation.call_successful === 'success' ? 'positive' : 'neutral';

      await Call.create({
        external_id: conversation.conversation_id,
        agent_id: conversation.agent_id,
        caller_number: 'Hidden', // Eleven Labs might not expose caller number directly in all endpoints
        duration: conversation.duration_secs || 0,
        status: conversation.status === 'completed' ? 'completed' : 'missed',
        transcription: transcriptionText,
        audio_url: details?.audio_url || null, // Assuming API returns a signed URL or we construct it
        timestamp: new Date(conversation.start_time_unix_secs * 1000),
        sentiment: sentiment,
        source: 'ElevenLabs'
      });

      console.log(`Saved new call: ${conversation.conversation_id}`);
    } catch (error) {
      console.error(`Error processing conversation ${conversation.conversation_id}:`, error.message);
    }
  }

  /**
   * Main sync function to be called periodically
   */
  async syncCalls() {
    if (this.isSyncing) {
      console.log('Sync already in progress. Skipping.');
      return;
    }

    this.isSyncing = true;
    console.log('Starting Eleven Labs sync...');

    try {
      let hasMore = true;
      let cursor = null;

      while (hasMore) {
        const data = await this.fetchConversations(100, cursor);
        const conversations = data.conversations || [];
        
        if (conversations.length === 0) break;

        for (const conv of conversations) {
          await this.processConversation(conv);
        }

        hasMore = data.has_more;
        cursor = data.next_cursor;

        // Safety break for now to avoid infinite loops in dev
        if (!cursor) break;
      }

      console.log('Eleven Labs sync completed successfully.');
    } catch (error) {
      console.error('Eleven Labs sync failed:', error.message);
    } finally {
      this.isSyncing = false;
    }
  }
}

module.exports = new ElevenLabsService();
