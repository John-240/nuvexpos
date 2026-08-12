import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { registrarAuditoria, resumenCaja } from '../../shared/caja.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return Response.json({ error: 'No tiene permisos para devolver ventas' }, { status: 403 });
    }

    const body = await req.json();
    const { venta_id, motivo, items } = body;
    if (!venta_id) return Response.json({ error: 'Falta venta_id' }, { status: 400 });
    if (!motivo || !motivo.trim()) return Response.json({ error: 'El motivo es obligatorio' }, { status: 400 });

    const venta = await base44.asServiceRole.entities.Ventas.get(venta_id);
    if (!venta) return Response.json({ error: 'Venta no encontrada' }, { status: 404 });
    if (venta.estado === 'ANULADA' || venta.estado === 'DEVUELTA') {
      return Response.json({ error: 'La venta ya está anulada o devuelta' }, { status: 400 });
    }

    // Rechazar si la caja asociada está cerrada
    if (venta.caja_id) {
      const caja = await base44.asServiceRole.entities.Cajas.get(venta.caja_id);
      if (caja && caja.estado === 'CERRADA') {
        return Response.json({ error: 'No se puede modificar una venta de una caja cerrada' }, { status: 400 });
      }
    }

    const detalles = await base44.asServiceRole.entities.Detalles_Venta.filter({ venta_id });

    // Devolución parcial (items = [{producto_id, cantidad}]) o total
    let montoDevuelto = 0;
    if (Array.isArray(items) && items.length > 0) {
      const map = new Map(detalles.map((d) => [d.producto_id, d]));
      for (const it of items) {
        const d = map.get(it.producto_id);
        if (!d) continue;
        const cantidad = Math.min(parseInt(it.cantidad, 10) || 0, d.cantidad_vendida || 0);
        if (cantidad <= 0) continue;
        const prod = await base44.asServiceRole.entities.Productos.get(it.producto_id);
        if (prod) {
          await base44.asServiceRole.entities.Productos.update(prod.id, {
            stock_actual: (prod.stock_actual || 0) + cantidad
          });
        }
        const unit = d.cantidad_vendida ? d.subtotal / d.cantidad_vendida : (prod?.precio_venta || 0);
        montoDevuelto += cantidad * unit;
      }
    } else {
      for (const d of detalles) {
        const prod = await base44.asServiceRole.entities.Productos.get(d.producto_id);
        if (prod) {
          await base44.asServiceRole.entities.Productos.update(prod.id, {
            stock_actual: (prod.stock_actual || 0) + (d.cantidad_vendida || 0)
          });
        }
      }
      montoDevuelto = Number(venta.monto_total) || 0;
    }
    montoDevuelto = parseFloat(montoDevuelto.toFixed(2));

    // Revertir crédito si fue fiado
    if (venta.metodo_pago === 'Fiado' && venta.cliente_id) {
      const cliente = await base44.asServiceRole.entities.Clientes.get(venta.cliente_id);
      if (cliente) {
        await base44.asServiceRole.entities.Clientes.update(cliente.id, {
          saldo_pendiente: parseFloat(Math.max(0, ((Number(cliente.saldo_pendiente) || 0) - montoDevuelto)).toFixed(2))
        });
      }
    }

    await base44.asServiceRole.entities.Ventas.update(venta.id, {
      estado: 'DEVUELTA',
      motivo_anulacion: motivo.trim()
    });

    // Movimiento DEVOLUCION (afecta efectivo de caja si fue en efectivo)
    if (venta.caja_id && venta.metodo_pago === 'EFECTIVO') {
      await base44.asServiceRole.entities.Movimientos_Caja.create({
        caja_id: venta.caja_id, tipo: 'DEVOLUCION', usuario_id: user.id,
        nombre_usuario: user.full_name || user.email,
        fecha_hora: new Date().toISOString(), monto: montoDevuelto,
        metodo_pago: 'EFECTIVO', motivo: `Devolución venta ${venta.id}`, referencia: venta.id
      });
    }

    // Recalcular totales de la caja si sigue abierta
    if (venta.caja_id) {
      const caja = await base44.asServiceRole.entities.Cajas.get(venta.caja_id);
      if (caja && caja.estado === 'ABIERTA') {
        const r = await resumenCaja(base44, caja);
        await base44.asServiceRole.entities.Cajas.update(caja.id, {
          total_ventas: r.total_ventas,
          total_efectivo: r.total_efectivo,
          total_tarjeta: r.total_tarjeta,
          total_sinpe: r.total_sinpe,
          total_transferencia: r.total_transferencia,
          otros_pagos: r.otros_pagos,
          ingresos_manuales: r.ingresos,
          retiros: r.retiros,
          devoluciones: r.devoluciones
        });
      }
    }

    await registrarAuditoria(base44, user, 'DEVOLUCION_VENTA', 'Ventas', venta.id,
      { motivo: motivo.trim(), monto_devuelto: montoDevuelto, metodo_pago: venta.metodo_pago });

    return Response.json({ success: true, monto_devuelto: montoDevuelto });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}