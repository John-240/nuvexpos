import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart3, PieChart as PieIcon, TrendingUp, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const METODOS = [
  { key: 'EFECTIVO', color: '#10b981' },
  { key: 'TARJETA', color: '#6366f1' },
  { key: 'SINPE', color: '#f59e0b' },
  { key: 'TRANSFERENCIA', color: '#06b6d4' },
  { key: 'OTRO', color: '#94a3b8' },
  { key: 'Fiado', color: '#ec4899' },
];

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function Reportes() {
  const [tab, setTab] = useState('diario');
  const [ventas, setVentas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaDia, setFechaDia] = useState(new Date().toISOString().slice(0, 10));
  const [inicioSemana, setInicioSemana] = useState(startOfWeek(new Date()).toISOString().slice(0, 10));

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [v, g, c, m, p, d] = await Promise.all([
        base44.entities.Ventas.list('-fecha_hora', 1000),
        base44.entities.Gastos.list('-fecha', 500),
        base44.entities.Cajas.list('-fecha_apertura', 200),
        base44.entities.Movimientos_Caja.list('-fecha_hora', 1000),
        base44.entities.Productos.list(),
        base44.entities.Detalles_Venta.list('-created_date', 2000),
      ]);
      setVentas(v); setGastos(g); setCajas(c); setMovimientos(m); setProductos(p); setDetalles(d);
    } finally { setLoading(false); }
  };

  const ventasValidas = useMemo(() => ventas.filter((v) => v.estado === 'COMPLETADA' || v.estado === 'Pagado'), [ventas]);

  // === REPORTE DIARIO ===
  const dia = useMemo(() => {
    const ini = new Date(fechaDia + 'T00:00:00');
    const fin = new Date(fechaDia + 'T23:59:59');
    const v = ventasValidas.filter((x) => {
      const f = new Date(x.fecha_hora);
      return f >= ini && f <= fin;
    });
    const g = gastos.filter((x) => {
      const f = new Date(x.fecha);
      return f >= ini && f <= fin;
    });
    const caj = cajas.filter((x) => {
      const f = new Date(x.fecha_apertura);
      return f >= ini && f <= fin;
    });
    const movs = movimientos.filter((x) => {
      const f = new Date(x.fecha_hora);
      return f >= ini && f <= fin;
    });
    const porMetodo = (m) => v.filter((x) => x.metodo_pago === m).reduce((s, x) => s + (Number(x.monto_total) || 0), 0);
    const dataMetodos = METODOS.map((m) => ({ name: m.key, value: parseFloat(porMetodo(m.key).toFixed(2)), color: m.color })).filter((x) => x.value > 0);
    const ingresos = movs.filter((x) => x.tipo === 'INGRESO').reduce((s, x) => s + (Number(x.monto) || 0), 0);
    const retiros = movs.filter((x) => x.tipo === 'RETIRO').reduce((s, x) => s + (Number(x.monto) || 0), 0);
    const devoluciones = movs.filter((x) => x.tipo === 'DEVOLUCION').reduce((s, x) => s + (Number(x.monto) || 0), 0);
    const totalVentas = v.reduce((s, x) => s + (Number(x.monto_total) || 0), 0);
    const totalGastos = g.reduce((s, x) => s + (Number(x.monto) || 0), 0);
    const ventaIds = new Set(v.map((x) => x.id));
    const costoMap = new Map(productos.map((p) => [p.id, p.precio_costo || 0]));
    const cogs = detalles
      .filter((d) => ventaIds.has(d.venta_id))
      .reduce((s, d) => s + (d.cantidad_vendida || 0) * (costoMap.get(d.producto_id) || 0), 0);
    const cajasCerradas = caj.filter((x) => x.estado === 'CERRADA');
    const diferencias = cajasCerradas.reduce((s, x) => s + (Number(x.diferencia) || 0), 0);
    return { v, g, dataMetodos, ingresos, retiros, devoluciones, totalVentas, totalGastos, cogs, caj, cajasCerradas, diferencias, cantidad: v.length };
  }, [ventasValidas, gastos, cajas, movimientos, productos, detalles, fechaDia]);

  // === REPORTE SEMANAL ===
  const semana = useMemo(() => {
    const ini = new Date(inicioSemana + 'T00:00:00');
    const fin = new Date(ini);
    fin.setDate(fin.getDate() + 7);
    const v = ventasValidas.filter((x) => {
      const f = new Date(x.fecha_hora);
      return f >= ini && f < fin;
    });
    const porDia = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ini);
      d.setDate(d.getDate() + i);
      const ds = new Date(d); ds.setHours(0, 0, 0, 0);
      const de = new Date(d); de.setHours(23, 59, 59);
      const total = v.filter((x) => { const f = new Date(x.fecha_hora); return f >= ds && f <= de; }).reduce((s, x) => s + (Number(x.monto_total) || 0), 0);
      const cant = v.filter((x) => { const f = new Date(x.fecha_hora); return f >= ds && f <= de; }).length;
      return { dia: DIAS[d.getDay()], total: parseFloat(total.toFixed(2)), cant };
    });
    const totalSemanal = v.reduce((s, x) => s + (Number(x.monto_total) || 0), 0);
    const conteoMetodos = METODOS.map((m) => ({ name: m.key, count: v.filter((x) => x.metodo_pago === m.key).length, color: m.color }));
    const metodoMasUsado = conteoMetodos.sort((a, b) => b.count - a.count)[0];
    const mejorDia = porDia.sort((a, b) => b.total - a.total)[0];
    return { porDia, totalSemanal, cantidad: v.length, metodoMasUsado, mejorDia, promedio: v.length ? totalSemanal / 7 : 0 };
  }, [ventasValidas, inicioSemana]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const Card = ({ label, value, color = 'text-slate-900' }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Reportes</h1>
        <p className="text-slate-500 mt-1">Análisis de ventas, pagos y caja</p>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === 'diario' ? 'default' : 'outline'} onClick={() => setTab('diario')} className={tab === 'diario' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
          <Calendar className="w-4 h-4" /> Diario
        </Button>
        <Button variant={tab === 'semanal' ? 'default' : 'outline'} onClick={() => setTab('semanal')} className={tab === 'semanal' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
          <BarChart3 className="w-4 h-4" /> Semanal
        </Button>
      </div>

      {tab === 'diario' ? (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <label className="text-xs text-slate-500 font-medium">Fecha</label>
            <Input type="date" value={fechaDia} onChange={(e) => setFechaDia(e.target.value)} className="max-w-xs mt-1" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card label="Total de ventas" value={formatCurrency(dia.totalVentas)} color="text-emerald-600" />
            <Card label="Cantidad de ventas" value={dia.cantidad} />
            <Card label="Ingresos manuales" value={formatCurrency(dia.ingresos)} color="text-emerald-600" />
            <Card label="Retiros" value={formatCurrency(dia.retiros)} color="text-amber-600" />
            <Card label="Devoluciones" value={formatCurrency(dia.devoluciones)} color="text-amber-600" />
            <Card label="Costo de productos" value={formatCurrency(dia.cogs)} color="text-rose-600" />
            <Card label="Gastos" value={formatCurrency(dia.totalGastos)} color="text-red-600" />
            <Card label="Diferencias de caja" value={`${dia.diferencia < 0 ? '-' : '+'}${formatCurrency(Math.abs(dia.diferencia))}`} color={Math.abs(dia.diferencia) < 0.01 ? 'text-emerald-600' : 'text-amber-600'} />
            <Card label="Utilidad neta" value={formatCurrency(dia.totalVentas - dia.cogs - dia.totalGastos)} color="text-emerald-700" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><PieIcon className="w-4 h-4 text-violet-600" /> Ventas por método de pago</h3>
              {dia.dataMetodos.length === 0 ? (
                <p className="text-sm text-slate-400 py-12 text-center">Sin ventas este día.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dia.dataMetodos} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.name}: ${formatCurrency(e.value)}`}>
                        {dia.dataMetodos.map((d) => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Cajas del día</h3>
              {dia.caj.length === 0 ? (
                <p className="text-sm text-slate-400 py-12 text-center">No se abrieron cajas este día.</p>
              ) : (
                <div className="space-y-2 text-sm">
                  {dia.caj.map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="font-medium text-slate-800">#{c.id.slice(-6)} · {c.nombre_usuario_apertura}</p>
                        <p className="text-xs text-slate-400">{c.estado}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">Ventas: {formatCurrency(c.total_ventas)}</p>
                        {c.estado === 'CERRADA' && <p className={`text-xs font-medium ${Math.abs(c.diferencia) < 0.01 ? 'text-emerald-600' : 'text-amber-600'}`}>Diferencia: {c.diferencia < 0 ? '-' : '+'}{formatCurrency(Math.abs(c.diferencia))}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <label className="text-xs text-slate-500 font-medium">Inicio de semana (lunes)</label>
            <Input type="date" value={inicioSemana} onChange={(e) => setInicioSemana(e.target.value)} className="max-w-xs mt-1" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card label="Total semanal" value={formatCurrency(semana.totalSemanal)} color="text-emerald-600" />
            <Card label="Cantidad de ventas" value={semana.cantidad} />
            <Card label="Promedio diario" value={formatCurrency(semana.promedio)} />
            <Card label="Mejor día" value={semana.mejorDia ? `${semana.mejorDia.dia} (${formatCurrency(semana.mejorDia.total)})` : '—'} color="text-violet-600" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" /> Ventas por día</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={semana.porDia}>
                  <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} name="Ventas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-3">Método de pago más utilizado</h3>
            <p className="text-lg font-medium text-slate-800">{semana.metodoMasUsado && semana.metodoMasUsado.count > 0 ? `${semana.metodoMasUsado.name} (${semana.metodoMasUsado.count} ventas)` : 'Sin ventas esta semana'}</p>
          </div>
        </>
      )}
    </div>
  );
}