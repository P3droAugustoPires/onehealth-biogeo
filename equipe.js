// ---------- Equipe: entrada por e-mail, perfis, projetos na nuvem e feedbacks (Firebase) ----------
// Só e-mails da coleção “membros” entram. Quem coordena gerencia a lista em Equipe › Membros.
// As regras de acesso ficam no console do Firebase (Firestore › Regras); cópia comentada em firestore.rules.
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth, onAuthStateChanged, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, GoogleAuthProvider, signInWithPopup, signOut}
  from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot, deleteField}
  from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const FB = {apiKey: 'AIzaSyBn7qkbWTzwqBUQYHBVUpuDK9fg0xul1FA', authDomain: 'onehealth-biogeo.firebaseapp.com', projectId: 'onehealth-biogeo',
  storageBucket: 'onehealth-biogeo.firebasestorage.app', messagingSenderId: '556854232752', appId: '1:556854232752:web:e55d15208dba639caa9d75'}; // configuração do app web (Configurações do projeto › Seus apps); não é segredo: quem protege os dados são as regras

const E = window.EQ = {u: null, em: '', coord: false, member: false, perfis: {}, team: [], mine: [], fbs: [], membros: [], sub: 'perfil', pfDirty: false, foto: null};
const app = initializeApp(FB), auth = getAuth(app), db = getFirestore(app);
auth.languageCode = 'pt';
const fire = () => document.dispatchEvent(new Event('eq'));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const when = t => t ? new Date(t).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short', year: 'numeric'}) : '';
const okImg = s => typeof s === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s) ? s : '';
const errTxt = e => e?.code === 'permission-denied' ? 'Sem permissão para isso.' : e?.code === 'unavailable' ? 'Sem conexão agora. Tente de novo.' : 'Não deu certo: ' + (e?.message || e);
const run = (p, ok) => p.then(() => ok && toast(ok), e => { console.warn(e); toast(errTxt(e)); throw e; });
function initials(n) {
  const t = (n || '?').trim().split(/\s+/), l = ((t[0] || '?')[0] + (t.length > 1 ? t[t.length - 1][0] : '')).toUpperCase();
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#2277ff"/><text x="32" y="41" font-family="Arial" font-size="26" font-weight="700" fill="#fff" text-anchor="middle">${esc(l)}</text></svg>`);
}
E.name = id => (E.perfis[id]?.nome || '').trim() || (id === E.u?.uid ? (E.u.displayName || 'Você') : 'Pessoa da equipe');
E.avatar = id => okImg(E.perfis[id]?.foto) || initials(E.name(id));
E.who = (id, at) => `<span class="eq-who"><img src="${esc(E.avatar(id))}" alt=""><b>${esc(E.name(id))}</b>${id === E.u?.uid ? ' (você)' : ''}${at ? ' · ' + when(at) : ''}</span>`;

