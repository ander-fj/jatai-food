import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Users, Phone, Star, Gift, Zap, Copy, ExternalLink, Trash2, Edit3, X, UserPlus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useOrders } from '../features/orders/hooks/useOrders';
import { getDatabase, ref, onValue, set, push } from 'firebase/database';
import { getTenantRef } from '../config/firebase';

interface Customer {
  id: string;
  name: string;
  phone: string;
  lastOrder?: string;
  totalOrders: number;
  totalSpent: number;
}

interface PromotionTemplate {
  id: string;
  name: string;
  message: string;
  isActive: boolean;
  createdAt: string;
}

interface Coupon {
  id: string;
  code: string;
  discount: number;
  type: 'percentage' | 'fixed'; // ← NOVO: Tipo de desconto
  minValue?: number; // ← NOVO: Valor mínimo para usar o cupom
  expiry?: string;
  isActive: boolean;
  createdAt: string;
  usageCount?: number;
}

const WhatsAppPromotionSection: React.FC = () => {
  const { theme } = useTheme();
  const { orders } = useOrders();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [promotionMessage, setPromotionMessage] = useState('');
  
  // ====== [CUPONS: estados e funções] ======
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponDiscount, setCouponDiscount] = useState<number | ''>('');
  const [couponType, setCouponType] = useState<'percentage' | 'fixed'>('percentage'); // ← NOVO
  const [couponMinValue, setCouponMinValue] = useState<number | ''>(''); // ← NOVO
  const [couponExpiry, setCouponExpiry] = useState<string>('');
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);

  // Carregar cupons do Firebase
  useEffect(() => {
    try {
      const couponsRef = getTenantRef('coupons');
      const unsubscribe = onValue(couponsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const couponsList = Object.entries(data).map(([id, coupon]: any) => ({
            id,
            ...coupon,
          }));
          setCoupons(couponsList);
        } else {
          setCoupons([]);
        }
      });
      return () => unsubscribe();
    } catch (error) {
      console.error('❌ Erro ao carregar cupons:', error);
      setCoupons([]);
    }
  }, []);

  const saveCouponToFirebase = async (couponData: Omit<Coupon, 'id'>) => {
    try {
      const couponsRef = getTenantRef('coupons');
      const newCouponRef = push(couponsRef);
      await set(newCouponRef, couponData);
      console.log('✅ Cupom salvo no Firebase');
      return newCouponRef.key;
    } catch (error) {
      console.error('❌ Erro ao salvar cupom no Firebase:', error);
      throw error;
    }
  };

  const updateCouponInFirebase = async (couponId: string, couponData: Partial<Coupon>) => {
    try {
      const couponRef = getTenantRef(`coupons/${couponId}`);
      await set(couponRef, { ...couponData, updatedAt: new Date().toISOString() });
      console.log('✅ Cupom atualizado no Firebase');
    } catch (error) {
      console.error('❌ Erro ao atualizar cupom no Firebase:', error);
      throw error;
    }
  };

  const deleteCouponFromFirebase = async (couponId: string) => {
    try {
      const couponRef = getTenantRef(`coupons/${couponId}`);
      await set(couponRef, null);
      console.log('✅ Cupom removido do Firebase');
    } catch (error) {
      console.error('❌ Erro ao remover cupom do Firebase:', error);
      throw error;
    }
  };

  const addCoupon = async () => {
    const discount = typeof couponDiscount === 'string' ? parseFloat(couponDiscount) : couponDiscount;
    const minValue = typeof couponMinValue === 'string' ? parseFloat(couponMinValue) : couponMinValue;
    
    if (!couponCode.trim() || !discount || discount <= 0) {
      alert('Por favor, preencha o código e o desconto válido');
      return;
    }

    // Validação específica por tipo
    if (couponType === 'percentage' && discount > 100) {
      alert('O desconto percentual não pode ser maior que 100%');
      return;
    }

    if (couponType === 'fixed' && discount < 0.01) {
      alert('O valor fixo deve ser maior que R$ 0,01');
      return;
    }

    // Verificar se o código já existe
    const existingCoupon = coupons.find(c => c.code.toLowerCase() === couponCode.trim().toLowerCase());
    if (existingCoupon) {
      alert('Este código de cupom já existe! Use um código diferente.');
      return;
    }

    try {
      const couponData: Omit<Coupon, 'id'> = {
        code: couponCode.trim().toUpperCase(),
        discount,
        type: couponType, // ← NOVO
        minValue: minValue || undefined, // ← NOVO
        expiry: couponExpiry || undefined,
        isActive: true,
        createdAt: new Date().toISOString(),
        usageCount: 0
      };

      await saveCouponToFirebase(couponData);
      
      // Limpar formulário
      setCouponCode('');
      setCouponDiscount('');
      setCouponType('percentage');
      setCouponMinValue('');
      setCouponExpiry('');
      setEditingCouponId(null);
      
      alert('✅ Cupom criado com sucesso!');
    } catch (error) {
      alert('Erro ao criar cupom. Tente novamente.');
    }
  };

  const editCoupon = (coupon: Coupon) => {
    setCouponCode(coupon.code);
    setCouponDiscount(coupon.discount);
    setCouponType(coupon.type || 'percentage'); // ← NOVO
    setCouponMinValue(coupon.minValue || ''); // ← NOVO
    setCouponExpiry(coupon.expiry || '');
    setEditingCouponId(coupon.id);
  };

  const deleteCoupon = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este cupom?')) return;

    try {
      await deleteCouponFromFirebase(id);
      
      // Limpar formulário se estava editando este cupom
      if (editingCouponId === id) {
        setCouponCode('');
        setCouponDiscount('');
        setCouponType('percentage');
        setCouponMinValue('');
        setCouponExpiry('');
        setEditingCouponId(null);
      }
      
      alert('✅ Cupom excluído com sucesso!');
    } catch (error) {
      alert('Erro ao excluir cupom. Tente novamente.');
    }
  };

  const handleCouponSubmit = async (e?: any) => {
    if (e) e.preventDefault();
    
    const discount = typeof couponDiscount === 'string' ? parseFloat(couponDiscount) : couponDiscount;
    const minValue = typeof couponMinValue === 'string' ? parseFloat(couponMinValue) : couponMinValue;
    
    if (!couponCode.trim() || !discount || discount <= 0) {
      alert('Por favor, preencha o código e o desconto válido');
      return;
    }

    // Validação específica por tipo
    if (couponType === 'percentage' && discount > 100) {
      alert('O desconto percentual não pode ser maior que 100%');
      return;
    }

    if (couponType === 'fixed' && discount < 0.01) {
      alert('O valor fixo deve ser maior que R$ 0,01');
      return;
    }

    // Verificar se o código já existe (exceto se estiver editando o mesmo cupom)
    const existingCoupon = coupons.find(c => 
      c.code.toLowerCase() === couponCode.trim().toLowerCase() && c.id !== editingCouponId
    );
    if (existingCoupon) {
      alert('Este código de cupom já existe! Use um código diferente.');
      return;
    }

    try {
      if (editingCouponId) {
        // Atualizar cupom existente
        const existingCouponData = coupons.find(c => c.id === editingCouponId);
        if (existingCouponData) {
          const updatedData: Partial<Coupon> = {
            ...existingCouponData,
            code: couponCode.trim().toUpperCase(),
            discount,
            type: couponType, // ← NOVO
            minValue: minValue || undefined, // ← NOVO
            expiry: couponExpiry || undefined,
          };
          
          await updateCouponInFirebase(editingCouponId, updatedData);
          alert('✅ Cupom atualizado com sucesso!');
        }
      } else {
        // Criar novo cupom
        await addCoupon();
        return; // addCoupon já limpa o formulário
      }
      
      // Limpar formulário após edição
      setCouponCode('');
      setCouponDiscount('');
      setCouponType('percentage');
      setCouponMinValue('');
      setCouponExpiry('');
      setEditingCouponId(null);
      
    } catch (error) {
      alert('Erro ao salvar cupom. Tente novamente.');
    }
  };

  const cancelCouponEdit = () => {
    setCouponCode('');
    setCouponDiscount('');
    setCouponType('percentage');
    setCouponMinValue('');
    setCouponExpiry('');
    setEditingCouponId(null);
  };

  // Função para formatar o desconto para exibição
  const formatDiscount = (coupon: Coupon) => {
    if (coupon.type === 'percentage') {
      return `${coupon.discount}%`;
    } else {
      return `R$ ${coupon.discount.toFixed(2)}`;
    }
  };

  // Função para formatar valor mínimo
  const formatMinValue = (minValue?: number) => {
    if (!minValue) return 'Sem mínimo';
    return `Mín. R$ ${minValue.toFixed(2)}`;
  };
  // ====== [FIM CUPONS] ======

  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [promotionTemplates, setPromotionTemplates] = useState<PromotionTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromotionTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({ name: '', message: '' });
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [autoSendEnabled, setAutoSendEnabled] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });
  const [useWhatsAppWeb, setUseWhatsAppWeb] = useState(false);
  const [bulkSendingInProgress, setBulkSendingInProgress] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  // Templates de promoção pré-definidos
  const defaultTemplates = [
    {
      id: '1',
      name: 'Promoção Pizza',
      message: '🍕 OFERTA ESPECIAL! 🍕\n\nOlá {nome}! Que tal uma pizza deliciosa hoje?\n\n🔥 2 Pizzas Grandes por apenas R$ 79,90\n🚚 Entrega GRÁTIS na sua região\n⏰ Válido até hoje às 23h\n\nPeça já: https://seu-link-aqui.com\n\nPizzaria Delícia - Sabor que conquista!❤️',
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Desconto Cliente VIP',
      message: '⭐ CLIENTE VIP ⭐\n\nOi {nome}! Você é especial para nós!\n\n🎁 20% de desconto em qualquer pedido\n🍕 Válido para pizzas, bebidas e sobremesas\n📱 Use o código: VIP20\n\nSeu desconto expira em 24h!\n\nPeça agora: https://seu-link-aqui.com\n\nObrigado pela preferência! 🙏',
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '3',
      name: 'Combo Família',
      message: '👨‍👩‍👧‍👦 COMBO FAMÍLIA 👨‍👩‍👧‍👦\n\nE aí {nome}! Hora de reunir a família!\n\n🍕 2 Pizzas Grandes + 2 Refrigerantes 2L\n💰 Por apenas R$ 89,90 (economize R$ 30!)\n🏠 Entrega grátis para sua casa\n\nPerfeito para o jantar em família!\n\nPeça já: https://seu-link-aqui.com\n\nPizzaria Delícia - Unidos pelo sabor! ❤️',
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ];

  // Extrair clientes únicos dos pedidos
  useEffect(() => {
    // Primeiro carregar clientes manuais do Firebase
    try {
      const customersRef = getTenantRef('customers');
      const unsubscribe = onValue(customersRef, (snapshot) => {
        // Envio automático via WhatsApp Desktop (aplicativo instalado)
        const manualCustomers: Customer[] = [];
        const data = snapshot.val();
        
        if (data) {
          Object.entries(data).forEach(([id, customer]: any) => {
            manualCustomers.push({
              id: customer.phone,
              name: customer.name,
              phone: customer.phone,
              // Usar protocolo whatsapp:// para abrir o aplicativo desktop
              totalOrders: customer.totalOrders || 0,
              totalSpent: customer.totalSpent || 0
            });
          });
        }
        
        // Combinar com clientes dos pedidos
        combineCustomers(manualCustomers);
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error('❌ Erro ao carregar clientes manuais:', error);
      combineCustomers([]);
    }
  }, [orders]);

  const combineCustomers = (manualCustomers: Customer[]) => {
    const customerMap = new Map<string, Customer>();
    
    // Adicionar clientes manuais primeiro
    manualCustomers.forEach(customer => {
      customerMap.set(customer.id, customer);
    });
    
    // Adicionar/atualizar com clientes dos pedidos
    orders.forEach(order => {
      const phone = order.phone?.replace(/\D/g, ''); // Remove caracteres não numéricos
      if (!phone || phone.length < 10) return;
      
      const customerId = phone;
      const existing = customerMap.get(customerId);
      
      if (existing) {
        // Atualizar dados do cliente existente com dados dos pedidos
        existing.totalOrders += 1;
        existing.totalSpent += order.total || 0;
        existing.lastOrder = order.createdAt || order.orderTime;
      } else {
        // Criar novo cliente baseado no pedido
        customerMap.set(customerId, {
          id: customerId,
          name: order.customerName,
          phone: phone,
          lastOrder: order.createdAt || order.orderTime,
          totalOrders: 1,
          totalSpent: order.total || 0
        });
      }
    });
    
    const customerList = Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent); // Ordenar por valor gasto
    
    setCustomers(customerList);
    console.log('📱 Clientes extraídos dos pedidos:', customerList.length);
  };

  // Carregar templates do Firebase
  useEffect(() => {
    try {
      const templatesRef = getTenantRef('promotion-templates');
      const unsubscribe = onValue(templatesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const templatesList = Object.entries(data).map(([id, template]: any) => ({
            id,
            ...template,
          }));
          setPromotionTemplates(templatesList);
        } else {
          // Salvar templates padrão se não existirem
          saveDefaultTemplates();
        }
      });
      return () => unsubscribe();
    } catch (error) {
      console.error('❌ Erro ao carregar templates:', error);
      setPromotionTemplates(defaultTemplates);
    }
  }, []);

  // Carregar configurações do WhatsApp
  useEffect(() => {
    try {
      const whatsappConfigRef = getTenantRef('config/whatsapp');
      const unsubscribe = onValue(whatsappConfigRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setWhatsappNumber(data.number || '');
          setAutoSendEnabled(data.autoSendEnabled || false);
        }
      });
      return () => unsubscribe();
    } catch (error) {
      console.error('❌ Erro ao carregar configurações do WhatsApp:', error);
    }
  }, []);

  // Salvar configurações do WhatsApp
  const saveWhatsAppConfig = async () => {
    try {
      const whatsappConfigRef = getTenantRef('config/whatsapp');
      await set(whatsappConfigRef, {
        number: whatsappNumber,
        autoSendEnabled,
        updatedAt: new Date().toISOString()
      });
      console.log('✅ Configurações do WhatsApp salvas');
    } catch (error) {
      console.error('❌ Erro ao salvar configurações do WhatsApp:', error);
    }
  };

  // Salvar automaticamente quando mudar
  useEffect(() => {
    if (whatsappNumber || autoSendEnabled) {
      const timer = setTimeout(saveWhatsAppConfig, 1000);
      return () => clearTimeout(timer);
    }
  }, [whatsappNumber, autoSendEnabled]);

  const saveDefaultTemplates = async () => {
    try {
      const templatesRef = getTenantRef('promotion-templates');
      const templatesObject: { [key: string]: Omit<PromotionTemplate, 'id'> } = {};
      defaultTemplates.forEach(template => {
        templatesObject[template.id] = {
          name: template.name,
          message: template.message,
          isActive: template.isActive,
          createdAt: template.createdAt
        };
      });
      await set(templatesRef, templatesObject);
      console.log('✅ Templates padrão salvos no Firebase');
    } catch (error) {
      console.error('❌ Erro ao salvar templates padrão:', error);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  const handleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  const handleCustomerToggle = (customerId: string) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  // Função para envio automático sequencial
  const sendPromotionAutomatically = async () => {
    if (!whatsappNumber || selectedCustomers.length === 0 || !promotionMessage.trim()) {
      alert('Configure o número do WhatsApp, selecione clientes e escreva uma mensagem');
      return;
    }

    setIsSending(true);
    setSendProgress({ current: 0, total: selectedCustomers.length });

    try {
      for (let i = 0; i < selectedCustomers.length; i++) {
        const customerId = selectedCustomers[i];
        const customer = customers.find(c => c.id === customerId);
        if (!customer) continue;
        
        setSendProgress({ current: i + 1, total: selectedCustomers.length });

        // Personalizar mensagem
        const personalizedMessage = promotionMessage.replace(/{nome}/g, customer.name);
        
        // Usar protocolo whatsapp:// para abrir o aplicativo desktop
        const whatsappDesktopUrl = `whatsapp://send?phone=55${customer.phone.replace(/\D/g, '')}&text=${encodeURIComponent(personalizedMessage)}`;
        
        // Tentar abrir WhatsApp Desktop primeiro
        try {
          window.location.href = whatsappDesktopUrl;
        } catch (error) {
          console.log('WhatsApp Desktop não disponível, tentando WhatsApp Web');
          // Fallback para WhatsApp Web
          const whatsappWebUrl = `https://web.whatsapp.com/send?phone=55${customer.phone.replace(/\D/g, '')}&text=${encodeURIComponent(personalizedMessage)}`;
          window.open(whatsappWebUrl, '_blank');
        }

        // Aguardar 3 segundos entre envios para evitar spam
        if (i < selectedCustomers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      setSentCount(prev => prev + selectedCustomers.length);
      alert(`✅ Processo concluído! ${selectedCustomers.length} mensagens foram preparadas para envio.`);
      
    } catch (error) {
      console.error('❌ Erro no envio automático:', error);
      alert('Erro durante o envio automático. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSending(false);
      setSendProgress({ current: 0, total: 0 });
    }
  };

  // Função para envio manual (um por vez)
  const sendToCustomer = (customer: Customer) => {
    if (!promotionMessage.trim()) {
      alert('Escreva uma mensagem primeiro');
      return;
    }

    const personalizedMessage = promotionMessage.replace(/{nome}/g, customer.name);
    
    if (useWhatsAppWeb) {
      // WhatsApp Web
      const whatsappWebUrl = `https://web.whatsapp.com/send?phone=55${customer.phone.replace(/\D/g, '')}&text=${encodeURIComponent(personalizedMessage)}`;
      window.open(whatsappWebUrl, '_blank');
    } else {
      // WhatsApp Desktop
      const whatsappDesktopUrl = `whatsapp://send?phone=55${customer.phone.replace(/\D/g, '')}&text=${encodeURIComponent(personalizedMessage)}`;
      window.location.href = whatsappDesktopUrl;
    }

    setSentCount(prev => prev + 1);
  };

  // Função para usar template
  const useTemplate = (template: PromotionTemplate) => {
    setPromotionMessage(template.message);
  };

  // Função para salvar template
  const handleSaveTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.message.trim()) {
      alert('Preencha o nome e a mensagem do template');
      return;
    }

    try {
      const templatesRef = getTenantRef('promotion-templates');
      
      if (editingTemplate) {
        // Atualizar template existente
        const templateRef = getTenantRef(`promotion-templates/${editingTemplate.id}`);
        await set(templateRef, {
          name: newTemplate.name,
          message: newTemplate.message,
          isActive: true,
          createdAt: editingTemplate.createdAt,
          updatedAt: new Date().toISOString()
        });
        alert('✅ Template atualizado com sucesso!');
      } else {
        // Criar novo template
        const newTemplateRef = push(templatesRef);
        await set(newTemplateRef, {
          name: newTemplate.name,
          message: newTemplate.message,
          isActive: true,
          createdAt: new Date().toISOString()
        });
        alert('✅ Template salvo com sucesso!');
      }

      setNewTemplate({ name: '', message: '' });
      setEditingTemplate(null);
      setShowTemplateModal(false);
    } catch (error) {
      console.error('❌ Erro ao salvar template:', error);
      alert('Erro ao salvar template. Tente novamente.');
    }
  };

  // Função para editar template
  const editTemplate = (template: PromotionTemplate) => {
    setEditingTemplate(template);
    setNewTemplate({ name: template.name, message: template.message });
    setShowTemplateModal(true);
  };

  // Função para excluir template
  const deleteTemplate = async (templateId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este template?')) return;

    try {
      const templateRef = getTenantRef(`promotion-templates/${templateId}`);
      await set(templateRef, null);
      alert('✅ Template excluído com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao excluir template:', error);
      alert('Erro ao excluir template. Tente novamente.');
    }
  };

  // Função para adicionar cliente manual
  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim() || !newCustomer.phone.trim()) {
      alert('Preencha o nome e telefone do cliente');
      return;
    }

    // Validar telefone (apenas números)
    const cleanPhone = newCustomer.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      alert('Telefone deve ter 10 ou 11 dígitos');
      return;
    }

    try {
      const customersRef = getTenantRef('customers');
      const newCustomerRef = push(customersRef);
      await set(newCustomerRef, {
        name: newCustomer.name.trim(),
        phone: cleanPhone,
        totalOrders: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString()
      });

      setNewCustomer({ name: '', phone: '' });
      setShowAddCustomerModal(false);
      alert('✅ Cliente adicionado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao adicionar cliente:', error);
      alert('Erro ao adicionar cliente. Tente novamente.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Configurações do WhatsApp */}
      <div 
        className="bg-white p-6 shadow-lg border"
        style={{
          borderRadius: theme.borderRadius === 'none' ? '0' :
                       theme.borderRadius === 'sm' ? '0.125rem' :
                       theme.borderRadius === 'md' ? '0.375rem' :
                       theme.borderRadius === 'lg' ? '0.5rem' :
                       theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
          fontFamily: theme.fontFamily
        }}
      >
        <h3 
          className="text-xl font-bold mb-4 flex items-center gap-2"
          style={{ 
            color: theme.textColor,
            fontFamily: theme.fontFamily
          }}
        >
          <MessageSquare className="h-5 w-5" />
          Configurações do WhatsApp
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label 
              className="block text-sm font-medium text-gray-700 mb-2"
              style={{ fontFamily: theme.fontFamily }}
            >
              Número do WhatsApp Business
            </label>
            <input
              type="text"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="11999999999"
              className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{
                borderRadius: theme.borderRadius === 'none' ? '0' :
                             theme.borderRadius === 'sm' ? '0.125rem' :
                             theme.borderRadius === 'md' ? '0.375rem' :
                             theme.borderRadius === 'lg' ? '0.5rem' :
                             theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                fontFamily: theme.fontFamily
              }}
            />
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useWhatsAppWeb}
                onChange={(e) => setUseWhatsAppWeb(e.target.checked)}
                className="rounded"
              />
              <span 
                className="text-sm"
                style={{ fontFamily: theme.fontFamily }}
              >
                Usar WhatsApp Web
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Layout em Grid: Clientes VIP e Cupons lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Seção Clientes VIP */}
        <div 
          className="bg-white p-6 shadow-lg border"
          style={{
            borderRadius: theme.borderRadius === 'none' ? '0' :
                         theme.borderRadius === 'sm' ? '0.125rem' :
                         theme.borderRadius === 'md' ? '0.375rem' :
                         theme.borderRadius === 'lg' ? '0.5rem' :
                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
            fontFamily: theme.fontFamily
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 
              className="text-xl font-bold flex items-center gap-2"
              style={{ 
                color: theme.textColor,
                fontFamily: theme.fontFamily
              }}
            >
              <Users className="h-5 w-5" />
              Clientes VIP ({customers.length})
            </h3>
            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-white text-sm font-medium transition-colors hover:opacity-90"
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
              <UserPlus className="h-4 w-4" />
              Adicionar
            </button>
          </div>

          {/* Busca de clientes */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar cliente por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{
                borderRadius: theme.borderRadius === 'none' ? '0' :
                             theme.borderRadius === 'sm' ? '0.125rem' :
                             theme.borderRadius === 'md' ? '0.375rem' :
                             theme.borderRadius === 'lg' ? '0.5rem' :
                             theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                fontFamily: theme.fontFamily
              }}
            />
          </div>

          {/* Seleção em massa */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              style={{ fontFamily: theme.fontFamily }}
            >
              {selectedCustomers.length === filteredCustomers.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </button>
            <span 
              className="text-sm text-gray-600"
              style={{ fontFamily: theme.fontFamily }}
            >
              {selectedCustomers.length} selecionados
            </span>
          </div>

          {/* Lista de clientes */}
          <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p 
                  className="text-sm"
                  style={{ fontFamily: theme.fontFamily }}
                >
                  {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
                </p>
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <div 
                  key={customer.id} 
                  className={`flex items-center justify-between p-3 border transition-colors cursor-pointer ${
                    selectedCustomers.includes(customer.id) 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily
                  }}
                  onClick={() => handleCustomerToggle(customer.id)}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.includes(customer.id)}
                      onChange={() => handleCustomerToggle(customer.id)}
                      className="rounded"
                    />
                    <div>
                      <div 
                        className="font-medium text-gray-900"
                        style={{ fontFamily: theme.fontFamily }}
                      >
                        {customer.name}
                      </div>
                      <div 
                        className="text-sm text-gray-600"
                        style={{ fontFamily: theme.fontFamily }}
                      >
                        {customer.phone} • {customer.totalOrders} pedidos • R$ {customer.totalSpent.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {customer.totalSpent > 200 && (
                      <Star className="h-4 w-4 text-yellow-500" title="Cliente VIP" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sendToCustomer(customer);
                      }}
                      className="p-1 text-green-600 hover:text-green-800"
                      title="Enviar mensagem"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Estatísticas */}
          <div 
            className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border"
            style={{
              borderRadius: theme.borderRadius === 'none' ? '0' :
                           theme.borderRadius === 'sm' ? '0.125rem' :
                           theme.borderRadius === 'md' ? '0.375rem' :
                           theme.borderRadius === 'lg' ? '0.5rem' :
                           theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
              fontFamily: theme.fontFamily
            }}
          >
            <div className="text-center">
              <div 
                className="text-lg font-bold"
                style={{ 
                  color: theme.primaryColor,
                  fontFamily: theme.fontFamily
                }}
              >
                {customers.length}
              </div>
              <div 
                className="text-xs text-gray-600"
                style={{ fontFamily: theme.fontFamily }}
              >
                Total Clientes
              </div>
            </div>
            <div className="text-center">
              <div 
                className="text-lg font-bold"
                style={{ 
                  color: theme.accentColor,
                  fontFamily: theme.fontFamily
                }}
              >
                {customers.filter(c => c.totalSpent > 200).length}
              </div>
              <div 
                className="text-xs text-gray-600"
                style={{ fontFamily: theme.fontFamily }}
              >
                Clientes VIP
              </div>
            </div>
            <div className="text-center">
              <div 
                className="text-lg font-bold text-green-600"
                style={{ fontFamily: theme.fontFamily }}
              >
                {sentCount}
              </div>
              <div 
                className="text-xs text-gray-600"
                style={{ fontFamily: theme.fontFamily }}
              >
                Enviadas Hoje
              </div>
            </div>
          </div>
        </div>

        {/* Seção Cupons Promocionais */}
        <div 
          className="bg-white p-6 shadow-lg border"
          style={{
            borderRadius: theme.borderRadius === 'none' ? '0' :
                         theme.borderRadius === 'sm' ? '0.125rem' :
                         theme.borderRadius === 'md' ? '0.375rem' :
                         theme.borderRadius === 'lg' ? '0.5rem' :
                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
            fontFamily: theme.fontFamily
          }}
        >
          <h3 
            className="text-xl font-bold mb-4 flex items-center gap-2"
            style={{ 
              color: theme.textColor,
              fontFamily: theme.fontFamily
            }}
          >
            <Gift className="h-5 w-5" />
            Cupons Promocionais
          </h3>
          
          <p 
            className="text-gray-600 text-sm mb-6"
            style={{ fontFamily: theme.fontFamily }}
          >
            Crie, edite e gerencie cupons de desconto para seus clientes.
          </p>

          {/* Lista de Cupons Existentes */}
          <div className="mb-6">
            {coupons.length > 0 && (
              <div className="space-y-3">
                {coupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="flex items-center justify-between p-4 bg-green-50 border border-green-200"
                    style={{
                      borderRadius: theme.borderRadius === 'none' ? '0' :
                                   theme.borderRadius === 'sm' ? '0.125rem' :
                                   theme.borderRadius === 'md' ? '0.375rem' :
                                   theme.borderRadius === 'lg' ? '0.5rem' :
                                   theme.borderRadius === 'xl' ? '0.75rem' : '9999px'
                    }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span 
                          className="font-bold text-lg text-green-800"
                          style={{ fontFamily: theme.fontFamily }}
                        >
                          {coupon.code}
                        </span>
                        <span 
                          className="bg-green-600 text-white px-3 py-1 text-sm font-medium"
                          style={{
                            borderRadius: theme.borderRadius === 'none' ? '0' :
                                         theme.borderRadius === 'sm' ? '0.125rem' :
                                         theme.borderRadius === 'md' ? '0.375rem' :
                                         theme.borderRadius === 'lg' ? '0.5rem' :
                                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                            fontFamily: theme.fontFamily
                          }}
                        >
                          {formatDiscount(coupon)} OFF
                        </span>
                        {!coupon.isActive && (
                          <span 
                            className="bg-red-100 text-red-800 px-2 py-1 text-xs font-medium"
                            style={{
                              borderRadius: theme.borderRadius === 'none' ? '0' :
                                           theme.borderRadius === 'sm' ? '0.125rem' :
                                           theme.borderRadius === 'md' ? '0.375rem' :
                                           theme.borderRadius === 'lg' ? '0.5rem' :
                                           theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                              fontFamily: theme.fontFamily
                            }}
                          >
                            Inativo
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <span style={{ fontFamily: theme.fontFamily }}>
                          {formatMinValue(coupon.minValue)}
                          {coupon.expiry && ` • Expira: ${new Date(coupon.expiry).toLocaleDateString('pt-BR')}`}
                          {coupon.usageCount !== undefined && ` • Usado ${coupon.usageCount}x`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => editCoupon(coupon)}
                        className="p-2 text-blue-600 hover:bg-blue-50 transition-colors"
                        style={{
                          borderRadius: theme.borderRadius === 'none' ? '0' :
                                       theme.borderRadius === 'sm' ? '0.125rem' :
                                       theme.borderRadius === 'md' ? '0.375rem' :
                                       theme.borderRadius === 'lg' ? '0.5rem' :
                                       theme.borderRadius === 'xl' ? '0.75rem' : '50%'
                        }}
                        title="Editar cupom"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteCoupon(coupon.id)}
                        className="p-2 text-red-600 hover:bg-red-50 transition-colors"
                        style={{
                          borderRadius: theme.borderRadius === 'none' ? '0' :
                                       theme.borderRadius === 'sm' ? '0.125rem' :
                                       theme.borderRadius === 'md' ? '0.375rem' :
                                       theme.borderRadius === 'lg' ? '0.5rem' :
                                       theme.borderRadius === 'xl' ? '0.75rem' : '50%'
                        }}
                        title="Excluir cupom"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulário de Criação/Edição de Cupom */}
          <div className="space-y-4">
            <div>
              <label 
                className="block text-sm font-medium text-gray-700 mb-2"
                style={{ fontFamily: theme.fontFamily }}
              >
                Código do cupom (ex: DESCONTO10)
              </label>
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="DESCONTO10"
                className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{
                  borderRadius: theme.borderRadius === 'none' ? '0' :
                               theme.borderRadius === 'sm' ? '0.125rem' :
                               theme.borderRadius === 'md' ? '0.375rem' :
                               theme.borderRadius === 'lg' ? '0.5rem' :
                               theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                  fontFamily: theme.fontFamily
                }}
              />
            </div>

            {/* Tipo de Desconto */}
            <div>
              <label 
                className="block text-sm font-medium text-gray-700 mb-2"
                style={{ fontFamily: theme.fontFamily }}
              >
                Tipo de Desconto
              </label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="percentage"
                    checked={couponType === 'percentage'}
                    onChange={(e) => setCouponType(e.target.value as 'percentage' | 'fixed')}
                    className="text-blue-600"
                  />
                  <span 
                    className="text-sm"
                    style={{ fontFamily: theme.fontFamily }}
                  >
                    Percentual (%)
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="fixed"
                    checked={couponType === 'fixed'}
                    onChange={(e) => setCouponType(e.target.value as 'percentage' | 'fixed')}
                    className="text-blue-600"
                  />
                  <span 
                    className="text-sm"
                    style={{ fontFamily: theme.fontFamily }}
                  >
                    Valor Fixo (R$)
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label 
                  className="block text-sm font-medium text-gray-700 mb-2"
                  style={{ fontFamily: theme.fontFamily }}
                >
                  {couponType === 'percentage' ? 'Desconto (%)' : 'Valor (R$)'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={couponDiscount}
                    onChange={(e) => setCouponDiscount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder={couponType === 'percentage' ? "10" : "15.00"}
                    min="0"
                    max={couponType === 'percentage' ? "100" : undefined}
                    step={couponType === 'percentage' ? "1" : "0.01"}
                    className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    style={{
                      borderRadius: theme.borderRadius === 'none' ? '0' :
                                   theme.borderRadius === 'sm' ? '0.125rem' :
                                   theme.borderRadius === 'md' ? '0.375rem' :
                                   theme.borderRadius === 'lg' ? '0.5rem' :
                                   theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                      fontFamily: theme.fontFamily
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span 
                      className="text-gray-500 text-sm"
                      style={{ fontFamily: theme.fontFamily }}
                    >
                      {couponType === 'percentage' ? '%' : 'R$'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label 
                  className="block text-sm font-medium text-gray-700 mb-2"
                  style={{ fontFamily: theme.fontFamily }}
                >
                  Valor Mínimo (R$)
                </label>
                <input
                  type="number"
                  value={couponMinValue}
                  onChange={(e) => setCouponMinValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="50.00"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily
                  }}
                />
              </div>
            </div>

            <div>
              <label 
                className="block text-sm font-medium text-gray-700 mb-2"
                style={{ fontFamily: theme.fontFamily }}
              >
                Data de Expiração (Opcional)
              </label>
              <input
                type="date"
                value={couponExpiry}
                onChange={(e) => setCouponExpiry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{
                  borderRadius: theme.borderRadius === 'none' ? '0' :
                               theme.borderRadius === 'sm' ? '0.125rem' :
                               theme.borderRadius === 'md' ? '0.375rem' :
                               theme.borderRadius === 'lg' ? '0.5rem' :
                               theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                  fontFamily: theme.fontFamily
                }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCouponSubmit}
                className="flex-1 text-white px-6 py-3 font-medium transition-colors hover:opacity-90"
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
                {editingCouponId ? 'Atualizar Cupom' : 'Adicionar Cupom'}
              </button>
              
              {editingCouponId && (
                <button
                  onClick={cancelCouponEdit}
                  className="px-6 py-3 text-gray-600 border border-gray-300 font-medium transition-colors hover:bg-gray-50"
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>

          {/* Dica */}
          <div 
            className="mt-6 p-4 bg-blue-50 border border-blue-200"
            style={{
              borderRadius: theme.borderRadius === 'none' ? '0' :
                           theme.borderRadius === 'sm' ? '0.125rem' :
                           theme.borderRadius === 'md' ? '0.375rem' :
                           theme.borderRadius === 'lg' ? '0.5rem' :
                           theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
              fontFamily: theme.fontFamily
            }}
          >
            <div 
              className="text-sm text-blue-700"
              style={{ fontFamily: theme.fontFamily }}
            >
              <strong>💡 Dica:</strong> Use cupons promocionais para aumentar as vendas. Exemplo: "Use o código DESCONTO10 e ganhe 10% de desconto!"
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Templates */}
      <div 
        className="bg-white p-6 shadow-lg border"
        style={{
          borderRadius: theme.borderRadius === 'none' ? '0' :
                       theme.borderRadius === 'sm' ? '0.125rem' :
                       theme.borderRadius === 'md' ? '0.375rem' :
                       theme.borderRadius === 'lg' ? '0.5rem' :
                       theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
          fontFamily: theme.fontFamily
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 
            className="text-xl font-bold flex items-center gap-2"
            style={{ 
              color: theme.textColor,
              fontFamily: theme.fontFamily
            }}
          >
            <Zap className="h-5 w-5" />
            Templates de Promoção
          </h3>
          <button
            onClick={() => {
              setEditingTemplate(null);
              setNewTemplate({ name: '', message: '' });
              setShowTemplateModal(true);
            }}
            className="flex items-center gap-2 px-3 py-2 text-white text-sm font-medium transition-colors hover:opacity-90"
            style={{
              backgroundColor: theme.accentColor,
              borderRadius: theme.borderRadius === 'none' ? '0' :
                           theme.borderRadius === 'sm' ? '0.125rem' :
                           theme.borderRadius === 'md' ? '0.375rem' :
                           theme.borderRadius === 'lg' ? '0.5rem' :
                           theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
              fontFamily: theme.fontFamily
            }}
          >
            <Zap className="h-4 w-4" />
            Novo Template
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promotionTemplates.map((template) => (
            <div 
              key={template.id} 
              className="border p-4 hover:shadow-md transition-shadow"
              style={{
                borderRadius: theme.borderRadius === 'none' ? '0' :
                             theme.borderRadius === 'sm' ? '0.125rem' :
                             theme.borderRadius === 'md' ? '0.375rem' :
                             theme.borderRadius === 'lg' ? '0.5rem' :
                             theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                fontFamily: theme.fontFamily
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <h4 
                  className="font-semibold text-gray-900"
                  style={{ fontFamily: theme.fontFamily }}
                >
                  {template.name}
                </h4>
                <div className="flex gap-1">
                  <button
                    onClick={() => editTemplate(template)}
                    className="p-1 text-blue-500 hover:text-blue-700"
                    title="Editar template"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                    title="Excluir template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p 
                className="text-sm text-gray-600 mb-3 line-clamp-3"
                style={{ fontFamily: theme.fontFamily }}
              >
                {template.message.substring(0, 100)}...
              </p>
              <button
                onClick={() => useTemplate(template)}
                className="w-full text-white px-3 py-2 text-sm font-medium transition-colors hover:opacity-90"
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
                Usar Template
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Seção de Mensagem */}
      <div 
        className="bg-white p-6 shadow-lg border"
        style={{
          borderRadius: theme.borderRadius === 'none' ? '0' :
                       theme.borderRadius === 'sm' ? '0.125rem' :
                       theme.borderRadius === 'md' ? '0.375rem' :
                       theme.borderRadius === 'lg' ? '0.5rem' :
                       theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
          fontFamily: theme.fontFamily
        }}
      >
        <h3 
          className="text-xl font-bold mb-4 flex items-center gap-2"
          style={{ 
            color: theme.textColor,
            fontFamily: theme.fontFamily
          }}
        >
          <Send className="h-5 w-5" />
          Mensagem Promocional
        </h3>

        <div className="space-y-4">
          <div>
            <label 
              className="block text-sm font-medium text-gray-700 mb-2"
              style={{ fontFamily: theme.fontFamily }}
            >
              Escreva sua mensagem promocional
            </label>
            <textarea
              value={promotionMessage}
              onChange={(e) => setPromotionMessage(e.target.value)}
              className="w-full h-32 px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              style={{
                borderRadius: theme.borderRadius === 'none' ? '0' :
                             theme.borderRadius === 'sm' ? '0.125rem' :
                             theme.borderRadius === 'md' ? '0.375rem' :
                             theme.borderRadius === 'lg' ? '0.5rem' :
                             theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                fontFamily: theme.fontFamily
              }}
              placeholder="Digite sua mensagem promocional aqui...&#10;&#10;Use {nome} para personalizar com o nome do cliente.&#10;&#10;Exemplo: Olá {nome}! Temos uma oferta especial para você..."
            />
          </div>

          <div 
            className="p-3 bg-blue-50 border border-blue-200 text-sm text-blue-700"
            style={{
              borderRadius: theme.borderRadius === 'none' ? '0' :
                           theme.borderRadius === 'sm' ? '0.125rem' :
                           theme.borderRadius === 'md' ? '0.375rem' :
                           theme.borderRadius === 'lg' ? '0.5rem' :
                           theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
              fontFamily: theme.fontFamily
            }}
          >
            <strong>💡 Dica:</strong> Use emojis e {'{nome}'} para personalizar suas mensagens. Seja claro sobre a oferta e inclua um call-to-action.
          </div>

          {/* Botões de Envio */}
          <div className="flex gap-4">
            <button
              onClick={sendPromotionAutomatically}
              disabled={isSending || selectedCustomers.length === 0 || !promotionMessage.trim()}
              className="flex-1 flex items-center justify-center gap-2 text-white px-6 py-3 font-medium transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
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
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Enviando... ({sendProgress.current}/{sendProgress.total})
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar para Selecionados ({selectedCustomers.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Template */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
          <div 
            className="bg-white p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{
              borderRadius: theme.borderRadius === 'none' ? '0' :
                           theme.borderRadius === 'sm' ? '0.125rem' :
                           theme.borderRadius === 'md' ? '0.375rem' :
                           theme.borderRadius === 'lg' ? '0.5rem' :
                           theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
              fontFamily: theme.fontFamily
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 
                className="text-xl font-bold"
                style={{ 
                  color: theme.textColor,
                  fontFamily: theme.fontFamily
                }}
              >
                {editingTemplate ? 'Editar Template' : 'Novo Template'}
              </h2>
              <button 
                onClick={() => setShowTemplateModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label 
                  className="block text-sm font-medium text-gray-700 mb-1"
                  style={{ fontFamily: theme.fontFamily }}
                >
                  Nome do Template
                </label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily
                  }}
                  placeholder="Ex: Promoção de Fim de Semana"
                />
              </div>

              <div>
                <label 
                  className="block text-sm font-medium text-gray-700 mb-1"
                  style={{ fontFamily: theme.fontFamily }}
                >
                  Mensagem do Template
                </label>
                <textarea
                  value={newTemplate.message}
                  onChange={(e) => setNewTemplate({ ...newTemplate, message: e.target.value })}
                  className="w-full h-48 px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily
                  }}
                  placeholder="Digite a mensagem do template aqui...&#10;&#10;Use {nome} para personalizar com o nome do cliente."
                />
              </div>

              <div 
                className="p-3 bg-blue-50 border border-blue-200 text-xs text-blue-700"
                style={{
                  borderRadius: theme.borderRadius === 'none' ? '0' :
                               theme.borderRadius === 'sm' ? '0.125rem' :
                               theme.borderRadius === 'md' ? '0.375rem' :
                               theme.borderRadius === 'lg' ? '0.5rem' :
                               theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                  fontFamily: theme.fontFamily
                }}
              >
                <strong>💡 Dica:</strong> Use emojis e {'{nome}'} para personalizar suas mensagens. Templates salvos podem ser reutilizados rapidamente.
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 font-medium transition-colors hover:bg-gray-50"
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveTemplate}
                  className="text-white px-6 py-2 font-medium transition-colors hover:opacity-90"
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
                  {editingTemplate ? 'Atualizar Template' : 'Salvar Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Cliente */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
          <div 
            className="bg-white p-6 w-full max-w-md"
            style={{
              borderRadius: theme.borderRadius === 'none' ? '0' :
                           theme.borderRadius === 'sm' ? '0.125rem' :
                           theme.borderRadius === 'md' ? '0.375rem' :
                           theme.borderRadius === 'lg' ? '0.5rem' :
                           theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
              fontFamily: theme.fontFamily
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 
                className="text-xl font-bold"
                style={{ 
                  color: theme.textColor,
                  fontFamily: theme.fontFamily
                }}
              >
                Adicionar Cliente
              </h2>
              <button 
                onClick={() => setShowAddCustomerModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label 
                  className="block text-sm font-medium text-gray-700 mb-1"
                  style={{ fontFamily: theme.fontFamily }}
                >
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily
                  }}
                  placeholder="Ex: João Silva"
                />
              </div>

              <div>
                <label 
                  className="block text-sm font-medium text-gray-700 mb-1"
                  style={{ fontFamily: theme.fontFamily }}
                >
                  Telefone (WhatsApp)
                </label>
                <input
                  type="text"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily
                  }}
                  placeholder="11999999999"
                />
              </div>

              <div 
                className="p-3 bg-yellow-50 border border-yellow-200 text-xs text-yellow-700"
                style={{
                  borderRadius: theme.borderRadius === 'none' ? '0' :
                               theme.borderRadius === 'sm' ? '0.125rem' :
                               theme.borderRadius === 'md' ? '0.375rem' :
                               theme.borderRadius === 'lg' ? '0.5rem' :
                               theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                  fontFamily: theme.fontFamily
                }}
              >
                <strong>💡 Dica:</strong> Digite apenas números no telefone (ex: 11999999999). O cliente será adicionado à sua lista de contatos.
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 font-medium transition-colors hover:bg-gray-50"
                  style={{
                    borderRadius: theme.borderRadius === 'none' ? '0' :
                                 theme.borderRadius === 'sm' ? '0.125rem' :
                                 theme.borderRadius === 'md' ? '0.375rem' :
                                 theme.borderRadius === 'lg' ? '0.5rem' :
                                 theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
                    fontFamily: theme.fontFamily
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddCustomer}
                  className="text-white px-6 py-2 font-medium transition-colors hover:opacity-90"
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
                  Adicionar Cliente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppPromotionSection;