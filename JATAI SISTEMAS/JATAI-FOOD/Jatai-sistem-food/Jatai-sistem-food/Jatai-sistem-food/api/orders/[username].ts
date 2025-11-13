import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

// Inicializar Firebase Admin (apenas uma vez)
if (!getApps().length) {
  try {
    initializeApp({
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://jataifood-default-rtdb.firebaseio.com'
    });
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin:', error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Permitir apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username } = req.query;
    
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    const orderData = req.body;

    if (!orderData || !orderData.trackingCode) {
      return res.status(400).json({ error: 'Invalid order data' });
    }

    // Salvar pedido no Firebase
    const db = getDatabase();
    const ordersRef = db.ref(`tenants/${username}/orders`);
    const newOrderRef = ordersRef.push();
    
    await newOrderRef.set({
      ...orderData,
      id: newOrderRef.key,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return res.status(201).json({
      success: true,
      orderId: newOrderRef.key,
      trackingCode: orderData.trackingCode
    });

  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
