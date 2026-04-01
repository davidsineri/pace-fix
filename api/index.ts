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

// ========== AI PLANNER SERVERLESS ==========
app.post('/api/ai-planner', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const apiKey = process.env.GROQ_API_KEY || '';
    
    if (!apiKey) {
      return res.status(500).json({ error: "Groq API key is not configured" });
    }
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }]
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);
      return res.status(response.status).json({ error: data.error?.message || "AI error", details: data });
    }

    const text = data.choices?.[0]?.message?.content || '';
    // Maintain compatibility with the expected frontend format
    return res.status(200).json({ candidates: [{ content: { parts: [{ text }] } }] });
  } catch (err: any) {
    console.error("AI Planner error:", err);
    return res.status(500).json({ error: "Failed to generate AI response" });
  }
});

// ========== PRODUCTS ==========
app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.json([
      { id: 'p1', name: 'Kopi Papua', price: 85000, image_url: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=400' },
      { id: 'p2', name: 'Batik Cendrawasih', price: 450000, image_url: 'https://cdn2.gnfi.net/gnfi/uploads/articles/batik-papua-motif-cenderraswasi-bed863376f5d9a5a020e311bf8b34441.jpg' },
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

// ========== PAYMENTS ==========
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

// ========== COMMUNITY ==========
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

// ========== ORDERS ==========
app.get('/api/orders', async (req, res) => {
  try {
    const { userId } = req.query;
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId as string)
      .order('created_at', { ascending: false });
    
    // For each order, try to get items
    const ordersWithItems = await Promise.all((data || []).map(async (order: any) => {
      try {
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);
        return { ...order, items: items || order.items || [] };
      } catch {
        return { ...order, items: order.items || [] };
      }
    }));
    
    res.json(ordersWithItems);
  } catch (error) { res.json([]); }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { userId, items, total, status, shippingMethod, destinationCity, shippingCost, tipAmount } = req.body;
    const orderId = `PACE-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    // Insert order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        user_id: userId,
        total: total,
        status: status || 'MENUNGGU_PEMBAYARAN',
        items: items,
        shipping_method: shippingMethod || null,
        destination_city: destinationCity || null,
        shipping_cost: shippingCost || 0,
        tip_amount: tipAmount || 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (orderError) {
      // Fallback: try simpler insert
      await supabase.from('orders').insert({
        user_id: userId,
        total: total,
        status: status || 'MENUNGGU_PEMBAYARAN',
        items: items,
        created_at: new Date().toISOString()
      });
      return res.json({ success: true, order_id: orderId });
    }
    
    res.json({ success: true, order_id: orderData?.id || orderId });
  } catch (error) {
    handleError(res, error, "Order error");
  }
});

// ========== PAYMENT PROOF ==========
app.patch('/api/orders/:id/proof', async (req, res) => {
  try {
    const { id } = req.params;
    const { proof_image } = req.body; // base64 string
    
    if (!proof_image) {
      return res.status(400).json({ error: 'Bukti bayar diperlukan' });
    }

    const { error } = await supabase
      .from('orders')
      .update({ 
        proof_url: proof_image,
        status: 'MENUNGGU_KONFIRMASI',
        proof_uploaded_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    handleError(res, error, "Upload proof error");
  }
});

// ========== ORDER STATUS UPDATE ==========
app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reject_reason } = req.body;
    
    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    };
    
    if (reject_reason) {
      updateData.reject_reason = reject_reason;
    }
    
    if (status === 'DIBAYAR') {
      updateData.verified_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    handleError(res, error, "Status update error");
  }
});

// ========== ADMIN: GET ALL ORDERS (with filter) ==========
app.get('/api/admin/orders', async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status as string);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (error) { res.json([]); }
});

// ========== ADMIN: MARK PAID TO SELLER ==========
app.patch('/api/admin/orders/:id/mark-paid', async (req, res) => {
  try {
    const { id } = req.params;
    const { transfer_note } = req.body || {};
    
    // Get order to calculate commission
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !order) {
      return res.status(404).json({ error: 'Order tidak ditemukan' });
    }
    
    const total = order.total || 0;
    const shippingCost = order.shipping_cost || 0;
    const subtotal = total - shippingCost; // Subtotal produk saja
    const commission = Math.round(subtotal * 0.10); // 10% komisi dari SUBTOTAL (bukan total)
    const sellerAmount = total - commission; // Seller terima total dikurangi komisi
    
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'SELESAI',
        seller_paid_at: new Date().toISOString(),
        seller_amount: sellerAmount,
        pace_commission: commission,
        transfer_note: transfer_note || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
    res.json({ success: true, sellerAmount, commission, subtotal, shippingCost });
  } catch (error) {
    handleError(res, error, "Mark paid error");
  }
});

export default app;
