import express from "express";
import cors from "cors";
import axios from "axios";
import { createClient } from '@supabase/supabase-js';
import midtransClient from 'midtrans-client';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || ''
});

function handleError(res: any, error: any, message: string) {
  console.error(message, error);
  return res.status(500).json({ error: message, details: error?.message || error });
}

app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.json([
      { id: 'p1', name: 'Kopi Papua', price: 85000, image_url: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=400' },
      { id: 'p2', name: 'Batik Cendrawasih', price: 450000, image_url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400' },
    ]);
  }
});

app.get('/api/shops', async (req, res) => {
  try {
    const { data, error } = await supabase.from('shops').select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (error) { res.json([]); }
});

app.get('/api/accommodations', async (req, res) => {
  try {
    const { data, error } = await supabase.from('accommodations').select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (error) { res.json([]); }
});

app.get('/api/attractions', async (req, res) => {
  try {
    const { data, error } = await supabase.from('attractions').select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (error) { res.json([]); }
});

app.post('/api/create-payment', async (req, res) => {
  try {
    const { orderId, amount, itemDetails } = req.body;
    const parameter = {
      transaction_details: { order_id: orderId, gross_amount: amount },
      item_details: itemDetails
    };
    const transaction = await snap.createTransaction(parameter);
    res.json({ token: transaction.token, redirect_url: transaction.redirect_url });
  } catch (error) {
    handleError(res, error, "Payment error");
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("No API key");
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      { contents: [{ parts: [{ text: message }] }] }
    );
    res.json({ reply: response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'OK' });
  } catch (error) {
    handleError(res, error, "Chat error");
  }
});

app.post('/api/ai-itinerary', async (req, res) => {
  try {
    const { days, interests, budget, origin } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("No API key");
    
    const prompt = `Buat itinerary ${days} hari di Papua, minat ${interests}, budget ${budget}`;
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      { contents: [{ parts: [{ text: prompt }] }] }
    );
    res.json({ itinerary: response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Itinerary' });
  } catch (error) {
    handleError(res, error, "Itinerary error");
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    res.json(data || []);
  } catch (error) { res.json([]); }
});

app.post('/api/posts', async (req, res) => {
  try {
    const { userName, content } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    await supabase.from('posts').insert({ id, user_name: userName || 'Anonim', content });
    res.json({ success: true });
  } catch (error) {
    handleError(res, error, "Post error");
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const { userId } = req.query;
    const { data } = await supabase.from('orders').select('*, order_items(*)').eq('user_id', userId as string);
    res.json(data || []);
  } catch (error) { res.json([]); }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { userId, items, total, status } = req.body;
    await supabase.from('orders').insert({ user_id: userId, total_amount: total, status: status || 'pending' });
    res.json({ success: true });
  } catch (error) {
    handleError(res, error, "Order error");
  }
});

export default app;
