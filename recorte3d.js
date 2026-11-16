// ---------- Recorte 3D (no estilo do topoexport): desenhe um retângulo no mapa e veja o relevo, o fundo do mar,
// a camada ambiental ligada e as ocorrências da espécie como uma maquete 3D. Exporta STL (impressão 3D), GLB (Blender) e PNG.
// Relevo e batimetria: AWS Terrain Tiles (Terrarium: SRTM, GEBCO, ETOPO1). 3D: Three.js (via importmap no index.html).
// Usa as globais do app.js (map, TH, THEMES, WX, S, used/mapRecs, scaleRGBA, rampColor, gradBar…).
(() => {
const R3 = {T: null, opt: {fundo: 'sat', camada: true, pts: true, mar: false, agua: false, exag: 1, iso: false}};
const DEM_URL = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
const SAT_URL = (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
const HYPSO = [[-6000, '#0b2a5b'], [-2500, '#1f4f9f'], [-500, '#2f86c9'], [-50, '#7cc4e4'], [0, '#3d8b4f'], [400, '#8fbf6a'], [900, '#e3d58a'], [1600, '#c39a5c'], [2600, '#8d6e63'], [4200, '#f2f2ee']];
const info = t => { $('r3Info').innerHTML = t; };

// ---------- tiles → canvas ----------
const img = u => new Promise(ok => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = u; });
// zoom em que o recorte cabe em `px` pixels
function zoomFor(b, px, zmax) {
  const a = map.project(b.getNorthWest(), 0), c = map.project(b.getSouthEast(), 0);
  return Math.max(1, Math.min(zmax, Math.floor(Math.log2(px / Math.max(c.x - a.x, c.y - a.y)))));
}
// junta os tiles (Web Mercator, 256 px) num canvas do tamanho exato do recorte; tile que falha (ou sem CORS) fica vazio
async function mosaic(urlOf, z, b) {
  const p0 = map.project(b.getNorthWest(), z), p1 = map.project(b.getSouthEast(), z);
  const x0 = Math.floor(p0.x), y0 = Math.floor(p0.y), w = Math.max(2, Math.round(p1.x - p0.x)), h = Math.max(2, Math.round(p1.y - p0.y));
  const c = Object.assign(document.createElement('canvas'), {width: w, height: h}), ctx = c.getContext('2d'), n = 2 ** z, jobs = [];
  for (let ty = Math.floor(y0 / 256); ty <= Math.floor((y0 + h - 1) / 256); ty++)
    for (let tx = Math.floor(x0 / 256); tx <= Math.floor((x0 + w - 1) / 256); tx++)
      if (ty >= 0 && ty < n) jobs.push(img(urlOf(z, ((tx % n) + n) % n, ty)).then(i => i && ctx.drawImage(i, tx * 256 - x0, ty * 256 - y0)));
  await Promise.all(jobs);
  return Object.assign(c, {x0, y0, z});
}
function decodeDEM(c) { // Terrarium: altura = R·256 + G + B/256 − 32768 (m); negativo = fundo do mar
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, z = new Float32Array(c.width * c.height);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < z.length; i++) { const v = d[4 * i + 3] ? d[4 * i] * 256 + d[4 * i + 1] + d[4 * i + 2] / 256 - 32768 : 0; z[i] = v; if (v < lo) lo = v; if (v > hi) hi = v; }
  const lat = map.unproject([c.x0 + c.width / 2, c.y0 + c.height / 2], c.z).lat;
  return {w: c.width, h: c.height, z, lo, hi, x0: c.x0, y0: c.y0, zoom: c.z, mpp: 40075016.686 * Math.cos(lat * Math.PI / 180) / (256 * 2 ** c.z)};
}
function demAt(D, u, v) { // bilinear, u e v de 0 a 1 (oeste→leste, norte→sul)
  const fx = Math.max(0, Math.min(D.w - 1, u * (D.w - 1))), fy = Math.max(0, Math.min(D.h - 1, v * (D.h - 1)));
  const i = Math.min(D.w - 2, Math.floor(fx)), j = Math.min(D.h - 2, Math.floor(fy)), a = fx - i, b = fy - j, at = (x, y) => D.z[y * D.w + x];
  return at(i, j) * (1 - a) * (1 - b) + at(i + 1, j) * a * (1 - b) + at(i, j + 1) * (1 - a) * b + at(i + 1, j + 1) * a * b;
}
const uvOf = (D, lat, lng) => { const p = map.project([lat, lng], D.zoom); return [(p.x - D.x0) / D.w, (p.y - D.y0) / D.h]; };
const llOf = (D, u, v) => map.unproject([D.x0 + u * D.w, D.y0 + v * D.h], D.zoom);

// relevo colorido (hipsometria + sombreamento vindo do noroeste)
function reliefCanvas(D) {
  if (D.rel) return D.rel;
  const c = Object.assign(document.createElement('canvas'), {width: D.w, height: D.h}), im = new ImageData(D.w, D.h), s = 2 * D.mpp / 2.5;
  for (let y = 0; y < D.h; y++) for (let x = 0; x < D.w; x++) {
    const i = y * D.w + x, e = D.z[i], col = scaleRGBA(HYPSO, e);
    const dx = (D.z[y * D.w + Math.min(D.w - 1, x + 1)] - D.z[y * D.w + Math.max(0, x - 1)]) / s, dy = (D.z[Math.max(0, y - 1) * D.w + x] - D.z[Math.min(D.h - 1, y + 1) * D.w + x]) / s;
    const sh = Math.max(0, (dx * -.6 + dy * .6 + 1) / Math.sqrt(dx * dx + dy * dy + 1)), f = .55 + .5 * Math.min(1.2, sh);
    im.data.set([col[0] * f, col[1] * f, col[2] * f, 255], 4 * i);
  }
  c.getContext('2d').putImageData(im, 0, 0);
  return (D.rel = c);
}
// a camada ambiental ligada no mapa, no mesmo recorte
async function layerCanvas(b, z) {
  const th = THEMES[TH.cur]; if (!th) return null;
  if (th.wx) { // grade do Open-Meteo na hora mostrada no mapa
    if (!WX.grid) return null;
    const p0 = map.project(b.getNorthWest(), z), p1 = map.project(b.getSouthEast(), z), w = 400, h = Math.max(2, Math.round(w * (p1.y - p0.y) / (p1.x - p0.x)));
    const c = Object.assign(document.createElement('canvas'), {width: w, height: h}), im = new ImageData(w, h), f = WX.grid.vals[TH.i];
    for (let y = 0; y < h; y++) {
      const lat = map.unproject([p0.x, p0.y + (p1.y - p0.y) * (y + .5) / h], z).lat;
      for (let x = 0; x < w; x++) {
        const v = wxSample(f, lat, b.getWest() + (b.getEast() - b.getWest()) * (x + .5) / w); if (isNaN(v)) continue;
        const col = scaleRGBA(th.stops, v); im.data.set([col[0], col[1], col[2], col[3]], 4 * (y * w + x));
      }
    }
    c.getContext('2d').putImageData(im, 0, 0);
    return c;
  }
  const l = TH.layer; if (!(l instanceof L.TileLayer)) return null; // ecorregiões (vetor) não viram textura
  const zl = Math.min(z, l.options.maxNativeZoom ?? l.options.maxZoom ?? 18);
  return mosaic((zz, x, y) => { const old = l._tileZoom, c = L.point(x, y); c.z = zz; l._tileZoom = zz; try { return l.getTileUrl(c); } finally { l._tileZoom = old; } }, zl, b);
}
function ptColor(r) { // mesmas cores dos pontos do mapa
  const v = $('colorBy').value, x = r[v];
  return v === 'flag' ? (serious(r) ? '#e5533d' : '#0056ff') : v === 'uc' ? UCCOL[ucIdx(r)]
    : x == null || !scale || !RAMPS[v] ? '#a3abc4' : rampColor(RAMPS[v], (x - scale.lo) / (scale.hi - scale.lo || 1));
}

// ---------- cena ----------
async function three() {
  if (!R3.T) {
    const [T, {OrbitControls}] = await Promise.all([import('three'), import('three/addons/controls/OrbitControls.js')]);
    R3.T = T; R3.Orbit = OrbitControls;
    const r = R3.r = new T.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
    r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.setClearColor('#0b1f1b');
    $('r3Stage').appendChild(r.domElement);
    R3.scene = new T.Scene();
    R3.scene.add(new T.HemisphereLight('#ffffff', '#3a3226', 1.6));
    const sun = new T.DirectionalLight('#ffffff', 1.8); sun.position.set(-120, 200, -90); R3.scene.add(sun);
    R3.grp = new T.Group(); R3.scene.add(R3.grp);
    new ResizeObserver(() => R3.cam && size()).observe($('r3Stage'));
    $('r3Stage').addEventListener('pointermove', e => { R3.mv = e; if (!R3.mvRaf) R3.mvRaf = requestAnimationFrame(readout); });
  }
  return R3.T;
}
function size() {
  const el = $('r3Stage'), w = el.clientWidth, h = el.clientHeight, c = R3.cam; if (!w || !h) return;
  R3.r.setSize(w, h);
  if (c.isOrthographicCamera) { const s = R3.dims.d * .5, a = w / h; Object.assign(c, {left: -s * a, right: s * a, top: s, bottom: -s}); } else c.aspect = w / h;
  c.updateProjectionMatrix();
}
function camera() {
  const T = R3.T, d = R3.dims.d, el = $('r3Stage');
  R3.cam = R3.opt.iso ? new T.OrthographicCamera(-1, 1, 1, -1, -2000, 4000) : new T.PerspectiveCamera(35, el.clientWidth / el.clientHeight || 1.6, .5, 5000);
  if (R3.opt.iso) R3.cam.position.set(d, d * .8165, d); else R3.cam.position.set(d * .7, d * .75, d * 1.05); // isométrica verdadeira: 35,26° de elevação
  R3.ctl?.dispose();
  R3.ctl = new R3.Orbit(R3.cam, R3.r.domElement); R3.ctl.enableDamping = true; R3.ctl.maxPolarAngle = Math.PI * .495;
  R3.ctl.target.set(0, R3.dims.mid, 0); R3.ctl.update();
  size();
}
function clear() {
  R3.grp.traverse(o => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose?.(); });
  R3.grp.clear();
}
function build() {
  const T = R3.T, D = R3.dem, o = R3.opt; clear();
  const max = Math.max(D.w, D.h), X = 200 * D.w / max, Z = 200 * D.h / max, d = Math.max(X, Z);
  const gx = Math.max(2, Math.round(256 * D.w / max)), gy = Math.max(2, Math.round(256 * D.h / max));
  const k = X / (D.w * D.mpp) * o.exag, H = e => (o.mar ? Math.max(e, 0) : e) * k; // unidades por metro × exagero
  const geo = new T.PlaneGeometry(X, Z, gx - 1, gy - 1); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position; let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < pos.count; i++) { const y = H(demAt(D, (i % gx) / (gx - 1), Math.floor(i / gx) / (gy - 1))); pos.setY(i, y); lo = Math.min(lo, y); hi = Math.max(hi, y); }
  geo.computeVertexNormals();
  const tex = new T.CanvasTexture(texture()); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = R3.r.capabilities.getMaxAnisotropy();
  const terrain = new T.Mesh(geo, new T.MeshLambertMaterial({map: tex})); terrain.name = 'relevo';
  // paredes e fundo: o bloco da maquete
  const yb = lo - Math.max(3, .04 * d), v = [], P = i => [pos.getX(i), pos.getY(i), pos.getZ(i)];
  const side = idx => { for (let j = 0; j < idx.length - 1; j++) { const [ax, ay, az] = P(idx[j]), [bx, by, bz] = P(idx[j + 1]); v.push(ax, ay, az, ax, yb, az, bx, by, bz, bx, by, bz, ax, yb, az, bx, yb, bz); } };
  const row = r => Array.from({length: gx}, (_, i) => r * gx + i), col = c => Array.from({length: gy}, (_, j) => j * gx + c);
  side(row(0).reverse()); side(row(gy - 1)); side(col(0)); side(col(gx - 1).reverse());
  v.push(-X / 2, yb, -Z / 2, X / 2, yb, -Z / 2, X / 2, yb, Z / 2, -X / 2, yb, -Z / 2, X / 2, yb, Z / 2, -X / 2, yb, Z / 2);
  const wg = new T.BufferGeometry(); wg.setAttribute('position', new T.Float32BufferAttribute(v, 3)); wg.computeVertexNormals();
  const walls = new T.Mesh(wg, new T.MeshLambertMaterial({color: '#6b5643', side: T.DoubleSide})); walls.name = 'base';
  R3.grp.add(terrain, walls);
  if (o.agua && !o.mar && D.lo < 0) {
    const wp = new T.PlaneGeometry(X, Z); wp.rotateX(-Math.PI / 2);
    const water = new T.Mesh(wp, new T.MeshPhongMaterial({color: '#2a8fd8', transparent: true, opacity: .32, depthWrite: false, shininess: 80})); water.name = 'agua';
    R3.grp.add(water);
  }
  let n = 0;
  if (o.pts && S.recs.length) { // ocorrências: na profundidade registrada (OBIS) ou na superfície; em terra, sobre o relevo
    const recs = mapRecs().filter(r => R3.box.contains([r.lat, r.lon])).slice(0, 8000), rad = d / 230;
    if ((n = recs.length)) {
      const m = new T.InstancedMesh(new T.SphereGeometry(rad, 10, 8), new T.MeshLambertMaterial(), n), mx = new T.Matrix4(), c = new T.Color();
      recs.forEach((r, i) => {
        const [u, w] = uvOf(D, r.lat, r.lon), e = demAt(D, u, w);
        mx.makeTranslation((u - .5) * X, H(Math.max(e, r.depth != null ? -r.depth : 0)) + rad * 1.6, (w - .5) * Z);
        m.setMatrixAt(i, mx); m.setColorAt(i, c.set(ptColor(r)));
      });
      m.name = 'ocorrencias'; R3.grp.add(m);
    }
  }
  R3.terrain = terrain;
  R3.dims = {X, Z, d, mid: (lo + hi) / 2, k, H};
  return n;
}
function texture() {
  const s = R3.sat, c = Object.assign(document.createElement('canvas'), {width: s.width, height: s.height}), x = c.getContext('2d');
  x.drawImage(R3.opt.fundo === 'sat' ? s : reliefCanvas(R3.dem), 0, 0, c.width, c.height);
  if (R3.opt.camada && R3.lay) {
    let l = R3.lay;
    if (THEMES[TH.cur]?.g === 'mar') { // a grade dos modelos do oceano é grossa e invade a costa: só pinta onde o relevo está no nível do mar ou abaixo
      l = Object.assign(document.createElement('canvas'), {width: c.width, height: c.height});
      const lx = l.getContext('2d'); lx.drawImage(R3.lay, 0, 0, c.width, c.height);
      lx.globalCompositeOperation = 'destination-in'; lx.drawImage(seaMask(R3.dem), 0, 0, c.width, c.height);
    }
    x.globalAlpha = TH.op[TH.cur] ?? .85; x.drawImage(l, 0, 0, c.width, c.height);
  }
  return c;
}
function seaMask(D) {
  if (D.sea) return D.sea;
  const c = Object.assign(document.createElement('canvas'), {width: D.w, height: D.h}), im = new ImageData(D.w, D.h);
  for (let i = 0; i < D.z.length; i++) if (D.z[i] <= 1) im.data[4 * i + 3] = 255;
  c.getContext('2d').putImageData(im, 0, 0);
  return (D.sea = c);
}
function readout() {
  R3.mvRaf = 0; const e = R3.mv, T = R3.T; if (!R3.terrain || !e) return;
  const r = R3.r.domElement.getBoundingClientRect(), ray = new T.Raycaster();
  ray.setFromCamera(new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), R3.cam);
  const hit = ray.intersectObject(R3.terrain)[0];
  if (!hit) return info(R3.meta);
  const D = R3.dem, u = hit.point.x / R3.dims.X + .5, v = hit.point.z / R3.dims.Z + .5, ll = llOf(D, u, v), el = demAt(D, u, v), th = THEMES[TH.cur];
  let t = `<b>${ll.lat.toFixed(3)}, ${ll.lng.toFixed(3)}</b> · ${el >= 0 ? 'altitude' : 'profundidade'} <b>${fmt(Math.abs(el), 0)} m</b>`;
  if (th?.wx && WX.grid && R3.opt.camada) { const x = wxSample(WX.grid.vals[TH.i], ll.lat, ll.lng); if (!isNaN(x)) t += ` · ${esc(th.n)} <b>${fmt(x, th.dec ?? 1)} ${th.u}</b>`; }
  info(t);
}
function legend() {
  const th = THEMES[TH.cur], o = [];
  if (R3.opt.camada && R3.lay && th) o.push($('detailsBody').firstElementChild?.outerHTML || '');
  if (R3.opt.fundo === 'relevo') o.push(`<div><h4>${ti('mountain')} Relevo e fundo do mar <small>m</small></h4>${gradBar(HYPSO, 0)}</div>`);
  if (R3.opt.pts && R3.n) o.push(`<div><h4>${ti('paw')} ${fmt(R3.n, 0)} ocorrências no recorte</h4><span class="muted">cores como no mapa (${esc($('colorBy').selectedOptions[0].text)})</span></div>`);
  $('r3Leg').innerHTML = o.join(''); $('r3Leg').hidden = !o.length;
}
function panel() {
  const o = R3.opt, th = THEMES[TH.cur];
  $$('#r3Fundo [data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === o.fundo));
  $$('#r3Cam [data-v]').forEach(b => b.classList.toggle('on', (b.dataset.v === 'iso') === o.iso));
  $('r3Camada').checked = o.camada && !!R3.lay; $('r3Camada').disabled = !R3.lay;
  $('r3CamadaLbl').textContent = R3.lay ? `${th.n} por cima` : th ? `${th.n}: não vira textura 3D` : 'Nenhuma camada ambiental ligada';
  $('r3Pts').checked = o.pts; $('r3Pts').disabled = !S.recs.length;
  $('r3PtsLbl').textContent = S.taxon ? `Ocorrências de ${S.taxon.name}` : 'Ocorrências (pesquise uma espécie)';
  $('r3Mar').checked = o.mar; $('r3Agua').checked = o.agua; $('r3Agua').disabled = o.mar || R3.dem.lo >= 0; $('r3Mar').disabled = R3.dem.lo >= 0;
  $('r3Exag').value = o.exag; $('r3ExagV').textContent = `${o.exag}×`;
}
function redraw(cam) { R3.n = build(); if (cam) camera(); panel(); legend(); }

async function open3d(b) {
  R3.box = b; $('r3').hidden = false; document.body.classList.add('r3-open');
  info('Baixando relevo, imagem de satélite e a camada…'); $('r3Meta').textContent = '';
  setBusy(true);
  try {
    await three();
    const zDem = zoomFor(b, 512, 12), zTex = zoomFor(b, 2048, 17);
    const [dem, sat, lay] = await Promise.all([mosaic(DEM_URL, zDem, b), mosaic(SAT_URL, zTex, b), layerCanvas(b, zTex).catch(() => null)]);
    const D = R3.dem = decodeDEM(dem); R3.sat = sat; R3.lay = lay;
    const wKm = D.w * D.mpp / 1000, hKm = D.h * D.mpp / 1000, relief = D.hi - Math.max(D.lo, -12000);
    const th = THEMES[TH.cur];
    Object.assign(R3.opt, {mar: th?.g === 'mar' && D.lo < 0, agua: false, camada: true, exag: Math.max(1, Math.min(60, Math.round(.06 * wKm * 1000 / Math.max(relief, 1))))});
    R3.meta = `${fmt(wKm, 0)} × ${fmt(hKm, 0)} km · ${D.lo < 0 ? `fundo do mar a ${fmt(-D.lo, 0)} m` : `altitude de ${fmt(D.lo, 0)}`} até ${fmt(D.hi, 0)} m · passe o mouse para ler os valores`;
    $('r3Meta').textContent = `${fmt(b.getSouth(), 2)}°, ${fmt(b.getWest(), 2)}° a ${fmt(b.getNorth(), 2)}°, ${fmt(b.getEast(), 2)}° · ${th && R3.lay ? th.n + (TH.times ? ' · ' + $('ttLbl').textContent : '') : 'sem camada ambiental'}`;
    redraw(true); info(R3.meta);
    R3.r.setAnimationLoop(() => { R3.ctl.update(); R3.r.render(R3.scene, R3.cam); });
  } catch (e) { info('Não deu para montar o recorte: ' + esc(e.message)); }
  setBusy(false);
}
function close3d() { $('r3').hidden = true; document.body.classList.remove('r3-open'); R3.r?.setAnimationLoop(null); }

// ---------- desenhar o recorte no mapa ----------
let cutting = false, start = null, rect = null;
function startCut() {
  if (!$('v-mapa').classList.contains('on')) showView('mapa');
  cutting = true; document.body.classList.add('cutting'); $('cutHint').hidden = false; map.dragging.disable(); map.boxZoom.disable();
}
function endCut() {
  cutting = false; start = null; document.body.classList.remove('cutting'); $('cutHint').hidden = true; map.dragging.enable(); map.boxZoom.enable();
  if (rect) { map.removeLayer(rect); rect = null; }
}
map.on('mousedown', e => { if (!cutting) return; start = e.latlng; rect = L.rectangle([start, start], {color: '#5c9bff', weight: 2, dashArray: '6 4', fillOpacity: .1, interactive: false}).addTo(map); });
map.on('mousemove', e => { if (start) rect.setBounds([start, e.latlng]); });
map.on('mouseup', e => {
  if (!start) return;
  const b = L.latLngBounds(start, e.latlng), a = map.latLngToContainerPoint(b.getNorthWest()), c = map.latLngToContainerPoint(b.getSouthEast());
  window.cutAt = Date.now(); endCut(); // o clique que fecha o retângulo não abre o balão do ponto
  if (c.x - a.x < 25 || c.y - a.y < 25) return toast('Área pequena demais: arraste um retângulo maior.');
  open3d(b);
});
const Cut = L.Control.extend({onAdd() {
  const d = L.DomUtil.create('div', 'leaflet-bar cut-ctl');
  d.innerHTML = `<a href="#" role="button" title="Recorte 3D: desenhe uma área e veja relevo, mar e dados em 3D">${ti('cube-3d-sphere')}<span>3D</span></a>`;
  L.DomEvent.disableClickPropagation(d); d.firstChild.onclick = e => { e.preventDefault(); cutting ? endCut() : startCut(); };
  return d;
}});
new Cut({position: 'topright'}).addTo(map);
$('cutView').onclick = () => { const b = map.getBounds(); endCut(); open3d(L.latLngBounds([Math.max(b.getSouth(), -84), b.getWest()], [Math.min(b.getNorth(), 84), Math.min(b.getEast(), b.getWest() + 359)])); };
$('cutCancel').onclick = endCut;
addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (cutting) endCut(); else if (!$('r3').hidden) close3d(); });