// ---------- porta de entrada ----------
const gate = $('gate');
function gateShow(mode, extra = '') {
  gate.hidden = false;
  const head = `<div class="gate-logo"><img src="logo.svg" alt=""><b>One Health <span>BioGeo</span></b></div>`;
  const body = {
    load: `<p class="mut">Conferindo seu acesso…</p>`,
    out: `<h2>Entrar na plataforma</h2><p class="mut">Ferramenta de uso da equipe. Use o e-mail que você passou para quem coordena.</p>
      <form id="gForm"><input type="email" id="gEmail" required placeholder="seu@email.com" autocomplete="email" aria-label="E-mail" value="${esc(localStorage.getItem('eq-email') || '')}">
      <button class="btn" type="submit">${ti('mail-forward')} Receber link de acesso</button></form>
      <div class="gate-or"><span>ou</span></div>
      <button class="btn soft" id="gGoogle">${ti('brand-google')} Entrar com Google</button>`,
    sent: `<h2>Confira seu e-mail</h2><p class="mut">Mandamos um link de acesso para <b>${esc(extra)}</b>. Abra o e-mail <b>neste mesmo navegador</b> e clique no link.</p>
      <p class="mut small">Não chegou em 2 minutos? Olhe o spam ou a aba Promoções.</p><button class="btn soft" id="gBack">${ti('arrow-left')} Usar outro e-mail</button>`,
    nomember: `<h2>Ainda sem acesso</h2><p class="mut">O e-mail <b>${esc(extra)}</b> não está na lista da equipe. Peça a quem coordena para incluir você em <b>Equipe › Membros</b> e depois clique em tentar de novo.</p>
      <div class="row"><button class="btn" id="gRetry">${ti('refresh')} Tentar de novo</button><button class="btn soft" id="gOut">${ti('logout')} Sair</button></div>`,
    err: `<h2>Não deu para conectar</h2><p class="mut">${esc(extra)}</p><button class="btn" id="gRetry">${ti('refresh')} Tentar de novo</button>`,
  }[mode];
  gate.innerHTML = `<div class="gate-card">${head}${body}</div>`;
  $('gForm')?.addEventListener('submit', async e => {
    e.preventDefault(); const em = $('gEmail').value.trim().toLowerCase();
    try { localStorage.setItem('eq-email', em); } catch { /* ignora */ }
    try { await sendSignInLinkToEmail(auth, em, {url: location.origin + location.pathname, handleCodeInApp: true}); gateShow('sent', em); }
    catch (err) { toast(errTxt(err)); }
  });
  if ($('gGoogle')) $('gGoogle').onclick = () => signInWithPopup(auth, new GoogleAuthProvider()).catch(err => err.code !== 'auth/popup-closed-by-user' && toast(errTxt(err)));
  if ($('gBack')) $('gBack').onclick = () => gateShow('out');
  if ($('gOut')) $('gOut').onclick = () => signOut(auth);
  if ($('gRetry')) $('gRetry').onclick = () => location.reload();
}
gateShow('load');

// volta do link do e-mail
if (isSignInWithEmailLink(auth, location.href)) {
  let em = ''; try { em = localStorage.getItem('eq-email') || ''; } catch { /* ignora */ }
  em ||= prompt('Confirme o e-mail que recebeu o link:') || '';
  signInWithEmailLink(auth, em.trim(), location.href)
    .catch(err => gateShow('err', err.code === 'auth/invalid-action-code' ? 'Esse link já foi usado ou expirou. Peça outro.' : errTxt(err)))
    .finally(() => history.replaceState(null, '', location.pathname + location.hash));
}

let subs = [];
onAuthStateChanged(auth, async u => {
  subs.forEach(f => f()); subs = [];
  Object.assign(E, {u, em: u?.email?.toLowerCase() || '', coord: false, member: false, perfis: {}, team: [], mine: [], fbs: [], membros: []});
  drawMe();
  if (!u) return gateShow('out');
  let m;
  try { m = await getDoc(doc(db, 'membros', E.em)); } catch (err) { return gateShow(err.code === 'permission-denied' ? 'nomember' : 'err', err.code === 'permission-denied' ? E.em : errTxt(err)); }
  if (!m.exists()) return gateShow('nomember', E.em);
  E.member = true; E.coord = m.data().papel === 'coord'; gate.hidden = true;
  const live = (q, set) => subs.push(onSnapshot(q, s => { set(s); fire(); }, err => { console.warn(err); toast(errTxt(err)); }));
  live(collection(db, 'perfis'), s => { E.perfis = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); drawMe(); });
  live(query(collection(db, 'projetos'), where('vis', '==', 'equipe')), s => { E.team = s.docs.map(d => ({id: d.id, ...d.data()})); });
  live(query(collection(db, 'projetos'), where('by', '==', u.uid)), s => { E.mine = s.docs.map(d => ({id: d.id, ...d.data()})); });
  live(collection(db, 'feedbacks'), s => { E.fbs = s.docs.map(d => ({id: d.id, ...d.data()})); });
  if (E.coord) live(collection(db, 'membros'), s => { E.membros = s.docs.map(d => ({id: d.id, ...d.data()})); });
  // primeira entrada: leva ao perfil
  getDoc(doc(db, 'perfis', u.uid)).then(p => { if (!p.exists()) { E.sub = 'perfil'; showView('equipe'); toast('Bem-vindo! Complete seu perfil para a equipe conhecer você.'); } });
});
function drawMe() {
  const b = $('meBtn'); if (!b) return;
  b.hidden = !E.member;
  if (E.u) b.innerHTML = `<img src="${esc(E.avatar(E.u.uid))}" alt=""><span>${esc(E.name(E.u.uid).split(' ')[0])}</span>`;
}
$('meBtn').onclick = () => { E.sub = 'perfil'; showView('equipe'); };
$('fbOpen').onclick = () => { E.fbPag = PAGN[S.view] || 'Geral'; E.sub = 'fb'; $('helpMenu').hidden = true; showView('equipe'); };
const PAGN = {mapa: 'Mapa', stats: 'Painel', busca: 'Explorar', analise: 'Análise', proj: 'Projetos'};

