import { getDatabase, ref, onValue } from "firebase/database";
import { useEffect, useState } from "react";
import { getTenantRef } from "../config/firebase";

type Entregador = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  avatar?: string;
};

export function useEntregadoresRealtime(): Entregador[] {
  const [entregadores, setEntregadores] = useState<Entregador[]>([]);

  useEffect(() => {
    try {
      // Usar dados globais para entregadores (compatibilidade)
      const locationsRef = ref(getDatabase(), "locations");

    const unsubscribe = onValue(locationsRef, (snapshot) => {
      const data = snapshot.val();
      const lista: Entregador[] = [];

      for (const id in data) {
        const current = data[id]?.current;

        if (current?.lat && current?.lng) {
          lista.push({
            id,
            name: current.name ?? "Sem nome",
            lat: current.lat,
            lng: current.lng,
            status: current.status ?? "desconhecido",
            avatar: data[id]?.avatar || "",
          });
        }
      }

      setEntregadores(lista);
    });

    return () => unsubscribe();
    } catch (error) {
      console.error('❌ Erro ao carregar entregadores (usuário não autenticado):', error);
      setEntregadores([]);
    }
  }, []);

  return entregadores;
}
