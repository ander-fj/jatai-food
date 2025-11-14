import React, { useState, useEffect } from 'react';
import { MessageCircle, Save, CheckCircle, AlertCircle, Phone, Link, Building, Clock, MessageSquare, MapPin, KeyRound, Copy, CheckCheck, ExternalLink, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { database } from '../config/firebase';
import { ref, set, get } from 'firebase/database';

interface WhatsAppBusinessConfig {
  tenantId: string;
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  webhookVerifyToken: string;
  isActive: boolean;
  restaurantName: string;
  menuUrl: string;
  hours: string;
  address: string;
  welcomeMessage: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const WhatsAppBusinessSection: React.FC = () => {
  const username = localStorage.getItem('username') || 'A';
  const [config, setConfig] = useState<Partial<WhatsAppBusinessConfig>>({
    tenantId: username,
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    webhookVerifyToken: '',
    isActive: false,
    restaurantName: '',
    menuUrl: '',
    hours: '',
    address: '',
    welcomeMessage: 'Olá! Bem-vindo ao nosso atendimento automático. Como posso ajudar?'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [username]);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const configRef = ref(database, `tenants/${username}/whatsappBusinessConfig`);
      const snapshot = await get(configRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        setConfig(prev => ({ ...prev, ...data }));
        setIsConnected(data.isActive || false);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickSetup = () => {
    const token = 'EAATJ10ButJwBP4QZAwUo8DtOKLHG77pTM1OgtIEqqpS9EbpdC1q12vM0QvbYKZCqWaRMxOA6IlQvjWJgquU1QNTCRJgdiUSJOF2o5LmugyAoiXJa5xCJKpj4nfNYD0xr0zqzAA1ysScJCoSQjSgNLY9VrGK6QkzlYsmYrtnazfVyG7H6m68YEtHCkbbzt8';
    
    setConfig(prev => ({
      ...prev,
      accessToken: token,
      restaurantName: 'Restaurante Demo',
      welcomeMessage: 'Olá! Bem-vindo ao nosso atendimento automático. Como posso ajudar?'
    }));
    
    toast.success('Token configurado! Agora adicione o Phone Number ID');
  };

  const saveConfig = async () => {
    if (!username) {
      toast.error('Usuário não identificado');
      return;
    }

    if (!config.accessToken) {
      toast.error('Por favor, insira o token de acesso');
      return;
    }

    if (!config.phoneNumberId) {
      toast.error('Por favor, insira o Phone Number ID');
      return;
    }

    setIsSaving(true);
    try {
      const webhookToken = config.webhookVerifyToken || Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      
      const dataToSave = {
        tenantId: username,
        accessToken: config.accessToken,
        phoneNumberId: config.phoneNumberId,
        businessAccountId: config.businessAccountId || '',
        webhookVerifyToken: webhookToken,
        isActive: config.isActive !== false,
        restaurantName: config.restaurantName || '',
        menuUrl: config.menuUrl || '',
        hours: config.hours || '',
        address: config.address || '',
        welcomeMessage: config.welcomeMessage || 'Olá! Bem-vindo ao nosso atendimento automático.',
        updatedAt: new Date().toISOString()
      };

      const configRef = ref(database, `tenants/${username}/whatsappBusinessConfig`);
      await set(configRef, dataToSave);

      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-save-config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify(dataToSave)
        });

        if (response.ok) {
          toast.success('✅ Configurações salvas com sucesso!');
        } else {
          toast.success('Configurações salvas!');
        }
      } catch (err) {
        toast.success('Configurações salvas!');
      }

      setConfig(prev => ({ ...prev, webhookVerifyToken: webhookToken, isActive: true }));
      setIsConnected(true);
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    if (!config.accessToken || !config.phoneNumberId) {
      toast.error('Configure o token e Phone Number ID primeiro');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${config.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${config.accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(`✅ Conexão bem-sucedida! Número: ${data.display_phone_number}`);
        setIsConnected(true);
      } else {
        const error = await response.json();
        toast.error(`❌ Erro: ${error.error?.message || 'Verifique suas credenciais'}`);
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      toast.error('Erro ao testar conexão com WhatsApp API');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (isActive: boolean) => {
    const newConfig = { ...config, isActive };
    setConfig(newConfig);

    try {
      const activeRef = ref(database, `tenants/${username}/whatsappBusinessConfig/isActive`);
      await set(activeRef, isActive);
      toast.success(`Atendimento ${isActive ? 'ativado' : 'desativado'}!`);
      setIsConnected(isActive);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao alterar status do atendimento');
      setConfig({ ...config, isActive: !isActive });
    }
  };

  const copyToClipboard = (text: string, type: 'webhook' | 'token') => {
    navigator.clipboard.writeText(text);
    if (type === 'webhook') {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
    toast.success('Copiado!');
  };

  const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  return (
    <div className="space-y-6">
      {/* Header com Quick Setup */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">WhatsApp Business API</h2>
              <p className="text-green-100">Atendimento automático via API oficial</p>
            </div>
          </div>
          <button
            onClick={quickSetup}
            className="flex items-center gap-2 px-6 py-3 bg-white text-green-600 font-semibold rounded-lg hover:bg-green-50 transition-colors shadow-lg"
          >
            <Zap className="h-5 w-5" />
            Setup Rápido
          </button>
        </div>
      </div>

      {/* Status Card */}
      <div className={`rounded-lg shadow-md p-6 border-2 transition-all ${
        isConnected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${isConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
              {isConnected ? (
                <CheckCheck className="h-8 w-8 text-green-600" />
              ) : (
                <AlertCircle className="h-8 w-8 text-gray-500" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {isConnected ? '✅ Sistema Ativo' : '⚙️ Configure o Sistema'}
              </h3>
              <p className="text-sm text-gray-600">
                {isConnected
                  ? 'WhatsApp Business configurado e funcionando'
                  : 'Preencha os dados abaixo e salve'}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.isActive}
              onChange={(e) => handleToggleActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Credenciais da API</h3>
          <a
            href="https://developers.facebook.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="h-4 w-4" />
            Meta for Developers
          </a>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <KeyRound className="h-4 w-4" />
            Access Token *
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={config.accessToken || ''}
              onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
              placeholder="Cole seu Access Token aqui"
              className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 font-sans"
            >
              {showToken ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Phone className="h-4 w-4" />
            Phone Number ID *
          </label>
          <input
            type="text"
            value={config.phoneNumberId || ''}
            onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
            placeholder="Ex: 123456789012345"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Encontre no Meta for Developers → WhatsApp → API Setup
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={testConnection}
            disabled={isLoading || !config.accessToken || !config.phoneNumberId}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="h-5 w-5" />
            {isLoading ? 'Testando...' : 'Testar Conexão'}
          </button>
        </div>
      </div>

      {/* Webhook Configuration */}
      {config.webhookVerifyToken && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 border-2 border-blue-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Link className="h-5 w-5 text-blue-600" />
            Configuração do Webhook
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Webhook URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={webhookUrl}
                  readOnly
                  className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg font-mono text-sm"
                />
                <button
                  onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {copiedWebhook ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedWebhook ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Verify Token
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.webhookVerifyToken}
                  readOnly
                  className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg font-mono text-sm"
                />
                <button
                  onClick={() => copyToClipboard(config.webhookVerifyToken!, 'token')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {copiedToken ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedToken ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 mt-4">
              <p className="text-sm text-gray-700 mb-2 font-medium">📝 Próximos passos:</p>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Acesse <a href="https://developers.facebook.com/" target="_blank" className="text-blue-600 hover:underline">Meta for Developers</a></li>
                <li>Vá em sua aplicação → WhatsApp → Configuration</li>
                <li>Cole a Webhook URL e o Verify Token acima</li>
                <li>Clique em "Verify and Save"</li>
                <li>Inscreva-se no evento "messages"</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Restaurant Info */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Informações do Negócio</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Building className="h-4 w-4" />
              Nome do Restaurante
            </label>
            <input
              type="text"
              value={config.restaurantName || ''}
              onChange={(e) => setConfig({ ...config, restaurantName: e.target.value })}
              placeholder="Ex: Pizzaria do Zé"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4" />
              Horário de Funcionamento
            </label>
            <input
              type="text"
              value={config.hours || ''}
              onChange={(e) => setConfig({ ...config, hours: e.target.value })}
              placeholder="Seg a Sex: 18h às 23h"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <MapPin className="h-4 w-4" />
            Endereço
          </label>
          <input
            type="text"
            value={config.address || ''}
            onChange={(e) => setConfig({ ...config, address: e.target.value })}
            placeholder="Rua Exemplo, 123"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <MessageSquare className="h-4 w-4" />
            Mensagem de Boas-vindas
          </label>
          <textarea
            value={config.welcomeMessage || ''}
            onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
            placeholder="Olá! Bem-vindo ao nosso atendimento automático."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveConfig}
          disabled={isSaving || !config.accessToken || !config.phoneNumberId}
          className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Save className="h-5 w-5" />
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
};

export default WhatsAppBusinessSection;
