/* ═══════════════════════════════════════════════════════════
   PRODUCTOS SIMPLES — cremas de ordeñe, colágeno y cualquier otra
   cosa que no sea un esmalte: sin código, colección, acabado ni
   swatch, solo nombre, categoría, descripción, foto, precio y
   stock. Vive en su propia tabla ("productos") porque los campos
   son bien distintos a los de "colores" — pero la ficha se ve
   igual de prolija, con el mismo estilo de tarjeta.
   ═══════════════════════════════════════════════════════════ */

var _productos = [];
var _productoBusca = '';
var _productoCategoriaFiltro = '';
var _productosCargados = false;

var CATEGORIAS_PRODUCTO = { crema: 'Crema', colageno: 'Colágeno', otro: 'Otro' };

async function pintarProductosSimples() {
  var cont = porId('colores-cuerpo');
  if (!cont) return;
  if (!_productosCargados) {
    cont.innerHTML = cargando();
    _productos = await traerCacheado('productos');
    _productosCargados = true;
  }
  dibujarProductosSimples();
}

function productosFiltrados() {
  var q = normalizar(_productoBusca);
  return _productos.filter(function (p) {
    if (_productoCategoriaFiltro && p.categoria !== _productoCategoriaFiltro) return false;
    if (!q) return true;
    return normalizar(p.nombre).indexOf(q) !== -1;
  });
}

function dibujarProductosSimples() {
  var cont = porId('colores-cuerpo');
  if (!cont) return;

  var activos = _productos.filter(function (p) { return bool(p.activo); }).length;
  var sinStock = _productos.filter(function (p) { return (+p.stock || 0) <= 0; }).length;

  cont.innerHTML =
    (_productos.length ? '' : avisoHTML('info',
      'Todavía no cargaste ninguna crema ni colágeno. Los que agregues acá aparecen solos en el ' +
      '<strong>catálogo</strong>.', 'pill')) +

    '<div class="atajos" style="margin-bottom:14px">' +
      '<button class="atajo atajo-grad" onclick="nuevoProductoSimple()">' + ic('plus', 17) +
        '<span>Agregar producto</span></button>' +
    '</div>' +

    '<div class="grilla-stats" style="margin-bottom:16px">' +
      stat('pill', 'Productos cargados', String(_productos.length), plural(activos, 'activo'), 'var(--rose)') +
      (sinStock ? stat('alert', 'Sin stock', String(sinStock), plural(sinStock, 'producto'), 'var(--danger)') : '') +
    '</div>' +

    '<div class="colores-toolbar">' +
      '<div class="buscador">' +
        '<span class="ic-lupa">' + ic('search', 15) + '</span>' +
        '<input class="campo-input" value="' + esc(_productoBusca) + '" placeholder="Buscar por nombre" ' +
          'oninput="setBuscaProducto(this.value)"/>' +
      '</div>' +
      '<select class="campo-input" onchange="_productoCategoriaFiltro=this.value;dibujarProductosSimples()">' +
        '<option value="">Todas las categorías</option>' +
        Object.keys(CATEGORIAS_PRODUCTO).map(function (k) {
          return '<option value="' + k + '"' + (_productoCategoriaFiltro === k ? ' selected' : '') + '>' + CATEGORIAS_PRODUCTO[k] + '</option>';
        }).join('') +
      '</select>' +
    '</div>' +

    '<div id="productos-lista"></div>';

  dibujarListaProductos();
}

function setBuscaProducto(v) { _productoBusca = v; dibujarListaProductos(); }

function dibujarListaProductos() {
  var cont = porId('productos-lista');
  if (!cont) return;
  var lista = productosFiltrados().slice().sort(function (a, b) { return (a.nombre || '').localeCompare(b.nombre || '', 'es'); });
  if (!lista.length) {
    cont.innerHTML = vacio('search', 'Ningún producto coincide', 'Probá cambiar la búsqueda o la categoría.');
    return;
  }
  cont.innerHTML = '<div class="colores-grilla">' + lista.map(tarjetaProductoSimple).join('') + '</div>';
}

