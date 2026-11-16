# One Health BioGeo

Plataforma georreferenciada de biodiversidade numa abordagem **One Health** (saúde humana, animal e ambiental):
ocorrências (OBIS e GBIF, todos os reinos), ecorregiões, cobertura da terra (MapBiomas), áreas protegidas,
cidades e calor (UrbVerde), tempo animado no estilo zoom.earth (Open-Meteo, RainViewer, satélite NASA), oceano em tempo quase real
(correntes, ondas, temperatura, pH, oxigênio, nutrientes: Copernicus Marine e Open-Meteo Marine), clima ERA5 no dia de cada registro,
catálogo de 229 bases de dados, painel estatístico, linha do tempo animada e gerador de perguntas científicas.

## Como navegar
Cada aba mostra uma coisa: **Mapa · Painel · Explorar · Análise · Projetos**. A aba **Análise** junta três seções, trocadas por botões no topo: **Espécie** (ficha e risco), **Perguntas** (hipóteses geradas dos dados) e **Exportar** (CSV, R, ERA5, Earth Engine).
- **Tutoriais** (botão ? no topo): passo a passo com quadros que apontam cada parte da tela, um por página, mais o tour completo. Abre sozinho na primeira visita.
- **Projetos**: salve a consulta da tela (espécie, filtros, camada e o ano/dia mostrado, limites, mapa-base e enquadramento) em pastas, com anotação; reabra, atualize, mova, exporte e importe (JSON). Fica no navegador (localStorage), separado por endereço: 127.0.0.1:8777 e localhost:8765 têm projetos diferentes.
- **Restaurar padrão** (menu ? ou fim da gaveta de Filtros): volta tudo como na primeira abertura, sem apagar os projetos.
- Pesquisa no topo: nome científico ou popular (tecla `/`); ao abrir, os blocos de grupo (animais, plantas, fungos…) filtram as sugestões.
  Sinônimos viram o nome aceito; homônimos (ex.: *Morus*, planta e ave) pedem escolha.
- **Filtros** (botão no topo): onde, quando, fonte e refinar (meses, UC, conjunto de dados, qualidade). O número no botão conta os filtros ativos.
  Fonte automática: OBIS quando ele tem pelo menos metade dos registros do GBIF.
- **Mapa** (estilo zoom.earth): barra de ícones à esquerda (espécies, tempo, oceano, terra, cidades, limites, mapa-base) abre a lista do grupo;
  **uma camada ambiental por vez**, com transparência; limites por cima e os pontos sempre no topo. Embaixo, o tocador anima a camada
  (horas, dias, anos) ou os registros da espécie; "sincronizar" liga o ano das camadas anuais ao da linha do tempo. Legenda escura no canto.
  Clique no mapa: valor da camada no ponto com minigráfico no tempo (também nas camadas de satélite, MODIS, Hansen e SoilGrids), ecorregião, tempo agora, cobertura, mar, UCs e o botão para o Painel.
- **Recorte 3D** (botão *3D* abaixo do zoom, como no topoexport): arraste um retângulo no mapa (ou *Usar a área visível*) e veja o relevo e o fundo do mar
  em 3D com a camada ambiental ligada por cima (tempo, oceano, MapBiomas, UrbVerde…) e as ocorrências da espécie. Satélite ou relevo colorido,
  exagero vertical, mar plano ou batimetria, câmera isométrica; passe o mouse para ler altitude e valor. Exporta STL (200 mm, impressão 3D), GLB (Blender) e PNG.
- Sem espécie na URL, o mapa abre só com a camada ambiental; os pontos da espécie entram no mapa página a página enquanto carregam.
- **Atalhos** (abaixo do título, no mapa e nas páginas): últimos 10 anos, dentro de UCs, out–mar, abr–set, só observações e **Analisar uma área**
  (desenhe um retângulo: o painel conta só o que está dentro). Filtros aplicados pelos gráficos aparecem ali com ×.
