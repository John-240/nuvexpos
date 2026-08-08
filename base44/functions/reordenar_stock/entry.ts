import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    let body;
    try { body = await req.json(); } catch (e) { body = {}; }
    const { producto_id } = body || {};

    if (!producto_id) return Response.json({ error: 'producto_id es requerido' }, { status: 400 });

    const producto = await base44.asServiceRole.entities.Productos.get(producto_id);
    if (!producto) return Response.json({ error: 'Producto no encontrado' }, { status: 404 });

    const stockActual = Number(producto.stock_actual) || 0;
    const stockMinimo = Number(producto.stock_minimo) || 0;

    if (stockActual > stockMinimo) {
      return Response.json({ success: true, mensaje: 'El stock está por encima del mínimo, no se requiere reposición.' });
    }

    // Alerta para el gerente
    const mensaje = `Alerta de reposición: el producto ${producto.nombre_producto} tiene stock bajo (${stockActual} unidades). Stock mínimo: ${stockMinimo}. Se inició una compra de reposición.`;
    await base44.asServiceRole.entities.Alertas.create({
      mensaje,
      producto_id: producto.id,
      nombre_producto: producto.nombre_producto,
      stock_actual: stockActual,
      stock_minimo: stockMinimo,
      leida: false,
      fecha: new Date().toISOString()
    });

    // Iniciar compra de reposición: llevar el stock al doble del mínimo
    const objetivo = stockMinimo * 2;
    const cantidadReorden = Math.max(1, objetivo - stockActual);
    const precioCosto = Number(producto.precio_costo) || 0;
    const monto = cantidadReorden * precioCosto;

    const gasto = await base44.asServiceRole.entities.Gastos.create({
      fecha: new Date().toISOString(),
      concepto: `Reposición de stock: ${producto.nombre_producto} (${cantidadReorden} unidades)`,
      categoria: 'Compra de Mercancía',
      monto: parseFloat(monto.toFixed(2)),
      proveedor: 'Pendiente de asignar'
    });

    return Response.json({
      success: true,
      alerta_creada: true,
      gasto_id: gasto.id,
      cantidad_reorden: cantidadReorden,
      monto
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}