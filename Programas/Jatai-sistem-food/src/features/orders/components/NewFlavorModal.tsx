import React, { useState } from 'react';
import { X } from 'lucide-react';

interface NewFlavorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (flavor: { name: string; price: number }) => void;
}

const NewFlavorModal: React.FC<NewFlavorModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const [flavor, setFlavor] = useState({ name: '', price: 0 });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Novo Sabor de Pizza</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          if (flavor.name && flavor.price > 0) {
            onConfirm(flavor);
            setFlavor({ name: '', price: 0 });
          }
        }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Sabor
              </label>
              <input
                type="text"
                value={flavor.name}
                onChange={(e) => setFlavor({ ...flavor, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preço
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={flavor.price}
                onChange={(e) => setFlavor({ ...flavor, price: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Adicionar Sabor
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewFlavorModal;