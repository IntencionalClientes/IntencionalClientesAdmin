/* ═══════════════════════════════════════════════════════════
   COLORES — el catálogo real de esmaltes: código, nombre,
   colección, acabado, fotos, descripción, oferta y precio.
   El stock que se ve acá NO se carga en esta pantalla: se
   sincroniza solo, del lado de la app de Intencional, desde
   Compras + los movimientos de "Stock" (mismo cálculo, por
   código). Acá es puramente de lectura: es la única cosa que
   esta página usa de la app de Intencional.

   La vista es una galería de fichas (como el catálogo impreso),
   no una lista de filas: acá se administra, no se "mira" un
   listado — por eso cada ficha ya muestra foto, swatch, precio y
   estado de un vistazo, sin tener que entrar a cada una.
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
      (enOferta ? stat('tag', 'En oferta', String(enOferta), plural(enOferta, 'color', 'colores'), 'var(--dorado)') : '') +
    '</div>' +

    '<div class="colores-toolbar">' +
      '<div class="buscador">' +
        '<span class="ic-lupa">' + ic('search', 15) + '</span>' +
        '<input class="campo-input" value="' + esc(_colorBusca) + '" placeholder="Buscar por código o nombre" ' +
          'oninput="setBuscaColor(this.value)"/>' +
      '</div>' +
      selectFiltroColor('_colorColeccionFiltro', 'Todas las colecciones', valoresUnicos('coleccion')) +
      selectFiltroColor('_colorAcabadoFiltro', 'Todos los acabados', valoresUnicos('acabado')) +
      '<label style="font-size:12.5px;color:var(--muted);display:flex;align-items:center;gap:7px;cursor:pointer;white-space:nowrap">' +
        '<input type="checkbox" onchange="setSoloActivosColor(this.checked)"' + (_colorSoloActivos ? ' checked' : '') + '/> Solo activos' +
      '</label>' +
    '</div>' +

    '<div id="colores-lista"></div>';

  pintarListaColores();
}

function selectFiltroColor(varName, placeholder, opciones) {
  var actual = window[varName];
  return '<select class="campo-input" style="max-width:190px" onchange="' + varName + '=this.value;pintarColores()">' +
    '<option value="">' + esc(placeholder) + '</option>' +
    opciones.map(function (o) {
      return '<option value="' + esc(o) + '"' + (actual === o ? ' selected' : '') + '>' + esc(o) + '</option>';
    }).join('') +
  '</select>';
}

function setBuscaColor(v) { _colorBusca = v; pintarListaColores(); }
function setSoloActivosColor(v) { _colorSoloActivos = v; pintarColores(); }

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

  cont.innerHTML = '<div class="colores-grilla">' + lista.map(tarjetaColor).join('') + '</div>';
}

function tarjetaColor(c) {
  var sinStock = (+c.stock || 0) <= 0;
  var imagen = c.imagen_url || c.imagen_una_url || '';
  /* Si la foto no llega a cargar (link roto, se borró del hosting,
     etc.) se esconde sola y queda el ícono de "sin imagen" en vez
     de un rectángulo vacío feo — ver imagenRota() más abajo. */
  var media = imagen
    ? '<img src="' + esc(imagen) + '" alt="" loading="lazy" onerror="imagenRota(this)"/>'
    : '<span class="sin-imagen">' + ic('image', 26) + '</span>';

  var precioHTML = '';
  if (bool(c.en_oferta) && +c.precio_oferta > 0) {
    precioHTML = '<div class="color-card-precio">' +
      (+c.precio > 0 ? '<span class="tachado">' + plata(+c.precio) + '</span>' : '') +
      '<span class="oferta">' + plata(+c.precio_oferta) + '</span></div>';
  } else if (+c.precio > 0) {
    precioHTML = '<div class="color-card-precio">' + plata(+c.precio) + '</div>';
  }

  return '<button class="color-card' + (bool(c.activo) ? '' : ' inactivo') + '" onclick="editarColor(' + c.id + ')">' +
    '<div class="color-card-media">' +
      '<span class="color-card-num">N.° ' + esc(c.codigo) + '</span>' +
      (bool(c.en_oferta) ? '<span class="color-card-oferta">Oferta</span>' : '') +
      media +
      (sinStock ? '<span class="color-card-stockcero">Sin stock</span>' : '') +
    '</div>' +
    '<div class="color-card-pie">' +
      '<span class="color-card-swatch" style="background:' + esc(c.hex || '#ddd') + '"></span>' +
      '<div class="color-card-nombre">' + esc(c.nombre || c.codigo) +
        (!bool(c.activo) ? ' <span class="pin pin-neutro" style="vertical-align:1px">Oculto</span>' : '') +
      '</div>' +
      '<div class="color-card-codigo">N° ' + esc(c.codigo) + '</div>' +
      precioHTML +
    '</div>' +
  '</button>';
}

