/* ═══════════════════════════════════════════════════════════
   PACKS — combos armados con varios colores (esmaltes o
   semipermanentes) que se venden como un solo ítem, a un precio
   propio. Un pack vive en dos tablas: "packs" (nombre, precio,
   foto) y "pack_items" (qué colores trae, y cuántos de cada uno).
   Al guardar, se borran los renglones viejos de pack_items y se
   insertan los nuevos de una — más simple y a prueba de errores
   que ir comparando qué cambió ítem por ítem.
   ═══════════════════════════════════════════════════════════ */

var _packs = [];
var _packItems = [];
var _packBusca = '';
var _packsCargados = false;

async function pintarPacks() {
  var cont = porId('colores-cuerpo');
  if (!cont) return;
  if (!_packsCargados) {
    cont.innerHTML = cargando();
    var r = await Promise.all([traerCacheado('packs'), traerCacheado('pack_items')]);
    _packs = r[0]; _packItems = r[1];
    _packsCargados = true;
  }
  dibujarPacks();
}

/* Un pack puede llevar colores (esmaltes/semipermanentes) Y
   productos simples (cremas, colágeno) mezclados — cada renglón de
   pack_items dice de qué tipo es (tipo_item) y apunta a color_id o
   a producto_id según corresponda. No duplica código ni nombre: se
   resuelven acá mirando _colores/_productos, así siempre muestran
   el nombre/código actual, aunque cambie después. */
function itemsDePack(packId) {
  return _packItems.filter(function (it) { return it.pack_id === packId; }).map(function (it) {
    if (it.tipo_item === 'producto') {
      var prod = _productos.find(function (p) { return p.id === it.producto_id; });
      return { tipo: 'producto', id: it.producto_id, etiqueta: prod ? prod.nombre : 'Producto eliminado', cantidad: it.cantidad };
    }
    var color = _colores.find(function (c) { return c.id === it.color_id; });
    return { tipo: 'color', id: it.color_id, etiqueta: color ? (color.codigo + ' — ' + (color.nombre || color.codigo)) : 'Color eliminado', cantidad: it.cantidad };
  });
}

function packsFiltrados() {
  var q = normalizar(_packBusca);
  if (!q) return _packs;
  return _packs.filter(function (p) { return normalizar(p.nombre).indexOf(q) !== -1; });
}

function dibujarPacks() {
  var cont = porId('colores-cuerpo');
  if (!cont) return;
  var activos = _packs.filter(function (p) { return bool(p.activo); }).length;

  cont.innerHTML =
    (_packs.length ? '' : avisoHTML('info',
      'Todavía no armaste ningún pack. Elegí varios colores y un precio propio, y aparece solo en el ' +
      '<strong>catálogo</strong> como un ítem más.', 'box')) +

    '<div class="atajos" style="margin-bottom:14px">' +
      '<button class="atajo atajo-grad" onclick="nuevoPack()">' + ic('plus', 17) +
        '<span>Armar pack</span></button>' +
    '</div>' +

    '<div class="grilla-stats" style="margin-bottom:16px">' +
      stat('box', 'Packs armados', String(_packs.length), plural(activos, 'activo'), 'var(--rose)') +
    '</div>' +

    '<div class="colores-toolbar">' +
      '<div class="buscador">' +
        '<span class="ic-lupa">' + ic('search', 15) + '</span>' +
        '<input class="campo-input" value="' + esc(_packBusca) + '" placeholder="Buscar pack por nombre" ' +
          'oninput="setBuscaPack(this.value)"/>' +
      '</div>' +
    '</div>' +

    '<div id="packs-lista"></div>';

  dibujarListaPacks();
}

function setBuscaPack(v) { _packBusca = v; dibujarListaPacks(); }

function dibujarListaPacks() {
  var cont = porId('packs-lista');
  if (!cont) return;
  var lista = packsFiltrados().slice().sort(function (a, b) { return (a.nombre || '').localeCompare(b.nombre || '', 'es'); });
  if (!lista.length) {
    cont.innerHTML = vacio('search', 'Ningún pack coincide', 'Probá cambiar la búsqueda.');
    return;
  }
  cont.innerHTML = '<div class="colores-grilla">' + lista.map(tarjetaPack).join('') + '</div>';
}

