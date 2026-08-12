import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Send, CheckCircle2, X, AlertCircle, Wallet, HandCoins, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import ClienteFiadoSelector from '@/components/ventas/ClienteFiadoSelector';

const ICONOS_PAGO = { Efectivo: Banknote, Tarjeta: CreditCard, Transferencia: Send };

export default function PuntoVenta() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [productos, setProductos] = useState([]);
  const [metodos, setMetodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [clienteFiado, setClienteFiado] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [ventaExitosa, setVentaExitosa] = useState(null);
  const [cajaAbierta, setCajaAbierta] = useState(true);
  const [recibido, setRecibido] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [data, metodosData] = await Promise.all([
        base44.entities.Productos.list(),
        base44.entities.MetodosPago.list()
      ]);
      setProductos(data);
      const activos = (metodosData || []).filter((m) => m.activo !== false);
      setMetodos(activos);
      if (activos.length && !activos.some((m) => m.nombre === metodoPago)) {
        setMetodoPago(activos[0].nombre);
      }
      try {
        const cajaRes = await base44.functions.invoke('resumen_caja', {});
        setCajaAbierta(!!cajaRes.data?.abierta);
      } catch {
        setCajaAbierta(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const resultados = useMemo(() => {
    if (!busqueda.trim()) return [];
    const q = busqueda.toLowerCase();
    return productos.filter((p) =>
      p.nombre_producto?.toLowerCase().includes(q) ||
      p.codigo_barras?.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [busqueda, productos]);

  const agregarAlCarrito = (producto) => {
    setCarrito((c) => {
      const existe = c.find((item) => item.producto_id === producto.id);
      if (existe) {
        return c.map((item) =>
          item.producto_id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...c, { producto_id: producto.id, nombre: producto.nombre_producto, precio: producto.precio_venta, cantidad: 1, stockDisponible: producto.stock_actual }];
    });
    setBusqueda('');
  };

  const cambiarCantidad = (producto_id, delta) => {
    setCarrito((c) =>
      c.map((item) => {
        if (item.producto_id !== producto_id) return item;
        const nueva = item.cantidad + delta;
        if (nueva <= 0) return null;
        if (nueva > item.stockDisponible) {
          toast({ title: 'Stock insuficiente', description: `Solo hay ${item.stockDisponible} unidades.`, variant: 'destructive' });
          return item;
        }
        return { ...item, cantidad: nueva };
      }).filter(Boolean)
    );
  };

  const setCantidad = (producto_id, value) => {
    const nueva = parseInt(value, 10) || 0;
    if (nueva <= 0) {
      setCarrito((c) => c.filter((item) => item.producto_id !== producto_id));
      return;
    }
    setCarrito((c) =>
      c.map((item) => {
        if (item.producto_id !== producto_id) return item;
        if (nueva > item.stockDisponible) {
          toast({ title: 'Stock insuficiente', description: `Solo hay ${item.stockDisponible} unidades.`, variant: 'destructive' });
          return item;
        }
        return { ...item, cantidad: nueva };
      })
    );
  };

  const quitar = (producto_id) => setCarrito((c) => c.filter((item) => item.producto_id !== producto_id));

  const total = carrito.reduce((sum, item) => sum + item.cantidad * item.precio, 0);

  const opcionesPago = (metodos.length
    ? metodos.map((m) => ({ nombre: m.nombre, Icon: ICONOS_PAGO[m.nombre] || Wallet }))
    : Object.keys(ICONOS_PAGO).map((nombre) => ({ nombre, Icon: ICONOS_PAGO[nombre] }))
  ).concat([{ nombre: 'Fiado', Icon: HandCoins }]);

  const esFiado = metodoPago === 'Fiado';
  const creditoDisponible = (Number(clienteFiado?.limite_credito) || 0) - (Number(clienteFiado?.saldo_pendiente) || 0);
  const fiadoValido = !esFiado || (!!clienteFiado && total <= creditoDisponible);

  const finalizarVenta = async () => {
    if (carrito.length === 0) return;
    if (!cajaAbierta) {
      toast({ title: 'Caja cerrada', description: 'Debe abrir una caja antes de vender', variant: 'destructive' });
      return;
    }
    const esEfectivo = metodoPago === 'Efectivo';
    const recibidoNum = Number(recibido) || 0;
    if (esEfectivo && recibidoNum < total) {
      toast({ title: 'Efectivo insuficiente', description: 'El dinero recibido es menor al total', variant: 'destructive' });
      return;
    }
    if (esFiado && (!clienteFiado || total > creditoDisponible)) {
      toast({ title: 'No se puede completar la venta a crédito', description: !clienteFiado ? 'Seleccione un cliente' : 'El crédito disponible es insuficiente', variant: 'destructive' });
      return;
    }
    setProcesando(true);
    try {
      const res = await base44.functions.invoke('finalizar_venta', { carrito, metodo_pago: metodoPago, cliente_id: esFiado ? clienteFiado.id : null, recibido: esEfectivo ? recibidoNum : null });
      setVentaExitosa({ id: res.data.venta_id, total: res.data.monto_total, vuelto: res.data.vuelto, metodo: metodoPago, alertas: res.data.alertas || [] });
      setCarrito([]);
      setBusqueda('');
      setClienteFiado(null);
      setRecibido('');
      await load();
    } catch (err) {
      toast({ title: 'Error al procesar la venta', description: err.message, variant: 'destructive' });
    } finally {
      setProcesando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Punto de Venta</h1>
        <p className="text-slate-500 mt-1">Registra una nueva venta</p>
      </div>

      {!cajaAbierta && (
        <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-700 text-sm font-medium">
            <Lock className="w-4 h-4" /> No hay caja abierta. Debe abrir una caja para registrar ventas.
          </div>
          <a href="/caja"><Button size="sm" className="bg-amber-600 hover:bg-amber-700">Abrir caja</Button></a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Buscador + resultados */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar producto por nombre o código de barras..."
                className="pl-11 h-12 text-base"
                autoFocus
              />
              {resultados.length > 0 && (
                <div className="absolute z-10 mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                  {resultados.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => agregarAlCarrito(p)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-emerald-50 text-left border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{p.nombre_producto}</p>
                        <p className="text-xs text-slate-400">{p.categoria} · {p.codigo_barras || 'Sin código'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-800 text-sm">{formatCurrency(p.precio_venta)}</p>
                        <p className={cn('text-xs', (p.stock_actual || 0) <= (p.stock_minimo || 0) ? 'text-red-500' : 'text-slate-400')}>Stock: {p.stock_actual}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {busqueda.trim() && resultados.length === 0 && (
                <div className="absolute z-10 mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-lg px-4 py-3 text-sm text-slate-400">
                  No se encontraron productos.
                </div>
              )}
            </div>

            {/* Acceso rápido a productos populares */}
            <div className="mt-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Productos disponibles</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {productos.slice(0, 12).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => agregarAlCarrito(p)}
                    className="text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                  >
                    <p className="font-medium text-slate-800 text-sm truncate">{p.nombre_producto}</p>
                    <p className="text-sm font-semibold text-emerald-600 mt-1">{formatCurrency(p.precio_venta)}</p>
                  </button>
                ))}
              </div>
              {productos.length === 0 && <p className="text-sm text-slate-400">No hay productos registrados.</p>}
            </div>
          </div>
        </div>

        {/* Carrito */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm sticky top-6 flex flex-col max-h-[calc(100vh-3rem)]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              <h2 className="font-semibold text-slate-900">Carrito</h2>
              <span className="ml-auto text-sm text-slate-400">{carrito.length} items</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {carrito.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">El carrito está vacío</p>
                  <p className="text-xs text-slate-400 mt-1">Busca y agrega productos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {carrito.map((item) => (
                    <div key={item.producto_id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-slate-800 text-sm leading-tight">{item.nombre}</p>
                        <button onClick={() => quitar(item.producto_id)} className="text-slate-400 hover:text-red-500 shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(item.precio)} c/u</p>
                      <div className="flex items-center justify-between mt-2.5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => cambiarCantidad(item.producto_id, -1)} className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            value={item.cantidad}
                            onChange={(e) => setCantidad(item.producto_id, e.target.value)}
                            className="w-12 h-7 text-center text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <button onClick={() => cambiarCantidad(item.producto_id, 1)} className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="font-semibold text-slate-900 text-sm">{formatCurrency(item.cantidad * item.precio)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 p-4 space-y-3">
              {/* Método de pago */}
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Método de pago</p>
                <div className="grid grid-cols-3 gap-2">
                  {opcionesPago.map(({ nombre, Icon }) => {
                    const active = metodoPago === nombre;
                    return (
                      <button
                        key={nombre}
                        onClick={() => { setMetodoPago(nombre); if (nombre !== 'Fiado') setClienteFiado(null); }}
                        className={cn(
                          'flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors',
                          active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {nombre}
                      </button>
                    );
                  })}
                </div>

                {esFiado && (
                  <div className="pt-1">
                    <ClienteFiadoSelector value={clienteFiado} onChange={setClienteFiado} total={total} />
                  </div>
                )}
                {metodoPago === 'Efectivo' && (
                  <div className="pt-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-500 font-medium">Dinero recibido</label>
                      {Number(recibido) > 0 && Number(recibido) >= total && (
                        <span className="text-xs text-emerald-600 font-medium">Vuelto: {formatCurrency(Number(recibido) - total)}</span>
                      )}
                    </div>
                    <Input type="number" value={recibido} onChange={(e) => setRecibido(e.target.value)} placeholder="0" className="h-10" />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 text-sm">Total</span>
                <span className="text-2xl font-bold text-slate-900">{formatCurrency(total)}</span>
              </div>

              <Button
                onClick={finalizarVenta}
                disabled={carrito.length === 0 || procesando || !fiadoValido || !cajaAbierta || (metodoPago === 'Efectivo' && (Number(recibido) || 0) < total)}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base font-semibold"
              >
                {procesando ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Procesando...</>
                ) : (
                  <>Finalizar venta</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal venta exitosa */}
      <Dialog open={!!ventaExitosa} onOpenChange={(o) => !o && setVentaExitosa(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex flex-col items-center text-center py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <DialogTitle>¡Venta completada!</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-3 text-center">
            <p className="text-sm text-slate-500">Venta #{ventaExitosa?.id?.slice(-6)}</p>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(ventaExitosa?.total)}</p>
            <p className="text-sm text-slate-500">Método: {ventaExitosa?.metodo || metodoPago}</p>
            {ventaExitosa?.vuelto > 0 && (
              <p className="text-sm font-medium text-emerald-600">Vuelto: {formatCurrency(ventaExitosa.vuelto)}</p>
            )}
            {ventaExitosa?.alertas?.length > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100 text-left">
                <div className="flex items-center gap-1.5 text-amber-700 font-medium text-sm mb-1">
                  <AlertCircle className="w-4 h-4" /> Alertas de stock
                </div>
                {ventaExitosa.alertas.map((a, i) => (
                  <p key={i} className="text-xs text-slate-600">{a}</p>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setVentaExitosa(null)} className="w-full bg-emerald-600 hover:bg-emerald-700">Nueva venta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}