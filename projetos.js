// ---------- Projetos: consultas salvas em pastas (neste navegador) e "Restaurar padrão" ----------
// Um projeto guarda espécie, fonte, área, período, refinamentos, camada (e o ano/dia mostrado), limites, mapa-base e o enquadramento.
// Abrir um projeto (ou restaurar) recarrega a página: começa limpo, sem sobra da consulta anterior.
(() => {
const KEY = 'ohb-proj', PEND = 'ohb-open';
const empty = () => ({folders: [{id: 'geral', name: 'Geral'}], items: []});
const load = () => { try { const d = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(d?.folders) && Array.isArray(d.items)) return d; } catch { /* vazio */ } return empty(); };
let P = load(), cur = 'all';
const store = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); return true; } catch { toast('Não deu para salvar: o armazenamento do navegador está bloqueado.'); return false; } };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function state() {
  const c = map.getCenter(), th = THEMES[TH.cur];
  return {sp: $('sp').value.trim(), taxon: S.taxon?.name || '', src: src(), area: $('area').value, y0: $('y0').value, y1: $('y1').value,
    th: TH.cur, t: TH.times && !th?.wx ? TH.times[TH.i] : null, op: TH.op[TH.cur] ?? null,
    lat: +c.lat.toFixed(4), lng: +c.lng.toFixed(4), z: map.getZoom(), base, wms: $$('.wms:checked').map(x => x.value),
    colorBy: $('colorBy').value, pts: $('lPts').checked, grid: $('lGrid').checked, max: S.maxTouched ? $('max').value : null,
    F: {king: F.king, basis: [...F.basis], unc: F.unc, sp: F.sp, drop: F.drop, dedup: F.dedup, mon: [...F.mon], ds: F.ds, uc: F.uc, yr: F.yr, box: F.box, eco: F.eco}};
}
const hashOf = s => '#' + qs({sp: s.sp, src: s.src, area: s.area, y0: s.y0, y1: s.y1, th: s.th});
function openState(s) {
  try { sessionStorage.setItem(PEND, JSON.stringify(s)); } catch { /* sem sessionStorage abre só o que cabe no link */ }
  history.replaceState(null, '', location.pathname + location.search + hashOf(s)); location.reload();
}
function restoreAll() {
  if (!confirm('Restaurar tudo ao padrão?\n\nA espécie, os filtros, a camada, os limites e o enquadramento do mapa voltam ao início. Seus projetos salvos continuam guardados.')) return;
  try { sessionStorage.removeItem(PEND); } catch { /* ignora */ }
  history.replaceState(null, '', location.pathname + location.search); location.reload();
}
$('restoreAll').onclick = restoreAll; $('restoreF').onclick = restoreAll;

// ---------- link de compartilhamento: #proj=<JSON em base64url> ----------
// O Espaço da equipe (equipe/hub.html, publicado no Claude) guarda esses links; abrir um deles aqui reproduz a consulta.
const enc = o => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const dec = c => { try { return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(c.replace(/-/g, '+').replace(/_/g, '/')), x => x.charCodeAt(0)))); } catch { return null; } };
const summ = s => [s.taxon || s.sp || 'sem espécie', THEMES[s.th]?.n && THEMES[s.th].n + (s.t != null ? ' · ' + s.t : ''), AREAS[s.area]?.label?.replace(/^(no|na) /, ''),
  s.y0 || s.y1 ? `${s.y0 || '…'}–${s.y1 || '…'}` : '', s.wms.length ? s.wms.length + ' limite(s)' : '', nF(s) ? nF(s) + ' refinamento(s)' : ''].filter(Boolean);
