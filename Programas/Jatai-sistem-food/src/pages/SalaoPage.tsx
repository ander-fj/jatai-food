import React, { useState, useMemo, useEffect } from 'react';
import { Utensils, ShoppingCart, Plus, Minus, Send, User, Hash, Search, X, Share2, History } from 'lucide-react';
import { NewOrder, Order } from '../features/orders/types';
import { formatCurrency } from '../utils/formatters';
import { toast } from 'sonner';
import { processImageUrl, getDefaultImage } from '../utils/imageUtils';

interface CartItem {
  cartId: string;
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  type: 'pizza' | 'beverage';
  size?: string;
}

interface SalaoPageProps {
  // The username is now optional as it's not strictly required for this page's core functionality
  username?: string; // Recebe o username do AdminPage
  onConfirmOrder: (order: NewOrder) => Promise<Order>;
  initialTableNumber?: string;
  initialCustomerName?: string;
  serviceFee?: number;
}
import { useMenu } from '../features/orders/hooks/useMenu';

const SalaoPage: React.FC<SalaoPageProps> = ({ onConfirmOrder, username, initialTableNumber, initialCustomerName, serviceFee }) => {
  // Se a taxa de serviço não for fornecida, assume 0.
  const currentServiceFee = serviceFee || 0;

  console.log('Service Fee in SalaoPage:', serviceFee);
  const { pizzaFlavors, beverages } = useMenu();
  const [cart, setCart] = useState<CartItem[]>([]);

  // Estados internos, inicializados com props e atualizados via useEffect
  const [customerName, setCustomerName] = useState(initialCustomerName || '');
  const [tableNumber, setTableNumber] = useState(initialTableNumber || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({
    pizzasSalgadas: false,
    pizzasEspeciais: false,
    pizzasDoces: false,
    lanches: false,
    refeicoes: false,
    bebidas: false,
  });

  const [isOrderStarted, setIsOrderStarted] = useState(false);

  useEffect(() => {
    const tableFromUrl = initialTableNumber || '';
    const customerFromUrl = initialCustomerName || '';
    setTableNumber(tableFromUrl);
    setCustomerName(customerFromUrl);

    if (initialTableNumber) {
      setIsOrderStarted(true);
    } else {
      setIsOrderStarted(false);
    }
  }, [initialTableNumber, initialCustomerName]); // Re-avalia quando as props da URL mudam

  const menuItems = useMemo(() => [
    ...pizzaFlavors.map(p => ({ ...p, type: 'pizza' as const, price: p.price || 0 })),
    ...beverages.map(b => {
      // Usa o preço do primeiro tamanho como preço padrão para exibição e adição ao carrinho
      const defaultPrice = b.sizes && b.sizes.length > 0 ? b.sizes[0].price : 0;
      const defaultSize = b.sizes && b.sizes.length > 0 ? b.sizes[0].size : 'Único';
      // Retorna um objeto com uma estrutura de preço consistente
      return { ...b, type: 'beverage' as const, price: defaultPrice, size: defaultSize };
    })
  ], [pizzaFlavors, beverages]);

  const filteredMenuItems = useMemo(() => {
    if (!searchTerm) return menuItems;
    return menuItems.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, menuItems]);

  // Agrupar itens por categoria
  const pizzasSalgadas = useMemo(() => filteredMenuItems.filter(item => item.type === 'pizza' && item.category === 'salgada'), [filteredMenuItems]);
  const pizzasEspeciais = useMemo(() => filteredMenuItems.filter(item => item.type === 'pizza' && item.category === 'especial'), [filteredMenuItems]);
  const pizzasDoces = useMemo(() => filteredMenuItems.filter(item => item.type === 'pizza' && item.category === 'doce'), [filteredMenuItems]);
  const lanches = useMemo(() => filteredMenuItems.filter(item => item.type === 'pizza' && item.category === 'lanche'), [filteredMenuItems]);
  const refeicoes = useMemo(() => filteredMenuItems.filter(item => item.type === 'pizza' && item.category === 'refeicao'), [filteredMenuItems]);
  const bebidas = useMemo(() => filteredMenuItems.filter(item => item.type === 'beverage'), [filteredMenuItems]);

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };


  const handleStartOrder = () => {
    if (!tableNumber.trim()) {
      toast.error('Por favor, insira o número da mesa.');
      return;
    }
    setIsOrderStarted(true);
  };

  const addToCart = (item: { id: string; name: string; price: number; type: 'pizza' | 'beverage'; size?: string }) => {
    setCart(prev => {
      const existingItem = prev.find(cartItem => cartItem.itemId === item.id && cartItem.size === item.size);
      if (existingItem) {
        return prev.map(cartItem =>
          cartItem.cartId === existingItem.cartId ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
        );
      }
      return [...prev, { cartId: `item-${Date.now()}`, itemId: item.id, image: item.image, ...item, quantity: 1 }];
    });
    toast.success(`${item.name} adicionado.`);
  };

  const updateQuantity = (cartId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(prev => prev.filter(item => item.cartId !== cartId));
      return;
    }
    setCart(prev => prev.map(item => (item.cartId === cartId ? { ...item, quantity: newQuantity } : item)));
  };

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const serviceFeeAmount = useMemo(() => subtotal * (currentServiceFee / 100), [subtotal, currentServiceFee]);
  const total = useMemo(() => subtotal + serviceFeeAmount, [subtotal, serviceFeeAmount]);

  const handleConfirmOrder = async () => {
    if (cart.length === 0) {
      toast.error('O pedido está vazio.');
      return;
    }
    setIsSubmitting(true);
    const newOrder: NewOrder = {
      customerName: `Mesa ${tableNumber}${customerName ? ` - ${customerName}` : ''}`,
      phone: 'N/A',
      address: 'Consumo no local',
      pizzas: cart.filter(i => i.type === 'pizza').map(p => ({
        size: 'g',
        firstHalf: p.itemId,
        secondHalf: '',
        quantity: p.quantity,
        isHalfPizza: false,
      })),
      beverages: cart.filter(i => i.type === 'beverage').map(b => ({
        id: b.itemId,
        size: b.size || 'Único',
        quantity: b.quantity,
      })),
      tableNumber: tableNumber,
    };

    try {
      await onConfirmOrder(newOrder);
      toast.success(`✅ Pedido para Mesa ${tableNumber} enviado com sucesso!`);
      setCart([]);
      setCustomerName('');
      setTableNumber('');
      setSearchTerm('');
      setIsOrderStarted(false);
    } catch (error) {
      toast.error('Falha ao enviar o pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = () => {
    if (!tableNumber) {
      toast.error("Por favor, inicie um pedido com um número de mesa para compartilhar.");
      return;
    }
    // Cria uma chave única para a comanda do cliente
    const comandaKey = `mesa-${tableNumber.toLowerCase().replace(/\s+/g, '-')}${customerName ? `-${customerName.toLowerCase().replace(/\s+/g, '-')}` : ''}`;
    const link = `${window.location.origin}/comanda/${comandaKey}`;
    navigator.clipboard.writeText(link);
    toast.success(`Link para o cliente copiado!`);
    console.log("Link para o cliente:", link);
  };

  if (!isOrderStarted) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg text-center">
          <Utensils className="mx-auto h-16 w-16 text-red-500 mb-6" />
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Pedido do Salão</h1>
          <div className="space-y-4">
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input type="text" value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="Número da Mesa" className="w-full pl-10 pr-4 py-3 border rounded-lg text-lg" />
            </div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nome do Cliente (opcional)" className="w-full pl-10 pr-4 py-3 border rounded-lg text-lg" />
            </div>
            <button onClick={handleStartOrder} className="w-full bg-red-600 text-white font-bold py-4 rounded-lg hover:bg-red-700 transition-colors min-h-[56px] text-lg">
              Iniciar Pedido
            </button>
            <a
              href={`/comandas?comanda=${encodeURIComponent(`Mesa ${tableNumber}${customerName ? ` - ${customerName}` : ''}`)}`}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-lg hover:bg-blue-700 transition-colors min-h-[56px] text-lg flex items-center justify-center gap-2"
            >
              <History size={20} /> Consultar Meus Pedidos
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full bg-gray-50">
      {/* Menu */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar produto..." className="w-full pl-12 pr-10 py-3 border rounded-lg text-lg" />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1"><X size={20} className="text-gray-500" /></button>}
        </div>

        {filteredMenuItems.length === 0 && searchTerm && (
          <div className="text-center py-10 text-gray-500">
            <Search size={48} className="mx-auto text-gray-300 mb-4" />
            <p>Nenhum produto encontrado para "{searchTerm}".</p>
          </div>
        )}

        <div className="space-y-8">
          {[
            { title: 'Pizzas Salgadas', items: pizzasSalgadas, key: 'pizzasSalgadas' as const, emoji: '🍕' },
            { title: 'Pizzas Especiais', items: pizzasEspeciais, key: 'pizzasEspeciais' as const, emoji: '⭐' },
            { title: 'Pizzas Doces', items: pizzasDoces, key: 'pizzasDoces' as const, emoji: '🍰' },
            { title: 'Lanches', items: lanches, key: 'lanches' as const, emoji: '🥪' },
            { title: 'Refeições', items: refeicoes, key: 'refeicoes' as const, emoji: '🍽️' },
            { title: 'Bebidas', items: bebidas, key: 'bebidas' as const, emoji: '🥤' },
          ].map(({ title, items, key, emoji }) => (
            items.length > 0 && (
              <div key={key}>
                <div onClick={() => toggleSection(key)} className="flex items-center gap-3 mb-4 cursor-pointer group">
                  <h2 className="text-2xl font-bold text-gray-700 group-hover:text-red-600 transition-colors">{emoji} {title}</h2>
                  <span className="text-gray-400 group-hover:text-red-500 transition-colors">({items.length})</span>
                </div>
                {!collapsedSections[key] && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {items.map(item => (
                      <div key={item.id} onClick={() => addToCart(item)} className="bg-white p-3 rounded-lg shadow-sm border flex flex-col items-center justify-between text-center cursor-pointer hover:border-red-500 hover:shadow-md transition-all">
                        <img src={processImageUrl(item.image, item.type)} alt={item.name} className="w-24 h-24 object-cover mb-3 rounded-full" onError={(e) => { const target = e.target as HTMLImageElement; target.src = getDefaultImage(item.type); }} />
                        <div className="flex-grow text-center">
                          <h3 className="font-bold text-sm md:text-base leading-tight">{item.name}</h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.ingredients || item.description}</p>
                        </div>
                        <p className="font-semibold text-base text-green-600 mt-2">{formatCurrency(item.price)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          ))}
        </div>
      </div>

      {/* Cart */}
      <div className="w-full md:w-96 bg-white border-t-2 md:border-t-0 md:border-l-2 p-4 md:p-6 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">Mesa <span className="text-red-600">{tableNumber}</span> {customerName && `(${customerName})`}</h2>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
            title="Copiar link para compartilhar com o cliente"
          >
            <Share2 size={16} /> Compartilhar
          </button>
        </div>
        <div className="overflow-y-auto -mx-4 px-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              <ShoppingCart className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2">Pedido vazio</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.cartId} className="flex items-center gap-3 p-2 border-b last:border-b-0">
                  <img
                    src={processImageUrl(item.image, item.type)}
                    alt={item.name}
                    className="w-10 h-10 object-cover rounded-md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs text-gray-600">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.cartId, item.quantity - 1)} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"><Minus size={14} /></button>
                    <span className="font-bold w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.cartId, item.quantity + 1)} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-4 border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span>Taxa de Serviço ({currentServiceFee}%):</span>
            <span>{formatCurrency(serviceFeeAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-xl font-bold mb-4">
            <span>Total:</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <button onClick={handleConfirmOrder} disabled={isSubmitting || cart.length === 0} className="w-full bg-green-600 text-white py-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:bg-green-300 disabled:cursor-not-allowed min-h-[56px] text-lg">
            <Send size={20} />
            {isSubmitting ? 'Enviando...' : 'Enviar Pedido'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalaoPage;