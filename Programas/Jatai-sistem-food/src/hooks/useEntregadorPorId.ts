import { useEffect, useState } from "react";
import { getDatabase, ref, onValue } from "firebase/database";
import { getTenantRef } from "../config/firebase";

interface Entregador {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  avatar: string;
}

export function useEntregadorPorId(userId: string): Entregador | null {
  const [entregador, setEntregador] = useState<Entregador | null>(null);

  useEffect(() => {
    if (!userId) return;

    try {
      // Usar dados globais para buscar entregador por ID
      const entregadorRef = ref(getDatabase(), `locations/${userId}`);

    const unsubscribe = onValue(entregadorRef, (snapshot) => {
      const data = snapshot.val();

      if (data && data.lat && data.lng) {
        setEntregador({
          id: userId,
          name: data.name ?? "Sem nome",
          lat: data.lat,
          lng: data.lng,
          status: data.status ?? "desconhecido",
          avatar: data.avatar ?? "",
        });
      } else {
        setEntregador(null);
      }
    });

    return () => unsubscribe();
    } catch (error) {
      console.error('❌ Erro ao carregar entregador (usuário não autenticado):', error);
      setEntregador(null);
    }
  }, [userId]);

  return entregador;
}



