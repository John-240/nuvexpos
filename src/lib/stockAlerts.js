import { base44 } from '@/api/base44Client';

// Crea una alerta de stock bajo si el producto quedó en o bajo el mínimo,
// siempre que no exista ya una alerta activa (leida=false) para ese producto.
export async function ensureStockAlert(producto) {
  if (!producto?.id) return;
  const stock = producto.stock_actual || 0;
  const min = producto.stock_minimo || 0;
  if (stock > min) return;
  try {
    const existing = await base44.entities.Alertas.filter({ producto_id: producto.id, leida: false });
    if (existing.length > 0) return;
    await base44.entities.Alertas.create({
      mensaje: `Alerta: ${producto.nombre_producto} tiene stock bajo (${stock} unidades). Stock mínimo: ${min}.`,
      producto_id: producto.id,
      nombre_producto: producto.nombre_producto,
      stock_actual: stock,
      stock_minimo: min,
      leida: false,
      descartada: false,
      fecha: new Date().toISOString()
    });
  } catch {
    // no crítico
  }
}