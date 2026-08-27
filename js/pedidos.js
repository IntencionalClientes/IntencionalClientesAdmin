/* ═══════════════════════════════════════════════════════════
   PEDIDOS — lo que entra desde el Catálogo. La gestión del día a
   día pasa por la app de Intencional; acá es una vista espejo
   para consultarlos (y cambiarles el estado si hace falta) sin
   tener que abrir la otra app. Es la misma tabla en los dos
   lugares, así que lo que se cambia acá se ve allá y viceversa.
   El stock ya quedó descontado en el momento del pedido (lo hace
   la función crear_pedido_b2b en la base); acá no se toca stock.
   ═══════════════════════════════════════════════════════════ */

var _pedidosB2B = [];
var _pedidosB2BItems = [];
var _pedidoEstadoFiltro = '';   // '' = todos
var _pedidoBusca = '';

var ESTADOS_PEDIDO = [
  { v: 'pendiente',  t: 'Pendiente',  pin: 'warn' },
  { v: 'preparando', t: 'Preparando', pin: 'info' },
  { v: 'listo',      t: 'Listo',      pin: 'ok' },
  { v: 'entregado',  t: 'Entregado',  pin: 'neutro' },
  { v: 'cancelado',  t: 'Cancelado',  pin: 'danger' }
];
function estadoPedidoInfo(v) { return ESTADOS_PEDIDO.find(function (e) { return e.v === v; }) || ESTADOS_PEDIDO[0]; }

registrarPagina({
  id: 'pedidos',
  menu: 'Pedidos',
  grupo: 'Catálogo',
  icono: 'cart',
  titulo: 'Pedidos',
  subtitulo: 'Vista de consulta — se gestionan principalmente desde la app de Intencional',

  async montar(cont) {
    var r = await Promise.all([traerCacheado('pedidos_b2b'), traerCacheado('pedidos_b2b_items'), traerCacheado('colores')]);
    _pedidosB2B = r[0]; _pedidosB2BItems = r[1]; _colores = r[2];
    cont.innerHTML = '<div id="pedidos-cuerpo"></div>';
    pintarPedidos();
  }
});

function pedidosFiltrados() {
  var q = normalizar(_pedidoBusca);
  return _pedidosB2B.filter(function (p) {
    if (_pedidoEstadoFiltro && p.estado !== _pedidoEstadoFiltro) return false;
    if (!q) return true;
    return normalizar(p.numero).indexOf(q) !== -1 || normalizar(p.local_nombre).indexOf(q) !== -1 ||
      normalizar(p.telefono).indexOf(q) !== -1 || normalizar(p.localidad).indexOf(q) !== -1;
  }).slice().sort(function (a, b) { return String(b.creado_en).localeCompare(String(a.creado_en)); });
}

/* ── Pedidos activos en la misma zona ─────────────────────────
   No es geolocalización real (no tenemos coordenadas, solo el
   texto de localidad que escribe cada local): se avisa cuando la
   localidad de un pedido coincide o está contenida en la de otro
   (ej: "San Isidro" y "San Isidro Centro"), entre pedidos que
   todavía no se entregaron ni cancelaron. Sirve como recordatorio
   para aprovechar el mismo viaje, no como un cálculo de distancia. */
function pedidosEnZonaCercana(p) {
  var loc = normalizar(p.localidad);
  if (!loc) return [];
  return _pedidosB2B.filter(function (o) {
    if (o.id === p.id) return false;
    if (o.estado === 'entregado' || o.estado === 'cancelado') return false;
    var locO = normalizar(o.localidad);
    if (!locO) return false;
    return locO === loc || locO.indexOf(loc) !== -1 || loc.indexOf(locO) !== -1;
  });
}

