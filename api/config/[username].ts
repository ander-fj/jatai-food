import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

// Inicializar Firebase Admin (apenas uma vez)
if (!getApps().length) {
  try {
    // Em produção, use as credenciais do Firebase Admin SDK
    // Por enquanto, vamos usar a configuração padrão
    initializeApp({
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://jataifood-default-rtdb.firebaseio.com'
    });
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin:', error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Permitir apenas GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username } = req.query;
    
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Buscar configuração do Firebase
    const db = getDatabase();
    const configRef = db.ref(`tenants/${username}/whatsappConfig`);
    const snapshot = await configRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    const config = snapshot.val();

    // Não retornar a chave da API por segurança
    const safeConfig = {
      phoneNumber: config.phoneNumber,
      isActive: config.isActive,
      webhookUrl: config.webhookUrl,
      hasGeminiKey: !!config.geminiApiKey
    };

    return res.status(200).json(safeConfig);

  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
