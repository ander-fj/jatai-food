import React, { useState } from "react";
import { useEntregadorPorId } from "../hooks/useEntregadorPorId";
import { getDatabase, ref, set } from "firebase/database";
import { getTenantRef } from "../config/firebase";

interface SelecionarEntregadorProps {
  onSelecionar: (entregador: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    status: string;
    avatar: string;
  }) => void;
}

const SelecionarEntregadorPorId: React.FC<SelecionarEntregadorProps> = ({ onSelecionar }) => {
  const [userId, setUserId] = useState("");
  const [adicionado, setAdicionado] = useState(false);
  const entregador = useEntregadorPorId(userId);

  const handleAdicionarEquipe = () => {
    if (!entregador) return;
    const equipeRef = getTenantRef(`equipe/${userId}`);
    set(equipeRef, {
      name: entregador.name,
      lat: entregador.lat,
      lng: entregador.lng,
      status: entregador.status,
      avatar: entregador.avatar,
    }).then(() => setAdicionado(true));
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border space-y-4">
      <h3 className="text-md font-semibold">Selecionar Entregador por ID</h3>
      <input
        type="text"
        value={userId}
        onChange={(e) => {
          setUserId(e.target.value);
          setAdicionado(false);
        }}
        placeholder="Cole o User ID do Firebase aqui"
        className="w-full border rounded-md px-3 py-2 text-sm"
      />

      {entregador ? (
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <img src={entregador.avatar} alt={entregador.name} className="w-12 h-12 rounded-full object-cover" />
            <div>
              <p><strong>Nome:</strong> {entregador.name}</p>
              <p><strong>Status:</strong> {entregador.status}</p>
              <p><strong>Localização:</strong><br />
              Lat: {entregador.lat}<br />
              Lng: {entregador.lng}</p>
            </div>
          </div>

          <button
            onClick={() => {
              onSelecionar(entregador);
              handleAdicionarEquipe();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          >
            Adicionar à Equipe
          </button>

          {adicionado && (
            <div className="bg-green-100 text-green-800 text-sm mt-2 p-2 rounded">
              Entregador {entregador.name} adicionado à equipe!
            </div>
          )}
        </div>
      ) : (
        userId && <p className="text-sm text-red-500">Entregador não encontrado ou sem localização.</p>
      )}
    </div>
  );
};

export default SelecionarEntregadorPorId;