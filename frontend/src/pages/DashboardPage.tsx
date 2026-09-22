import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, TrendingUp, TrendingDown, RefreshCw, Plus, X } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { StatCard } from '../components/StatCard';
import { EmptyTransactions } from '../components/EmptyTransactions';
import { useAuth } from '../hooks/useAuth';
import { useTransactions } from '../hooks/useTransactions';
import { transactionService } from '../services/transactionService';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { transactions, summary, loading, refresh, isEmpty } = useTransactions();
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Comida');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Limpieza de formato en caso de números con puntos (ej: 50.000 -> 50000)
    const cleanedAmount = amount.replace(/\./g, '').replace(',', '.');
    const parsedAmount = parseFloat(cleanedAmount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Por favor ingresa un monto válido mayor a 0');
      return;
    }

    if (!category.trim()) {
      setFormError('La categoría es obligatoria');
      return;
    }

    try {
      setSubmitting(true);
      await transactionService.createTransaction({
        amount: parsedAmount,
        category: category.trim(),
        description: description.trim() || undefined,
        date: new Date().toISOString(),
      });
      setShowAddModal(false);
      setAmount('');
      setCategory('Comida');
      setDescription('');
      await refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar transacción';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Barra de navegación superior */}
      <Navbar user={user} onLogout={handleLogout} />

      {/* Contenedor Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Encabezado de bienvenida y acciones rápidas */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Bienvenido, {user?.name || 'Usuario'} 👋
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Aquí tienes el resumen consolidado de tu economía personal.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refresh()}
              disabled={loading}
              className="p-2.5 rounded-xl text-slate-600 bg-white border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Transacción</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Indicadores / Métricas Financieras */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StatCard
            title="Balance Total"
            amount={summary.totalBalance}
            icon={Wallet}
            variant="neutral"
            subtitle="Disponible en tus cuentas"
          />
          <StatCard
            title="Ingresos del Mes"
            amount={summary.totalIncome}
            icon={TrendingUp}
            variant="success"
            subtitle="Total acumulado ingresado"
          />
          <StatCard
            title="Gastos del Mes"
            amount={summary.totalExpense}
            icon={TrendingDown}
            variant="danger"
            subtitle="Total acumulado gastado"
          />
        </section>

        {/* Sección de Historial de Transacciones */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Historial de Transacciones
              </h2>
              <p className="text-xs text-slate-500">
                Últimos movimientos financieros registrados
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg border border-slate-200/80">
              {transactions.length} registros
            </span>
          </div>

          {/* Listado de transacciones o Estado Vacío */}
          {isEmpty ? (
            <EmptyTransactions onAddTransaction={() => setShowAddModal(true)} />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-2xs">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-semibold text-sm text-slate-900">{tx.title}</p>
                    <p className="text-xs text-slate-500">{tx.category?.name || 'General'} • {tx.date}</p>
                  </div>
                  <span className={`text-sm font-bold ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {tx.type === 'INCOME' ? '+' : '-'}${tx.amount.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Modal interactivo de nueva transacción */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Registrar Nuevo Gasto</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-xs font-semibold text-slate-700 mb-1">
                  Monto ($)
                </label>
                <input
                  id="amount"
                  name="amount"
                  type="text"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50000"
                  className="block w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoría
                </label>
                <input
                  id="category"
                  name="category"
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Comida"
                  className="block w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción (opcional)
                </label>
                <input
                  id="description"
                  name="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Gasto en Comida"
                  className="block w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl disabled:opacity-60 cursor-pointer shadow-xs"
                >
                  {submitting ? 'Guardando...' : 'Guardar Transacción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
