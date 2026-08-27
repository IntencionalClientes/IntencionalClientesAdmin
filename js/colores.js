/* ═══════════════════════════════════════════════════════════
   COLORES — el catálogo real de esmaltes: código, nombre,
   colección, acabado, fotos, descripción, oferta y precio.
   El stock que se ve acá NO se carga en esta pantalla: se
   sincroniza solo, del lado de la app de Intencional, desde
   Compras + los movimientos de "Stock" (mismo cálculo, por
   código). Acá es puramente de lectura: es la única cosa que
   esta página usa de la app de Intencional.
   ═══════════════════════════════════════════════════════════ */

var _colores = [];
var _colorBusca = '';
var _colorColeccionFiltro = '';
var _colorAcabadoFiltro = '';
var _colorSoloActivos = false;

registrarPagina({
  id: 'colores',
  menu: 'Colores',
  grupo: 'Catálogo',
  icono: 'palette',
  titulo: 'Colores',
  subtitulo: 'El catálogo de esmaltes: acá se cargan y el Catálogo los toma solo',

  async montar(cont) {
    _colores = await traerCacheado('colores');
    cont.innerHTML = '<div id="colores-cuerpo"></div>';
    pintarColores();
  }
});

function coloresFiltrados() {
  var q = normalizar(_colorBusca);
  return _colores.filter(function (c) {
    if (_colorSoloActivos && !bool(c.activo)) return false;
    if (_colorColeccionFiltro && c.coleccion !== _colorColeccionFiltro) return false;
    if (_colorAcabadoFiltro && c.acabado !== _colorAcabadoFiltro) return false;
    if (!q) return true;
    return normalizar(c.codigo).indexOf(q) !== -1 || normalizar(c.nombre).indexOf(q) !== -1;
  });
}

function valoresUnicos(campo) {
  var s = {};
  _colores.forEach(function (c) { if (c[campo]) s[c[campo]] = 1; });
  return Object.keys(s).sort(function (a, b) { return a.localeCompare(b, 'es'); });
}

function pintarColores() {
  var cont = porId('colores-cuerpo');
  if (!cont) return;

  var sinStock = _colores.filter(function (c) { return (+c.stock || 0) <= 0; }).length;
  var activos = _colores.filter(function (c) { return bool(c.activo); }).length;
  var enOferta = _colores.filter(function (c) { return bool(c.en_oferta); }).length;

  cont.innerHTML =
    (_colores.length ? '' : avisoHTML('info',
      'Todavía no cargaste ningún color. Los que agregues acá aparecen solos en el ' +
      '<strong>catálogo</strong>, con su stock.', 'palette')) +

    '<div class="atajos" style="margin-bottom:14px">' +
      '<button class="atajo atajo-grad" onclick="nuevoColor()">' + ic('plus', 17) +
        '<span>Agregar color</span></button>' +
    '</div>' +

    '<div class="grilla-stats" style="margin-bottom:16px">' +
      stat('palette', 'Colores cargados', String(_colores.length), plural(activos, 'activo'), 'var(--rose)') +
      (sinStock ? stat('alert', 'Sin stock', String(sinStock), plural(sinStock, 'color', 'colores'), 'var(--danger)') : '') +
      (enOferta ? stat('tag', 'En oferta', String(enOferta), plural(enOferta, 'color', 'colores'), 'var(--warn)') : '') +
    '</div>' +

    '<div class="tarjeta">' +
      '<div class="tarjeta-cab">' + ic('search', 16) + ' Buscar y filtrar' +
        '<span style="margin-left:auto"><span class="pin pin-neutro">' + plural(coloresFiltrados().length, 'color', 'colores') + '</span></span>' +
      '</div>' +
      '<div class="tarjeta-cuerpo">' +
        '<div class="buscador" style="margin-bottom:10px">' +
          '<span class="ic-lupa">' + ic('search', 15) + '</span>' +
          '<input class="campo-input" value="' + esc(_colorBusca) + '" placeholder="Código o nombre" ' +
            'oninput="setBuscaColor(this.value)"/>' +
        '</div>' +
        '<div class="grilla-filtros" style="margin-bottom:12px">' +
          selectFiltroColor('_colorColeccionFiltro', 'Todas las colecciones', valoresUnicos('coleccion')) +
          selectFiltroColor('_colorAcabadoFiltro', 'Todos los acabados', valoresUnicos('acabado')) +
        '</div>' +
        '<label style="font-size:12.5px;color:var(--muted);display:flex;align-items:center;gap:7px;cursor:pointer">' +
          '<input type="checkbox" onchange="setSoloActivosColor(this.checked)"' + (_colorSoloActivos ? ' checked' : '') + '/> Solo activos' +
        '</label>' +
      '</div>' +
    '</div>' +

    '<div id="colores-lista"></div>';

  pintarListaColores();
}

