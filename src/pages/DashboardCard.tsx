import React from 'react';

interface Props {
  title: string;
  value: number;
  color?: string;
}

export default function DashboardCard({ title, value, color = "bg-white" }: Props) {
  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);

  return (
    <div className={`${color} p-6 rounded-xl shadow-sm border border-gray-200`}>
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-gray-900">{formattedValue}</p>
    </div>
  );
}