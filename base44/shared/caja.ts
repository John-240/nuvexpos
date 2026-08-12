// Lógica compartida del módulo de Caja. Recibe `base44` ya inicializado.

export async function obtenerCajaAbierta(base44, user) {
  const cajas = await base44.asServiceRole.entities.Cajas.filter({
    usuario_apertura: user.id,
    estado: 'ABIERTA'
  });
  return cajas.length > 0 ? cajas[0] : null;
}

export async function registrarAuditoria(base44, user, accion, entidad, registro_id, informacion) {
  try {
    await base44.asServiceRole.entities.Auditoria.create({
      usuario_id: user.id,
      nombre_usuario: user.full_name || user.email,
      accion,
      fecha_hora: new Date().toISOString(),
      entidad: entidad || null,
      registro_afectado: registro_id || null,
      informacion: typeof informacion === 'string' ? informacion : JSON.stringify(informacion)
    });
  } catch (e) {
    /* la auditoría no debe bloquear la operación principal */
  }
}

export function sumar(arr, campo) {
  return (arr || []).reduce((s, x) => s + (Number(x[campo]) || 0), 0);
}

// Efectivo disponible = monto inicial + ingresos + ventas en efectivo - retiros - devoluciones en efectivo
export async function efectivoDisponible(base44, caja) {
  const movs = await base44.asServiceRole.entities.Movimientos_Caja.filter({ caja_id: caja.id });
  let cashIn = 0;
  let cashOut = 0;
  for (const m of movs) {
    const monto = Number(m.monto) || 0;
    if (m.tipo === 'APERTURA' || m.tipo === 'INGRESO') cashIn += monto;
    else if (m.tipo === 'VENTA' && m.metodo_pago === 'EFECTIVO') cashIn += monto;
    else if (m.tipo === 'RETIRO') cashOut += monto;
    else if (m.tipo === 'DEVOLUCION' && m.metodo_pago === 'EFECTIVO') cashOut += monto;
  }
  return parseFloat((cashIn - cashOut).toFixed(2));
}

// Resumen agregado de una caja (totales por método, ingresos, retiros, efectivo esperado)
export async function resumenCaja(base44, caja) {
  const movs = await base44.asServiceRole.entities.Movimientos_Caja.filter({ caja_id: caja.id });
  const ventas = await base44.asServiceRole.entities.Ventas.filter({ caja_id: caja.id });
  const ventasValidas = (ventas || []).filter((v) => v.estado === 'COMPLETADA' || v.estado === 'Pagado');
  const porMetodo = (m) => sumar(ventasValidas.filter((v) => v.metodo_pago === m), 'monto_total');

  const total_efectivo = porMetodo('EFECTIVO');
  const total_tarjeta = porMetodo('TARJETA');
  const total_sinpe = porMetodo('SINPE');
  const total_transferencia = porMetodo('TRANSFERENCIA');
  const otros_pagos = porMetodo('OTRO');
  const ventas_credito = porMetodo('Fiado');

  const ingresos = sumar(movs.filter((m) => m.tipo === 'INGRESO'), 'monto');
  const retiros = sumar(movs.filter((m) => m.tipo === 'RETIRO'), 'monto');
  const devoluciones = sumar(movs.filter((m) => m.tipo === 'DEVOLUCION'), 'monto');
  const devoluciones_efectivo = sumar(
    movs.filter((m) => m.tipo === 'DEVOLUCION' && m.metodo_pago === 'EFECTIVO'),
    'monto'
  );

  const total_ventas =
    total_efectivo + total_tarjeta + total_sinpe + total_transferencia + otros_pagos + ventas_credito;

  const efectivo_esperado =
    (Number(caja.monto_inicial) || 0) + total_efectivo + ingresos - retiros - devoluciones_efectivo;

  return {
    total_ventas: parseFloat(total_ventas.toFixed(2)),
    total_efectivo: parseFloat(total_efectivo.toFixed(2)),
    total_tarjeta: parseFloat(total_tarjeta.toFixed(2)),
    total_sinpe: parseFloat(total_sinpe.toFixed(2)),
    total_transferencia: parseFloat(total_transferencia.toFixed(2)),
    otros_pagos: parseFloat(otros_pagos.toFixed(2)),
    ventas_credito: parseFloat(ventas_credito.toFixed(2)),
    ingresos: parseFloat(ingresos.toFixed(2)),
    retiros: parseFloat(retiros.toFixed(2)),
    devoluciones: parseFloat(devoluciones.toFixed(2)),
    devoluciones_efectivo: parseFloat(devoluciones_efectivo.toFixed(2)),
    efectivo_esperado: parseFloat(efectivo_esperado.toFixed(2)),
    monto_inicial: Number(caja.monto_inicial) || 0,
    cantidad_ventas: ventasValidas.length
  };
}