function selectFiltroColor(varName, placeholder, opciones) {
  var actual = window[varName];
  return '<select class="campo-input" onchange="' + varName + '=this.value;pintarColores()">' +
    '<option value="">' + esc(placeholder) + '</option>' +
    opciones.map(function (o) {
      return '<option value="' + esc(o) + '"' + (actual === o ? ' selected' : '') + '>' + esc(o) + '</option>';
    }).join('') +
  '</select>';
}

function setBuscaColor(v) { _colorBusca = v; pintarListaColores(); pintarCuentaColor(); }
function setSoloActivosColor(v) { _colorSoloActivos = v; pintarColores(); }

function pintarCuentaColor() {
  var pin = document.querySelector('#colores-cuerpo .tarjeta-cab .pin');
  if (pin) pin.textContent = plural(coloresFiltrados().length, 'color', 'colores');
}

function pintarListaColores() {
  var cont = porId('colores-lista');
  if (!cont) return;
  /* El piso ya no existe como criterio: en el catálogo todos los
     colores se muestran juntos, así que acá alcanza con ordenar
     por código, igual que se ven ahí. */
  var lista = coloresFiltrados().slice().sort(function (a, b) {
    return a.codigo.localeCompare(b.codigo, 'es', { numeric: true });
  });

  if (!lista.length) {
    cont.innerHTML = vacio('search', 'Ningún color coincide', 'Probá cambiar la búsqueda o los filtros.');
    return;
  }

  cont.innerHTML = '<div class="lista">' + lista.map(filaColor).join('') + '</div>';
}

function filaColor(c) {
  var sinStock = (+c.stock || 0) <= 0;
  var swatch = c.hex
    ? '<span class="buscador-swatch" style="background:' + esc(c.hex) + ';border-color:rgba(0,0,0,.15)"></span>'
    : '<span class="buscador-swatch buscador-swatch-vacio"></span>';
  return '<button class="fila" onclick="editarColor(' + c.id + ')">' +
    swatch +
    '<div class="fila-principal">' +
      '<div class="fila-titulo">' + esc(c.codigo) + (c.nombre ? ' · ' + esc(c.nombre) : '') +
        (!bool(c.activo) ? ' <span class="pin pin-neutro">Oculto</span>' : '') +
        (bool(c.en_oferta) ? ' <span class="pin pin-warn">Oferta</span>' : '') +
      '</div>' +
      '<div class="fila-sub">' + [c.coleccion, c.acabado].filter(Boolean).map(esc).join(' · ') + '</div>' +
    '</div>' +
    '<div class="fila-derecha">' +
      (bool(c.en_oferta) && +c.precio_oferta > 0
        ? '<div class="fila-titulo" style="color:var(--warn)">' + plata(+c.precio_oferta) + '</div>'
        : (+c.precio > 0 ? '<div class="fila-titulo">' + plata(+c.precio) + '</div>' : '')) +
      '<div class="fila-sub" style="color:' + (sinStock ? 'var(--danger)' : 'var(--muted)') + '">' +
        (sinStock ? 'Sin stock' : plural(c.stock, 'unidad', 'unidades')) +
      '</div>' +
    '</div>' +
  '</button>';
}

