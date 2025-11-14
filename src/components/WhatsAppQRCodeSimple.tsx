import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle, Loader, RefreshCw, AlertCircle, Smartphone, Copy, Check } from 'lucide-react';
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

const WhatsAppQRCodeSimple: React.FC = () => {
  const username = localStorage.getItem('username') || 'A';
  const [qrCode, setQrCode] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [status, setStatus] = useState<'disconnected' | 'waiting' | 'connected'>('disconnected');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const statusRef = ref(database, `tenants/${username}/whatsapp/status`);
    const qrRef = ref(database, `tenants/${username}/whatsapp/qrCode`);
    const phoneRef = ref(database, `tenants/${username}/whatsapp/phoneNumber`);

    onValue(statusRef, (snapshot) => {
      const value = snapshot.val();
      if (value === 'connected') {
        setStatus('connected');
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

    onValue(phoneRef, (snapshot) => {
      const value = snapshot.val();
      if (value) {
        setPhoneNumber(value);
      }
    });

    return () => {
      off(statusRef);
      off(qrRef);
      off(phoneRef);
    };
  }, [username]);

  const generateQRCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Digite um número válido com DDD');
      return;
    }

    setIsLoading(true);
    setStatus('waiting');

    const apiKey = generateApiKey();
    const webhookSecret = generateApiKey();

    const qrData = `https://wa.me/${phoneNumber}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData)}`;

    await set(ref(database, `tenants/${username}/whatsapp`), {
      phoneNumber: phoneNumber,
      status: 'qr_ready',
      requestedAt: Date.now(),
      qrCode: qrImageUrl,
      apiKey: apiKey,
      webhookSecret: webhookSecret,
      connectionId: `conn_${Date.now()}`,
      autoReply: true
    });

    setQrCode(qrImageUrl);
    setIsLoading(false);
    toast.success('Link pronto! Escaneie o QR Code');
  };

  const copyNumber = () => {
    navigator.clipboard.writeText(phoneNumber);
    setCopied(true);
    toast.success('Número copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const disconnect = async () => {
    await set(ref(database, `tenants/${username}/whatsapp`), {
      status: 'disconnected',
      phoneNumber: '',
      qrCode: ''
    });
    setStatus('disconnected');
    setQrCode('');
    setPhoneNumber('');
    toast.success('WhatsApp desconectado');
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

              <div className="mb-6">
                <label className="block text-base font-semibold text-gray-900 mb-3">
                  Digite seu número de WhatsApp:
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="11999999999"
                  className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl text-xl text-center font-mono focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                  maxLength={13}
                />
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Exemplo: <span className="font-mono font-semibold">11999999999</span> (DDD + número)
                </p>
              </div>

              <button
                onClick={generateQRCode}
                disabled={!phoneNumber || phoneNumber.length < 10 || isLoading}
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
                    Gerar QR Code
                  </>
                )}
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <div className="flex gap-3">
                <div className="text-blue-600 text-2xl">💡</div>
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    Simples e rápido:
                  </p>
                  <p className="text-sm text-blue-800">
                    Após gerar o QR Code, escaneie com seu celular e pronto!
                    O sistema vai se conectar automaticamente.
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
                <div className="relative">
                  <img
                    src={qrCode}
                    alt="QR Code"
                    className="w-80 h-80 mx-auto mb-4 rounded-xl"
                  />
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                    <Smartphone className="w-8 h-8 text-white" />
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Ou use o link direto:</p>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <input
                      type="text"
                      value={`https://wa.me/${phoneNumber}`}
                      readOnly
                      className="flex-1 bg-transparent text-sm font-mono text-gray-700 text-center"
                    />
                    <button
                      onClick={copyNumber}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span className="text-sm font-semibold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span className="text-sm font-semibold">Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
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
                      <p className="font-semibold text-gray-900">Escaneie o QR Code</p>
                      <p className="text-sm text-gray-600">Use a câmera do celular</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                    <div>
                      <p className="font-semibold text-gray-900">Abra o WhatsApp</p>
                      <p className="text-sm text-gray-600">Será aberto automaticamente</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                    <div>
                      <p className="font-semibold text-gray-900">Confirme a conexão</p>
                      <p className="text-sm text-gray-600">Sistema conecta automaticamente</p>
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
                <p className="text-gray-600 text-sm mb-1">Número conectado:</p>
                <p className="text-2xl font-mono font-bold text-green-600">
                  +{phoneNumber}
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