- **Pessoas** (rail à esquerda): densidade populacional, luzes noturnas e fumaça/poeira no ar, para cruzar a espécie com a presença humana.
  **Terra** ganhou camadas globais (cobertura MODIS, perda de floresta Hansen, NDVI, carbono e pH do solo) e **Tempo** ganhou chuva GPM e temperatura da superfície por satélite.
- **Comparar** (no tocador, em camadas com anos/dias em imagem: MapBiomas, UrbVerde, oceano…): cortina antes/depois, um tempo de cada lado; arraste o meio.
- Legenda recolhível (abre recolhida no celular).
- **Painel**: ambiente do ponto escolhido (ar −7 a +7 dias; mar: ondas, correntes e temperatura −2 a +5 dias) e os gráficos da espécie.
  **Clique numa barra ou fatia** para filtrar mapa e painel (Shift+clique no gráfico de anos = intervalo); cada gráfico conta com os outros filtros e destaca a seleção.
  **Perfil ambiental**: temperatura, chuva e altitude (mar: temperatura, salinidade e profundidade) nos locais da espécie × pontos sorteados na região,
  com a faixa ocupada (P10–P90) e o **mapa de adequabilidade** (envelope tipo BIOCLIM): onde o ambiente se parece com o dos locais conhecidos.
  **Interface One Health**: densidade populacional (GPW 2020) e luzes noturnas nos locais × pontos sorteados na região; perda de floresta (Hansen) no entorno,
  antes ou depois do registro; picos de registros por ano, com o conjunto de dados que os explica; registros isolados (erro ou expansão de área);
  e co-ocorrência com outra espécie (vetor, reservatório) numa grade, com índice de Jaccard. Cada bloco marca o resultado no mapa.
- **Explorar**:
  - *Espécies por grupo*: 41 grupos com ícone (vertebrados, invertebrados, plantas, fungos e microrganismos) e o total de registros na área (mapa, Brasil ou mundo);
    a lista traz as espécies com mais registros, nome popular, Lista Vermelha, atalhos para mapa e painel, CSV e link para a lista completa no GBIF.
    Peixes ósseos não têm classe no backbone do GBIF: o grupo junta 35 ordens. Ao escolher um reino aparece a descrição dele (antiga aba *Reinos*).
  - *Buscar por nome* e *Dados ambientais* (todas as camadas + catálogo).
  - *Clima dos lugares*: capitais estaduais e Brasília, os 6 biomas (IBGE), ecorregiões (WWF) e as 50 maiores UCs (CNUC/MMA; federais, estaduais ou municipais),
    com temperatura agora, sensação, umidade, vento, média e chuva dos últimos 30 dias e faixa e chuva dos próximos 7 (Open-Meteo, várias coordenadas por consulta).
    Ordena por coluna e baixa em CSV/JSON. Limites: bioma = média de 4–5 pontos de amostra; UC = centro do retângulo envolvente (pode cair fora de UCs irregulares);
    ecorregião = um ponto interno; "Brasil" para ecorregiões usa um contorno simplificado do país.
- **Análise › Exportar**: registros em CSV ou GeoJSON e **Agrupar e baixar** (uma ou duas colunas entre ecorregião, bioma, UC, ano, década, mês, espécie, família,
  conjunto de dados, tipo de registro e célula de 1°/0,1°; medidas: registros, espécies, locais, primeiro e último ano), em CSV, JSON e, por célula, grade GeoJSON.
