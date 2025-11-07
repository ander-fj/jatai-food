import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Smile, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  Star, 
  MessageSquare, 
  Calendar,
  User,
  Filter,
  Search,
  Trash2,
  Plus
} from 'lucide-react';
import { getTenantRef } from '../config/firebase';
import { onValue, set, push, update } from 'firebase/database';
 
interface CustomerJoke {
  id: string;
  joke: string;
  customerName: string;
  orderId: string;
  rating: number;
  comment?: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  isActive: boolean; // Se está sendo usada pelos entregadores
}

const AdminJokesManagement: React.FC = () => {
  const { theme, iconProps } = useTheme();
  const [customerJokes, setCustomerJokes] = useState<CustomerJoke[]>([]);
  const [filteredJokes, setFilteredJokes] = useState<CustomerJoke[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newJoke, setNewJoke] = useState('');

  // Carregar piadas dos clientes do Firebase
  useEffect(() => {
    try {
      const jokesRef = getTenantRef('customer-jokes');
      
      const unsubscribe = onValue(jokesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const jokesList = Object.entries(data).map(([id, joke]: [string, any]) => ({
            id,
            ...joke,
          }));
          setCustomerJokes(jokesList.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
        } else {
          setCustomerJokes([]);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('❌ Erro ao carregar piadas dos clientes:', error);
      setCustomerJokes([]);
      setLoading(false);
    }
  }, []);

  // Filtrar piadas
  useEffect(() => {
    let filtered = customerJokes;

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(joke => joke.status === statusFilter);
    }

    // Filtro por busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(joke => 
        joke.joke.toLowerCase().includes(term) ||
        joke.customerName.toLowerCase().includes(term) ||
        joke.orderId.toLowerCase().includes(term)
      );
    }

    setFilteredJokes(filtered);
  }, [customerJokes, statusFilter, searchTerm]);

  const updateJokeStatus = async (jokeId: string, status: 'approved' | 'rejected') => {
    try {
      const jokeRef = getTenantRef(`customer-jokes/${jokeId}`);
      await update(jokeRef, { status });
      console.log(`✅ Piada ${jokeId} ${status === 'approved' ? 'aprovada' : 'rejeitada'}`);
    } catch (error) {
      console.error('❌ Erro ao atualizar status da piada:', error);
    }
  };

  const toggleJokeActive = async (jokeId: string, isActive: boolean) => {
    try {
      const jokeRef = getTenantRef(`customer-jokes/${jokeId}`);
      await update(jokeRef, { isActive });
      console.log(`✅ Piada ${jokeId} ${isActive ? 'ativada' : 'desativada'} para entregadores`);
    } catch (error) {
      console.error('❌ Erro ao ativar/desativar piada:', error);
    }
  };

  const deleteJoke = async (jokeId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta piada?')) return;
    
    try {
      const jokeRef = getTenantRef(`customer-jokes/${jokeId}`);
      await set(jokeRef, null);
      console.log(`✅ Piada ${jokeId} excluída`);
    } catch (error) {
      console.error('❌ Erro ao excluir piada:', error);
    }
  };

  const addCustomJoke = async () => {
    if (!newJoke.trim()) return;

    try {
      const jokesRef = getTenantRef('customer-jokes');
      const newJokeRef = push(jokesRef);
      
      const jokeData: Omit<CustomerJoke, 'id'> = {
        joke: newJoke.trim(),
        customerName: 'Administrador',
        orderId: 'ADMIN',
        rating: 5,
        submittedAt: new Date().toISOString(),
        status: 'approved',
        isActive: true
      };

      await set(newJokeRef, jokeData);
      setNewJoke('');
      setShowAddModal(false);
      console.log('✅ Piada personalizada adicionada');
    } catch (error) {
      console.error('❌ Erro ao adicionar piada personalizada:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprovada';
      case 'rejected': return 'Rejeitada';
      case 'pending': return 'Pendente';
      default: return 'Desconhecido';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
        <span className="ml-3 text-gray-600" style={{ fontFamily: theme.fontFamily }}>
          Carregando piadas...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 
            className="text-2xl font-bold"
            style={{ 
              fontFamily: theme.fontFamily,
              color: theme.textColor
            }}
          >
            🎭 Gerenciar Piadas dos Clientes
          </h2>
          <p 
            className="text-gray-600 mt-1"
            style={{ fontFamily: theme.fontFamily }}
          >
            Gerencie as piadas enviadas pelos clientes e selecione quais os entregadores vão usar
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 text-white px-4 py-2 font-medium transition-colors"
          style={{
            backgroundColor: theme.accentColor,
            borderRadius: theme.borderRadius === 'none' ? '0' :
                         theme.borderRadius === 'sm' ? '0.125rem' :
                         theme.borderRadius === 'md' ? '0.375rem' :
                         theme.borderRadius === 'lg' ? '0.5rem' :
                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
            fontFamily: theme.fontFamily
          }}
        >
          <Plus className="h-5 w-5" {...iconProps}/>
          Adicionar Piada
        </button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div 
          className="bg-white p-4 shadow-sm"
          style={{
            borderRadius: theme.borderRadius === 'none' ? '0' :
                         theme.borderRadius === 'sm' ? '0.125rem' :
                         theme.borderRadius === 'md' ? '0.375rem' :
                         theme.borderRadius === 'lg' ? '0.5rem' :
                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
            fontFamily: theme.fontFamily
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold" style={{ color: theme.textColor }}>
                {customerJokes.length}
              </p>
            </div>
            <MessageSquare className="h-8 w-8 text-blue-500" {...iconProps}/>
          </div>
        </div>

        <div 
          className="bg-white p-4 shadow-sm"
          style={{
            borderRadius: theme.borderRadius === 'none' ? '0' :
                         theme.borderRadius === 'sm' ? '0.125rem' :
                         theme.borderRadius === 'md' ? '0.375rem' :
                         theme.borderRadius === 'lg' ? '0.5rem' :
                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
            fontFamily: theme.fontFamily
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-600">
                {customerJokes.filter(j => j.status === 'pending').length}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-yellow-500" {...iconProps}/>
          </div>
        </div>

        <div 
          className="bg-white p-4 shadow-sm"
          style={{
            borderRadius: theme.borderRadius === 'none' ? '0' :
                         theme.borderRadius === 'sm' ? '0.125rem' :
                         theme.borderRadius === 'md' ? '0.375rem' :
                         theme.borderRadius === 'lg' ? '0.5rem' :
                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
            fontFamily: theme.fontFamily
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Aprovadas</p>
              <p className="text-2xl font-bold text-green-600">
                {customerJokes.filter(j => j.status === 'approved').length}
              </p>
            </div>
            <Check className="h-8 w-8 text-green-500" {...iconProps}/>
          </div>
        </div>

        <div 
          className="bg-white p-4 shadow-sm"
          style={{
            borderRadius: theme.borderRadius === 'none' ? '0' :
                         theme.borderRadius === 'sm' ? '0.125rem' :
                         theme.borderRadius === 'md' ? '0.375rem' :
                         theme.borderRadius === 'lg' ? '0.5rem' :
                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
            fontFamily: theme.fontFamily
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ativas</p>
              <p className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
                {customerJokes.filter(j => j.isActive).length}
              </p>
            </div>
            <Eye className="h-8 w-8" style={{ color: theme.primaryColor }} {...iconProps}/>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div 
        className="bg-white p-4 shadow-sm"
        style={{
          borderRadius: theme.borderRadius === 'none' ? '0' :
                       theme.borderRadius === 'sm' ? '0.125rem' :
                       theme.borderRadius === 'md' ? '0.375rem' :
                       theme.borderRadius === 'lg' ? '0.5rem' :
                       theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
          fontFamily: theme.fontFamily
        }}
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
              <div className="relative"> <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" {...iconProps}/>
              <input
                type="text"
                placeholder="Buscar por piada, cliente ou pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:ring-2 focus:border-transparent"
                style={{
                  borderRadius: theme.borderRadius === 'none' ? '0' :
                               theme.borderRadius === 'sm' ? '0.125rem' :
                               theme.borderRadius === 'md' ? '0.375rem' :
                               theme.borderRadius === 'lg' ? '0.5rem' :
                               theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                  fontFamily: theme.fontFamily,
                  '--tw-ring-color': theme.primaryColor
                } as React.CSSProperties}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" {...iconProps}/>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 focus:ring-2 focus:border-transparent"
              style={{
                borderRadius: theme.borderRadius === 'none' ? '0' :
                             theme.borderRadius === 'sm' ? '0.125rem' :
                             theme.borderRadius === 'md' ? '0.375rem' :
                             theme.borderRadius === 'lg' ? '0.5rem' :
                             theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                fontFamily: theme.fontFamily,
                '--tw-ring-color': theme.primaryColor
              } as React.CSSProperties}
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendentes</option>
              <option value="approved">Aprovadas</option>
              <option value="rejected">Rejeitadas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Piadas */}
      <div className="space-y-4">
        {filteredJokes.length === 0 ? (
          <div 
            className="bg-white p-8 text-center shadow-sm"
            style={{
              borderRadius: theme.borderRadius === 'none' ? '0' :
                           theme.borderRadius === 'sm' ? '0.125rem' :
                           theme.borderRadius === 'md' ? '0.375rem' :
                           theme.borderRadius === 'lg' ? '0.5rem' :
                           theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
              fontFamily: theme.fontFamily
            }}
          >
            <Smile className="h-16 w-16 text-gray-300 mx-auto mb-4" {...iconProps}/>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {searchTerm || statusFilter !== 'all' ? 'Nenhuma piada encontrada' : 'Nenhuma piada enviada ainda'}
            </h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Tente ajustar os filtros de busca'
                : 'As piadas enviadas pelos clientes aparecerão aqui'
              }
            </p>
          </div>
        ) : (
          filteredJokes.map((joke) => (
            <div 
              key={joke.id}
              className="bg-white p-6 shadow-sm border-l-4"
              style={{
                borderRadius: theme.borderRadius === 'none' ? '0' :
                             theme.borderRadius === 'sm' ? '0.125rem' :
                             theme.borderRadius === 'md' ? '0.375rem' :
                             theme.borderRadius === 'lg' ? '0.5rem' :
                             theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                fontFamily: theme.fontFamily,
                borderLeftColor: joke.isActive ? theme.accentColor : 
                                joke.status === 'approved' ? '#10B981' :
                                joke.status === 'rejected' ? '#EF4444' : '#F59E0B'
              }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(joke.status)}`}>
                      {getStatusText(joke.status)}
                    </span>
                    {joke.isActive && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        🎯 Ativa para Entregadores
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${ 
                            star <= joke.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3"> <div className="flex items-center gap-1">
                      <User className="h-4 w-4" {...iconProps}/>
                      <span>{joke.customerName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>Pedido: {joke.orderId}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" {...iconProps}/>
                      <span>{new Date(joke.submittedAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl">😄</span>
                    <p className="text-gray-800 italic" style={{ fontFamily: theme.fontFamily }}>
                      "{joke.joke}"
                    </p>
                  </div>
                </div>
              </div>

              {joke.comment && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Comentário do cliente:</p>
                  <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                    <p className="text-gray-700 text-sm italic">"{joke.comment}"</p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {joke.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateJokeStatus(joke.id, 'approved')}
                        className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 transition-colors text-sm font-medium"
                        style={{
                          borderRadius: theme.borderRadius === 'none' ? '0' :
                                       theme.borderRadius === 'sm' ? '0.125rem' :
                                       theme.borderRadius === 'md' ? '0.375rem' :
                                       theme.borderRadius === 'lg' ? '0.5rem' :
                                       theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                          fontFamily: theme.fontFamily
                        }}
                      > <Check className="h-4 w-4" {...iconProps}/>
                        Aprovar
                      </button>
                      <button
                        onClick={() => updateJokeStatus(joke.id, 'rejected')}
                        className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 transition-colors text-sm font-medium"
                        style={{
                          borderRadius: theme.borderRadius === 'none' ? '0' :
                                       theme.borderRadius === 'sm' ? '0.125rem' :
                                       theme.borderRadius === 'md' ? '0.375rem' :
                                       theme.borderRadius === 'lg' ? '0.5rem' :
                                       theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                          fontFamily: theme.fontFamily
                        }}
                      > <X className="h-4 w-4" {...iconProps}/>
                        Rejeitar
                      </button>
                    </>
                  )}
                  
                  {joke.status === 'approved' && (
                    <button
                      onClick={() => toggleJokeActive(joke.id, !joke.isActive)}
                      className={`flex items-center gap-1 px-3 py-1 transition-colors text-sm font-medium ${
                        joke.isActive 
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={{
                        borderRadius: theme.borderRadius === 'none' ? '0' :
                                     theme.borderRadius === 'sm' ? '0.125rem' :
                                     theme.borderRadius === 'md' ? '0.375rem' :
                                     theme.borderRadius === 'lg' ? '0.5rem' :
                                     theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                        fontFamily: theme.fontFamily
                      }}
                    >
                      {joke.isActive ? <EyeOff className="h-4 w-4" {...iconProps}/> : <Eye className="h-4 w-4" {...iconProps}/>}
                      {joke.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                  )}
                </div>

                <button
                  onClick={() => deleteJoke(joke.id)}
                  className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 transition-colors text-sm font-medium"
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily
                  }}
                >
                  <Trash2 className="h-4 w-4" {...iconProps}/>
                  Excluir
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal para Adicionar Piada */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            className="bg-white p-6 w-full max-w-md"
            style={{
              borderRadius: theme.borderRadius === 'none' ? '0' :
                           theme.borderRadius === 'sm' ? '0.125rem' :
                           theme.borderRadius === 'md' ? '0.375rem' :
                           theme.borderRadius === 'lg' ? '0.5rem' :
                           theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
              fontFamily: theme.fontFamily
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: theme.textColor }}>
                Adicionar Piada Personalizada
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" {...iconProps}/>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Piada
                </label>
                <textarea
                  value={newJoke}
                  onChange={(e) => setNewJoke(e.target.value)}
                  placeholder="Digite uma piada divertida para os entregadores..."
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:border-transparent resize-none"
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily,
                    '--tw-ring-color': theme.primaryColor
                  } as React.CSSProperties}
                  rows={4}
                  maxLength={300}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {newJoke.length}/300 caracteres
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={addCustomJoke}
                  disabled={!newJoke.trim()}
                  className="px-4 py-2 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: theme.primaryColor,
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily
                  }}
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminJokesManagement;