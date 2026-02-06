'use server';

import { db } from '@/lib/db';
import { DashboardSummary } from '@/types';
import { revalidatePath } from 'next/cache';

// Busca dados agregados para o Dashboard
export async function getDashboardData(): Promise<DashboardSummary> {
  const capexList = await db.getCapex();
  const assetsList = await db.getAssets();

  const totalBudget = capexList.reduce((acc, item) => acc + item.budgeted, 0);
  const totalActual = capexList.reduce((acc, item) => acc + item.actual, 0);
  const assetsTotal = assetsList.reduce((acc, item) => acc + item.value, 0);

  return {
    totalBudget,
    totalActual,
    balance: totalBudget - totalActual,
    assetsTotal
  };
}

// Action para criar novo registro via formulário
export async function createCapexAction(formData: FormData) {
  const description = formData.get('description') as string;
  const budgeted = parseFloat(formData.get('budgeted') as string);
  
  await db.addCapex({
    description,
    budgeted,
    actual: 0,
    date: new Date().toISOString(),
    status: 'planned'
  });

  // Atualiza a cache da página para mostrar o novo dado imediatamente
  revalidatePath('/dashboard');
}