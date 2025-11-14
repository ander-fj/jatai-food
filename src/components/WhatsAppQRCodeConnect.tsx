import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle, Loader, RefreshCw, AlertCircle, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

const WhatsAppQRCodeConnect: React.FC = () => {
  const username = localStorage.getItem('username') || 'A';
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'qr_code' | 'connected'>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverUrl, setServerUrl] = useState<string>(
    localStorage.getItem('whatsapp_server_url') || 'http://localhost:3001'
  );
  const [showConfig, setShowConfig] = useState(false);

  const SERVER_URL = serverUrl;

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const saveServerUrl = () => {
    localStorage.setItem('whatsapp_server_url', serverUrl);
    toast.success('URL do servidor salva!');
    setShowConfig(false);
    checkStatus();
  };

  const checkStatus = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/whatsapp/status/${username}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();

      if (data.success) {
        const serverStatus = data.status;

        if (serverStatus === 'CONNECTED' || serverStatus === 'AUTHENTICATED') {
          setStatus('connected');
          setQrCode(null);
        } else if (serverStatus === 'QR_CODE') {
          setStatus('qr_code');
          fetchQRCode();
        } else if (serverStatus === 'INITIALIZING') {
          setStatus('connecting');
        } else {
          setStatus('disconnected');
        }
      } else {
        setStatus('disconnected');
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
    }
  };

  const fetchQRCode = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/whatsapp/qr/${username}`);
      const data = await response.json();

      if (data.success && data.qr) {
        setQrCode(data.qr);
      }
    } catch (err) {
      console.error('Erro ao buscar QR Code:', err);
    }
  };

  const startConnection = async () => {
    setIsLoading(true);
    setError(null);
    setStatus('connecting');

    try {
      const response = await fetch(`${SERVER_URL}/api/whatsapp/start/${username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Iniciando conexão... Aguarde o QR Code');
        setTimeout(checkStatus, 2000);
      } else {
        throw new Error(data.message || 'Erro ao iniciar conexão');
      }
    } catch (err: any) {
      setError(err.message);
      setStatus('disconnected');
      toast.error('Erro ao conectar: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/whatsapp/disconnect/${username}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setStatus('disconnected');
        setQrCode(null);
        toast.success('WhatsApp desconectado');
      } else {
        throw new Error(data.message || 'Erro ao desconectar');
      }
    } catch (err: any) {
      toast.error('Erro ao desconectar: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Conectar WhatsApp
          </h2>
          <p className="text-gray-600">
            Use o WhatsApp Web do seu celular para escanear o QR Code
          </p>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            ⚙️ Configurar URL do Servidor
          </button>
        </div>

        {showConfig && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL do Servidor WhatsApp:
            </label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:3001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={saveServerUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salvar
              </button>
              <button
                onClick={() => setShowConfig(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Servidor local: <code className="bg-gray-200 px-1 rounded">http://localhost:3001</code>
            </p>
          </div>
        )}

        {status === 'disconnected' && (
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <AlertCircle className="h-5 w-5 text-red-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-red-800 mb-2">
                ⚠️ Servidor WhatsApp não está rodando!
              </p>
              <p className="text-xs text-red-700 mb-3">
                Você precisa iniciar o servidor antes de conectar.
              </p>
              <div className="bg-white rounded p-3 text-left">
                <p className="text-xs font-semibold text-gray-900 mb-1">1. Abra o terminal:</p>
                <code className="block bg-gray-900 text-green-400 text-xs p-2 rounded mb-2">
                  cd server<br/>
                  npm install<br/>
                  node whatsapp-server.js
                </code>
                <p className="text-xs font-semibold text-gray-900 mb-1">2. Depois clique em "Conectar WhatsApp"</p>
              </div>
            </div>
            <button
              onClick={startConnection}
              disabled={isLoading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 mx-auto"
            >
              {isLoading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <QrCode className="h-5 w-5" />
                  Conectar WhatsApp
                </>
              )}
            </button>
          </div>
        )}

        {status === 'connecting' && (
          <div className="text-center py-8">
            <Loader className="h-12 w-12 text-green-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Iniciando conexão...
            </p>
            <p className="text-sm text-gray-600">
              Aguarde alguns segundos enquanto geramos o QR Code
            </p>
          </div>
        )}

        {status === 'qr_code' && (
          <div className="text-center">
            <div className="bg-white border-4 border-green-500 rounded-lg p-4 inline-block mb-6">
              {qrCode ? (
                <img src={qrCode} alt="QR Code" className="w-64 h-64" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center">
                  <Loader className="h-12 w-12 text-green-600 animate-spin" />
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-blue-600" />
                Como escanear:
              </h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="font-bold text-blue-600">1.</span>
                  <span>Abra o WhatsApp no seu celular</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-600">2.</span>
                  <span>Toque em <strong>Menu (⋮)</strong> ou <strong>Configurações</strong></span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-600">3.</span>
                  <span>Toque em <strong>Aparelhos conectados</strong></span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-600">4.</span>
                  <span>Toque em <strong>Conectar um aparelho</strong></span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-600">5.</span>
                  <span>Aponte a câmera para este QR Code</span>
                </li>
              </ol>
            </div>

            <button
              onClick={checkStatus}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar QR Code
            </button>
          </div>
        )}

        {status === 'connected' && (
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                WhatsApp Conectado!
              </h3>
              <p className="text-gray-600">
                Seu WhatsApp está conectado e pronto para receber mensagens.
                Agora você pode ir para a aba "Atendimento WhatsApp" e começar a atender clientes!
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={disconnect}
                disabled={isLoading}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Desconectar
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>

      <div className="mt-6 bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Importante:</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span>Mantenha seu celular conectado à internet</span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span>Não feche o WhatsApp no celular</span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span>A conexão pode levar alguns segundos</span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span>Após conectar, você receberá mensagens automaticamente</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default WhatsAppQRCodeConnect;
