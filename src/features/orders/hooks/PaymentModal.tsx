import React from 'react';
import { X, DollarSign, CreditCard, Smartphone } from 'lucide-react';
import { PaymentMethod } from '../features/orders/types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPayment: (method: PaymentMethod) => void;
}

const paymentOptions: { method: PaymentMethod; icon: React.ElementType; label: string }[] = [
  { method: 'Dinheiro', icon: DollarSign, label: 'Dinheiro' },
  { method: 'Cartão de Crédito', icon: CreditCard, label: 'Crédito' },
  { method: 'Cartão de Débito', icon: CreditCard, label: 'Débito' },
  { method: 'Pix', icon: Smartphone, label: 'Pix' },
];

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onConfirmPayment }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">Forma de Pagamento</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {paymentOptions.map(({ method, icon: Icon, label }) => (
            <button
              key={method}
              onClick={() => onConfirmPayment(method)}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all duration-200"
            >
              <Icon className="h-8 w-8 text-gray-600" />
              <span className="font-semibold text-gray-700">{label}</span>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;