/* ── Alta / edición ─────────────────────────────────────────── */
var COLECCIONES_SUGERIDAS = ['Clásicos', 'Nudes', 'Rosas', 'Rojos', 'Neones', 'Oscuros', 'Glitter'];
var ACABADOS_SUGERIDOS = ['Cremoso', 'Perlado', 'Glitter', 'Mate'];

function nuevoColor() { abrirFormColor(null); }
function editarColor(id) {
  var c = _colores.find(function (x) { return x.id === id; });
  if (c) abrirFormColor(c);
}

/* ── Autocompletar propio (Colección / Acabado) ───────────────
   Antes esto era un <input list="…"> con un <datalist>: nativo,
   pero el desplegable de sugerencias de Chrome/Safari no se llega
   a ver cuando el input está dentro de un contenedor con scroll
   (que es justo lo que es el cuerpo de este modal) — por eso no
   se veía nunca ninguna lista. Este reemplazo dibuja la lista él
   mismo, así siempre se ve, esté donde esté el input. */
var _autocompOpciones = {};

function autocompletarHTML(id, valor, placeholder, opciones) {
  _autocompOpciones[id] = opciones;
  return '<div class="autocomp">' +
    '<input class="campo-input" id="' + id + '" value="' + esc(valor) + '" placeholder="' + esc(placeholder) + '" ' +
      'autocomplete="off" oninput="autocompFiltrar(\'' + id + '\')" onfocus="autocompFiltrar(\'' + id + '\')" ' +
      'onblur="autocompCerrarDiferido(\'' + id + '\')"/>' +
    '<div class="autocomp-lista" id="' + id + '-lista"></div>' +
  '</div>';
}

