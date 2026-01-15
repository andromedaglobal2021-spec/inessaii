const express = require('express');
const router = express.Router();
const Call = require('../models/Call');
const { Op } = require('sequelize');

// Get all calls with filtering
router.get('/', async (req, res) => {
  try {
    const { search, status, startDate, endDate } = req.query;
    const where = {};

    if (search) {
      where[Op.or] = [
        { caller_number: { [Op.like]: `%${search}%` } },
        { transcription: { [Op.like]: `%${search}%` } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.timestamp = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const calls = await Call.findAll({
      where,
      order: [['timestamp', 'DESC']]
    });

    res.json(calls);
  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    const totalCalls = await Call.count();
    const completedCalls = await Call.count({ where: { status: 'completed' } });
    const missedCalls = await Call.count({ where: { status: 'missed' } });
    
    // Average duration
    const durationSum = await Call.sum('duration');
    const avgDuration = totalCalls > 0 ? durationSum / totalCalls : 0;

    // Sentiment breakdown
    const positive = await Call.count({ where: { sentiment: 'positive' } });
    const neutral = await Call.count({ where: { sentiment: 'neutral' } });
    const negative = await Call.count({ where: { sentiment: 'negative' } });

    res.json({
      totalCalls,
      completedCalls,
      missedCalls,
      avgDuration,
      sentiment: { positive, neutral, negative }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new call (Webhook for Voxiplan/ElevenLabs)
router.post('/', async (req, res) => {
  try {
    const { caller_number, duration, status, transcription, sentiment, source } = req.body;
    const newCall = await Call.create({
      caller_number,
      duration,
      status,
      transcription,
      sentiment,
      source
    });
    res.status(201).json(newCall);
  } catch (error) {
    console.error('Error creating call:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