function imagenRota(img) {
  img.classList.add('rota');
  var span = document.createElement('span');
  span.className = 'sin-imagen';
  span.innerHTML = ic('image', 26);
  img.insertAdjacentElement('afterend', span);
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

/* ── Fotos: arrastrar o elegir un archivo, sube solo ──────────
   Reemplaza los campos de URL de toda la vida. _imgActual guarda
   lo que va a quedar guardado (arranca con lo que ya tenía el
   color); subirArchivoColor() lo sube a Supabase Storage y
   actualiza esto y la vista previa. */
var _imgActual = { frasco: '', una: '' };
var _SUBEIMG_CFG = {
  frasco: { titulo: 'Foto del frasco', ayuda: 'JPG, PNG o WEBP · fondo claro/blanco · hasta 5 MB. Vacía = el catálogo dibuja una uña con el color de arriba.' },
  una:    { titulo: 'Foto de una uña con este color', ayuda: 'Opcional: primer plano de la uña ya pintada. Vacía = se usa solo la del frasco.' }
};

function subeimgHTML(campo) {
  var cfg = _SUBEIMG_CFG[campo];
  var url = _imgActual[campo];
  return '<div class="campo" id="subeimg-wrap-' + campo + '"><div class="campo-etiq">' + esc(cfg.titulo) + '</div>' +
    '<div class="subeimg" ' +
      'ondragover="event.preventDefault();event.stopPropagation();this.classList.add(\'arrastrando\')" ' +
      'ondragleave="this.classList.remove(\'arrastrando\')" ' +
      'ondrop="event.preventDefault();this.classList.remove(\'arrastrando\');subirArchivoColor((event.dataTransfer.files||[])[0],\'' + campo + '\')">' +
      '<div class="subeimg-preview" id="subeimg-prev-' + campo + '">' +
        (url ? '<img src="' + esc(url) + '"/>' : '<span class="sin-imagen">' + ic('image', 22) + '</span>') +
      '</div>' +
      '<div class="subeimg-info">' +
        '<div class="subeimg-titulo">Arrastrá una foto acá o tocá "Subir"</div>' +
        '<div class="subeimg-ayuda">' + esc(cfg.ayuda) + '</div>' +
      '</div>' +
      '<div class="subeimg-acciones">' +
        '<button type="button" class="subeimg-btn" id="subeimg-btn-' + campo + '" onclick="porId(\'archivo-' + campo + '\').click()">' +
          ic('upload', 14) + ' ' + (url ? 'Cambiar' : 'Subir') + '</button>' +
        (url ? '<button type="button" class="subeimg-btn quitar" onclick="quitarImagenColor(\'' + campo + '\')" aria-label="Quitar imagen">' + ic('trash', 14) + '</button>' : '') +
      '</div>' +
      '<input type="file" accept="image/*" id="archivo-' + campo + '" onchange="subirArchivoColor(this.files[0],\'' + campo + '\');this.value=\'\'"/>' +
    '</div></div>';
}

function repintarSubeimg(campo) {
  var envoltorio = porId('subeimg-wrap-' + campo);
  if (envoltorio) envoltorio.outerHTML = subeimgHTML(campo);
}

async function subirArchivoColor(archivo, campo) {
  if (!archivo) return;
  var prev = porId('subeimg-prev-' + campo);
  var btn = porId('subeimg-btn-' + campo);
  if (!prev) return;
  var previoHTML = prev.innerHTML;
  prev.innerHTML = '<div class="girador"></div>';
  if (btn) btn.disabled = true;
  try {
    var url = await subirImagen(archivo, campo === 'una' ? 'una' : 'frasco');
    _imgActual[campo] = url;
    repintarSubeimg(campo);
    toast('Imagen subida');
  } catch (e) {
    prev.innerHTML = previoHTML;
    if (btn) btn.disabled = false;
    toast(e.message, 'error');
  }
}
function quitarImagenColor(campo) {
  _imgActual[campo] = '';
  repintarSubeimg(campo);
}

function abrirFormColor(c) {
  var esNuevo = !c;
  c = c || {
    codigo: '', nombre: '', coleccion: '', acabado: '', hex: '', imagen_url: '', imagen_una_url: '',
    descripcion: '', activo: true, en_oferta: false, precio: '', precio_oferta: '', oferta_pack: '', oferta_nota: '',
    stock: 0
  };
  _imgActual = { frasco: c.imagen_url || '', una: c.imagen_una_url || '' };

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
      '<input class="color-swatch-input" type="color" id="col-hex" value="' + esc(c.hex || '#7c2635') + '"/></div>' +

    subeimgHTML('frasco') +
    subeimgHTML('una') +

    '<div class="campo"><div class="campo-etiq">Descripción (opcional)</div>' +
      '<textarea class="campo-input" id="col-descripcion" rows="1" oninput="ajustarAlturaTextarea(this)" ' +
        'placeholder="Ej: Rojo intenso de alto brillo.&#10;Ideal para looks *clásicos*.">' + esc(c.descripcion || '') + '</textarea>' +
      '<div class="campo-ayuda">Se ve en la ficha de detalle del catálogo, tal cual la escribas acá: respeta mayúsculas y renglones, y una palabra entre *asteriscos* sale en <strong>negrita</strong>. Si la dejás vacía, se arma una automática con la colección y el acabado.</div></div>' +

    '<div class="campo-etiq" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">Precio</div>' +
    '<div class="par-campos">' +
      '<div class="pc-1"><div class="campo-etiq">Precio de lista</div>' +
        '<input class="campo-input" id="col-precio" type="number" inputmode="decimal" min="0" step="0.01" value="' + esc(c.precio || '') + '" placeholder="0"/></div>' +
      '<div class="pc-2"><div class="campo-etiq">Precio de oferta</div>' +
        '<input class="campo-input" id="col-precio-oferta" type="number" inputmode="decimal" min="0" step="0.01" value="' + esc(c.precio_oferta || '') + '" placeholder="0"/></div>' +
    '</div>' +
    '<div class="par-campos">' +
      '<div class="pc-1"><div class="campo-etiq">Pack mínimo para la oferta (opcional)</div>' +
        '<input class="campo-input" id="col-oferta-pack" type="number" inputmode="numeric" min="0" step="1" value="' + esc(c.oferta_pack || '') + '" placeholder="Ej: 6"/>' +
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

  /* La descripción arranca en 1 renglón (rows="1"); si el color ya
     tenía texto cargado, esto la estira a su altura real apenas se
     abre, en vez de mostrarla recortada hasta el primer tecleo. */
  ajustarAlturaTextarea(porId('col-descripcion'));
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
  var imagen_url = _imgActual.frasco;
  var imagen_una_url = _imgActual.una;
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
