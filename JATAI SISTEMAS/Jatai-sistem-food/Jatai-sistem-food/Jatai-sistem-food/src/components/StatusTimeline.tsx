import React from 'react';
import { useState, useEffect } from 'react';
import { CheckCircle, Star, MessageSquare, Send, Bike, MapPin } from 'lucide-react';
import { getDatabase, ref, onValue, push, set } from 'firebase/database';
import { useParams } from 'react-router-dom';

interface Status {
  id: number;
  name: string;
  completed: boolean;
  time: string;
  timestamp?: string;
}

interface ApprovedJoke {
  id: string;
  joke: string;
  customerName: string;
  isActive: boolean;
  status: string;
}

interface StatusTimelineProps {
  statuses: Status[];
  orderId?: string;
  tenantId?: string;
}

const StatusTimeline: React.FC<StatusTimelineProps> = ({ statuses, orderId, tenantId }) => {
  const [showSurvey, setShowSurvey] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [joke, setJoke] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const [realtimeStatuses, setRealtimeStatuses] = useState<Status[]>(statuses);
  const [orderData, setOrderData] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('offline');
  const [showJokeSuggestions, setShowJokeSuggestions] = useState(false);
  const [hasExistingRating, setHasExistingRating] = useState(false);
  const [isLoadingRating, setIsLoadingRating] = useState(true);
  const [approvedJokes, setApprovedJokes] = useState<ApprovedJoke[]>([]);
  const [isLoadingJokes, setIsLoadingJokes] = useState(true);

  // Piadas padrão que sempre aparecem após as aprovadas
  const defaultJokes = [
    "Por que o entregador sempre chega na hora certa? Porque ele tem pizza na massa! 🍕😄",
    "O que o entregador disse quando chegou? Delivery-cioso! 😋",
    "Por que o entregador é sempre feliz? Porque ele entrega alegria! 😊",
    "O que é que o entregador mais gosta? De fazer entregas especiais! 📦❤️",
    "Por que o entregador nunca se perde? Porque ele sempre encontra o caminho do coração! 💝"
  ];

  // Carregar piadas aprovadas e ativas do Firebase
  useEffect(() => {
    if (!tenantId) {
      setApprovedJokes([]);
      setIsLoadingJokes(false);
      return;
    }

    const loadApprovedJokes = async () => {
      try {
        const db = getDatabase();
        const jokesRef = ref(db, `tenants/${tenantId}/customer-jokes`);
        
        console.log(`🔄 Carregando piadas aprovadas para tenant: ${tenantId}`);
        
        const unsubscribe = onValue(jokesRef, (snapshot) => {
          const data = snapshot.val();
          const activeJokes: ApprovedJoke[] = [];
          
          console.log(`📊 Dados de piadas recebidos:`, data);
          
          if (data) {
            Object.entries(data).forEach(([id, jokeData]: [string, any]) => {
              console.log(`🔍 Verificando piada ${id}:`, jokeData);
              
              // Apenas piadas aprovadas e ativas
              if (jokeData.status === 'approved' && jokeData.isActive === true) {
                activeJokes.push({
                  id,
                  joke: jokeData.joke,
                  customerName: jokeData.customerName || 'Cliente',
                  isActive: jokeData.isActive,
                  status: jokeData.status
                });
                console.log(`✅ Piada aprovada adicionada: ${jokeData.joke.substring(0, 50)}...`);
              }
            });
          }
          
          setApprovedJokes(activeJokes);
          setIsLoadingJokes(false);
          console.log(`✅ Total de piadas aprovadas carregadas: ${activeJokes.length}`);
        }, (error) => {
          console.error('❌ Erro ao carregar piadas aprovadas:', error);
          setApprovedJokes([]);
          setIsLoadingJokes(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('❌ Erro ao configurar listener de piadas:', error);
        setApprovedJokes([]);
        setIsLoadingJokes(false);
      }
    };

    loadApprovedJokes();
  }, [tenantId]);

  // Combinar piadas: primeiro as aprovadas, depois as padrão
  const getCombinedJokes = () => {
    const approvedJokesTexts = approvedJokes.map(j => j.joke);
    
    // Sempre retorna: piadas aprovadas primeiro + piadas padrão depois
    const combined = [...approvedJokesTexts, ...defaultJokes];
    console.log(`🎭 Piadas combinadas: ${approvedJokesTexts.length} aprovadas + ${defaultJokes.length} padrão = ${combined.length} total`);
    return combined;
  };

  // Obter estatísticas das piadas
  const getJokesStats = () => {
    const approved = approvedJokes.length;
    const total = getCombinedJokes().length;
    return { approved, default: defaultJokes.length, total };
  };

  const selectJoke = (jokeText: string) => {
    setJoke(jokeText);
    setShowJokeSuggestions(false);
  };

  const selectRandomJoke = () => {
    const combinedJokes = getCombinedJokes();
    const randomJoke = combinedJokes[Math.floor(Math.random() * combinedJokes.length)];
    setJoke(randomJoke);
    setShowJokeSuggestions(false);
  };

  // Verificar se já existe uma avaliação para este pedido
  useEffect(() => {
    if (!orderId || !tenantId) {
      setIsLoadingRating(false);
      return;
    }

    const checkExistingRating = async () => {
      try {
        const db = getDatabase();
        const ratingsRef = ref(db, `tenants/${tenantId}/ratings`);
        
        onValue(ratingsRef, (snapshot) => {
          const ratings = snapshot.val();
          let hasRating = false;
          
          if (ratings) {
            // Verificar se existe uma avaliação para este pedido
            Object.values(ratings).forEach((rating: any) => {
              if (rating.orderId === orderId) {
                hasRating = true;
              }
            });
          }
          
          setHasExistingRating(hasRating);
          setIsLoadingRating(false);
          console.log(`📊 Verificação de avaliação: ${hasRating ? 'Já avaliado' : 'Não avaliado'} para pedido ${orderId}`);
        });
      } catch (error) {
        console.error('❌ Erro ao verificar avaliação existente:', error);
        setIsLoadingRating(false);
      }
    };

    checkExistingRating();
  }, [orderId, tenantId]);

  // Listener para dados em tempo real do Firebase
  useEffect(() => {
    if (!orderId || !tenantId) {
      setRealtimeStatuses(statuses);
      return;
    }

    console.log(`🔄 StatusTimeline: Configurando listener para pedido ${orderId} no tenant ${tenantId}`);
    
    const db = getDatabase();
    
    // Monitorar conexão
    const connectedRef = ref(db, '.info/connected');
    const unsubscribeConnection = onValue(connectedRef, (snapshot) => {
      const connected = snapshot.val();
      setConnectionStatus(connected ? 'online' : 'offline');
      console.log(`🔗 StatusTimeline: Conexão Firebase: ${connected ? 'online' : 'offline'}`);
    });

    // Listener para o pedido específico
    const orderRef = ref(db, `tenants/${tenantId}/orders/${orderId}`);
    const unsubscribeOrder = onValue(orderRef, (snapshot) => {
      const data = snapshot.val();
      console.log(`📦 StatusTimeline: Dados do pedido atualizados:`, data);
      
      if (data) {
        setOrderData(data);
        
        // Mapear status do Firebase para timeline
        const updatedStatuses = mapFirebaseStatusToTimeline(data.status, data.orderTime, data.createdAt, data.updatedAt);
        setRealtimeStatuses(updatedStatuses);
        
        console.log(`✅ StatusTimeline: Status atualizado para: ${data.status}`);
      } else {
        console.log(`❌ StatusTimeline: Pedido ${orderId} não encontrado`);
        setRealtimeStatuses(statuses);
      }
    }, (error) => {
      console.error(`❌ StatusTimeline: Erro ao carregar pedido:`, error);
      setConnectionStatus('offline');
      setRealtimeStatuses(statuses);
    });

    return () => {
      unsubscribeConnection();
      unsubscribeOrder();
      console.log(`🧹 StatusTimeline: Listeners removidos para pedido ${orderId}`);
    };
  }, [orderId, tenantId, statuses]);

  // Função para mapear status do Firebase para timeline
  const mapFirebaseStatusToTimeline = (
    currentStatus: string, 
    orderTime: string, 
    createdAt?: string,
    updatedAt?: string
  ): Status[] => {
    const baseTime = createdAt ? new Date(createdAt) : (() => {
      const [hours, minutes] = orderTime.split(':').map(Number);
      const orderDate = new Date();
      orderDate.setHours(hours, minutes, 0, 0);
      return orderDate;
    })();

    const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const statusOrder = ['Novo', 'Preparando', 'Pronto para Entrega', 'A caminho', 'Entregue'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    
    return [
      {
        id: 1,
        name: 'Pedido Recebido',
        completed: true,
        time: formatTime(baseTime),
        timestamp: createdAt || baseTime.toISOString()
      },
      {
        id: 2,
        name: 'Preparando',
        completed: currentIndex >= 1,
        time: currentIndex >= 1 ? formatTime(new Date(baseTime.getTime() + 5 * 60000)) : '',
        timestamp: currentIndex >= 1 ? new Date(baseTime.getTime() + 5 * 60000).toISOString() : undefined
      },
      {
        id: 3,
        name: 'Pronto para Entrega',
        completed: currentIndex >= 2,
        time: currentIndex >= 2 ? formatTime(new Date(baseTime.getTime() + 20 * 60000)) : '',
        timestamp: currentIndex >= 2 ? new Date(baseTime.getTime() + 20 * 60000).toISOString() : undefined
      },
      {
        id: 4,
        name: 'A caminho',
        completed: currentIndex >= 3,
        time: currentIndex >= 3 ? formatTime(new Date(baseTime.getTime() + 25 * 60000)) : '',
        timestamp: currentIndex >= 3 ? new Date(baseTime.getTime() + 25 * 60000).toISOString() : undefined
      },
      {
        id: 5,
        name: 'Entregue',
        completed: currentIndex >= 4,
        time: currentIndex >= 4 ? (updatedAt ? formatTime(new Date(updatedAt)) : formatTime(new Date(baseTime.getTime() + 40 * 60000))) : '',
        timestamp: currentIndex >= 4 ? (updatedAt || new Date(baseTime.getTime() + 40 * 60000).toISOString()) : undefined
      }
    ];
  };

  // Verificar se o pedido foi entregue
  const isDelivered = realtimeStatuses.some(status => status.name === 'Entregue' && status.completed);
  
  // Verificar se o pedido está "A caminho"
  const isOnTheWay = realtimeStatuses.some(status => status.name === 'A caminho' && status.completed);
  
  const handleStarClick = (starRating: number) => {
    setRating(starRating);
  };

  const handleStarHover = (starRating: number) => {
    setHoveredRating(starRating);
  };

  const handleStarLeave = () => {
    setHoveredRating(0);
  };

  const handleSubmitSurvey = async () => {
    if (rating > 0 && !hasExistingRating) {
      try {
        // Salvar avaliação no Firebase
        await saveCustomerFeedback();
        setSubmitted(true);
        setHasExistingRating(true);
        
        // Simular envio
        setTimeout(() => {
          setShowSurvey(false);
        }, 2000);
      } catch (error) {
        console.error('❌ Erro ao enviar avaliação:', error);
        alert('Erro ao enviar avaliação. Tente novamente.');
      }
    }
  };

  const saveCustomerFeedback = async () => {
    if (!orderId || !tenantId) {
      throw new Error('Dados do pedido não encontrados');
    }

    try {
      const db = getDatabase();
      
      // Salvar avaliação
      const ratingsRef = ref(db, `tenants/${tenantId}/ratings`);
      const newRatingRef = push(ratingsRef);
      
      const ratingData = {
        orderId: orderId,
        customerName: orderData?.customerName || 'Cliente',
        rating: rating,
        comment: comment.trim() || '',
        submittedAt: new Date().toISOString(),
        orderValue: orderData?.total || 0,
        deliveryTime: orderData?.estimatedTime || ''
      };

      await set(newRatingRef, ratingData);
      console.log('✅ Avaliação salva com sucesso');

      // Salvar piada se foi fornecida
      if (joke.trim()) {
        const jokesRef = ref(db, `tenants/${tenantId}/customer-jokes`);
        const newJokeRef = push(jokesRef);
        
        const jokeData = {
          joke: joke.trim(),
          customerName: orderData?.customerName || 'Cliente',
          orderId: orderId,
          rating: rating,
          comment: comment.trim() || '',
          submittedAt: new Date().toISOString(),
          status: 'pending',
          isActive: false
        };

        await set(newJokeRef, jokeData);
        console.log('✅ Piada do cliente salva para moderação');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar feedback do cliente:', error);
      throw error;
    }
  };

  const handleConfirmDelivery = () => {
    console.log('Recebimento confirmado pelo cliente');
    setDeliveryConfirmed(true);
  };

  const getRatingText = (stars: number) => {
    switch (stars) {
      case 1: return 'Muito insatisfeito';
      case 2: return 'Insatisfeito';
      case 3: return 'Regular';
      case 4: return 'Satisfeito';
      case 5: return 'Muito satisfeito';
      default: return 'Selecione uma avaliação';
    }
  };

  // Verificar se pode mostrar o botão de avaliação
  const canShowRatingButton = isDelivered && deliveryConfirmed && !hasExistingRating && !submitted && !isLoadingRating;

  return (
    <div className="bg-white p-4 rounded-md shadow-md space-y-4">
      <h3 className="text-lg font-semibold mb-3">Status do Pedido</h3>
      
      {/* Indicador de conexão em tempo real */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full ${connectionStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
        <span className="text-xs text-gray-600">
          {connectionStatus === 'online' ? 'Tempo real ativo' : 'Reconectando...'}
        </span>
        {orderData && (
          <span className="text-xs text-blue-600 ml-2">
            Status atual: {orderData.status}
          </span>
        )}
      </div>
      
      <div className="space-y-4">
        {realtimeStatuses.map((status) => (
          <div key={status.id} className="flex">
            <div className="mr-3">
              <CheckCircle className={`h-5 w-5 transition-colors duration-300 ${status.completed ? 'text-green-500' : 'text-gray-300'}`} />
            </div>
            <div className="flex-1">
              <p className={`font-medium transition-colors duration-300 ${status.completed ? 'text-black' : 'text-gray-500'}`}>
                {status.name}
              </p>
              {status.completed && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">{status.time}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Seção do Mapa - Oculta quando o pedido está entregue */}
      {!isDelivered && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <MapPin className="h-5 w-5 text-blue-600" />
              <h4 className="text-lg font-semibold text-blue-800">
                Acompanhe sua entrega
              </h4>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg mb-3">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Mapa de rastreamento</p>
                  <p className="text-gray-400 text-xs">Localização em tempo real</p>
                </div>
              </div>
              
              {isOnTheWay && (
                <div className="flex items-center gap-2 text-green-600">
                  <Bike className="h-4 w-4" />
                  <span className="text-sm font-medium">Entregador a caminho!</span>
                </div>
              )}
              
              {orderData?.deliveryAddress && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-700 mb-1">Endereço de entrega:</p>
                  <p className="text-sm text-gray-600">{orderData.deliveryAddress}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Seção de Pesquisa de Satisfação */}
      {(isOnTheWay || isDelivered) && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          {/* Mostrar se já foi avaliado */}
          {hasExistingRating && isDelivered && (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Star className="h-8 w-8 text-blue-600 fill-current" />
              </div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">
                Pedido Já Avaliado!
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Obrigado pela sua avaliação! Ela é muito importante para nós.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-700 text-sm font-medium">
                  ⭐ Avaliação enviada com sucesso
                </p>
                <p className="text-blue-600 text-xs mt-1">
                  Sua opinião nos ajuda a melhorar nossos serviços!
                </p>
              </div>
            </div>
          )}

          {/* Confirmação de entrega - apenas se entregue e não confirmado */}
          {isDelivered && !deliveryConfirmed && !hasExistingRating && (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">
                Pedido Entregue!
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Confirme o recebimento do seu pedido para avaliar nossa experiência.
              </p>
              <button
                onClick={handleConfirmDelivery}
                className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200"
              >
                Confirmar Recebimento
              </button>
            </div>
          )}

          {/* Botão para mostrar pesquisa - apenas se pode mostrar */}
          {canShowRatingButton && !showSurvey && (
            <div className="text-center py-4">
              <button
                onClick={() => setShowSurvey(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2 mx-auto"
              >
                <Star className="h-5 w-5" />
                Avaliar Experiência
              </button>
            </div>
          )}

          {/* Formulário de Pesquisa */}
          {showSurvey && !submitted && !hasExistingRating && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 space-y-6">
              <div className="text-center">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">
                  Como foi sua experiência?
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Sua opinião é muito importante para nós!
                </p>
              </div>

              {/* Sistema de Estrelas */}
              <div className="flex flex-col items-center space-y-3">
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleStarClick(star)}
                      onMouseEnter={() => handleStarHover(star)}
                      onMouseLeave={handleStarLeave}
                      className="p-1 transition-transform duration-150 hover:scale-110 focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 transition-colors duration-200 ${
                          star <= (hoveredRating || rating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                
                {/* Texto da avaliação */}
                <div className="text-center">
                  <p className={`text-sm font-medium transition-colors duration-200 ${
                    (hoveredRating || rating) > 0 ? 'text-gray-800' : 'text-gray-500'
                  }`}>
                    {getRatingText(hoveredRating || rating)}
                  </p>
                </div>
              </div>

              {/* Campo de Comentário */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MessageSquare className="h-4 w-4" />
                  Comentário (opcional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Conte-nos mais sobre sua experiência..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none text-sm"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-right text-xs text-gray-500">
                  {comment.length}/500 caracteres
                </div>
              </div>

              {/* Campo para piada para o entregador */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <span className="text-lg">😄</span>
                    Compartilhe uma piada para alegrar o dia do entregador (opcional)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowJokeSuggestions(!showJokeSuggestions)}
                      className="text-xs bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-2 py-1 rounded-md transition-colors duration-200"
                      disabled={isLoadingJokes}
                    >
                      💡 {isLoadingJokes ? 'Carregando...' : 'Sugestões'}
                    </button>
                    <button
                      type="button"
                      onClick={selectRandomJoke}
                      className="text-xs bg-orange-200 hover:bg-orange-300 text-orange-800 px-2 py-1 rounded-md transition-colors duration-200"
                      disabled={isLoadingJokes}
                    >
                      🎲 Aleatória
                    </button>
                  </div>
                </div>
                
                {showJokeSuggestions && !isLoadingJokes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-yellow-800">
                        Piadas disponíveis:
                      </p>
                      <div className="flex gap-2">
                        {approvedJokes.length > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            ✅ {approvedJokes.length} aprovadas
                          </span>
                        )}
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          🎭 {defaultJokes.length} padrão
                        </span>
                      </div>
                    </div>
                    
                    {/* Seção de piadas aprovadas */}
                    {approvedJokes.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-green-800 mb-2 border-b border-green-200 pb-1">
                          🌟 Piadas Aprovadas pelos Clientes:
                        </p>
                        {approvedJokes.map((approvedJoke, index) => (
                          <button
                            key={`approved-${index}`}
                            onClick={() => selectJoke(approvedJoke.joke)}
                            className="block w-full text-left text-sm text-green-700 hover:text-green-900 hover:bg-green-100 p-2 rounded transition-colors duration-200 mb-1"
                          >
                            {approvedJoke.joke}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Seção de piadas padrão */}
                    <div>
                      <p className="text-xs font-semibold text-blue-800 mb-2 border-b border-blue-200 pb-1">
                        🎪 Piadas Clássicas:
                      </p>
                      {defaultJokes.map((jokeText, index) => (
                        <button
                          key={`default-${index}`}
                          onClick={() => selectJoke(jokeText)}
                          className="block w-full text-left text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-100 p-2 rounded transition-colors duration-200 mb-1"
                        >
                          {jokeText}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <textarea
                  value={joke}
                  onChange={(e) => setJoke(e.target.value)}
                  placeholder="Digite uma piada engraçada para o entregador..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none text-sm"
                  rows={2}
                  maxLength={300}
                />
                <div className="text-right text-xs text-gray-500">
                  {joke.length}/300 caracteres
                </div>
              </div>

              {/* Botão de Envio */}
              <button
                onClick={handleSubmitSurvey}
                disabled={rating === 0}
                className={`w-full flex items-center justify-center gap-2 font-medium py-3 px-4 rounded-lg transition-all duration-200 transform ${
                  rating > 0
                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:scale-105 shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Send className="h-5 w-5" />
                Enviar Avaliação
              </button>
            </div>
          )}

          {/* Confirmação de envio */}
          {submitted && (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">
                Avaliação Enviada!
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Obrigado pelo seu feedback! Sua avaliação foi registrada com sucesso.
              </p>
              {rating && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-medium text-green-800">
                    {getRatingText(rating)}
                  </p>
                </div>
              )}
              {comment && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 italic">"{comment}"</p>
                </div>
              )}
              {joke && (
                <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">😄</span>
                    <div>
                      <p className="text-xs font-medium text-yellow-800 mb-1">Piada para o entregador:</p>
                      <p className="text-sm text-yellow-700 italic">"{joke}"</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatusTimeline;