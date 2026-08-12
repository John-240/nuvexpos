import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { obtenerCajaAbierta, registrarAuditoria } from '../../shared/caja.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const monto_inicial = Number(body.monto_inicial);
    if (isNaN(monto_inicial) || monto_inicial < 0) {
      return Response.json({ error: 'Monto inicial inválido' }, { status: 400 });
    }

    const existente = await obtenerCajaAbierta(base44, user);
    if (existente) {
      return Response.json({ error: 'Ya tiene una caja abierta. Ciérrala antes de abrir una nueva.' }, { status: 400 });
    }

    const caja = await base44.entities.Cajas.create({
      estado: 'ABIERTA',
      usuario_apertura: user.id,
      nombre_usuario_apertura: user.full_name || user.email,
      fecha_apertura: new Date().toISOString(),
      monto_inicial: parseFloat(monto_inicial.toFixed(2)),
      total_ventas: 0, total_efectivo: 0, total_tarjeta: 0, total_sinpe: 0,
      total_transferencia: 0, otros_pagos: 0, ingresos_manuales: 0, retiros: 0,
      devoluciones: 0, efectivo_esperado: 0, efectivo_contado: 0, diferencia: 0
    });

    await base44.entities.Movimientos_Caja.create({
      caja_id: caja.id, tipo: 'APERTURA', usuario_id: user.id,
      nombre_usuario: user.full_name || user.email,
      fecha_hora: new Date().toISOString(), monto: parseFloat(monto_inicial.toFixed(2)),
      motivo: 'Apertura de caja', referencia: caja.id
    });

    await registrarAuditoria(base44, user, 'APERTURA_CAJA', 'Cajas', caja.id, { monto_inicial });

    return Response.json({ success: true, caja_id: caja.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}