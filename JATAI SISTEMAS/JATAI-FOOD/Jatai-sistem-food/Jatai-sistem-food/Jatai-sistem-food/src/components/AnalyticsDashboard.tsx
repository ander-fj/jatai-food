import React, { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  TrendingUp, 
  Package, 
  Users, 
  DollarSign, 
  Clock, 
  MapPin,
  Star,
  Calendar,
  BarChart3,
  PieChart,
  Download
} from 'lucide-react';
import { Order } from '../features/orders/types';
import { formatCurrency } from '../utils/formatters';
import * as XLSX from 'xlsx';

interface AnalyticsDashboardProps {
  orders: Order[];
  deliveryStaff: Array<{
    id: string;
    name: string;
    orderCount: number;
  }>;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ orders, deliveryStaff }) => {
  const { theme } = useTheme();

  // Estatísticas gerais
  const stats = useMemo(() => {
    const safeOrders = orders || [];
    
    const totalOrders = safeOrders.length;
    const totalRevenue = safeOrders.reduce((sum, order) => {
      const orderTotal = (order.items || []).reduce((itemSum, item) => itemSum + (item.price || 0), 0);
      return sum + orderTotal;
    }, 0);
    
    const deliveredOrders = safeOrders.filter(order => order.status === 'Entregue').length;
    const pendingOrders = safeOrders.filter(order => 
      order.status !== 'Entregue' && order.status !== 'Cancelado'
    ).length;
    
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const deliveryRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;
    
    return {
      totalOrders,
      totalRevenue,
      deliveredOrders,
      pendingOrders,
      averageOrderValue,
      deliveryRate
    };
  }, [orders]);

  // Estatísticas por status
  const ordersByStatus = useMemo(() => {
    const safeOrders = orders || [];
    
    return {
      'Novo': safeOrders.filter(order => order.status === 'Novo').length,
      'Preparando': safeOrders.filter(order => order.status === 'Preparando').length,
      'Pronto para Entrega': safeOrders.filter(order => order.status === 'Pronto para Entrega').length,
      'A caminho': safeOrders.filter(order => order.status === 'A caminho').length,
      'Próximos': safeOrders.filter(order => {
        const status = order.status;
        return status === 'Próximos' || status === 'proximos' || status === 'PROXIMOS' || status === 'Proximos';
      }).length,
      'Entregue': safeOrders.filter(order => order.status === 'Entregue').length,
      'Cancelado': safeOrders.filter(order => order.status === 'Cancelado').length,
      'Pago': safeOrders.filter(order => order.status === 'Pago').length,
      'Outros': safeOrders.filter(order => 
        order.status !== 'Novo' &&
        order.status !== 'Preparando' &&
        order.status !== 'Pronto para Entrega' &&
        order.status !== 'A caminho' &&
        !(order.status === 'Próximos' || order.status === 'proximos' || order.status === 'PROXIMOS' || order.status === 'Proximos') &&
        order.status !== 'Entregue' &&
        order.status !== 'Cancelado' &&
        order.status !== 'Pago'
      ).length
    };
  }, [orders]);

  // Top produtos mais vendidos
  const topProducts = useMemo(() => {
    const safeOrders = orders || [];
    const productCount: { [key: string]: { count: number; revenue: number } } = {};
    
    safeOrders.forEach(order => {
      (order.items || []).forEach(item => {
        if (!productCount[item.name]) {
          productCount[item.name] = { count: 0, revenue: 0 };
        }
        productCount[item.name].count += item.quantity || 1;
        productCount[item.name].revenue += item.price || 0;
      });
    });
    
    return Object.entries(productCount)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [orders]);

  // Performance dos entregadores
  const deliveryPerformance = useMemo(() => {
    const safeOrders = orders || [];
    const safeDeliveryStaff = deliveryStaff || [];
    
    return safeDeliveryStaff.map(staff => {
      const staffOrders = safeOrders.filter(order => 
        order.deliveryPerson === (staff.name ? staff.name.split(' ')[0] : '') || // Adiciona verificação para staff.name
        order.assignedTo === staff.id ||
        order.firebaseId === staff.id
      );
      
      const deliveredCount = staffOrders.filter(order => order.status === 'Entregue').length;
      const totalRevenue = staffOrders.reduce((sum, order) => {
        const orderTotal = (order.items || []).reduce((itemSum, item) => itemSum + (item.price || 0), 0);
        return sum + orderTotal;
      }, 0);
      
      return {
        ...staff,
        totalOrders: staffOrders.length,
        deliveredOrders: deliveredCount,
        totalRevenue,
        deliveryRate: staffOrders.length > 0 ? (deliveredCount / staffOrders.length) * 100 : 0
      };
    }).sort((a, b) => b.totalOrders - a.totalOrders);
  }, [orders, deliveryStaff]);

  // Vendas por hora
  const salesByHour = useMemo(() => {
    const safeOrders = orders || [];
    const hourlyData: { [key: string]: number } = {};
    
    // Inicializar todas as horas
    for (let i = 0; i < 24; i++) {
      hourlyData[i.toString().padStart(2, '0')] = 0;
    }
    
    safeOrders.forEach(order => {
      let hour = '12'; // Padrão
      
      if (order.createdAt) {
        hour = new Date(order.createdAt).getHours().toString().padStart(2, '0');
      } else if (order.orderTime) {
        hour = order.orderTime.split(':')[0];
      }
      
      const orderTotal = (order.items || []).reduce((sum, item) => sum + (item.price || 0), 0);
      hourlyData[hour] += orderTotal;
    });
    
    return Object.entries(hourlyData)
      .map(([hour, revenue]) => ({ hour: `${hour}:00`, revenue }))
      .filter(data => data.revenue > 0)
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  }, [orders]);

  // Função para exportar dados para Excel
  const exportToExcel = () => {
    try {
      // Criar workbook
      const wb = XLSX.utils.book_new();
      
      // Aba 1: Resumo Geral
      const resumoData = [
        ['Métrica', 'Valor'],
        ['Total de Pedidos', stats.totalOrders],
        ['Receita Total', `R$ ${formatCurrency(stats.totalRevenue)}`],
        ['Ticket Médio', `R$ ${formatCurrency(stats.averageOrderValue)}`],
        ['Taxa de Entrega', `${stats.deliveryRate.toFixed(1)}%`],
        ['Pedidos Entregues', stats.deliveredOrders],
        ['Pedidos Pendentes', stats.pendingOrders]
      ];
      const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Geral');
      
      // Aba 2: Pedidos por Status
      const statusData = [
        ['Status', 'Quantidade', 'Percentual']
      ];
      Object.entries(ordersByStatus).forEach(([status, count]) => {
        const percentage = stats.totalOrders > 0 ? ((count / stats.totalOrders) * 100).toFixed(1) : '0.0';
        statusData.push([status, count, `${percentage}%`]);
      });
      const wsStatus = XLSX.utils.aoa_to_sheet(statusData);
      XLSX.utils.book_append_sheet(wb, wsStatus, 'Pedidos por Status');
      
      // Aba 3: Produtos Mais Vendidos
      const produtosData = [
        ['Posição', 'Produto', 'Quantidade Vendida', 'Receita Total']
      ];
      topProducts.forEach((product, index) => {
        produtosData.push([
          index + 1,
          product.name,
          product.count,
          `R$ ${formatCurrency(product.revenue)}`
        ]);
      });
      const wsProdutos = XLSX.utils.aoa_to_sheet(produtosData);
      XLSX.utils.book_append_sheet(wb, wsProdutos, 'Produtos Mais Vendidos');
      
      // Aba 4: Performance dos Entregadores
      const entregadoresData = [
        ['Entregador', 'Total de Pedidos', 'Pedidos Entregues', 'Taxa de Entrega', 'Receita Total']
      ];
      deliveryPerformance.forEach((staff) => {
        entregadoresData.push([
          staff.name,
          staff.totalOrders,
          staff.deliveredOrders,
          `${staff.deliveryRate.toFixed(1)}%`,
          `R$ ${formatCurrency(staff.totalRevenue)}`
        ]);
      });
      const wsEntregadores = XLSX.utils.aoa_to_sheet(entregadoresData);
      XLSX.utils.book_append_sheet(wb, wsEntregadores, 'Performance Entregadores');
      
      // Aba 5: Vendas por Horário
      const vendasHorarioData = [
        ['Horário', 'Receita']
      ];
      salesByHour.forEach((data) => {
        vendasHorarioData.push([
          data.hour,
          `R$ ${formatCurrency(data.revenue)}`
        ]);
      });
      const wsVendasHorario = XLSX.utils.aoa_to_sheet(vendasHorarioData);
      XLSX.utils.book_append_sheet(wb, wsVendasHorario, 'Vendas por Horário');
      
      // Aba 6: Detalhes dos Pedidos
      const pedidosData = [
        ['ID', 'Cliente', 'Telefone', 'Endereço', 'Status', 'Horário', 'Total', 'Código Rastreamento', 'Entregador']
      ];
      orders.forEach((order) => {
        const total = (order.items || []).reduce((sum, item) => sum + (item.price || 0), 0);
        pedidosData.push([
          order.id,
          order.customerName || '',
          order.phone || '',
          order.address || '',
          order.status || '',
          order.createdAt ? new Date(order.createdAt).toLocaleString('pt-BR') : order.orderTime,
          `R$ ${formatCurrency(total)}`,
          order.trackingCode || '',
          order.deliveryPerson || ''
        ]);
      });
      const wsPedidos = XLSX.utils.aoa_to_sheet(pedidosData);
      XLSX.utils.book_append_sheet(wb, wsPedidos, 'Detalhes dos Pedidos');
      
      // Gerar nome do arquivo com data atual
      const now = new Date();
      const fileName = `relatorio_pizzaria_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}h${now.getMinutes().toString().padStart(2, '0')}.xlsx`;
      
      // Fazer download do arquivo
      XLSX.writeFile(wb, fileName);
      
      console.log('✅ Relatório exportado com sucesso:', fileName);
    } catch (error) {
      console.error('❌ Erro ao exportar relatório:', error);
      alert('Erro ao exportar relatório. Tente novamente.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-4 mb-2">
          <h2 
            className="text-3xl font-bold"
            style={{ 
              fontFamily: theme.fontFamily,
              color: theme.textColor
            }}
          >
            📊 Relatórios e Analytics
          </h2>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 text-white px-4 py-2 font-medium transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-50 shadow-lg"
            style={{
              backgroundColor: theme.accentColor,
              borderRadius: theme.borderRadius === 'none' ? '0' :
                           theme.borderRadius === 'sm' ? '0.125rem' :
                           theme.borderRadius === 'md' ? '0.375rem' :
                           theme.borderRadius === 'lg' ? '0.5rem' :
                           theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
              fontFamily: theme.fontFamily
            }}
            title="Exportar relatório completo para Excel"
          >
            <Download className="h-5 w-5" />
            Exportar Excel
          </button>
        </div>
        <p 
          className="text-gray-600"
          style={{ fontFamily: theme.fontFamily }}
        >
          Acompanhe o desempenho da sua pizzaria
        </p>
      </div>

      {/* Cards de Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          className={`bg-white p-6 shadow-sm border border-gray-200 ${
            theme.cardStyle === 'shadow' ? 'shadow-md' :
            theme.cardStyle === 'border' ? 'border-2' : 'shadow-sm'
          }`}
          style={{
            borderRadius: theme.borderRadius === 'none' ? '0' :
                         theme.borderRadius === 'sm' ? '0.125rem' :
                         theme.borderRadius === 'md' ? '0.375rem' :
                         theme.borderRadius === 'lg' ? '0.5rem' :
                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
            fontFamily: theme.fontFamily
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p 
                className="text-sm font-medium text-gray-600"
                style={{ fontFamily: theme.fontFamily }}
              >
                Total de Pedidos
              </p>
              <p 
                className="text-2xl font-bold"
                style={{ 
                  fontFamily: theme.fontFamily,
                  color: theme.textColor
                }}
              >
                {stats.totalOrders}
              </p>
            </div>
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ 
                backgroundColor: `${theme.primaryColor}20`,
                borderRadius: theme.borderRadius === 'none' ? '0' :
                             theme.borderRadius === 'sm' ? '0.125rem' :
                             theme.borderRadius === 'md' ? '0.375rem' :
                             theme.borderRadius === 'lg' ? '0.5rem' :
                             theme.borderRadius === 'xl' ? '0.75rem' : '9999px'
              }}
            >
              <Package className="h-6 w-6" style={{ color: theme.primaryColor }} />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="h-4 w-4 mr-1" style={{ color: theme.accentColor }} />
            <span 
              className="text-sm"
              style={{ 
                color: theme.accentColor,
                fontFamily: theme.fontFamily
              }}
            >
              +12% este mês
            </span>
          </div>
        </div>

        <div 
          className={`bg-white p-6 shadow-sm border border-gray-200 ${
            theme.cardStyle === 'shadow' ? 'shadow-md' :
            theme.cardStyle === 'border' ? 'border-2' : 'shadow-sm'
          }`}
          style={{
            borderRadius: theme.borderRadius === 'none' ? '0' :
                         theme.borderRadius === 'sm' ? '0.125rem' :
                         theme.borderRadius === 'md' ? '0.375rem' :
                         theme.borderRadius === 'lg' ? '0.5rem' :
                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
            fontFamily: theme.fontFamily
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p 
                className="text-sm font-medium text-gray-600"
                style={{ fontFamily: theme.fontFamily }}
              >
                Receita Total
              </p>
              <p 
                className="text-2xl font-bold"
                style={{ 
                  fontFamily: theme.fontFamily,
                  color: theme.textColor
                }}
              >
                R$ {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ 
                backgroundColor: `${theme.accentColor}20`,
                borderRadius: theme.borderRadius === 'none' ? '0' :
                             theme.borderRadius === 'sm' ? '0.125rem' :
                             theme.borderRadius === 'md' ? '0.375rem' :
                             theme.borderRadius === 'lg' ? '0.5rem' :
                             theme.borderRadius === 'xl' ? '0.75rem' : '9999px'
              }}
            >
              <DollarSign className="h-6 w-6" style={{ color: theme.accentColor }} />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="h-4 w-4 mr-1" style={{ color: theme.accentColor }} />
            <span 
              className="text-sm"
              style={{ 
                color: theme.accentColor,
                fontFamily: theme.fontFamily
              }}
            >
              +8% este mês
            </span>
          </div>
        </div>

        <div 
          className={`bg-white p-6 shadow-sm border border-gray-200 ${
            theme.cardStyle === 'shadow' ? 'shadow-md' :
            theme.cardStyle === 'border' ? 'border-2' : 'shadow-sm'
          }`}
          style={{
            borderRadius: theme.borderRadius === 'none' ? '0' :
                         theme.borderRadius === 'sm' ? '0.125rem' :
                         theme.borderRadius === 'md' ? '0.375rem' :
                         theme.borderRadius === 'lg' ? '0.5rem' :
                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
            fontFamily: theme.fontFamily
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p 
                className="text-sm font-medium text-gray-600"
                style={{ fontFamily: theme.fontFamily }}
              >
                Ticket Médio
              </p>
              <p 
                className="text-2xl font-bold"
                style={{ 
                  fontFamily: theme.fontFamily,
                  color: theme.textColor
                }}
              >
                R$ {formatCurrency(stats.averageOrderValue)}
              </p>
            </div>
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ 
                backgroundColor: `${theme.secondaryColor}20`,
                borderRadius: theme.borderRadius === 'none' ? '0' :
                             theme.borderRadius === 'sm' ? '0.125rem' :
                             theme.borderRadius === 'md' ? '0.375rem' :
                             theme.borderRadius === 'lg' ? '0.5rem' :
                             theme.borderRadius === 'xl' ? '0.75rem' : '9999px'
              }}
            >
              <BarChart3 className="h-6 w-6" style={{ color: theme.secondaryColor }} />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="h-4 w-4 mr-1" style={{ color: theme.accentColor }} />
            <span 
              className="text-sm"
              style={{ 
                color: theme.accentColor,
                fontFamily: theme.fontFamily
              }}
            >
              +5% este mês
            </span>
          </div>
        </div>

        <div 
          className={`bg-white p-6 shadow-sm border border-gray-200 ${
            theme.cardStyle === 'shadow' ? 'shadow-md' :
            theme.cardStyle === 'border' ? 'border-2' : 'shadow-sm'
          }`}
          style={{
            borderRadius: theme.borderRadius === 'none' ? '0' :
                         theme.borderRadius === 'sm' ? '0.125rem' :
                         theme.borderRadius === 'md' ? '0.375rem' :
                         theme.borderRadius === 'lg' ? '0.5rem' :
                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
            fontFamily: theme.fontFamily
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p 
                className="text-sm font-medium text-gray-600"
                style={{ fontFamily: theme.fontFamily }}
              >
                Taxa de Entrega
              </p>
              <p 
                className="text-2xl font-bold"
                style={{ 
                  fontFamily: theme.fontFamily,
                  color: theme.textColor
                }}
              >
                {stats.deliveryRate.toFixed(1)}%
              </p>
            </div>
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ 
                backgroundColor: `${theme.secondaryColor}20`,
                borderRadius: theme.borderRadius === 'none' ? '0' :
                             theme.borderRadius === 'sm' ? '0.125rem' :
                             theme.borderRadius === 'md' ? '0.375rem' :
                             theme.borderRadius === 'lg' ? '0.5rem' :
                             theme.borderRadius === 'xl' ? '0.75rem' : '9999px'
              }}
            >
              <MapPin className="h-6 w-6" style={{ color: theme.secondaryColor }} />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="h-4 w-4 mr-1" style={{ color: theme.accentColor }} />
            <span 
              className="text-sm"
              style={{ 
                color: theme.accentColor,
                fontFamily: theme.fontFamily
              }}
            >
              +3% este mês
            </span>
          </div>
        </div>
      </div>

      {/* Gráficos e Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pedidos por Status */}
        <div 
          className={`bg-white p-6 shadow-sm border border-gray-200 ${
            theme.cardStyle === 'shadow' ? 'shadow-md' :
            theme.cardStyle === 'border' ? 'border-2' : 'shadow-sm'
          }`}
          style={{
            borderRadius: theme.borderRadius === 'none' ? '0' :
                         theme.borderRadius === 'sm' ? '0.125rem' :
                         theme.borderRadius === 'md' ? '0.375rem' :
                         theme.borderRadius === 'lg' ? '0.5rem' :
                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
            fontFamily: theme.fontFamily
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-5 w-5" style={{ color: theme.primaryColor }} />
            <h3 
              className="text-lg font-semibold"
              style={{ 
                fontFamily: theme.fontFamily,
                color: theme.textColor
              }}
            >
              Pedidos por Status
            </h3>
          </div>
          <div className="space-y-3">
            {Object.entries(ordersByStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    status === 'Novo' ? 'bg-blue-500' :
                    status === 'Preparando' ? 'bg-yellow-500' :
                    status === 'Pronto para Entrega' ? 'bg-indigo-500' :
                    status === 'A caminho' ? 'bg-purple-500' :
                    status === 'Entregue' ? 'bg-green-500' :
                    'bg-red-500'
                  }`}></div>
                  <span className="text-sm text-gray-700">{status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{count}</span>
                  <span className="text-xs text-gray-500">
                    ({stats.totalOrders > 0 ? ((count / stats.totalOrders) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Produtos */}
        <div 
          className={`bg-white p-6 shadow-sm border border-gray-200 ${
            theme.cardStyle === 'shadow' ? 'shadow-md' :
            theme.cardStyle === 'border' ? 'border-2' : 'shadow-sm'
          }`}
          style={{
            borderRadius: theme.borderRadius === 'none' ? '0' :
                         theme.borderRadius === 'sm' ? '0.125rem' :
                         theme.borderRadius === 'md' ? '0.375rem' :
                         theme.borderRadius === 'lg' ? '0.5rem' :
                         theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
            fontFamily: theme.fontFamily
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5" style={{ color: theme.primaryColor }} />
            <h3 
              className="text-lg font-semibold"
              style={{ 
                fontFamily: theme.fontFamily,
                color: theme.textColor
              }}
            >
              Produtos Mais Vendidos
            </h3>
          </div>
          <div className="space-y-3">
            {topProducts.length > 0 ? topProducts.map((product, index) => (
              <div key={product.name} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-orange-600">{index + 1}</span>
                  </div>
                  <span className="text-sm text-gray-700 truncate">{product.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{product.count} vendidos</div>
                  <div className="text-xs text-gray-500">R$ {formatCurrency(product.revenue)}</div>
                </div>
              </div>
            )) : (
              <div className="text-center py-4 text-gray-500">
                <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Nenhum produto vendido ainda</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance dos Entregadores */}
      <div 
        className={`bg-white p-6 shadow-sm border border-gray-200 ${
          theme.cardStyle === 'shadow' ? 'shadow-md' :
          theme.cardStyle === 'border' ? 'border-2' : 'shadow-sm'
        }`}
        style={{
          borderRadius: theme.borderRadius === 'none' ? '0' :
                       theme.borderRadius === 'sm' ? '0.125rem' :
                       theme.borderRadius === 'md' ? '0.375rem' :
                       theme.borderRadius === 'lg' ? '0.5rem' :
                       theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
          fontFamily: theme.fontFamily
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5" style={{ color: theme.primaryColor }} />
          <h3 
            className="text-lg font-semibold"
            style={{ 
              fontFamily: theme.fontFamily,
              color: theme.textColor
            }}
          >
            Performance dos Entregadores
          </h3>
        </div>
        
        {deliveryPerformance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Entregador</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-gray-600">Pedidos</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-gray-600">Entregues</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-gray-600">Taxa</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">Receita</th>
                </tr>
              </thead>
              <tbody>
                {deliveryPerformance.map((staff) => (
                  <tr key={staff.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <img 
                          src={staff.avatar || 'https://via.placeholder.com/32'} 
                          alt={staff.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span className="font-medium text-gray-900">{staff.name}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-2 text-sm">{staff.totalOrders}</td>
                    <td className="text-center py-3 px-2 text-sm">{staff.deliveredOrders}</td>
                    <td className="text-center py-3 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        staff.deliveryRate >= 90 ? 'bg-green-100 text-green-800' :
                        staff.deliveryRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {staff.deliveryRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-right py-3 px-2 text-sm font-medium">
                      R$ {formatCurrency(staff.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum entregador cadastrado ainda</p>
          </div>
        )}
      </div>

      {/* Vendas por Horário */}
      <div 
        className={`bg-white p-6 shadow-sm border border-gray-200 ${
          theme.cardStyle === 'shadow' ? 'shadow-md' :
          theme.cardStyle === 'border' ? 'border-2' : 'shadow-sm'
        }`}
        style={{
          borderRadius: theme.borderRadius === 'none' ? '0' :
                       theme.borderRadius === 'sm' ? '0.125rem' :
                       theme.borderRadius === 'md' ? '0.375rem' :
                       theme.borderRadius === 'lg' ? '0.5rem' :
                       theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
          fontFamily: theme.fontFamily
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5" style={{ color: theme.primaryColor }} />
          <h3 
            className="text-lg font-semibold"
            style={{ 
              fontFamily: theme.fontFamily,
              color: theme.textColor
            }}
          >
            Vendas por Horário
          </h3>
        </div>
        
        {salesByHour.length > 0 ? (
          <div className="space-y-2">
            {salesByHour.map((data) => {
              const maxRevenue = Math.max(...salesByHour.map(d => d.revenue));
              const percentage = maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0;
              
              return (
                <div key={data.hour} className="flex items-center gap-4">
                  <div className="w-16 text-sm font-medium text-gray-700">{data.hour}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                    <div 
                      className="h-4 rounded-full transition-all duration-500"
                      style={{ 
                        background: `linear-gradient(to right, ${theme.primaryColor}, ${theme.secondaryColor})`,
                        width: `${percentage}%`
                      }}
                    ></div>
                  </div>
                  <div className="w-20 text-right text-sm font-medium text-gray-900">
                    R$ {formatCurrency(data.revenue)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhuma venda registrada ainda</p>
          </div>
        )}
      </div>

      {/* Resumo Rápido */}
      <div 
        className="text-white p-6"
        style={{
          background: `linear-gradient(to right, ${theme.primaryColor}, ${theme.secondaryColor})`,
          borderRadius: theme.borderRadius === 'none' ? '0' :
                       theme.borderRadius === 'sm' ? '0.125rem' :
                       theme.borderRadius === 'md' ? '0.375rem' :
                       theme.borderRadius === 'lg' ? '0.5rem' :
                       theme.borderRadius === 'xl' ? '0.75rem' : '9999px',
          fontFamily: theme.fontFamily
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="h-6 w-6" />
          <h3 
            className="text-xl font-semibold"
            style={{ fontFamily: theme.fontFamily }}
          >
            Resumo de Hoje
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div 
              className="text-2xl font-bold"
              style={{ fontFamily: theme.fontFamily }}
            >
              {stats.pendingOrders}
            </div>
            <div 
              className="text-sm opacity-80"
              style={{ fontFamily: theme.fontFamily }}
            >
              Pedidos Pendentes
            </div>
          </div>
          <div className="text-center">
            <div 
              className="text-2xl font-bold"
              style={{ fontFamily: theme.fontFamily }}
            >
              {stats.deliveredOrders}
            </div>
            <div 
              className="text-sm opacity-80"
              style={{ fontFamily: theme.fontFamily }}
            >
              Entregues
            </div>
          </div>
          <div className="text-center">
            <div 
              className="text-2xl font-bold"
              style={{ fontFamily: theme.fontFamily }}
            >
              {deliveryStaff.length}
            </div>
            <div 
              className="text-sm opacity-80"
              style={{ fontFamily: theme.fontFamily }}
            >
              Entregadores
            </div>
          </div>
          <div className="text-center">
            <div 
              className="text-2xl font-bold"
              style={{ fontFamily: theme.fontFamily }}
            >
              {stats.deliveryRate.toFixed(0)}%
            </div>
            <div 
              className="text-sm opacity-80"
              style={{ fontFamily: theme.fontFamily }}
            >
              Taxa de Sucesso
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;