function tarjetaProductoSimple(p) {
  var sinStock = (+p.stock || 0) <= 0;
  var media = p.imagen_url
    ? '<img src="' + esc(p.imagen_url) + '" alt="" loading="lazy" onerror="imagenRota(this)"/>'
    : '<span class="sin-imagen">' + ic('image', 26) + '</span>';
  return '<button class="color-card' + (bool(p.activo) ? '' : ' inactivo') + '" onclick="editarProductoSimple(' + p.id + ')">' +
    '<div class="color-card-media">' +
      '<span class="color-card-num">' + esc(CATEGORIAS_PRODUCTO[p.categoria] || 'Otro') + '</span>' +
      media +
      (sinStock ? '<span class="color-card-stockcero">Sin stock</span>' : '') +
    '</div>' +
    '<div class="color-card-pie">' +
      '<div class="color-card-nombre">' + esc(p.nombre) +
        (!bool(p.activo) ? ' <span class="pin pin-neutro" style="vertical-align:1px">Oculto</span>' : '') +
      '</div>' +
      (+p.precio > 0 ? '<div class="color-card-precio">' + plata(+p.precio) + '</div>' : '') +
    '</div>' +
  '</button>';
}

function nuevoProductoSimple() { abrirFormProductoSimple(null); }
function editarProductoSimple(id) {
  var p = _productos.find(function (x) { return x.id === id; });
  if (p) abrirFormProductoSimple(p);
}

var _imgProductoActual = '';

function subeimgProductoHTML() {
  var url = _imgProductoActual;
  return '<div class="campo" id="subeimg-wrap-prod"><div class="campo-etiq">Foto</div>' +
    '<div class="subeimg" ' +
      'ondragover="event.preventDefault();event.stopPropagation();this.classList.add(\'arrastrando\')" ' +
      'ondragleave="this.classList.remove(\'arrastrando\')" ' +
      'ondrop="event.preventDefault();this.classList.remove(\'arrastrando\');subirArchivoProducto((event.dataTransfer.files||[])[0])">' +
      '<div class="subeimg-preview" id="subeimg-prev-prod">' +
        (url ? '<img src="' + esc(url) + '"/>' : '<span class="sin-imagen">' + ic('image', 22) + '</span>') +
      '</div>' +
      '<div class="subeimg-info">' +
        '<div class="subeimg-titulo">Arrastrá una foto acá o tocá "Subir"</div>' +
        '<div class="subeimg-ayuda">JPG, PNG o WEBP · hasta 5 MB.</div>' +
      '</div>' +
      '<div class="subeimg-acciones">' +
        '<button type="button" class="subeimg-btn" id="subeimg-btn-prod" onclick="porId(\'archivo-prod\').click()">' +
          ic('upload', 14) + ' ' + (url ? 'Cambiar' : 'Subir') + '</button>' +
        (url ? '<button type="button" class="subeimg-btn quitar" onclick="quitarImagenProducto()" aria-label="Quitar imagen">' + ic('trash', 14) + '</button>' : '') +
      '</div>' +
      '<input type="file" accept="image/*" id="archivo-prod" onchange="subirArchivoProducto(this.files[0]);this.value=\'\'"/>' +
    '</div></div>';
}
function repintarSubeimgProducto() {
  var envoltorio = porId('subeimg-wrap-prod');
  if (envoltorio) envoltorio.outerHTML = subeimgProductoHTML();
}
async function subirArchivoProducto(archivo) {
  if (!archivo) return;
  var prev = porId('subeimg-prev-prod');
  var btn = porId('subeimg-btn-prod');
  if (!prev) return;
  var previoHTML = prev.innerHTML;
  prev.innerHTML = '<div class="girador"></div>';
  if (btn) btn.disabled = true;
  try {
    var url = await subirImagen(archivo, 'producto');
    _imgProductoActual = url;
    repintarSubeimgProducto();
    toast('Imagen subida');
  } catch (e) {
    prev.innerHTML = previoHTML;
    if (btn) btn.disabled = false;
    toast(e.message, 'error');
  }
}
function quitarImagenProducto() { _imgProductoActual = ''; repintarSubeimgProducto(); }

