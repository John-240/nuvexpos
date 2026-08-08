import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { carrito, metodo_pago } = body;

    if (!Array.isArray(carrito) || carrito.length === 0) {
      return Response.json({ error: 'El carrito está vacío' }, { status: 400 });
    }
    const metodosValidos = ['Efectivo', 'Tarjeta', 'Transferencia'];
    if (!metodosValidos.includes(metodo_pago)) {
      return Response.json({ error: 'Método de pago inválido' }, { status: 400 });
    }

    // Validar stock disponible y calcular total
    let monto_total = 0;
    const lineas = [];
    for (const item of carrito) {
      const producto = await base44.entities.Productos.get(item.producto_id);
      const cantidad = parseInt(item.cantidad, 10);
      if (!producto) {
        return Response.json({ error: 'Producto no encontrado' }, { status: 400 });
      }
      if (cantidad <= 0) {
        return Response.json({ error: 'La cantidad debe ser mayor a 0' }, { status: 400 });
      }
      const nuevoStock = (producto.stock_actual || 0) - cantidad;
      if (nuevoStock < 0) {
        return Response.json({ error: `Stock insuficiente para ${producto.nombre_producto}` }, { status: 400 });
      }
      const subtotal = cantidad * (producto.precio_venta || 0);
      monto_total += subtotal;
      lineas.push({ producto, cantidad, subtotal, nuevoStock });
    }

    // 1. Crear la venta
    const venta = await base44.entities.Ventas.create({
      fecha_hora: new Date().toISOString(),
      monto_total: parseFloat(monto_total.toFixed(2)),
      metodo_pago
    });

    // 2. Crear detalles y descontar stock
    const alertasGeneradas = [];
    for (const linea of lineas) {
      await base44.entities.Detalles_Venta.create({
        venta_id: venta.id,
        producto_id: linea.producto.id,
        cantidad_vendida: linea.cantidad,
        subtotal: parseFloat(linea.subtotal.toFixed(2))
      });
      await base44.entities.Productos.update(linea.producto.id, {
        stock_actual: linea.nuevoStock
      });
      // 3. Alerta de stock mínimo
      if (linea.nuevoStock <= (linea.producto.stock_minimo || 0)) {
        const mensaje = `Alerta: El producto ${linea.producto.nombre_producto} tiene stock bajo (${linea.nuevoStock} unidades). Stock mínimo: ${linea.producto.stock_minimo}.`;
        await base44.entities.Alertas.create({
          mensaje,
          producto_id: linea.producto.id,
          nombre_producto: linea.producto.nombre_producto,
          stock_actual: linea.nuevoStock,
          stock_minimo: linea.producto.stock_minimo || 0,
          leida: false,
          fecha: new Date().toISOString()
        });
        alertasGeneradas.push(mensaje);
      }
    }

    return Response.json({ success: true, venta_id: venta.id, monto_total, alertas: alertasGeneradas });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}