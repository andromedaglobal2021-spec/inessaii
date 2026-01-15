const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Call = sequelize.define('Call', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  caller_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER, // in seconds
    allowNull: false
  },
  status: {
    type: DataTypes.STRING, // e.g., 'completed', 'missed'
    defaultValue: 'completed'
  },
  transcription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  audio_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  sentiment: {
    type: DataTypes.STRING, // 'positive', 'neutral', 'negative'
    allowNull: true
  },
  source: {
    type: DataTypes.STRING, // 'Voxiplan', 'ElevenLabs'
    allowNull: true
  },
  external_id: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  agent_id: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = Call;
