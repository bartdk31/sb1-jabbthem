import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from '@supabase/supabase-js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

const PORT = 8080;

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.send('Webhook server is running');
});

app.post('/webhook/shopify', async (req, res) => {
  try {
    console.log('Modtaget Shopify webhook data:', req.body);
    
    if (!req.body.amount && !req.body.Amount) {
      return res.status(400).json({ 
        error: 'Missing amount field',
        receivedBody: req.body 
      });
    }

    const amount = req.body.amount || req.body.Amount;
    console.log('Behandler Shopify revenue:', amount);
    
    // Insert into Supabase
    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        type: 'shopify',
        amount: amount,
        description: 'Shopify Sales',
        user_id: req.body.user_id // This should be provided in the webhook payload
      }]);

    if (error) throw error;
    
    io.emit('newTransaction', {
      type: 'shopify',
      amount: amount,
      date: new Date().toISOString(),
      description: 'Shopify Sales'
    });
    
    res.status(200).json({ 
      message: 'Revenue received',
      amount: amount,
      data
    });
  } catch (error) {
    console.error('Fejl i Shopify webhook:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.post('/webhook/tiktok', async (req, res) => {
  try {
    console.log('Modtaget TikTok webhook data:', req.body);
    
    if (!req.body.amount && !req.body.Amount) {
      return res.status(400).json({ 
        error: 'Missing amount field',
        receivedBody: req.body 
      });
    }

    const amount = req.body.amount || req.body.Amount;
    console.log('Behandler TikTok expense:', amount);
    
    // Insert into Supabase
    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        type: 'tiktok',
        amount: amount,
        description: 'TikTok Ads',
        user_id: req.body.user_id // This should be provided in the webhook payload
      }]);

    if (error) throw error;
    
    io.emit('newTransaction', {
      type: 'tiktok',
      amount: amount,
      date: new Date().toISOString(),
      description: 'TikTok Ads'
    });
    
    res.status(200).json({ 
      message: 'Expense received',
      amount: amount,
      data
    });
  } catch (error) {
    console.error('Fejl i TikTok webhook:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

io.on('connection', (socket) => {
  console.log('Ny klient forbundet:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Klient afbrudt:', socket.id);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server kører på http://localhost:${PORT}`);
  console.log('\nBrug disse endpoints lokalt:');
  console.log(`http://localhost:${PORT}/webhook/shopify - For Shopify indtægter`);
  console.log(`http://localhost:${PORT}/webhook/tiktok - For TikTok udgifter`);
});