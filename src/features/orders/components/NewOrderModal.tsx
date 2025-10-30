import React, { useState, useMemo } from 'react';
import { X, Plus, Pencil, Trash2, Truck } from 'lucide-react';
import { NewOrder, Order } from '../types';
import NewFlavorModal from './NewFlavorModal';
import NewBeverageModal from './NewBeverageModal';
import { useMenu } from '../hooks/useMenu';
import { useOrders } from '../hooks/useOrders';
import { formatCurrency } from '../../../utils/formatters';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (order: NewOrder) => Order;
  deliveryStaff: Array<{ 
    id: string;
    name: string;
    orderCount: number;
  }>;
}

const PIZZA_SIZES = [
  { id: 'p', name: 'Pequena' },
  { id: 'm', name: 'Média' },
  { id: 'g', name: 'Grande' },
  { id: 'gg', name: 'Família' }
];

const NewOrderModal: React.FC<NewOrderModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  deliveryStaff
}) => {
  const { pizzaFlavors, beverages, addPizzaFlavor, addBeverage } = useMenu();
  const { serviceFee, deliveryFee } = useOrders();
  const [showNewFlavorModal, setShowNewFlavorModal] = useState(false);
  const [showNewBeverageModal, setShowNewBeverageModal] = useState(false);
  const [order, setOrder] = useState<NewOrder>({
    customerName: '',
    phone: '',
    address: '',
    pizzas: [{ size: '', firstHalf: '', secondHalf: '', quantity: 1, isHalfPizza: false }],
    beverages: [{ id: '', size: '', quantity: 1 }]
  });

  const [editingPrice, setEditingPrice] = useState<{ type: 'pizza' | 'beverage', index: number } | null>(null);
  const [customPrices, setCustomPrices] = useState<{ [key: string]: number }>({});

  const getItemPrice = (type: 'pizza' | 'beverage', index: number) => {
    const key = `${type}-${index}`;
    if (customPrices[key]) return customPrices[key];

    if (type === 'pizza') {
      const pizza = order.pizzas[index];
      if (pizza.firstHalf) {
        const flavor1 = pizzaFlavors.find(f => f.id === pizza.firstHalf);
        const flavor2 = pizza.secondHalf ? pizzaFlavors.find(f => f.id === pizza.secondHalf) : null;
        return flavor2 ? (flavor1!.price + flavor2.price) / 2 : flavor1!.price;
      }
    } else {
      const beverage = order.beverages[index];
      if (beverage.id && beverage.size) {
        const selectedBeverage = beverages.find(b => b.id === beverage.id);
        const selectedSize = selectedBeverage?.sizes.find(s => s.size === beverage.size);
        return selectedSize?.price || 0;
      }
    }
    return 0;
  };

  const subtotal = useMemo(() => {
    let total = 0;
    order.pizzas.forEach((pizza, index) => {
      if (pizza.size && pizza.firstHalf) {
        total += getItemPrice('pizza', index) * pizza.quantity;
      }
    });
    order.beverages.forEach((beverage, index) => {
      if (beverage.id && beverage.size) {
        total += getItemPrice('beverage', index) * beverage.quantity;
      }
    });
    return total;
  }, [order, customPrices]);

  const isSalonOrder = useMemo(() => order.address.toLowerCase().trim() === 'consumo no local', [order.address]);

  const fee = useMemo(() => {
    if (isSalonOrder) {
      return subtotal * (serviceFee / 100);
    }
    return subtotal * (deliveryFee / 100);
  }, [isSalonOrder, subtotal, serviceFee, deliveryFee]);

  const total = useMemo(() => subtotal + fee, [subtotal, fee]);

  const handlePriceEdit = (type: 'pizza' | 'beverage', index: number, newPrice: number) => {
    const key = `${type}-${index}`;
    setCustomPrices({ ...customPrices, [key]: newPrice });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order.customerName || !order.phone || !order.address) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      console.log('🔄 Criando novo pedido:', order);
      const newOrder = onConfirm(order); // Removido o 'await' pois a função não é mais async aqui
      console.log('✅ Pedido criado com sucesso:', newOrder);
    
      if (newOrder?.trackingCode) {
        const formattedPhone = order.phone.replace(/\D/g, '');
        const message = `Olá ${order.customerName}! Seu pedido foi confirmado.\n\nCódigo de rastreamento: ${newOrder.trackingCode}\n\nAcompanhe seu pedido em: ${window.location.origin}/delivery-status/${newOrder.trackingCode}`;
        const sendWhatsApp = confirm(`✅ Pedido #${newOrder.id} criado com sucesso!\nCódigo: ${newOrder.trackingCode}\n\nDeseja enviar confirmação via WhatsApp para ${order.customerName}?`);
        if (sendWhatsApp) {
          window.open(`https://wa.me/55${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
        }
      }
      
      // Reset form
      setOrder({
        customerName: '',
        phone: '',
        address: '',
        pizzas: [{ size: '', firstHalf: '', secondHalf: '', quantity: 1 }],
        beverages: [{ id: '', size: '', quantity: 1 }]
      });
      setCustomPrices({});
      
      onClose();
    } catch (error) {
      console.error('❌ Erro ao criar pedido:', error);
      alert('Erro ao criar pedido. Tente novamente.');
    }
  };

  const handleNewFlavor = (flavor: { name: string; price: number }) => {
    addPizzaFlavor(flavor);
    setShowNewFlavorModal(false);
  };

  const handleNewBeverage = (beverage: { name: string; sizes: Array<{ size: string; price: number }> }) => {
    addBeverage(beverage);
    setShowNewBeverageModal(false);
  };

  const handleDeletePizza = (index: number) => {
    const newPizzas = [...order.pizzas];
    newPizzas.splice(index, 1);
    if (newPizzas.length === 0) {
      newPizzas.push({ size: '', firstHalf: '', secondHalf: '', quantity: 1 });
    }
    setOrder({ ...order, pizzas: newPizzas });
  };

  const handleDeleteBeverage = (index: number) => {
    const newBeverages = [...order.beverages];
    newBeverages.splice(index, 1);
    if (newBeverages.length === 0) {
      newBeverages.push({ id: '', size: '', quantity: 1 });
    }
    setOrder({ ...order, beverages: newBeverages });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Novo Pedido</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Customer Information */}
            <div className="space-y-4 mb-8">
              <h3 className="text-lg font-medium">Informações do Cliente</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Cliente
                  </label>
                  <input
                    type="text"
                    value={order.customerName}
                    onChange={(e) => setOrder({...order, customerName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    value={order.phone}
                    onChange={(e) => setOrder({...order, phone: e.target.value})}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço de Entrega
                </label>
                <input
                  type="text"
                  value={order.address}
                  onChange={(e) => setOrder({...order, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
            </div>

            {/* Pizzas */}
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Pizzas</h3>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowNewFlavorModal(true)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Novo Sabor
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrder({
                      ...order,
                      pizzas: [...order.pizzas, { size: '', firstHalf: '', secondHalf: '', quantity: 1 }]
                    })}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Pizza
                  </button>
                </div>
              </div>

              {order.pizzas.map((pizza, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Pizza
                    </label>
                    <div className="flex gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => {
                          const newPizzas = [...order.pizzas];
                          newPizzas[index].isHalfPizza = false;
                          newPizzas[index].secondHalf = ''; // Limpar segundo sabor se mudar para inteira
                          setOrder({...order, pizzas: newPizzas});
                        }}
                        className={`flex-1 py-2 px-4 rounded-lg border ${ 
                          !pizza.isHalfPizza
                            ? 'bg-red-600 text-white border-red-600'
                            : 'border-gray-300 hover:border-red-600'
                        }`}
                      >
                        <div className="text-sm font-medium">Pizza Inteira</div>
                        <div className="text-xs opacity-80">Um sabor só</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newPizzas = [...order.pizzas];
                          newPizzas[index].isHalfPizza = true;
                          setOrder({...order, pizzas: newPizzas});
                        }}
                        className={`flex-1 py-2 px-4 rounded-lg border ${ 
                          pizza.isHalfPizza
                            ? 'bg-red-600 text-white border-red-600'
                            : 'border-gray-300 hover:border-red-600'
                        }`}
                      >
                        <div className="text-sm font-medium">Meia Pizza</div>
                        <div className="text-xs opacity-80">Dois sabores</div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tamanho da Pizza
                    </label>
                    <div className="flex gap-2">
                      {PIZZA_SIZES.map((size) => (
                        <button
                          key={size.id}
                          type="button"
                          onClick={() => {
                            const newPizzas = [...order.pizzas];
                            newPizzas[index].size = size.id;
                            setOrder({...order, pizzas: newPizzas});
                          }}
                          className={`flex-1 py-2 px-4 rounded-lg border ${ 
                            pizza.size === size.id
                              ? 'bg-red-600 text-white border-red-600'
                              : 'border-gray-300 hover:border-red-600'
                          }`}
                        >
                          <div className="text-sm font-medium">{size.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {pizza.isHalfPizza ? 'Primeiro Sabor (Metade 1)' : 'Sabor da Pizza'}
                      </label>
                      <select
                        value={pizza.firstHalf}
                        onChange={(e) => {
                          const newPizzas = [...order.pizzas];
                          newPizzas[index].firstHalf = e.target.value;
                          setOrder({...order, pizzas: newPizzas});
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="">Selecione o sabor</option>
                        {pizzaFlavors.map((flavor) => (
                          <option key={flavor.id} value={flavor.id}>
                            {flavor.name} - R$ {flavor.price.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {pizza.isHalfPizza ? 'Segundo Sabor (Metade 2)' : 'Segundo Sabor (Opcional)'}
                      </label>
                      <select
                        value={pizza.secondHalf}
                        disabled={!pizza.isHalfPizza}
                        onChange={(e) => {
                          const newPizzas = [...order.pizzas];
                          newPizzas[index].secondHalf = e.target.value;
                          setOrder({...order, pizzas: newPizzas});
                        }}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 ${ 
                          !pizza.isHalfPizza ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                      >
                        <option value="">{pizza.isHalfPizza ? 'Selecione o segundo sabor' : 'Não disponível para pizza inteira'}</option>
                        {pizza.isHalfPizza && pizzaFlavors.map((flavor) => (
                          <option key={flavor.id} value={flavor.id}>
                            {flavor.name} - R$ {flavor.price.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantidade
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={pizza.quantity}
                        onChange={(e) => {
                          const newPizzas = [...order.pizzas];
                          newPizzas[index].quantity = parseInt(e.target.value);
                          setOrder({...order, pizzas: newPizzas});
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>

                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => handleDeletePizza(index)}
                        className="text-sm text-red-600 hover:text-red-700 mt-6"
                      >
                        Remover Pizza
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Beverages */}
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Bebidas</h3>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowNewBeverageModal(true)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Nova Bebida
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrder({
                      ...order,
                      beverages: [...order.beverages, { id: '', size: '', quantity: 1 }]
                    })}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Bebida
                  </button>
                </div>
              </div>

              {order.beverages.map((beverage, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bebida
                    </label>
                    <select
                      value={beverage.id}
                      onChange={(e) => {
                        const newBeverages = [...order.beverages];
                        newBeverages[index].id = e.target.value;
                        setOrder({ ...order, beverages: newBeverages });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Selecione a bebida</option>
                      {beverages.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  {beverage.id && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tamanho
                      </label>
                      <div className="flex gap-2">
                        {beverages.find(b => b.id === beverage.id)?.sizes.map((size) => (
                          <button
                            key={size.size}
                            type="button"
                            onClick={() => {
                              const newBeverages = [...order.beverages];
                              newBeverages[index].size = size.size;
                              setOrder({...order, beverages: newBeverages});
                            }}
                            className={`flex-1 py-2 px-4 rounded-lg border ${ 
                              beverage.size === size.size
                                ? 'bg-red-600 text-white border-red-600'
                                : 'border-gray-300 hover:border-red-600'
                            }`}
                          >
                            <div className="text-sm font-medium">{size.size}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantidade
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={beverage.quantity}
                        onChange={(e) => {
                          const newBeverages = [...order.beverages];
                          newBeverages[index].quantity = parseInt(e.target.value);
                          setOrder({...order, beverages: newBeverages});
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>

                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteBeverage(index)}
                        className="text-sm text-red-600 hover:text-red-700 mt-6"
                      >
                        Remover Bebida
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 p-6 rounded-lg mb-8">
              <h3 className="text-lg font-medium mb-4">Resumo do Pedido</h3>
              
              <div className="space-y-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Item</th>
                      <th className="text-right py-2">Qtd</th>
                      <th className="text-right py-2">Preço Unit.</th>
                      <th className="text-right py-2">Subtotal</th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.pizzas.map((pizza, index) => {
                      if (!pizza.size || !pizza.firstHalf) return null;
                      const price = getItemPrice('pizza', index);
                      return (
                        <tr key={`pizza-${index}`} className="border-b">
                          <td className="py-2">
                            {pizza.secondHalf
                              ? `${pizza.isHalfPizza ? 'Meia Pizza' : 'Pizza'} ${pizzaFlavors.find(f => f.id === pizza.firstHalf)?.name} / ${pizzaFlavors.find(f => f.id === pizza.secondHalf)?.name}`
                              : `${pizza.isHalfPizza ? 'Meia Pizza' : 'Pizza Inteira'} ${pizzaFlavors.find(f => f.id === pizza.firstHalf)?.name}`
                            } ({PIZZA_SIZES.find(s => s.id === pizza.size)?.name})
                          </td>
                          <td className="text-right">{pizza.quantity}</td>
                          <td className="text-right">
                            {editingPrice?.type === 'pizza' && editingPrice.index === index ? (
                              <input
                                type="number"
                                step="0.01"
                                value={customPrices[`pizza-${index}`] || price}
                                onChange={(e) => handlePriceEdit('pizza', index, parseFloat(e.target.value))}
                                className="w-24 px-2 py-1 border rounded"
                                onBlur={() => setEditingPrice(null)}
                                autoFocus
                              />
                            ) : (
                              `R$ ${price.toFixed(2)}`
                            )}
                          </td>
                          <td className="text-right">R$ {(price * pizza.quantity).toFixed(2)}</td>
                          <td className="text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingPrice({ type: 'pizza', index })}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePizza(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {order.beverages.map((beverage, index) => {
                      if (!beverage.id || !beverage.size) return null;
                      const price = getItemPrice('beverage', index);
                      return (
                        <tr key={`beverage-${index}`} className="border-b">
                          <td className="py-2">
                            {beverages.find(b => b.id === beverage.id)?.name} ({beverage.size})
                          </td>
                          <td className="text-right">{beverage.quantity}</td>
                          <td className="text-right">
                            {editingPrice?.type === 'beverage' && editingPrice.index === index ? (
                              <input
                                type="number"
                                step="0.01"
                                value={customPrices[`beverage-${index}`] || price}
                                onChange={(e) => handlePriceEdit('beverage', index, parseFloat(e.target.value))}
                                className="w-24 px-2 py-1 border rounded"
                                onBlur={() => setEditingPrice(null)}
                                autoFocus
                              />
                            ) : (
                              `R$ ${price.toFixed(2)}`
                            )}
                          </td>
                          <td className="text-right">R$ {(price * beverage.quantity).toFixed(2)}</td>
                          <td className="text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingPrice({ type: 'beverage', index })}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBeverage(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold">
                      <td colSpan={3} className="py-2 text-right">Subtotal:</td>
                      <td className="text-right">{formatCurrency(subtotal)}</td>
                      <td></td>
                    </tr>
                    <tr className="font-bold">
                      <td colSpan={3} className="py-2 text-right flex items-center justify-end gap-1">
                        {isSalonOrder ? <Pencil className="h-3 w-3" /> : <Truck className="h-4 w-4" />}
                        {isSalonOrder ? `Taxa de Serviço (${serviceFee}%)` : `Taxa de Entrega (${deliveryFee}%)`}
                      </td>
                      <td className="text-right">{formatCurrency(fee)}</td>
                      <td></td>
                    </tr>
                    <tr className="font-bold text-lg">
                      <td colSpan={3} className="py-2 text-right">Total:</td>
                      <td className="text-right">{formatCurrency(total)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Confirmar Pedido
              </button>
            </div>
          </form>
        </div>
      </div>

      <NewFlavorModal
        isOpen={showNewFlavorModal}
        onClose={() => setShowNewFlavorModal(false)}
        onConfirm={handleNewFlavor}
      />

      <NewBeverageModal
        isOpen={showNewBeverageModal}
        onClose={() => setShowNewBeverageModal(false)}
        onConfirm={handleNewBeverage}
      />
    </>
  );
};

export default NewOrderModal;