function tarjetaPack(p) {
  var items = itemsDePack(p.id);
  var media = p.imagen_url
    ? '<img src="' + esc(p.imagen_url) + '" alt="" loading="lazy" onerror="imagenRota(this)"/>'
    : '<span class="sin-imagen">' + ic('box', 26) + '</span>';
  return '<button class="color-card' + (bool(p.activo) ? '' : ' inactivo') + '" onclick="editarPack(' + p.id + ')">' +
    '<div class="color-card-media">' +
      '<span class="color-card-num">' + plural(items.length, 'ítem') + '</span>' +
      media +
    '</div>' +
    '<div class="color-card-pie">' +
      '<div class="color-card-nombre">' + esc(p.nombre) +
        (!bool(p.activo) ? ' <span class="pin pin-neutro" style="vertical-align:1px">Oculto</span>' : '') +
      '</div>' +
      (+p.precio > 0 ? '<div class="color-card-precio">' + plata(+p.precio) + '</div>' : '') +
    '</div>' +
  '</button>';
}

function nuevoPack() { abrirFormPack(null); }
function editarPack(id) {
  var p = _packs.find(function (x) { return x.id === id; });
  if (p) abrirFormPack(p);
}

var _imgPackActual = '';
var _packItemsActuales = [];

function subeimgPackHTML() {
  var url = _imgPackActual;
  return '<div class="campo" id="subeimg-wrap-pack"><div class="campo-etiq">Foto (opcional)</div>' +
    '<div class="subeimg" ' +
      'ondragover="event.preventDefault();event.stopPropagation();this.classList.add(\'arrastrando\')" ' +
      'ondragleave="this.classList.remove(\'arrastrando\')" ' +
      'ondrop="event.preventDefault();this.classList.remove(\'arrastrando\');subirArchivoPack((event.dataTransfer.files||[])[0])">' +
      '<div class="subeimg-preview" id="subeimg-prev-pack">' +
        (url ? '<img src="' + esc(url) + '"/>' : '<span class="sin-imagen">' + ic('box', 22) + '</span>') +
      '</div>' +
      '<div class="subeimg-info">' +
        '<div class="subeimg-titulo">Arrastrá una foto acá o tocá "Subir"</div>' +
        '<div class="subeimg-ayuda">Vacía = el catálogo arma una imagen con los colores del pack.</div>' +
      '</div>' +
      '<div class="subeimg-acciones">' +
        '<button type="button" class="subeimg-btn" id="subeimg-btn-pack" onclick="porId(\'archivo-pack\').click()">' +
          ic('upload', 14) + ' ' + (url ? 'Cambiar' : 'Subir') + '</button>' +
        (url ? '<button type="button" class="subeimg-btn quitar" onclick="quitarImagenPack()" aria-label="Quitar imagen">' + ic('trash', 14) + '</button>' : '') +
      '</div>' +
      '<input type="file" accept="image/*" id="archivo-pack" onchange="subirArchivoPack(this.files[0]);this.value=\'\'"/>' +
    '</div></div>';
}
function repintarSubeimgPack() {
  var envoltorio = porId('subeimg-wrap-pack');
  if (envoltorio) envoltorio.outerHTML = subeimgPackHTML();
}
async function subirArchivoPack(archivo) {
  if (!archivo) return;
  var prev = porId('subeimg-prev-pack');
  var btn = porId('subeimg-btn-pack');
  if (!prev) return;
  var previoHTML = prev.innerHTML;
  prev.innerHTML = '<div class="girador"></div>';
  if (btn) btn.disabled = true;
  try {
    var url = await subirImagen(archivo, 'pack');
    _imgPackActual = url;
    repintarSubeimgPack();
    toast('Imagen subida');
  } catch (e) {
    prev.innerHTML = previoHTML;
    if (btn) btn.disabled = false;
    toast(e.message, 'error');
  }
}
function quitarImagenPack() { _imgPackActual = ''; repintarSubeimgPack(); }

/* ── Elegir qué lleva el pack ─────────────────────────────────
   Un desplegable con todos los colores (código — nombre) Y los
   productos simples (cremas, colágeno) + una cantidad + "Agregar":
   arma una lista chica abajo, cada renglón con su cantidad y un
   botón para sacarlo. Un pack puede mezclar de todo. */
