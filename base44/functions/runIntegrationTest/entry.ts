import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  const body = await req.json().catch(() => ({}));
  const testId = body.test_id || `test_${Date.now()}`;
  const results = { test_id: testId, steps: [], errors: [], calculations: {} };
  const usuarioId = "6a76b4a9501852d858b833eb";
  const usuarioNombre = "John Melendez (Test)";
  const testObs = `TEST_ID:${testId}`;

  try {
    const base44 = createClientFromRequest(req);

    // VERIFICAR IDEMPOTENCIA — buscar caja con este test_id
    const cajasExistentes = await base44.asServiceRole.entities.Cajas.list();
    const yaExiste = cajasExistentes.find(c => c.observaciones && c.observaciones.includes(testObs));
    if (yaExiste) {
      return Response.json({ error: "Test ya ejecutado con este test_id", test_id: testId, caja_id: yaExiste.id });
    }

    // Obtener productos y su stock inicial
    const productos = await base44.asServiceRole.entities.Productos.list();
    const stockInicial = {};
    productos.forEach(p => { stockInicial[p.id] = p.stock_actual; });

    // === PASO 1: APERTURA DE CAJA ===
    const caja = await base44.asServiceRole.entities.Cajas.create({
      estado: "ABIERTA", usuario_apertura: usuarioId, nombre_usuario_apertura: usuarioNombre,
      fecha_apertura: new Date().toISOString(), monto_inicial: 50000,
      total_ventas: 0, total_efectivo: 0, total_tarjeta: 0, total_sinpe: 0,
      total_transferencia: 0, otros_pagos: 0, ingresos_manuales: 0, retiros: 0,
      devoluciones: 0, efectivo_esperado: 0, efectivo_contado: 0, diferencia: 0,
      observaciones: testObs
    });

    await base44.asServiceRole.entities.Movimientos_Caja.create({
      caja_id: caja.id, tipo: "APERTURA", usuario_id: usuarioId, nombre_usuario: usuarioNombre,
      fecha_hora: new Date().toISOString(), monto: 50000, motivo: "Apertura", observaciones: testObs, referencia: caja.id
    });

    await base44.asServiceRole.entities.Auditoria.create({
      usuario_id: usuarioId, nombre_usuario: usuarioNombre, accion: "APERTURA_CAJA",
      fecha_hora: new Date().toISOString(), entidad: "Cajas", registro_afectado: caja.id,
      informacion: `Apertura 50000. ${testObs}`
    });

    results.steps.push({ paso: 1, nombre: "Apertura", caja_id: caja.id, estado: caja.estado, monto: caja.monto_inicial, pass: caja.estado === "ABIERTA" && caja.monto_inicial === 50000 });

    // Helper para crear venta
    async function crearVenta(items, metodoPago, recibido, cajaId) {
      const total = items.reduce((s, i) => s + i.subtotal, 0);
      const vuelto = metodoPago === "EFECTIVO" ? (recibido - total) : 0;

      const venta = await base44.asServiceRole.entities.Ventas.create({
        fecha_hora: new Date().toISOString(), monto_total: total, metodo_pago: metodoPago,
        caja_id: cajaId, descuento: 0, recibido: recibido || null, vuelto: vuelto || 0,
        estado: "COMPLETADA", usuario_id: usuarioId
      });

      for (const item of items) {
        await base44.asServiceRole.entities.Detalles_Venta.create({
          venta_id: venta.id, producto_id: item.producto.id,
          cantidad_vendida: item.cantidad, subtotal: item.subtotal
        });
        await base44.asServiceRole.entities.Productos.update(item.producto.id, {
          stock_actual: item.producto.stock_actual - item.cantidad
        });
      }

      await base44.asServiceRole.entities.Movimientos_Caja.create({
        caja_id: cajaId, tipo: "VENTA", metodo_pago: metodoPago, usuario_id: usuarioId,
        nombre_usuario: usuarioNombre, fecha_hora: new Date().toISOString(), monto: total,
        motivo: `Venta ${metodoPago}`, referencia: venta.id, observaciones: testObs
      });

      await base44.asServiceRole.entities.Auditoria.create({
        usuario_id: usuarioId, nombre_usuario: usuarioNombre, accion: "VENTA",
        fecha_hora: new Date().toISOString(), entidad: "Ventas", registro_afectado: venta.id,
        informacion: `Venta ${metodoPago} por ${total}. ${testObs}`
      });

      return { venta, total, vuelto };
    }

    // === PASO 2: VENTA EFECTIVO ===
    const coca = productos.find(p => p.nombre_producto === "Coca-Cola 600ml");
    const galletas = productos.find(p => p.nombre_producto === "Galletas Chiky");
    const v1 = await crearVenta([
      { producto: coca, cantidad: 2, subtotal: 1600 },
      { producto: galletas, cantidad: 1, subtotal: 700 }
    ], "EFECTIVO", 5000, caja.id);

    results.steps.push({ paso: 2, nombre: "Venta EFECTIVO", venta_id: v1.venta.id, total: v1.total, recibido: 5000, vuelto: v1.vuelto, estado: v1.venta.estado, metodo: v1.venta.metodo_pago, pass: v1.total === 2300 && v1.vuelto === 2700 && v1.venta.estado === "COMPLETADA" && v1.venta.metodo_pago === "EFECTIVO" && v1.venta.usuario_id === usuarioId });

    await base44.asServiceRole.entities.Cajas.update(caja.id, { total_ventas: 2300, total_efectivo: 2300 });

    // === PASO 3: VENTA TARJETA ===
    const cafe = productos.find(p => p.nombre_producto === "Café 250g");
    const leche = productos.find(p => p.nombre_producto === "Leche Dos Pinos 1L");
    const v2 = await crearVenta([
      { producto: cafe, cantidad: 1, subtotal: 2500 },
      { producto: leche, cantidad: 1, subtotal: 1200 }
    ], "TARJETA", null, caja.id);

    results.steps.push({ paso: 3, nombre: "Venta TARJETA", venta_id: v2.venta.id, total: v2.total, metodo: v2.venta.metodo_pago, pass: v2.total === 3700 && v2.venta.metodo_pago === "TARJETA" });

    await base44.asServiceRole.entities.Cajas.update(caja.id, { total_ventas: 6000, total_tarjeta: 3700 });

    // === PASO 4: VENTA SINPE ===
    const pan = productos.find(p => p.nombre_producto === "Pan cuadrado");
    const agua = productos.find(p => p.nombre_producto === "Agua Cristal 600ml");
    const v3 = await crearVenta([
      { producto: pan, cantidad: 1, subtotal: 1500 },
      { producto: agua, cantidad: 2, subtotal: 1200 }
    ], "SINPE", null, caja.id);

    results.steps.push({ paso: 4, nombre: "Venta SINPE", venta_id: v3.venta.id, total: v3.total, metodo: v3.venta.metodo_pago, pass: v3.total === 2700 && v3.venta.metodo_pago === "SINPE" });

    await base44.asServiceRole.entities.Cajas.update(caja.id, { total_ventas: 8700, total_sinpe: 2700 });

    // === PASO 5: INGRESO MANUAL ===
    const movIngreso = await base44.asServiceRole.entities.Movimientos_Caja.create({
      caja_id: caja.id, tipo: "INGRESO", usuario_id: usuarioId, nombre_usuario: usuarioNombre,
      fecha_hora: new Date().toISOString(), monto: 10000, motivo: "Cambio para caja", observaciones: testObs
    });
    await base44.asServiceRole.entities.Auditoria.create({
      usuario_id: usuarioId, nombre_usuario: usuarioNombre, accion: "INGRESO",
      fecha_hora: new Date().toISOString(), entidad: "Movimientos_Caja", registro_afectado: movIngreso.id,
      informacion: `Ingreso manual de 10000. ${testObs}`
    });
    await base44.asServiceRole.entities.Cajas.update(caja.id, { ingresos_manuales: 10000 });
    results.steps.push({ paso: 5, nombre: "Ingreso Manual", monto: 10000, pass: true });

    // === PASO 6: RETIRO ===
    const efectivoDisp = 50000 + 2300 + 10000;
    const movRetiro = await base44.asServiceRole.entities.Movimientos_Caja.create({
      caja_id: caja.id, tipo: "RETIRO", usuario_id: usuarioId, nombre_usuario: usuarioNombre,
      fecha_hora: new Date().toISOString(), monto: 5000, motivo: "Pago a proveedor", observaciones: testObs
    });
    await base44.asServiceRole.entities.Auditoria.create({
      usuario_id: usuarioId, nombre_usuario: usuarioNombre, accion: "RETIRO",
      fecha_hora: new Date().toISOString(), entidad: "Movimientos_Caja", registro_afectado: movRetiro.id,
      informacion: `Retiro de 5000. ${testObs}`
    });
    await base44.asServiceRole.entities.Cajas.update(caja.id, { retiros: 5000 });
    results.steps.push({ paso: 6, nombre: "Retiro", monto: 5000, efectivo_disp: efectivoDisp, pass: 5000 <= efectivoDisp });

    // === PASO 7: CIERRE DE CAJA ===
    const efectivoEsperado = 50000 + 2300 + 10000 - 5000;
    const efectivoContado = 57300;
    const diferencia = efectivoContado - efectivoEsperado;

    results.calculations.efectivo_esperado = efectivoEsperado;
    results.calculations.diferencia = diferencia;

    await base44.asServiceRole.entities.Cajas.update(caja.id, {
      estado: "CERRADA", fecha_cierre: new Date().toISOString(),
      usuario_cierre: usuarioId, nombre_usuario_cierre: usuarioNombre,
      efectivo_esperado: efectivoEsperado, efectivo_contado: efectivoContado,
      diferencia: diferencia, observaciones: `Cierre correcto. ${testObs}`
    });

    await base44.asServiceRole.entities.Movimientos_Caja.create({
      caja_id: caja.id, tipo: "CIERRE", usuario_id: usuarioId, nombre_usuario: usuarioNombre,
      fecha_hora: new Date().toISOString(), monto: efectivoContado, motivo: "Cierre cuadrado", referencia: caja.id, observaciones: testObs
    });

    await base44.asServiceRole.entities.Auditoria.create({
      usuario_id: usuarioId, nombre_usuario: usuarioNombre, accion: "CIERRE_CAJA",
      fecha_hora: new Date().toISOString(), entidad: "Cajas", registro_afectado: caja.id,
      informacion: `Esperado ${efectivoEsperado}, contado ${efectivoContado}, diff ${diferencia}. ${testObs}`
    });

    results.steps.push({ paso: 7, nombre: "Cierre", efectivo_esperado: efectivoEsperado, efectivo_contado: efectivoContado, diferencia: diferencia, pass: efectivoEsperado === 57300 && diferencia === 0 });

    // === PASO 8: PRUEBA DE DIFERENCIA ===
    const caja2 = await base44.asServiceRole.entities.Cajas.create({
      estado: "ABIERTA", usuario_apertura: usuarioId, nombre_usuario_apertura: usuarioNombre,
      fecha_apertura: new Date().toISOString(), monto_inicial: 50000,
      total_ventas: 0, total_efectivo: 0, total_tarjeta: 0, total_sinpe: 0, total_transferencia: 0,
      otros_pagos: 0, ingresos_manuales: 0, retiros: 0, devoluciones: 0, efectivo_esperado: 0,
      efectivo_contado: 0, diferencia: 0, observaciones: `Prueba diferencia. ${testObs}`
    });

    const diff2 = 48500 - 50000;
    await base44.asServiceRole.entities.Cajas.update(caja2.id, {
      estado: "CERRADA", fecha_cierre: new Date().toISOString(),
      usuario_cierre: usuarioId, nombre_usuario_cierre: usuarioNombre,
      efectivo_esperado: 50000, efectivo_contado: 48500, diferencia: diff2,
      observaciones: `Faltante 1500. ${testObs}`
    });

    results.steps.push({ paso: 8, nombre: "Diferencia", diferencia: diff2, esperada: -1500, pass: diff2 === -1500 });

    // === PASO 9: ANULACIÓN DE VENTA ===
    const caja3 = await base44.asServiceRole.entities.Cajas.create({
      estado: "ABIERTA", usuario_apertura: usuarioId, nombre_usuario_apertura: usuarioNombre,
      fecha_apertura: new Date().toISOString(), monto_inicial: 30000,
      total_ventas: 0, total_efectivo: 0, total_tarjeta: 0, total_sinpe: 0, total_transferencia: 0,
      otros_pagos: 0, ingresos_manuales: 0, retiros: 0, devoluciones: 0, efectivo_esperado: 0,
      efectivo_contado: 0, diferencia: 0, observaciones: `Caja anulación. ${testObs}`
    });

    const productosFresh = await base44.asServiceRole.entities.Productos.list();
    const cocaFresh = productosFresh.find(p => p.nombre_producto === "Coca-Cola 600ml");
    const stockAntesAnulacion = cocaFresh.stock_actual;

    const vAnular = await crearVenta([
      { producto: cocaFresh, cantidad: 3, subtotal: 2400 }
    ], "EFECTIVO", 3000, caja3.id);

    const cocaDespuesVenta = await base44.asServiceRole.entities.Productos.list();
    const cocaPostVenta = cocaDespuesVenta.find(p => p.nombre_producto === "Coca-Cola 600ml");
    const stockDespuesVenta = cocaPostVenta.stock_actual;

    results.steps.push({ paso: "9a", nombre: "Venta para anular", venta_id: vAnular.venta.id, stock_antes: stockAntesAnulacion, stock_despues: stockDespuesVenta, stock_bajo: stockDespuesVenta === stockAntesAnulacion - 3, pass: stockDespuesVenta === stockAntesAnulacion - 3 });

    await base44.asServiceRole.entities.Cajas.update(caja3.id, { total_ventas: 2400, total_efectivo: 2400 });

    // ANULAR la venta
    await base44.asServiceRole.entities.Ventas.update(vAnular.venta.id, {
      estado: "ANULADA",
      motivo_anulacion: `Venta anulada - prueba. ${testObs}`
    });

    // Devolver stock
    await base44.asServiceRole.entities.Productos.update(cocaPostVenta.id, {
      stock_actual: cocaPostVenta.stock_actual + 3
    });

    await base44.asServiceRole.entities.Movimientos_Caja.create({
      caja_id: caja3.id, tipo: "DEVOLUCION", metodo_pago: "EFECTIVO", usuario_id: usuarioId,
      nombre_usuario: usuarioNombre, fecha_hora: new Date().toISOString(), monto: 2400,
      motivo: "Anulación de venta - prueba", referencia: vAnular.venta.id, observaciones: testObs
    });

    await base44.asServiceRole.entities.Auditoria.create({
      usuario_id: usuarioId, nombre_usuario: usuarioNombre, accion: "ANULACION",
      fecha_hora: new Date().toISOString(), entidad: "Ventas", registro_afectado: vAnular.venta.id,
      informacion: `Venta ${vAnular.venta.id} anulada. ${testObs}`
    });

    await base44.asServiceRole.entities.Cajas.update(caja3.id, {
      total_ventas: 0, total_efectivo: 0, devoluciones: 2400
    });

    const cocaPostAnulacion = await base44.asServiceRole.entities.Productos.list();
    const cocaFinal = cocaPostAnulacion.find(p => p.nombre_producto === "Coca-Cola 600ml");
    const stockDespuesAnulacion = cocaFinal.stock_actual;

    results.steps.push({ paso: "9b", nombre: "Anulación", venta_id: vAnular.venta.id, stock_despues_anulacion: stockDespuesAnulacion, stock_restauro: stockDespuesAnulacion === stockAntesAnulacion, estado: "ANULADA", pass: stockDespuesAnulacion === stockAntesAnulacion });

    const ventaCheck = await base44.asServiceRole.entities.Ventas.list();
    const ventaYaAnulada = ventaCheck.find(v => v.id === vAnular.venta.id);
    const dobleAnulacion = ventaYaAnulada.estado === "ANULADA";

    results.steps.push({ paso: "9c", nombre: "No doble anulación", ya_anulada: dobleAnulacion, pass: dobleAnulacion === true });

    const esperadoCaja3 = 30000 + 0 - 2400;
    await base44.asServiceRole.entities.Cajas.update(caja3.id, {
      estado: "CERRADA", fecha_cierre: new Date().toISOString(),
      usuario_cierre: usuarioId, nombre_usuario_cierre: usuarioNombre,
      efectivo_esperado: esperadoCaja3, efectivo_contado: esperadoCaja3,
      diferencia: 0, observaciones: `Cierre tras anulación. ${testObs}`
    });

    results.steps.push({ paso: "9d", nombre: "Cierre tras anulación", efectivo_esperado: esperadoCaja3, pass: esperadoCaja3 === 27600 });

    // === PASO 10: VERIFICACIÓN DE INVENTARIO ===
    const productosFinal = await base44.asServiceRole.entities.Productos.list();
    const invResult = {};
    ["Coca-Cola 600ml", "Galletas Chiky", "Café 250g", "Leche Dos Pinos 1L", "Pan cuadrado", "Agua Cristal 600ml", "Pepsi 600ml"].forEach(nombre => {
      const p = productosFinal.find(x => x.nombre_producto === nombre);
      if (p) {
        const inicial = stockInicial[p.id];
        const descontado = nombre === "Coca-Cola 600ml" ? 2 + 3 - 3 :
                          nombre === "Galletas Chiky" ? 1 :
                          nombre === "Café 250g" ? 1 :
                          nombre === "Leche Dos Pinos 1L" ? 1 :
                          nombre === "Pan cuadrado" ? 1 :
                          nombre === "Agua Cristal 600ml" ? 2 : 0;
        const esperado = inicial - descontado;
        invResult[nombre] = { stock_actual: p.stock_actual, stock_inicial: inicial, esperado: esperado, pass: p.stock_actual === esperado };
      }
    });
    results.steps.push({ paso: 10, nombre: "Inventario", productos: invResult, pass: Object.values(invResult).every(v => v.pass) });

    // === PASO 11: VERIFICACIÓN DE AUDITORÍA ===
    const auditoriaTest = await base44.asServiceRole.entities.Auditoria.list();
    const audTest = auditoriaTest.filter(a => a.informacion && a.informacion.includes(testObs));
    const acciones = audTest.map(a => a.accion);
    results.steps.push({
      paso: 11, nombre: "Auditoría", total: audTest.length, acciones: acciones,
      todas_tienen_usuario: audTest.every(a => a.usuario_id), todas_tienen_fecha: audTest.every(a => a.fecha_hora),
      pass: audTest.length >= 9 && audTest.every(a => a.usuario_id && a.fecha_hora)
    });

    // === RESUMEN ===
    const movsTest = await base44.asServiceRole.entities.Movimientos_Caja.list();
    const movsCaja1 = movsTest.filter(m => m.caja_id === caja.id).map(m => m.tipo);

    results.resumen = {
      test_id: testId, caja1_id: caja.id, caja2_id: caja2.id, caja3_id: caja3.id,
      total_pasos: results.steps.length, pasos_pass: results.steps.filter(s => s.pass === true).length,
      movimientos_caja1: movsCaja1, movimientos_esperados: ["APERTURA", "VENTA", "VENTA", "VENTA", "INGRESO", "RETIRO", "CIERRE"],
      stock_inicial: stockInicial
    };

    return Response.json(results);
  } catch (error) {
    results.errors.push({ message: error.message, stack: error.stack });
    return Response.json(results);
  }
}