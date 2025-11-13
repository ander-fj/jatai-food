import React, { useState } from 'react';
import { getDatabase, ref, onValue, set } from "firebase/database";
import { getTenantRef, getCurrentTenantId } from "../config/firebase";

interface Entregador {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  avatar?: string;
}

interface Props {
  onSelecionar: (entregador: Entregador) => void;
  onAdicionado: () => void;
}

const AdminEntregadorSelector: React.FC<Props> = ({ onSelecionar, onAdicionado }) => {
  const [userId, setUserId] = useState("");
  const [entregador, setEntregador] = useState<Entregador | null>(null);
  const [adicionado, setAdicionado] = useState(false);

  const handleBuscar = () => {
    try {
      console.log(`🔍 Buscando entregador com ID: ${userId}`);
      
      // Buscar em todos os Firebase locations globais, não apenas no tenant atual
      const db = getDatabase();
      const refUser = ref(db, `locations/${userId}`);

    onValue(refUser, (snapshot) => {
      const data = snapshot.val();
      console.log(`📡 Dados recebidos para ${userId}:`, data);
      
      if (data) {
        const entregadorEncontrado: Entregador = {
          id: userId,
          name: data.name ?? data.current?.name ?? "Sem nome",
          lat: data.lat ?? data.current?.latitude ?? 0,
          lng: data.lng ?? data.current?.longitude ?? 0,
          status: data.status ?? data.current?.status ?? "desconhecido",
          avatar: data.avatar ?? "",
        };
        
        console.log(`✅ Entregador encontrado:`, entregadorEncontrado);
        setEntregador(entregadorEncontrado);
        onSelecionar(entregadorEncontrado);
      } else {
        console.log(`❌ Nenhum dado encontrado para ID: ${userId}`);
        setEntregador(null);
      }
    }, { onlyOnce: true });
    } catch (error) {
      console.error('❌ Erro ao buscar entregador:', error);
      setEntregador(null);
    }
  };

  const handleAdicionarEquipe = () => {
    if (!entregador) return;
    
    console.log(`➕ Adicionando entregador ${entregador.name} (${entregador.id}) à equipe`);
    
    // Adicionar à equipe do tenant atual
    const entregadorData: any = {
      name: entregador.name,
      lat: entregador.lat,
      lng: entregador.lng,
      status: entregador.status,
    };

    if (entregador.avatar) {
      entregadorData.avatar = entregador.avatar;
    }

    // Salvar na equipe do tenant atual
    try {
      const equipeRef = getTenantRef(`equipe/${userId}`);
    set(equipeRef, entregadorData).then(() => {
      console.log(`✅ Entregador ${entregador.name} adicionado à equipe com sucesso`);
      setAdicionado(true);
      setUserId("");
      setEntregador(null);
      onAdicionado();
      setTimeout(() => setAdicionado(false), 3000);
    });
    } catch (error) {
      console.error('❌ Erro ao adicionar à equipe:', error);
      alert('Erro ao adicionar entregador à equipe. Verifique se você está logado.');
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        className="w-full border p-2 rounded"
        placeholder="Digite o ID do Firebase (ex: zxTusmmxh4MfNlpIygdFs0zaAnM2)"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      />
      <button
        onClick={handleBuscar}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
      >
        🔍 Buscar Entregador Global
      </button>

      {entregador && (
        <div className="p-4 border mt-2 rounded bg-gray-100">
          {entregador.avatar && (
            <img src={entregador.avatar} alt="avatar" className="w-12 h-12 rounded-full mb-2" />
          )}
          <p><strong>Nome:</strong> {entregador.name}</p>
          <p><strong>Status:</strong> {entregador.status}</p>
          <p><strong>Firebase ID:</strong> {entregador.id}</p>
          <p><strong>Localização:</strong></p>
          <p>Lat: {entregador.lat}</p>
          <p>Lng: {entregador.lng}</p>
          <button
            onClick={handleAdicionarEquipe}
            className="mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            ➕ Adicionar à Equipe
          </button>
        </div>
      )}

      {adicionado && (
        <div className="bg-green-100 text-green-800 p-2 rounded mt-2">
          ✅ Entregador adicionado à equipe com sucesso!
        </div>
      )}
    </div>
  );
};

export default AdminEntregadorSelector;