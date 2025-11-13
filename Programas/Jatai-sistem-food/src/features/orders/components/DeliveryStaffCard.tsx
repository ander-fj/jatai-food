import React from 'react';
import { Pencil, Trash2, Package } from 'lucide-react';

interface DeliveryStaffCardProps {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  orderCount: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const DeliveryStaffCard: React.FC<DeliveryStaffCardProps> = ({
  id,
  name,
  phone,
  avatar,
  orderCount,
  onEdit,
  onDelete
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center gap-4">
        <img 
          src={avatar} 
          alt={name} 
          className="w-12 h-12 rounded-full object-cover"
        />
        <div className="flex-1">
          <h3 className="font-medium text-sm">{name}</h3>
          <p className="text-xs text-gray-500">{phone}</p>
          <div className="flex items-center gap-1 mt-1">
            <Package className="h-3 w-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">
              {orderCount} {orderCount === 1 ? 'pedido' : 'pedidos'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(id)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (window.confirm('Tem certeza que deseja excluir este entregador?')) {
                onDelete(id);
              }
            }}
            className="p-1 text-red-600 hover:bg-red-50 rounded-full transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryStaffCard;