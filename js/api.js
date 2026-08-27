/* ═══════════════════════════════════════════════════════════
   API — sesión (Supabase Auth) + lecturas/escrituras REST.
   Versión simplificada de la de la app de Intencional: acá no
   hace falta cola de pendientes sin conexión ni service worker,
   es una herramienta chica de equipo, no la app de todos los días.
   ═══════════════════════════════════════════════════════════ */

var TOPE_PAGINA = 1000;
var _sesion = null;
var _cache = {};
var TTL_CACHE = 60 * 1000;   // 1 minuto: acá conviene ver los datos frescos seguido

/* ── Sesión ──────────────────────────────────────────────── */
function sesionActual() { return _sesion; }
function tokenActual() { return (_sesion && _sesion.access_token) || SB_KEY; }

function guardarSesion(s) {
  if (s && s.expires_in && !s.expires_at) {
    s.expires_at = Math.floor(Date.now() / 1000) + (+s.expires_in || 3600);
  }
  _sesion = s;
  try { localStorage.setItem('catadmin_sesion', JSON.stringify(s)); } catch (e) {}
}
function sesionPorVencer() {
  if (!_sesion || !_sesion.expires_at) return false;
  return (_sesion.expires_at - 60) <= Math.floor(Date.now() / 1000);
}

var _renovando = null;
async function renovarSesion() {
  if (!_sesion || !_sesion.refresh_token) return null;
  if (_renovando) return _renovando;
  _renovando = (async function () {
    try {
      var d = await authFetch('token?grant_type=refresh_token', {
        method: 'POST', body: JSON.stringify({ refresh_token: _sesion.refresh_token })
      });
      guardarSesion(d);
      return d;
    } catch (e) {
      borrarSesion();
      return null;
    } finally { _renovando = null; }
  })();
  return _renovando;
}
async function asegurarSesion() {
  if (_sesion && sesionPorVencer()) await renovarSesion();
}
function recuperarSesion() {
  try {
    var s = JSON.parse(localStorage.getItem('catadmin_sesion') || 'null');
    if (s && s.access_token) {
      _sesion = s;
      if (sesionPorVencer() && s.refresh_token) renovarSesion();
      return s;
    }
  } catch (e) {}
  return null;
}
function borrarSesion() {
  _sesion = null;
  try { localStorage.removeItem('catadmin_sesion'); } catch (e) {}
}

async function authFetch(ruta, opciones) {
  var res = await fetch(SB_URL + '/auth/v1/' + ruta, Object.assign({
    headers: Object.assign({ apikey: SB_KEY, 'Content-Type': 'application/json' }, opciones && opciones.headers)
  }, opciones));
  var txt = await res.text();
  var data = txt ? JSON.parse(txt) : {};
  if (!res.ok) throw new Error(data.error_description || data.msg || data.error || 'No se pudo iniciar sesión');
  return data;
}

/* Solo pide la contraseña: el email fijo (ADMIN_LOGIN_EMAIL) queda
   adentro, así en la pantalla de login no hay que escribirlo. */
async function iniciarSesion(contrasena) {
  var d = await authFetch('token?grant_type=password', {
    method: 'POST', body: JSON.stringify({ email: ADMIN_LOGIN_EMAIL, password: contrasena })
  });
  guardarSesion(d);
  return d;
}
async function cerrarSesion() {
  try {
    if (_sesion) await authFetch('logout', { method: 'POST', headers: { Authorization: 'Bearer ' + _sesion.access_token } });
  } catch (e) {}
  borrarSesion();
  _cache = {};
}

/* ── REST ────────────────────────────────────────────────── */
async function rest(ruta, opciones, _reintento) {
  opciones = opciones || {};
  var metodo = (opciones.method || 'GET').toUpperCase();
  await asegurarSesion();
  var ctrl = new AbortController();
  var corte = setTimeout(function () { ctrl.abort(); }, opciones.timeout || 20000);
  try {
    var res = await fetch(SB_URL + '/rest/v1/' + ruta, {
      method: metodo, signal: ctrl.signal, body: opciones.body,
      headers: Object.assign({
        apikey: SB_KEY, Authorization: 'Bearer ' + tokenActual(),
        'Content-Type': 'application/json', Prefer: 'return=representation'
      }, opciones.headers || {})
    });
    clearTimeout(corte);
    var txt = await res.text();
    if ((res.status === 401 || res.status === 403) && !_reintento && _sesion && _sesion.refresh_token) {
      var nueva = await renovarSesion();
      if (nueva) return rest(ruta, opciones, true);
    }
    if (!res.ok) throw new Error(mensajeDeError(res.status, txt));
    return txt ? JSON.parse(txt) : [];
  } catch (e) {
    clearTimeout(corte);
    if (e.name === 'AbortError') throw new Error('La base tardó demasiado en responder. Revisá la conexión.');
    throw e;
  }
}
function mensajeDeError(status, txt) {
  var d = {};
  try { d = JSON.parse(txt); } catch (e) {}
  if (status === 401 || status === 403) return 'La sesión venció. Volvé a entrar.';
  if (d.message && /column .* does not exist/.test(d.message)) {
    return 'Falta una columna en la base: ' + d.message + '. ¿Corriste el SQL?';
  }
  return d.message || d.hint || ('Error ' + status);
}

/* ── Lecturas ────────────────────────────────────────────── */
async function traerTodo(tabla, consulta) {
  var pk = TABLAS[tabla] || 'id';
  var filas = [], offset = 0;
  for (;;) {
    var q = tabla + '?select=*' + (consulta ? '&' + consulta : '') +
      '&order=' + encodeURIComponent(pk) + '.asc' + '&limit=' + TOPE_PAGINA + '&offset=' + offset;
    var lote = await rest(q);
    filas = filas.concat(lote);
    if (lote.length < TOPE_PAGINA) break;
    offset += TOPE_PAGINA;
    if (offset > 200000) break;
  }
  return filas;
}

var _enVuelo = {};
async function traerCacheado(tabla, consulta) {
  var clave = tabla + '|' + (consulta || '');
  var c = _cache[clave];
  if (c && (Date.now() - c.ts) < TTL_CACHE) return c.datos;
  if (_enVuelo[clave]) return _enVuelo[clave];
  _enVuelo[clave] = (async function () {
    try {
      var datos = await traerTodo(tabla, consulta);
      _cache[clave] = { datos: datos, ts: Date.now() };
      return datos;
    } finally { delete _enVuelo[clave]; }
  })();
  return _enVuelo[clave];
}
function invalidarCache(tabla) {
  if (!tabla) { _cache = {}; return; }
  Object.keys(_cache).forEach(function (k) { if (k.indexOf(tabla + '|') === 0) delete _cache[k]; });
}

/* ── Escrituras ──────────────────────────────────────────── */
async function crear(tabla, fila) {
  var r = await rest(tabla, { method: 'POST', body: JSON.stringify(fila) });
  invalidarCache(tabla);
  return r;
}
async function actualizar(tabla, valorPk, cambios) {
  var pk = TABLAS[tabla] || 'id';
  var r = await rest(tabla + '?' + pk + '=eq.' + encodeURIComponent(valorPk), {
    method: 'PATCH', body: JSON.stringify(cambios)
  });
  invalidarCache(tabla);
  return r;
}
async function borrar(tabla, valorPk) {
  var pk = TABLAS[tabla] || 'id';
  var r = await rest(tabla + '?' + pk + '=eq.' + encodeURIComponent(valorPk), { method: 'DELETE' });
  invalidarCache(tabla);
  return r;
}

/* ── Imágenes (Supabase Storage) ────────────────────────────
   Bucket público "colores-imagenes": cualquiera puede VER las
   fotos (así las carga el catálogo sin login), pero solo alguien
   autenticado —el equipo, con la sesión de esta página— puede
   subir o reemplazar un archivo. Ver migración SQL:
   agregar_storage_imagenes.sql */
var BUCKET_IMAGENES = 'colores-imagenes';
var TAMANO_MAX_IMAGEN = 5 * 1024 * 1024; // 5 MB

async function subirImagen(archivo, prefijo) {
  if (!archivo) throw new Error('No se eligió ningún archivo.');
  if (!/^image\//.test(archivo.type)) throw new Error('Tiene que ser una imagen (jpg, png o webp).');
  if (archivo.size > TAMANO_MAX_IMAGEN) throw new Error('La imagen pesa más de 5 MB — comprimila un poco antes de subirla.');

  await asegurarSesion();
  var ext = (/\.([a-z0-9]+)$/i.exec(archivo.name || '') || [, 'jpg'])[1].toLowerCase();
  var ruta = (prefijo || 'color') + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;

  var res = await fetch(SB_URL + '/storage/v1/object/' + BUCKET_IMAGENES + '/' + ruta, {
    method: 'POST',
    headers: {
      apikey: SB_KEY,
      Authorization: 'Bearer ' + tokenActual(),
      'Content-Type': archivo.type || 'application/octet-stream',
      'x-upsert': 'true'
    },
    body: archivo
  });
  if (!res.ok) {
    var txt = await res.text(), d = {};
    try { d = JSON.parse(txt); } catch (e) {}
    throw new Error(d.message || d.error || 'No se pudo subir la imagen (' + res.status + ').');
  }
  return SB_URL + '/storage/v1/object/public/' + BUCKET_IMAGENES + '/' + ruta;
}