function abrirFormProductoSimple(p) {
  var esNuevo = !p;
  p = p || { nombre: '', categoria: 'crema', descripcion: '', imagen_url: '', precio: '', stock: 0, activo: true };
  _imgProductoActual = p.imagen_url || '';

  abrirModal(esNuevo ? 'Nuevo producto' : 'Editar producto',
    '<div class="campo"><div class="campo-etiq">Nombre</div>' +
      '<input class="campo-input" id="prod-nombre" value="' + esc(p.nombre) + '" placeholder="Ej: Crema de ordeñe 250ml"/></div>' +
    '<div class="campo"><div class="campo-etiq">Categoría</div>' +
      '<select class="campo-input" id="prod-categoria">' +
        Object.keys(CATEGORIAS_PRODUCTO).map(function (k) {
          return '<option value="' + k + '"' + (p.categoria === k ? ' selected' : '') + '>' + CATEGORIAS_PRODUCTO[k] + '</option>';
        }).join('') +
      '</select></div>' +
    '<div style="display:flex;gap:20px;flex-wrap:wrap;margin:2px 0 4px">' +
      '<label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;cursor:pointer">' +
        '<input type="checkbox" id="prod-activo"' + (bool(p.activo) ? ' checked' : '') + '/> Visible en el catálogo</label>' +
    '</div>' +

    subeimgProductoHTML() +

    '<div class="campo"><div class="campo-etiq">Descripción</div>' +
      '<textarea class="campo-input" id="prod-descripcion" rows="1" oninput="ajustarAlturaTextarea(this)" ' +
        'placeholder="Ej: Crema hidratante para manos y uñas, de uso diario.">' + esc(p.descripcion || '') + '</textarea></div>' +

    '<div class="par-campos">' +
      '<div class="pc-1"><div class="campo-etiq">Precio</div>' +
        '<input class="campo-input" id="prod-precio" type="number" inputmode="decimal" min="0" step="0.01" value="' + esc(p.precio || '') + '" placeholder="0"/></div>' +
      '<div class="pc-2"><div class="campo-etiq">Stock</div>' +
        '<input class="campo-input" id="prod-stock" type="number" inputmode="numeric" min="0" step="1" value="' + esc(p.stock || 0) + '"/></div>' +
    '</div>',

    '<button class="btn btn-primario btn-bloque" onclick="guardarProductoSimple(' + (esNuevo ? 'null' : p.id) + ')">Guardar</button>' +
    (esNuevo ? '' :
      '<button class="btn btn-peligro btn-bloque" style="margin-top:8px" onclick="confirmarBorrarProductoSimple(' + p.id + ')">Eliminar producto</button>'));

  ajustarAlturaTextarea(porId('prod-descripcion'));
}

async function guardarProductoSimple(id) {
  var nombre = porId('prod-nombre').value.trim();
  var categoria = porId('prod-categoria').value;
  var activo = porId('prod-activo').checked;
  var imagen_url = _imgProductoActual;
  var descripcion = porId('prod-descripcion').value;
  var precio = +porId('prod-precio').value || 0;
  var stock = +porId('prod-stock').value || 0;

  if (!nombre) { toast('Falta el nombre', 'error'); return; }

  var datos = { nombre: nombre, categoria: categoria, activo: activo, imagen_url: imagen_url, descripcion: descripcion, precio: precio, stock: stock };

  try {
    if (id) await actualizar('productos', id, datos);
    else await crear('productos', datos);
    cerrarModal();
    toast('Producto guardado');
    _productos = await traerCacheado('productos');
    dibujarProductosSimples();
  } catch (e) { toast(e.message, 'error'); }
}

function confirmarBorrarProductoSimple(id) {
  var p = _productos.find(function (x) { return x.id === id; });
  if (!p) return;
  abrirModal('Eliminar ' + p.nombre,
    '<p style="margin:0 0 4px">Se va a borrar <strong>' + esc(p.nombre) + '</strong> del catálogo.</p>' +
    '<p class="campo-ayuda">Los pedidos ya hechos con este producto no se pierden.</p>',
    '<button class="btn btn-peligro btn-bloque" onclick="borrarProductoSimple(' + id + ')">Sí, eliminar</button>');
}
async function borrarProductoSimple(id) {
  try {
    await borrar('productos', id);
    cerrarModal();
    toast('Producto eliminado');
    _productos = await traerCacheado('productos');
    dibujarProductosSimples();
  } catch (e) { toast(e.message, 'error'); }
}
