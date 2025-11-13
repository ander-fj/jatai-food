import { getDatabase, ref, onChildAdded } from "firebase/database";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getTenantRef } from "../config/firebase";

// Helper function to check if avatar is a large base64 string
function sanitizeAvatar(avatar: string | undefined): string {
  if (!avatar) return "";
  
  // Check if it's a base64 string (starts with data: or is very long)
  if (avatar.startsWith('data:') || avatar.length > 1000) {
    return ""; // Replace with empty string to avoid size limits
  }
  
  return avatar;
}

export function syncRealtimeToFirestore() {
  try {
    // Usar dados globais para compatibilidade
    const locationsRef = ref(getDatabase(), "locations");
    const firestore = getFirestore();

  onChildAdded(locationsRef, async (snapshot) => {
    const data = snapshot.val();
    const id = snapshot.key;

    if (!data || !id || !data.name || !data.lat || !data.lng) return;

    const entregadorRef = doc(firestore, "entregadores", id);

    await setDoc(entregadorRef, {
      nome: data.name,
      status: data.status || "offline",
      avatar: sanitizeAvatar(data.avatar),
      latitude: data.lat,
      longitude: data.lng,
      id,
    }, { merge: true });

    console.log("Sincronizado com sucesso:", data.name);
  });
  } catch (error) {
    console.error('❌ Erro na sincronização (usuário não autenticado):', error);
  }
}
