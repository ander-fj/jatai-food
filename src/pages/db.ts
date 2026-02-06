import { CapexEntry, AssetEntry } from '@/types';

// Simulação de Banco de Dados em Memória
class MockDB {
  private capex: CapexEntry[] = [
    { id: '1', description: 'Reforma Galpão A', budgeted: 150000, actual: 145000, date: '2024-01-10', status: 'executed' },
    { id: '2', description: 'Novos Servidores Dell', budgeted: 45000, actual: 0, date: '2024-02-15', status: 'planned' },
  ];

  private assets: AssetEntry[] = [
    { id: '1', name: 'Empilhadeira Elétrica', value: 85000, acquisitionDate: '2023-06-20' },
    { id: '2', name: 'Frota Veicular', value: 450000, acquisitionDate: '2023-01-15' },
  ];

  // Simula delay de rede
  private async delay() {
    return new Promise(resolve => setTimeout(resolve, 100));
  }

  async getCapex(): Promise<CapexEntry[]> {
    await this.delay();
    return [...this.capex];
  }

  async getAssets(): Promise<AssetEntry[]> {
    await this.delay();
    return [...this.assets];
  }

  async addCapex(entry: Omit<CapexEntry, 'id'>): Promise<CapexEntry> {
    const newEntry = { ...entry, id: Math.random().toString(36).substring(7) };
    this.capex.push(newEntry);
    return newEntry;
  }
}

export const db = new MockDB();