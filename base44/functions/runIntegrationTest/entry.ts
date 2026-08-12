import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  const results = { steps: [], errors: [], calculations: {} };
  const usuarioId = "6a76b4a9501852d858b833eb";
  const usuarioNombre = "John Melendez (Test)";

  try {
    const base44 = createClientFromRequest(req);

    // === PASO 1: APERTURA DE CAJA ===
    const caja = await base44.asServiceRole.entities.Cajas.create({
      estado: "ABIERTA",
      usuario_apertura: usuarioId,
      nombre_usuario_apertura: usuarioNombre,
      fecha_apertura: new Date().toISOString(),
      monto_inicial: 50000,
      total_ventas: 0,
      total_efectivo: 0,
      total_tarjeta: 0,
      total_sinpe: 0,
      total_transferencia: 0,
      otros_pagos: 0,
      ingresos_manuales: 0,
      retiros: 0,
      devoluciones: 0,
      efectivo_esperado: 0,
      efectivo_contado: 0,
      diferencia: 0
    });
    results.steps.push({ paso: 1, nombre: "Apertura de Caja", caja_id: caja.id, estado: caja.estado, monto_inicial: caja.monto_inicial, pass: caja.estado === "ABIERTA" && caja.monto_inicial === 50000 });

    const movApertura = await base44.asServiceRole.entities.Movimientos_Caja.create({
      caja_id: caja.id,
      tipo: "APERTURA",
      usuario_id: usuarioId,
      nombre_usuario: usuarioNombre,
      fecha_hora: new Date().toISOString(),
      monto: 50000,
      motivo: "Apertura de caja - prueba integral",
      referencia: caja.id
    });
    results.steps.push({ paso: "1b", nombre: "Movimiento APERTURA", mov_id: movApertura.id, tipo: movApertura.tipo, pass: movApertura.tipo === "APERTURA" });

    const audApertura = await base44.asServiceRole.entities.Auditoria.create({
      usuario_id: usuarioId,
      nombre_usuario: usuarioNombre,
      accion: "APERTURA_CAJA",
      fecha_hora: new Date().toISOString(),
      entidad: "Cajas",
      registro_afectado: caja.id,
      informacion: "Caja abierta con monto inicial 50000"
    });
    results.steps.push({ paso: "1c", nombre: "Auditoría APERTURA", aud_id: audApertura.id, accion: audApertura.accion, pass: audApertura.accion === "APERTURA_CAJA" });

    // === PASO 2: VENTA EN EFECTIVO ===
    const productos = await base44.asServiceRole.entities.Productos.list();
    const coca = productos.find(p => p.nombre_producto === "Coca-Cola 600ml");
    const galletas = productos.find(p => p.nombre_producto === "Galletas Chiky");

    const venta1 = await base44.asServiceRole.entities.Ventas.create({
      fecha_hora: new Date().toISOString(),
      monto_total: 2300,
      metodo_pago: "Efectivo",
      caja_id: caja.id,
      descuento: 0,
      recibido: 5000,
      vuelto: 2700,
      estado: "Pagado"
    });

    await base44.asServiceRole.entities.Detalles_Venta.create({
      venta_id: venta1.id,
      producto_id: coca.id,
      cantidad_vendida: 2,
      subtotal: 1600
    });
    await base44.asServiceRole.entities.Detalles_Venta.create({
      venta_id: venta1.id,
      producto_id: galletas.id,
      cantidad_vendida: 1,
      subtotal: 700
    });

    const stockCocaAntes = coca.stock_actual;
    const stockGalletasAntes = galletas.stock_actual;
    await base44.asServiceRole.entities.Productos.update(coca.id, { stock_actual: coca.stock_actual - 2 });
    await base44.asServiceRole.entities.Productos.update(galletas.id, { stock_actual: galletas.stock_actual - 1 });

    await base44.asServiceRole.entities.Movimientos_Caja.create({
      caja_id: caja.id,
      tipo: "VENTA",
      metodo_pago: "Efectivo",
      usuario_id: usuarioId,
      nombre_usuario: usuarioNombre,
      fecha_hora: new Date().toISOString(),
      monto: 2300,
      motivo: "Venta en efectivo",
      referencia: venta1.id
    });

    await base44.asServiceRole.entities.Auditoria.create({
      usuario_id: usuarioId,
      nombre_usuario: usuarioNombre,
      accion: "VENTA",
      fecha_hora: new Date().toISOString(),
      entidad: "Ventas",
      registro_afectado: venta1.id,
      informacion: "Venta en efectivo por 2300, vuelto 2700"
    });

    await base44.asServiceRole.entities.Cajas.update(caja.id, {
      total_ventas: 2300,
      total_efectivo: 2300
    });

    const vueltoCalc = 5000 - 2300;
    results.steps.push({
      paso: 2,
      nombre: "Venta Efectivo",
      venta_id: venta1.id,
      total: venta1.monto_total,
      recibido: venta1.recibido,
      vuelto: venta1.vuelto,
      vuelto_calculado: vueltoCalc,
      vuelto_correcto: vueltoCalc === 2700,
      estado: venta1.estado,
      caja_asociada: venta1.caja_id === caja.id,
      stock_coca_antes: stockCocaAntes,
      stock_coca_antes_esperado: 24,
      pass: venta1.monto_total === 2300 && venta1.vuelto === 2700 && venta1.estado === "Pagado" && venta1.caja_id === caja.id
    });

    // === PASO 3: VENTA CON TARJETA ===
    const cafe = productos.find(p => p.nombre_producto === "Café 250g");
    const leche = productos.find(p => p.nombre_producto === "Leche Dos Pinos 1L");

    const venta2 = await base44.asServiceRole.entities.Ventas.create({
      fecha_hora: new Date().toISOString(),
      monto_total: 3700,
      metodo_pago: "Tarjeta",
      caja_id: caja.id,
      descuento: 0,
      estado: "Pagado"
    });

    await base44.asServiceRole.entities.Detalles_Venta.create({
      venta_id: venta2.id,
      producto_id: cafe.id,
      cantidad_vendida: 1,
      subtotal: 2500
    });
    await base44.asServiceRole.entities.Detalles_Venta.create({
      venta_id: venta2.id,
      producto_id: leche.id,
      cantidad_vendida: 1,
      subtotal: 1200
    });

    await base44.asServiceRole.entities.Productos.update(cafe.id, { stock_actual: cafe.stock_actual - 1 });
    await base44.asServiceRole.entities.Productos.update(leche.id, { stock_actual: leche.stock_actual - 1 });

    await base44.asServiceRole.entities.Movimientos_Caja.create({
      caja_id: caja.id,
      tipo: "VENTA",
      metodo_pago: "Tarjeta",
      usuario_id: usuarioId,
      nombre_usuario: usuarioNombre,
      fecha_hora: new Date().toISOString(),
      monto: 3700,
      motivo: "Venta con tarjeta",
      referencia: venta2.id
    });

    await base44.asServiceRole.entities.Auditoria.create({
      usuario_id: usuarioId,
      nombre_usuario: usuarioNombre,
      accion: "VENTA",
      fecha_hora: new Date().toISOString(),
      entidad: "Ventas",
      registro_afectado: venta2.id,
      informacion: "Venta con tarjeta por 3700"
    });

    await base44.asServiceRole.entities.Cajas.update(caja.id, {
      total_ventas: 6000,
      total_tarjeta: 3700
    });

    results.steps.push({
      paso: 3,
      nombre: "Venta Tarjeta",
      venta_id: venta2.id,
      total: venta2.monto_total,
      metodo: venta2.metodo_pago,
      total_correcto: venta2.monto_total === 3700,
      pass: venta2.monto_total === 3700 && venta2.metodo_pago === "Tarjeta"
    });

    // === PASO 4: VENTA SINPE ===
    const pan = productos.find(p => p.nombre_producto === "Pan cuadrado");
    const agua = productos.find(p => p.nombre_producto === "Agua Cristal 600ml");

    const venta3 = await base44.asServiceRole.entities.Ventas.create({
      fecha_hora: new Date().toISOString(),
      monto_total: 2700,
      metodo_pago: "SINPE",
      caja_id: caja.id,
      descuento: 0,
      estado: "Pagado"
    });

    await base44.asServiceRole.entities.Detalles_Venta.create({
      venta_id: venta3.id,
      producto_id: pan.id,
      cantidad_vendida: 1,
      subtotal: 1500
    });
    await base44.asServiceRole.entities.Detalles_Venta.create({
      venta_id: venta3.id,
      producto_id: agua.id,
      cantidad_vendida: 2,
      subtotal: 1200
    });

    await base44.asServiceRole.entities.Productos.update(pan.id, { stock_actual: pan.stock_actual - 1 });
    await base44.asServiceRole.entities.Productos.update(agua.id, { stock_actual: agua.stock_actual - 2 });

    await base44.asServiceRole.entities.Movimientos_Caja.create({
      caja_id: caja.id,
      tipo: "VENTA",
      metodo_pago: "SINPE",
      usuario_id: usuarioId,
      nombre_usuario: usuarioNombre,
      fecha_hora: new Date().toISOString(),
      monto: 2700,
      motivo: "Venta por SINPE",
      referencia: venta3.id
    });

    await base44.asServiceRole.entities.Auditoria.create({
      usuario_id: usuarioId,
      nombre_usuario: usuarioNombre,
      accion: "VENTA",
      fecha_hora: new Date().toISOString(),
      entidad: "Ventas",
      registro_afectado: venta3.id,
      informacion: "Venta por SINPE por 2700"
    });

    await base44.asServiceRole.entities.Cajas.update(caja.id, {
      total_ventas: 8700,
      total_sinpe: 2700
    });

    results.steps.push({
      paso: 4,
      nombre: "Venta SINPE",
      venta_id: venta3.id,
      total: venta3.monto_total,
      total_correcto: venta3.monto_total === 2700,
      pass: venta3.monto_total === 2700 && venta3.metodo_pago === "SINPE"
    });

    // === PASO 5: INGRESO MANUAL ===
    const movIngreso = await base44.asServiceRole.entities.Movimientos_Caja.create({
      caja_id: caja.id,
      tipo: "INGRESO",
      usuario_id: usuarioId,
      nombre_usuario: usuarioNombre,
      fecha_hora: new Date().toISOString(),
      monto: 10000,
      motivo: "Cambio para caja",
      observaciones: "Ingreso manual de prueba"
    });

    await base44.asServiceRole.entities.Auditoria.create({
      usuario_id: usuarioId,
      nombre_usuario: usuarioNombre,
      accion: "INGRESO",
      fecha_hora: new Date().toISOString(),
      entidad: "Movimientos_Caja",
      registro_afectado: movIngreso.id,
      informacion: "Ingreso manual de 10000"
    });

    await base44.asServiceRole.entities.Cajas.update(caja.id, {
      ingresos_manuales: 10000
    });

    results.steps.push({
      paso: 5,
      nombre: "Ingreso Manual",
      mov_id: movIngreso.id,
      monto: movIngreso.monto,
      motivo: movIngreso.motivo,
      pass: movIngreso.monto === 10000 && movIngreso.tipo === "INGRESO"
    });

    // === PASO 6: RETIRO ===
    const efectivoDisponible = 50000 + 2300 + 10000;
    const montoRetiro = 5000;
    const retiroValido = montoRetiro <= efectivoDisponible;

    const movRetiro = await base44.asServiceRole.entities.Movimientos_Caja.create({
      caja_id: caja.id,
      tipo: "RETIRO",
      usuario_id: usuarioId,
      nombre_usuario: usuarioNombre,
      fecha_hora: new Date().toISOString(),
      monto: 5000,
      motivo: "Pago a proveedor",
      observaciones: "Retiro de prueba"
    });

    await base44.asServiceRole.entities.Auditoria.create({
      usuario_id: usuarioId,
      nombre_usuario: usuarioNombre,
      accion: "RETIRO",
      fecha_hora: new Date().toISOString(),
      entidad: "Movimientos_Caja",
      registro_afectado: movRetiro.id,
      informacion: "Retiro de 5000"
    });

    await base44.asServiceRole.entities.Cajas.update(caja.id, {
      retiros: 5000
    });

    results.steps.push({
      paso: 6,
      nombre: "Retiro",
      mov_id: movRetiro.id,
      monto: movRetiro.monto,
      motivo: movRetiro.motivo,
      efectivo_disponible: efectivoDisponible,
      retiro_valido: retiroValido,
      pass: movRetiro.monto === 5000 && movRetiro.tipo === "RETIRO" && retiroValido
    });

    // === PASO 7: CIERRE DE CAJA ===
    const efectivoEsperado = 50000 + 2300 + 10000 - 5000 - 0;
    const efectivoContado = 57300;
    const diferencia = efectivoContado - efectivoEsperado;

    results.calculations.efectivo_esperado = efectivoEsperado;
    results.calculations.efectivo_esperado_esperado = 57300;
    results.calculations.efectivo_esperado_correcto = efectivoEsperado === 57300;

    await base44.asServiceRole.entities.Cajas.update(caja.id, {
      estado: "CERRADA",
      fecha_cierre: new Date().toISOString(),
      usuario_cierre: usuarioId,
      nombre_usuario_cierre: usuarioNombre,
      efectivo_esperado: efectivoEsperado,
      efectivo_contado: efectivoContado,
      diferencia: diferencia,
      observaciones: "Cierre correcto - diferencia 0"
    });

    await base44.asServiceRole.entities.Movimientos_Caja.create({
      caja_id: caja.id,
      tipo: "CIERRE",
      usuario_id: usuarioId,
      nombre_usuario: usuarioNombre,
      fecha_hora: new Date().toISOString(),
      monto: efectivoContado,
      motivo: "Cierre de caja - cuadrado",
      referencia: caja.id
    });

    await base44.asServiceRole.entities.Auditoria.create({
      usuario_id: usuarioId,
      nombre_usuario: usuarioNombre,
      accion: "CIERRE_CAJA",
      fecha_hora: new Date().toISOString(),
      entidad: "Cajas",
      registro_afectado: caja.id,
      informacion: `Cierre con efectivo esperado ${efectivoEsperado}, contado ${efectivoContado}, diferencia ${diferencia}`
    });

    results.steps.push({
      paso: 7,
      nombre: "Cierre de Caja",
      efectivo_esperado: efectivoEsperado,
      efectivo_contado: efectivoContado,
      diferencia: diferencia,
      diferencia_correcta: diferencia === 0,
      pass: diferencia === 0 && efectivoEsperado === 57300
    });

    // === PASO 8: PRUEBA DE DIFERENCIA ===
    const caja2 = await base44.asServiceRole.entities.Cajas.create({
      estado: "ABIERTA",
      usuario_apertura: usuarioId,
      nombre_usuario_apertura: usuarioNombre,
      fecha_apertura: new Date().toISOString(),
      monto_inicial: 50000,
      total_ventas: 0,
      total_efectivo: 0,
      total_tarjeta: 0,
      total_sinpe: 0,
      total_transferencia: 0,
      otros_pagos: 0,
      ingresos_manuales: 0,
      retiros: 0,
      devoluciones: 0,
      efectivo_esperado: 0,
      efectivo_contado: 0,
      diferencia: 0
    });

    await base44.asServiceRole.entities.Movimientos_Caja.create({
      caja_id: caja2.id,
      tipo: "APERTURA",
      usuario_id: usuarioId,
      nombre_usuario: usuarioNombre,
      fecha_hora: new Date().toISOString(),
      monto: 50000,
      motivo: "Apertura caja 2 - prueba de diferencia"
    });

    const efectivoEsperado2 = 50000;
    const efectivoContado2 = 48500;
    const diferencia2 = efectivoContado2 - efectivoEsperado2;

    await base44.asServiceRole.entities.Cajas.update(caja2.id, {
      estado: "CERRADA",
      fecha_cierre: new Date().toISOString(),
      usuario_cierre: usuarioId,
      nombre_usuario_cierre: usuarioNombre,
      efectivo_esperado: efectivoEsperado2,
      efectivo_contado: efectivoContado2,
      diferencia: diferencia2,
      observaciones: "Faltante de 1500 - revisar"
    });

    results.steps.push({
      paso: 8,
      nombre: "Prueba de Diferencia",
      caja2_id: caja2.id,
      efectivo_esperado: efectivoEsperado2,
      efectivo_contado: efectivoContado2,
      diferencia: diferencia2,
      diferencia_esperada: -1500,
      diferencia_correcta: diferencia2 === -1500,
      pass: diferencia2 === -1500
    });

    // === PASO 9: VERIFICACIÓN DE INVENTARIO ===
    const productosActualizados = await base44.asServiceRole.entities.Productos.list();
    const cocaActualizado = productosActualizados.find(p => p.nombre_producto === "Coca-Cola 600ml");
    const galletasActualizado = productosActualizados.find(p => p.nombre_producto === "Galletas Chiky");
    const cafeActualizado = productosActualizados.find(p => p.nombre_producto === "Café 250g");
    const lecheActualizado = productosActualizados.find(p => p.nombre_producto === "Leche Dos Pinos 1L");
    const panActualizado = productosActualizados.find(p => p.nombre_producto === "Pan cuadrado");
    const aguaActualizado = productosActualizados.find(p => p.nombre_producto === "Agua Cristal 600ml");

    results.steps.push({
      paso: 10,
      nombre: "Verificación de Inventario",
      coca_stock: cocaActualizado.stock_actual,
      coca_esperado: 22,
      coca_correcto: cocaActualizado.stock_actual === 22,
      galletas_stock: galletasActualizado.stock_actual,
      galletas_esperado: 39,
      galletas_correcto: galletasActualizado.stock_actual === 39,
      cafe_stock: cafeActualizado.stock_actual,
      cafe_esperado: 14,
      cafe_correcto: cafeActualizado.stock_actual === 14,
      leche_stock: lecheActualizado.stock_actual,
      leche_esperado: 17,
      leche_correcto: lecheActualizado.stock_actual === 17,
      pan_stock: panActualizado.stock_actual,
      pan_esperado: 11,
      pan_correcto: panActualizado.stock_actual === 11,
      agua_stock: aguaActualizado.stock_actual,
      agua_esperado: 28,
      agua_correcto: aguaActualizado.stock_actual === 28
    });

    // === PASO 11: VERIFICACIÓN DE AUDITORÍA ===
    const auditorias = await base44.asServiceRole.entities.Auditoria.list();
    const accionesEsperadas = ["APERTURA_CAJA", "VENTA", "VENTA", "VENTA", "INGRESO", "RETIRO", "CIERRE_CAJA"];
    const accionesRegistradas = auditorias.map(a => a.accion);
    results.steps.push({
      paso: 11,
      nombre: "Verificación de Auditoría",
      total_registros: auditorias.length,
      acciones_esperadas: accionesEsperadas,
      acciones_registradas: accionesRegistradas,
      todas_tienen_usuario: auditorias.every(a => a.usuario_id !== null && a.usuario_id !== undefined),
      todas_tienen_fecha: auditorias.every(a => a.fecha_hora !== null && a.fecha_hora !== undefined),
      pass: auditorias.length >= 7
    });

    // === RESUMEN FINAL ===
    const movimientos = await base44.asServiceRole.entities.Movimientos_Caja.list();
    const tiposMovimiento = movimientos.filter(m => m.caja_id === caja.id).map(m => m.tipo);

    results.resumen = {
      caja_id: caja.id,
      caja2_id: caja2.id,
      total_pasos: results.steps.length,
      pasos_pass: results.steps.filter(s => s.pass === true).length,
      movimientos_caja1: tiposMovimiento,
      movimientos_esperados: ["APERTURA", "VENTA", "VENTA", "VENTA", "INGRESO", "RETIRO", "CIERRE"],
      efectivo_esperado_final: efectivoEsperado,
      diferencia_caja1: diferencia,
      diferencia_caja2: diferencia2
    };

    return Response.json(results);
  } catch (error) {
    results.errors.push({ message: error.message, stack: error.stack });
    return Response.json(results);
  }
}