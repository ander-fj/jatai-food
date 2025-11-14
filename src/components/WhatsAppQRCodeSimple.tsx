import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle, Loader, RefreshCw, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { ref, set } from 'firebase/database';
import { database } from '../config/firebase';

const generateApiKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'wpp_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
};

const WhatsAppQRCodeSimple: React.FC = () => {
  const username = localStorage.getItem('username') || 'A';
  const [qrCode, setQrCode] = useState<string>('');
  const [status, setStatus] = useState<'disconnected' | 'waiting' | 'connected'>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [serverUrl] = useState<string>(
    localStorage.getItem('whatsapp_server_url') || 'http://localhost:3001'
  );

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [username]);

  const checkStatus = async () => {
    try {
      const response = await fetch(`${serverUrl}/api/whatsapp/status/${username}`);
      const data = await response.json();

      if (data.success) {
        const serverStatus = data.status;

        if (serverStatus === 'CONNECTED' || serverStatus === 'AUTHENTICATED') {
          setStatus('connected');
          setQrCode('');

          const apiKey = generateApiKey();
          const webhookSecret = generateApiKey();

          await set(ref(database, `tenants/${username}/whatsapp`), {
            status: 'connected',
            connectedAt: Date.now(),
            apiKey: apiKey,
            webhookSecret: webhookSecret,
            connectionId: `conn_${Date.now()}`,
            autoReply: true
          });
        } else if (serverStatus === 'QR_CODE') {
          setStatus('waiting');
          fetchQRCode();
        }
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
    }
  };

  const fetchQRCode = async () => {
    try {
      const response = await fetch(`${serverUrl}/api/whatsapp/qr/${username}`);
      const data = await response.json();

      if (data.success && data.qr) {
        setQrCode(data.qr);
      }
    } catch (err) {
      console.error('Erro ao buscar QR Code:', err);
    }
  };

  const generateQRCode = async () => {
    setIsLoading(true);
    setStatus('waiting');

    try {
      const response = await fetch(`${serverUrl}/api/whatsapp/start/${username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Gerando QR Code... Aguarde');
        setTimeout(checkStatus, 2000);
      } else {
        throw new Error(data.message || 'Erro ao iniciar conexão');
      }
    } catch (err: any) {
      setStatus('disconnected');
      toast.error('Erro ao conectar. Verifique se o servidor está rodando.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${serverUrl}/api/whatsapp/disconnect/${username}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setStatus('disconnected');
        setQrCode('');

        await set(ref(database, `tenants/${username}/whatsapp`), {
          status: 'disconnected',
          disconnectedAt: Date.now()
        });

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
            Método simplificado - Sem instalar nada
          </p>
        </div>

        {status === 'disconnected' && (
          <div>
            <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-8 mb-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600 rounded-full mb-4">
                  <Smartphone className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Conecte seu WhatsApp
                </h3>
                <p className="text-gray-600">
                  Configure em menos de 1 minuto
                </p>
              </div>

              <button
                onClick={generateQRCode}
                disabled={isLoading}
                className="w-full px-8 py-4 bg-gradient-to-r from-green-600 to-green-500 text-white text-lg font-semibold rounded-xl hover:from-green-700 hover:to-green-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-6 w-6 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <QrCode className="h-6 w-6" />
                    Gerar QR Code WhatsApp Web
                  </>
                )}
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <div className="flex gap-3">
                <div className="text-blue-600 text-2xl">💡</div>
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    Como funciona:
                  </p>
                  <p className="text-sm text-blue-800 mb-2">
                    1. Clique no botão acima para gerar o QR Code
                  </p>
                  <p className="text-sm text-blue-800 mb-2">
                    2. Abra o WhatsApp no celular e vá em "Aparelhos conectados"
                  </p>
                  <p className="text-sm text-blue-800">
                    3. Escaneie o QR Code que aparecerá na tela
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-yellow-800">
                <strong>Importante:</strong> Certifique-se de que o servidor WhatsApp está rodando.
                Se necessário, execute: <code className="bg-yellow-200 px-1 rounded">cd server && node whatsapp-server.js</code>
              </p>
            </div>
          </div>
        )}

        {status === 'waiting' && qrCode && (
          <div className="text-center">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-4 border-green-500 rounded-2xl p-8 mb-6 shadow-xl">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-3">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  QR Code Gerado!
                </h3>
                <p className="text-gray-600">
                  Escaneie agora com seu celular
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
                {qrCode ? (
                  <img
                    src={qrCode}
                    alt="QR Code WhatsApp Web"
                    className="w-80 h-80 mx-auto rounded-xl border-4 border-green-500"
                  />
                ) : (
                  <div className="w-80 h-80 mx-auto flex items-center justify-center">
                    <Loader className="h-12 w-12 text-green-600 animate-spin" />
                  </div>
                )}
              </div>

              <div className="bg-white border-2 border-blue-200 rounded-xl p-6 text-left mb-4">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">!</div>
                  Como conectar:
                </h4>
                <div className="space-y-4">
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                    <div>
                      <p className="font-semibold text-gray-900">Abra o WhatsApp no celular</p>
                      <p className="text-sm text-gray-600">Android ou iPhone</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                    <div>
                      <p className="font-semibold text-gray-900">Vá em Aparelhos Conectados</p>
                      <p className="text-sm text-gray-600">Menu → Aparelhos conectados</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                    <div>
                      <p className="font-semibold text-gray-900">Escaneie o QR Code</p>
                      <p className="text-sm text-gray-600">Aponte para o código acima</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={disconnect}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={generateQRCode}
                disabled={isLoading}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <RefreshCw className="h-5 w-5" />
                Gerar Novo
              </button>
            </div>
          </div>
        )}

        {status === 'connected' && (
          <div className="text-center">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-4 border-green-500 rounded-2xl p-8 mb-6 shadow-xl">
              <div className="relative mb-6">
                <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <CheckCircle className="h-12 w-12 text-white" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 bg-green-400 rounded-full opacity-20 animate-ping"></div>
                </div>
              </div>

              <h3 className="text-3xl font-bold text-gray-900 mb-3">
                Conectado com Sucesso!
              </h3>

              <div className="bg-white rounded-xl p-4 mb-4 inline-block">
                <p className="text-gray-600 text-sm mb-1">WhatsApp conectado:</p>
                <p className="text-xl font-bold text-green-600">
                  Pronto para receber mensagens
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-6">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 justify-center">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  Sistema Ativo
                </h4>
                <p className="text-gray-700 mb-4">
                  Seu WhatsApp está online e pronto para receber mensagens.
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-gray-600 mb-1">Status</p>
                    <p className="font-bold text-green-600 flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      Online
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-gray-600 mb-1">Resposta Automática</p>
                    <p className="font-bold text-green-600">Ativada</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={disconnect}
              className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white text-lg font-semibold rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl"
            >
              Desconectar WhatsApp
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white">✓</div>
          Recursos Incluídos:
        </h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Configuração Automática</p>
                <p className="text-xs text-gray-600">API keys geradas automaticamente</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Conexão Simples</p>
                <p className="text-xs text-gray-600">Apenas escaneie o QR Code</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <QrCode className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Segurança Total</p>
                <p className="text-xs text-gray-600">Dados protegidos e criptografados</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Sincronização Tempo Real</p>
                <p className="text-xs text-gray-600">Mensagens instantâneas via Firebase</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppQRCodeSimple;
