import React, { useState } from 'react';
import { Clock, Trash2, MapPin, Phone, Pizza, Coffee, ChevronDown, ChevronUp, Check, UserPlus, QrCode, X, Minimize2, Maximize2, GripVertical } from 'lucide-react';
import { Order } from '../types';
import { formatCurrency } from '../../../utils/formatters';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface OrderCardProps {
  order: Order;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDeselect?: () => void;
  onAssignDeliveryPerson: (orderId: string, deliveryPerson: string) => void;
  onDelete: (orderId: string) => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  deliveryStaff: Array<{
    id: string;
    name: string;
    orderCount: number;
  }>;
}

const ORDER_STATUSES = [
  'Novo',
  'Próximos',
  'Preparando',
  'Pronto para Entrega',
  'A caminho',
  'Entregue',
  'Cancelado'
];

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  isSelected,
  onSelect,
  onDeselect,
  onAssignDeliveryPerson,
  onDelete,
  onUpdateStatus,
  deliveryStaff
}) => {
  const [showItems, setShowItems] = useState(false);
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState(order.deliveryPerson || '');
  const [showDeliveryPersonSelect, setShowDeliveryPersonSelect] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Novo':
        return 'bg-blue-100 text-blue-800';
      case 'Próximos':
      case 'proximos':
      case 'PROXIMOS':
        return 'bg-orange-100 text-orange-800';
      case 'Preparando':
        return 'bg-yellow-100 text-yellow-800';
      case 'Pronto para Entrega':
        return 'bg-indigo-100 text-indigo-800';
      case 'A caminho':
        return 'bg-purple-100 text-purple-800';
      case 'Entregue':
        return 'bg-green-100 text-green-800';
      case 'Cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCollapsedBackgroundColor = (status: string) => {
    switch (status) {
      case 'Novo':
        return 'bg-blue-200';
      case 'Próximos':
      case 'proximos':
      case 'PROXIMOS':
        return 'bg-orange-200';
      case 'Preparando':
        return 'bg-yellow-200';
      case 'Pronto para Entrega':
        return 'bg-indigo-200';
      case 'A caminho':
        return 'bg-purple-200';
      case 'Entregue':
        return 'bg-green-200';
      case 'Cancelado':
        return 'bg-red-200';
      default:
        return 'bg-gray-200';
    }
  };
  const pizzas = (order.items || []).filter(item => item.name.toLowerCase().includes('pizza'));
  const beverages = (order.items || []).filter(item => !item.name.toLowerCase().includes('pizza'));

  // Calcular o total real somando os preços dos itens
  const calculateOrderTotal = () => {
    return (order.items || []).reduce((total, item) => total + (item.price || 0), 0);
  };

  const actualTotal = calculateOrderTotal();

  const handleDeliveryPersonConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedDeliveryPerson && selectedDeliveryPerson !== order.deliveryPerson) {
      onAssignDeliveryPerson(order.id, selectedDeliveryPerson);
      setShowDeliveryPersonSelect(false);
    }
  };

  // Se o card estiver recolhido, mostrar apenas informações básicas
  if (isCollapsed) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={`${getCollapsedBackgroundColor(order.status)} p-3 rounded-lg shadow-sm transition-colors border-l-4 ${
          isSelected ? 'ring-2 ring-orange-500 bg-orange-50 border-l-orange-500' : 'hover:bg-gray-50 border-l-gray-200'
        }`}
        onClick={() => onSelect(order.id)}
      >
        <div className="flex justify-between items-center">
            <div {...listeners} className="cursor-move p-2">
                <GripVertical className="h-5 w-5 text-gray-500" />
            </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div>
                <div className="font-medium text-gray-900">{order.customerName}</div>
                <div className="text-sm text-gray-500">
                  <div>Código: {order.trackingCode}</div>
                  <div className="text-xs text-gray-600 mt-1 whitespace-nowrap">
                    {order.createdAt ? (
                      `Pedido às ${new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                    ) : (
                      `Pedido às ${order.orderTime}`
                    )}
                    {order.status === 'Entregue' && order.updatedAt && (
                      ` • Entregue ${new Date(order.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-lg font-bold text-green-600">
              R$ {formatCurrency(actualTotal)}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(false);
              }}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Expandir pedido"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`bg-white p-4 rounded-lg shadow-sm transition-colors border-l-4 ${
        isSelected ? 'ring-2 ring-orange-500 bg-orange-50 border-l-orange-500' : 'hover:bg-gray-50 border-l-gray-200'
      }`}
      onClick={() => onSelect(order.id)}
    >
      {/* Header com número do pedido e valor */}
      <div className="flex justify-between items-start mb-3">
        <div {...listeners} className="cursor-move p-2">
            <GripVertical className="h-5 w-5 text-gray-500" />
        </div>
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-900">Pedido #{order.id}</span>
              <span className="text-xs text-gray-500">-</span>
              <span className="text-xs text-gray-500 uppercase tracking-wide">{order.trackingCode}</span>
            </div>
            {isSelected && (
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded-full font-medium">
                  🎯 Selecionado
                </span>
                {onDeselect && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeselect();
                    }}
                    className="p-1 bg-gray-500 hover:bg-gray-600 text-white rounded-full transition-colors"
                    title="Deselecionar pedido"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(true);
              }}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Recolher pedido"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>
          <div className="text-xl font-bold text-green-600 bg-green-50 px-3 py-1 rounded-lg border border-green-200">
            R$ {formatCurrency(actualTotal)}
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-3">
        <select
          value={order.status}
          onChange={(e) => onUpdateStatus(order.id, e.target.value)}
          className={`px-3 py-1 rounded-full text-sm font-medium border-0 cursor-pointer focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${getStatusColor(order.status)}`}
          onClick={(e) => e.stopPropagation()}
        >
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      {/* Horário */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
        <Clock className="h-4 w-4" />
        <span>
          {order.createdAt ? (
            `Pedido feito às ${new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
          ) : (
            `Pedido feito às ${order.orderTime}`
          )}
        </span>
        <span className="mx-2">•</span>
        <span>
          {(() => {
            const baseTime = order.createdAt ? new Date(order.createdAt) : (() => {
              const [hours, minutes] = order.orderTime.split(':').map(Number);
              const orderDate = new Date();
              orderDate.setHours(hours, minutes, 0, 0);
              return orderDate;
            })();
            
            // Calcular tempo estimado baseado no status
            let estimatedMinutes = 45; // Padrão
            switch (order.status) {
              case 'Novo':
                estimatedMinutes = 45;
                break;
              case 'Preparando':
                estimatedMinutes = 30;
                break;
              case 'Pronto para Entrega':
                estimatedMinutes = 15;
                break;
              case 'A caminho':
                estimatedMinutes = 10;
                break;
              case 'Entregue':
                return order.updatedAt ? 
                  `Entregue às ${new Date(order.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` :
                  'Entregue';
              default:
                estimatedMinutes = 45;
            }
            
            const deliveryTime = new Date(baseTime.getTime() + estimatedMinutes * 60000);
            return `Previsão de entrega: ${deliveryTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
          })()}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-gray-500" />
          <div>
            <div className="font-medium text-gray-900">{order.customerName}</div>
            <div className="text-gray-600 text-sm">{order.address}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Phone className="h-4 w-4" />
          <span className="text-sm">{order.phone}</span>
        </div>
      </div>

      {/* Código de rastreamento */}
      {order.trackingCode && (
        <div className="flex items-center gap-2 text-sm text-blue-600 mb-3">
          <QrCode className="h-4 w-4" />
          <span>Código: {order.trackingCode}</span>
        </div>
      )}

      {/* Botão Ver Itens */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowItems(!showItems);
        }}
        className="w-full flex items-center justify-between py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">
          {showItems ? 'Ocultar Itens' : 'Ver Itens'}
        </span>
        {showItems ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {/* Lista de itens expandida */}
      {showItems && (
        <div className="border-t border-gray-100 pt-3 mt-3">
          <div className="space-y-4">
            {pizzas.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                  <Pizza className="h-4 w-4" />
                  <span>Pizzas</span>
                </div>
                <div className="space-y-2">
                  {pizzas.map((item, index) => (
                    <div key={`pizza-${index}`} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img 
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded-md"
                          />
                        )}
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-gray-500 text-sm">
                          </div>
                          {item.quantity}x {item.size && `• ${item.size}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div>R$ {formatCurrency(item.price)}</div>
                        <div className="text-gray-500 text-xs">
                          Unit. R$ {formatCurrency(item.quantity > 0 ? item.price / item.quantity : 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {beverages.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                  <Coffee className="h-4 w-4" />
                  <span>Bebidas</span>
                </div>
                <div className="space-y-2">
                  {beverages.map((item, index) => (
                    <div key={`beverage-${index}`} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img 
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded-md"
                          />
                        )}
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-gray-500 text-sm">
                          </div>
                          {item.quantity}x {item.size && `• ${item.size}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div>R$ {formatCurrency(item.price)}</div>
                        <div className="text-gray-500 text-xs">
                          Unit. R$ {formatCurrency(item.quantity > 0 ? item.price / item.quantity : 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-gray-600">Total</span>
              <span>R$ {formatCurrency(actualTotal)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Botão de Finalizar Preparo */}
      {/* Botão de Finalizar Preparo */}
      {order.status === 'Preparando' && (
        <div className="mt-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateStatus(order.id, 'Pronto para Entrega');
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-green-600 text-white rounded-lg font-semibold transition-colors hover:bg-green-700"
          >
            <Check className="h-5 w-5" />
            Finalizar Preparo
          </button>
        </div>
      )}
      {/* Seção de entregador (apenas quando selecionado) */}
      {isSelected && (
        <div className="mt-4 pt-4 border-t">
          {!showDeliveryPersonSelect ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeliveryPersonSelect(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 font-medium transition-colors"
            >
              <UserPlus className="h-5 w-5" />
              Adicionar Entregador
            </button>
          ) : (
            <>
              <div className="mb-4">
                <select
                  value={selectedDeliveryPerson}
                  onChange={(e) => setSelectedDeliveryPerson(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">Selecionar entregador</option>
                  {deliveryStaff.map((staff) => (
                    <option key={staff.id} value={staff.name.split(' ')[0]}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-4">
                {order.deliveryPerson && (() => {
                  const deliveryPersonData = deliveryStaff.find(staff => 
                    staff.name.split(' ')[0] === order.deliveryPerson
                  );
                  return deliveryPersonData?.trackingCode ? (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <QrCode className="h-4 w-4" />
                      <span>Entregador: {deliveryPersonData.trackingCode}</span>
                    </div>
                  ) : null;
                })()}
                <button
                  onClick={handleDeliveryPersonConfirm}
                  disabled={!selectedDeliveryPerson || selectedDeliveryPerson === order.deliveryPerson}
                  className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="h-4 w-4" />
                  Confirmar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Tem certeza que deseja excluir este pedido?')) {
                      onDelete(order.id);
                    }
                  }}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderCard;