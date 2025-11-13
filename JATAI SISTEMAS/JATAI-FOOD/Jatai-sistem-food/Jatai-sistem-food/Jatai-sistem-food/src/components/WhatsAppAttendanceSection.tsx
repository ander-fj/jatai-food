import React, { useState, useEffect } from 'react';
import { MessageCircle, Save, RefreshCw, CheckCircle, AlertCircle, Phone, Bot, Power, QrCode, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { ref, set, get } from 'firebase/database';
import { database } from '../config/firebase';
import QRCode from 'qrcode';


interface WhatsAppConfig {
  phoneNumber: string;
  isActive: boolean;
  geminiApiKey: string;
  restaurantName?: string;
  welcomeMessage?: string;
  contactPhone?: string;
  address?: string;
  openingHours?: string;
  menuUrl?: string;
}

interface ConnectionStatus {
  status: 'disconnected' | 'initializing' | 'qr_code' | 'authenticated' | 'connected' | 'auth_failure' | 'error';
  isConnected: boolean;
  hasQrCode: boolean;
}

const WHATSAPP_SERVER_URL = import.meta.env.VITE_WHATSAPP_SERVER_URL || 'http://localhost:3001';

const WhatsAppAttendanceSection: React.FC = () => {
  const username = localStorage.getItem('username') || 'A';
  const [config, setConfig] = useState<WhatsAppConfig>({
    phoneNumber: '',
    isActive: false,
    geminiApiKey: '',
    restaurantName: '',
    welcomeMessage: '',
    contactPhone: '',
    address: '',
    openingHours: '',
    menuUrl: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    isConnected: false,
    hasQrCode: false
  });
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    loadConfig();
    checkConnectionStatus();
    
    // Polling para atualizar QR code e status
    const interval = setInterval(() => {
      if (connectionStatus.status === 'qr_code' || connectionStatus.status === 'initializing') {
        fetchQrCode();
      }
      checkConnectionStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [username]);

  const loadConfig = async () => {
    if (!username) return;
    
    setIsLoading(true);
    try {
      const configRef = ref(database, `tenants/${username}/whatsappConfig`);
      const snapshot = await get(configRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        setConfig(data);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      toast.error('Erro ao carregar configurações do WhatsApp');
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    console.log('🔥 SAVE CONFIG CHAMADO!');
    console.log('Username:', username);
    console.log('Config atual:', config);
    
    if (!username) {
      console.log('❌ Username não encontrado!');
      return;
    }
    
    // Validações
    if (!config.phoneNumber) {
      console.log('❌ Número do WhatsApp não preenchido');
      toast.error('Por favor, insira o número do WhatsApp');
      return;
    }
    
    if (!config.geminiApiKey) {
      console.log('❌ Chave do Gemini não preenchida');
      toast.error('Por favor, insira a chave da API do Gemini');
      return;
    }

    console.log('✅ Validações passaram! Iniciando salvamento...');
    setIsSaving(true);
    try {
      const configRef = ref(database, `tenants/${username}/whatsappConfig`);
      console.log('📍 Caminho do Firebase:', `tenants/${username}/whatsappConfig`);
      
      const dataToSave = {
        ...config,
        updatedAt: new Date().toISOString()
      };
      console.log('💾 Dados a salvar:', dataToSave);
      
      await set(configRef, dataToSave);
      
      console.log('✅ Salvo com sucesso no Firebase!');
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
      console.log('🏁 SaveConfig finalizado');
    }
  };

  const handleToggleActive = async (newIsActive: boolean) => {
    if (!username) return;

    if (newIsActive) {
      // Run validations before activating
      if (!config.phoneNumber) {
        toast.error('Por favor, insira o número do WhatsApp antes de ativar.');
        return;
      }
      if (!config.geminiApiKey) {
        toast.error('Por favor, insira a chave da API do Gemini antes de ativar.');
        return;
      }
    }

    const originalIsActive = config.isActive;
    // Optimistic update
    setConfig({ ...config, isActive: newIsActive });

    try {
      const configRef = ref(database, `tenants/${username}/whatsappConfig`);
      const snapshot = await get(configRef);
      const existingConfig = snapshot.val() || {};

      const dataToSave = {
        ...existingConfig,
        ...config,
        isActive: newIsActive,
        updatedAt: new Date().toISOString()
      };

      await set(configRef, dataToSave);
      toast.success(`Atendimento ${newIsActive ? 'ativado' : 'desativado'} com sucesso!`);

    } catch (error) {
      console.error('Erro ao salvar configuração do toggle:', error);
      toast.error('Erro ao salvar configuração.');
      // Rollback on error
      setConfig({ ...config, isActive: originalIsActive });
    }
  };

  const checkConnectionStatus = async () => {
    if (!username) return;
    
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/whatsapp/status/${username}`);
      if (response.ok) {
        const data = await response.json();
        
        // Mapear status do backend para o frontend
        const mappedStatus = {
          ...data,
          status: data.status === 'pending_qr' ? 'qr_code' : data.status,
          hasQrCode: data.status === 'pending_qr' || data.status === 'qr_code',
          isConnected: data.status === 'connected' || data.status === 'authenticated'
        };
        
        setConnectionStatus(mappedStatus);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  const fetchQrCode = async () => {
    if (!username) return;
    
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/whatsapp/qr/${username}`);
      if (response.ok) {
        const data = await response.json();
        if (data.qr) {
          // Backend já envia o QR code como data URL (imagem), não precisa converter
          setQrCode(data.qr);
        } else {
          setQrCode(null);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar QR code:', error);
    }
  };

  const connectWhatsApp = async () => {
    if (!username) return;
    
    setIsConnecting(true);
    setQrCode(null);
    
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/whatsapp/start/${username}`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Iniciando conexão com WhatsApp...');
        
        setConnectionStatus({
          status: 'initializing',
          isConnected: false,
          hasQrCode: false
        });
        
        setTimeout(() => {
          fetchQrCode();
        }, 2000);
      } else {
        toast.error('Erro ao iniciar conexão');
        setIsConnecting(false);
      }
    } catch (error) {
      console.error('Erro ao conectar WhatsApp:', error);
      toast.error('Erro ao conectar WhatsApp');
      setIsConnecting(false);
    }
  };

  const disconnectWhatsApp = async () => {
    if (!username) return;
    
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/whatsapp/disconnect/${username}`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success('WhatsApp desconectado');
        setQrCode(null);
        setConnectionStatus({
          status: 'disconnected',
          isConnected: false,
          hasQrCode: false
        });
      } else {
        toast.error('Erro ao desconectar');
      }
    } catch (error) {
      console.error('Erro ao desconectar WhatsApp:', error);
      toast.error('Erro ao desconectar');
    }
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const getStatusColor = () => {
    switch (connectionStatus.status) {
      case 'connected': return 'green';
      case 'authenticated': return 'blue';
      case 'qr_code': return 'yellow';
      case 'initializing': return 'yellow';
      case 'auth_failure': return 'red';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus.status) {
      case 'connected': return 'Conectado';
      case 'authenticated': return 'Autenticado';
      case 'qr_code': return 'Aguardando leitura do QR Code';
      case 'initializing': return 'Inicializando...';
      case 'auth_failure': return 'Falha na autenticação';
      case 'error': return 'Erro';
      default: return 'Desconectado';
    }
  };

  const getStatusIcon = () => {
    if (connectionStatus.isConnected) {
      return <Wifi className="h-8 w-8 text-green-600" />;
    } else {
      return <WifiOff className="h-8 w-8 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-green-100 rounded-full">
            <MessageCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Atendimento WhatsApp</h2>
            <p className="text-gray-600">Configure a integração com WhatsApp Web e IA Gemini para receber pedidos automaticamente</p>
          </div>
        </div>
      </div>

      {/* Connection Status Card */}
      <div className={`rounded-lg shadow-md p-6 border-2 ${
        connectionStatus.isConnected 
          ? 'bg-green-50 border-green-200' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Status: {getStatusText()}
              </h3>
              <p className="text-sm text-gray-600">
                {connectionStatus.isConnected 
                  ? 'O WhatsApp está conectado e funcionando' 
                  : 'Conecte seu WhatsApp para começar a receber pedidos'}
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

        {/* QR Code Display */}
        {connectionStatus.status === 'qr_code' && qrCode && (
          <div className="mt-4 p-4 bg-white rounded-lg border-2 border-yellow-300">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-3">
                <QrCode className="h-5 w-5 text-yellow-600" />
                <h4 className="text-lg font-semibold text-gray-800">Escaneie o QR Code</h4>
              </div>
              <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64 border-4 border-gray-200 rounded-lg" />
              <p className="text-sm text-gray-600 mt-3 text-center">
                Abra o WhatsApp no seu celular → Dispositivos conectados → Conectar um dispositivo
              </p>
              <div className="flex items-center gap-2 mt-2 text-yellow-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Aguardando leitura...</span>
              </div>
            </div>
          </div>
        )}

        {/* Connection Buttons */}
        <div className="mt-4 flex gap-3">
          {!connectionStatus.isConnected ? (
            <button
              onClick={connectWhatsApp}
              disabled={isConnecting || !config.geminiApiKey}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Power className="h-5 w-5" />
              {isConnecting ? 'Conectando...' : 'Conectar WhatsApp'}
            </button>
          ) : (
            <button
              onClick={disconnectWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
            >
              <Power className="h-5 w-5" />
              Desconectar WhatsApp
            </button>
          )}
        </div>
      </div>

      {/* Configuration Form */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Configurações</h3>
        
        {/* Phone Number */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Phone className="h-4 w-4" />
            Número do WhatsApp
          </label>
          <input
            type="text"
            value={config.phoneNumber}
            onChange={(e) => setConfig({ ...config, phoneNumber: formatPhoneNumber(e.target.value) })}
            placeholder="(64) 99999-9999"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Digite o número do WhatsApp que receberá os pedidos
          </p>
        </div>

        {/* Restaurant Name */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            Nome do Restaurante
          </label>
          <input
            type="text"
            value={config.restaurantName}
            onChange={(e) => setConfig({ ...config, restaurantName: e.target.value })}
            placeholder="Pizzaria do Zé"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Welcome Message */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            Mensagem de boas vindas!
          </label>
          <textarea
            value={config.welcomeMessage}
            onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
            placeholder="Olá! Seja bem-vindo à Pizzaria do Zé. Como posso ajudar?"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Address */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            Endereço
          </label>
          <input
            type="text"
            value={config.address}
            onChange={(e) => setConfig({ ...config, address: e.target.value })}
            placeholder="Rua das Pizzas, 123, Centro"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Opening Hours */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            Horário de atendimento
          </label>
          <input
            type="text"
            value={config.openingHours}
            onChange={(e) => setConfig({ ...config, openingHours: e.target.value })}
            placeholder="Segunda a Sexta, das 18h às 23h"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Contact Phone */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            Telefone de Contato
          </label>
          <input
            type="text"
            value={config.contactPhone}
            onChange={(e) => setConfig({ ...config, contactPhone: e.target.value })}
            placeholder="(64) 99999-9999"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Menu URL */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            Link do Cardápio
          </label>
          <input
            type="text"
            value={config.menuUrl}
            onChange={(e) => setConfig({ ...config, menuUrl: e.target.value })}
            placeholder="https://seucardapio.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={saveConfig}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-5 w-5" />
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Como funciona?</h3>
        <ol className="space-y-2 text-sm text-blue-800">
          <li className="flex gap-2">
            <span className="font-bold">1.</span>
            <span>Configure seu número do WhatsApp acima</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">2.</span>
            <span>Clique em "Salvar Configurações"</span>
          </li>
          
          <li className="flex gap-2">
            <span className="font-bold">3.</span>
            <span>Ative o atendimento usando o botão de toggle</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">4.</span>
            <span>Quando um cliente enviar uma mensagem, a IA Gemini processará o pedido e criará automaticamente no sistema</span>
          </li>
        </ol>
      </div>

    </div>
  );
};

export default WhatsAppAttendanceSection;