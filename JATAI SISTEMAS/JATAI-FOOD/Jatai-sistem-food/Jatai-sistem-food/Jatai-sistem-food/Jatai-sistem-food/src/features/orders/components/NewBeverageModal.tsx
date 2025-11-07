import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface NewBeverageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (beverage: { name: string; sizes: Array<{ size: string; price: number }> }) => void;
}

const NewBeverageModal: React.FC<NewBeverageModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const [beverage, setBeverage] = useState({
    name: '',
    sizes: [{ size: '', price: 0 }]
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Nova Bebida</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          if (beverage.name && beverage.sizes.some(s => s.size && s.price > 0)) {
            onConfirm({
              name: beverage.name,
              sizes: beverage.sizes.filter(s => s.size && s.price > 0)
            });
            setBeverage({ name: '', sizes: [{ size: '', price: 0 }] });
          }
        }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Bebida
              </label>
              <input
                type="text"
                value={beverage.name}
                onChange={(e) => setBeverage({ ...beverage, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tamanhos e Preços
              </label>
              {beverage.sizes.map((size, index) => (
                <div key={index} className="flex gap-4 mb-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Tamanho (ex: 350ml)"
                      value={size.size}
                      onChange={(e) => {
                        const newSizes = [...beverage.sizes];
                        newSizes[index].size = e.target.value;
                        setBeverage({ ...beverage, sizes: newSizes });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Preço"
                      value={size.price}
                      onChange={(e) => {
                        const newSizes = [...beverage.sizes];
                        newSizes[index].price = parseFloat(e.target.value);
                        setBeverage({ ...beverage, sizes: newSizes });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newSizes = [...beverage.sizes];
                        newSizes.splice(index, 1);
                        setBeverage({ ...beverage, sizes: newSizes });
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setBeverage({
                  ...beverage,
                  sizes: [...beverage.sizes, { size: '', price: 0 }]
                })}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar Tamanho
              </button>
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
                Adicionar Bebida
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewBeverageModal;