import React, { useState, useEffect } from 'react';
import { MessageCircle, Save, RefreshCw, AlertCircle, Phone, Power, QrCode, Wifi, WifiOff, Link, Building, Clock, MessageSquare, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
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

}


interface ConnectionStatus {
  status: 'DISCONNECTED' | 'INITIALIZING' | 'QR_CODE' | 'AUTHENTICATED' | 'ready' | 'AUTH_FAILURE' | 'ERROR' | 'SERVER_OFFLINE' | 'NOT_INITIALIZED';
  isConnected: boolean;
  hasQrCode: boolean;
}

const initialConfigState: WhatsAppConfig = {
  isActive: false,
  restaurantName: '',
  phoneNumber: '',
  menuUrl: '',
  hours: '',
  address: '',
  welcomeMessage: '',
};
const WHATSAPP_SERVER_URL = process.env.REACT_APP_WHATSAPP_SERVER_URL || 'https://jatai-food-backend.onrender.com';

const WhatsAppAttendanceSection: React.FC = () => {
  const username = localStorage.getItem('username');
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [config, setConfig] = useState<WhatsAppConfig>(initialConfigState);
  const [isSaving, setIsSaving] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<Partial<ConnectionStatus>>({
    status: 'NOT_INITIALIZED',
    isConnected: false,
    hasQrCode: false
  });
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (username) {
      loadConfig();
      checkConnectionStatus();

    }
  }, [username]);

  useEffect(() => {
    // Este efeito lida com a lógica de polling (verificação contínua).
    const finalStates = ['ready', 'DISCONNECTED', 'AUTH_FAILURE', 'ERROR', 'SERVER_OFFLINE'];
    if (finalStates.includes(connectionStatus.status!)) {
      return; // Para de verificar se atingiu um estado final.
    }

    const intervalId = setInterval(() => {
      console.log(`Polling... Status atual: ${connectionStatus.status}`);
      
      // A verificação de status lida com a atualização de INITIALIZING para QR_CODE.
      checkConnectionStatus();

      // Busca a imagem do QR Code apenas quando o status já for QR_CODE.
      // Isso evita o erro 404 no console enquanto o servidor ainda está inicializando.
      if (connectionStatus.status === 'QR_CODE') {
        fetchQrCode();
      }
    }, 3000); // Verifica a cada 3 segundos.

    return () => clearInterval(intervalId);
  }, [username, connectionStatus.status]);

  const loadConfig = async () => {
    if (!username) return;
    
    setIsConfigLoading(true);
    try {
      const configRef = ref(database, `tenants/${username}/whatsappConfig`);
      const snapshot = await get(configRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Mapeia os dados do Firebase para o formato do estado local
        const mappedData: WhatsAppConfig = {
          isActive: data.isActive || false,
          restaurantName: data.nome || data.restaurantName || '',
          phoneNumber: data.whatsapp || data.phoneNumber || '',
          menuUrl: data.cardapioLink || data.menuUrl || '',
          hours: data.horario || data.hours || '',
          address: data.endereco || data.address || '',
          welcomeMessage: data.mensagemBoasVindas || data.welcomeMessage || '',
        };
        // Garante que todos os campos do estado inicial existam,
        // mesclando com os dados carregados do Firebase.
        setConfig(prevConfig => ({ ...initialConfigState, ...mappedData }));
      } else {
        setConfig(initialConfigState); // Reseta para o estado inicial se não houver dados
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      toast.error('Erro ao carregar configurações do WhatsApp');
    } finally {
      setIsConfigLoading(false);
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

        updatedAt: new Date().toISOString()
      };
      
      // Salvar em whatsappConfig
      const whatsappConfigRef = ref(database, `tenants/${username}/whatsappConfig`);
      await set(whatsappConfigRef, dataToSave);

      // --- INÍCIO DA ALTERAÇÃO ---
      // Envia os dados para o backend (whatsapp-server.js) para atualizar o assistente em tempo real.
      // Mapeia os nomes dos campos do frontend para os nomes esperados pelo backend.
      const dataForBackend = {
        nome: dataToSave.restaurantName,
        whatsapp: dataToSave.phoneNumber,
        horario: dataToSave.hours,
        endereco: dataToSave.address,
        cardapioLink: dataToSave.menuUrl,
        mensagemBoasVindas: dataToSave.welcomeMessage,
      };

      await fetch(`${WHATSAPP_SERVER_URL}/api/config/update/${username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataForBackend),
      });
      // --- FIM DA ALTERAÇÃO ---

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
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/whatsapp/status/${username}`);
      if (response.ok) {
        const data = await response.json(); // Ex: { success: true, status: 'QR_CODE' }
        setConnectionStatus(prev => ({ ...prev, status: data.status, isConnected: data.status === 'ready' }));
      }
    } catch (error) {
      console.error('Servidor offline ou inacessível:', error);
      // CORREÇÃO: Se a busca falhar (ex: servidor offline), atualiza o status para refletir isso.
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
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/whatsapp/qr/${username}`); // URL corrigida
      // Se a resposta for 404, significa que o QR code ainda não está pronto.
      // Isso é esperado durante o polling, então não tratamos como um erro.
      if (response.status === 404) {
        setQrCode(null); // Garante que o QR code antigo seja limpo se ele expirar.
        return;
      }
      if (response.ok) {
        const data = await response.json();
        if (data.qr) {
          setQrCode(data.qr);
          setConnectionStatus(prev => ({ ...prev, status: 'QR_CODE' }));
        } else {
          setQrCode(null);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar QR code:', error);
      // Não definimos o status como erro aqui, pois pode ser apenas um problema de rede temporário.
    }
  };

  const connectWhatsApp = async () => {
    if (!username) return;
    
    setIsConnecting(true);
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/whatsapp/start/${username}`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success('Iniciando conexão com WhatsApp...');
        // Apenas muda o status para inicializando, o useEffect cuidará do resto.
        setConnectionStatus({ status: 'INITIALIZING', isConnected: false, hasQrCode: false });
      } else {
        toast.error('Erro ao iniciar conexão');
      }
    } catch (error) {
      console.error('Erro ao conectar WhatsApp:', error);
      toast.error('Erro ao conectar. Verifique se o servidor está rodando.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWhatsApp = async () => { // Tornando a função async
    if (!username) return;
    
    toast.info('Desconectando WhatsApp...');
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/whatsapp/stop/${username}`, {
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
      case 'ready': return 'green';
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
      case 'ready': return 'Conectado';
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
              onClick={connectWhatsApp} // Removida a dependência da chave Gemini
              disabled={isConnecting}
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsConfigCollapsed(!isConfigCollapsed)}>
          <h3 className="text-xl font-semibold text-gray-800">Configurações</h3>
          <button
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label={isConfigCollapsed ? 'Expandir configurações' : 'Recolher configurações'}
          >
            {isConfigCollapsed ? <ChevronDown className="h-5 w-5 text-gray-600" /> : <ChevronUp className="h-5 w-5 text-gray-600" />}
          </button>
        </div>

        {!isConfigCollapsed && (
          <div className="mt-4 pt-6 border-t border-gray-200 space-y-6">
            {isConfigLoading ? (
              <p>Carregando configurações...</p>
            ) : (
              <>
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
              </>
            )}
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
        )}
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