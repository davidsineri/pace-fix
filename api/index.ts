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

const OPENROUTER_API_KEY = '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';

async function getAIResponse(prompt: string, systemPrompt?: string) {
  const messages: any[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'google/gemini-2.0-flash-001',
      messages
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.choices?.[0]?.message?.content || '';
}

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
    const reply = await getAIResponse(message, 'Kamu adalah asisten tourism Papua yang helpful.');
    res.json({ reply });
  } catch (error) {
    handleError(res, error, "Chat error");
  }
});

app.post('/api/ai/itinerary', async (req, res) => {
  try {
    const { days, interests, budget, origin } = req.body;
    const prompt = `Buat itinerary perjalanan ${days} hari di Papua Indonesia dengan minat ${interests} dan budget ${budget}${origin ? ` dari ${origin}` : ''}. Berikan detail setiap hari termasuk tempat wisata, aktivitas, makanan lokal, dan tips perjalanan dalam bahasa Indonesia yang menarik.`;
    const itinerary = await getAIResponse(prompt);
    res.json({ itinerary });
  } catch (error) {
    handleError(res, error, "Itinerary error");
  }
});

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, history, productsContext } = req.body;
    let prompt = message;
    if (productsContext?.length > 0) {
      prompt += `\n\nProduk yang tersedia: ${JSON.stringify(productsContext.map((p: any) => ({ id: p.id, name: p.name, price: p.price })))}`;
    }
    const reply = await getAIResponse(prompt, 'Kamu adalah asisten tourism dan ecommerce Papua yang helpful. Jika ada produkContext, rekomendasikan produk yang cocok.');
    res.json({ reply });
  } catch (error) {
    handleError(res, error, "Chat error");
  }
});

app.post('/api/ai/smart-search', async (req, res) => {
  try {
    const { query, products } = req.body;
    const prompt = `Dari produk berikut: ${JSON.stringify(products)}, cari yang cocok dengan "${query}". Berikan ID produk yang cocok dalam format array JSON sederhana, contoh: ["id1","id2"]`;
    const text = await getAIResponse(prompt);
    const ids = text.match(/[""]([^""]+)[""]/g)?.map((s: string) => s.replace(/[""]/g, '')) || [];
    res.json({ ids });
  } catch (error) {
    handleError(res, error, "Search error");
  }
});

app.post('/api/ai/describe-product', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const prompt = `Deskripsikan produk dari gambar ini dalam bahasa Indonesia yang menarik untuk ecommerce.`;
    const description = await getAIResponse(prompt);
    res.json({ description });
  } catch (error) {
    handleError(res, error, "Describe error");
  }
});

app.post('/api/ai/packaging-advice', async (req, res) => {
  try {
    const { question } = req.body;
    const advice = await getAIResponse(question, 'Kamu adalah ahli packaging produk Papua. Berikan advice dalam bahasa Indonesia.');
    res.json({ advice });
  } catch (error) {
    handleError(res, error, "Advice error");
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
