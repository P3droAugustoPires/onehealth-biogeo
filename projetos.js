// ---------- Projetos: consultas salvas na nuvem da equipe, em pastas, e "Restaurar padrão" ----------
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


// ---------- link de projeto: #proj=<JSON em base64url> ----------
// Para mandar uma consulta por mensagem; dentro da equipe, os projetos salvos já aparecem para todos.
const enc = o => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const dec = c => { try { return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(c.replace(/-/g, '+').replace(/_/g, '/')), x => x.charCodeAt(0)))); } catch { return null; } };
const summ = s => [s.taxon || s.sp || 'sem espécie', THEMES[s.th]?.n && THEMES[s.th].n + (s.t != null ? ' · ' + s.t : ''), AREAS[s.area]?.label?.replace(/^(no|na) /, ''),
  s.y0 || s.y1 ? `${s.y0 || '…'}–${s.y1 || '…'}` : '', s.wms.length ? s.wms.length + ' limite(s)' : '', nF(s) ? nF(s) + ' refinamento(s)' : ''].filter(Boolean);
const shareLink = (name, s) => location.origin + location.pathname + '#proj=' + enc({n: name, s, d: summ(s)});
const okState = s => s && typeof s === 'object' && s.F && Array.isArray(s.F.basis) && Array.isArray(s.F.mon) && Array.isArray(s.wms) && isFinite(s.lat) && isFinite(s.lng) && isFinite(s.z);
const copy = (link, msg) => navigator.clipboard?.writeText(link).then(() => toast(msg), () => prompt('Copie o link:', link)) ?? prompt('Copie o link:', link);
const inc = location.hash.match(/(?:^#|&)proj=([A-Za-z0-9_-]+)/);
if (inc) {
  const o = dec(inc[1]);
  if (okState(o?.s)) openState({...o.s, name: String(o.n || 'Projeto').slice(0, 90)});
  else { history.replaceState(null, '', location.pathname + location.search); setTimeout(() => toast('Esse link de projeto está incompleto. Peça para copiarem de novo.'), 800); }
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


// ---------- página: projetos na nuvem da equipe (equipe.js → EQ) ----------
const nF = s => s.F.basis.length + s.F.mon.length + !!s.F.ds + !!s.F.uc + !!s.F.unc + !!s.F.sp + !s.F.drop + !s.F.dedup + !!s.F.king + !!s.F.yr + !!s.F.box + !!s.F.eco;
const chips = s => [
  s.taxon || s.sp ? `${ti('paw')} <i>${esc(s.taxon || s.sp)}</i>` : `${ti('paw')} sem espécie`,
  `${ti(THEMES[s.th]?.ic || 'stack-2')} ${esc(THEMES[s.th]?.n || 'sem camada ambiental')}${s.t != null ? ' · ' + esc(String(s.t)) : ''}`,
  `${ti('map-pin')} ${esc(AREAS[s.area]?.label || s.area)}`,
  s.y0 || s.y1 ? `${ti('calendar')} ${esc(s.y0 || '…')}–${esc(s.y1 || '…')}` : '',
  s.wms.length ? `${ti('shield-check')} ${s.wms.length} limite(s)` : '',
  nF(s) ? `${ti('adjustments-horizontal')} ${nF(s)} refinamento(s)` : ''].filter(Boolean).map(x => `<span>${x}</span>`).join('');
const stOf = p => { try { const s = JSON.parse(p.st); return okState(s) ? s : null; } catch { return null; } };
let scope = 'all', pasta = '';
const EQ = () => window.EQ?.member ? window.EQ : null;
const canEdit = p => EQ() && (p.by === EQ().u.uid || EQ().coord);
const visible = () => (EQ()?.allProj() || []).filter(p => stOf(p) && (scope === 'all' || (scope === 'mine' ? p.by === EQ().u.uid : p.by !== EQ().u.uid)));
const card = p => { const s = stOf(p), e = EQ(); return `<article class="card pj-card" data-id="${esc(p.id)}">
  <div class="pj-ct"><div><h3>${esc(p.nome)}</h3><small>${e.who(p.by, p.upd || p.at)} · ${ti('folder')} ${esc(p.pasta || 'Geral')} · ${p.vis === 'eu' ? `${ti('lock')} só eu` : `${ti('users-group')} equipe`}</small></div>
    <div class="pj-top"><button class="btn soft" data-a="link" title="Copia um link para mandar por mensagem">${ti('link')} Copiar link</button><button class="btn" data-a="open">${ti('player-play')} Abrir</button></div></div>
  ${p.nota ? `<p class="pj-note">${ti('notes')} ${esc(p.nota)}</p>` : ''}
  <div class="pj-now">${chips(s)}</div>
  ${canEdit(p) ? `<div class="pj-acts"><button data-a="upd" title="Substitui pelo que está na tela agora">${ti('refresh')} Atualizar com o atual</button>
    <button data-a="edit">${ti('pencil')} Renomear, pasta, anotação</button>
    <button data-a="vis">${p.vis === 'eu' ? `${ti('users-group')} Compartilhar com a equipe` : `${ti('lock')} Deixar só para mim`}</button>
    <button data-a="del" class="danger">${ti('trash')} Apagar</button></div>` : ''}
</article>`; };

function drawList() {
  const body = $('pjBody'), e = EQ(); if (!body) return;
  if (!e) return body.innerHTML = `<div class="card empty">${ti('lock')}Entre com seu e-mail para ver e salvar projetos.</div>`;
  const all = e.allProj().filter(stOf), me = e.u.uid, vis = visible(), pastas = [...new Set(vis.map(p => p.pasta || 'Geral'))].sort((a, b) => a.localeCompare(b, 'pt'));
  if (pasta && !pastas.includes(pasta)) pasta = '';
  const items = vis.filter(p => !pasta || (p.pasta || 'Geral') === pasta), n = f => all.filter(f).length;
  const local = P.items.length;
  $('pjPastas').innerHTML = [...new Set(all.map(p => p.pasta || 'Geral'))].map(x => `<option value="${esc(x)}">`).join('');
  body.innerHTML = `${local ? `<div class="card pj-migr">${ti('cloud-upload')}<span>Há <b>${local}</b> projeto(s) salvos só neste navegador, de antes da equipe. Envie para a nuvem para não perdê-los (ficam como “só eu”; depois você compartilha os que quiser).</span><button class="btn" id="pjMigr">Enviar para a nuvem</button></div>` : ''}
  <div class="pj-grid">
    <aside class="card pj-folders"><h3>${ti('eye')} Mostrar</h3>
      ${[['all', 'stack-2', 'Todos', n(() => true)], ['mine', 'user', 'Meus', n(p => p.by === me)], ['team', 'users-group', 'Da equipe', n(p => p.by !== me)]]
        .map(([k, ic, t, c]) => `<button class="pj-f ${scope === k ? 'on' : ''}" data-s="${k}">${ti(ic)}<span>${t}</span><b>${c}</b></button>`).join('')}
      <h3 style="margin-top:12px">${ti('folder')} Pastas</h3>
      <button class="pj-f ${!pasta ? 'on' : ''}" data-p="">${ti('folders')}<span>Todas</span><b>${vis.length}</b></button>
      ${pastas.map(x => `<button class="pj-f ${pasta === x ? 'on' : ''}" data-p="${esc(x)}">${ti(pasta === x ? 'folder-open' : 'folder')}<span>${esc(x)}</span><b>${vis.filter(p => (p.pasta || 'Geral') === x).length}</b></button>`).join('')}
      <div class="pj-io"><button class="btn soft" id="pjExp">${ti('download')} Exportar</button>
        <label class="btn soft">${ti('upload')} Importar<input type="file" id="pjImp" accept=".json,application/json" hidden></label></div>
    </aside>
    <section class="pj-list">${items.length ? items.map(card).join('')
      : `<div class="card empty">${ti('folder-open')}${scope === 'team' ? 'Ninguém da equipe compartilhou projetos ainda.' : 'Nenhum projeto aqui ainda.'}<br>Monte uma consulta no mapa (espécie, camada, filtros) e clique em <b>Salvar</b> no alto desta página ou no ícone ${ti('device-floppy')} do topo.</div>`}</section>
  </div>`;
  body.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { scope = b.dataset.s; drawList(); });
  body.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { pasta = b.dataset.p; drawList(); });
  const get = b => e.allProj().find(x => x.id === b.closest('[data-id]').dataset.id);
  body.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const p = get(b), a = b.dataset.a; if (!p) return;
    const save = (ch, ok) => e.saveProj({...p, ...ch, ok});
    if (a === 'open') openState({...stOf(p), name: p.nome});
    if (a === 'link') copy(shareLink(p.nome, stOf(p)), 'Link copiado: quem abrir vê a mesma consulta.');
    if (a === 'upd' && confirm(`Substituir “${p.nome}” pelo que está na tela agora?`)) { const s = state(); save({st: JSON.stringify(s), d: summ(s)}, 'Projeto atualizado.'); }
    if (a === 'edit') {
      const nome = prompt('Nome do projeto:', p.nome); if (nome == null) return;
      const pa = prompt('Pasta:', p.pasta || 'Geral'); if (pa == null) return;
      const nota = prompt('Anotação (pode deixar vazio):', p.nota || ''); if (nota == null) return;
      save({nome: nome.trim() || p.nome, pasta: pa.trim() || 'Geral', nota: nota.trim()}, 'Projeto atualizado.');
    }
    if (a === 'vis') save({vis: p.vis === 'eu' ? 'equipe' : 'eu'}, p.vis === 'eu' ? 'Agora a equipe vê este projeto.' : 'Agora só você vê este projeto.');
    if (a === 'del' && confirm(`Apagar o projeto “${p.nome}”? Não dá para desfazer.`)) e.delProj(p.id);
  });
  const up = (list, vis) => Promise.allSettled(list.map(x => e.saveProj({nome: x.nome, pasta: x.pasta, nota: x.nota, vis, st: JSON.stringify(x.s), d: summ(x.s)})))
    .then(r => r.filter(x => x.status === 'fulfilled').length);
  if ($('pjMigr')) $('pjMigr').onclick = () => up(P.items.filter(x => okState(x.state)).map(x => ({nome: x.name, pasta: P.folders.find(f => f.id === x.folder)?.name || 'Geral', nota: x.note, s: x.state})), 'eu')
    .then(k => { if (k) { P = empty(); store(); } toast(`${k} projeto(s) enviados para a nuvem.`); drawList(); });
  $('pjExp').onclick = () => download(`projetos-onehealth-biogeo-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify({projetos: items.map(p => ({nome: p.nome, pasta: p.pasta, nota: p.nota, state: stOf(p)}))}, null, 1), 'application/json');
  $('pjImp').onchange = async ev => { // aceita o arquivo novo ({projetos}) e o antigo ({folders, items}); entram como “só eu”
    try {
      const d = JSON.parse(await ev.target.files[0].text());
      const L = Array.isArray(d?.projetos) ? d.projetos.map(x => ({nome: x.nome, pasta: x.pasta, nota: x.nota, s: x.state}))
        : Array.isArray(d?.items) ? d.items.map(x => ({nome: x.name, pasta: d.folders?.find(f => f.id === x.folder)?.name, nota: x.note, s: x.state})) : null;
      if (!L) throw new Error('não é um arquivo de projetos');
      const k = await up(L.filter(x => okState(x.s)).map(x => ({nome: String(x.nome || 'Projeto').slice(0, 90), pasta: String(x.pasta || 'Geral').slice(0, 40), nota: String(x.nota || '').slice(0, 600), s: x.s})), 'eu');
      toast(`${k} projeto(s) importado(s) como “só eu”.`);
    } catch (err) { toast('Importar: ' + err.message); }
  };
}
document.addEventListener('eq', () => S.view === 'proj' && drawList());

window.renderProj = el => {
  const st = state();
  el.innerHTML = `<div class="wrap">
  <div class="card hero"><h2>${ti('folders')} Projetos</h2>
    <p class="lead">Guarde a consulta da tela (espécie, filtros, camada e o ano/dia mostrado, limites, mapa-base e o enquadramento).
      Com <b>A equipe</b>, todos do grupo veem e abrem na hora, de qualquer computador. Com <b>Só eu</b>, fica guardado só para você.</p>
    <div class="pj-save">
      <input id="pjName" placeholder="Nome do projeto" value="${esc([st.taxon, THEMES[st.th]?.n].filter(Boolean).join(' · ') || 'Minha consulta')}" aria-label="Nome do projeto" maxlength="90">
      <input id="pjFolder" placeholder="Pasta (ex.: Zoonoses)" list="pjPastas" aria-label="Pasta" maxlength="40" value="${esc(pasta || '')}"><datalist id="pjPastas"></datalist>
      <input id="pjNote" placeholder="Anotação: hipótese, o que observar… (opcional)" aria-label="Anotação" maxlength="600">
      <select id="pjVis" aria-label="Quem vê"><option value="equipe">A equipe vê</option><option value="eu">Só eu</option></select>
      <button class="btn lime" id="pjSave">${ti('device-floppy')} Salvar</button>
    </div>
    <div class="pj-now on-dark">${chips(st)}</div>
  </div>
  <div id="pjBody"></div></div>`;
  $('pjSave').onclick = () => {
    const e = EQ(); if (!e) return toast('Entre com seu e-mail para salvar.');
    const vis = $('pjVis').value;
    e.saveProj({nome: $('pjName').value.trim() || 'Minha consulta', pasta: $('pjFolder').value.trim() || 'Geral', nota: $('pjNote').value.trim(), vis, st: JSON.stringify(st), d: summ(st),
      ok: vis === 'eu' ? 'Projeto salvo (só você vê).' : 'Projeto salvo e compartilhado com a equipe.'}).then(() => { $('pjNote').value = ''; }, () => {});
  };
  drawList();
};
// menu ? → “Copiar link desta consulta”: o link completo (filtros, camada, limites, enquadramento), não só a espécie
$('share').onclick = () => copy(shareLink([S.taxon?.name, THEMES[TH.cur]?.n].filter(Boolean).join(' · ') || 'Consulta', state()), 'Link da consulta copiado: abre igual em qualquer computador.');
$('saveProj').onclick = () => { showView('proj'); setTimeout(() => { $('pjName')?.focus(); $('pjName')?.select(); }, 50); };
})();