function opcionesItemsParaPack() {
  var colores = _colores.slice().sort(function (a, b) { return a.codigo.localeCompare(b.codigo, 'es', { numeric: true }); })
    .map(function (c) { return { tipo: 'color', id: c.id, etiqueta: c.codigo + ' — ' + (c.nombre || c.codigo) }; });
  var productos = _productos.slice().sort(function (a, b) { return (a.nombre || '').localeCompare(b.nombre || '', 'es'); })
    .map(function (p) { return { tipo: 'producto', id: p.id, etiqueta: p.nombre }; });
  return { colores: colores, productos: productos };
}

function selectorItemsPackHTML() {
  var op = opcionesItemsParaPack();
  return '<div class="campo"><div class="campo-etiq">Qué lleva el pack</div>' +
    '<div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">' +
      '<div style="flex:1;min-width:180px">' +
        '<select class="campo-input" id="pack-item-elegir">' +
          (op.colores.length ? '<optgroup label="Esmaltes y semipermanentes">' +
            op.colores.map(function (o) { return '<option value="color-' + o.id + '">' + esc(o.etiqueta) + '</option>'; }).join('') +
          '</optgroup>' : '') +
          (op.productos.length ? '<optgroup label="Cremas y colágeno">' +
            op.productos.map(function (o) { return '<option value="producto-' + o.id + '">' + esc(o.etiqueta) + '</option>'; }).join('') +
          '</optgroup>' : '') +
        '</select>' +
      '</div>' +
      '<input class="campo-input" id="pack-item-cant" type="number" inputmode="numeric" min="1" step="1" value="1" style="max-width:80px"/>' +
      '<button type="button" class="btn btn-secundario" onclick="agregarItemPack()">' + ic('plus', 15) + ' Agregar</button>' +
    '</div>' +
    '<div id="pack-items-lista" style="margin-top:10px">' + itemsPackListaHTML() + '</div>' +
  '</div>';
}

function itemsPackListaHTML() {
  if (!_packItemsActuales.length) {
    return '<p class="campo-ayuda" style="margin:0">Todavía no agregaste nada.</p>';
  }
  return '<div class="lista">' + _packItemsActuales.map(function (it, i) {
    return '<div class="pack-item-row">' +
      '<span>' + esc(it.etiqueta) + '</span>' +
      '<span class="campo-ayuda" style="margin:0">x' + it.cantidad + '</span>' +
      '<button type="button" class="btn btn-fantasma" style="padding:4px 6px" onclick="quitarItemPack(' + i + ')" aria-label="Quitar">' + ic('x', 14) + '</button>' +
    '</div>';
  }).join('') + '</div>';
}

function agregarItemPack() {
  var sel = porId('pack-item-elegir');
  var cantInput = porId('pack-item-cant');
  if (!sel || !sel.value) return;
  var partes = sel.value.split('-');
  var tipo = partes[0], id = +partes[1];
  var cantidad = Math.max(1, +cantInput.value || 1);
  var etiqueta;
  if (tipo === 'producto') {
    var prod = _productos.find(function (p) { return p.id === id; });
    if (!prod) return;
    etiqueta = prod.nombre;
  } else {
    var color = _colores.find(function (c) { return c.id === id; });
    if (!color) return;
    etiqueta = color.codigo + ' — ' + (color.nombre || color.codigo);
  }

  var existente = _packItemsActuales.find(function (it) { return it.tipo === tipo && it.id === id; });
  if (existente) existente.cantidad = cantidad;
  else _packItemsActuales.push({ tipo: tipo, id: id, etiqueta: etiqueta, cantidad: cantidad });

  var lista = porId('pack-items-lista');
  if (lista) lista.innerHTML = itemsPackListaHTML();
  cantInput.value = 1;
}
function quitarItemPack(i) {
  _packItemsActuales.splice(i, 1);
  var lista = porId('pack-items-lista');
  if (lista) lista.innerHTML = itemsPackListaHTML();
}

