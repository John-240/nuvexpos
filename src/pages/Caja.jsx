import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Lock, RefreshCw, Wallet, ArrowDownCircle, ArrowUpCircle, ShoppingBag, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/format';
import { useToast } from '@/components/ui/use-toast';
import IngresoRetiroDialog from '@/components/caja/IngresoRetiroDialog';
import CierreCajaDialog from '@/components/caja/CierreCajaDialog';

export default function Caja() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [montoInicial, setMontoInicial] = useState('');
  const [abriendo, setAbriendo] = useState(false);
  const [dialogOp, setDialogOp] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('resumen_caja', {});
      setData(res.data);
    } catch (e) {
      addToast(`Error al cargar caja: ${e.response?.data?.error || e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirCaja = async () => {
    const m = Number(montoInicial);
    if (isNaN(m) || m < 0) { addToast('Monto inicial inválido', 'error'); return; }
    setAbriendo(true);
    try {
      await base44.functions.invoke('abrir_caja', { monto_inicial: m });
      addToast(`Caja abierta — Monto inicial: ${formatCurrency(m)}`, 'success');
      setMontoInicial('');
      setLoading(true);
      await cargar();
    } catch (e) {
      addToast(`Error al abrir caja: ${e.response?.data?.error || e.message}`, 'error');
    } finally { setAbriendo(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // === PANTALLA DE APERTURA ===
  if (!data || !data.abierta) {
    const ahora = new Date();
    return (
      <div className="p-6 md:p-10 max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Apertura de Caja</h1>
          <p className="text-slate-500 mt-1">Ingrese el monto inicial para abrir una nueva sesión</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div><p className="text-slate-400">Usuario</p><p className="font-medium text-slate-800">{user?.full_name || user?.email}</p></div>
            <div className="text-right"><p className="text-slate-400">Fecha y hora</p><p className="font-medium text-slate-800">{ahora.toLocaleString('es-CR')}</p></div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium">Monto inicial (efectivo en caja)</label>
            <Input type="number" value={montoInicial} onChange={(e) => setMontoInicial(e.target.value)} placeholder="0" className="h-12 text-lg" autoFocus />
          </div>
          <Button onClick={abrirCaja} disabled={abriendo} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base font-semibold">
            {abriendo ? 'Abriendo...' : 'Abrir caja'}
          </Button>
        </div>
      </div>
    );
  }

  // === DASHBOARD DE CAJA ABIERTA ===
  const { caja, resumen, movimientos, ultimas_ventas, efectivo_disponible } = data;
  const tiempoAbierta = Math.max(0, Math.floor((Date.now() - new Date(caja.fecha_apertura).getTime()) / 60000));

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}><Icon className="w-5 h-5 text-white" /></div>
        <div className="min-w-0"><p className="text-xs text-slate-500 font-medium">{label}</p><p className="text-lg font-bold text-slate-900 truncate">{value}</p></div>
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> CAJA ABIERTA</span>
            <button onClick={() => { setLoading(true); cargar(); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><RefreshCw className="w-4 h-4" /></button>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mt-1">Caja #{caja.id.slice(-6)}</h1>
          <p className="text-sm text-slate-500">{caja.nombre_usuario_apertura} · {formatDate(caja.fecha_apertura)} · {tiempoAbierta} min abierta</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDialogOp('INGRESO')} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"><ArrowDownCircle className="w-4 h-4" /> Ingreso</Button>
          <Button variant="outline" onClick={() => setDialogOp('RETIRO')} className="text-amber-700 border-amber-200 hover:bg-amber-50"><ArrowUpCircle className="w-4 h-4" /> Retiro</Button>
          <Button onClick={() => setDialogOp('CIERRE')} className="bg-slate-900 hover:bg-slate-800"><Lock className="w-4 h-4" /> Cerrar caja</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="Monto inicial" value={formatCurrency(resumen.monto_inicial)} color="bg-slate-500" />
        <StatCard icon={ShoppingBag} label="Total ventas" value={formatCurrency(resumen.total_ventas)} color="bg-emerald-500" />
        <StatCard icon={ArrowDownCircle} label="Ingresos" value={formatCurrency(resumen.ingresos)} color="bg-emerald-500" />
        <StatCard icon={ArrowUpCircle} label="Retiros" value={formatCurrency(resumen.retiros)} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Wallet className="w-4 h-4 text-emerald-600" /> Efectivo</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Ventas en efectivo</span><span className="font-medium">{formatCurrency(resumen.total_efectivo)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Ingresos manuales</span><span className="font-medium">{formatCurrency(resumen.ingresos)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Retiros</span><span className="font-medium">-{formatCurrency(resumen.retiros)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Devoluciones</span><span className="font-medium">-{formatCurrency(resumen.devoluciones_efectivo)}</span></div>
            <div className="border-t border-slate-100 pt-2 flex justify-between"><span className="font-semibold text-slate-900">Efectivo esperado</span><span className="font-bold text-emerald-700">{formatCurrency(resumen.efectivo_esperado)}</span></div>
            <div className="flex justify-between"><span className="font-semibold text-slate-900">Disponible ahora</span><span className="font-bold text-slate-900">{formatCurrency(efectivo_disponible)}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Receipt className="w-4 h-4 text-violet-600" /> Ventas por método</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Tarjeta</span><span className="font-medium">{formatCurrency(resumen.total_tarjeta)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">SINPE</span><span className="font-medium">{formatCurrency(resumen.total_sinpe)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Transferencia</span><span className="font-medium">{formatCurrency(resumen.total_transferencia)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Otros</span><span className="font-medium">{formatCurrency(resumen.otros_pagos)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Crédito (fiado)</span><span className="font-medium">{formatCurrency(resumen.ventas_credito)}</span></div>
            <div className="border-t border-slate-100 pt-2 flex justify-between"><span className="font-semibold text-slate-900">Cantidad de ventas</span><span className="font-bold">{resumen.cantidad_ventas}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Últimas ventas</h3>
          {(ultimas_ventas || []).length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Sin ventas en esta caja.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {(ultimas_ventas || []).map((v) => (
                <div key={v.id} className="flex items-center justify-between text-sm">
                  <div><p className="font-medium text-slate-800">#{v.id.slice(-6)}</p><p className="text-xs text-slate-400">{new Date(v.fecha_hora).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })} · {v.metodo_pago}</p></div>
                  <span className="font-semibold">{formatCurrency(v.monto_total)}</span>
                </div>
              ))}
            </div>
          )}
          <Link to="/historial" className="block text-center text-xs text-emerald-600 font-medium mt-3 hover:underline">Ver historial completo</Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-semibold text-slate-900">Movimientos de caja</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Tipo</th>
                <th className="text-left font-medium px-4 py-2.5">Hora</th>
                <th className="text-left font-medium px-4 py-2.5 hidden sm:table-cell">Motivo</th>
                <th className="text-right font-medium px-4 py-2.5">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(movimientos || []).map((m) => {
                const color = (m.tipo === 'APERTURA' || m.tipo === 'INGRESO' || m.tipo === 'VENTA') ? 'text-emerald-600' : (m.tipo === 'RETIRO' || m.tipo === 'DEVOLUCION') ? 'text-amber-600' : 'text-slate-600';
                const sign = (m.tipo === 'RETIRO' || m.tipo === 'DEVOLUCION') ? '-' : '+';
                return (
                  <tr key={m.id}>
                    <td className="px-4 py-2.5"><span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{m.tipo}</span></td>
                    <td className="px-4 py-2.5 text-slate-500">{new Date(m.fecha_hora).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-2.5 text-slate-600 hidden sm:table-cell">{m.motivo}{m.metodo_pago ? ` (${m.metodo_pago})` : ''}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${color}`}>{sign}{formatCurrency(m.monto)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {dialogOp && dialogOp !== 'CIERRE' && (
        <IngresoRetiroDialog tipo={dialogOp} onClose={() => setDialogOp(null)} onDone={() => { setDialogOp(null); setLoading(true); cargar(); }} />
      )}
      {dialogOp === 'CIERRE' && (
        <CierreCajaDialog open efectivoEsperado={resumen.efectivo_esperado} resumen={resumen} onClose={() => setDialogOp(null)} onDone={() => { setDialogOp(null); setLoading(true); cargar(); }} />
      )}
    </div>
  );
}