import React, { useState, useEffect } from 'react';
import { MessageCircle, Save, RefreshCw, AlertCircle, Phone, Power, QrCode, Wifi, WifiOff, Link, Building, Clock, MessageSquare, MapPin, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { ref, set, get } from 'firebase/database';
import { database } from '../config/firebase';

interface WhatsAppConfig {
  isActive: boolean;
  restaurantName?: string;
  phoneNumber?: string; // Telefone de contato
  menuUrl?: string;
  hours?: string;
  address?: string;
  welcomeMessage?: string;
  geminiApiKey?: string; // Adicionado campo para a chave da API
}


interface ConnectionStatus {
  status: 'DISCONNECTED' | 'INITIALIZING' | 'QR_CODE' | 'AUTHENTICATED' | 'CONNECTED' | 'AUTH_FAILURE' | 'ERROR' | 'SERVER_OFFLINE' | 'NOT_INITIALIZED';
  isConnected: boolean;
  hasQrCode: boolean;
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
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<Partial<ConnectionStatus>>({
    status: 'NOT_INITIALIZED',
    isConnected: false,
    hasQrCode: false
  });
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    loadConfig();
    checkConnectionStatus();
  }, [username]);

  useEffect(() => {
    // Este efeito lida com a lógica de polling (verificação contínua).
    const finalStates = ['CONNECTED', 'DISCONNECTED', 'AUTH_FAILURE', 'ERROR', 'SERVER_OFFLINE', 'NOT_INITIALIZED'];
    if (finalStates.includes(connectionStatus.status!)) {
      return; // Para de verificar se atingiu um estado final.
    }

    const intervalId = setInterval(() => {
      console.log(`Polling... Status atual: ${connectionStatus.status}`);
      if (connectionStatus.status === 'INITIALIZING' || connectionStatus.status === 'QR_CODE') {
        fetchQrCode();
      }
      checkConnectionStatus(); // Continua verificando o status geral.
    }, 3000); // Verifica a cada 3 segundos.

    return () => clearInterval(intervalId);
  }, [username, connectionStatus.status]);

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
    if (!config.phoneNumber && !config.hours && !config.address) {
      console.log('❌ Número do WhatsApp não preenchido');
      toast.error('Por favor, insira o número do WhatsApp');
      return;
    }
    
    console.log('✅ Validações passaram! Iniciando salvamento...');
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
        geminiApiKey: config.geminiApiKey || '', // Salvar a chave da API
        updatedAt: new Date().toISOString()
      };
      
      // Salvar em whatsappConfig
      const whatsappConfigRef = ref(database, `tenants/${username}/whatsappConfig`);
      await set(whatsappConfigRef, dataToSave);

      console.log('💾 Dados a salvar:', dataToSave);
      
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

  const handleToggleActive = async (isActive: boolean) => {
    // Atualiza o estado local imediatamente para feedback visual
    const newConfig = { ...config, isActive };
    setConfig(newConfig);

    // Salva apenas a alteração do 'isActive' no Firebase
    try {
      const activeRef = ref(database, `tenants/${username}/whatsappConfig/isActive`);
      await set(activeRef, isActive);
      toast.success(`Atendimento ${isActive ? 'ativado' : 'desativado'}!`);
      console.log(`✅ Status do atendimento alterado para: ${isActive}`);
    } catch (error) {
      console.error('❌ Erro ao atualizar status de atendimento:', error);
      toast.error('Erro ao alterar status do atendimento.');
      // Reverte a alteração visual em caso de erro
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
    }
  };

  const connectWhatsApp = async () => {
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
      });

      console.log('📥 Resposta da conexão:', response.status);

      if (response.ok) {
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
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWhatsApp = async () => { // Tornando a função async
    if (!username) return;
    
    toast.info('Desconectando WhatsApp...');
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/whatsapp/disconnect/${username}`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success('WhatsApp desconectado com sucesso!');
        setQrCode(null);
        // Atualiza o estado para refletir a desconexão imediatamente
        setConnectionStatus({ status: 'DISCONNECTED', isConnected: false, hasQrCode: false });
      } else {
        toast.error('Ocorreu um erro no servidor ao tentar desconectar.');
      }
    } catch (error) {
      console.error('Erro ao desconectar WhatsApp:', error);
      toast.error('Não foi possível conectar ao servidor para desconectar.');
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
      case 'CONNECTED': return 'green';
      case 'AUTHENTICATED': return 'blue';
      case 'QR_CODE': return 'yellow';
      case 'INITIALIZING': return 'yellow';
      case 'AUTH_FAILURE': return 'red';
      case 'ERROR': return 'red';
      case 'SERVER_OFFLINE': return 'red';
      default: return 'gray';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus.status) {
      case 'CONNECTED': return 'Conectado';
      case 'AUTHENTICATED': return 'Autenticado';
      case 'QR_CODE': return 'Aguardando leitura do QR Code';
      case 'INITIALIZING': return 'Inicializando...';
      case 'AUTH_FAILURE': return 'Falha na autenticação';
      case 'ERROR': return 'Erro na conexão';
      case 'SERVER_OFFLINE': return 'Servidor Offline';
      case 'NOT_INITIALIZED': return 'Não Iniciado';
      default: return 'Desconectado';
    }
  };

  const getStatusIcon = () => {
    if (connectionStatus.isConnected) {
      return <Wifi className="h-8 w-8 text-green-600" />;
    } else {
      return <WifiOff className="h-8 w-8 text-red-500" />;
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

      {/* Server Offline Alert */}
      {connectionStatus.status === 'SERVER_OFFLINE' && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Servidor WhatsApp Offline</h3>
              <p className="text-sm text-red-800 mb-3">
                Não foi possível conectar ao servidor WhatsApp. Verifique:
              </p>
              <ul className="text-sm text-red-800 space-y-1 list-disc list-inside mb-3">
                <li>O servidor Node.js está rodando na pasta "server"</li>
                <li>Execute: <code className="bg-red-100 px-2 py-1 rounded">cd server && npm start</code></li>
                <li>URL do servidor: <code className="bg-red-100 px-2 py-1 rounded">{WHATSAPP_SERVER_URL}</code></li>
              </ul>
              <button
                onClick={checkConnectionStatus}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status Card */}
      <div className={`rounded-lg shadow-md p-6 border-2 ${
        connectionStatus.isConnected
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
                {connectionStatus.isConnected 
                  ? 'O WhatsApp está conectado e funcionando' 
                  : connectionStatus.status === 'SERVER_OFFLINE'
                  ? 'Erro de conexão. Verifique se o servidor Node.js está rodando na pasta "server".'
                  : 'Conecte seu WhatsApp para começar a receber pedidos.'}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.isActive}
              onChange={(e) => handleToggleActive(e.target.checked)} // Corrigido para chamar a função correta
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

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
          {!connectionStatus.isConnected ? (
            <button
              onClick={connectWhatsApp}
              disabled={isConnecting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
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
        
        {/* Nome do Restaurante */}
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

        {/* Phone Number */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Phone className="h-4 w-4" />
            Número do WhatsApp
          </label>
          <input
            type="text"
            value={config.phoneNumber || ''}
            onChange={(e) => setConfig({ ...config, phoneNumber: formatPhoneNumber(e.target.value) })}
            placeholder="(64) 99999-9999"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Digite o número do WhatsApp que receberá os pedidos
          </p>
        </div>

        {/* Horário de Funcionamento */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Clock className="h-4 w-4" />
            Horário de Funcionamento
          </label>
          <input
            type="text"
            value={config.hours || ''}
            onChange={(e) => setConfig({ ...config, hours: e.target.value })}
            placeholder="Seg a Sex: 18h às 23h, Sáb e Dom: 18h às 00h"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Endereço */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <MapPin className="h-4 w-4" />
            Endereço
          </label>
          <input
            type="text"
            value={config.address || ''}
            onChange={(e) => setConfig({ ...config, address: e.target.value })}
            placeholder="Rua das Pizzas, 123, Bairro Saboroso"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Menu URL */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Link className="h-4 w-4" />
            Link do Cardápio/Página de Pedidos
          </label>
          <input
            type="url"
            value={config.menuUrl || ''}
            onChange={(e) => setConfig({ ...config, menuUrl: e.target.value })}
            placeholder="https://seu-site.com/pedido"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Este é o link que o agente enviará quando o cliente pedir o cardápio.
          </p>
        </div>

        {/* Mensagem de Boas-Vindas */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <MessageSquare className="h-4 w-4" />
            Mensagem de Boas-Vindas
          </label>
          <textarea
            value={config.welcomeMessage || ''}
            onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
            placeholder="Olá! Bem-vindo à {restaurantName}. Como posso ajudar?"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">Use {'{restaurantName}'} para inserir o nome do restaurante automaticamente.</p>
        </div>

        {/* Chave da API Gemini */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <KeyRound className="h-4 w-4" />
            Chave da API do Gemini
          </label>
          <input
            type="password"
            value={config.geminiApiKey || ''}
            onChange={(e) => setConfig({ ...config, geminiApiKey: 'AIzaSyD2-3zEw9OqMPDo4_05x5NVnjb77W11OJk' })}
            placeholder="Cole sua chave aqui (começa com 'AIza...')"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Sua chave é armazenada de forma segura e usada para processar os pedidos.</p>
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
            <span>Configure seu número do WhatsApp e o link do cardápio acima</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">2.</span>
            <span>Clique em "Salvar Configurações"</span>
          </li>
        </ol>
      </div>
    
      {/* Server Status Warning - Agora mostra apenas se o servidor estiver offline */}
      {connectionStatus.status === 'SERVER_OFFLINE' && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900 mb-1">Servidor WhatsApp necessário</h4>
              <p className="text-sm text-yellow-800">
                Para usar esta funcionalidade, você precisa ter o servidor Node.js rodando. Execute: <code className="bg-yellow-100 px-2 py-1 rounded">yarn start</code> na pasta <code className="bg-yellow-100 px-2 py-1 rounded">server</code>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppAttendanceSection;