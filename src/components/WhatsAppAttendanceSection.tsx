import React, { useState, useEffect } from 'react';
import { MessageCircle, Save, RefreshCw, AlertCircle, Power, Wifi, WifiOff, KeyRound, Building } from 'lucide-react';
import { toast } from 'sonner';
import { ref, set, get } from 'firebase/database';
import { database } from '../config/firebase';

interface WhatsAppConfig {
  isActive: boolean;
  restaurantName?: string;
  phoneNumber?: string;
  menuUrl?: string;
  hours?: string;
  address?: string;
  welcomeMessage?: string;
  geminiApiKey?: string;
  whatsappAccessToken?: string;
  whatsappAccountId?: string;
}

interface ConnectionStatus {
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR' | 'SERVER_OFFLINE';
}

const WHATSAPP_SERVER_URL = import.meta.env.VITE_WHATSAPP_SERVER_URL || 'http://localhost:3001';

console.log('🔧 WhatsApp Server URL:', WHATSAPP_SERVER_URL);

const WhatsAppAttendanceSection: React.FC = () => {
  const username = localStorage.getItem('username') || 'A';
  const [config, setConfig] = useState<WhatsAppConfig>({
    isActive: false,
    restaurantName: '',
    phoneNumber: '',
    menuUrl: '',
    hours: '',
    address: '',
    welcomeMessage: '',
    geminiApiKey: '',
    whatsappAccessToken: 'EAATJ10ButJwBP4QZAwUo8DtOKLHG77pTM1OgtIEqqpS9EbpdC1q12vM0QvbYKZCqWaRMxOA6IlQvjWJgquU1QNTCRJgdiUSJOF2o5LmugyAoiXJa5xCJKpj4nfNYD0xr0zqzAA1ysScJCoSQjSgNLY9VrGK6QkzlYsmYrtnazfVyG7H6m68YEtHCkbbzt8',
    whatsappAccountId: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ status: 'DISCONNECTED' });
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    loadConfig();
    checkConnectionStatus();
  }, [username]);

  const loadConfig = async () => {
    if (!username) return;
    
    setIsLoading(true);
    try {
      const configRef = ref(database, `tenants/${username}/whatsappConfig`);
      const snapshot = await get(configRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        setConfig(prevConfig => ({ ...prevConfig, ...data }));
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      toast.error('Erro ao carregar configurações do WhatsApp');
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!username) return;
    
    if (!config.whatsappAccessToken || !config.whatsappAccountId) {
      toast.error('Por favor, insira o Token de Acesso e a ID da Conta do WhatsApp.');
      return;
    }
    
    setIsSaving(true);
    try {      
      const dataToSave = {
        isActive: config.isActive,
        restaurantName: config.restaurantName || '',
        phoneNumber: config.phoneNumber || '',
        menuUrl: config.menuUrl || '',
        hours: config.hours || '',
        address: config.address || '',
        welcomeMessage: config.welcomeMessage || '',
        geminiApiKey: config.geminiApiKey || '',
        whatsappAccessToken: config.whatsappAccessToken || '',
        whatsappAccountId: config.whatsappAccountId || '',
        updatedAt: new Date().toISOString()
      };
      
      const whatsappConfigRef = ref(database, `tenants/${username}/whatsappConfig`);
      await set(whatsappConfigRef, dataToSave);

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (isActive: boolean) => {
    const newConfig = { ...config, isActive };
    setConfig(newConfig);

    try {
      const activeRef = ref(database, `tenants/${username}/whatsappConfig/isActive`);
      await set(activeRef, isActive);
      toast.success(`Atendimento ${isActive ? 'ativado' : 'desativado'}!`);
    } catch (error) {
      console.error('Erro ao atualizar status de atendimento:', error);
      toast.error('Erro ao alterar status do atendimento.');
      setConfig({ ...config, isActive: !isActive });
    }
  };

  const checkConnectionStatus = async () => {
    if (!username) return;

    try {
      console.log('📡 Verificando status da conexão...');
      const url = `${WHATSAPP_SERVER_URL}/api/whatsapp/status/${username}`;
      console.log('🔗 URL do status:', url);

      const response = await fetch(url);
      console.log('📥 Resposta do status:', response.status, response.ok);

      if (response.ok) {
        const data = await response.json();
<<<<<<< HEAD
        console.log('✅ Status recebido:', data);
        setConnectionStatus(prev => ({
          ...prev,
          status: data.status,
          isConnected: data.status === 'CONNECTED',
          hasQrCode: data.status === 'QR_CODE'
        }));
      } else {
        console.warn('⚠️ Resposta não OK:', response.status);
        const text = await response.text();
        console.log('📄 Resposta:', text);
      }
    } catch (error) {
      console.error('❌ Erro ao verificar status:', error);
      setConnectionStatus({
        status: 'SERVER_OFFLINE',
        isConnected: false,
        hasQrCode: false
      });
    }
  };

  const fetchQrCode = async () => {
    if (!username) return;

    try {
      const url = `${WHATSAPP_SERVER_URL}/api/whatsapp/qr/${username}`;
      console.log('📷 Buscando QR code em:', url);

      const response = await fetch(url);
      console.log('📥 Resposta do QR:', response.status);

      if (response.status === 404) {
        console.log('⏳ QR Code ainda não disponível');
        setQrCode(null);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        console.log('✅ QR Code recebido:', data.success);

        if (data.qr) {
          console.log('🎯 Atualizando QR Code na interface');
          setQrCode(data.qr);
          setConnectionStatus(prev => ({ ...prev, status: 'QR_CODE', hasQrCode: true }));
          toast.success('QR Code gerado! Escaneie com seu WhatsApp');
        } else {
          console.warn('⚠️ QR Code vazio na resposta');
          setQrCode(null);
        }
      } else {
        const text = await response.text();
        console.error('❌ Erro na resposta do QR:', text);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar QR code:', error);
        setConnectionStatus({ status: data.status === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED' });
      } else {
        setConnectionStatus({ status: 'DISCONNECTED' });
      }
    } catch (error) {
      console.error('Servidor offline ou inacessível:', error);
      setConnectionStatus({ status: 'SERVER_OFFLINE' });
    }
  };

  const connectWhatsApp = async () => {
<<<<<<< HEAD
    if (!username) {
      toast.error('Usuário não identificado');
      return;
    }

    console.log('🚀 Iniciando conexão WhatsApp para:', username);
    setIsConnecting(true);
    setQrCode(null);

    try {
      const url = `${WHATSAPP_SERVER_URL}/api/whatsapp/start/${username}`;
      console.log('🔗 URL de conexão:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
    if (!username || !config.whatsappAccessToken || !config.whatsappAccountId) {
      toast.error("Token de Acesso e ID da Conta do WhatsApp são obrigatórios para conectar.");
      return;
    }
    
    setIsConnecting(true);
    setConnectionStatus({ status: 'CONNECTING' });
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/whatsapp/connect/${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accessToken: config.whatsappAccessToken,
          accountId: config.whatsappAccountId 
        }),
      });

      console.log('📥 Resposta da conexão:', response.status);

      if (response.ok) {
<<<<<<< HEAD
        const data = await response.json();
        console.log('✅ Resposta:', data);

        toast.success('Iniciando conexão com WhatsApp...');
        setConnectionStatus({ status: 'INITIALIZING', isConnected: false, hasQrCode: false });

        setTimeout(() => {
          console.log('⏰ Iniciando polling após 2 segundos');
          fetchQrCode();
        }, 2000);
      } else {
        const text = await response.text();
        console.error('❌ Erro na resposta:', text);
        toast.error('Erro ao iniciar conexão: ' + response.status);
      }
    } catch (error) {
      console.error('❌ Erro ao conectar WhatsApp:', error);
      toast.error('Erro ao conectar. Verifique se o servidor está rodando em: ' + WHATSAPP_SERVER_URL);
      setConnectionStatus({ status: 'SERVER_OFFLINE', isConnected: false, hasQrCode: false });
        toast.success('Conexão com WhatsApp estabelecida!');
        setConnectionStatus({ status: 'CONNECTED' });
      } else {
        const errorData = await response.json();
        toast.error(`Erro ao conectar: ${errorData.message || 'Verifique as credenciais e o servidor.'}`);
        setConnectionStatus({ status: 'ERROR' });
      }
    } catch (error) {
      console.error('Erro ao conectar WhatsApp:', error);
      toast.error('Erro ao conectar. Verifique se o servidor está rodando.');
      setConnectionStatus({ status: 'SERVER_OFFLINE' });
    } finally {
      setIsConnecting(false);
    }
  };

  // Adicionado para resolver o conflito, pois a versão remota tinha essa função
  const [qrCode, setQrCode] = useState<string | null>(null);

  const disconnectWhatsApp = async () => {
    if (!username) return;
    
    toast.info('Desconectando WhatsApp...');
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/whatsapp/disconnect/${username}`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success('WhatsApp desconectado com sucesso!');
        setConnectionStatus({ status: 'DISCONNECTED' });
      } else {
        toast.error('Ocorreu um erro no servidor ao tentar desconectar.');
      }
    } catch (error) {
      console.error('Erro ao desconectar WhatsApp:', error);
      toast.error('Não foi possível conectar ao servidor para desconectar.');
    }
  };

  const getStatusText = () => {
    switch (connectionStatus.status) {
      case 'CONNECTED': return 'Conectado';
      case 'CONNECTING': return 'Conectando...';
      case 'ERROR': return 'Erro na conexão';
      case 'SERVER_OFFLINE': return 'Servidor Offline';
      default: return 'Desconectado';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus.status) {
        case 'CONNECTED':
            return <Wifi className="h-8 w-8 text-green-600" />;
        case 'CONNECTING':
            return <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />;
        default:
            return <WifiOff className="h-8 w-8 text-red-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-green-100 rounded-full">
            <MessageCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Atendimento WhatsApp (API Oficial)</h2>
            <p className="text-gray-600">Configure a integração com a API oficial do WhatsApp.</p>
          </div>
        </div>
      </div> 

<<<<<<< HEAD
      {/* Server Offline Alert */}
      {connectionStatus.status === 'SERVER_OFFLINE' && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-3">🚨 Servidor WhatsApp Offline</h3>
              <p className="text-sm text-red-800 mb-3 font-medium">
                O servidor Node.js do WhatsApp não está respondendo. Siga os passos abaixo:
              </p>

              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-800 mb-2">📋 Passo a Passo:</p>
                <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                  <li>Abra um terminal na pasta raiz do projeto</li>
                  <li>Execute: <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">cd server</code></li>
                  <li>Instale as dependências (primeira vez): <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">npm install</code></li>
                  <li>Configure o arquivo <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">.env</code> na pasta server</li>
                  <li>Inicie o servidor: <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">npm start</code></li>
                </ol>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-yellow-800">
                  <strong>⚙️ Configuração necessária:</strong> O arquivo <code className="bg-yellow-100 px-1 rounded">.env</code>
                  deve conter as variáveis Firebase e a porta 3001
                </p>
              </div>

              <div className="bg-gray-100 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-600 mb-1">URL do servidor configurada:</p>
                <code className="text-xs text-gray-800 font-mono break-all">{WHATSAPP_SERVER_URL}</code>
              </div>

              <button
                onClick={checkConnectionStatus}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium shadow-md hover:shadow-lg"
              >
                <RefreshCw className="h-4 w-4" />
                Verificar Conexão Novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status Card */}
      <div className={`rounded-lg shadow-md p-6 border-2 ${
        connectionStatus.isConnected
          ? 'bg-green-50 border-green-200'
      <div className={`rounded-lg shadow-md p-6 border-2 ${
        connectionStatus.status === 'CONNECTED' 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Status: {getStatusText()}
              </h3>
              <p className="text-sm text-gray-600">
                {connectionStatus.status === 'CONNECTED' 
                  ? 'O WhatsApp está conectado e funcionando via API Oficial.' 
                  : connectionStatus.status === 'SERVER_OFFLINE'
                  ? 'Erro de conexão. Verifique se o servidor está rodando.'
                  : 'Conecte seu WhatsApp para começar a receber pedidos.'}
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

<<<<<<< HEAD
        {/* QR Code Display */}
        {connectionStatus.status === 'QR_CODE' && qrCode && (
          <div className="mt-4 p-6 bg-gradient-to-br from-yellow-50 to-green-50 rounded-lg border-2 border-yellow-300 shadow-lg">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="h-6 w-6 text-yellow-600" />
                <h4 className="text-xl font-bold text-gray-800">QR Code Gerado!</h4>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-md mb-4">
                <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64 border-4 border-gray-200 rounded-lg" />
              </div>

              <div className="bg-white rounded-lg p-4 mb-4 max-w-md">
                <p className="text-sm font-semibold text-gray-800 mb-2 text-center">Como conectar:</p>
                <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                  <li>Abra o <strong>WhatsApp</strong> no seu celular</li>
                  <li>Toque em <strong>Menu</strong> ou <strong>Configurações</strong></li>
                  <li>Selecione <strong>Dispositivos conectados</strong></li>
                  <li>Toque em <strong>Conectar um dispositivo</strong></li>
                  <li>Aponte a câmera para o QR Code acima</li>
                </ol>
              </div>

              <div className="flex items-center gap-2 text-yellow-600 animate-pulse">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Aguardando leitura do QR Code...</span>
              </div>
            </div>
          </div>
        )}

        {/* Initializing State */}
        {connectionStatus.status === 'INITIALIZING' && !qrCode && (
          <div className="mt-4 p-6 bg-blue-50 rounded-lg border-2 border-blue-300">
            <div className="flex flex-col items-center">
              <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mb-3" />
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Inicializando WhatsApp...</h4>
              <p className="text-sm text-gray-600 text-center">
                Aguarde enquanto preparamos a conexão. O QR Code será exibido em instantes.
              </p>
            </div>
          </div>
        )}

        {/* Connection Buttons */}
        <div className="mt-4 flex gap-3">
          {connectionStatus.status !== 'CONNECTED' ? (
            <button
              onClick={connectWhatsApp}
<<<<<<< HEAD
              disabled={isConnecting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
              disabled={isConnecting || !config.whatsappAccessToken || !config.whatsappAccountId}
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

      {/* Server Offline Alert (from d62ab94, but removed in favor of the more detailed one from HEAD) */}
      {/* {connectionStatus.status === 'SERVER_OFFLINE' && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900 mb-1">Servidor WhatsApp necessário</h4>
              <p className="text-sm text-yellow-800">
                Para usar esta funcionalidade, você precisa ter o servidor Node.js rodando e configurado para a API Oficial.
              </p>
            </div>
          </div>
        </div>
      )} */}

      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Configurações da API do WhatsApp</h3>
        
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <KeyRound className="h-4 w-4" />
            Token de Acesso (WhatsApp Business)
          </label>
          <input
            type="password"
            value={config.whatsappAccessToken || ''}
            onChange={(e) => setConfig({ ...config, whatsappAccessToken: e.target.value })}
            placeholder="Cole seu token de acesso permanente aqui"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Building className="h-4 w-4" />
            ID da Conta do WhatsApp Business
          </label>
          <input
            type="text"
            value={config.whatsappAccountId || ''}
            onChange={(e) => setConfig({ ...config, whatsappAccountId: e.target.value })}
            placeholder="Cole a ID da sua conta business aqui"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

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
    </div>
  );
};

export default WhatsAppAttendanceSection;