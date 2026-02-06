import React from 'react';
import { getDashboardData, createCapexAction } from '@/app/actions/getCapex';
import DashboardCard from '@/components/DashboardCard';

// Server Component: Busca dados no servidor antes de renderizar
export default async function DashboardPage() {
  const metrics = await getDashboardData();

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gestão de CapEx e Ativos</h1>
        <p className="text-gray-600">Painel de Controle Financeiro</p>
      </header>

      {/* Grid de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <DashboardCard title="Total Orçado" value={metrics.totalBudget} />
        <DashboardCard title="Total Realizado" value={metrics.totalActual} />
        <DashboardCard 
          title="Saldo Disponível" 
          value={metrics.balance} 
          color={metrics.balance >= 0 ? 'bg-green-50' : 'bg-red-50'} 
        />
        <DashboardCard title="Ativos Imobilizados" value={metrics.assetsTotal} color="bg-blue-50" />
      </div>

      {/* Formulário usando Server Actions */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-w-md">
        <h2 className="text-xl font-semibold mb-4">Novo Investimento (CapEx)</h2>
        <form action={createCapexAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Descrição</label>
            <input 
              name="description" 
              type="text" 
              required 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Valor Orçado (R$)</label>
            <input 
              name="budgeted" 
              type="number" 
              step="0.01" 
              required 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" 
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Adicionar Registro
          </button>
        </form>
      </div>
    </div>
  );
}