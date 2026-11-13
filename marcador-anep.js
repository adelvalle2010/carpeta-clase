/* Marcador «📒 Migrar desde la Libreta» — fuente legible del marcador que se instala desde anep.html.
   Lee el paquete que copia la Libreta de Clase (botón «⇪ Migrar a ANEP») y completa la pantalla abierta:
     · asistencia  → Registro de inasistencias de UTU (Pasaje de Lista): horas injustificadas y justificadas de una fecha
     · evaluacion  → Portafolio Docente → Evaluación grupal: tipo de actividad, fecha, descripción y notas
     · cierre      → Portafolio Docente → Cerrar promedios: calificación y juicio conceptual del período abierto
   Nunca aprieta «Guardar» y no envía datos a ningún lado. Después de cambiar este archivo: node armar-anep.js */
(function () {
  "use strict";
  if (window.__migrarLibreta) { window.__migrarLibreta.mostrar(); return; }

  var norm = function (s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ ]/g, " ").replace(/\s+/g, " ").trim(); };
  var toks = function (s) { return norm(s).split(" ").filter(function (w) { return w.length > 1 && !/^\d+$/.test(w); }); };
  var vis = function (e) { return !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length)); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var byId = function (id) { return document.getElementById(id); };
  var NOMBRES = { asistencia: "asistencia", evaluacion: "evaluación", cierre: "cierre de promedios" };
  var DONDE = { asistencia: "«Pasaje de Lista» (Registro de inasistencias de UTU)", evaluacion: "Calificaciones → Evaluación grupal → Nueva evaluación grupal", cierre: "Calificaciones → Cerrar promedios" };

  function poner(el, v) {
    try { el.dispatchEvent(new Event("focus")); } catch (e) {}
    var d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value");
    if (d && d.set) d.set.call(el, v); else el.value = v;
    ["input", "change", "keyup", "blur"].forEach(function (t) { el.dispatchEvent(new Event(t, { bubbles: true })); });
  }
  var marca = function (el, color) { el.style.outline = color ? "3px solid " + color : ""; el.style.outlineOffset = color ? "1px" : ""; };
  var dmy = function (iso) { var p = String(iso).split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0].slice(2) : ""; };
  var mismaFecha = function (iso, txt) { // "2026-11-13" contra "13/11/26", "13/11/2026" o "3/8/26"
    var p = String(iso).split("-").map(Number), q = String(txt || "").trim().split("/").map(Number);
    return p.length === 3 && q.length === 3 && p[2] === q[0] && p[1] === q[1] && p[0] % 100 === q[2] % 100;
  };

  /* ---- qué pantalla es ---- */
  function pantalla() {
    var sp = Array.prototype.slice.call(document.querySelectorAll('[id^="span_BDALUPERNOMCOM_"]'));
    if (sp.length && byId("vFECHA")) {
      return { tipo: "asistencia", fecha: byId("vFECHA").value, filas: sp.map(function (s) {
        var suf = s.id.slice("span_BDALUPERNOMCOM_".length);
        return { nombre: s.textContent, inj: byId("vCNTI_" + suf), jus: byId("vCNTJ_" + suf) };
      }).filter(function (f) { return f.inj && f.jus && !f.inj.disabled && !f.jus.disabled; }) };
    }
    var F = function (id) { return byId("form_evaluacion_grupal:" + id); };
    if (F("input_tipo_evaluacion")) {
      return { tipo: "evaluacion", selTipo: F("input_tipo_evaluacion"), fecha: F("input_fecha_eval_grupal_input"), desc: F("evalDescripc"), tipoCalif: F("tipo_calif"),
        filas: Array.prototype.map.call(document.querySelectorAll("tr.estudiante_fila"), function (tr) {
          var n = tr.querySelector("td.fit-content-eval-est") || tr.cells[1];
          return { nombre: n ? n.textContent : "", nota: tr.querySelector("input.campoCalificacion"), texto: tr.querySelector("td.calif-comentario textarea") || tr.querySelector("textarea") };
        }).filter(function (f) { return f.nota && !f.nota.disabled && !f.nota.readOnly; }) };
    }
    var al = document.querySelectorAll("tr.filaalumno");
    if (al.length) {
      return { tipo: "cierre", filas: Array.prototype.map.call(al, function (tr) {
        var n = tr.querySelector("td.nombre");
        var nota = Array.prototype.filter.call(tr.querySelectorAll("input.campoCalificacion"), function (e) { return vis(e) && !e.disabled && !e.readOnly; });
        var ta = Array.prototype.filter.call(tr.querySelectorAll("textarea"), function (e) { return vis(e) && !e.disabled && !e.readOnly; });
        return { nombre: n ? n.textContent : "", nota: nota[nota.length - 1] || null, texto: ta[ta.length - 1] || null };
      }).filter(function (f) { return f.nota || f.texto; }) };
    }
    return null;
  }

  /* ---- emparejar nombres: «Ana Pérez» encuentra a «PEREZ GOMEZ, ANA MARIA»; si hay dos posibles, no completa ---- */
  function emparejar(pag, paq) {
    var P = pag.map(function (f) { return { n: norm(f.nombre.replace(/^\s*\d+\s+/, "")), t: toks(f.nombre) }; });
    var res = paq.map(function (f) {
      var n = norm(f.nombre), t = toks(f.nombre), c = [];
      if (!t.length) return -1;
      P.forEach(function (p, i) { if (p.n === n) c.push(i); });
      if (!c.length) P.forEach(function (p, i) {
        var chico = t.length <= p.t.length ? t : p.t, grande = t.length <= p.t.length ? p.t : t;
        if (chico.length && chico.every(function (w) { return grande.indexOf(w) >= 0; })) c.push(i);
      });
      return c.length === 1 ? c[0] : c.length ? -2 : -1;
    });
    var usos = {};
    res.forEach(function (i) { if (i >= 0) usos[i] = (usos[i] || 0) + 1; });
    return res.map(function (i) { return i >= 0 && usos[i] > 1 ? -2 : i; });
  }

  function leerPaquete(txt) {
    var m = /LIBRETA-ANEP\s*(\{[\s\S]*\})/.exec(String(txt || ""));
    if (!m) return null;
    try { var p = JSON.parse(m[1]); return p && p.app === "libreta-anep" && Array.isArray(p.filas) && NOMBRES[p.tipo] ? p : null; } catch (e) { return null; }
  }
  function resumenPaquete(p) {
    var n = p.filas.length + " estudiante" + (p.filas.length === 1 ? "" : "s");
    if (p.tipo === "asistencia") return "Asistencia del " + dmy(p.fecha) + " · " + n + " · «" + p.grupo + "»";
    if (p.tipo === "evaluacion") return "Evaluación «" + p.actividad + "» del " + dmy(p.fecha) + " · " + n + " · «" + p.grupo + "»";
    return "Cierre (promedio " + p.promedio + ") · " + n + " · «" + p.grupo + "»";
  }

  /* ---- completar ---- */
  var hechos = [], marcados = [];
  function escribir(el, v, reemplazar, r, nombre, vacio) {
    var act = String(el.value == null ? "" : el.value).trim();
    if (act === String(v)) { r.iguales++; marca(el, "#2f9e5b"); marcados.push(el); return; }
    if (act !== "" && act !== vacio && !reemplazar) { r.ocupados.push(nombre); marca(el, "#c2410c"); marcados.push(el); return; }
    hechos.push([el, el.value]); poner(el, String(v)); marca(el, "#2f9e5b"); marcados.push(el); r.puestos++;
  }
  function completar(p, reemplazar) {
    var pg = pantalla(), r = { puestos: 0, iguales: 0, ocupados: [], sin: [], dudosos: [], avisos: [], error: "" };
    if (!pg) { r.error = "Esta pantalla no tiene nada para completar. Para este paquete abrí " + DONDE[p.tipo] + "."; return r; }
    if (pg.tipo !== p.tipo) { r.error = "El paquete copiado es de " + NOMBRES[p.tipo] + ", y esta pantalla es de " + NOMBRES[pg.tipo] + ". Abrí " + DONDE[p.tipo] + ", o copiá el otro paquete en la Libreta."; return r; }
    if (!pg.filas.length) { r.error = p.tipo === "cierre" ? "No encontré casilleros abiertos: desplegá el período a cerrar (por ejemplo Oct-Nov) y probá de nuevo." : "No encontré casilleros para completar en esta pantalla."; return r; }
    if (p.tipo === "asistencia" && !mismaFecha(p.fecha, pg.fecha)) { r.error = "El paquete es del " + dmy(p.fecha) + " y esta pantalla está en " + pg.fecha + ". Cambiá la fecha de la pantalla a " + dmy(p.fecha) + ", esperá a que recargue la lista y tocá «Completar» otra vez."; return r; }
    if (p.tipo === "evaluacion") {
      if (pg.tipoCalif && pg.tipoCalif.value !== "numerico_1_10") { r.error = "En «Tipos de calificaciones» elegí «Calificaciones del 1 al 10» y tocá «Completar» otra vez."; return r; }
      var op = Array.prototype.filter.call(pg.selTipo.options, function (o) { return norm(o.text) === norm(p.actividad); })[0];
      if (!pg.selTipo.disabled && op) { if (pg.selTipo.value !== op.value) { hechos.push([pg.selTipo, pg.selTipo.value]); poner(pg.selTipo, op.value); } marca(pg.selTipo, "#2f9e5b"); marcados.push(pg.selTipo); }
      else r.avisos.push("No pude poner el tipo de actividad «" + p.actividad + "»: elegilo a mano.");
      if (pg.fecha && !pg.fecha.disabled) { if (!mismaFecha(p.fecha, pg.fecha.value)) { hechos.push([pg.fecha, pg.fecha.value]); poner(pg.fecha, dmy(p.fecha)); } marca(pg.fecha, "#2f9e5b"); marcados.push(pg.fecha); }
      if (pg.desc && p.descripcion && (reemplazar || !pg.desc.value.trim())) { hechos.push([pg.desc, pg.desc.value]); poner(pg.desc, p.descripcion); marca(pg.desc, "#2f9e5b"); marcados.push(pg.desc); }
    }
    var par = emparejar(pg.filas, p.filas), usados = {};
    p.filas.forEach(function (f, i) {
      if (par[i] === -1) { r.sin.push(f.nombre); return; }
      if (par[i] === -2) { r.dudosos.push(f.nombre); return; }
      var d = pg.filas[par[i]]; usados[par[i]] = 1;
      if (p.tipo === "asistencia") { escribir(d.inj, f.inj || 0, reemplazar, r, f.nombre, "0"); escribir(d.jus, f.jus || 0, reemplazar, r, f.nombre, "0"); return; }
      if (f.nota !== "" && f.nota != null && d.nota) escribir(d.nota, f.nota, reemplazar, r, f.nombre, "");
      if (p.tipo === "cierre" && f.juicio && d.texto) escribir(d.texto, f.juicio, reemplazar, r, f.nombre + " (juicio)", "");
    });
    r.resto = 0;
    pg.filas.forEach(function (d, i) {
      if (usados[i]) return; r.resto++;
      if (p.tipo !== "asistencia" && d.nota && !String(d.nota.value).trim()) { marca(d.nota, "#e0a100"); marcados.push(d.nota); }
    });
    return r;
  }
  function deshacer() {
    hechos.reverse().forEach(function (h) { poner(h[0], h[1]); }); hechos = [];
    marcados.forEach(function (e) { marca(e, ""); }); marcados = [];
  }

  /* ---- cuadro ---- */
  var host = document.createElement("div");
  host.style.cssText = "position:fixed;top:12px;right:12px;z-index:2147483647";
  var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
  root.innerHTML = '<style>.p{width:370px;max-height:88vh;overflow:auto;background:#fff;color:#1b2333;border:2px solid #2a4ea8;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.3);font:14px/1.45 system-ui,sans-serif;padding:12px 14px;position:relative;text-align:left}h2{margin:0 26px 6px 0;font-size:16px;color:#2a4ea8}textarea{width:100%;box-sizing:border-box;height:64px;font:12px ui-monospace,monospace}label{display:block;margin:6px 0}button{font:inherit;border:0;border-radius:6px;padding:6px 12px;cursor:pointer;background:#2a4ea8;color:#fff;margin:6px 6px 0 0}button.alt{background:#e9edf5;color:#1b2333}button:disabled{opacity:.5;cursor:default}.x{position:absolute;top:4px;right:6px;background:none;color:#1b2333;font-size:20px;padding:0 6px;margin:0}.pq{background:#e8e4f8;border-radius:6px;padding:6px 8px;margin:6px 0}.r{margin-top:8px;font-size:13px}.r ul{margin:4px 0 0;padding-left:18px}.ok{color:#1f7a4d}.av{color:#946200}.mal{color:#b3332b}small{color:#5d6880;display:block;margin-top:6px}</style>' +
    '<div class="p"><button class="x" title="Cerrar">×</button><h2>📒 Migrar desde la Libreta</h2><div class="pq">Buscando lo copiado…</div><textarea placeholder="Si no aparece solo, pegá acá lo copiado en la Libreta (Ctrl+V)"></textarea><label><input type="checkbox" class="rp"> Reemplazar lo que ya esté escrito</label><button class="go">Completar</button><button class="alt un" disabled>Deshacer</button><div class="r"></div><small>No se guarda nada: revisá y apretá «Guardar» en la pantalla.</small></div>';
  var q = function (s) { return root.querySelector(s); };
  var paquete = null;
  function ver() {
    paquete = leerPaquete(q("textarea").value);
    q(".pq").textContent = paquete ? resumenPaquete(paquete) : q("textarea").value.trim() ? "Eso no es un paquete de la Libreta. En la Libreta: Resumen → «⇪ Migrar a ANEP» → Copiar." : "Pegá abajo lo copiado en la Libreta (Resumen → «⇪ Migrar a ANEP»).";
    q(".go").disabled = !paquete;
  }
  function leerPortapapeles() {
    if (!navigator.clipboard || !navigator.clipboard.readText) { ver(); return; }
    navigator.clipboard.readText().then(function (t) { if (leerPaquete(t)) q("textarea").value = t; ver(); }, ver);
  }
  var lista = function (clase, titulo, a) { return a.length ? '<div class="' + clase + '">' + titulo + "<ul>" + a.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" : ""; };
  q("textarea").addEventListener("input", ver);
  q(".x").addEventListener("click", function () { host.remove(); });
  q(".un").addEventListener("click", function () { deshacer(); q(".un").disabled = true; q(".r").innerHTML = "Deshecho: los casilleros volvieron a como estaban."; });
  q(".go").addEventListener("click", function () {
    if (!paquete) return;
    deshacer();
    var r = completar(paquete, q(".rp").checked), el = q(".r");
    if (r.error) { el.innerHTML = '<span class="mal">' + esc(r.error) + "</span>"; return; }
    q(".un").disabled = !hechos.length;
    var que = paquete.tipo === "asistencia" ? "casilleros de horas" : "casilleros";
    el.innerHTML = '<span class="ok"><b>' + r.puestos + "</b> " + que + " completados" + (r.iguales ? " (" + r.iguales + " ya estaban igual)" : "") + ".</span>" +
      lista("av", "Ya tenían otro valor y no se tocaron (en naranja; marcá «Reemplazar» para pisarlos):", r.ocupados) +
      lista("mal", "No los encontré en esta pantalla:", r.sin) +
      lista("av", "Nombre dudoso (coincide con más de un estudiante), completalo a mano:", r.dudosos) +
      lista("av", "Para revisar:", r.avisos) +
      (r.resto ? '<div class="av">' + r.resto + " estudiante" + (r.resto === 1 ? "" : "s") + " de esta pantalla no venía" + (r.resto === 1 ? "" : "n") + " en el paquete" + (paquete.tipo === "asistencia" ? "" : " (casillero vacío en amarillo)") + ".</div>" : "");
  });
  window.__migrarLibreta = { mostrar: function () { if (!host.isConnected) document.body.appendChild(host); leerPortapapeles(); }, _probar: { pantalla: pantalla, completar: completar, deshacer: deshacer, emparejar: emparejar, leerPaquete: leerPaquete } };
  window.__migrarLibreta.mostrar();
})();
