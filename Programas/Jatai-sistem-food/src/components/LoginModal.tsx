import React, { useState } from 'react';
import { X, Lock, User } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validação básica
    if (!username.trim()) {
      setError('Por favor, insira um nome de usuário');
      setLoading(false);
      return;
    }

    if (!password.trim()) {
      setError('Por favor, insira uma senha');
      setLoading(false);
      return;
    }
    
    try {
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();
      console.log(`🔐 Tentando login para: ${trimmedUsername}`);
      
      const response = await axios.get(
        `https://docs.google.com/spreadsheets/d/1Q8BBrc9vnZA-MsPKhm4x7zQ9u2noxFgV4GPX5dxfLYo/gviz/tq?tqx=out:json&sheet=Sheet1&tq=SELECT A, B WHERE A = '${trimmedUsername}' AND B = '${trimmedPassword}'`
      );

      // Extract the data from the response
      const data = JSON.parse(response.data.substring(47).slice(0, -2));
      
      if (data.table.rows.length > 0) {
        console.log(`✅ Credenciais válidas para: ${trimmedUsername}`);
        
        try {
          const loginResult = await login(trimmedUsername);
          console.log(`✅ Login realizado com sucesso para: ${trimmedUsername}`);
          
          // Aguardar um pouco para garantir que o estado foi atualizado
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Fechar modal e redirecionar
          onClose();
          
          // Forçar navegação após um pequeno delay
          setTimeout(() => {
            console.log(`🔄 Redirecionando para /admin/${trimmedUsername}`);
            navigate(`/admin/${trimmedUsername}`);
          }, 200);
        } catch (error) {
          console.error('❌ Erro no processo de login:', error);
          setError('Erro interno. Tente novamente.');
          setLoading(false);
          return;
        }
      } else {
        console.log(`❌ Credenciais inválidas para: ${trimmedUsername}`);
        setError('Usuário ou senha inválidos');
      }
    } catch (err) {
      console.error('❌ Erro na requisição de login:', err);
      
      // Para desenvolvimento, permitir login com credenciais de teste
      if (username === 'admin' && password === 'admin') {
        console.log('🔧 Usando credenciais de desenvolvimento');
        try {
          await login('admin');
          onClose();
          setTimeout(() => {
            navigate('/admin/admin');
          }, 200);
        } catch (error) {
          setError('Erro ao fazer login de desenvolvimento');
        }
      } else {
        setError('Erro ao conectar com o servidor. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUsername('');
    setPassword('');
    setError('');
    setLoading(false);
    onClose();
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Login Administrativo</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usuário
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;