function fechaHoraCorta(iso) {
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function pintarPedidos() {
  var cont = porId('pedidos-cuerpo');
  if (!cont) return;

  var pendientes = _pedidosB2B.filter(function (p) { return p.estado === 'pendiente'; }).length;
  var unidadesTotales = _pedidosB2B.reduce(function (s, p) { return s + (+p.total_unidades || 0); }, 0);

  cont.innerHTML =
    '<div class="grilla-stats" style="margin-bottom:16px">' +
      stat('cart', 'Pedidos', String(_pedidosB2B.length), plural(_pedidosB2B.length, 'pedido'), 'var(--rose)') +
      (pendientes ? stat('alert', 'Pendientes', String(pendientes), 'Por preparar', 'var(--warn)') : '') +
      stat('box', 'Unidades pedidas', String(unidadesTotales), 'En total', 'var(--rose)') +
    '</div>' +

    '<div class="buscador" style="margin-bottom:12px">' +
      '<span class="ic-lupa">' + ic('search', 15) + '</span>' +
      '<input class="campo-input" value="' + esc(_pedidoBusca) + '" placeholder="Número, local, teléfono o localidad" ' +
        'oninput="setBuscaPedido(this.value)"/>' +
    '</div>' +

    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px" id="pedidos-chips"></div>' +
    '<div id="pedidos-lista"></div>';

  pintarChipsPedidos();
  pintarListaPedidos();
}

function pintarChipsPedidos() {
  var cont = porId('pedidos-chips');
  if (!cont) return;
  var opciones = [['', 'Todos', _pedidosB2B.length]].concat(ESTADOS_PEDIDO.map(function (e) {
    return [e.v, e.t, _pedidosB2B.filter(function (p) { return p.estado === e.v; }).length];
  }));
  cont.innerHTML = opciones.map(function (o) {
    return '<button class="btn ' + (_pedidoEstadoFiltro === o[0] ? 'btn-primario' : 'btn-secundario') + '" ' +
      'style="padding:6px 13px;font-size:12.5px" onclick="setEstadoFiltroPedido(\'' + o[0] + '\')">' +
      esc(o[1]) + ' <span class="pin pin-neutro" style="margin-left:2px">' + o[2] + '</span></button>';
  }).join('');
}

function setBuscaPedido(v) { _pedidoBusca = v; pintarListaPedidos(); }
function setEstadoFiltroPedido(v) { _pedidoEstadoFiltro = v; pintarChipsPedidos(); pintarListaPedidos(); }

function pintarListaPedidos() {
  var cont = porId('pedidos-lista');
  if (!cont) return;
  var lista = pedidosFiltrados();
  if (!lista.length) {
    cont.innerHTML = vacio('cart', 'Sin pedidos por acá', 'Los pedidos que hagan los locales desde el catálogo van a aparecer solos.');
    return;
  }
  cont.innerHTML = '<div class="lista">' + lista.map(filaPedido).join('') + '</div>';
}

function filaPedido(p) {
  var e = estadoPedidoInfo(p.estado);
  var cercanos = pedidosEnZonaCercana(p).length;
  return '<button class="fila" onclick="abrirPedido(' + p.id + ')">' +
    '<span class="num-cliente">' + esc(p.numero.replace('PED-', '#')) + '</span>' +
    '<div class="fila-principal">' +
      '<div class="fila-titulo">' + esc(p.local_nombre) + '</div>' +
      '<div class="fila-sub">' + esc(fechaHoraCorta(p.creado_en)) +
        (p.localidad ? ' · ' + ic('map', 11) + ' ' + esc(p.localidad) : '') + ' · ' + esc(p.telefono) + ' · ' +
        plural(p.total_productos, 'producto') + ', ' + plural(p.total_unidades, 'unidad') +
      '</div>' +
    '</div>' +
    '<div class="fila-derecha">' +
      '<span class="pin pin-' + e.pin + '">' + esc(e.t) + '</span>' +
      (cercanos ? '<span class="pin pin-info" style="font-size:10px">' + ic('truck', 10) + ' ' + plural(cercanos, 'cerca') + '</span>' : '') +
    '</div>' +
  '</button>';
}

/* ── Detalle de un pedido ─────────────────────────────────── */
function abrirPedido(id) {
  var p = _pedidosB2B.find(function (x) { return x.id === id; });
  if (!p) return;
  var items = _pedidosB2BItems.filter(function (it) { return it.pedido_id === id; });
  var cercanos = pedidosEnZonaCercana(p);

  abrirModal('Pedido ' + p.numero,
    '<div class="campo-ayuda" style="margin-bottom:10px">' + esc(fechaHoraCorta(p.creado_en)) + '</div>' +

    (cercanos.length ? avisoHTML('info',
      '<strong>Hay ' + plural(cercanos.length, 'otro pedido activo', 'otros pedidos activos') + ' en ' + esc(p.localidad) + '</strong>' +
      ' (o una zona con nombre parecido): considerá llevarlos juntos.<br>' +
      cercanos.map(function (o) {
        return '<a href="javascript:void(0)" onclick="cerrarModal();setTimeout(function(){abrirPedido(' + o.id + ')},10)" style="color:inherit;text-decoration:underline">' +
          esc(o.numero) + ' · ' + esc(o.local_nombre) + '</a>';
      }).join(' · '),
      'truck') : '') +

    '<div class="tarjeta" style="box-shadow:none;margin-bottom:12px">' +
      '<div class="tarjeta-cab">' + ic('store', 15) + ' Local</div>' +
      '<div class="tarjeta-cuerpo" style="padding:12px 14px">' +
        '<div class="fila-titulo">' + esc(p.local_nombre) + '</div>' +
        '<div class="fila-sub">' + ic('phone', 12) + ' ' + esc(p.telefono) +
          (p.contacto_nombre ? ' · ' + esc(p.contacto_nombre) : '') + '</div>' +
        (p.localidad ? '<div class="fila-sub" style="margin-top:2px">' + ic('map', 12) + ' ' + esc(p.localidad) + '</div>' : '') +
        (p.observaciones ? '<div class="vista-previa" style="margin-top:10px">' + esc(p.observaciones) + '</div>' : '') +
      '</div>' +
    '</div>' +

    '<div class="tarjeta-cab" style="border:none;padding:0 0 8px">' + ic('box', 15) + ' Productos' +
      '<span style="margin-left:auto"><span class="pin pin-neutro">' + plural(items.length, 'producto') + '</span></span>' +
    '</div>' +
    '<div class="lista" style="margin-bottom:14px">' +
      items.map(function (it) {
        var col = _colores.find(function (c) { return c.id === it.color_id; });
        var stockHoy = col ? (+col.stock || 0) : null;
        return '<div class="fila" style="cursor:default">' +
          '<div class="fila-principal">' +
            '<div class="fila-titulo">' + esc(it.codigo) + (it.nombre ? ' · ' + esc(it.nombre) : '') + '</div>' +
            '<div class="fila-sub">' + (stockHoy === null ? 'Color eliminado del catálogo' : 'Stock disponible hoy: ' + stockHoy) + '</div>' +
          '</div>' +
          '<div class="fila-derecha"><div class="fila-titulo">×' + esc(it.cantidad) + '</div></div>' +
        '</div>';
      }).join('') +
    '</div>' +

    '<div class="campo-etiq" style="margin-bottom:8px">Estado del pedido</div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
      ESTADOS_PEDIDO.map(function (e) {
        return '<button class="btn ' + (p.estado === e.v ? 'btn-primario' : 'btn-secundario') + '" ' +
          'style="padding:7px 12px;font-size:12.5px" onclick="cambiarEstadoPedido(' + p.id + ',\'' + e.v + '\')">' +
          esc(e.t) + '</button>';
      }).join('') +
    '</div>',

    '<button class="btn btn-fantasma btn-bloque" onclick="cerrarModal()">Cerrar</button>');
}

async function cambiarEstadoPedido(id, estado) {
  try {
    await actualizar('pedidos_b2b', id, { estado: estado });
    var p = _pedidosB2B.find(function (x) { return x.id === id; });
    if (p) p.estado = estado;
    toast('Estado actualizado: ' + estadoPedidoInfo(estado).t);
    abrirPedido(id);
    pintarPedidos();
  } catch (e) { toast(e.message, 'error'); }
}
