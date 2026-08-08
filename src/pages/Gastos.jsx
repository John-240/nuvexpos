import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Wallet, Trash2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/format';
import GastoForm from '@/components/gastos/GastoForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const CATEGORIAS = ['Compra de Mercancía', 'Servicios', 'Renta', 'Servicios Públicos', 'Salarios', 'Otros'];

export default function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [categoria, setCategoria] = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    load();
    const unsub = base44.entities.Gastos.subscribe(() => load());
    return unsub;
  }, []);

  const load = async () => {
    try {
      const data = await base44.entities.Gastos.list('-fecha', 500);
      setGastos(data);
    } finally {
      setLoading(false);
    }
  };

  const filtrados = useMemo(() => {
    return gastos.filter((g) => {
      const f = new Date(g.fecha);
      if (desde && f < new Date(desde + 'T00:00:00')) return false;
      if (hasta && f > new Date(hasta + 'T23:59:59')) return false;
      if (categoria && g.categoria !== categoria) return false;
      return true;
    });
  }, [gastos, desde, hasta, categoria]);

  const totalFiltrado = filtrados.reduce((s, g) => s + (g.monto || 0), 0);

  const ahora = new Date();
  const gastosMes = gastos.filter((g) => {
    const f = new Date(g.fecha);
    return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
  });
  const totalMes = gastosMes.reduce((s, g) => s + (g.monto || 0), 0);

  const porCategoria = useMemo(() => {
    const map = {};
    filtrados.forEach((g) => { map[g.categoria] = (map[g.categoria] || 0) + (g.monto || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtrados]);

  const handleSubmit = async (data) => {
    await base44.entities.Gastos.create(data);
    setShowForm(false);
    await load();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await base44.entities.Gastos.delete(deleting.id);
    setDeleting(null);
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Gastos</h1>
          <p className="text-slate-500 mt-1">Registra y controla los gastos de tu tienda</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700 self-start">
          <Plus className="w-4 h-4 mr-1.5" /> Nuevo gasto
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-rose-500 flex items-center justify-center"><Wallet className="w-5 h-5 text-white" /></div>
            <div><p className="text-sm text-slate-500 font-medium">Gastos del mes</p><p className="text-xl font-bold text-slate-900">{formatCurrency(totalMes)}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center"><Filter className="w-5 h-5 text-white" /></div>
            <div><p className="text-sm text-slate-500 font-medium">Total del período filtrado</p><p className="text-xl font-bold text-slate-900">{formatCurrency(totalFiltrado)}</p></div>
          </div>
        </div>
      </div>

      {/* Gráfico por categoría */}
      {porCategoria.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Gastos por categoría</h2>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={porCategoria} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => '₡' + v} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="sm:max-w-[180px]" />
        <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="sm:max-w-[180px]" />
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay gastos registrados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Fecha</th>
                  <th className="text-left font-medium px-4 py-3">Concepto</th>
                  <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Categoría</th>
                  <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Proveedor</th>
                  <th className="text-right font-medium px-4 py-3">Monto</th>
                  <th className="text-right font-medium px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{formatDate(g.fecha)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{g.concepto}</td>
                    <td className="px-4 py-3 hidden sm:table-cell"><span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{g.categoria}</span></td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{g.proveedor || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-rose-600">{formatCurrency(g.monto)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setDeleting(g)} className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal nuevo gasto */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Registrar nuevo gasto</DialogTitle></DialogHeader>
          <GastoForm onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      {/* Modal eliminar */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Eliminar gasto</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-2">¿Seguro que deseas eliminar el gasto <span className="font-semibold">{deleting?.concepto}</span>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}