const shareLink = p => location.origin + location.pathname + '#proj=' + enc({n: p.name, nt: p.note || '', s: p.state, d: summ(p.state)});
const okState = s => s && typeof s === 'object' && s.F && Array.isArray(s.F.basis) && Array.isArray(s.F.mon) && Array.isArray(s.wms) && isFinite(s.lat) && isFinite(s.lng) && isFinite(s.z);
const inc = location.hash.match(/(?:^#|&)proj=([A-Za-z0-9_-]+)/);
if (inc) {
  const o = dec(inc[1]);
  if (okState(o?.s)) { // guarda em “Recebidos da equipe” (sem duplicar) e abre
    const name = String(o.n || 'Projeto da equipe').slice(0, 90);
    if (!P.folders.some(f => f.id === 'recebidos')) P.folders.push({id: 'recebidos', name: 'Recebidos da equipe'});
    if (!P.items.some(x => x.folder === 'recebidos' && JSON.stringify(x.state) === JSON.stringify(o.s)))
      P.items.push({id: uid(), folder: 'recebidos', name, note: String(o.nt || '').slice(0, 600), at: Date.now(), state: o.s});
    store(); openState({...o.s, name});
  } else { history.replaceState(null, '', location.pathname + location.search); setTimeout(() => toast('Esse link de projeto está incompleto. Copie de novo no Espaço da equipe.'), 800); }
}

addEventListener('hashchange', () => { if (/(^#|&)proj=/.test(location.hash)) location.reload(); }); // link colado com a plataforma já aberta

// estado pendente de um projeto aberto: aplica o que o link não carrega
const pend =(() => { try { const s = JSON.parse(sessionStorage.getItem(PEND)); sessionStorage.removeItem(PEND); return s; } catch { return null; } })();
if (pend) {
  Object.assign(F, pend.F, {basis: new Set(pend.F.basis), mon: new Set(pend.F.mon)}); S.keepF = S.keepView = !!pend.sp;
  if (pend.max) { $('max').value = pend.max; S.maxTouched = true; }
  $('colorBy').value = pend.colorBy; $('lPts').checked = pend.pts; $('lGrid').checked = pend.grid;
  if (pend.base !== base && BASEMAPS[pend.base]) { map.removeLayer(BASEMAPS[base]); base = pend.base; BASEMAPS[base].addTo(map).bringToBack(); renderBasemaps(); }
  $$('.wms').forEach(c => { if (pend.wms.includes(c.value)) { c.checked = true; c.onchange(); } });
  map.setView([pend.lat, pend.lng], pend.z, {animate: false});
  renderKChips(); renderRefine(); renderFchips();
  S.th0p?.then(() => {
    if (TH.cur !== pend.th) return;
    if (pend.op != null) thOpacity(pend.op);
    const i = pend.t != null && TH.times ? TH.times.indexOf(pend.t) : -1;
    if (i >= 0) { $('ttRange').value = i; thShow(i); }
  });
  toast(`Projeto aberto: ${pend.name || 'sem nome'}`);
}

// ---------- página ----------
const fname = id => P.folders.find(f => f.id === id)?.name || 'Geral';
const nF = s => s.F.basis.length + s.F.mon.length + !!s.F.ds + !!s.F.uc + !!s.F.unc + !!s.F.sp + !s.F.drop + !s.F.dedup + !!s.F.king + !!s.F.yr + !!s.F.box + !!s.F.eco;
const chips = s => [
  s.taxon || s.sp ? `${ti('paw')} <i>${esc(s.taxon || s.sp)}</i>` : `${ti('paw')} sem espécie`,
  `${ti(THEMES[s.th]?.ic || 'stack-2')} ${esc(THEMES[s.th]?.n || 'sem camada ambiental')}${s.t != null ? ' · ' + esc(String(s.t)) : ''}`,
  `${ti('map-pin')} ${esc(AREAS[s.area]?.label || s.area)}`,
  s.y0 || s.y1 ? `${ti('calendar')} ${esc(s.y0 || '…')}–${esc(s.y1 || '…')}` : '',
  s.wms.length ? `${ti('shield-check')} ${s.wms.length} limite(s)` : '',
  nF(s) ? `${ti('adjustments-horizontal')} ${nF(s)} refinamento(s)` : ''].filter(Boolean).map(x => `<span>${x}</span>`).join('');
const folderOpts = sel => P.folders.map(f => `<option value="${f.id}" ${f.id === sel ? 'selected' : ''}>${esc(f.name)}</option>`).join('');
const card = p => `<article class="card pj-card" data-id="${p.id}">
  <div class="pj-ct"><div><h3>${esc(p.name)}</h3><small>${ti('folder')} ${esc(fname(p.folder))} · salvo em ${new Date(p.at).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})}</small></div>
    <div class="pj-top"><button class="btn soft" data-a="share" title="Copia um link que abre esta consulta em qualquer computador">${ti('share')} Compartilhar</button><button class="btn" data-a="open">${ti('player-play')} Abrir</button></div></div>
  ${p.note ? `<p class="pj-note">${ti('notes')} ${esc(p.note)}</p>` : ''}
  <div class="pj-now">${chips(p.state)}</div>
  <div class="pj-acts"><button data-a="upd" title="Substitui pelo que está na tela agora">${ti('refresh')} Atualizar com o atual</button>
    <label>${ti('folder-symlink')}<select data-a="move" aria-label="Mover para a pasta">${folderOpts(p.folder)}</select></label>
    <button data-a="note">${ti('pencil')} Renomear / anotar</button><button data-a="del" class="danger">${ti('trash')} Apagar</button></div>
</article>`;

window.renderProj = el => {
  const st = state(), items = P.items.filter(x => cur === 'all' || x.folder === cur).sort((a, b) => b.at - a.at);
  el.innerHTML = `<div class="wrap">
  <div class="card hero"><h2>${ti('folders')} Projetos</h2>
    <p class="lead">Guarde a consulta da tela (espécie, filtros, camada e o ano/dia mostrado, limites, mapa-base e o enquadramento) em pastas e reabra quando quiser.
      Fica salvo neste navegador. Para a equipe, clique em <b>Compartilhar</b> no projeto e cole o link no <b>Espaço da equipe</b>; quem abrir o link vê a mesma consulta no computador dela.</p>
    <div class="pj-save">
      <input id="pjName" placeholder="Nome do projeto" value="${esc([st.taxon, THEMES[st.th]?.n].filter(Boolean).join(' · ') || 'Minha consulta')}" aria-label="Nome do projeto">
      <select id="pjFolder" aria-label="Pasta">${folderOpts(cur === 'all' ? 'geral' : cur)}</select>
      <input id="pjNote" placeholder="Anotação: hipótese, o que observar… (opcional)" aria-label="Anotação">
      <button class="btn lime" id="pjSave">${ti('device-floppy')} Salvar estado atual</button>
    </div>
    <div class="pj-now on-dark">${chips(st)}</div>
  </div>
  <div class="pj-grid">
    <aside class="card pj-folders"><h3>${ti('folder')} Pastas</h3>
      <button class="pj-f ${cur === 'all' ? 'on' : ''}" data-f="all">${ti('stack-2')}<span>Todos os projetos</span><b>${P.items.length}</b></button>
      ${P.folders.map(f => `<div class="pj-frow"><button class="pj-f ${cur === f.id ? 'on' : ''}" data-f="${f.id}">${ti(cur === f.id ? 'folder-open' : 'folder')}<span>${esc(f.name)}</span><b>${P.items.filter(x => x.folder === f.id).length}</b></button>
        ${f.id === 'geral' ? '' : `<button class="icon-btn" data-fren="${f.id}" title="Renomear pasta">${ti('pencil')}</button><button class="icon-btn" data-fdel="${f.id}" title="Apagar pasta">${ti('trash')}</button>`}</div>`).join('')}
      <button class="btn-reset" id="pjNewF">${ti('folder-plus')} Nova pasta</button>
      <div class="pj-io"><button class="btn soft" id="pjExp">${ti('download')} Exportar</button>
        <label class="btn soft">${ti('upload')} Importar<input type="file" id="pjImp" accept=".json,application/json" hidden></label></div>
    </aside>
    <section class="pj-list">${items.length ? items.map(card).join('')
      : `<div class="card empty">${ti('folder-open')}Nenhum projeto ${cur === 'all' ? 'ainda' : 'nesta pasta'}.<br>Monte uma consulta no mapa (espécie, camada, filtros) e clique em <b>Salvar estado atual</b>, aqui ou no ícone ${ti('device-floppy')} do topo.</div>`}</section>
  </div></div>`;
  const re = () => renderProj(el), get = b => P.items.find(x => x.id === b.closest('[data-id]').dataset.id);
  $('pjSave').onclick = () => {
    const name = $('pjName').value.trim() || 'Minha consulta';
    P.items.push({id: uid(), folder: $('pjFolder').value, name, note: $('pjNote').value.trim(), at: Date.now(), state: st});
    if (store()) { toast(`Salvo em “${fname($('pjFolder').value)}”.`); re(); }
  };
  el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { cur = b.dataset.f; re(); });
  $('pjNewF').onclick = () => { const n = prompt('Nome da nova pasta:'); if (!n?.trim()) return; const id = uid(); P.folders.push({id, name: n.trim()}); cur = id; store(); re(); };
  el.querySelectorAll('[data-fren]').forEach(b => b.onclick = () => { const f = P.folders.find(x => x.id === b.dataset.fren), n = prompt('Novo nome da pasta:', f.name); if (n?.trim()) { f.name = n.trim(); store(); re(); } });
  el.querySelectorAll('[data-fdel]').forEach(b => b.onclick = () => {
    const f = P.folders.find(x => x.id === b.dataset.fdel), k = P.items.filter(x => x.folder === f.id).length;
    if (!confirm(`Apagar a pasta “${f.name}”?${k ? `\nOs ${k} projeto(s) dela vão para “Geral”.` : ''}`)) return;
    P.items.forEach(x => { if (x.folder === f.id) x.folder = 'geral'; }); P.folders = P.folders.filter(x => x !== f); cur = 'all'; store(); re();
  });
  el.querySelectorAll('[data-a]').forEach(b => {
    const a = b.dataset.a;
    if (a === 'move') return b.onchange = () => { get(b).folder = b.value; store(); re(); };
    b.onclick = () => {
      const p = get(b);
      if (a === 'open') openState({...p.state, name: p.name});
      if (a === 'share') {
        const link = shareLink(p), ok = () => toast('Link copiado. Cole no Espaço da equipe › Projetos.');
        navigator.clipboard?.writeText(link).then(ok, () => prompt('Copie o link do projeto:', link)) ?? prompt('Copie o link do projeto:', link);
      }
      if (a === 'upd' && confirm(`Substituir “${p.name}” pelo que está na tela agora?`)) { p.state = state(); p.at = Date.now(); store(); re(); toast('Projeto atualizado.'); }
      if (a === 'note') { const n = prompt('Nome do projeto:', p.name); if (n == null) return; const t = prompt('Anotação (pode deixar vazio):', p.note || ''); p.name = n.trim() || p.name; if (t != null) p.note = t.trim(); store(); re(); }
      if (a === 'del' && confirm(`Apagar o projeto “${p.name}”? Não dá para desfazer.`)) { P.items = P.items.filter(x => x !== p); store(); re(); }
    };
  });
  $('pjExp').onclick = () => download(`projetos-onehealth-biogeo-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(P, null, 1), 'application/json');
  $('pjImp').onchange = async e => { // junta ao que já existe; nada é apagado
    try {
      const d = JSON.parse(await e.target.files[0].text());
      if (!Array.isArray(d?.folders) || !Array.isArray(d.items)) throw new Error('não é um arquivo de projetos');
      d.folders.forEach(f => P.folders.some(x => x.id === f.id) || P.folders.push({id: String(f.id), name: String(f.name)}));
      let n = 0;
      d.items.forEach(x => { if (x?.state?.F && !P.items.some(y => y.id === x.id)) { P.items.push({...x, folder: P.folders.some(f => f.id === x.folder) ? x.folder : 'geral'}); n++; } });
      store(); re(); toast(`${n} projeto(s) importado(s).`);
    } catch (err) { toast('Importar: ' + err.message); }
  };
};
// menu ? → “Copiar link desta consulta”: o link completo (filtros, camada, limites, enquadramento), não só a espécie
$('share').onclick = () => {
  const link = shareLink({name: [S.taxon?.name, THEMES[TH.cur]?.n].filter(Boolean).join(' · ') || 'Consulta', note: '', state: state()});
  navigator.clipboard?.writeText(link).then(() => toast('Link da consulta copiado: abre igual em qualquer computador.'), () => prompt('Copie o link:', link)) ?? prompt('Copie o link:', link);
};
// endereço do Espaço da equipe (artifact no Claude); vazio esconde o item do menu
const HUB = 'https://claude.ai/artifact/WKdATxfAczGddNETdcef9n';
if (HUB) { $('hubLink').href = HUB; $('hubLink').hidden = false; }
$('saveProj').onclick = () => { showView('proj'); setTimeout(() => { $('pjName')?.focus(); $('pjName')?.select(); }, 50); };
})();
