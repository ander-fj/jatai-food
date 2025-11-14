import React, { useState } from 'react';
import { ExternalLink, Copy, Check, AlertCircle, MessageCircle, Key, Webhook, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const WhatsAppSetupGuide: React.FC = () => {
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const username = localStorage.getItem('username') || 'A';
  const webhookUrl = `https://YOUR_PROJECT.supabase.co/functions/v1/whatsapp-webhook?username=${username}`;
  const verifyToken = "jatai_food_2025";

  const copyToClipboard = (text: string, type: 'webhook' | 'token') => {
    navigator.clipboard.writeText(text);
    if (type === 'webhook') {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
    toast.success('Copiado!');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl p-8 shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Configurar WhatsApp Business</h1>
            <p className="text-green-100">Guia completo para integração oficial</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
        <div className="flex gap-3">
          <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-blue-900 mb-2">Importante!</h3>
            <p className="text-blue-800 text-sm">
              Para usar o WhatsApp Business API, você precisa ter uma conta aprovada no Meta Business.
              Este é o método oficial e gratuito (até 1000 mensagens/mês).
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
        <div className="space-y-4">
          <div className="flex items-start gap-4 pb-4 border-b">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 font-bold text-lg">1</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">Criar Conta no Meta Business</h3>
              <p className="text-gray-600 mb-3">
                Acesse o Meta Business Suite e crie uma conta empresarial.
              </p>
              <a
                href="https://business.facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir Meta Business
              </a>
            </div>
          </div>

          <div className="flex items-start gap-4 pb-4 border-b">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 font-bold text-lg">2</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">Configurar WhatsApp Business API</h3>
              <p className="text-gray-600 mb-3">
                No Meta Business, vá em "WhatsApp" e configure sua API.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Clique em "Começar" no WhatsApp Business API</li>
                <li>Adicione um número de telefone comercial</li>
                <li>Verifique o número via SMS ou chamada</li>
                <li>Aceite os termos e condições</li>
              </ol>
            </div>
          </div>

          <div className="flex items-start gap-4 pb-4 border-b">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 font-bold text-lg">3</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <Key className="w-5 h-5" />
                Obter Token de Acesso
              </h3>
              <p className="text-gray-600 mb-3">
                Gere um token permanente para autenticar as requisições.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Vá em "Configurações" → "Tokens de Acesso"</li>
                <li>Clique em "Gerar Token"</li>
                <li>Selecione as permissões: <code className="bg-gray-100 px-1 rounded">whatsapp_business_messaging</code></li>
                <li>Copie e guarde o token com segurança</li>
              </ol>
            </div>
          </div>

          <div className="flex items-start gap-4 pb-4 border-b">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 font-bold text-lg">4</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <Webhook className="w-5 h-5" />
                Configurar Webhook
              </h3>
              <p className="text-gray-600 mb-3">
                Configure o webhook para receber mensagens em tempo real.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    URL do Webhook:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={webhookUrl}
                      readOnly
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                    >
                      {copiedWebhook ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedWebhook ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Token de Verificação:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={verifyToken}
                      readOnly
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(verifyToken, 'token')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                    >
                      {copiedToken ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedToken ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Passos no Meta Business:</strong>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-800 mt-2">
                    <li>Vá em "Configurações" → "Webhook"</li>
                    <li>Clique em "Configurar Webhook"</li>
                    <li>Cole a URL do Webhook acima</li>
                    <li>Cole o Token de Verificação</li>
                    <li>Selecione "messages" nos eventos</li>
                    <li>Clique em "Verificar e Salvar"</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 font-bold text-lg">5</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Testar Integração
              </h3>
              <p className="text-gray-600 mb-3">
                Envie uma mensagem de teste para seu número do WhatsApp Business.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  ✅ Depois de configurado, todas as mensagens aparecerão automaticamente na aba "Atendimento WhatsApp"
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 text-white rounded-xl p-6">
        <h3 className="font-bold text-lg mb-3">🎓 Recursos Adicionais</h3>
        <div className="space-y-2 text-sm">
          <a
            href="https://developers.facebook.com/docs/whatsapp/business-management-api/get-started"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-300 hover:text-blue-200"
          >
            <ExternalLink className="w-4 h-4" />
            Documentação Oficial WhatsApp Business API
          </a>
          <a
            href="https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-300 hover:text-blue-200"
          >
            <ExternalLink className="w-4 h-4" />
            Guia de Webhooks
          </a>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSetupGuide;
