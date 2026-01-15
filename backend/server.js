const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars first
dotenv.config();

const sequelize = require('./database');
const callRoutes = require('./routes/calls');
const Call = require('./models/Call');
const elevenLabsService = require('./services/elevenLabs');
const voximplantService = require('./services/voximplant');

const app = express();
const PORT = process.env.PORT || 3001;

// Schedule periodic sync (every 15 minutes)
const SYNC_INTERVAL_MS = 15 * 60 * 1000;
setInterval(() => {
  elevenLabsService.syncCalls();
  voximplantService.syncCalls();
}, SYNC_INTERVAL_MS);

app.use(cors());
app.use(express.json());

// Add root route to prevent "Cannot GET /" confusion
app.get('/', (req, res) => {
  res.send('Backend Server is running. Please access the frontend at <a href="http://localhost:5173">http://localhost:5173</a>');
});

app.use('/api/calls', callRoutes);

// Manual sync endpoint for ElevenLabs
app.post('/api/sync/elevenlabs', async (req, res) => {
  try {
    await elevenLabsService.syncCalls();
    res.json({ success: true, message: 'ElevenLabs synchronization completed successfully' });
  } catch (error) {
    console.error('Manual sync failed:', error);
    res.status(500).json({ success: false, message: 'Synchronization failed', error: error.message });
  }
});

// Manual sync endpoint for Voximplant
app.post('/api/sync/voximplant', async (req, res) => {
  try {
    await voximplantService.syncCalls();
    res.json({ success: true, message: 'Voximplant synchronization completed successfully' });
  } catch (error) {
    console.error('Manual sync failed:', error);
    res.status(500).json({ success: false, message: 'Synchronization failed', error: error.message });
  }
});

// Mock login route
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === '1234') {
    res.json({ success: true, token: 'mock-token-12345' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid password' });
  }
});

// Seed data function
const seedData = async () => {
  const count = await Call.count();
  if (count === 0) {
    console.log('Seeding data...');
    const calls = [
      { 
        caller_number: '+79991234567', 
        duration: 120, 
        status: 'completed', 
        transcription: 'Здравствуйте, я хотел бы узнать о тарифах. Меня интересует безлимитный интернет и звонки по России. Какие у вас есть предложения?', 
        sentiment: 'neutral', 
        source: 'Voxiplan',
        audio_url: 'https://actions.google.com/sounds/v1/speech/greeting_1.ogg' // Mock audio
      },
      { 
        caller_number: '+79997654321', 
        duration: 45, 
        status: 'completed', 
        transcription: 'Спасибо, до свидания. Все понятно, хорошего дня.', 
        sentiment: 'positive', 
        source: 'ElevenLabs',
        audio_url: 'https://actions.google.com/sounds/v1/speech/goodbye_1.ogg'
      },
      { 
        caller_number: '+79001112233', 
        duration: 0, 
        status: 'missed', 
        transcription: null, 
        sentiment: null, 
        source: 'Voxiplan',
        audio_url: null
      },
      { 
        caller_number: '+79112223344', 
        duration: 300, 
        status: 'completed', 
        transcription: 'У меня проблема с подключением, помогите! Интернет не работает уже второй день, я не могу работать!', 
        sentiment: 'negative', 
        source: 'Voxiplan',
        audio_url: 'https://actions.google.com/sounds/v1/speech/hearing_check.ogg'
      },
      { 
        caller_number: '+79223334455', 
        duration: 180, 
        status: 'completed', 
        transcription: 'Когда будет доставка? Курьер должен был приехать еще час назад.', 
        sentiment: 'neutral', 
        source: 'ElevenLabs',
        audio_url: 'https://actions.google.com/sounds/v1/speech/date_1.ogg'
      },
    ];
    await Call.bulkCreate(calls);
    console.log('Data seeded.');
  }
};

sequelize.sync().then(async () => {
  console.log('Database connected and synced');
  await seedData();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});
