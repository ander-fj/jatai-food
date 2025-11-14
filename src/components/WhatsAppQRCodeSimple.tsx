import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle, Loader, RefreshCw, AlertCircle, Smartphone, Settings, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { ref, set, onValue, off } from 'firebase/database';
import { database } from '../config/firebase';

const WhatsAppQRCodeSimple: React.FC = () => {
  const username = localStorage.getItem('username') || 'A';
  const [qrCode, setQrCode] = useState<string>('');
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'qr_ready' | 'connected'>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const [apiUrl, setApiUrl] = useState<string>(
    localStorage.getItem(`${username}_whatsapp_api_url`) || 'https://evo.seuservidor.com.br'
  );
  const [apiKey, setApiKey] = useState<string>(
    localStorage.getItem(`${username}_whatsapp_api_key`) || ''
  );

  const instanceName = `instance_${username}`;

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [apiUrl, apiKey]);

  const checkStatus = async () => {
    if (!apiUrl || !apiKey) return;

    try {
      const response = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
        headers: {
          'apikey': apiKey,
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.state === 'open') {
          setStatus('connected');
          await set(ref(database, `tenants/${username}/whatsapp/status`), 'connected');
        } else if (data.state === 'close') {
          setStatus('disconnected');
        }
      }
    } catch (error) {
      console.log('Erro ao verificar status:', error);
    }
  };

  const saveConfig = () => {
    localStorage.setItem(`${username}_whatsapp_api_url`, apiUrl);
    localStorage.setItem(`${username}_whatsapp_api_key`, apiKey);
    toast.success('Configurações salvas!');
    setShowConfig(false);
  };

  const createInstance = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
        },
        body: JSON.stringify({
          instanceName: instanceName,
          qrcode: true,
        }),
      });

      if (!response.ok) {
        const existsResponse = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
          headers: {
            'apikey': apiKey,
          },
        });

        if (existsResponse.ok) {
          const data = await existsResponse.json();
          if (data.base64 || data.code) {
            setQrCode(data.base64 || data.code);
            setStatus('qr_ready');
            toast.success('QR Code gerado! Escaneie com seu WhatsApp.');
            return;
          }
        }

        throw new Error('Erro ao criar instância');
      }

      const data = await response.json();

      if (data.qrcode && data.qrcode.base64) {
        setQrCode(data.qrcode.base64);
        setStatus('qr_ready');
        toast.success('QR Code gerado! Escaneie com seu WhatsApp.');
      } else {
        await connectInstance();
      }

    } catch (error: any) {
      console.error('Erro:', error);
      toast.error(error.message || 'Erro ao gerar QR Code. Verifique as configurações.');
      setStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  };

  const connectInstance = async () => {
    try {
      const response = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
        headers: {
          'apikey': apiKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.base64 || data.code) {
          setQrCode(data.base64 || data.code);
          setStatus('qr_ready');
        }
      }
    } catch (error) {
      console.error('Erro ao conectar:', error);
    }
  };

  const disconnect = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': apiKey,
        },
      });

      if (response.ok) {
        setStatus('disconnected');
        setQrCode('');
        await set(ref(database, `tenants/${username}/whatsapp/status`), 'disconnected');
        toast.success('WhatsApp desconectado!');
      }
    } catch (error: any) {
      toast.error('Erro ao desconectar: ' + error.message);
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
            Conectar WhatsApp Business
          </h2>
          <p className="text-gray-600 mb-3">
            Use a Evolution API para conectar seu WhatsApp
          </p>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto"
          >
            <Settings className="h-4 w-4" />
            Configurar Evolution API
          </button>
        </div>

        {showConfig && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuração da Evolution API
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL da API:
                </label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://evo.seuservidor.com.br"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key:
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sua-api-key-aqui"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveConfig}
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
            </div>

            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Não tem Evolution API?</strong>
              </p>
              <a
                href="https://doc.evolution-api.com/v2/pt/get-started/introduction"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <ExternalLink className="h-4 w-4" />
                Ver documentação oficial
              </a>
              <p className="text-xs text-gray-600 mt-2">
                Evolution API é gratuita e open-source. Você pode instalar no seu servidor ou usar serviços hospedados.
              </p>
            </div>
          </div>
        )}

        {!apiUrl || !apiKey ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">
              Configuração Necessária
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              Configure a Evolution API para começar a usar o WhatsApp Business.
            </p>
            <button
              onClick={() => setShowConfig(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Configurar Agora
            </button>
          </div>
        ) : status === 'disconnected' ? (
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4 text-center">
              <AlertCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-700">
                WhatsApp não conectado. Clique abaixo para gerar o QR Code.
              </p>
            </div>

            <button
              onClick={createInstance}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  Gerando QR Code...
                </>
              ) : (
                <>
                  <QrCode className="h-5 w-5" />
                  Conectar WhatsApp
                </>
              )}
            </button>
          </div>
        ) : status === 'qr_ready' && qrCode ? (
          <div className="text-center">
            <div className="bg-white border-4 border-green-500 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Escaneie o QR Code com seu WhatsApp
              </h3>

              <div className="bg-white rounded-lg p-4 mb-4 inline-block">
                <img
                  src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="QR Code WhatsApp"
                  className="w-64 h-64 mx-auto"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Como conectar:
                </h4>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-600">1.</span>
                    <span>Abra o WhatsApp no seu celular</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-600">2.</span>
                    <span>Toque em Menu ou Configurações e selecione "Aparelhos conectados"</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-600">3.</span>
                    <span>Toque em "Conectar um aparelho"</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-600">4.</span>
                    <span>Aponte seu celular para esta tela para escanear o QR Code</span>
                  </li>
                </ol>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setStatus('disconnected');
                  setQrCode('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={createInstance}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Gerar Novo QR Code
              </button>
            </div>
          </div>
        ) : status === 'connected' ? (
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                WhatsApp Conectado!
              </h3>
              <p className="text-gray-600 mb-4">
                Instância: <span className="font-mono font-bold">{instanceName}</span>
              </p>
              <p className="text-gray-600">
                Agora você pode ir para "Atendimento WhatsApp" e começar a receber mensagens!
              </p>
            </div>

            <button
              onClick={disconnect}
              disabled={isLoading}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-300"
            >
              {isLoading ? 'Desconectando...' : 'Desconectar WhatsApp'}
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Conectando...</p>
          </div>
        )}
      </div>

      <div className="mt-6 bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Sobre a Evolution API:</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span><strong>Oficial WhatsApp:</strong> QR Code real do WhatsApp Web</span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span><strong>Open Source:</strong> Código aberto e gratuito</span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span><strong>Escalável:</strong> Suporta múltiplas instâncias</span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span><strong>Webhooks:</strong> Recebe mensagens em tempo real</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default WhatsAppQRCodeSimple;
