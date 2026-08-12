import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    // 1. Verificar autorización
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return Response.json({ error: 'No tiene permisos para anular ventas. Solo ADMINISTRADOR o SUPERADMINISTRADOR.' }, { status: 403 });
    }

    const body = await req.json();
    const ventaId = body.venta_id;
    const motivo = body.motivo || 'Anulación';
    if (!ventaId) {
      return Response.json({ error: 'Debe proporcionar venta_id' }, { status: 400 });
    }

    // 2. Buscar la venta
    const venta = await base44.asServiceRole.entities.Ventas.get(ventaId);
    if (!venta) {
      return Response.json({ error: 'La venta no existe' }, { status: 404 });
    }

    // 3. Verificar estado COMPLETADA (aceptar también "Pagado" legacy)
    if (venta.estado === 'ANULADA' || venta.estado === 'DEVUELTA') {
      return Response.json({ error: 'La venta ya está anulada o devuelta' }, { status: 400 });
    }
    if (venta.estado !== 'COMPLETADA' && venta.estado !== 'Pagado') {
      return Response.json({ error: 'Solo se pueden anular ventas completadas' }, { status: 400 });
    }

    // 4. Verificar caja ABIERTA
    let caja = null;
    if (venta.caja_id) {
      try {
        caja = await base44.asServiceRole.entities.Cajas.get(venta.caja_id);
      } catch (e) { /* caja no encontrada */ }

      if (caja && caja.estado === 'CERRADA') {
        return Response.json({ error: 'No se puede modificar una venta de una caja cerrada' }, { status: 400 });
      }
    }

    // Leer detalles ANTES de cambiar nada
    let detalles;
    try {
      detalles = await base44.asServiceRole.entities.Detalles_Venta.filter({ venta_id: ventaId });
    } catch (e) {
      return Response.json({ error: 'Error al leer detalles: ' + e.message }, { status: 500 });
    }

    if (!detalles || detalles.length === 0) {
      return Response.json({ error: 'No se encontraron detalles para esta venta' }, { status: 400 });
    }

    // 5. Cambiar estado a ANULADA (primero, para prevenir doble anulación)
    try {
      await base44.asServiceRole.entities.Ventas.update(ventaId, {
        estado: 'ANULADA',
        motivo_anulacion: motivo
      });
    } catch (e) {
      return Response.json({ error: 'Error al anular: ' + e.message }, { status: 500 });
    }

    // 6. Devolver stock a cada producto
    const stockResults = [];
    for (const detalle of detalles) {
      try {
        const producto = await base44.asServiceRole.entities.Productos.get(detalle.producto_id);
        if (producto) {
          const newStock = (producto.stock_actual || 0) + (detalle.cantidad_vendida || 0);
          await base44.asServiceRole.entities.Productos.update(producto.id, {
            stock_actual: newStock
          });
          stockResults.push({
            producto: producto.nombre_producto,
            devuelto: detalle.cantidad_vendida,
            stock_anterior: producto.stock_actual,
            stock_nuevo: newStock
          });
        }
      } catch (e) {
        stockResults.push({ producto_id: detalle.producto_id, error: e.message });
      }
    }

    // 6.1 Revertir crédito si fue venta a fiado (preserva el flujo de fiado)
    if (venta.metodo_pago === 'Fiado' && venta.cliente_id) {
      try {
        const cliente = await base44.asServiceRole.entities.Clientes.get(venta.cliente_id);
        if (cliente) {
          await base44.asServiceRole.entities.Clientes.update(cliente.id, {
            saldo_pendiente: parseFloat(((Number(cliente.saldo_pendiente) || 0) - (Number(venta.monto_total) || 0)).toFixed(2))
          });
        }
      } catch (e) { /* no bloquear */ }
    }

    // 7. Crear movimiento DEVOLUCION (solo para métodos que afectan caja; fiado no afecta efectivo)
    let movId = null;
    if (caja && venta.metodo_pago !== 'Fiado') {
      try {
        const mov = await base44.asServiceRole.entities.Movimientos_Caja.create({
          caja_id: caja.id,
          tipo: 'DEVOLUCION',
          metodo_pago: venta.metodo_pago,
          usuario_id: user.id,
          nombre_usuario: user.full_name || user.email,
          fecha_hora: new Date().toISOString(),
          monto: venta.monto_total,
          motivo: `Anulación de venta ${ventaId}`,
          referencia: ventaId,
          observaciones: motivo
        });
        movId = mov.id;
      } catch (e) { /* no bloquear */ }
    }

    // 8. Actualizar totales de caja (decremento directo)
    let cajaActualizada = false;
    if (caja && venta.metodo_pago !== 'Fiado') {
      try {
        const metodo = venta.metodo_pago;
        const monto = Number(venta.monto_total) || 0;
        const updates = {
          total_ventas: Math.max(0, (caja.total_ventas || 0) - monto),
          devoluciones: (caja.devoluciones || 0) + monto
        };

        if (metodo === 'EFECTIVO' || metodo === 'Efectivo') {
          updates.total_efectivo = Math.max(0, (caja.total_efectivo || 0) - monto);
        } else if (metodo === 'TARJETA' || metodo === 'Tarjeta') {
          updates.total_tarjeta = Math.max(0, (caja.total_tarjeta || 0) - monto);
        } else if (metodo === 'SINPE') {
          updates.total_sinpe = Math.max(0, (caja.total_sinpe || 0) - monto);
        } else if (metodo === 'TRANSFERENCIA' || metodo === 'Transferencia') {
          updates.total_transferencia = Math.max(0, (caja.total_transferencia || 0) - monto);
        } else {
          updates.otros_pagos = Math.max(0, (caja.otros_pagos || 0) - monto);
        }

        await base44.asServiceRole.entities.Cajas.update(caja.id, updates);
        cajaActualizada = true;
      } catch (e) { /* no bloquear */ }
    }

    // 9. Crear auditoría
    try {
      await base44.asServiceRole.entities.Auditoria.create({
        usuario_id: user.id,
        nombre_usuario: user.full_name || user.email,
        accion: 'ANULACION',
        fecha_hora: new Date().toISOString(),
        entidad: 'Ventas',
        registro_afectado: ventaId,
        informacion: `Venta ${ventaId} anulada. Motivo: ${motivo}. Monto: ${venta.monto_total}. Productos devueltos: ${detalles.length}. Mov DEVOLUCION: ${movId}`
      });
    } catch (e) { /* no bloquear */ }

    return Response.json({
      success: true,
      venta_id: ventaId,
      estado: 'ANULADA',
      stock_devuelto: stockResults,
      movimiento_devolucion_id: movId,
      caja_id: caja ? caja.id : null,
      caja_actualizada: cajaActualizada
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}