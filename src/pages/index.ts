export interface CapexEntry {
  id: string;
  description: string;
  budgeted: number; // Valor Orçado
  actual: number;   // Valor Realizado
  date: string;
  status: 'planned' | 'approved' | 'executed';
}

export interface AssetEntry {
  id: string;
  name: string;
  value: number;
  acquisitionDate: string;
}

export interface DashboardSummary {
  totalBudget: number;
  totalActual: number;
  balance: number;
  assetsTotal: number;
}