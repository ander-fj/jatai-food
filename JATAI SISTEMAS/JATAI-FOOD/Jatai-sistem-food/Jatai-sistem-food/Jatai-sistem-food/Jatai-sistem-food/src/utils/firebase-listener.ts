// src/utils/firebase-listener.ts
import { database, ref, onChildAdded, firestore, doc, setDoc, getTenantRef } from "../config/firebase";

interface LocationData {
  lat: number;
  lng: number;
  name?: string;
  status?: string;
  avatar?: string;
  timestamp?: number;
}

// Helper function to check if avatar is a large base64 string
function sanitizeAvatar(avatar: string | undefined): string | null {
  if (!avatar) return null;
  
  // Check if it's a base64 string (starts with data: or is very long)
  if (avatar.startsWith('data:') || avatar.length > 1000) {
    return null; // Replace with null to avoid size limits
  }
  
  return avatar;
}

export function startListeningToNewLocations() {
  try {
    // Usar dados globais para compatibilidade
    const locationsRef = ref(database, "locations");

  onChildAdded(locationsRef, async (snapshot) => {
    const uid = snapshot.key;
    const data: LocationData = snapshot.val();

    if (!uid || !data) return;

    const nome = data.name || "Entregador sem nome";
    const status = data.status || "ativo";
    const lat = data.lat;
    const lng = data.lng;

    if (lat === undefined || lng === undefined) {
      console.warn(`Localização inválida para UID: ${uid}`);
      return;
    }

    const entregadorRef = doc(firestore, "entregadores", uid);

    await setDoc(entregadorRef, {
      id: uid,
      nome,
      status,
      latitude: lat,
      longitude: lng,
      avatar: sanitizeAvatar(data.avatar),
      createdAt: new Date().toISOString()
    });

    console.log(`✅ Entregador sincronizado: ${nome}`);
  });
  } catch (error) {
    console.error('❌ Erro ao inicializar listeners (usuário não autenticado):', error);
  }
}