// ---------- projetos (usados por projetos.js) ----------
E.saveProj = r => {
  const id = r.id || uid(), now = Date.now(), old = [...E.mine, ...E.team].find(x => x.id === id);
  const data = {by: old?.by || E.u.uid, nome: r.nome, pasta: r.pasta || 'Geral', nota: r.nota || '', vis: r.vis === 'eu' ? 'eu' : 'equipe', st: r.st, d: r.d || [], at: old?.at || now, upd: now};
  return run(setDoc(doc(db, 'projetos', id), data), r.ok);
};
E.delProj = id => run(deleteDoc(doc(db, 'projetos', id)), 'Projeto apagado.');
E.allProj = () => { const m = new Map(); [...E.team, ...E.mine].forEach(x => m.set(x.id, x)); return [...m.values()].sort((a, b) => (b.upd || b.at) - (a.upd || a.at)); };

// ---------- página Equipe ----------
const TIPOS = {sug: ['Sugestão', 'bulb'], bug: ['Problema', 'bug'], dado: ['Dado ou camada nova', 'database'], analise: ['Ideia de análise', 'microscope'], elogio: ['Elogio', 'heart']};
const STS = {novo: 'Novo', analise: 'Em análise', plan: 'Planejado', feito: 'Feito', nao: 'Não vamos fazer'};
const PAGS = ['Geral', 'Mapa', 'Painel', 'Explorar', 'Análise', 'Projetos', 'Tutorial', 'Equipe'];
const opts = (o, sel) => Object.entries(o).map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(Array.isArray(v) ? v[0] : v)}</option>`).join('');
const PF = ['nome', 'email', 'inst', 'papel', 'area', 'bio'];
const FUN = ['Pesquisador(a)', 'Professor(a)', 'Estudante de graduação', 'Estudante de pós-graduação', 'Gestor(a) ambiental', 'Profissional de saúde', 'Veterinário(a)', 'Outra'];

window.renderEquipe = el => {
  if (!E.member) return el.innerHTML = `<div class="wrap"><div class="card empty">${ti('lock')}Entre com seu e-mail para ver a equipe.</div></div>`;
  const nav = [['perfil', 'id-badge-2', 'Meu perfil'], ['pessoas', 'users', 'Pessoas'], ['fb', 'message-2', 'Feedbacks'], ...(E.coord ? [['mem', 'shield-lock', 'Membros']] : [])];
  el.innerHTML = `<div class="wrap">
    <div class="card hero eq-hero"><div><h2>${ti('users-group')} Equipe</h2>
      <p class="lead">Seu perfil, quem está no grupo e as sugestões para a plataforma. Os projetos da equipe ficam na aba <b>Projetos</b>.</p></div>
      <button class="btn soft" id="eqOut">${ti('logout')} Sair</button></div>
    <nav class="seg mini eq-nav" aria-label="Seções da equipe">${nav.map(([k, ic, t]) => `<button data-eq="${k}" class="${E.sub === k ? 'on' : ''}">${ti(ic)} ${t}</button>`).join('')}</nav>
    <div id="eqBody"></div></div>`;
  el.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => { E.sub = b.dataset.eq; renderEquipe(el); });
  $('eqOut').onclick = () => signOut(auth);
  if (E.sub === 'mem' && !E.coord) E.sub = 'perfil';
  ({perfil: subPerfil, pessoas: subPessoas, fb: subFb, mem: subMem})[E.sub]($('eqBody'));
};
document.addEventListener('eq', () => { // dados novos: redesenha só as listas, nunca um formulário em edição
  if (S.view !== 'equipe') return;
  if (E.sub === 'pessoas') drawPessoas(); if (E.sub === 'fb') drawFb(); if (E.sub === 'mem') drawMem();
  if (E.sub === 'perfil' && !E.pfDirty) { fillPf(); drawPrev(); }
});

// perfil
function pcard(id, p) {
  const nP = E.team.filter(x => x.by === id).length, nF = E.fbs.filter(x => x.by === id).length;
  return `<img class="eq-av" src="${esc(okImg(p.foto) || initials(p.nome))}" alt="">
    <h3>${esc(p.nome || 'Sem nome')}${id === E.u.uid ? ' <span class="eq-tag">você</span>' : ''}</h3>
    ${p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ''}
    <div class="eq-tags">${[p.papel, p.inst].filter(Boolean).map(t => `<span>${esc(t)}</span>`).join('')}</div>
    ${p.area ? `<p>${ti('target')} ${esc(p.area)}</p>` : ''}${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
    <p class="small">${nP} projeto(s) da equipe · ${nF} feedback(s)</p>`;
}
function subPerfil(el) {
  el.innerHTML = `<div class="eq-two"><div class="card"><h3>${ti('id-badge-2')} Meu perfil</h3>
    <p class="lead">É assim que a equipe vê você nos projetos e nos feedbacks.</p>
    <div class="eq-ph"><img id="pfFoto" alt="Sua foto"><div class="row"><label class="btn soft">${ti('camera')} Escolher foto<input type="file" id="pfFile" accept="image/*" hidden></label><button class="btn-out" id="pfNoFoto">Remover foto</button></div></div>
    <label class="eq-f">Nome completo *<input id="pf-nome" maxlength="90" autocomplete="name"></label>
    <label class="eq-f">E-mail<input id="pf-email" type="email" maxlength="120" autocomplete="email"></label>
    <div class="eq-2"><label class="eq-f">Instituição<input id="pf-inst" maxlength="90" placeholder="Universidade, órgão, ONG…"></label>
      <label class="eq-f">Função<select id="pf-papel"><option value="">Escolha…</option>${FUN.map(f => `<option>${f}</option>`).join('')}</select></label></div>
    <label class="eq-f">Áreas de interesse<input id="pf-area" maxlength="120" placeholder="Ex.: zoonoses, ecologia marinha, clima"></label>
    <label class="eq-f">Sobre você<textarea id="pf-bio" maxlength="400" placeholder="Duas ou três linhas sobre sua pesquisa."></textarea></label>
    <div class="row"><button class="btn" id="pfSave">${ti('device-floppy')} Salvar perfil</button><span class="small mut" id="pfMsg"></span></div></div>
    <div><p class="small mut">Pré-visualização</p><div class="card eq-pcard" id="pfPrev"></div></div></div>`;
  E.pfDirty = false; fillPf(); drawPrev();
  PF.forEach(k => $('pf-' + k).addEventListener('input', () => { E.pfDirty = true; $('pfMsg').textContent = 'Alterações não salvas'; drawPrev(); }));
  $('pfFile').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { // recorta no centro e reduz para 200 px
      const bmp = await createImageBitmap(f), s = Math.min(bmp.width, bmp.height), c = document.createElement('canvas');
      c.width = c.height = 200; c.getContext('2d').drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, 200, 200);
      E.foto = c.toDataURL('image/jpeg', .85); E.pfDirty = true; $('pfMsg').textContent = 'Foto pronta: salve o perfil'; drawPrev();
    } catch { toast('Não consegui ler essa imagem. Tente JPG ou PNG.'); }
  };
  $('pfNoFoto').onclick = () => { E.foto = null; E.pfDirty = true; drawPrev(); };
  $('pfSave').onclick = () => {
    const v = pfVals();
    if (!v.nome) { $('pf-nome').focus(); return toast('Preencha seu nome completo.'); }
    if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return toast('Esse e-mail não parece válido.');
    run(setDoc(doc(db, 'perfis', E.u.uid), {...v, foto: E.foto || '', at: E.perfis[E.u.uid]?.at || Date.now(), upd: Date.now()}), 'Perfil salvo.')
      .then(() => { E.pfDirty = false; $('pfMsg').textContent = 'Salvo'; }, () => {});
  };
}
const pfVals = () => Object.fromEntries(PF.map(k => [k, $('pf-' + k).value.trim()]));
function fillPf() {
  if (!$('pf-nome')) return;
  const p = E.perfis[E.u.uid] || {};
  PF.forEach(k => { $('pf-' + k).value = p[k] || (k === 'nome' ? E.u.displayName || '' : k === 'email' ? E.u.email || '' : ''); });
  E.foto = okImg(p.foto) || null;
}
function drawPrev() {
  if (!$('pfPrev')) return;
  const v = pfVals(); $('pfFoto').src = E.foto || initials(v.nome);
  $('pfPrev').innerHTML = pcard(E.u.uid, {...v, foto: E.foto});
}

// pessoas
function subPessoas(el) {
  el.innerHTML = `<div class="eq-tool"><input type="search" id="eqQ" placeholder="Buscar pessoa, instituição, área…" aria-label="Buscar na equipe"><span class="small mut" id="eqN"></span></div><div class="eq-team" id="eqTeam"></div>`;
  $('eqQ').oninput = drawPessoas; drawPessoas();
}
function drawPessoas() {
  if (!$('eqTeam')) return;
  const q = $('eqQ').value.trim().toLowerCase(), all = Object.entries(E.perfis).filter(([, p]) => p.nome);
  const L = all.filter(([, p]) => !q || [p.nome, p.inst, p.papel, p.area, p.bio].join(' ').toLowerCase().includes(q)).sort((a, b) => a[1].nome.localeCompare(b[1].nome, 'pt'));
  $('eqN').textContent = `${all.length} pessoa(s)`;
  $('eqTeam').innerHTML = L.length ? L.map(([id, p]) => `<div class="card eq-pcard">${pcard(id, p)}</div>`).join('') : `<div class="card empty">${ti('users')}${q ? 'Ninguém encontrado.' : 'Ninguém preencheu o perfil ainda.'}</div>`;
}

// feedbacks
function subFb(el) {
  el.innerHTML = `<div class="eq-two"><div>
      <div class="eq-tool"><select id="fbT" aria-label="Tipo"><option value="">Todos os tipos</option>${opts(TIPOS)}</select>
        <select id="fbS" aria-label="Situação"><option value="">Todas as situações</option>${opts(STS)}</select>
        <select id="fbO" aria-label="Ordem"><option value="v">Mais apoiados</option><option value="r">Mais recentes</option></select></div>
      <div class="eq-list" id="fbList"></div></div>
    <div class="card eq-side"><h3>${ti('message-plus')} Sugerir ou relatar</h3>
      <p class="lead">Ideias de análise, dados que faltam, algo que não funcionou. Apoie as sugestões dos colegas com ${ti('thumb-up')}: as mais apoiadas sobem.</p>
      <div class="eq-2"><label class="eq-f">Tipo<select id="fbTipo">${opts(TIPOS)}</select></label>
        <label class="eq-f">Onde<select id="fbPag">${PAGS.map(p => `<option ${p === E.fbPag ? 'selected' : ''}>${p}</option>`).join('')}</select></label></div>
      <label class="eq-f">Título *<input id="fbTit" maxlength="100" placeholder="Resumo em uma linha"></label>
      <label class="eq-f">Descrição *<textarea id="fbTxt" maxlength="2000" placeholder="O que esperava, o que aconteceu, que espécie ou área usou…"></textarea></label>
      <button class="btn" id="fbSend">${ti('send')} Enviar feedback</button></div></div>`;
  ['fbT', 'fbS', 'fbO'].forEach(i => { $(i).oninput = drawFb; });
  $('fbSend').onclick = () => {
    const tit = $('fbTit').value.trim(), txt = $('fbTxt').value.trim();
    if (!tit || !txt) return toast('Preencha o título e a descrição.');
    run(setDoc(doc(db, 'feedbacks', uid()), {by: E.u.uid, tipo: $('fbTipo').value, pag: $('fbPag').value, tit, txt, st: 'novo', resp: '', votos: {}, at: Date.now()}), 'Obrigado! Feedback enviado.')
      .then(() => { $('fbTit').value = $('fbTxt').value = ''; }, () => {});
  };
  $('fbList').onclick = e => {
    const b = e.target.closest('button[data-f]'); if (!b) return;
    const id = b.closest('[data-id]').dataset.id, x = E.fbs.find(y => y.id === id), a = b.dataset.f, me = E.u.uid; if (!x) return;
    if (a === 'vote') run(updateDoc(doc(db, 'feedbacks', id), {['votos.' + me]: x.votos?.[me] ? deleteField() : true})).catch(() => {});
    if (a === 'save') { const art = b.closest('[data-id]'); run(updateDoc(doc(db, 'feedbacks', id), {st: art.querySelector('[data-f=st]').value, resp: art.querySelector('[data-f=resp]').value.trim(), respAt: Date.now()}), 'Resposta salva.').catch(() => {}); }
    if (a === 'del' && confirm(`Apagar o feedback “${x.tit}”?`)) run(deleteDoc(doc(db, 'feedbacks', id)), 'Feedback apagado.').catch(() => {});
  };
  drawFb();
}
function drawFb() {
  if (!$('fbList')) return;
  const t = $('fbT').value, s = $('fbS').value, o = $('fbO').value, n = x => Object.keys(x.votos || {}).length;
  const L = E.fbs.filter(x => (!t || x.tipo === t) && (!s || (x.st || 'novo') === s)).sort((a, b) => o === 'v' ? n(b) - n(a) || b.at - a.at : b.at - a.at);
  $('fbList').innerHTML = L.length ? L.map(x => {
    const on = !!x.votos?.[E.u.uid], tp = TIPOS[x.tipo] || TIPOS.sug, st = x.st || 'novo', mine = x.by === E.u.uid;
    return `<article class="card eq-fb" data-id="${esc(x.id)}">
      <button class="eq-vote ${on ? 'on' : ''}" data-f="vote" aria-pressed="${on}" title="${on ? 'Tirar apoio' : 'Apoiar'}">${ti('thumb-up')}<b>${n(x)}</b></button>
      <div><div class="eq-tags"><span>${ti(tp[1])} ${tp[0]}</span><span class="st-${st}">${STS[st]}</span>${x.pag ? `<span>${ti('map-pin')} ${esc(x.pag)}</span>` : ''}</div>
        <h3>${esc(x.tit)}</h3><p class="eq-txt">${esc(x.txt)}</p>${E.who(x.by, x.at)}
        ${x.resp ? `<div class="eq-resp"><b>${ti('message-reply')} Resposta da coordenação</b>${x.respAt ? ` · ${when(x.respAt)}` : ''}<br>${esc(x.resp)}</div>` : ''}
        ${E.coord ? `<div class="eq-adm"><label class="eq-f">Situação<select data-f="st">${opts(STS, st)}</select></label>
          <textarea data-f="resp" maxlength="1000" placeholder="Responder a quem enviou (opcional)">${esc(x.resp || '')}</textarea>
          <button class="btn soft" data-f="save">${ti('device-floppy')} Salvar resposta</button></div>` : ''}
        ${mine || E.coord ? `<div class="pj-acts"><button data-f="del" class="danger">${ti('trash')} Apagar</button></div>` : ''}</div></article>`;
  }).join('') : `<div class="card empty">${ti('message-2')}${E.fbs.length ? 'Nada com esse filtro.' : 'Nenhum feedback ainda. Conte o que achou da plataforma!'}</div>`;
}

// membros (só coordenação)
function subMem(el) {
  el.innerHTML = `<div class="eq-two"><div class="card"><h3>${ti('shield-lock')} Quem pode entrar</h3>
      <p class="lead">Só estes e-mails entram na plataforma. Quem coordena gerencia a lista e responde feedbacks.</p><div id="memList"></div></div>
    <div class="card eq-side"><h3>${ti('user-plus')} Incluir pessoa</h3>
      <label class="eq-f">E-mail<input id="memEm" type="email" placeholder="colega@instituicao.br"></label>
      <label class="eq-f">Papel<select id="memPap"><option value="membro">Membro</option><option value="coord">Coordenação</option></select></label>
      <button class="btn" id="memAdd">${ti('user-plus')} Incluir</button>
      <p class="small mut">Depois, mande a ela o endereço da plataforma: <b>${esc(location.origin + location.pathname)}</b>. Ela entra com esse e-mail, por link ou pela conta Google.</p></div></div>`;
  $('memAdd').onclick = () => {
    const em = $('memEm').value.trim().toLowerCase();
    if (!/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(em)) return toast('Digite um e-mail válido.');
    run(setDoc(doc(db, 'membros', em), {papel: $('memPap').value, at: Date.now(), por: E.u.uid}), 'Pessoa incluída.').then(() => { $('memEm').value = ''; }, () => {});
  };
  $('memList').onclick = e => {
    const b = e.target.closest('button[data-m]'); if (!b) return;
    const id = b.closest('[data-id]').dataset.id;
    if (b.dataset.m === 'del' && confirm(`Tirar o acesso de ${id}?`)) run(deleteDoc(doc(db, 'membros', id)), 'Acesso retirado.').catch(() => {});
    if (b.dataset.m === 'pap') { const m = E.membros.find(x => x.id === id); run(updateDoc(doc(db, 'membros', id), {papel: m.papel === 'coord' ? 'membro' : 'coord'}), 'Papel alterado.').catch(() => {}); }
  };
  drawMem();
}
function drawMem() {
  if (!$('memList')) return;
  const byEm = Object.fromEntries(Object.entries(E.perfis).map(([id, p]) => [String(p.email || '').toLowerCase(), p.nome]));
  $('memList').innerHTML = `<div class="eq-mem">${E.membros.sort((a, b) => a.id.localeCompare(b.id)).map(m => `<div data-id="${esc(m.id)}">
    <span><b>${esc(byEm[m.id] || m.id)}</b>${byEm[m.id] ? `<small>${esc(m.id)}</small>` : ''}</span><span class="eq-tag">${m.papel === 'coord' ? 'coordenação' : 'membro'}</span>
    ${m.id === E.em ? '<small class="mut">você</small>' : `<button class="btn-out" data-m="pap">${m.papel === 'coord' ? 'Tornar membro' : 'Tornar coordenação'}</button><button class="icon-btn" data-m="del" title="Tirar acesso">${ti('trash')}</button>`}</div>`).join('')}</div>`;
}