function autocompFiltrar(id) {
  var input = porId(id);
  var lista = porId(id + '-lista');
  if (!input || !lista) return;
  var q = normalizar(input.value);
  var opciones = (_autocompOpciones[id] || []).filter(function (o, i, arr) { return arr.indexOf(o) === i; });
  var coincidencias = q ? opciones.filter(function (o) { return normalizar(o).indexOf(q) !== -1; }) : opciones;

  if (!coincidencias.length) { lista.innerHTML = ''; lista.className = 'autocomp-lista'; return; }
  lista.innerHTML = coincidencias.map(function (o) {
    return '<button type="button" class="autocomp-opcion" onmousedown="autocompElegir(\'' + id + '\',\'' +
      esc(o).replace(/'/g, '&#39;') + '\')">' + esc(o) + '</button>';
  }).join('');
  lista.className = 'autocomp-lista visible';
}
function autocompElegir(id, valor) {
  var input = porId(id);
  if (input) input.value = valor;
  autocompCerrar(id);
}
function autocompCerrar(id) {
  var lista = porId(id + '-lista');
  if (lista) lista.className = 'autocomp-lista';
}
function autocompCerrarDiferido(id) {
  /* El mousedown de la opción llega antes que este blur, así que
     alcanza con un margen chico para no taparlo. */
  setTimeout(function () { autocompCerrar(id); }, 150);
}

function abrirFormColor(c) {
  var esNuevo = !c;
  c = c || {
    codigo: '', nombre: '', coleccion: '', acabado: '', hex: '', imagen_url: '', imagen_una_url: '',
    descripcion: '', activo: true, en_oferta: false, precio: '', precio_oferta: '', oferta_pack: '', oferta_nota: '',
    stock: 0
  };

  abrirModal(esNuevo ? 'Nuevo color' : 'Editar color',
    '<div class="par-campos">' +
      '<div class="pc-1"><div class="campo-etiq">Código</div>' +
        '<input class="campo-input" id="col-codigo" value="' + esc(c.codigo) + '" placeholder="Ej: 006"' +
        (esNuevo ? '' : ' disabled') + '/></div>' +
      '<div class="pc-2"><div class="campo-etiq">Nombre</div>' +
        '<input class="campo-input" id="col-nombre" value="' + esc(c.nombre) + '" placeholder="Ej: Fucsia"/></div>' +
    '</div>' +
    '<div class="par-campos">' +
      '<div class="pc-1"><div class="campo-etiq">Colección</div>' +
        autocompletarHTML('col-coleccion', c.coleccion, 'Ej: Rosas', COLECCIONES_SUGERIDAS.concat(valoresUnicos('coleccion'))) +
      '</div>' +
      '<div class="pc-2"><div class="campo-etiq">Acabado</div>' +
        autocompletarHTML('col-acabado', c.acabado, 'Ej: Cremoso', ACABADOS_SUGERIDOS.concat(valoresUnicos('acabado'))) +
      '</div>' +
    '</div>' +
    '<div class="campo"><div class="campo-etiq">Color (swatch)</div>' +
      '<input class="color-swatch-input" type="color" id="col-hex" value="' + esc(c.hex || '#c84b8c') + '"/></div>' +
    '<div class="campo"><div class="campo-etiq">Foto del frasco (opcional, URL)</div>' +
      '<input class="campo-input" id="col-imagen" value="' + esc(c.imagen_url || '') + '" placeholder="https://…"/>' +
      '<div class="campo-ayuda">Si la dejás vacía, el catálogo dibuja una uña con el color de arriba.</div></div>' +
    '<div class="campo"><div class="campo-etiq">Foto de una uña con este color (opcional, URL)</div>' +
      '<input class="campo-input" id="col-imagen-una" value="' + esc(c.imagen_una_url || '') + '" placeholder="https://…"/>' +
      '<div class="campo-ayuda">Solo se muestra si es una foto real. Sin ella, no se inventa ninguna: si hay foto de frasco se ve sola, y si no hay ninguna de las dos, se dibuja la uña con el color de arriba.</div></div>' +
    '<div class="campo"><div class="campo-etiq">Descripción (opcional)</div>' +
      '<textarea class="campo-input" id="col-descripcion" rows="4" placeholder="Ej: Rojo intenso de alto brillo.&#10;Ideal para looks *clásicos*.">' + esc(c.descripcion || '') + '</textarea>' +
      '<div class="campo-ayuda">Se ve en la ficha de detalle del catálogo, tal cual la escribas acá: respeta mayúsculas y renglones, y una palabra entre *asteriscos* sale en <strong>negrita</strong>. Si la dejás vacía, se arma una automática con la colección y el acabado.</div></div>' +

    '<div class="campo-etiq" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">Precio</div>' +
    '<div class="par-campos">' +
      '<div class="pc-1"><div class="campo-etiq">Precio de lista</div>' +
        '<input class="campo-input" id="col-precio" type="number" min="0" step="0.01" value="' + esc(c.precio || '') + '" placeholder="0"/></div>' +
      '<div class="pc-2"><div class="campo-etiq">Precio de oferta</div>' +
        '<input class="campo-input" id="col-precio-oferta" type="number" min="0" step="0.01" value="' + esc(c.precio_oferta || '') + '" placeholder="0"/></div>' +
    '</div>' +
    '<div class="par-campos">' +
      '<div class="pc-1"><div class="campo-etiq">Pack mínimo para la oferta (opcional)</div>' +
        '<input class="campo-input" id="col-oferta-pack" type="number" min="0" step="1" value="' + esc(c.oferta_pack || '') + '" placeholder="Ej: 6"/>' +
        '<div class="campo-ayuda">Si lo dejás vacío, el precio de oferta vale por unidad, sin mínimo.</div></div>' +
      '<div class="pc-2"><div class="campo-etiq">Nota de la oferta (opcional)</div>' +
        '<input class="campo-input" id="col-oferta-nota" value="' + esc(c.oferta_nota || '') + '" placeholder="Ej: Por tiempo limitado"/></div>' +
    '</div>' +

    (esNuevo ? '' : stockColorSoloLecturaHTML(c)) +
    '<label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:14px">' +
      '<input type="checkbox" id="col-activo"' + (bool(c.activo) ? ' checked' : '') + '/> Visible en el catálogo</label>' +
    '<label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:8px">' +
      '<input type="checkbox" id="col-en-oferta"' + (bool(c.en_oferta) ? ' checked' : '') + '/> En oferta ' +
      '<span style="font-weight:400;color:var(--muted)">(aparece destacado primero en el catálogo)</span></label>',
    '<button class="btn btn-primario btn-bloque" onclick="guardarColor(' + (esNuevo ? 'null' : c.id) + ')">Guardar</button>' +
    (esNuevo ? '' :
      '<button class="btn btn-peligro btn-bloque" style="margin-top:8px" onclick="confirmarBorrarColor(' + c.id + ')">Eliminar color</button>'));
}

/* El stock ya no se toca desde acá: se sincroniza solo desde
   Compras + los movimientos que se cargan en "Stock", en la app
   de Intencional (buscando el color por su código, igual que
   para cremas y colágeno). Esto evita tener dos lugares donde
   cargar el mismo número y que se desincronicen entre sí. Acá
   solo se muestra, en modo lectura. */
function stockColorSoloLecturaHTML(c) {
  var sinStock = (+c.stock || 0) <= 0;
  return '<div class="campo-ayuda" style="margin:14px 0 10px;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius)">' +
    'Stock actual: <strong style="color:' + (sinStock ? 'var(--danger)' : 'var(--text)') + '">' +
      (sinStock ? 'Sin stock' : plural(c.stock, 'unidad', 'unidades')) +
    '</strong>' +
    '<div style="margin-top:4px">Se toma solo de <strong>Compras</strong> y de los movimientos de <strong>Stock</strong> ' +
      'en la app de Intencional, buscando el código <strong>' + esc(c.codigo) + '</strong>. No se edita desde acá.</div>' +
  '</div>';
}

async function guardarColor(id) {
  var codigo = porId('col-codigo').value.trim();
  var nombre = porId('col-nombre').value.trim();
  var coleccion = porId('col-coleccion').value.trim();
  var acabado = porId('col-acabado').value.trim();
  var hex = porId('col-hex').value;
  var imagen_url = porId('col-imagen').value.trim();
  var imagen_una_url = porId('col-imagen-una').value.trim();
  var descripcion = porId('col-descripcion').value;   // sin trim: los saltos de línea del principio/final los pone quien escribe
  var precio = +porId('col-precio').value || 0;
  var precio_oferta = porId('col-precio-oferta').value ? +porId('col-precio-oferta').value : null;
  var oferta_pack = porId('col-oferta-pack').value ? +porId('col-oferta-pack').value : null;
  var oferta_nota = porId('col-oferta-nota').value.trim();
  var activo = porId('col-activo').checked;
  var en_oferta = porId('col-en-oferta').checked;

  if (!codigo) { toast('Falta el código', 'error'); return; }
  if (!nombre) { toast('Falta el nombre', 'error'); return; }

  var datos = {
    nombre: nombre, coleccion: coleccion, acabado: acabado, hex: hex, imagen_url: imagen_url, imagen_una_url: imagen_una_url,
    descripcion: descripcion, activo: activo, en_oferta: en_oferta,
    precio: precio, precio_oferta: precio_oferta, oferta_pack: oferta_pack, oferta_nota: oferta_nota
  };

  try {
    if (id) {
      await actualizar('colores', id, datos);
    } else {
      await crear('colores', Object.assign({ codigo: codigo, stock: 0 }, datos));
    }
    cerrarModal();
    toast('Color guardado');
    _colores = await traerCacheado('colores');
    pintarColores();
  } catch (e) { toast(e.message, 'error'); }
}

function confirmarBorrarColor(id) {
  var c = _colores.find(function (x) { return x.id === id; });
  if (!c) return;
  abrirModal('Eliminar ' + c.codigo,
    '<p style="margin:0 0 4px">Se va a borrar <strong>' + esc(c.codigo) + (c.nombre ? ' · ' + esc(c.nombre) : '') + '</strong> del catálogo.</p>' +
    '<p class="campo-ayuda">Los pedidos ya hechos con este color no se pierden.</p>',
    '<button class="btn btn-peligro btn-bloque" onclick="borrarColor(' + id + ')">Sí, eliminar</button>');
}

async function borrarColor(id) {
  try {
    await borrar('colores', id);
    cerrarModal();
    toast('Color eliminado');
    _colores = await traerCacheado('colores');
    pintarColores();
  } catch (e) { toast(e.message, 'error'); }
}