// ---------- painel ----------
$$('#r3Fundo [data-v]').forEach(b => b.onclick = () => { R3.opt.fundo = b.dataset.v; redraw(); });
$$('#r3Cam [data-v]').forEach(b => b.onclick = () => { R3.opt.iso = b.dataset.v === 'iso'; redraw(true); });
$('r3Camada').onchange = () => { R3.opt.camada = $('r3Camada').checked; redraw(); };
$('r3Pts').onchange = () => { R3.opt.pts = $('r3Pts').checked; redraw(); };
$('r3Mar').onchange = () => { R3.opt.mar = $('r3Mar').checked; redraw(); };
$('r3Agua').onchange = () => { R3.opt.agua = $('r3Agua').checked; redraw(); };
let exT;
$('r3Exag').oninput = () => { R3.opt.exag = +$('r3Exag').value; $('r3ExagV').textContent = `${R3.opt.exag}×`; clearTimeout(exT); exT = setTimeout(redraw, 60); };
$('r3Close').onclick = close3d;
$('r3New').onclick = () => { close3d(); startCut(); };
const fname = ext => `recorte3d_${(S.taxon?.name || 'area').replace(/\W+/g, '_')}.${ext}`;
const save = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
$('r3Png').onclick = () => R3.r.domElement.toBlob(b => save(b, fname('png')));
$('r3Stl').onclick = async () => { // só o bloco (relevo + base), em mm: 200 mm no lado maior
  const {STLExporter} = await import('three/addons/exporters/STLExporter.js'), g = new R3.T.Group();
  R3.grp.children.filter(o => o.name === 'relevo' || o.name === 'base').forEach(o => g.add(o.clone()));
  save(new Blob([new STLExporter().parse(g, {binary: true})], {type: 'model/stl'}), fname('stl'));
};
$('r3Glb').onclick = async () => {
  const {GLTFExporter} = await import('three/addons/exporters/GLTFExporter.js');
  new GLTFExporter().parse(R3.grp, r => save(new Blob([r], {type: 'model/gltf-binary'}), fname('glb')), e => toast('GLB: ' + e.message), {binary: true});
};
})();
