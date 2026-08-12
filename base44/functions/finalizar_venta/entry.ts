import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { obtenerCajaAbierta, registrarAuditoria } from '../../shared/caja.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const { carrito, metodo_pago, cliente_id, recibido, descuento } = body;

    if (!Array.isArray(carrito) || carrito.length === 0) {
      return Response.json({ error: 'El carrito está vacío' }, { status: 400 });
    }
    const metodosValidos = ['EFECTIVO', 'TARJETA', 'SINPE', 'TRANSFERENCIA', 'OTRO', 'Fiado'];
    if (!metodosValidos.includes(metodo_pago)) {
      return Response.json({ error: 'Método de pago inválido' }, { status: 400 });
    }

    // Validar que exista una caja abierta para el usuario
    const caja = await obtenerCajaAbierta(base44, user);
    if (!caja) {
      return Response.json({ error: 'Debe abrir una caja antes de registrar ventas' }, { status: 400 });
    }

    let cliente = null;
    if (metodo_pago === 'Fiado') {
      if (!cliente_id) {
        return Response.json({ error: 'Debe seleccionar un cliente para ventas a crédito' }, { status: 400 });
      }
      cliente = await base44.asServiceRole.entities.Clientes.get(cliente_id);
      if (!cliente) return Response.json({ error: 'Cliente no encontrado' }, { status: 400 });
    }

    // Validar stock disponible y calcular total
    let monto_total = 0;
    const lineas = [];
    for (const item of carrito) {
      const producto = await base44.entities.Productos.get(item.producto_id);
      const cantidad = parseInt(item.cantidad, 10);
      if (!producto) return Response.json({ error: 'Producto no encontrado' }, { status: 400 });
      if (cantidad <= 0) return Response.json({ error: 'La cantidad debe ser mayor a 0' }, { status: 400 });
      const nuevoStock = (producto.stock_actual || 0) - cantidad;
      if (nuevoStock < 0) {
        return Response.json({ error: `Stock insuficiente para ${producto.nombre_producto}` }, { status: 400 });
      }
      const subtotal = cantidad * (producto.precio_venta || 0);
      monto_total += subtotal;
      lineas.push({ producto, cantidad, subtotal, nuevoStock });
    }

    const desc = Math.max(0, Number(descuento) || 0);
    monto_total = Math.max(0, monto_total - desc);

    const estado = metodo_pago === 'Fiado' ? 'Pendiente' : 'COMPLETADA';
    if (metodo_pago === 'Fiado') {
      const saldo = Number(cliente.saldo_pendiente) || 0;
      const limite = Number(cliente.limite_credito) || 0;
      if (saldo + monto_total > limite) {
        return Response.json({ error: 'El cliente no tiene crédito suficiente' }, { status: 400 });
      }
    }

    // Efectivo: validar dinero recibido y calcular vuelto
    let recibidoNum = null;
    let vuelto = 0;
    if (metodo_pago === 'EFECTIVO') {
      recibidoNum = Number(recibido);
      if (isNaN(recibidoNum) || recibidoNum < monto_total) {
        return Response.json({ error: 'El dinero recibido es inferior al total' }, { status: 400 });
      }
      vuelto = parseFloat((recibidoNum - monto_total).toFixed(2));
    }

    // 1. Crear la venta
    const venta = await base44.entities.Ventas.create({
      fecha_hora: new Date().toISOString(),
      monto_total: parseFloat(monto_total.toFixed(2)),
      metodo_pago,
      usuario_id: user.id,
      estado,
      cliente_id: metodo_pago === 'Fiado' ? cliente.id : null,
      caja_id: caja.id,
      descuento: parseFloat(desc.toFixed(2)),
      recibido: recibidoNum !== null ? parseFloat(recibidoNum.toFixed(2)) : null,
      vuelto
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

    // 3. Actualizar saldo del cliente (ventas a crédito)
    if (metodo_pago === 'Fiado') {
      const saldoActual = Number(cliente.saldo_pendiente) || 0;
      await base44.asServiceRole.entities.Clientes.update(cliente.id, {
        saldo_pendiente: parseFloat((saldoActual + monto_total).toFixed(2))
      });
    }

    // 4. Movimiento de caja (VENTA)
    await base44.entities.Movimientos_Caja.create({
      caja_id: caja.id,
      tipo: 'VENTA',
      usuario_id: user.id,
      nombre_usuario: user.full_name || user.email,
      fecha_hora: new Date().toISOString(),
      monto: parseFloat(monto_total.toFixed(2)),
      metodo_pago,
      motivo: `Venta ${venta.id}`,
      referencia: venta.id
    });

    await registrarAuditoria(base44, user, 'VENTA', 'Ventas', venta.id, { monto_total, metodo_pago });

    return Response.json({ success: true, venta_id: venta.id, monto_total, vuelto, alertas: alertasGeneradas });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}