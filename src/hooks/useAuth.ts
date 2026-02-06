import { useState, useEffect } from 'react';
import { getTenantRef } from '../config/firebase';
import { set, get } from 'firebase/database';

interface UserData {
  isLoggedIn: boolean;
  username: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeFooter: string; // Novo campo para o texto do rodapé
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
      const storeFooter = localStorage.getItem('storeFooter') || `© ${new Date().getFullYear()} Secontaf. Todos os direitos reservados.`;

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
        storePhone: storePhone,
        storeFooter: storeFooter
      };
    } catch (error) {
      console.error('❌ Erro ao inicializar useAuth:', error);
      return {
        isLoggedIn: false,
        username: '',
        storeName: '',
        storeAddress: '',
        storePhone: '',
        storeFooter: '',
      };
    }
  });

  const fetchStoreInfo = async (username: string) => {
    if (!username) return;
    try {
      console.log(`ℹ️ Buscando informações da loja para: ${username}`);
      const storeInfoRef = getTenantRef('info', username);
      const snapshot = await get(storeInfoRef);

      if (snapshot.exists()) {
        const storeInfo = snapshot.val();
        const newStoreData = {
          storeName: storeInfo.name || '',
          storeAddress: storeInfo.address || '',
          storePhone: storeInfo.phone || '',
        };

        console.log('✅ Informações da loja encontradas:', newStoreData);

        localStorage.setItem('storeName', newStoreData.storeName);
        localStorage.setItem('storeAddress', newStoreData.storeAddress);
        localStorage.setItem('storePhone', newStoreData.storePhone);

        setUserData(prev => ({
          ...prev,
          ...newStoreData,
        }));
      } else {
        console.log('⚠️ Nenhuma informação da loja encontrada no Firebase.');
        // Se não encontrar, limpa o que tiver localmente para evitar inconsistência
        localStorage.removeItem('storeName');
        localStorage.removeItem('storeAddress');
        localStorage.removeItem('storePhone');
        setUserData(prev => ({
            ...prev,
            storeName: '',
            storeAddress: '',
            storePhone: '',
        }));
      }
    } catch (error) {
      console.error('❌ Erro ao buscar informações da loja:', error);
    }
  };

  // Efeito para buscar dados da loja na inicialização ou no login
  useEffect(() => {
    if (userData.isLoggedIn && userData.username) {
      fetchStoreInfo(userData.username);
    }
  }, [userData.isLoggedIn, userData.username]);

  // Listener para mudanças no localStorage (para sincronizar entre abas)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (['isLoggedIn', 'username', 'storeName', 'storeAddress', 'storePhone', 'storeFooter'].includes(e.key || '')) {
        console.log('🔄 useAuth: Detectada mudança no localStorage');
        const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const username = localStorage.getItem('username') || '';
        
        if (loggedIn && username) {
          setUserData({
            isLoggedIn: true,
            username,
            storeName: localStorage.getItem('storeName') || '',
            storeAddress: localStorage.getItem('storeAddress') || '',
            storePhone: localStorage.getItem('storePhone') || '',
            storeFooter: localStorage.getItem('storeFooter') || ''
          });
        } else {
          setUserData({
            isLoggedIn: false,
            username: '',
            storeName: '',
            storeAddress: '',
            storePhone: '',
            storeFooter: '',
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
      
      // Os dados da loja agora são gerenciados separadamente
      const newUserData = {
        isLoggedIn: true,
        username: trimmedUsername,
        storeName: '', // Começa vazio, será preenchido pelo useEffect
        storeAddress: '', // Começa vazio
        storePhone: '', // Começa vazio
        storeFooter: `© ${new Date().getFullYear()} ${trimmedUsername}. Todos os direitos reservados.` // Footer padrão
      };

      // Salvar no localStorage de forma síncrona
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', trimmedUsername);
      // Não salvar storeName vazio aqui, deixa o fetchStoreInfo gerenciar
      localStorage.removeItem('storeName');
      localStorage.removeItem('storeAddress');
      localStorage.removeItem('storePhone');
      localStorage.setItem('storeFooter', newUserData.storeFooter);

      // Atualizar estado imediatamente para disparar o useEffect
      setUserData(newUserData);
      
      console.log(`✅ Login realizado com sucesso para: ${trimmedUsername}`);
      
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
    localStorage.removeItem('storeFooter');

    // Atualizar estado
    setUserData({
      isLoggedIn: false,
      username: '',
      storeName: '',
      storeAddress: '',
      storePhone: '',
      storeFooter: '',
    });
    
    console.log('✅ Logout realizado com sucesso');
  };

  const updateStoreInfo = async (newInfo: { storeName: string; storeAddress: string; storePhone: string }) => {
    try {
      console.log('🔄 Atualizando informações da loja:', newInfo);
  
      // Salvar no Firebase
      const storeInfoRef = getTenantRef('config/storeInfo');
      await set(storeInfoRef, {
        name: newInfo.storeName,
        address: newInfo.storeAddress,
        phone: newInfo.storePhone,
        updatedAt: new Date().toISOString(),
      });
  
      // Salvar no localStorage
      localStorage.setItem('storeName', newInfo.storeName);
      localStorage.setItem('storeAddress', newInfo.storeAddress);
      localStorage.setItem('storePhone', newInfo.storePhone);
  
      // Atualizar estado
      setUserData(prev => ({
        ...prev,
        storeName: newInfo.storeName,
        storeAddress: newInfo.storeAddress,
        storePhone: newInfo.storePhone,
      }));
  
      console.log('✅ Informações da loja atualizadas com sucesso no Firebase e localStorage.');
    } catch (error) {
      console.error('❌ Erro ao atualizar informações da loja:', error);
      // Re-lançar o erro para que o chamador (modal) possa tratá-lo
      throw error;
    }
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
    isAuthenticated,
    updateStoreInfo // Exporta a nova função
  };
};
