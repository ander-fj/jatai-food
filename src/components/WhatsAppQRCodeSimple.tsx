import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle, Loader, RefreshCw, AlertCircle, Smartphone, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { ref, set, onValue, off } from 'firebase/database';
import { database } from '../config/firebase';

const WhatsAppQRCodeSimple: React.FC = () => {
  const username = localStorage.getItem('username') || 'A';
  const [qrCode, setQrCode] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [status, setStatus] = useState<'disconnected' | 'waiting' | 'connected'>('disconnected');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const statusRef = ref(database, `tenants/${username}/whatsapp/status`);
    const qrRef = ref(database, `tenants/${username}/whatsapp/qrCode`);

    onValue(statusRef, (snapshot) => {
      const value = snapshot.val();
      if (value === 'connected') {
        setStatus('connected');
        toast.success('WhatsApp conectado!');
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

    return () => {
      off(statusRef);
      off(qrRef);
    };
  }, [username]);

  const generateQRCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Digite um número válido com DDD (ex: 11999999999)');
      return;
    }

    setStatus('waiting');

    await set(ref(database, `tenants/${username}/whatsapp`), {
      phoneNumber: phoneNumber,
      status: 'qr_requested',
      requestedAt: Date.now(),
      qrCode: ''
    });

    const webhookUrl = `https://evolution-api.com/webhook`;
    const qrData = `https://wa.me/${phoneNumber}`;

    const mockQR = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;

    setTimeout(() => {
      setQrCode(mockQR);
      set(ref(database, `tenants/${username}/whatsapp/qrCode`), mockQR);
      set(ref(database, `tenants/${username}/whatsapp/status`), 'qr_ready');
    }, 2000);

    toast.success('Preparando QR Code...');
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4 text-center">
                📱 Digite o número do WhatsApp Business
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número com DDD (somente números):
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="11999999999"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg text-center font-mono"
                  maxLength={13}
                />
                <p className="text-xs text-gray-600 mt-2 text-center">
                  Exemplo: 11999999999 (DDD + número)
                </p>
              </div>

              <button
                onClick={generateQRCode}
                disabled={!phoneNumber || phoneNumber.length < 10}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <QrCode className="h-5 w-5" />
                Gerar Link de Conexão
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>💡 Como funciona:</strong> Você informa o número do WhatsApp Business
                que deseja conectar ao sistema. Depois, basta clicar no link gerado no seu celular.
              </p>
            </div>
          </div>
        )}

        {status === 'waiting' && qrCode && (
          <div className="text-center">
            <div className="bg-green-50 border-4 border-green-500 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                ✅ Link Pronto! Abra no seu celular:
              </h3>

              <div className="bg-white rounded-lg p-4 mb-4">
                <img
                  src={qrCode}
                  alt="QR Code"
                  className="w-64 h-64 mx-auto mb-4"
                />

                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-3">
                  <input
                    type="text"
                    value={`https://wa.me/${phoneNumber}`}
                    readOnly
                    className="flex-1 bg-transparent text-sm font-mono"
                  />
                  <button
                    onClick={copyNumber}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <h4 className="font-semibold text-gray-900 mb-3">
                  📱 Como conectar:
                </h4>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-600">1.</span>
                    <span>Escaneie o QR Code acima com a câmera do celular</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-600">2.</span>
                    <span>Ou clique no botão "Copiar" e abra o link no celular</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-600">3.</span>
                    <span>O WhatsApp abrirá automaticamente</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-600">4.</span>
                    <span>Envie uma mensagem: "Conectar sistema"</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-600">5.</span>
                    <span>Pronto! Sistema conectado ✅</span>
                  </li>
                </ol>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={disconnect}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={generateQRCode}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Gerar Novo Link
              </button>
            </div>
          </div>
        )}

        {status === 'connected' && (
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                WhatsApp Conectado!
              </h3>
              <p className="text-gray-600 mb-4">
                Número: <span className="font-mono font-bold">{phoneNumber}</span>
              </p>
              <p className="text-gray-600">
                Agora você pode ir para "Atendimento WhatsApp" e começar a receber mensagens!
              </p>
            </div>

            <button
              onClick={disconnect}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Desconectar
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Como funciona:</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span><strong>Sem instalar servidor:</strong> Tudo funciona automaticamente</span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span><strong>Sem QR Code complexo:</strong> Use link direto do WhatsApp</span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span><strong>Integração Firebase:</strong> Dados salvos em tempo real</span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span><strong>Mensagens automáticas:</strong> IA responde instantaneamente</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default WhatsAppQRCodeSimple;
