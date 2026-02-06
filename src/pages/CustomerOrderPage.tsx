import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingCart, X, Settings, ChevronDown, ChevronUp, Tag, Pizza, Search } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTheme } from '../contexts/ThemeContext';
import { useMenu } from '../features/orders/hooks/useMenu';
import { useOrders } from '../features/orders/hooks/useOrders';
import { formatCurrency } from '../utils/formatters';
import { processImageUrl, getDefaultImage } from '../utils/imageUtils';
import { useAuth } from '../hooks/useAuth';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getTenantRef } from '../config/firebase';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  type: string; // Alterado para string para aceitar tipos dinâmicos
  image?: string;
  firstHalf?: string;
  secondHalf?: string;
  isHalfPizza?: boolean;
}

interface Coupon {
  id: string;
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  minValue?: number;
  expiry?: string;
  isActive: boolean;
  createdAt: string;
  usageCount?: number;
}

const CustomerOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();
  const { pizzaFlavors, beverages } = useMenu();
  const { addOrder, deliveryFee } = useOrders();
  const { storeName } = useAuth();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [showCheckout, setShowCheckout] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pizzaSelection, setPizzaSelection] = useState({
    isSelecting: false,
    pizzaId: null,
    mode: null,
    firstHalf: null,
    secondHalf: null,
    step: null
  });
  const [showMeiaPizzaModal, setShowMeiaPizzaModal] = useState(false);
  const [meiaPizzaFirstFlavor, setMeiaPizzaFirstFlavor] = useState<string | null>(null);
  const [isPizzasEspeciaisCollapsed, setIsPizzasEspeciaisCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({
    salgadas: true,
    especiais: true,
    doces: true,
    lanches: true,
    refeicoes: true,
    bebidas: true
    // Este estado será gerenciado dinamicamente
  });
  const [showCart, setShowCart] = useState(false);
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);
  const [showDeleteAllMenuConfirm, setShowDeleteAllMenuConfirm] = useState(false); // Novo estado para confirmar exclusão de todo o cardápio
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para cupom de desconto
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);

  const userName = searchParams.get('user') || 'Cliente';

  // Filtrar itens por categoria
  const pizzasSalgadas = pizzaFlavors.filter(item => item.category === 'salgada');
  const pizzasEspeciais = pizzaFlavors.filter(item => item.category === 'especial');
  const pizzasDoces = pizzaFlavors.filter(item => item.category === 'doce');
  const lanches = pizzaFlavors.filter(item => item.category === 'lanche');
  const refeicoes = pizzaFlavors.filter(item => item.category === 'refeicao');
  // Agrupar itens por categoria dinamicamente
  const menuSections = useMemo(() => {
    const sections = new Map<string, any[]>();
    // Combina todos os itens do menu em uma única lista para garantir que nada seja perdido.
    const allItems = [...pizzaFlavors, ...beverages];
    
    const filteredItems = searchTerm 
      ? allItems.filter(item => 
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.ingredients && item.ingredients.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      : allItems;

    filteredItems.forEach(item => {
      // Define 'bebidas' para itens com esse tipo, ou usa a categoria, ou 'produtos' como fallback.
      const category = item.type === 'bebidas' ? 'bebidas' : item.category || 'produtos';
      
      if (!sections.has(category)) {
        sections.set(category, []);
      }
      sections.get(category)?.push(item);
    });

    return sections;
  }, [pizzaFlavors, beverages, searchTerm]);

  // Inicializa o estado das seções recolhidas
  useEffect(() => {
    // Este useEffect agora depende de `menuSections` para garantir que ele execute
    // quando as seções do menu forem carregadas do Firebase, mas de forma segura.
    if (menuSections.size > 0) {
      setCollapsedSections(prevState => {
        const newState = { ...prevState };
        let hasChanged = false;
        for (const key of menuSections.keys()) {
          if (!(key in newState)) { // Adiciona apenas se a chave da seção for nova
            newState[key] = true; // Começa recolhida
            hasChanged = true;
          }
        }
        // Só atualiza o estado se novas seções foram adicionadas, evitando re-renderizações desnecessárias.
        return hasChanged ? newState : prevState;
      });
    }
  }, [menuSections]);

  // Expandir seções ao buscar
  useEffect(() => {
    if (searchTerm) {
      setCollapsedSections(prev => {
        const newState = { ...prev };
        Array.from(menuSections.keys()).forEach(key => {
          newState[key] = false;
        });
        return newState;
      });
    }
  }, [searchTerm, menuSections]);

  // Carregar cupons do Firebase
  useEffect(() => {
    const loadCoupons = async () => {
      try {
        const couponsRef = getTenantRef('coupons');
        const unsubscribe = onValue(couponsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const couponsList = Object.entries(data).map(([id, coupon]: any) => ({
              id,
              ...coupon,
            }));
            // Filtrar apenas cupons ativos e não expirados
            const activeCoupons = couponsList.filter((coupon: Coupon) => {
              if (!coupon.isActive) return false;
              if (coupon.expiry) {
                const expiryDate = new Date(coupon.expiry);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return expiryDate >= today;
              }
              return true;
            });
            setAvailableCoupons(activeCoupons);
          } else {
            setAvailableCoupons([]);
          }
        });
        return () => unsubscribe();
      } catch (error) {
        console.error('❌ Erro ao carregar cupons:', error);
        setAvailableCoupons([]);
      }
    };

    loadCoupons();
  }, []);

  // Função para obter a descrição completa do produto (descrição + ingredientes)
  const getProductDescription = (product: any) => {
    let fullDescription = '';
    
    // Adicionar descrição principal se existir
    if (product.description) {
      fullDescription += product.description;
    }
    
    // Adicionar ingredientes se existir
    if (product.ingredients) {
      if (fullDescription) fullDescription += '. ';
      fullDescription += product.ingredients;
    }
    
    // Se não tiver nem descrição nem ingredientes, usar um texto padrão
    if (!fullDescription) {
      fullDescription = 'Deliciosa pizza artesanal preparada com ingredientes frescos e selecionados.';
    }
    
    return fullDescription;
  };

  const startPizzaSelection = (pizzaId: string) => {
    setPizzaSelection({
      isSelecting: true,
      pizzaId,
      mode: null,
      firstHalf: null,
      secondHalf: null,
      step: 'mode'
    });
  };

  const selectPizzaMode = (mode: 'inteira' | 'meia') => {
    setPizzaSelection(prev => ({
      ...prev,
      mode,
      step: 'first'
    }));
  };

  const selectFirstHalf = (flavorId: string) => {
    setPizzaSelection(prev => ({
      ...prev,
      firstHalf: flavorId,
      step: prev.mode === 'meia' ? 'second' : null
    }));
  };

  const selectSecondHalf = (flavorId: string) => {
    if (flavorId === pizzaSelection.firstHalf) {
      alert('Por favor, escolha um sabor diferente para a segunda metade');
      return;
    }

    const pizza = pizzaFlavors.find(p => p.id === pizzaSelection.pizzaId);
    const firstFlavor = pizzaFlavors.find(f => f.id === pizzaSelection.firstHalf);
    const secondFlavor = pizzaFlavors.find(f => f.id === flavorId);
    
    if (pizza && firstFlavor && secondFlavor) {
      // Corrigido: Calcular preço médio dos dois sabores considerando promoções individuais
      const firstPrice = firstFlavor.isPromotion && firstFlavor.promotionPrice 
        ? firstFlavor.promotionPrice 
        : firstFlavor.price;
      const secondPrice = secondFlavor.isPromotion && secondFlavor.promotionPrice ? secondFlavor.promotionPrice : secondFlavor.price;
      const finalPrice = Math.max(firstPrice, secondPrice);
      
      addToCart({
        id: `${pizza.id}-half`,
        name: `Meia Pizza ${firstFlavor.name} / ${secondFlavor.name}`,
        price: finalPrice,
        quantity: 1,
        type: 'pizza',
        image: pizza.image,
        firstHalf: pizzaSelection.firstHalf!,
        secondHalf: flavorId,
        isHalfPizza: true
      });
    }
    
    cancelPizzaSelection();
  };

  const cancelPizzaSelection = () => {
    setPizzaSelection({
      isSelecting: false,
      pizzaId: null,
      mode: null,
      firstHalf: null,
      secondHalf: null,
      step: null
    });
  };

  const handleMeiaPizzaDirectSelection = (pizzaId: string) => {
    setMeiaPizzaFirstFlavor(pizzaId);
    setShowMeiaPizzaModal(true);
  };

  const handleMeiaPizzaSecondFlavor = (secondFlavorId: string) => {
    if (!meiaPizzaFirstFlavor) return;
    
    const firstPizza = pizzaFlavors.find(p => p.id === meiaPizzaFirstFlavor);
    const secondPizza = pizzaFlavors.find(p => p.id === secondFlavorId);
    
    if (firstPizza && secondPizza) {
      // Corrigido: Calcular preço médio considerando promoções
      const firstPrice = firstPizza.isPromotion && firstPizza.promotionPrice 
        ? firstPizza.promotionPrice 
        : firstPizza.price;
      const secondPrice = secondPizza.isPromotion && secondPizza.promotionPrice ? secondPizza.promotionPrice : secondPizza.price;
      const finalPrice = Math.max(firstPrice, secondPrice);
      
      addToCart({
        id: `meia-${meiaPizzaFirstFlavor}-${secondFlavorId}`,
        name: `Meia Pizza ${firstPizza.name} / ${secondPizza.name}`,
        price: finalPrice,
        quantity: 1,
        type: 'pizza',
        image: firstPizza.image,
        firstHalf: meiaPizzaFirstFlavor,
        secondHalf: secondFlavorId,
        isHalfPizza: true
      });
    }
    
    setShowMeiaPizzaModal(false);
    setMeiaPizzaFirstFlavor(null);
  };

  const handleInteiraDirectSelection = (pizzaId: string) => {
    const pizza = pizzaFlavors.find(p => p.id === pizzaId);
    if (pizza) {
      const flavor = pizzaFlavors.find(f => f.id === pizzaId);
      if (!flavor) return; // Garante que o sabor foi encontrado
      addToCart({
        id: pizza.id,
        name: `Pizza Inteira ${flavor.name}`,
        price: flavor.isPromotion && flavor.promotionPrice ? flavor.promotionPrice : flavor.price,
        quantity: 1,
        type: 'pizza',
        image: pizza.image,
        firstHalf: flavor.id,
        isHalfPizza: false
      });
    }
  };


  // Função para adicionar lanche ou refeição ao carrinho
  const handleAddItem = (item: any, type: string) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.isPromotion && item.promotionPrice ? item.promotionPrice : item.price,
      quantity: 1,
      type: item.type || 'produto', // Usar o tipo do item ou 'produto' como padrão
      image: item.image
    });
  };

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existingItem = prev.find(cartItem => 
        cartItem.id === item.id && 
        cartItem.size === item.size &&
        cartItem.type === item.type
      );
      
      if (existingItem) {
        return prev.map(cartItem =>
          cartItem.id === item.id && cartItem.size === item.size && cartItem.type === item.type
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const removeFromCart = (itemId: string, size?: string, type?: string) => {
    setCart(prevCart =>
      prevCart.filter(item => !(item.id === itemId && (item.size || '') === (size || '') && item.type === type))
    );
  };

  const updateQuantity = (itemId: string, size: string | undefined, type: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId, size, type);
      return;
    }
    
    setCart(prev => prev.map(item =>
      item.id === itemId && item.size === size && item.type === type
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const getSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getDiscount = () => {
    if (!appliedCoupon) return 0;
    
    const subtotal = getSubtotal();
    
    if (appliedCoupon.type === 'percentage') {
      return (subtotal * appliedCoupon.discount) / 100;
    } else {
      return appliedCoupon.discount;
    }
  };

  const getDeliveryFeeAmount = () => {
    if (!deliveryFee) return 0;
    const subtotal = getSubtotal();
    return (subtotal * (deliveryFee || 0)) / 100;
  };

  const getTotalPrice = () => {
    const subtotal = getSubtotal();
    const discount = getDiscount();
    const deliveryFeeAmount = getDeliveryFeeAmount();
    return Math.max(0, subtotal - discount + deliveryFeeAmount);
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Digite um código de cupom');
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError('');

    try {
      // Buscar cupom no Firebase
      const coupon = availableCoupons.find((c: Coupon) => 
        c.code.toLowerCase() === couponCode.trim().toLowerCase()
      );
      
      if (!coupon) {
        setCouponError('Cupom inválido ou expirado');
        setIsApplyingCoupon(false);
        return;
      }

      // Verificar se o cupom está ativo
      if (!coupon.isActive) {
        setCouponError('Este cupom não está mais ativo');
        setIsApplyingCoupon(false);
        return;
      }

      // Verificar se o cupom não expirou
      if (coupon.expiry) {
        const expiryDate = new Date(coupon.expiry);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Fim do dia
        
        if (expiryDate < today) {
          setCouponError('Este cupom já expirou');
          setIsApplyingCoupon(false);
          return;
        }
      }

      // Verificar valor mínimo
      const subtotal = getSubtotal();
      if (coupon.minValue && subtotal < coupon.minValue) {
        setCouponError(`Valor mínimo de ${formatCurrency(coupon.minValue)} para usar este cupom`);
        setIsApplyingCoupon(false);
        return;
      }

      // Aplicar cupom
      setAppliedCoupon(coupon);
      setCouponCode('');
      setCouponError('');
      setIsApplyingCoupon(false);
      
      // Mostrar mensagem de sucesso
      const discountAmount = coupon.type === 'percentage' 
        ? `${coupon.discount}%` 
        : formatCurrency(coupon.discount);
      toast.success(`Cupom aplicado com sucesso! Desconto de ${discountAmount}`);
      
    } catch (error) {
      console.error('❌ Erro ao aplicar cupom:', error);
      setCouponError('Erro ao verificar cupom. Tente novamente.');
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleSubmitOrder = async () => {
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
      toast.warn('Por favor, preencha todas as informações do cliente');
      return;
    }

    if (cart.length === 0) {
      toast.warn('Adicione pelo menos um item ao carrinho');
      return;
    }

    setIsSubmitting(true);

    try {
      // Categorizar itens do carrinho para corresponder à estrutura esperada por addOrder
      const pizzas = cart.filter(item => item.type === 'pizza').map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size ?? '',
        firstHalf: item.firstHalf || '',
        secondHalf: item.secondHalf || '',
        isHalfPizza: item.isHalfPizza || false,
      }));

      const beverages = cart.filter(item => item.type === 'bebidas').map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size ?? 'Único',
        image: item.image || '',
      }));

      const lanches = cart.filter(item => item.type === 'lanche').map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image || '',
      }));

      const refeicoes = cart.filter(item => item.type === 'refeicao').map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image || '',
      }));

      const produtos = cart.filter(item => item.type === 'produto').map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size ?? 'Único',
        image: item.image || '',
      }));

      const newOrder = {
        customerName: customerInfo.name,
        phone: customerInfo.phone,
        address: customerInfo.address,
        pizzas,
        beverages,
        lanches,
        refeicoes,
        produtos,
        coupon: appliedCoupon ? {
          code: appliedCoupon.code,
          discount: getDiscount()
        } : null,
        subtotal: getSubtotal(),
        deliveryFee: getDeliveryFeeAmount(),
        total: getTotalPrice()
      };

      const createdOrder = await addOrder(newOrder);
      
      // Mostrar confirmação
      toast.success(`Pedido #${createdOrder.trackingCode} criado com sucesso!`);
      
      // Limpar carrinho e formulário
      setCart([]);
      setCustomerInfo({ name: '', phone: '', address: '' });
      setShowCheckout(false);
      setAppliedCoupon(null);
      setCouponCode('');
      
      // Redirecionar para página de rastreamento
      navigate(`/delivery-status/${createdOrder.trackingCode}`);
      
    } catch (error) {
      console.error('❌ Erro ao criar pedido:', error);
      toast.error('Erro ao criar pedido. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPizza = (pizza: any, isHalf: boolean) => {
    if (isHalf) {
      handleMeiaPizzaDirectSelection(pizza.id);
    } else {
      handleInteiraDirectSelection(pizza.id);
    }
  };

  const handleAddItemWithSize = (item: any, size: any) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: size.price,
      quantity: 1,
      size: size.size, // Mantém o tamanho do item
      type: item.type || 'produto', // Usa o tipo do item ou um padrão
      image: item.image
    });
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100" style={{ fontFamily: theme.fontFamily }}>
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
      <Header />
      
      <main className="flex-1 container mx-auto px-3 sm:px-6 py-6 sm:py-12 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
          <div>
            <p 
              className="text-gray-400 text-lg sm:text-x3"
              style={{ fontFamily: theme.fontFamily }}
            >
              Escolha os itens para o seu pedido
            </p>
          </div>

          {cart.length > 0 && (
            <button
              onClick={() => setShowClearCartConfirm(true)} // Ação de limpar carrinho mantida
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors bg-red-100 text-red-600 hover:bg-red-200 whitespace-nowrap"
              style={{ fontFamily: theme.fontFamily }}
            >
              <Trash2 className="h-4 w-4" />
              Limpar Carrinho
            </button>
          )}
        </div>

        <div className="relative w-full mb-6">
          <input
            type="text"
            placeholder="Buscar itens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-gray-900"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Menu - Agora ocupa toda a largura */}
        <div className="w-full">
          {/* Os blocos de código estáticos foram removidos para corrigir o erro de sintaxe. */}

          {/* Renderização dinâmica das seções do menu */}
          {Array.from(menuSections.entries()).map(([category, items]) => (
            <div key={category} className="mb-8 sm:mb-12">
              <div 
                className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 cursor-pointer group"
                onClick={() => toggleSection(category)}
              >
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                  {/* Ícone pode ser dinâmico também no futuro */}
                  <span className="text-2xl sm:text-3xl">
                    {category === 'salgada' ? '🍕' : 
                     category === 'especial' ? '⭐' : 
                     category === 'doce' ? '🍰' :
                     category === 'lanche' ? '🥪' :
                     category === 'refeicao' ? '🍽️' :
                     category === 'bebidas' ? '🥤' : '🍴'}
                  </span>
                  <h2 
                    className="text-xl sm:text-2xl font-bold capitalize"
                    style={{ 
                      color: theme.textColor,
                      fontFamily: theme.fontFamily
                    }}
                  >
                    {category.replace(/_/g, ' ')}
                  </h2>
                </div>
                <button
                  className="p-1 sm:p-2 rounded-full hover:bg-gray-100 transition-colors"
                  style={{ fontFamily: theme.fontFamily }}
                >
                  {collapsedSections[category] ? (
                    <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                  ) : (
                    <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                  )}
                </button>
              </div>
              
              {!collapsedSections[category] && (
                <div className="space-y-2 sm:space-y-3 transition-all duration-300">
                  {items.map((item: any) => (
                    <div
                      key={item.id}
                      className="bg-white p-3 sm:p-6 shadow-sm border hover:shadow-md transition-all duration-300 animate-fade-in"
                      style={{
                        borderRadius: theme.borderRadius === 'none' ? '0' :
                                     theme.borderRadius === 'sm' ? '0.125rem' :
                                     theme.borderRadius === 'md' ? '0.375rem' :
                                     theme.borderRadius === 'lg' ? '0.5rem' :
                                     theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                        fontFamily: theme.fontFamily
                      }}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
                        <div className="flex-shrink-0 w-full sm:w-auto flex justify-center sm:justify-start">
                          <img
                            src={processImageUrl(item.image) || getDefaultImage(category === 'bebidas' ? 'beverage' : 'pizza')}
                            alt={item.name}
                            className="w-20 h-20 sm:w-24 sm:h-24 object-cover"
                            style={{
                              borderRadius: theme.borderRadius === 'none' ? '0' :
                                           theme.borderRadius === 'sm' ? '0.125rem' :
                                           theme.borderRadius === 'md' ? '0.375rem' :
                                           theme.borderRadius === 'lg' ? '0.5rem' :
                                           theme.borderRadius === 'xl' ? '0.75rem' : '50%'
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = getDefaultImage(category === 'bebidas' ? 'beverage' : 'pizza');
                            }}
                          />
                        </div>

                        <div className="flex-1 w-full">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex-1">
                              <h3 
                                className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-center sm:text-left"
                                style={{ color: theme.textColor, fontFamily: theme.fontFamily }}
                              >
                                {item.name}
                                {item.isPromotion && (
                                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                    PROMOÇÃO
                                  </span>
                                )}
                              </h3>
                              <p 
                                className="text-gray-600 mb-2 sm:mb-4 text-xs sm:text-sm leading-relaxed text-center sm:text-left"
                                style={{ fontFamily: theme.fontFamily }}
                              >
                                {getProductDescription(item)}
                              </p>
                              {item.price && (
                                <div className="flex items-center justify-center sm:justify-start gap-4">
                                  {item.isPromotion && item.promotionPrice ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-base sm:text-lg text-gray-500 line-through" style={{ fontFamily: theme.fontFamily }}>
                                        {formatCurrency(item.price)}
                                      </span>
                                      <span className="text-xl sm:text-2xl font-bold text-red-600" style={{ fontFamily: theme.fontFamily }}>
                                        {formatCurrency(item.promotionPrice)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xl sm:text-2xl font-bold" style={{ color: theme.primaryColor, fontFamily: theme.fontFamily }}>
                                      {formatCurrency(item.price)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                              {category.includes('pizza') || ['salgada', 'doce', 'especial'].includes(category) ? (
                                <>
                                  <button
                                    onClick={() => handleAddPizza(item, false)}
                                    className="flex-1 sm:flex-none text-white px-3 py-2 text-sm font-medium transition-colors hover:opacity-90 flex items-center justify-center gap-1"
                                    style={{ backgroundColor: theme.primaryColor, borderRadius: theme.borderRadius, fontFamily: theme.fontFamily }}
                                  >
                                    <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="hidden sm:inline">Pizza </span>Inteira
                                  </button>
                                  <button
                                    onClick={() => handleAddPizza(item, true)}
                                    className="flex-1 sm:flex-none text-white px-3 py-2 text-sm font-medium transition-colors hover:opacity-90 flex items-center justify-center gap-1"
                                    style={{ backgroundColor: theme.secondaryColor, borderRadius: theme.borderRadius, fontFamily: theme.fontFamily }}
                                  >
                                    <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="hidden sm:inline">Meia </span>Pizza
                                  </button>
                                </>
                              ) : (item.sizes && item.sizes.length > 0) ? (
                                item.sizes.map((size, index) => (
                                  <button
                                    key={index}
                                    onClick={() => handleAddItemWithSize(item, size)}
                                    className="text-white px-3 py-2 text-sm font-medium transition-colors hover:opacity-90 flex items-center justify-between gap-2"
                                    style={{ backgroundColor: theme.primaryColor, borderRadius: theme.borderRadius, fontFamily: theme.fontFamily }}
                                  >
                                    <span>{size.size}</span>
                                    <span>{formatCurrency(size.price)}</span>
                                  </button>
                                ))
                              ) : (
                                <button
                                  onClick={() => handleAddItem(item, category)}
                                  className="flex-1 sm:flex-none text-white px-4 py-2 text-sm font-medium transition-colors hover:opacity-90 flex items-center justify-center gap-2"
                                  style={{ backgroundColor: theme.primaryColor, borderRadius: theme.borderRadius, fontFamily: theme.fontFamily }}
                                >
                                  <Plus className="h-4 w-4" />
                                  Adicionar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Carrinho Flutuante */}
        {cart.length > 0 && (
          <div className="fixed bottom-4 right-4 z-50">
            <button
              onClick={() => setShowCart(true)}
              className="bg-red-600 text-white p-4 rounded-full shadow-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <ShoppingCart className="h-6 w-6" />
              <span className="bg-white text-red-600 rounded-full px-2 py-1 text-sm font-bold">
                {cart.reduce((total, item) => total + item.quantity, 0)}
              </span>
            </button>
          </div>
        )}

        {/* Modal do Carrinho */}
        {showCart && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Carrinho</h3>
                <button
                  onClick={() => setShowCart(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex justify-end mb-4">
                <button
                  onClick={clearCart}
                  className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4" /> Limpar Carrinho
                </button>
              </div>

              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Carrinho vazio</p>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cart.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        <img
                          src={processImageUrl(item.image) || getDefaultImage('pizza')}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          {item.size && (
                            <p className="text-xs text-gray-500">{item.size}</p>
                          )}
                          <p className="text-sm font-bold text-red-600">
                            {formatCurrency(item.price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.size, item.type, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.size, item.type, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id, item.size, item.type)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Cupom de Desconto */}
                  <div className="border-t pt-4 mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cupom de Desconto (Opcional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Digite o código do cupom"
                        disabled={!!appliedCoupon}
                      />
                      {appliedCoupon ? (
                        <button
                          onClick={removeCoupon}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Remover
                        </button>
                      ) : (
                        <button
                          onClick={applyCoupon}
                          disabled={isApplyingCoupon || !couponCode.trim()}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isApplyingCoupon ? 'Verificando...' : 'Aplicar'}
                        </button>
                      )}
                    </div>
                    {couponError && (
                      <p className="text-red-600 text-sm mt-1">{couponError}</p>
                    )}
                    {appliedCoupon && (
                      <p className="text-green-600 text-sm mt-1">
                        ✅ Cupom "{appliedCoupon.code}" aplicado! Desconto: {
                          appliedCoupon.type === 'percentage' 
                            ? `${appliedCoupon.discount}%` 
                            : formatCurrency(appliedCoupon.discount)
                        }
                      </p>
                    )}
                  </div>

                  {/* Resumo do Pedido */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Itens do Pedido:</h4>
                    <div className="space-y-1 text-sm mb-4">
                      {cart.map((item, index) => (
                        <div key={index} className="flex justify-between">
                          <span>{item.name} x {item.quantity}</span>
                          <span>{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    <h4 className="font-medium mb-2">Resumo do Pedido:</h4>
                    <div className="space-y-1 text-sm mb-4">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(getSubtotal())}</span>
                      </div>
                      {appliedCoupon && (
                        <div className="flex justify-between text-green-600">
                          <span>Desconto:</span>
                          <span>-{formatCurrency(getDiscount())}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Taxa de Entrega:</span>
                        <span>+ {formatCurrency(getDeliveryFeeAmount())}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-1">
                        <span>Total:</span>
                        <span className="text-red-600">{formatCurrency(getTotalPrice())}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowCart(false);
                        setShowCheckout(true);
                      }}
                      className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
                    >
                      Finalizar Pedido
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal de Checkout */}
        {showCheckout && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Finalizar Pedido</h3>
                <button
                  onClick={() => setShowCheckout(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Seu nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Endereço
                  </label>
                  <textarea
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Rua, número, bairro, cidade"
                    rows={3}
                  />
                </div>

                {/* Resumo do Pedido */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Itens do Pedido:</h4>
                  <div className="space-y-1 text-sm mb-4">
                    {cart.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.name} x {item.quantity}</span>
                        <span>{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <h4 className="font-medium mb-2">Resumo do Pedido:</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(getSubtotal())}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-green-600">
                        <span>Desconto:</span>
                        <span>-{formatCurrency(getDiscount())}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Taxa de Entrega:</span>
                      <span>{formatCurrency(getDeliveryFeeAmount())}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-1">
                      <span>Total:</span>
                      <span className="text-red-600">{formatCurrency(getTotalPrice())}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting || !customerInfo.name || !customerInfo.phone || !customerInfo.address}
                  className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Enviando Pedido...' : 'Confirmar Pedido'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Meia Pizza */}
        {showMeiaPizzaModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Escolha o segundo sabor</h3>
                <button
                  onClick={() => setShowMeiaPizzaModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-3">
                {pizzaFlavors
                  .filter(pizza => pizza.id !== meiaPizzaFirstFlavor)
                  .map((pizza) => (
                    <button
                      key={pizza.id}
                      onClick={() => handleMeiaPizzaSecondFlavor(pizza.id)}
                      className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={processImageUrl(pizza.image) || getDefaultImage('pizza')}
                          alt={pizza.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{pizza.name}</h4>
                          <p className="text-sm text-gray-600">{formatCurrency(pizza.price)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação para Limpar Carrinho */}
        {showClearCartConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
              <h3 className="text-xl font-bold mb-4">Limpar Carrinho</h3>
              <p className="mb-6">Tem certeza que deseja remover todos os itens do seu carrinho?</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowClearCartConfirm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    clearCart();
                    setShowClearCartConfirm(false);
                    toast.info('Carrinho limpo!');
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Limpar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CustomerOrderPage;
