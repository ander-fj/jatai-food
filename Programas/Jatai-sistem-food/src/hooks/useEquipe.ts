// src/hooks/useEquipe.ts
import { useEffect, useState } from "react";
import { getDatabase, ref, onValue } from "firebase/database";
import { getTenantRef } from "../config/firebase";

export interface Entregador {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  avatar: string;
}

export function useEquipe(): Entregador[] {
  const [equipe, setEquipe] = useState<Entregador[]>([]);

  useEffect(() => {
    try {
      const equipeRef = getTenantRef("equipe");

    const unsubscribe = onValue(equipeRef, (snapshot) => {
      const data = snapshot.val();
      const lista: Entregador[] = [];

      for (const id in data) {
        lista.push({
          id,
          name: data[id].name,
          lat: data[id].lat,
          lng: data[id].lng,
          status: data[id].status,
          avatar: data[id].avatar,
        });
      }

      setEquipe(lista);
    });

    return () => unsubscribe();
    } catch (error) {
      console.error('❌ Erro ao carregar equipe (usuário não autenticado):', error);
      setEquipe([]);
    }
  }, []);

  return equipe;
}
