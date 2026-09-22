import React from 'react';
import { ReceiptText, PlusCircle } from 'lucide-react';

interface EmptyTransactionsProps {
  onAddTransaction?: () => void;
}

export const EmptyTransactions: React.FC<EmptyTransactionsProps> = ({ onAddTransaction }) => {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-2xl mx-auto shadow-xs">
      <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-xs">
        <ReceiptText className="w-8 h-8" />
      </div>

      <h3 className="text-lg font-semibold text-slate-900 mb-1">
        No hay transacciones registradas
      </h3>

      <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
        Aún no has registrado ingresos ni gastos en tu cuenta de Centavo. Comienza a registrar tus movimientos diarios para tomar el control de tus finanzas.
      </p>

      <button
        onClick={onAddTransaction}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
      >
        <PlusCircle className="w-4 h-4" />
        <span>Registrar primera transacción</span>
      </button>
    </div>
  );
};
