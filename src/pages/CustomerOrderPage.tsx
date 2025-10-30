import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingCart, X, Settings, ChevronDown, ChevronUp, Tag, Pizza } from 'lucide-react';
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
  type: 'pizza' | 'beverage' | 'lanche' | 'refeicao';
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
    salgadas: false,
    especiais: false,
    doces: false,
    lanches: false,
    refeicoes: false,
    bebidas: false
  });
  const [showCart, setShowCart] = useState(false);

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

    // Se for pizza inteira, adicionar direto ao carrinho
    if (pizzaSelection.mode === 'inteira') {
      const pizza = pizzaFlavors.find(p => p.id === pizzaSelection.pizzaId);
      const flavor = pizzaFlavors.find(f => f.id === flavorId);
      
      if (pizza && flavor) {
        addToCart({
          id: pizza.id,
          name: `Pizza Inteira ${flavor.name}`,
          price: pizza.isPromotion && pizza.promotionPrice ? pizza.promotionPrice : pizza.price,
          quantity: 1,
          type: 'pizza',
          image: pizza.image,
          firstHalf: flavorId,
          isHalfPizza: false
        });
      }
      
      cancelPizzaSelection();
    }
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
      // Calcular preço médio dos dois sabores
      const firstPrice = pizza.isPromotion && pizza.promotionPrice ? pizza.promotionPrice : pizza.price;
      const secondPrice = secondFlavor.isPromotion && secondFlavor.promotionPrice ? secondFlavor.promotionPrice : secondFlavor.price;
      const averagePrice = (firstPrice + secondPrice) / 2;
      
      addToCart({
        id: `${pizza.id}-half`,
        name: `Meia Pizza ${firstFlavor.name} / ${secondFlavor.name}`,
        price: averagePrice,
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
      const averagePrice = (firstPizza.price + secondPizza.price) / 2;
      
      addToCart({
        id: `meia-${meiaPizzaFirstFlavor}-${secondFlavorId}`,
        name: `Meia Pizza ${firstPizza.name} / ${secondPizza.name}`,
        price: averagePrice,
        quantity: 1,
        type: 'pizza',
        image: firstPizza.image
      });
    }
    
    setShowMeiaPizzaModal(false);
    setMeiaPizzaFirstFlavor(null);
  };

  const handleInteiraDirectSelection = (pizzaId: string) => {
    const pizza = pizzaFlavors.find(p => p.id === pizzaId);
    if (pizza) {
      addToCart({
        id: pizza.id,
        name: `Pizza Inteira ${pizza.name}`,
        price: pizza.isPromotion && pizza.promotionPrice ? pizza.promotionPrice : pizza.price,
        quantity: 1,
        type: 'pizza',
        image: pizza.image
      });
    }
  };

  // Função para adicionar lanche ou refeição ao carrinho
  const handleAddItem = (item: any, type: 'lanche' | 'refeicao') => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.isPromotion && item.promotionPrice ? item.promotionPrice : item.price,
      quantity: 1,
      type: type,
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

  const removeFromCart = (itemId: string, size?: string, type?: string) => {
    setCart(prev => prev.filter(item => 
      !(item.id === itemId && item.size === size && item.type === type)
    ));
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

  const getTotalPrice = () => {
    const subtotal = getSubtotal();
    const discount = getDiscount();
    const totalWithFee = subtotal - discount + (deliveryFee || 0);
    return Math.max(0, totalWithFee);
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
      alert(`✅ Cupom aplicado com sucesso! Desconto de ${discountAmount}`);
      
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
      alert('Por favor, preencha todas as informações do cliente');
      return;
    }

    if (cart.length === 0) {
      alert('Adicione pelo menos um item ao carrinho');
      return;
    }

    setIsSubmitting(true);

    try {
      const pizzas = cart
        .filter(item => item.type === 'pizza')
        .map(item => ({
          size: 'm',
          firstHalf: item.id,
          secondHalf: '',
          quantity: item.quantity,
          isHalfPizza: false
        }));

      const beverages = cart
        .filter(item => item.type === 'beverage')
        .map(item => ({
          id: item.id,
          size: item.size || '',
          quantity: item.quantity
        }));

      const newOrder = {
        customerName: customerInfo.name,
        phone: customerInfo.phone,
        address: customerInfo.address,
        pizzas,
        beverages,
        coupon: appliedCoupon ? {
          code: appliedCoupon.code,
          discount: getDiscount()
        } : null,
        subtotal: getSubtotal(),
        total: getTotalPrice()
      };

      const createdOrder = await addOrder(newOrder);
      
      // Mostrar confirmação
      alert(`✅ Pedido criado com sucesso!\n\nCódigo de rastreamento: ${createdOrder.trackingCode}\n\nVocê pode acompanhar seu pedido em: ${window.location.origin}/delivery-status/${createdOrder.trackingCode}`);
      
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
      alert('Erro ao criar pedido. Tente novamente.');
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

  const handleBeverageClick = (beverage: any, size: any) => {
    addToCart({
      id: beverage.id,
      name: beverage.name,
      price: size.price,
      quantity: 1,
      size: size.size,
      type: 'beverage',
      image: beverage.image
    });
  };

  const toggleSection = (section: 'salgadas' | 'especiais' | 'doces' | 'lanches' | 'refeicoes' | 'bebidas') => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100" style={{ fontFamily: theme.fontFamily }}>
      <Header />
      
      <main className="flex-1 container mx-auto px-3 sm:px-6 py-6 sm:py-12 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          {theme.systemIcon ? (
            <img 
              src={theme.systemIcon} 
              alt="Logo" 
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const fallbackIcon = document.createElement('div');
                fallbackIcon.innerHTML = '<svg class="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>';
                (e.target as HTMLImageElement).parentNode?.insertBefore(fallbackIcon, e.target);
              }}
            />
          ) : (
            <Pizza className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
          )}
          <div>
            <h1 
              className="text-lg sm:text-2xl font-bold"
              style={{ 
                color: theme.textColor,
                fontFamily: theme.fontFamily
              }}
            >
              Pedido de {userName}
            </h1>
            <p 
              className="text-gray-400 text-sm sm:text-base"
              style={{ fontFamily: theme.fontFamily }}
            >
              Escolha suas pizzas favoritas
            </p>
          </div>
        </div>

        {/* Menu - Agora ocupa toda a largura */}
        <div className="w-full">
          {/* Pizzas Salgadas Section */}
          {pizzasSalgadas.length > 0 && (
            <div className="mb-8 sm:mb-12">
              <div 
                className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 cursor-pointer group"
                onClick={() => toggleSection('salgadas')}
              >
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                  <span className="text-2xl sm:text-3xl">🍕</span>
                  <h2 
                    className="text-xl sm:text-2xl font-bold"
                    style={{ 
                      color: theme.textColor,
                      fontFamily: theme.fontFamily
                    }}
                  >
                    Pizzas Salgadas
                  </h2>
                </div>
                <button
                  className="p-1 sm:p-2 rounded-full hover:bg-gray-100 transition-colors"
                  style={{ fontFamily: theme.fontFamily }}
                >
                  {collapsedSections.salgadas ? (
                    <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                  ) : (
                    <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                  )}
                </button>
              </div>
              
              {!collapsedSections.salgadas && (
                <>
                  <div className="text-center mb-6 sm:mb-8">
                    <p 
                      className="text-gray-600 text-base sm:text-lg"
                      style={{ fontFamily: theme.fontFamily }}
                    >
                      Sabores tradicionais e irresistíveis
                    </p>
                  </div>

                  <div className="space-y-2 sm:space-y-3 transition-all duration-300">
                    {pizzasSalgadas.map((pizza) => (
                      <div
                        key={pizza.id}
                        className="bg-white p-3 sm:p-6 shadow-sm border hover:shadow-md transition-all duration-200"
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
                          {/* Imagem da Pizza */}
                          <div className="flex-shrink-0 w-full sm:w-auto flex justify-center sm:justify-start">
                            <img
                              src={processImageUrl(pizza.image) || getDefaultImage('pizza')}
                              alt={pizza.name}
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
                                target.src = getDefaultImage('pizza');
                              }}
                            />
                          </div>

                          {/* Informações da Pizza */}
                          <div className="flex-1 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="flex-1">
                                <h3 
                                  className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-center sm:text-left"
                                  style={{ 
                                    color: theme.textColor,
                                    fontFamily: theme.fontFamily
                                  }}
                                >
                                  {pizza.name}
                                  {pizza.isPromotion && (
                                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                      PROMOÇÃO
                                    </span>
                                  )}
                                </h3>
                                <p 
                                  className="text-gray-600 mb-2 sm:mb-4 text-xs sm:text-sm leading-relaxed text-center sm:text-left"
                                  style={{ fontFamily: theme.fontFamily }}
                                >
                                  {getProductDescription(pizza)}
                                </p>
                                <div className="flex items-center justify-center sm:justify-start gap-4">
                                  {pizza.isPromotion && pizza.promotionPrice ? (
                                    <div className="flex items-center gap-2">
                                      <span 
                                        className="text-base sm:text-lg text-gray-500 line-through"
                                        style={{ fontFamily: theme.fontFamily }}
                                      >
                                        {formatCurrency(pizza.price)}
                                      </span>
                                      <span 
                                        className="text-xl sm:text-2xl font-bold text-red-600"
                                        style={{ fontFamily: theme.fontFamily }}
                                      >
                                        {formatCurrency(pizza.promotionPrice)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span 
                                      className="text-xl sm:text-2xl font-bold"
                                      style={{ 
                                        color: theme.primaryColor,
                                        fontFamily: theme.fontFamily
                                      }}
                                    >
                                      {formatCurrency(pizza.price)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Botões de Ação */}
                              <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                                <button
                                  onClick={() => handleAddPizza(pizza, false)}
                                  className="flex-1 sm:flex-none text-white px-3 py-2 text-sm font-medium transition-colors hover:opacity-90 flex items-center justify-center gap-1"
                                  style={{
                                    backgroundColor: theme.primaryColor,
                                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                                 theme.borderRadius === 'md' ? '0.375rem' :
                                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                                    fontFamily: theme.fontFamily
                                  }}
                                >
                                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="hidden sm:inline">Pizza </span>Inteira
                                </button>
                                <button
                                  onClick={() => handleAddPizza(pizza, true)}
                                  className="flex-1 sm:flex-none text-white px-3 py-2 text-sm font-medium transition-colors hover:opacity-90 flex items-center justify-center gap-1"
                                  style={{
                                    backgroundColor: theme.secondaryColor,
                                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                                 theme.borderRadius === 'md' ? '0.375rem' :
                                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                                    fontFamily: theme.fontFamily
                                  }}
                                >
                                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="hidden sm:inline">Meia </span>Pizza
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Pizzas Especiais Section */}
          {pizzasEspeciais.length > 0 && (
            <div className="mb-8 sm:mb-12">
              <div 
                className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 cursor-pointer group"
                onClick={() => toggleSection('especiais')}
              >
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                  <span className="text-2xl sm:text-3xl">⭐</span>
                  <h2 
                    className="text-xl sm:text-2xl font-bold"
                    style={{ 
                      color: theme.textColor,
                      fontFamily: theme.fontFamily
                    }}
                  >
                    Pizzas Especiais
                  </h2>
                </div>
                <button
                  className="p-1 sm:p-2 rounded-full hover:bg-gray-100 transition-colors"
                  style={{ fontFamily: theme.fontFamily }}
                >
                  {collapsedSections.especiais ? (
                    <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                  ) : (
                    <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                  )}
                </button>
              </div>
              
              {!collapsedSections.especiais && (
                <>
                  <div className="text-center mb-6 sm:mb-8">
                    <p 
                      className="text-gray-600 text-base sm:text-lg"
                      style={{ fontFamily: theme.fontFamily }}
                    >
                      Criações exclusivas da casa
                    </p>
                  </div>

                  <div className="space-y-2 sm:space-y-3 transition-all duration-300">
                    {pizzasEspeciais.map((pizza) => (
                      <div
                        key={pizza.id}
                        className="bg-white p-3 sm:p-6 shadow-sm border hover:shadow-md transition-all duration-200"
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
                          {/* Imagem da Pizza */}
                          <div className="flex-shrink-0 w-full sm:w-auto flex justify-center sm:justify-start">
                            <img
                              src={processImageUrl(pizza.image) || getDefaultImage('pizza')}
                              alt={pizza.name}
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
                                target.src = getDefaultImage('pizza');
                              }}
                            />
                          </div>

                          {/* Informações da Pizza */}
                          <div className="flex-1 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="flex-1">
                                <h3 
                                  className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-center sm:text-left"
                                  style={{ 
                                    color: theme.textColor,
                                    fontFamily: theme.fontFamily
                                  }}
                                >
                                  {pizza.name}
                                  {pizza.isPromotion && (
                                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                      PROMOÇÃO
                                    </span>
                                  )}
                                </h3>
                                <p 
                                  className="text-gray-600 mb-2 sm:mb-4 text-xs sm:text-sm leading-relaxed text-center sm:text-left"
                                  style={{ fontFamily: theme.fontFamily }}
                                >
                                  {getProductDescription(pizza)}
                                </p>
                                <div className="flex items-center justify-center sm:justify-start gap-4">
                                  {pizza.isPromotion && pizza.promotionPrice ? (
                                    <div className="flex items-center gap-2">
                                      <span 
                                        className="text-base sm:text-lg text-gray-500 line-through"
                                        style={{ fontFamily: theme.fontFamily }}
                                      >
                                        {formatCurrency(pizza.price)}
                                      </span>
                                      <span 
                                        className="text-xl sm:text-2xl font-bold text-red-600"
                                        style={{ fontFamily: theme.fontFamily }}
                                      >
                                        {formatCurrency(pizza.promotionPrice)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span 
                                      className="text-xl sm:text-2xl font-bold"
                                      style={{ 
                                        color: theme.primaryColor,
                                        fontFamily: theme.fontFamily
                                      }}
                                    >
                                      {formatCurrency(pizza.price)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Botões de Ação */}
                              <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                                <button
                                  onClick={() => handleAddPizza(pizza, false)}
                                  className="flex-1 sm:flex-none text-white px-3 py-2 text-sm font-medium transition-colors hover:opacity-90 flex items-center justify-center gap-1"
                                  style={{
                                    backgroundColor: theme.primaryColor,
                                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                                 theme.borderRadius === 'md' ? '0.375rem' :
                                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                                    fontFamily: theme.fontFamily
                                  }}
                                >
                                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="hidden sm:inline">Pizza </span>Inteira
                                </button>
                                <button
                                  onClick={() => handleAddPizza(pizza, true)}
                                  className="flex-1 sm:flex-none text-white px-3 py-2 text-sm font-medium transition-colors hover:opacity-90 flex items-center justify-center gap-1"
                                  style={{
                                    backgroundColor: theme.secondaryColor,
                                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                                 theme.borderRadius === 'md' ? '0.375rem' :
                                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                                    fontFamily: theme.fontFamily
                                  }}
                                >
                                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="hidden sm:inline">Meia </span>Pizza
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Pizzas Doces Section */}
          {pizzasDoces.length > 0 && (
            <div className="mb-8 sm:mb-12">
              <div 
                className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 cursor-pointer group"
                onClick={() => toggleSection('doces')}
              >
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                  <span className="text-2xl sm:text-3xl">🍰</span>
                  <h2 
                    className="text-xl sm:text-2xl font-bold"
                    style={{ 
                      color: theme.textColor,
                      fontFamily: theme.fontFamily
                    }}
                  >
                    Pizzas Doces
                  </h2>
                </div>
                <button
                  className="p-1 sm:p-2 rounded-full hover:bg-gray-100 transition-colors"
                  style={{ fontFamily: theme.fontFamily }}
                >
                  {collapsedSections.doces ? (
                    <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                  ) : (
                    <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                  )}
                </button>
              </div>
              
              {!collapsedSections.doces && (
                <>
                  <div className="text-center mb-6 sm:mb-8">
                    <p 
                      className="text-gray-600 text-base sm:text-lg"
                      style={{ fontFamily: theme.fontFamily }}
                    >
                      Sabores doces para finalizar
                    </p>
                  </div>

                  <div className="space-y-2 sm:space-y-3 transition-all duration-300">
                    {pizzasDoces.map((pizza) => (
                      <div
                        key={pizza.id}
                        className="bg-white p-3 sm:p-6 shadow-sm border hover:shadow-md transition-all duration-200"
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
                          {/* Imagem da Pizza */}
                          <div className="flex-shrink-0 w-full sm:w-auto flex justify-center sm:justify-start">
                            <img
                              src={processImageUrl(pizza.image) || getDefaultImage('pizza')}
                              alt={pizza.name}
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
                                target.src = getDefaultImage('pizza');
                              }}
                            />
                          </div>

                          {/* Informações da Pizza */}
                          <div className="flex-1 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="flex-1">
                                <h3 
                                  className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-center sm:text-left"
                                  style={{ 
                                    color: theme.textColor,
                                    fontFamily: theme.fontFamily
                                  }}
                                >
                                  {pizza.name}
                                  {pizza.isPromotion && (
                                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                      PROMOÇÃO
                                    </span>
                                  )}
                                </h3>
                                <p 
                                  className="text-gray-600 mb-2 sm:mb-4 text-xs sm:text-sm leading-relaxed text-center sm:text-left"
                                  style={{ fontFamily: theme.fontFamily }}
                                >
                                  {getProductDescription(pizza)}
                                </p>
                                <div className="flex items-center justify-center sm:justify-start gap-4">
                                  {pizza.isPromotion && pizza.promotionPrice ? (
                                    <div className="flex items-center gap-2">
                                      <span 
                                        className="text-base sm:text-lg text-gray-500 line-through"
                                        style={{ fontFamily: theme.fontFamily }}
                                      >
                                        {formatCurrency(pizza.price)}
                                      </span>
                                      <span 
                                        className="text-xl sm:text-2xl font-bold text-red-600"
                                        style={{ fontFamily: theme.fontFamily }}
                                      >
                                        {formatCurrency(pizza.promotionPrice)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span 
                                      className="text-xl sm:text-2xl font-bold"
                                      style={{ 
                                        color: theme.primaryColor,
                                        fontFamily: theme.fontFamily
                                      }}
                                    >
                                      {formatCurrency(pizza.price)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Botões de Ação */}
                              <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                                <button
                                  onClick={() => handleAddPizza(pizza, false)}
                                  className="flex-1 sm:flex-none text-white px-3 py-2 text-sm font-medium transition-colors hover:opacity-90 flex items-center justify-center gap-1"
                                  style={{
                                    backgroundColor: theme.primaryColor,
                                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                                 theme.borderRadius === 'md' ? '0.375rem' :
                                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                                    fontFamily: theme.fontFamily
                                  }}
                                >
                                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="hidden sm:inline">Pizza </span>Inteira
                                </button>
                                <button
                                  onClick={() => handleAddPizza(pizza, true)}
                                  className="flex-1 sm:flex-none text-white px-3 py-2 text-sm font-medium transition-colors hover:opacity-90 flex items-center justify-center gap-1"
                                  style={{
                                    backgroundColor: theme.secondaryColor,
                                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                                 theme.borderRadius === 'md' ? '0.375rem' :
                                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                                    fontFamily: theme.fontFamily
                                  }}
                                >
                                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="hidden sm:inline">Meia </span>Pizza
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Lanches Section */}
          {lanches.length > 0 && (
            <div className="mb-8 sm:mb-12">
              <div 
                className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 cursor-pointer group"
                onClick={() => toggleSection('lanches')}
              >
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                  <span className="text-2xl sm:text-3xl">🥪</span>
                  <h2 
                    className="text-xl sm:text-2xl font-bold"
                    style={{ 
                      color: theme.textColor,
                      fontFamily: theme.fontFamily
                    }}
                  >
                    Lanches
                  </h2>
                </div>
                <button
                  className="p-1 sm:p-2 rounded-full hover:bg-gray-100 transition-colors"
                  style={{ fontFamily: theme.fontFamily }}
                >
                  {collapsedSections.lanches ? (
                    <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                  ) : (
                    <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                  )}
                </button>
              </div>
              
              {!collapsedSections.lanches && (
                <>
                  <div className="text-center mb-6 sm:mb-8">
                    <p 
                      className="text-gray-600 text-base sm:text-lg"
                      style={{ fontFamily: theme.fontFamily }}
                    >
                      Deliciosos lanches para qualquer hora
                    </p>
                  </div>

                  <div className="space-y-2 sm:space-y-3 transition-all duration-300">
                    {lanches.map((lanche) => (
                      <div
                        key={lanche.id}
                        className="bg-white p-3 sm:p-6 shadow-sm border hover:shadow-md transition-all duration-200"
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
                          {/* Imagem do Lanche */}
                          <div className="flex-shrink-0 w-full sm:w-auto flex justify-center sm:justify-start">
                            <img
                              src={processImageUrl(lanche.image) || getDefaultImage('pizza')}
                              alt={lanche.name}
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
                                target.src = getDefaultImage('pizza');
                              }}
                            />
                          </div>

                          {/* Informações do Lanche */}
                          <div className="flex-1 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="flex-1">
                                <h3 
                                  className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-center sm:text-left"
                                  style={{ 
                                    color: theme.textColor,
                                    fontFamily: theme.fontFamily
                                  }}
                                >
                                  {lanche.name}
                                  {lanche.isPromotion && (
                                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                      PROMOÇÃO
                                    </span>
                                  )}
                                </h3>
                                <p 
                                  className="text-gray-600 mb-2 sm:mb-4 text-xs sm:text-sm leading-relaxed text-center sm:text-left"
                                  style={{ fontFamily: theme.fontFamily }}
                                >
                                  {getProductDescription(lanche)}
                                </p>
                                <div className="flex items-center justify-center sm:justify-start gap-4">
                                  {lanche.isPromotion && lanche.promotionPrice ? (
                                    <div className="flex items-center gap-2">
                                      <span 
                                        className="text-base sm:text-lg text-gray-500 line-through"
                                        style={{ fontFamily: theme.fontFamily }}
                                      >
                                        {formatCurrency(lanche.price)}
                                      </span>
                                      <span 
                                        className="text-xl sm:text-2xl font-bold text-red-600"
                                        style={{ fontFamily: theme.fontFamily }}
                                      >
                                        {formatCurrency(lanche.promotionPrice)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span 
                                      className="text-xl sm:text-2xl font-bold"
                                      style={{ 
                                        color: theme.primaryColor,
                                        fontFamily: theme.fontFamily
                                      }}
                                    >
                                      {formatCurrency(lanche.price)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Botão de Ação */}
                              <div className="flex flex-row gap-2 w-full sm:w-auto">
                                <button
                                  onClick={() => handleAddItem(lanche, 'lanche')}
                                  className="flex-1 sm:flex-none text-white px-4 py-2 text-sm font-medium transition-colors hover:opacity-90 flex items-center justify-center gap-2"
                                  style={{
                                    backgroundColor: theme.primaryColor,
                                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                                 theme.borderRadius === 'md' ? '0.375rem' :
                                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                                    fontFamily: theme.fontFamily
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                  Adicionar
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Refeições Section */}
          {refeicoes.length > 0 && (
            <div className="mb-8 sm:mb-12">
              <div 
                className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 cursor-pointer group"
                onClick={() => toggleSection('refeicoes')}
              >
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                  <span className="text-2xl sm:text-3xl">🍽️</span>
                  <h2 
                    className="text-xl sm:text-2xl font-bold"
                    style={{ 
                      color: theme.textColor,
                      fontFamily: theme.fontFamily
                    }}
                  >
                    Refeições
                  </h2>
                </div>
                <button
                  className="p-1 sm:p-2 rounded-full hover:bg-gray-100 transition-colors"
                  style={{ fontFamily: theme.fontFamily }}
                >
                  {collapsedSections.refeicoes ? (
                    <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                  ) : (
                    <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                  )}
                </button>
              </div>
              
              {!collapsedSections.refeicoes && (
                <>
                  <div className="text-center mb-6 sm:mb-8">
                    <p 
                      className="text-gray-600 text-base sm:text-lg"
                      style={{ fontFamily: theme.fontFamily }}
                    >
                      Pratos completos e saborosos
                    </p>
                  </div>

                  <div className="space-y-2 sm:space-y-3 transition-all duration-300">
                    {refeicoes.map((refeicao) => (
                      <div
                        key={refeicao.id}
                        className="bg-white p-3 sm:p-6 shadow-sm border hover:shadow-md transition-all duration-200"
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
                          {/* Imagem da Refeição */}
                          <div className="flex-shrink-0 w-full sm:w-auto flex justify-center sm:justify-start">
                            <img
                              src={processImageUrl(refeicao.image) || getDefaultImage('pizza')}
                              alt={refeicao.name}
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
                                target.src = getDefaultImage('pizza');
                              }}
                            />
                          </div>

                          {/* Informações da Refeição */}
                          <div className="flex-1 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="flex-1">
                                <h3 
                                  className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-center sm:text-left"
                                  style={{ 
                                    color: theme.textColor,
                                    fontFamily: theme.fontFamily
                                  }}
                                >
                                  {refeicao.name}
                                  {refeicao.isPromotion && (
                                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                      PROMOÇÃO
                                    </span>
                                  )}
                                </h3>
                                <p 
                                  className="text-gray-600 mb-2 sm:mb-4 text-xs sm:text-sm leading-relaxed text-center sm:text-left"
                                  style={{ fontFamily: theme.fontFamily }}
                                >
                                  {getProductDescription(refeicao)}
                                </p>
                                <div className="flex items-center justify-center sm:justify-start gap-4">
                                  {refeicao.isPromotion && refeicao.promotionPrice ? (
                                    <div className="flex items-center gap-2">
                                      <span 
                                        className="text-base sm:text-lg text-gray-500 line-through"
                                        style={{ fontFamily: theme.fontFamily }}
                                      >
                                        {formatCurrency(refeicao.price)}
                                      </span>
                                      <span 
                                        className="text-xl sm:text-2xl font-bold text-red-600"
                                        style={{ fontFamily: theme.fontFamily }}
                                      >
                                        {formatCurrency(refeicao.promotionPrice)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span 
                                      className="text-xl sm:text-2xl font-bold"
                                      style={{ 
                                        color: theme.primaryColor,
                                        fontFamily: theme.fontFamily
                                      }}
                                    >
                                      {formatCurrency(refeicao.price)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Botão de Ação */}
                              <div className="flex flex-row gap-2 w-full sm:w-auto">
                                <button
                                  onClick={() => handleAddItem(refeicao, 'refeicao')}
                                  className="flex-1 sm:flex-none text-white px-4 py-2 text-sm font-medium transition-colors hover:opacity-90 flex items-center justify-center gap-2"
                                  style={{
                                    backgroundColor: theme.primaryColor,
                                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                                 theme.borderRadius === 'md' ? '0.375rem' :
                                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                                    fontFamily: theme.fontFamily
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                  Adicionar
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Bebidas Section */}
          {beverages.length > 0 && (
            <div className="mb-8 sm:mb-12">
              <div 
                className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 cursor-pointer group"
                onClick={() => toggleSection('bebidas')}
              >
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                  <span className="text-2xl sm:text-3xl">🥤</span>
                  <h2 
                    className="text-xl sm:text-2xl font-bold"
                    style={{ 
                      color: theme.textColor,
                      fontFamily: theme.fontFamily
                    }}
                  >
                    Bebidas
                  </h2>
                </div>
                <button
                  className="p-1 sm:p-2 rounded-full hover:bg-gray-100 transition-colors"
                  style={{ fontFamily: theme.fontFamily }}
                >
                  {collapsedSections.bebidas ? (
                    <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                  ) : (
                    <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                  )}
                </button>
              </div>
              
              {!collapsedSections.bebidas && (
                <>
                  <div className="text-center mb-6 sm:mb-8">
                    <p 
                      className="text-gray-600 text-base sm:text-lg"
                      style={{ fontFamily: theme.fontFamily }}
                    >
                      Bebidas geladas para acompanhar
                    </p>
                  </div>

                  <div className="space-y-2 sm:space-y-3 transition-all duration-300">
                    {beverages.map((beverage) => (
                      <div
                        key={beverage.id}
                        className="bg-white p-3 sm:p-6 shadow-sm border hover:shadow-md transition-all duration-200"
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
                          {/* Imagem da Bebida */}
                          <div className="flex-shrink-0 w-full sm:w-auto flex justify-center sm:justify-start">
                            <img
                              src={processImageUrl(beverage.image) || getDefaultImage('beverage')}
                              alt={beverage.name}
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
                                target.src = getDefaultImage('beverage');
                              }}
                            />
                          </div>

                          {/* Informações da Bebida */}
                          <div className="flex-1 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="flex-1">
                                <h3 
                                  className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-center sm:text-left"
                                  style={{ 
                                    color: theme.textColor,
                                    fontFamily: theme.fontFamily
                                  }}
                                >
                                  {beverage.name}
                                </h3>
                                <p 
                                  className="text-gray-600 mb-2 sm:mb-4 text-xs sm:text-sm leading-relaxed text-center sm:text-left"
                                  style={{ fontFamily: theme.fontFamily }}
                                >
                                  {beverage.description || 'Bebida refrescante'}
                                </p>
                              </div>

                              {/* Tamanhos e Preços */}
                              <div className="flex flex-col gap-2 w-full sm:w-auto">
                                {beverage.sizes.map((size, index) => (
                                  <button
                                    key={index}
                                    onClick={() => handleBeverageClick(beverage, size)}
                                    className="text-white px-3 py-2 text-sm font-medium transition-colors hover:opacity-90 flex items-center justify-between gap-2"
                                    style={{
                                      backgroundColor: theme.primaryColor,
                                      borderRadius: theme.borderRadius === 'none' ? '0' :
                                                   theme.borderRadius === 'sm' ? '0.125rem' :
                                                   theme.borderRadius === 'md' ? '0.375rem' :
                                                   theme.borderRadius === 'lg' ? '0.5rem' :
                                                   theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                                      fontFamily: theme.fontFamily
                                    }}
                                  >
                                    <span>{size.size}</span>
                                    <span>{formatCurrency(size.price)}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
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
                        <span>Taxa de Entrega ({deliveryFee}%):</span>
                        <span>+ {formatCurrency(getSubtotal() * (deliveryFee / 100))}</span>
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
                      <span>{formatCurrency(deliveryFee)}</span>
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
      </main>

      <Footer />
    </div>
  );
};

export default CustomerOrderPage;
