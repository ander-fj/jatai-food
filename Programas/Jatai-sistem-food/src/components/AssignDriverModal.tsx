import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';

interface AssignDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (driverId: string) => void;
  deliveryStaff: { id: string; name: string }[];
}

const AssignDriverModal: React.FC<AssignDriverModalProps> = ({ isOpen, onClose, onAssign, deliveryStaff }) => {
  const [selectedDriver, setSelectedDriver] = useState<string>('');

  if (!isOpen) return null;

  const handleAssign = () => {
    if (selectedDriver) {
      onAssign(selectedDriver);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-lg font-semibold">Atribuir Entregador</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">Selecione um entregador para os pedidos da área.</p>
          <select
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="" disabled>Selecione um entregador</option>
            {deliveryStaff.map(driver => (
              <option key={driver.id} value={driver.id}>{driver.name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAssign} disabled={!selectedDriver}>Confirmar</Button>
        </div>
      </div>
    </div>
  );
};

export default AssignDriverModal;
