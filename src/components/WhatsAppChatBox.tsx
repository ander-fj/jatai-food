import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Phone, User, Search, X, Check, CheckCheck } from 'lucide-react';
import { database } from '../config/firebase';
import { ref, onValue, set, get } from 'firebase/database';
import { toast } from 'sonner';

interface Message {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  isFromCustomer: boolean;
  customerName?: string;
}

interface Chat {
  phoneNumber: string;
  customerName: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  messages: Message[];
}

const WhatsAppChatBox: React.FC = () => {
  const username = localStorage.getItem('username') || 'A';
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messagesRef = ref(database, `whatsapp_messages/${username}`);

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const chatsMap: { [key: string]: Chat } = {};

        Object.entries(data).forEach(([phoneNumber, messagesData]: [string, any]) => {
          const messagesList: Message[] = [];
          let customerName = phoneNumber;

          Object.entries(messagesData).forEach(([msgId, msg]: [string, any]) => {
            if (msgId === 'customerName') {
              customerName = msg as string;
              return;
            }

            if (msg && typeof msg === 'object' && msg.body) {
              messagesList.push({
                id: msgId,
                from: msg.from || phoneNumber,
                to: msg.to || username,
                body: msg.body,
                timestamp: msg.timestamp || Date.now(),
                isFromCustomer: msg.isFromCustomer !== false,
                customerName: msg.customerName || customerName
              });
            }
          });

          if (messagesList.length > 0) {
            messagesList.sort((a, b) => a.timestamp - b.timestamp);

            const lastMsg = messagesList[messagesList.length - 1];
            const unreadCount = messagesList.filter(m => m.isFromCustomer).length;

            chatsMap[phoneNumber] = {
              phoneNumber,
              customerName,
              lastMessage: lastMsg.body,
              lastMessageTime: lastMsg.timestamp,
              unreadCount,
              messages: messagesList
            };
          }
        });

        const chatsList = Object.values(chatsMap).sort(
          (a, b) => b.lastMessageTime - a.lastMessageTime
        );

        setChats(chatsList);

        if (chatsList.length > 0 && !selectedChat) {
          setSelectedChat(chatsList[0].phoneNumber);
        }
      } else {
        setChats([]);
      }
    });

    return () => unsubscribe();
  }, [username]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat, chats]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedChat) return;

    try {
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
        const error = await response.json();
        throw new Error(error.error || 'Erro ao enviar mensagem');
      }

      const result = await response.json();

      const msgId = result.messageId || `msg_${Date.now()}`;
      const messageRef = ref(database, `whatsapp_messages/${username}/${selectedChat}/${msgId}`);

      await set(messageRef, {
        id: msgId,
        from: username,
        to: selectedChat,
        body: messageText,
        timestamp: Date.now(),
        isFromCustomer: false,
        whatsappMessageId: result.messageId
      });

      setMessageText('');
      toast.success('Mensagem enviada via WhatsApp!');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    }
  };

  const currentChat = chats.find(c => c.phoneNumber === selectedChat);
  const filteredChats = chats.filter(chat =>
    chat.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.phoneNumber.includes(searchTerm)
  );

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-100">
      {/* Lista de conversas */}
      <div className="w-96 bg-white border-r flex flex-col">
        <div className="bg-green-600 text-white p-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            WhatsApp Business
          </h2>
          <p className="text-sm text-green-100 mt-1">{chats.length} conversas ativas</p>
        </div>

        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="font-semibold mb-2">Nenhuma conversa</p>
              <p className="text-sm">
                {searchTerm ? 'Nenhuma conversa encontrada' : 'Aguardando mensagens...'}
              </p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.phoneNumber}
                onClick={() => setSelectedChat(chat.phoneNumber)}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition ${
                  selectedChat === chat.phoneNumber ? 'bg-green-50 border-l-4 border-l-green-600' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {chat.customerName}
                      </h3>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatDate(chat.lastMessageTime)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      <Phone className="w-3 h-3 inline mr-1" />
                      {chat.phoneNumber}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {currentChat ? (
          <>
            {/* Header do chat */}
            <div className="bg-white border-b p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{currentChat.customerName}</h3>
                <p className="text-xs text-gray-500">{currentChat.phoneNumber}</p>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 0h100v100H0z" fill="%23f0f0f0"/%3E%3Cpath d="M50 0L0 50l50 50 50-50z" fill="%23e8e8e8" opacity=".1"/%3E%3C/svg%3E")' }}>
              {currentChat.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isFromCustomer ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-md px-4 py-2 rounded-lg shadow ${
                      message.isFromCustomer
                        ? 'bg-white text-gray-900'
                        : 'bg-green-500 text-white'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className={`text-xs ${message.isFromCustomer ? 'text-gray-500' : 'text-green-100'}`}>
                        {formatTime(message.timestamp)}
                      </span>
                      {!message.isFromCustomer && (
                        <CheckCheck className="w-4 h-4 text-green-100" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensagem */}
            <div className="bg-white border-t p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Digite uma mensagem..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageText.trim()}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Enviar
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MessageCircle className="w-24 h-24 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold mb-2">WhatsApp Business</h3>
              <p className="text-sm">Selecione uma conversa para começar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppChatBox;