function abrirFormPack(p) {
  var esNuevo = !p;
  p = p || { nombre: '', descripcion: '', imagen_url: '', precio: '', activo: true };
  _imgPackActual = p.imagen_url || '';
  _packItemsActuales = esNuevo ? [] : itemsDePack(p.id);

  if (!_colores.length && !_productos.length) {
    toast('Cargá algún esmalte o producto antes de armar un pack', 'error');
    return;
  }

  abrirModal(esNuevo ? 'Nuevo pack' : 'Editar pack',
    '<div class="campo"><div class="campo-etiq">Nombre</div>' +
      '<input class="campo-input" id="pack-nombre" value="' + esc(p.nombre) + '" placeholder="Ej: Pack Rosas x6"/></div>' +
    '<div style="display:flex;gap:20px;flex-wrap:wrap;margin:2px 0 4px">' +
      '<label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;cursor:pointer">' +
        '<input type="checkbox" id="pack-activo"' + (bool(p.activo) ? ' checked' : '') + '/> Visible en el catálogo</label>' +
    '</div>' +

    subeimgPackHTML() +

    '<div class="campo"><div class="campo-etiq">Descripción (opcional)</div>' +
      '<textarea class="campo-input" id="pack-descripcion" rows="1" oninput="ajustarAlturaTextarea(this)" ' +
        'placeholder="Ej: Los 6 tonos más pedidos de la colección Rosas.">' + esc(p.descripcion || '') + '</textarea></div>' +

    '<div class="campo"><div class="campo-etiq">Precio del pack</div>' +
      '<input class="campo-input" id="pack-precio" type="number" inputmode="decimal" min="0" step="0.01" value="' + esc(p.precio || '') + '" placeholder="0"/></div>' +

    selectorItemsPackHTML(),

    '<button class="btn btn-primario btn-bloque" onclick="guardarPack(' + (esNuevo ? 'null' : p.id) + ')">Guardar</button>' +
    (esNuevo ? '' :
      '<button class="btn btn-peligro btn-bloque" style="margin-top:8px" onclick="confirmarBorrarPack(' + p.id + ')">Eliminar pack</button>'));

  ajustarAlturaTextarea(porId('pack-descripcion'));
}

async function guardarPack(id) {
  var nombre = porId('pack-nombre').value.trim();
  var activo = porId('pack-activo').checked;
  var imagen_url = _imgPackActual;
  var descripcion = porId('pack-descripcion').value;
  var precio = +porId('pack-precio').value || 0;

  if (!nombre) { toast('Falta el nombre', 'error'); return; }
  if (!_packItemsActuales.length) { toast('Agregá al menos un color o producto al pack', 'error'); return; }

  var datos = { nombre: nombre, activo: activo, imagen_url: imagen_url, descripcion: descripcion, precio: precio };

  try {
    var packId = id;
    if (id) {
      await actualizar('packs', id, datos);
      await borrarDonde('pack_items', 'pack_id=eq.' + id);
    } else {
      var creado = await crear('packs', datos);
      packId = creado[0].id;
    }
    for (var i = 0; i < _packItemsActuales.length; i++) {
      var it = _packItemsActuales[i];
      await crear('pack_items', {
        pack_id: packId, cantidad: it.cantidad, tipo_item: it.tipo,
        color_id: it.tipo === 'color' ? it.id : null,
        producto_id: it.tipo === 'producto' ? it.id : null
      });
    }
    cerrarModal();
    toast('Pack guardado');
    var r = await Promise.all([traerCacheado('packs'), traerCacheado('pack_items')]);
    _packs = r[0]; _packItems = r[1];
    pintarProductosUnificado();
  } catch (e) { toast(e.message, 'error'); }
}

function confirmarBorrarPack(id) {
  var p = _packs.find(function (x) { return x.id === id; });
  if (!p) return;
  abrirModal('Eliminar ' + p.nombre,
    '<p style="margin:0 0 4px">Se va a borrar el pack <strong>' + esc(p.nombre) + '</strong> del catálogo.</p>' +
    '<p class="campo-ayuda">Los pedidos ya hechos con este pack no se pierden.</p>',
    '<button class="btn btn-peligro btn-bloque" onclick="borrarPack(' + id + ')">Sí, eliminar</button>');
}
async function borrarPack(id) {
  try {
    await borrar('packs', id);
    cerrarModal();
    toast('Pack eliminado');
    var r = await Promise.all([traerCacheado('packs'), traerCacheado('pack_items')]);
    _packs = r[0]; _packItems = r[1];
    pintarProductosUnificado();
  } catch (e) { toast(e.message, 'error'); }
}
