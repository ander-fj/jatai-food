import { useState, useEffect } from 'react';

interface UserData {
  isLoggedIn: boolean;
  username: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
}

export const useAuth = () => {
  const [userData, setUserData] = useState<UserData>(() => {
    // Inicialização mais robusta
    try {
      const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const storedUsername = localStorage.getItem('username') || '';
      const storeName = localStorage.getItem('storeName') || '';
      const storeAddress = localStorage.getItem('storeAddress') || '';
      const storePhone = localStorage.getItem('storePhone') || '';

      console.log('🔍 useAuth: Inicializando com dados do localStorage', {
        loggedIn,
        storedUsername,
        storeName,
        hasAllData: !!(loggedIn && storedUsername && storeName)
      });

      return {
        isLoggedIn: loggedIn && !!storedUsername, // Só considera logado se tem username
        username: storedUsername,
        storeName: storeName,
        storeAddress: storeAddress,
        storePhone: storePhone
      };
    } catch (error) {
      console.error('❌ Erro ao inicializar useAuth:', error);
      return {
        isLoggedIn: false,
        username: '',
        storeName: '',
        storeAddress: '',
        storePhone: ''
      };
    }
  });

  // Listener para mudanças no localStorage (para sincronizar entre abas)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'isLoggedIn' || e.key === 'username') {
        console.log('🔄 useAuth: Detectada mudança no localStorage');
        const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const username = localStorage.getItem('username') || '';
        
        if (loggedIn && username) {
          setUserData({
            isLoggedIn: true,
            username,
            storeName: localStorage.getItem('storeName') || '',
            storeAddress: localStorage.getItem('storeAddress') || '',
            storePhone: localStorage.getItem('storePhone') || ''
          });
        } else {
          setUserData({
            isLoggedIn: false,
            username: '',
            storeName: '',
            storeAddress: '',
            storePhone: ''
          });
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (username: string) => {
    try {
      console.log(`🔐 Iniciando login para usuário: ${username}`);
      
      if (!username || username.trim() === '') {
        throw new Error('Username não pode estar vazio');
      }

      const trimmedUsername = username.trim();
      
      // Generate store-specific data
      const storeNumber = Math.floor(Math.random() * 100) + 1;
      const newUserData = {
        isLoggedIn: true,
        username: trimmedUsername,
        storeName: `Pizzaria Delícia #${storeNumber}`,
        storeAddress: `Rua ${trimmedUsername.charAt(0).toUpperCase() + trimmedUsername.slice(1)}, ${storeNumber * 100}`,
        storePhone: `(11) ${Math.floor(Math.random() * 90000) + 10000}-${Math.floor(Math.random() * 9000) + 1000}`
      };

      // Salvar no localStorage de forma síncrona
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', trimmedUsername);
      localStorage.setItem('storeName', newUserData.storeName);
      localStorage.setItem('storeAddress', newUserData.storeAddress);
      localStorage.setItem('storePhone', newUserData.storePhone);

      // Atualizar estado imediatamente
      setUserData(newUserData);
      
      console.log(`✅ Login realizado com sucesso para: ${trimmedUsername}`, newUserData);
      
      // Verificar se os dados foram salvos corretamente
      const verification = {
        isLoggedIn: localStorage.getItem('isLoggedIn'),
        username: localStorage.getItem('username'),
        storeName: localStorage.getItem('storeName')
      };
      console.log('🔍 Verificação pós-login:', verification);
      
      return newUserData;
    } catch (error) {
      console.error('❌ Erro durante login:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('🚪 Realizando logout');
    
    // Limpar localStorage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('storeName');
    localStorage.removeItem('storeAddress');
    localStorage.removeItem('storePhone');

    // Atualizar estado
    setUserData({
      isLoggedIn: false,
      username: '',
      storeName: '',
      storeAddress: '',
      storePhone: ''
    });
    
    console.log('✅ Logout realizado com sucesso');
  };

  // Função para verificar se está realmente autenticado
  const isAuthenticated = () => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const username = localStorage.getItem('username');
    const isValid = loggedIn && !!username && userData.isLoggedIn && !!userData.username;
    
    console.log('🔍 isAuthenticated:', {
      localStorageLoggedIn: loggedIn,
      localStorageUsername: username,
      stateLoggedIn: userData.isLoggedIn,
      stateUsername: userData.username,
      isValid
    });
    
    return isValid;
  };

  return { 
    ...userData, 
    login, 
    logout, 
    isAuthenticated 
  };
};