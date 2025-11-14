import React, { useState, useEffect } from 'react';
import { MessageCircle, Save, CheckCircle, Phone } from 'lucide-react';
import { database } from '../config/firebase';
import { ref, set, get } from 'firebase/database';
import { toast } from 'sonner';

const WhatsAppRealConfig: React.FC = () => {
  const username = localStorage.getItem('username') || 'A';
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const accessToken = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN;

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const configRef = ref(database, `whatsapp_config/${username}`);
      const snapshot = await get(configRef);

      if (snapshot.exists()) {
        const config = snapshot.val();
        setPhoneNumberId(config.phoneNumberId || '');
        setVerifyToken(config.verifyToken || '');
        setIsConfigured(true);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const saveConfig = async () => {
    if (!phoneNumberId.trim()) {
      toast.error('Preencha o ID do número de telefone');
      return;
    }

    setIsSaving(true);
    try {
      const configRef = ref(database, `whatsapp_config/${username}`);
      await set(configRef, {
        accessToken,
        phoneNumberId: phoneNumberId.trim(),
        verifyToken: verifyToken.trim() || 'meu_token_verificacao',
        configuredAt: Date.now()
      });

      const statusRef = ref(database, `tenants/${username}/whatsapp/status`);
      await set(statusRef, 'connected');

      setIsConfigured(true);
      toast.success('WhatsApp configurado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    if (!phoneNumberId) {
      toast.error('Configure o WhatsApp primeiro');
      return;
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Conexão OK! Número: ${data.display_phone_number}`);
      } else {
        const error = await response.json();
        toast.error(`Erro: ${error.error?.message || 'Falha na conexão'}`);
      }
    } catch (error) {
      toast.error('Erro ao testar conexão');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Configuração do WhatsApp Business API</h2>
            <p className="text-gray-600">Configure sua integração com a API oficial do WhatsApp</p>
          </div>
        </div>

        {isConfigured && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-semibold">WhatsApp já configurado e ativo!</span>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Access Token (já configurado)
            </label>
            <input
              type="password"
              value={accessToken}
              disabled
              className="w-full px-4 py-3 bg-gray-100 border rounded-lg text-gray-500 cursor-not-allowed"
            />
            <p className="mt-2 text-sm text-gray-600">
              Token configurado nas variáveis de ambiente
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Phone Number ID *
            </label>
            <input
              type="text"
              placeholder="Ex: 123456789012345"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <p className="mt-2 text-sm text-gray-600">
              Encontre em: Meta for Developers → WhatsApp → API Setup → Phone Number ID
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Verify Token (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: meu_token_verificacao"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <p className="mt-2 text-sm text-gray-600">
              Token para verificar o webhook (use qualquer texto)
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">URL do Webhook:</h3>
            <code className="block bg-white px-3 py-2 rounded border text-sm text-gray-800 break-all">
              {import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook
            </code>
            <p className="mt-2 text-sm text-blue-700">
              Configure esta URL no painel do Meta for Developers
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={saveConfig}
              disabled={isSaving || !phoneNumberId}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 font-semibold"
            >
              <Save className="w-5 h-5" />
              {isSaving ? 'Salvando...' : 'Salvar Configuração'}
            </button>

            <button
              onClick={testConnection}
              disabled={!phoneNumberId}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2 font-semibold"
            >
              <Phone className="w-5 h-5" />
              Testar Conexão
            </button>
          </div>
        </div>

        <div className="mt-8 border-t pt-6">
          <h3 className="font-semibold text-gray-900 mb-3">Como obter o Phone Number ID:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Acesse <a href="https://developers.facebook.com" target="_blank" className="text-blue-600 hover:underline">Meta for Developers</a></li>
            <li>Vá em "Meus Apps" e selecione seu app WhatsApp</li>
            <li>No menu lateral, clique em "WhatsApp" → "API Setup"</li>
            <li>Copie o "Phone Number ID" (não é o número de telefone)</li>
            <li>Cole aqui e clique em "Salvar Configuração"</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppRealConfig;
