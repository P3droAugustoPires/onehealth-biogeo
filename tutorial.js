// ---------- Tutoriais: passo a passo com um quadro que aponta para cada parte da tela ----------
// Um tutorial por página (menu ? → "Tutorial desta página") e o tour completo. Abre sozinho na primeira visita.
(() => {
const TOURS = {
  mapa: [
    {ic: 'hand-finger', t: 'Bem-vindo ao One Health BioGeo', d: 'Aqui você cruza <b>onde as espécies vivem</b> com o <b>ambiente</b> (tempo, oceano, uso da terra, cidades) para levantar hipóteses de saúde única: humana, animal e ambiental. Este tutorial mostra o mapa, parte por parte.', tip: 'Avance com → ou Enter; volte com ←; saia com Esc.'},
    {el: '#combo', ic: 'search', t: '1. Escolha uma espécie', d: 'Digite o nome científico ou popular (atalho <kbd>/</kbd>). Ao clicar no campo aparecem blocos por grupo — animais, plantas, fungos, bactérias… — que filtram as sugestões. O número em cada sugestão é quantos registros ela tem no Brasil.', tip: 'Experimente “onça”, “mangue”, “Aedes” ou “tartaruga”.'},
    {el: '#sbOpen', ic: 'adjustments-horizontal', t: '2. Filtros: onde, quando e qualidade', d: '<b>Onde</b>: Brasil, mundo ou a área visível. <b>Quando</b>: período e atalhos (últimos 10 anos…). <b>Fonte</b>: OBIS (mar) ou GBIF (todos os grupos). <b>Refinar</b>: meses, dentro ou fora de Unidades de Conservação, conjunto de dados, tipo de registro.', tip: 'O número no botão conta os filtros ligados. “Restaurar tudo ao padrão” fica no fim da gaveta.'},
    {el: '#qchips', ic: 'bolt', t: 'Atalhos de filtro', d: 'Com uma espécie carregada aparecem atalhos de um clique: <b>últimos 10 anos</b>, <b>dentro de UCs</b>, <b>out–mar</b> ou <b>abr–set</b>, <b>só observações</b> e <b>Analisar uma área</b>, que desenha um retângulo e faz o painel contar só o que está dentro. Os filtros que você aplicar clicando nos gráficos também aparecem aqui, com um × para tirar.'},
    {el: '#lrail', ic: 'stack-2', t: '3. Camadas ambientais', d: 'Cada ícone abre um grupo, como no zoom.earth: <b>Tempo</b> (temperatura, chuva, vento…), <b>Oceano</b> (correntes, pH, oxigênio, clorofila…), <b>Terra</b> (MapBiomas, cobertura mundial, perda de floresta, NDVI, solo, ecorregiões), <b>Cidades</b> (ilhas de calor), <b>Pessoas</b> (população, luzes noturnas, fumaça), <b>Limites</b> (UCs, Terras Indígenas) e o <b>mapa-base</b>. O pontinho verde mostra o grupo que está ligado.'},
    {el: '#fly', before: () => setFly('mar'), after: () => setFly(''), ic: 'ripple', t: '4. Ligar e ajustar uma camada', d: 'Clique numa camada para ligar; clique de novo (ou em “Desligar”) para tirar. O ícone ▶ indica que ela muda no tempo: horas, dias ou anos. Embaixo fica a <b>transparência</b>, para enxergar o mapa por baixo.', tip: 'Uma camada ambiental por vez, para as cores não se misturarem. Limites podem ser vários.'},
    {el: '#dock', ic: 'player-play', t: '5. O tocador do tempo', d: 'O ▶ anima a camada (previsão hora a hora, dias do oceano, anos do MapBiomas). Na aba <b>Espécies</b> ele anima os registros ano a ano. <b>Sincronizar</b> amarra o ano das camadas anuais ao ano dos registros. Em camadas com anos ou dias em imagem, <b>Comparar</b> abre uma cortina: um ano de cada lado, arraste para ver o antes e depois.', tip: 'Experimente o MapBiomas: 1985 de um lado, 2025 do outro.'},
    {el: '#details', ic: 'list-details', t: '6. Legenda', d: 'Mostra só o que está ligado: a escala de cores da camada, as cores dos pontos e os limites. A fonte do dado aparece embaixo de cada título.'},
    {el: '#map', ic: 'click', t: '7. Clique em qualquer lugar do mapa', d: 'O balão traz o valor da camada no ponto com um minigráfico no tempo, a ecorregião, o tempo agora, o mar, a cobertura da terra e as Unidades de Conservação. O botão <b>Ambiente deste ponto no Painel</b> abre os gráficos daquele lugar.', tip: 'Clique num ponto da espécie para ver o registro original.'},
    {el: '.cut-ctl', ic: 'cube-3d-sphere', t: '8. Recorte 3D', d: 'Desenhe um retângulo e veja relevo, fundo do mar, a camada e as ocorrências como uma maquete. Passe o mouse para ler altitude e valores. Exporta STL para impressão 3D, GLB e imagem.'},
    {el: '#saveProj', ic: 'device-floppy', t: '9. Guarde o que montou', d: 'Salva espécie, filtros, camada, limites e o enquadramento num <b>projeto</b>, dentro de pastas. Depois é só abrir na aba Projetos.'},
    {el: '#tabs', ic: 'layout-navbar', t: '10. Uma página para cada coisa', d: '<b>Mapa</b> · <b>Painel</b> (gráficos) · <b>Explorar</b> (o que vive aqui, camadas e catálogo) · <b>Análise</b> (ficha da espécie, perguntas e exportar) · <b>Projetos</b>.'},
    {el: '#helpBtn', ic: 'help-circle', t: '11. Ajuda sempre à mão', d: 'Neste botão você reabre o tutorial de cada página, vê as fontes e a metodologia, <b>copia o link da consulta</b> e restaura tudo ao padrão.'},
    {el: '#helpBtn', ic: 'users-group', t: '12. Trabalhe em equipe', d: 'O link da consulta abre <b>exatamente a mesma tela</b> em qualquer computador: espécie, filtros, camada, limites e enquadramento. A equipe guarda esses links no <b>Espaço da equipe</b> (no Claude), junto com o perfil de cada pessoa e os feedbacks. Ele também fica neste menu.', tip: 'Recebeu um link de projeto? É só abrir: ele entra sozinho na pasta “Recebidos da equipe”.'},
  ],
  stats: [
    {ic: 'chart-dots', t: 'Painel: os gráficos', d: 'O Painel junta o <b>ambiente de um lugar</b> e os <b>números da espécie</b>. Tudo respeita os filtros.'},
    {el: '#envNow', ic: 'world-pin', t: '1. Ambiente do lugar agora', d: 'Temperatura, sensação, umidade, vento, chuva e, no mar, ondas, correntes e temperatura da água. O lugar é o centro do mapa ou o ponto que você clicou no mapa.', tip: 'No mapa, clique num ponto e use “Ambiente deste ponto no Painel”.'},
    {el: '.envgrid', ic: 'chart-line', t: '2. Uma semana para trás e para frente', d: 'À esquerda o ar (máxima, mínima e chuva de 7 dias atrás a 7 à frente); à direita o mar (ondas, correntes e temperatura). Bom para ver se um registro coincide com calor, chuva forte ou ressaca.'},
    {el: '#spStats .hero', ic: 'paw', t: '3. A espécie em números', d: 'Registros, locais distintos, período, conjuntos de dados, extensão (EOO) e área de ocupação (AOO), que alimentam o critério B da IUCN.'},
    {el: '#spStats .dash', ic: 'chart-bar', t: '4. Gráficos que filtram', d: 'Registros por ano, sazonalidade, ecorregiões, UCs, tipo de registro, conjuntos de dados… <b>Clique numa barra ou fatia</b> para filtrar o mapa e todo o painel; clique de novo para soltar. Shift+clique no gráfico de anos marca um intervalo. Cada gráfico continua mostrando o todo, com a seleção destacada.', tip: 'Ex.: clique em “jul” na sazonalidade e veja no mapa onde estão os registros de julho.'},
    {el: '#nicheCard', ic: 'chart-histogram', t: '5. Perfil ambiental (nicho)', d: 'Compara os locais da espécie com pontos sorteados na região: temperatura, chuva e altitude (ou, no mar, temperatura, salinidade e profundidade). Diz a faixa ocupada, se ela prefere a parte quente ou fria da região, e gera um mapa de <b>adequabilidade</b>: onde o ambiente se parece com o dos locais conhecidos.', tip: 'Áreas adequadas sem registros podem ser lacunas de coleta: bons lugares para procurar.'},
    {el: '#ohCard', ic: 'heart-rate-monitor', t: '6. Interface One Health', d: 'Quanto a espécie vive perto de <b>gente</b> (população e luzes noturnas) e em áreas que <b>perderam floresta</b>, comparado com o acaso; <b>picos</b> de registros e a fonte que os explica; registros <b>isolados</b> (erro ou expansão de área); e a <b>co-ocorrência</b> com um vetor ou reservatório, como o <i>Aedes</i> ou o morcego-vampiro.', tip: 'Cada bloco tem “Marcar no mapa”: o × na legenda tira as marcas.'},
  ],
  ficha: [{ic: 'id', t: 'Espécie: a ficha', d: 'Foto, nomes populares, classificação, status na IUCN e a <b>relevância One Health</b> do grupo (zoonoses, vetores, indicadores ambientais). Os números de risco (EOO, AOO, critério B) são calculados com os registros carregados.', tip: 'Com poucos registros a estimativa de risco é frágil: veja o aviso de amostra parcial.'}],
  busca: [
    {ic: 'compass', t: 'Explorar: quando você não sabe por onde começar', d: 'Quatro caminhos para descobrir espécies e dados.'},
    {el: '#xtabs', ic: 'layout-list', t: '1. Quatro abas', d: '<b>Espécies por grupo</b> o que vive na área · <b>Buscar por nome</b> com filtro de grupo e nível · <b>Dados ambientais</b> todas as camadas e um catálogo de 229 bases · <b>Clima dos lugares</b> capitais, biomas, ecorregiões e UCs lado a lado.'},
    {el: '#hGrp', before: () => xShow('lugar'), ic: 'paw', t: '2. Espécies por grupo', d: 'Escolha a área (a visível no mapa, Brasil ou mundo) e um dos 41 grupos, de mamíferos a carrapatos e vírus; o número em cada um é o total de registros. A lista traz nome popular, Lista Vermelha e atalhos para o mapa e o painel, e sai em CSV.', tip: 'Aproxime o mapa numa região, volte aqui e veja quem mais aparece nela.'},
    {el: '#thCat', before: () => xShow('dados'), after: () => xShow('lugar'), ic: 'database', t: '3. Dados ambientais', d: 'Todas as camadas do mapa, por tema: um clique liga a camada e abre o mapa. Mais abaixo, o catálogo com links para baixar bases de clima, saúde, biologia e geografia.'},
    {el: '#clType', before: () => xShow('clima'), after: () => xShow('lugar'), ic: 'temperature-sun', t: '4. Clima dos lugares', d: 'Temperatura, sensação, umidade, vento e chuva (agora, últimos 30 dias e próximos 7) das capitais, dos biomas, das ecorregiões e das maiores UCs. Clique numa coluna para ordenar; baixe em CSV ou JSON.'},
  ],
  perg: [{ic: 'bulb', t: 'Perguntas', d: 'Hipóteses científicas montadas a partir dos seus dados: sazonalidade, mudança de área, relação com clima, cobertura da terra e áreas protegidas. Cada pergunta indica o teste estatístico e as variáveis.', tip: 'Use como ponto de partida e teste no R ou Python com o que vem em Exportar.'}],
  exp: [{ic: 'file-export', t: 'Exportar', d: 'Os registros filtrados em CSV ou GeoJSON, um script R pronto (com obistools, IUCNN…), o clima ERA5 de todos os registros em Python e o script do Earth Engine para a cobertura da terra. É a ponte para a análise completa.'},
    {el: '.grp', ic: 'table-options', t: 'Agrupar e baixar', d: 'Resuma os registros por ecorregião, bioma, UC, ano, mês, espécie, conjunto de dados ou célula de 1° / 0,1° (uma ou duas colunas). Sai em CSV e JSON; por célula, também como grade GeoJSON para o QGIS.'}],
  proj: [
    {ic: 'folders', t: 'Projetos', d: 'Suas consultas salvas, organizadas em pastas, e o caminho para compartilhar com a equipe.'},
    {el: '.pj-save', ic: 'device-floppy', t: '1. Salvar o que está na tela', d: 'Dê um nome, escolha a pasta, escreva uma anotação (a hipótese, o que observar) e salve. Os quadradinhos embaixo mostram o que vai junto.'},
    {el: '.pj-folders', ic: 'folder', t: '2. Pastas', d: 'Crie pastas por tema, artigo ou aula. <b>Exportar</b> gera um arquivo para cópia de segurança ou para outro computador; <b>Importar</b> junta sem apagar nada.'},
    {el: '.pj-list', ic: 'player-play', t: '3. Abrir, atualizar e mover', d: '<b>Abrir</b> recarrega a página exatamente como estava. <b>Atualizar com o atual</b> substitui pelo que está na tela. Mova entre pastas pelo seletor.'},
    {el: '.pj-top', ic: 'share', t: '4. Compartilhar com a equipe', d: '<b>Compartilhar</b> copia um link que reproduz o projeto em qualquer computador. Cole no <b>Espaço da equipe › Projetos</b> com um tema e uma anotação: os colegas abrem com um clique e podem sugerir melhorias em <b>Feedbacks</b>.', tip: 'Projetos abertos por link de colegas ficam na pasta “Recebidos da equipe”.'},
  ],
};
const PAGE = {mapa: 'Mapa', stats: 'Painel', ficha: 'Análise › Espécie', busca: 'Explorar', perg: 'Análise › Perguntas', exp: 'Análise › Exportar', proj: 'Projetos'};
const T = {steps: [], i: 0, prev: null};

function start(steps) {
  if (!steps.length) return;
  menu(false); setSb(false);
  T.steps = steps; T.i = 0; T.prev = null; $('tour').hidden = false; show();
  try { localStorage.setItem('ohb-tour', '1'); } catch { /* ignora */ }
}
function stop() { T.prev?.after?.(); T.prev = null; $('tour').hidden = true; }
function go(d) { const i = T.i + d; if (i < 0) return; if (i >= T.steps.length) return stop(); T.i = i; show(); }
function show() {
  const s = T.steps[T.i];
  if (T.prev !== s) { T.prev?.after?.(); if (s.view && (S.view === 'analise' ? S.an : S.view) !== s.view) showView(s.view); s.before?.(); T.prev = s; }
  setTimeout(place, s.before || s.view ? 260 : 0);
}
function place() {
  const s = T.steps[T.i], el = s.el && document.querySelector(s.el), r = el?.getBoundingClientRect(), vis = r && r.width > 4 && r.height > 4 && !el.closest('[hidden]');
  const sp = $('tourSpot'), c = $('tourCard'), W = innerWidth, H = innerHeight, pad = 6;
  if (vis) { // o destaque não passa da tela (o mapa ocupa quase tudo)
    const x = Math.max(4, r.left - pad), y = Math.max(4, r.top - pad), w = Math.min(W - 8, r.right + pad) - x, h = Math.min(H - 8, r.bottom + pad) - y;
    Object.assign(sp.style, {left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', opacity: 1});
  } else Object.assign(sp.style, {left: W / 2 + 'px', top: H / 2 + 'px', width: 0, height: 0, opacity: 1});
  const n = T.steps.length, pg = PAGE[s.view] || '';
  c.innerHTML = `<div class="tour-top"><span class="tour-ic">${ti(s.ic || 'school')}</span><div><small>${pg ? pg + ' · ' : ''}passo ${T.i + 1} de ${n}</small><h3>${s.t}</h3></div>
      <button class="icon-btn" data-t="x" title="Sair do tutorial (Esc)">${ti('x')}</button></div>
    <p>${s.d}</p>${s.tip ? `<p class="tour-tip">${ti('bulb')}<span>${s.tip}</span></p>` : ''}${s.el && !vis ? `<p class="tour-tip">${ti('eye-off')}<span>Esta parte aparece quando há algo ligado (uma espécie, uma camada com tempo).</span></p>` : ''}
    <div class="tour-foot"><div class="tour-dots">${T.steps.map((_, i) => `<i class="${i === T.i ? 'on' : i < T.i ? 'done' : ''}"></i>`).join('')}</div>
      ${T.i ? `<button class="btn soft" data-t="-1">${ti('arrow-left')} Voltar</button>` : `<button class="btn soft" data-t="x">Pular</button>`}
      <button class="btn" data-t="1">${T.i === n - 1 ? `Concluir ${ti('check')}` : `Próximo ${ti('arrow-right')}`}</button></div>`;
  c.querySelectorAll('[data-t]').forEach(b => b.onclick = () => b.dataset.t === 'x' ? stop() : go(+b.dataset.t));
  // o quadro fica embaixo, em cima, ao lado ou no centro, onde couber
  const cw = Math.min(360, W - 24), ch = c.offsetHeight || 260;
  let x = (W - cw) / 2, y = (H - ch) / 2;
  if (vis) {
    const big = r.width > W * .6 && r.height > H * .5;
    if (big) { x = W - cw - 24; y = H - ch - 110; }
    else if (r.bottom + 14 + ch < H) { y = r.bottom + 14; x = r.left + r.width / 2 - cw / 2; }
    else if (r.top - 14 - ch > 0) { y = r.top - 14 - ch; x = r.left + r.width / 2 - cw / 2; }
    else if (r.right + 14 + cw < W) { x = r.right + 14; y = r.top; }
    else if (r.left - 14 - cw > 0) { x = r.left - 14 - cw; y = r.top; }
  }
  Object.assign(c.style, {width: cw + 'px', left: Math.max(12, Math.min(W - cw - 12, x)) + 'px', top: Math.max(12, Math.min(H - ch - 12, y)) + 'px'});
  c.querySelector('[data-t="1"]').focus({preventScroll: true});
}
addEventListener('resize', () => { if (!$('tour').hidden) place(); });
addEventListener('keydown', e => {
  if ($('tour').hidden) return;
  if (e.key === 'Escape') { e.stopImmediatePropagation(); stop(); } else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1);
}, true);

const page = v => v === 'analise' ? [{view: 'ficha', el: '.an-nav', ic: 'microscope', t: 'Análise: três seções', d: 'A ficha da <b>Espécie</b>, as <b>Perguntas</b> geradas dos dados e o <b>Exportar</b> (CSV, R, ERA5, Earth Engine) ficam juntos aqui. Troque de seção por estes botões.'}, ...['ficha', 'perg', 'exp'].flatMap(page)]
  : (TOURS[v] || []).map(s => ({view: v, ...s}));
const all = () => ['mapa', 'stats', 'busca', 'analise', 'proj'].flatMap(page);
// menu de ajuda
function menu(open) { $('helpMenu').hidden = !open; $('helpBtn').setAttribute('aria-expanded', open); }
$('helpBtn').onclick = e => { e.stopPropagation(); menu($('helpMenu').hidden); };
document.addEventListener('click', e => { if (!e.target.closest('.menu-wrap')) menu(false); });
$('tourHere').onclick = () => start(page(S.view));
$('tourAll').onclick = () => start(all());
$('helpMenu').addEventListener('click', e => { if (e.target.closest('button')) menu(false); });
// primeira visita: abre o tutorial do mapa
let first = false; try { first = !localStorage.getItem('ohb-tour'); } catch { /* sem armazenamento: não insiste */ }
if (first && location.hash !== '#teste') setTimeout(() => S.view === 'mapa' && $('tour').hidden && start(page('mapa')), 1500);
})();
