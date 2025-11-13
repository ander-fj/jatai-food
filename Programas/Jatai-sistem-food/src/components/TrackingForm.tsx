import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package } from 'lucide-react';

const TrackingForm: React.FC = () => {
  const [trackingCode, setTrackingCode] = useState('');
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingCode.trim()) {
      setError('Por favor, insira um código de rastreamento');
      return;
    }
    
    setIsSearching(true);
    setError('');
    
    // Simular um pequeno delay para melhor UX
    setTimeout(() => {
      setIsSearching(false);
      navigate(`/delivery-status/${trackingCode.trim().toUpperCase()}`);
    }, 500);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <Package className="h-6 w-6 text-red-600" />
        <h2 className="text-xl font-semibold">Rastreamento de Pedido</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Código de Rastreamento
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ex: ZCQAOM99"
            value={trackingCode}
            onChange={(e) => {
              setTrackingCode(e.target.value.toUpperCase());
              setError('');
            }}
            className={`flex-1 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent`}
            disabled={isSearching}
            maxLength={10}
          />
          <button
            type="submit"
            disabled={isSearching}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-6 py-3 rounded-lg flex items-center transition-colors font-medium"
          >
            {isSearching ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Buscando no sistema...
              </>
            ) : (
              <>
                <Search className="h-5 w-5 mr-2" />
                Rastrear
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
        <div className="mt-3 text-xs text-gray-500">
          <p>💡 O sistema busca automaticamente em todas as pizzarias cadastradas</p>
        </div>
        
        {/* Botão para consultar pedidos feitos */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              // Navegar para página de consulta de pedidos
              window.location.href = '/meus-pedidos';
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors font-medium"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Consultar Meus Pedidos
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Veja o histórico de todos os seus pedidos anteriores
          </p>
        </div>
      </form>
    </div>
  );
};

export default TrackingForm;