- **Visual**: paleta Royal Blue (#0056FF, #2277FF, preto, lavanda #E3E7FC, branco; degradês Futurewave e Midnight Surge) nos tokens do `app.css`;
  as cores de dados (biomas, rampas do mar, temperatura) não mudaram.

## Rodar
Dê dois cliques no atalho **One Health BioGeo** da Área de Trabalho. Ele executa `iniciar.pyw`, que:
- sobe um servidor local em http://127.0.0.1:8777 (acessível só neste computador, sem janela de console);
- abre o navegador; se já estiver rodando, só abre o navegador;
- desliga sozinho após 2 horas sem acesso (ou encerre o processo `pythonw.exe` no Gerenciador de Tarefas).

Sem o atalho: `pyw iniciar.pyw` nesta pasta. Autoverificação dos cálculos: http://127.0.0.1:8777/#teste (resultado no console).
Se o atalho sumir, recrie apontando para `pyw.exe "…\OneHealthBioGeo\iniciar.pyw"` com o ícone `logo.ico`.
O menu ? → "Copiar link desta consulta" gera um link `#proj=…` com a consulta inteira (espécie, filtros, camada e o ano/dia, limites, mapa-base e o enquadramento).

## Equipe: compartilhar com outras pessoas
São duas peças:
- **Plataforma** (esta pasta): um site estático. Para quem está em outro computador, ela precisa estar num endereço público (GitHub Pages, Netlify ou outro host de arquivos estáticos). Não precisa de conta nem de servidor próprio: as consultas vão direto do navegador para GBIF, OBIS, Open-Meteo etc.
- **Espaço da equipe** (`equipe/hub.html`, publicado no Claude em https://claude.ai/artifact/WKdATxfAczGddNETdcef9n): perfil com foto, nome completo e e-mail; projetos compartilhados; feedbacks com apoio, situação e resposta; aba Equipe. Os dados ficam no banco do artifact. A plataforma não roda dentro do Claude porque o artifact bloqueia acesso às APIs e aos mapas.

Como eles se ligam: na plataforma, aba Projetos → **Compartilhar** copia o link `#proj=…`. No Espaço, em Projetos, cole o link e dê um tema e uma anotação. Os colegas clicam em **Abrir na plataforma** e a consulta abre igual. Ela também é guardada na pasta "Recebidos da equipe".

Acesso: no Espaço, Compartilhar → convide pelo e-mail da conta Claude (gratuita ou paga) como **Editor**. Leitor só vê, e um link público dá só leitura a quem é de fora. No Início do Espaço, o quadro Coordenação (visível só para o dono) guarda o endereço público da plataforma.

Regras do banco: cada pessoa grava só o próprio perfil, os próprios projetos, feedbacks e apoios. O dono pode editar ou apagar tudo e responder feedbacks; o endereço da plataforma (`config/app`) é só do dono. Em `projetos.js`, `HUB` é o link do Espaço que aparece no menu ?.

## Arquivos
- `index.html`, `app.css`, `app.js`: a plataforma. Ao editar CSS/JS, aumente o `?v=` no `index.html` para furar o cache.
- `logo.svg`: logo (círculo de faixas terra/fauna/água + linha de pulso); `logo.ico` e `logo.png` para o atalho
- `iniciar.pyw`: inicializador usado pelo atalho da Área de Trabalho
- `data/teow.json`: ecorregiões terrestres do WWF (zip oficial TEOW), simplificadas para ~3 km (4,7 MB)
- `data/meow.json`: ecorregiões marinhas MEOW (do repositório gbif-ecoregions), simplificadas (0,2 MB)
- `projetos.js`: aba Projetos, links `#proj=` (compartilhar e abrir) e Restaurar padrão · `tutorial.js`: tutoriais e menu de ajuda
- `onehealth.js`: cartão Interface One Health (pessoas, floresta, anomalias, co-ocorrência) e marcas no mapa
- `analise.js`: atalhos, filtro cruzado dos gráficos, área desenhada, perfil ambiental + adequabilidade, comparador e legenda recolhível
- `recorte3d.js`: o recorte 3D (Three.js 0.160 via importmap no `index.html`)
- `data/catalogo.json`: 229 bases de dados (com link) vindas de `ProjetosClaude/estudos/data/datasets*.json`, só as verificadas
- `grupos.js`: 43 ícones de silhueta próprios (SVG 24×24, cor herdada), os grupos da listagem com as chaves do GBIF e `grpIc()`, que escolhe o ícone pela classificação
- `clima.js`: Explorar › Clima dos lugares
- `equipe/hub.html`: o Espaço da equipe (artifact do Claude, com banco de dados). Para mudar, edite e publique de novo no mesmo endereço
- Ícones de interface: Tabler Icons (webfont via jsdelivr); a pasta `icons/` e `ICONES-PROMPTS.md` não são mais usadas
- `vendor/`: repositórios de referência (robis, obistools, IUCNN, MapBiomas, gbif-ecoregions)

## De onde vem cada coisa
| Recurso | Fonte | Equivalente nos repositórios |
|---|---|---|
| Ocorrências marinhas + temperatura/salinidade/profundidade | API OBIS v3 | `robis::occurrence()`, `obistools::lookup_xy()` |
| Ocorrências de todos os reinos, nomes populares, IUCN | API GBIF | `rgbif` no script R |
| Ecorregiões, registros e riqueza por ecorregião | WWF TEOW + MEOW, no navegador | `gbif-ecoregions` (intersect + compute_species_richness) |
| Cobertura da terra 1985–2025 | API pública da plataforma MapBiomas, Coleção 11 | `user-toolkit` (script GEE exportado) |
| Terras Indígenas, quilombos, biomas | GeoServer MapBiomas | — |
| UCs (CNUC), Áreas Prioritárias, PANs | GeoServer INDE (MMA/ICMBio) | `sf::st_join` no analise.R |
| Clima no dia do registro (amostra de 40) | ERA5 via Open-Meteo (archive-api) | script `clima_era5.py` exportado (todos os registros) |
| Tempo: sensação térmica, temperatura, chuva, vento, umidade, pressão (horário, −1 a +3 dias) | Open-Meteo, modelos ICON (DWD) e GFS (NOAA) | — |
| Radar e satélite | RainViewer; NASA GIBS (VIIRS NOAA-20) | — |
| Chuva por satélite (diária) e temperatura da superfície (mensal), globais | NASA GIBS: GPM IMERG, MODIS Terra LST | `terra`/`luna` (NASA Earthdata) para os valores |
| Cobertura da terra no mundo 2001–2024 (500 m) e NDVI mensal | NASA GIBS: MODIS MCD12Q1 (IGBP), VIIRS SNPP NDVI | `MODISTools`, `rgee` |
| Perda de floresta 2001–2024 (30 m) | Hansen/UMD Global Forest Change v1.12 (tiles públicos) | `gfcanalysis`, GEE `UMD/hansen/global_forest_change_2024_v1_12` |
| Carbono orgânico e pH do solo (0–5 cm, 250 m) | ISRIC SoilGrids 2.0 (WMS) | `soilDB::fetchSoilGrids()` |
| Densidade populacional 2000–2020, luzes noturnas 2012/2016, aerossóis diários | NASA GIBS: SEDAC GPW v4, Black Marble, MODIS AOD | `wopr`/WorldPop, `blackmarbler` |
| Oceano: correntes, ondas, temperatura do mar (horário) | Open-Meteo Marine | — |
| Oceano: temperatura em superfície e fundo, salinidade, nível do mar, camada de mistura, pH, O₂, pCO₂, nitrato, fosfato, clorofila, produção primária (−7 a +7 dias) | Copernicus Marine WMTS (modelos globais) | — |
| Relevo e fundo do mar do recorte 3D | AWS Terrain Tiles (Terrarium: SRTM, GEBCO, ETOPO1) | — |
| Catálogo de dados | repositório `estudos` (ProjetosClaude) | `datasets.json`, `datasets_br.json` |
| Ilhas de calor, tendência 2014–2025, vegetação e temperatura de superfície (SP) | GeoServer do UrbVerde (IAU/USP); busca de municípios na API do UrbVerde | — |
| EOO, AOO, critério B, variáveis geográficas | navegador | `IUCNN::iucnn_geography_features()` |
| Relevância One Health | regras por grupo taxonômico (`ONE_HEALTH` no app.js) | — |

## Regenerar as ecorregiões
O conversor (`shp2geojson.js`, Node puro, sem dependências) lê shapefile + DBF, agrupa por ID e simplifica (Douglas-Peucker):
```
node shp2geojson.js wwf_terr_ecos.shp data/teow.json ECO_ID "ECO_ID,ECO_NAME,REALM,BIOME" 0.03
node shp2geojson.js meow_ecos.shp data/meow.json ECO_CODE "ECO_CODE,ECOREGION,PROVINCE,REALM" 0.03
```

## Limites
- Navegador: até 25 mil registros; GBIF entrega 300 por página (~2–9 s cada), padrão de 3.000 nessa fonte. Quando a fonte tem mais,
  o GBIF é amostrado proporcionalmente por década (registros sem ano ficam de fora) e aparece o aviso "amostra parcial".
- Tempo (Open-Meteo): grade de 14×14 pontos da área visível, interpolada; é uma visualização, não substitui o modelo em resolução cheia.
- Oceano: o Copernicus responde um dia por consulta, então o minigráfico do clique usa 8 dias amostrados; as partículas animadas só existem nas camadas de vento, correntes e ondas (não se sobrepõem a outra camada).
- Recorte 3D: relevo com até ~512 px de resolução no lado maior e textura até 2048 px; camadas de servidores sem CORS e as ecorregiões (vetor) não viram textura; nas camadas do oceano a textura só cobre onde o relevo está no nível do mar (a grade dos modelos invade a costa).
- UrbVerde: o próprio site avisa que os servidores estão instáveis; ilha de calor ano a ano, vegetação e temperatura de superfície só cobrem o estado de SP.
- Ecorregiões simplificadas a ~3 km: pontos colados no litoral podem cair fora do polígono; 49 ecorregiões minúsculas (ilhotas) foram descartadas.
- Perfil ambiental: amostra de 60 locais distintos (0,1°) × 90 pontos sorteados, clima ERA5 do último ano completo; a adequabilidade é uma grade de 16 colunas
  e um envelope simples, não um modelo (MaxEnt/biomod2). Na terra a API gratuita da Open-Meteo limita por minuto: o cálculo espera e tenta de novo (1–2 min).
- Valor ao clicar nas camadas em imagem: o app lê o pixel do tile na resolução nativa e procura a cor na paleta oficial do GIBS, então o valor é a faixa da paleta
  (ex.: NDVI 0,67–0,68; população ≥ 1.000 hab./km²), não o dado bruto. Perda de floresta: ano tirado da cor (24 tons, 2001–2024). Solo: API REST do SoilGrids.
  Luzes noturnas: brilho relativo da imagem, sem unidade física. ESA WorldCover (10 m) ficou de fora: o servidor Terrascope não respondeu.
- Interface One Health: amostra de até 400 locais (~1 km) e 200 pontos de fundo; perda de floresta lida com pixel de ~300 m (zoom 9 dos tiles), não 30 m;
  o GPW espalha a população por setor censitário (rural aparece uniforme). A segunda espécie da co-ocorrência vem só do GBIF, até 1.500 registros.
  Mais perto de gente que o acaso pode ser viés de amostragem: as pessoas registram onde estão.
- Comparador: só camadas em imagem (tiles); as de tempo/oceano desenhadas pela grade (wx) não têm cortina.
- Cobertura nos locais de ocorrência: amostra de até 30 locais. Para todos, use o script do Earth Engine.
- A API da plataforma MapBiomas não é documentada oficialmente (constante `MB_SUB` no topo do `app.js`; a chave da legenda é descoberta sozinha, `MB_LEG` é só reserva).
- UCs: imagem de ~1 km/pixel, ~95% de concordância com a consulta exata.
- SALVE/ICMBio e dados abertos do IBAMA (resíduos) bloqueiam acesso automatizado: baixe manualmente para integrar.
