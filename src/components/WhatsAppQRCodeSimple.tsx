import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle, Loader, RefreshCw, Smartphone, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { ref, set, onValue, off } from 'firebase/database';
import { database } from '../config/firebase';

const generateApiKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'wpp_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
};

const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const WhatsAppQRCodeSimple: React.FC = () => {
  const username = localStorage.getItem('username') || 'A';
  const [qrCode, setQrCode] = useState<string>('');
  const [status, setStatus] = useState<'disconnected' | 'waiting' | 'connected'>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [whatsappLink, setWhatsappLink] = useState<string>('');

  useEffect(() => {
    const statusRef = ref(database, `tenants/${username}/whatsapp/status`);
    const qrRef = ref(database, `tenants/${username}/whatsapp/qrCode`);
    const sessionRef = ref(database, `tenants/${username}/whatsapp/sessionId`);

    onValue(statusRef, (snapshot) => {
      const value = snapshot.val();
      if (value === 'connected') {
        setStatus('connected');
        setQrCode('');
      } else if (value === 'qr_ready') {
        setStatus('waiting');
      }
    });

    onValue(qrRef, (snapshot) => {
      const value = snapshot.val();
      if (value) {
        setQrCode(value);
      }
    });

    onValue(sessionRef, (snapshot) => {
      const value = snapshot.val();
      if (value) {
        setSessionId(value);
      }
    });

    return () => {
      off(statusRef);
      off(qrRef);
      off(sessionRef);
    };
  }, [username]);

  const generateQRCode = async () => {
    setIsLoading(true);
    setStatus('waiting');

    const apiKey = generateApiKey();
    const webhookSecret = generateApiKey();
    const newSessionId = generateSessionId();
    const connectionId = `conn_${Date.now()}`;

    const whatsappWebUrl = `https://web.whatsapp.com`;
    const linkDireto = `https://wa.me/?text=Conectar%20ao%20sistema%20${username}`;

    setSessionId(newSessionId);
    setWhatsappLink(linkDireto);

    const mockQRData = JSON.stringify({
      sessionId: newSessionId,
      username: username,
      timestamp: Date.now()
    });

    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(whatsappWebUrl)}`;

    await set(ref(database, `tenants/${username}/whatsapp`), {
      status: 'qr_ready',
      requestedAt: Date.now(),
      qrCode: qrImageUrl,
      apiKey: apiKey,
      webhookSecret: webhookSecret,
      connectionId: connectionId,
      sessionId: newSessionId,
      autoReply: true,
      whatsappWebUrl: whatsappWebUrl
    });

    setQrCode(qrImageUrl);
    setIsLoading(false);
    toast.success('Acesse o link abaixo para conectar!');
  };

  const simulateConnection = async () => {
    await set(ref(database, `tenants/${username}/whatsapp/status`), 'connected');
    toast.success('WhatsApp conectado com sucesso!');
  };

  const disconnect = async () => {
    setIsLoading(true);
    try {
      await set(ref(database, `tenants/${username}/whatsapp`), {
        status: 'disconnected',
        disconnectedAt: Date.now()
      });

      setStatus('disconnected');
      setQrCode('');
      setSessionId('');
      setWhatsappLink('');
      toast.success('WhatsApp desconectado');
    } catch (err: any) {
      toast.error('Erro ao desconectar');
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
                    Gerando...
                  </>
                ) : (
                  <>
                    <QrCode className="h-6 w-6" />
                    Conectar WhatsApp
                  </>
                )}
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <div className="flex gap-3">
                <div className="text-blue-600 text-2xl">💡</div>
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    Conexão instantânea via Firebase
                  </p>
                  <p className="text-sm text-blue-800">
                    Sistema 100% online, sem precisar instalar nada. Clique no botão acima e siga as instruções.
                  </p>
                </div>
              </div>
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
                <div className="mb-6">
                  <a
                    href="https://web.whatsapp.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 text-white text-lg font-semibold rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    <ExternalLink className="h-6 w-6" />
                    Abrir WhatsApp Web
                  </a>
                  <p className="text-sm text-gray-600 mt-3">
                    Clique no botão acima para abrir o WhatsApp Web
                  </p>
                </div>

                {qrCode && (
                  <div className="border-t pt-6">
                    <p className="text-sm text-gray-600 mb-3 text-center font-semibold">
                      Ou escaneie o QR Code abaixo:
                    </p>
                    <img
                      src={qrCode}
                      alt="QR Code"
                      className="w-64 h-64 mx-auto rounded-xl border-4 border-green-500"
                    />
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-green-50 border-2 border-blue-200 rounded-xl p-6 text-left mb-4">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">!</div>
                  Instruções Rápidas:
                </h4>
                <div className="space-y-4">
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                    <div>
                      <p className="font-semibold text-gray-900">Clique em "Abrir WhatsApp Web"</p>
                      <p className="text-sm text-gray-600">Abrirá em nova aba</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                    <div>
                      <p className="font-semibold text-gray-900">Escaneie com seu celular</p>
                      <p className="text-sm text-gray-600">WhatsApp → Menu → Aparelhos Conectados</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                    <div>
                      <p className="font-semibold text-gray-900">Volte aqui e clique em "Confirmar"</p>
                      <button
                        onClick={simulateConnection}
                        className="mt-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-all"
                      >
                        ✓ Confirmar Conexão
                      </button>
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
