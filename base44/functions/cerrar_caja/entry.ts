import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { obtenerCajaAbierta, registrarAuditoria, resumenCaja } from '../../shared/caja.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const efectivo_contado = Number(body.efectivo_contado);
    const observaciones = body.observaciones || null;
    if (isNaN(efectivo_contado) || efectivo_contado < 0) {
      return Response.json({ error: 'Efectivo contado inválido' }, { status: 400 });
    }

    const caja = await obtenerCajaAbierta(base44, user);
    if (!caja) return Response.json({ error: 'No hay caja abierta' }, { status: 400 });

    const r = await resumenCaja(base44, caja);
    const diferencia = parseFloat((efectivo_contado - r.efectivo_esperado).toFixed(2));

    await base44.entities.Cajas.update(caja.id, {
      estado: 'CERRADA',
      fecha_cierre: new Date().toISOString(),
      usuario_cierre: user.id,
      nombre_usuario_cierre: user.full_name || user.email,
      total_ventas: r.total_ventas, total_efectivo: r.total_efectivo, total_tarjeta: r.total_tarjeta,
      total_sinpe: r.total_sinpe, total_transferencia: r.total_transferencia, otros_pagos: r.otros_pagos,
      ingresos_manuales: r.ingresos, retiros: r.retiros, devoluciones: r.devoluciones,
      efectivo_esperado: r.efectivo_esperado, efectivo_contado: parseFloat(efectivo_contado.toFixed(2)),
      diferencia, observaciones
    });

    await base44.entities.Movimientos_Caja.create({
      caja_id: caja.id, tipo: 'CIERRE', usuario_id: user.id,
      nombre_usuario: user.full_name || user.email,
      fecha_hora: new Date().toISOString(), monto: parseFloat(efectivo_contado.toFixed(2)),
      motivo: 'Cierre de caja', referencia: caja.id, observaciones
    });

    await registrarAuditoria(base44, user, 'CIERRE_CAJA', 'Cajas', caja.id,
      { efectivo_esperado: r.efectivo_esperado, efectivo_contado, diferencia });

    return Response.json({
      success: true, resumen: r, diferencia,
      efectivo_esperado: r.efectivo_esperado, efectivo_contado: parseFloat(efectivo_contado.toFixed(2))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}