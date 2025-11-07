// src/config/firebase.ts - Configuração corrigida
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onChildAdded, set, serverTimestamp, get } from "firebase/database";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDQ_q5pURFbmjuOlvB5RNslZUr6Y6Yo_aE",
  authDomain: "dhl-teste-327e8.firebaseapp.com",
  databaseURL: "https://dhl-teste-327e8-default-rtdb.firebaseio.com",
  projectId: "dhl-teste-327e8",
  storageBucket: "dhl-teste-327e8.appspot.com",
  messagingSenderId: "595095451120",
  appId: "1:595095451120:web:45f41fd724c1a9c08dd935",
  measurementId: "G-HWHPGZV7M7"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const firestore = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Função para obter o ID do usuário atual (tenant)
export const getCurrentTenantId = (): string | null => {
  // Pegar do localStorage (usuário logado)
  const loggedInUser = localStorage.getItem('username');
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  
  console.log(`🔑 getCurrentTenantId: username="${loggedInUser}", isLoggedIn=${isLoggedIn}`);
  
  if (loggedInUser && isLoggedIn) {
    console.log(`✅ getCurrentTenantId: Tenant ID encontrado: "${loggedInUser}"`);
    return loggedInUser;
  }
  
  // Fallback para "Beneditta Pizza" se não houver usuário logado
  console.log(`⚠️ getCurrentTenantId: Nenhum usuário logado, usando "Beneditta Pizza" como fallback`);
  return 'Beneditta Pizza';
};

// Função para gerar referência com tenant
export const getTenantRef = (path: string, explicitTenantId?: string): any => {
  const tenantId = explicitTenantId || getCurrentTenantId();
  
  if (!tenantId) {
    console.warn(`⚠️ getTenantRef: Nenhum tenant específico, usando 'Beneditta Pizza' para path: "${path}"`);
    const defaultPath = `tenants/Beneditta Pizza/${path}`;
    console.log(`📍 getTenantRef: "${path}" -> "${defaultPath}"`);
    return ref(database, defaultPath);
  }
  
  // Estrutura: tenants/{tenantId}/{path}
  const tenantPath = `tenants/${tenantId}/${path}`;
  console.log(`📍 getTenantRef: "${path}" -> "${tenantPath}" (tenant: ${tenantId})`);
  return ref(database, tenantPath);
};

// Função para verificar se tenant existe
export const checkTenantExists = async (tenantId: string): Promise<boolean> => {
  try {
    const tenantRef = ref(database, `tenants/${tenantId}/info`);
    const snapshot = await get(tenantRef);
    return snapshot.exists();
  } catch (error) {
    console.error('Erro ao verificar tenant:', error);
    return false;
  }
};

// Função para inicializar tenant (criar estrutura inicial)
export const initializeTenant = async (tenantId: string) => {
  try {
    console.log(`🏗️ Inicializando tenant: ${tenantId}`);
    
    // Verificar se já existe
    const exists = await checkTenantExists(tenantId);
    if (exists) {
      console.log(`✅ Tenant ${tenantId} já existe`);
      return true;
    }
    
    // Criar estrutura básica do tenant
    const tenantStructure = {
      info: {
        tenantId,
        createdAt: new Date().toISOString(),
        name: `${tenantId}`,
        status: 'active'
      },
      orders: {},
      locations: {},
      equipe: {},
      routes: {},
      menu: {
        pizzaFlavors: {
          '1': { name: 'Margherita', price: 45.90 },
          '2': { name: 'Pepperoni', price: 47.90 },
          '3': { name: 'Portuguesa', price: 47.90 },
          '4': { name: '4 Queijos', price: 49.90 },
          '5': { name: 'Calabresa', price: 46.90 },
          '6': { name: 'Frango Catupiry', price: 47.90 }
        },
        beverages: {
          '1': { 
            name: 'Coca-Cola', 
            sizes: [
              { size: '350ml', price: 5.90 },
              { size: '600ml', price: 8.90 },
              { size: '1L', price: 10.90 },
              { size: '2L', price: 12.90 }
            ]
          },
          '2': { 
            name: 'Guaraná', 
            sizes: [
              { size: '350ml', price: 5.90 },
              { size: '600ml', price: 8.90 },
              { size: '1L', price: 10.90 },
              { size: '2L', price: 11.90 }
            ]
          },
          '3': { 
            name: 'Água Mineral', 
            sizes: [
              { size: '500ml', price: 3.90 }
            ]
          }
        }
      },
      analytics: {
        createdAt: new Date().toISOString()
      }
    };

    // Salvar estrutura inicial
    const tenantRef = ref(database, `tenants/${tenantId}`);
    await set(tenantRef, tenantStructure);
    
    console.log(`✅ Tenant ${tenantId} inicializado com sucesso`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao inicializar tenant ${tenantId}:`, error);
    throw error;
  }
};

// Função para formatar coordenadas com 6 casas decimais
const formatCoordinates = (lat: number, lng: number): { lat: number; lng: number } => {
  return {
    lat: parseFloat(lat.toFixed(6)),
    lng: parseFloat(lng.toFixed(6))
  };
};

// Listener de autenticação atualizado com multi-tenancy
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Desabilitado: não executar atualizações automáticas de localização
    console.log('🔇 Atualizações automáticas de localização desabilitadas');
  }
});

// Função para atualizar status com coordenadas de 6 casas decimais e multi-tenancy
export const updateUserLocationStatus = async (
  userId: string,
  status: 'online' | 'offline' | 'busy' | 'available' | 'delivering',
  coordinates?: { lat: number; lng: number }
) => {
  const tenantId = getCurrentTenantId();
  if (!tenantId) {
    console.warn('⚠️ Usuário não autenticado, usando dados globais');
  }

  const updates: any = {
    status,
    lastUpdate: serverTimestamp()
  };

  if (coordinates) {
    const formattedCoords = formatCoordinates(coordinates.lat, coordinates.lng);
    updates.lat = formattedCoords.lat;
    updates.lng = formattedCoords.lng;
    updates.current = {
      latitude: formattedCoords.lat,
      longitude: formattedCoords.lng,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const tenantLocationRef = getTenantRef(`locations/${userId}`);
    await set(tenantLocationRef, updates);
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
  }
};

// Exemplo de coordenadas com 6 casas decimais
export const exampleLocations = {
  andersonJatai: {
    name: "Anderson Jatai",
    status: "online",
    coordinates: formatCoordinates(-23.972800, -46.370600),
    avatar: ""
  },
  // Adicione mais exemplos conforme necessário
  exemplo2: {
    name: "Entregador 2",
    status: "available",
    coordinates: formatCoordinates(-23.550000, -46.633000), // Av. Paulista
    avatar: ""
  }
};

export { 
  database, 
  firestore, 
  ref, 
  onChildAdded, 
  doc, 
  setDoc, 
  auth, 
  storage,
  formatCoordinates 
};

export default app;