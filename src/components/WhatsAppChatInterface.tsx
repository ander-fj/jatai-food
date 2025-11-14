import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Phone, User, Search, X, Clock, CheckCheck, Check } from 'lucide-react';
import { database } from '../config/firebase';
import { ref, onValue, push, set, get, serverTimestamp } from 'firebase/database';
import { toast } from 'sonner';

interface Message {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  isFromCustomer: boolean;
  status?: 'sent' | 'delivered' | 'read';
}

interface Chat {
  phoneNumber: string;
  customerName: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  messages: Message[];
}

const WhatsAppChatInterface: React.FC = () => {
  const username = localStorage.getItem('username') || 'A';
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messagesRef = ref(database, `whatsapp_messages/${username}`);

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const chatsMap: { [key: string]: Chat } = {};

        Object.entries(data).forEach(([phoneNumber, messages]: [string, any]) => {
          const messagesList: Message[] = [];
          let unreadCount = 0;

          Object.entries(messages).forEach(([msgId, msg]: [string, any]) => {
            messagesList.push({
              id: msgId,
              from: msg.from,
              to: msg.to,
              body: msg.body,
              timestamp: msg.timestamp,
              isFromCustomer: msg.isFromCustomer,
              status: msg.status
            });

            if (msg.isFromCustomer && msg.status !== 'read') {
              unreadCount++;
            }
          });

          messagesList.sort((a, b) => a.timestamp - b.timestamp);

          const lastMsg = messagesList[messagesList.length - 1];
          chatsMap[phoneNumber] = {
            phoneNumber,
            customerName: messages.customerName || phoneNumber,
            lastMessage: lastMsg?.body || '',
            lastMessageTime: lastMsg?.timestamp || 0,
            unreadCount,
            messages: messagesList
          };
        });

        const chatsList = Object.values(chatsMap).sort(
          (a, b) => b.lastMessageTime - a.lastMessageTime
        );

        setChats(chatsList);
      } else {
        setChats([]);
      }
    });

    return () => unsubscribe();
  }, [username]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat, chats]);

  useEffect(() => {
    if (selectedChat) {
      markAsRead(selectedChat);
    }
  }, [selectedChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const markAsRead = async (phoneNumber: string) => {
    const chat = chats.find(c => c.phoneNumber === phoneNumber);
    if (!chat) return;

    const updates: { [key: string]: any } = {};
    chat.messages.forEach(msg => {
      if (msg.isFromCustomer && msg.status !== 'read') {
        updates[`whatsapp_messages/${username}/${phoneNumber}/${msg.id}/status`] = 'read';
      }
    });

    if (Object.keys(updates).length > 0) {
      const dbRef = ref(database);
      await set(dbRef, updates);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedChat || isSending) return;

    setIsSending(true);
    try {
      const configRef = ref(database, `whatsapp_config/${username}`);
      const configSnap = await get(configRef);

      if (!configSnap.exists()) {
        toast.error('Configure o WhatsApp Business primeiro');
        return;
      }

      const config = configSnap.val();
      const messagesRef = ref(database, `whatsapp_messages/${username}/${selectedChat}`);
      const newMessageRef = push(messagesRef);

      const message = {
        from: config.phoneNumber || username,
        to: selectedChat,
        body: messageText,
        timestamp: Date.now(),
        isFromCustomer: false,
        status: 'sent'
      };

      await set(newMessageRef, message);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: username,
          to: selectedChat,
          message: messageText
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem');
      }

      setMessageText('');
      toast.success('Mensagem enviada!');
    } catch (error) {
      console.error('Erro ao enviar:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ontem';
    } else if (days < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const filteredChats = chats.filter(chat =>
    chat.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.phoneNumber.includes(searchTerm)
  );

  const currentChat = chats.find(c => c.phoneNumber === selectedChat);

  return (
    <div className="h-screen flex bg-gray-100">
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 bg-emerald-600 text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6" />
            WhatsApp Atendimento
          </h2>
        </div>

        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageCircle className="h-16 w-16 mb-4" />
              <p className="text-lg">Nenhuma conversa ainda</p>
              <p className="text-sm">Aguarde mensagens dos clientes</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.phoneNumber}
                onClick={() => setSelectedChat(chat.phoneNumber)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedChat === chat.phoneNumber ? 'bg-emerald-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                    {chat.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {chat.customerName}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {formatTime(chat.lastMessageTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate flex-1">
                        {chat.lastMessage}
                      </p>
                      {chat.unreadCount > 0 && (
                        <span className="ml-2 bg-emerald-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedChat && currentChat ? (
          <>
            <div className="p-4 bg-white border-b border-gray-200 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                {currentChat.customerName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{currentChat.customerName}</h3>
                <p className="text-sm text-gray-500">{currentChat.phoneNumber}</p>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Phone className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {currentChat.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isFromCustomer ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.isFromCustomer
                        ? 'bg-white text-gray-900'
                        : 'bg-emerald-500 text-white'
                    }`}
                  >
                    <p className="break-words">{msg.body}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className={`text-xs ${msg.isFromCustomer ? 'text-gray-500' : 'text-emerald-100'}`}>
                        {formatTime(msg.timestamp)}
                      </span>
                      {!msg.isFromCustomer && (
                        <span>
                          {msg.status === 'read' ? (
                            <CheckCheck className="h-3 w-3 text-blue-300" />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck className="h-3 w-3 text-emerald-100" />
                          ) : (
                            <Check className="h-3 w-3 text-emerald-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-end gap-2">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  rows={1}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageText.trim() || isSending}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Send className="h-5 w-5" />
                  {isSending ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-400">
              <MessageCircle className="h-24 w-24 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Selecione uma conversa</h3>
              <p>Escolha um chat na lista à esquerda para começar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppChatInterface;
