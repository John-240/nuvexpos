import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { registrarAuditoria, resumenCaja } from '../../shared/caja.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return Response.json({ error: 'No tiene permisos para anular ventas. Solo ADMINISTRADOR o SUPERADMINISTRADOR.' }, { status: 403 });
    }

    const body = await req.json();
    const { venta_id, motivo } = body;
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

    // Revertir stock de los productos vendidos
    const detalles = await base44.asServiceRole.entities.Detalles_Venta.filter({ venta_id });
    for (const d of detalles) {
      const prod = await base44.asServiceRole.entities.Productos.get(d.producto_id);
      if (prod) {
        await base44.asServiceRole.entities.Productos.update(prod.id, {
          stock_actual: (prod.stock_actual || 0) + (d.cantidad_vendida || 0)
        });
      }
    }

    // Revertir crédito si fue venta a fiado
    if (venta.metodo_pago === 'Fiado' && venta.cliente_id) {
      const cliente = await base44.asServiceRole.entities.Clientes.get(venta.cliente_id);
      if (cliente) {
        await base44.asServiceRole.entities.Clientes.update(cliente.id, {
          saldo_pendiente: parseFloat(
            ((Number(cliente.saldo_pendiente) || 0) - (Number(venta.monto_total) || 0)).toFixed(2)
          )
        });
      }
    }

    await base44.asServiceRole.entities.Ventas.update(venta.id, {
      estado: 'ANULADA',
      motivo_anulacion: motivo.trim()
    });

    // Movimiento de devolución en efectivo (afecta el efectivo de la caja)
    if (venta.caja_id && venta.metodo_pago === 'EFECTIVO') {
      await base44.asServiceRole.entities.Movimientos_Caja.create({
        caja_id: venta.caja_id, tipo: 'DEVOLUCION', usuario_id: user.id,
        nombre_usuario: user.full_name || user.email,
        fecha_hora: new Date().toISOString(), monto: Number(venta.monto_total) || 0,
        metodo_pago: 'EFECTIVO', motivo: `Anulación venta ${venta.id}`, referencia: venta.id
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

    await registrarAuditoria(base44, user, 'ANULACION', 'Ventas', venta.id,
      { motivo: motivo.trim(), monto: venta.monto_total, metodo_pago: venta.metodo_pago });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}