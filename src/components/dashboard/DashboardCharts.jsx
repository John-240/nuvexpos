import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { formatCurrency } from '@/lib/format';

const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      <div className="mt-4 h-64">{children}</div>
    </div>
  );
}

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function DashboardCharts({ ventas, gastos, detalles, productos }) {
  const costoMap = useMemo(() => new Map(productos.map((p) => [p.id, p.precio_costo || 0])), [productos]);

  const buildDays = (n) => {
    const arr = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      arr.push(d);
    }
    return arr;
  };

  const resumenDia = (d) => {
    const ventasDia = ventas.filter((v) => {
      const f = v.fecha_hora ? new Date(v.fecha_hora) : null;
      return f && sameDay(f, d);
    });
    const totalVentas = ventasDia.reduce((s, v) => s + (v.monto_total || 0), 0);
    const vIds = new Set(ventasDia.map((v) => v.id));
    const cogs = detalles
      .filter((det) => vIds.has(det.venta_id))
      .reduce((s, det) => s + (det.cantidad_vendida || 0) * (costoMap.get(det.producto_id) || 0), 0);
    const gastosDia = gastos
      .filter((g) => {
        const f = g.fecha ? new Date(g.fecha) : null;
        return f && sameDay(f, d);
      })
      .reduce((s, g) => s + (g.monto || 0), 0);
    return { totalVentas, gastosDia, ganancia: totalVentas - cogs - gastosDia };
  };

  const datosSemana = useMemo(
    () => buildDays(7).map((d) => {
      const r = resumenDia(d);
      return { dia: `${DOW[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}`, ventas: r.totalVentas, gastos: r.gastosDia };
    }),
    [ventas, gastos, detalles, costoMap]
  );

  const datosGanancia = useMemo(
    () => buildDays(14).map((d) => {
      const r = resumenDia(d);
      return { dia: `${d.getDate()}/${d.getMonth() + 1}`, ganancia: r.ganancia };
    }),
    [ventas, gastos, detalles, costoMap]
  );

  const axisFmt = (v) => (v >= 1000 ? `₡${Math.round(v / 1000)}k` : `₡${v}`);
  const tooltipStyle = { fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard title="Ventas diarias" subtitle="Últimos 7 días">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datosSemana} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis tickFormatter={axisFmt} tick={{ fontSize: 11 }} stroke="#94a3b8" width={48} />
            <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tooltipStyle} />
            <Bar dataKey="ventas" name="Ventas" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Gastos de la semana" subtitle="Últimos 7 días">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datosSemana} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis tickFormatter={axisFmt} tick={{ fontSize: 11 }} stroke="#94a3b8" width={48} />
            <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tooltipStyle} />
            <Bar dataKey="gastos" name="Gastos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="lg:col-span-2">
        <ChartCard title="Evolución de la ganancia" subtitle="Ganancia neta diaria (ventas − costo − gastos) · últimos 14 días">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={datosGanancia} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradGanancia" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tickFormatter={axisFmt} tick={{ fontSize: 11 }} stroke="#94a3b8" width={48} />
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="ganancia" name="Ganancia neta" stroke="#10b981" strokeWidth={2} fill="url(#gradGanancia)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}