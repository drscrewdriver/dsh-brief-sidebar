# Changelog — dsh-brief-sidebar

[简体中文](CHANGELOG.md) | [Français](CHANGELOG.fr.md) | [Deutsch](CHANGELOG.de.md) | [Italiano](CHANGELOG.it.md) | [Русский](CHANGELOG.ru.md) | [Español](CHANGELOG.es.md) | [Português](CHANGELOG.pt.md)

## 0.9.26 (2026-11-16)

Primeira versão limpa de publicação (o sufixo `-local.N` só existe em instalações locais, nunca no
registry público).

- i18n: acrescentado o locale **Português (pt-BR)** — dicionário de runtime `pt` (101 chaves, o
  conjunto de chaves `zh` é a fonte de verdade), metadados `locale/pt.json` e espelhos de documento
  `README.pt.md` / `CHANGELOG.pt.md`; as linhas de navegação dos espelhos existentes ganharam o link pt.
  `lib/` regenerado.
- **Visibilidade de sessões PTC completada** (antes, as três regiões — artefatos / skills / buscas —
  ficavam vazias numa sessão PTC): os eventos de liquidação `tool/ptc-dispatch` são dobrados nos três
  units de projeção, ao lado do canal nativo `tool/call`+`tool/result`, sem dupla contagem do mesmo
  caminho/skill/consulta. Regressão em máquina real: 9 sessões PTC verdadeiras (1250 subdespachos),
  artefatos **0 → 158** (com 13 do codeplan, a pill de plano voltou a acender), dupla contagem 0.
- Buscas: o despacho PTC traz `meta` (isomorfo ao `tool/result` nativo), então as consultas de
  `web_search`/`advanced_search**e* suas fontes são dobradas; despachos sem `meta` dobram só a
  consulta (0 fontes) e `advance_fetch` não é dobrado. Os textos de degradação ficaram intactos.
- **Re-dobra de checkpoint**: os `stateVersion` dos três units subiram para 1 / 2 / 3 — sem subir a
  versão, o checkpoint antigo de sessões que já rodaram PTC (`ver` batendo) seria aplicado em
  diante e o buraco se congelaria para sempre. Abrir uma sessão velha pela primeira vez custa uma
  releitura completa.
- **Ao recarregar uma sessão histórica, a seção de artefatos mostra as mudanças anteriores por
  padrão** (antes parecia «sem artefatos»): num turno já encerrado o bloco «este turno» é
  necessariamente vazio e o resto estava dobrado. Agora, turno vazio ⇒ a área histórica **abre por
  padrão com as 5 primeiras em pré-visualização**; «Mais N linhas» abre o total e a linha de
  cabeçalho recolhe de novo. Com artefatos no turno, vale a regra antiga (fica dobrado).
- Corrigido um defeito de renderização na pré-visualização: recolhido, o botão de entrada «Mais N linhas» aparecia
  por engano (o critério era «não totalmente expandido», que o estado recolhido também satisfaz).
- O estado do interruptor de dobramento virou um sobrescritor `undefined | boolean`, reavaliado
  quando `latest` muda — um turno que passa de vazio a ocupado não fica preso no estado velho.
- Nova chave `deliverables.historyMore` (9 idiomas).
- Novos `tests/ptc-dispatch-fold.spec.ts` (25 casos: contrato PTC dos três units + guarda de dupla
  contagem + entrada de objeto + asserções de versão) e 4 casos de semântica de recarga em
  `tests/summary-groups.spec.tsx`.

## 0.9.26-local.2 (2026-11-16)

> ⚠️ Esta versão foi enviada por engano ao registry público (o sufixo `-local.N` só deveria existir
> em instalações locais). Foi substituída pela 0.9.26 e retirada dos dist-tags.

- Ao recarregar uma sessão histórica, a seção de artefatos pré-visualiza as mudanças anteriores;
  corrigido o defeito de renderização da pré-visualização; nova chave `deliverables.historyMore` (9 idiomas).

## 0.9.26-local.1 (2026-11-15)

> ⚠️ Esta versão foi enviada por engano ao registry público (o sufixo `-local.N` só deveria existir
> em instalações locais). Foi substituída pela 0.9.26 e retirada dos dist-tags.

- **Visibilidade de sessões PTC completada**: os eventos de liquidação `tool/ptc-dispatch` são
  dobrados nos três units de projeção, ao lado do canal nativo, sem dupla contagem. Regressão em
  máquina real: 9 sessões PTC (1250 subdespachos), artefatos **0 → 158** (13 do codeplan), dupla contagem 0.
- Buscas: despacho PTC com `meta`; consultas e fontes de `web_search`/`advanced_search` dobradas;
  `advance_fetch` não dobrado.
- Skills: completado o canal de chamada da ferramenta `skill` via PTC.
- **Re-dobra de checkpoint**: `stateVersion` dos três units subiu para 1 / 2 / 3.
- Novo `tests/ptc-dispatch-fold.spec.ts` (25 casos).

## 0.9.25-local.7 (2026-11-11)

- **Aba Eco ligada ao modelo de numeração v7** (parceiro spirit 0.8.4-local.11: o registro carrega
  `echo-<uuid>` e o eco carrega `recall-<uuid>`): o texto da linha = o título do registro; a
  sublinha = `echo-xxxx · 11/9 02:46 ×N` (hora do registro + id curto do eco + quantas vezes foi
  lembrado) e o UUID completo só vai no tooltip.
- Clicar na linha abre o cartão de injeção daquela rodada pelo `lastRecallId`; continua lendo os
  quadros v6 (`refs/refId/lastEchoStepId`), então o histórico permanece legível.
- A linha «mais recente» = o registro mais recente + o id curto do eco.

## 0.9.25-local.6 (2026-11-11)

- **A linha «mais recente» passou a seguir as referências**: com `refs`, mostra a referência mais
  recente (`title`, caindo para `memId` sem título) em vez de um trecho cortado do parágrafo; em
  quadros antigos sem refs o critério de parágrafo continua.
- Nova asserção: a linha «mais recente» acerta direto o título `plugin-9lang-five-dim` (guarda contra voltar a cortar parágrafo).

## 0.9.25-local.5 (2026-11-11)

- **Aba Eco virou lista de referências de memória** (parceiro spirit 0.8.4-local.8, onde
  echo-id ≡ memid): passa a ler os `refs[]` da projeção v6 — cada linha é uma memória lembrada, com
  `title` como texto (ex. `plugin-9lang-five-dim`) e `×N` de recall; o `refId`
  (`echo:<kind>:<id>`) fica só no tooltip, nunca no texto da linha.
- Clicar na linha abre o original (pelo `lastEchoStepId` da própria linha); o `sessionId` vem do
  valor da linha, então sessões cruzadas também ficam certas.
- Quadros antigos sem `refs` caem no comportamento de `steps` (sem fingir o formato novo); o
  `tone` não é exibido na barra lateral (pertence à superfície de observação do mar).
- Duas novas asserções: título/×N das linhas refs e ausência de `echo-…`; refs vazios caem em steps.

## 0.9.25-local.4 (2026-11-11)

- **O texto da linha do eco passou a ser conteúdo em primeiro lugar** (relato real: a linha começava
  com o número `echo-…127843` quando o usuário queria ver `plugin-9lang-five-dim`, e precisava
  conseguir ir até a entrada / o mapa estelar): lê o novo campo `steps[].title` (spirit
  0.8.4-local.7 em diante: nome da tarefa do thread > feedback > frase de entrega > …); só quadros
  sem `title` caem no preview. `echo-<ts>` **deixou de ser o nome da entrada**, sobrando no tooltip
  e no visor do original.
- Lê `steps[].refs` (referências memid: task/delivery/experience/memory/goal) — o eco passa a poder
  pendurar-se numa entrada concreta de memória, o que habilita os deep links de entrada / mapa.
- Duas novas asserções: com título, renderiza o nome de conteúdo sem `echo-…`; sem título, volta ao
  preview sem inventar nada.

## 0.9.25-local.3 (2026-11-10)

- **Falso estado vazio quando a linha injetada era expulsa pela janela**: o quadro só carrega os 5
  `steps` mais recentes, então algumas rodadas de «pular» empurravam a linha realmente injetada para
  fora do `lastStep`; como a decisão lia `steps`, a conclusão era «nenhum trecho de eco nesta sessão».
  Agora a `lastStep` volta para a lista (com deduplicação) — medido: a sessão passou de 0 para 2 linhas.
- **O menu popover virou âncora em linha**: posicionar um popover `fixed` pelas coordenadas de
  viewport do botão caía fora da janela (trigger(1613,926) → popover(1692,1730)); agora é `absolute`
  dentro do invólucro da linha, sem medir coordenada. Conferido na máquina real: popover em
  (1474,928) dentro da janela, `elementFromPoint` acerta o item e o salto para o mapa estelar funciona.

## 0.9.25-local.1..2 (2026-11-10)

- **Menu por linha no eco (mesma receita das linhas de memória)**: cada linha ganhou um
  `Ver ▾` à direita, com três itens: **Original** (aba do visor neste plugin) / **Entradas**
  (spirit → folhear → eco) / **Mapa estelar** (o mapa do mar de memórias do spirit); os dois saltos
  seguem pela mesma deep link `dsh-spirit:open-sea` e, se o recibo falhar, o texto de degradação é
  pendurado no `title` do gatilho. Clicar na linha em si continua abrindo o original direto, e os
  dois links de rodapé ficam (o estado vazio precisa deles).
- **Entradas antigas mostram a hora**: sem original, o visor agora diz
  «arquivamento antigo (YYYY/MM/DD HH:mm:ss): nesta época só se guardou o resumo, não o original»
  em vez de uma frase sem data.

## 0.9.23-local.1 (2026-11-10)

- **Entradas do eco ganham id e abrem o original**: cada linha mostra `echo-…<últimos 6>` (id
  completo + hora no `title`) e o clique abre uma nova aba «Visor do original» na barra lateral
  direita, que busca em `echo-detail` do spirit o cartão exatamente como foi injetado (mesma
  sessão; entradas antigas sem original caem no resumo).

## 0.9.22-local.4 (2026-11-10)

- **Dados antigos também são limpos**: resumos históricos não reescritos (começam com
  `<system-reminder>` e trazem o aviso depois) são cortados a partir da primeira linha de seção
  (`状态：`/`线程：`/`想起：`…) antes de renderizar na barra lateral — dado velho não é reescrito por
  versão nova.

## 0.9.22-local.3 (2026-11-10)

- **A lista só mostra o que realmente foi injetado**: linhas injetadas ficam (com resumo, até três);
  as rodadas puladas deixam de ocupar uma linha cada e viram uma frase só
  `outras {count} rodadas sem injeção (portão ×vezes)`; linhas injetadas antigas sem resumo param de
  ocupar espaço.

## 0.9.22-local.2 (2026-11-10)

- **Aba Eco virou lista de entradas**: em vez de listar só «trechos lembrados» (vazia na maioria das
  rodadas, parecia quebrada), passa a listar os ecos da sessão: `{count} entradas de eco nesta
  sessão` + uma linha por `injetado · <resumo do cartão>` / `pulado · <nome do portão>` (a hora no
  `title`), com uma linha extra quando há «lembrado».
- **O mesmo tipo de controle da memória**: novo interruptor `showSpiritEcho` (superfície de
  configuração, ligado por padrão); desligado, a aba inteira some — o mesmo mecanismo dos
  interruptores «recordação da sessão» e «slots residentes».

## 0.9.22-local.1 (2026-11-10)

- **Aba Eco passou a ser os trechos lembrados e persistidos**: lê o quadro novo do `spiritEcho`
  (`{token, total, segments, lastStep}`) — lista os **trechos de eco que o dsh-spirit recordou nesta
  sessão** (gravados desde spirit 0.8.2, reinício não zera); a linha interna dá «{count} trechos
  nesta sessão + o mais recente» e «rodada anterior: injetado/pulado (portão)» sai como linha
  observável, sem se passar por lembrança.
- **Dois saltos**: «Mapa estelar →» vai direto ao mapa do spirit e «Entradas →» a folhear → eco; os
  dois compartilham o mesmo evento cancelável + recibo síncrono, e a falha continua dando texto
  legível. O estado vazio também mantém os saltos (navegar não depende de ter dados).
- Dicionários de nove idiomas sincronizados: `echo.segmentCount` / `echo.lastStep` /
  `echo.gotoGraph`, e o texto do estado vazio foi reescrito (não diz mais «zera no reinício»).

## 0.9.21-local.5 (2026-11-10)

- Quando o deep link falha, o `detail` do recibo do dono (que layouts foram tentados / o que
  lançou) vai para o `title` da linha de falha, e `data-dsh-brief-sidebar="memory-view-fail"` /
  `"spirit-echo-fail"` servem de evidência; recibos de três letras como
  `não foi possível abrir o eco (unregistered)` deixaram de ser um beco sem consulta.
- O menu em linha «Ver detalhes ▾ → Visão rápida» abre o visor antigo da barra lateral (com o
  recordId da linha); o «Detalhes ▾» de nível de documento continua com Entradas / 2D / 3D.

## 0.9.21-local.4 (2026-11-10)

- Aba Resumo: «Referências» ganhou a 4ª aba, **Eco** (lê a projeção `spiritEcho` do `dsh-spirit`:
  contagem da sessão + último portão injetado/pulado), e «Ver →» salta pela deep link
  `dsh-spirit:open-sea` até «Mar de memórias → Folhear → Eco»; sem spirit, a página some, e o
  estado vazio do reinício usa o texto próprio.
- Tanto o «Detalhes ▾» de «Referências → Memória» quanto o «Ver detalhes ▾» em linha abriram um menu
  de tipo: Visão rápida (visor antigo) / Entradas / 2D / 3D; os três últimos abrem a página inteira
  da biblioteca pelo deep link `dsh-prime-memory:open-explorer` (em linha, com recordId) e, se a
  entrada está desativada/não montada, dão texto legível pelo ack. O menu em linha virou camada
  `fixed` e parou de ter a borda cortada pela altura da linha.
- Os nove dicionários ganharam `echo.*` / `memoryView.*`; a asserção de faixa de host em
  `purity.spec` passou a seguir o intervalo `engines.dsh` vigente (a velha asserção de enumeração de
  20 trechos já estava descolada do manifest).

0.9.15: adendo de enumeração de host para DSH 0.2.1-rc.3 ( bump só de declaração; plano de contrato
com diff zero).

## 0.9.14 (2026-10-18)

- hosts: acrescentada ao plano de declaração a enumeração 0.2.1-rc.2 (34/34 peers de host
  `@deepseek-ai/*` conferidos pacote a pacote no npm: rc.2 existe; este plugin não toca o provider
  `ctx.web` nem o slot `conversation.input.model.label`, zero mudança de código, lançamento puramente
  de metadados; a célula rc.2 na fazenda fica de prontidão).

## 0.9.13 — 2026-10-17 (critério de carga: adicionado 0.2.1-rc.1)

- Só trabalho de manifest: `0.2.1-rc.1` acrescentado ao fim de `engines.dsh` e de todos os peers
  `@deepseek-ai/dsh*` (16 entradas exatas, sem intervalo/caret), distribuído pelo sync-hosts a partir
  de hosts.mjs; zero mudança de código.
- `@deepseek-ai/dsh-client-locale` passou para `hostPeerPackages` — sua cadeia de enumeração era
  alinhada à mão, fora dos pontos de escrita do sync, uma armadilha latente de deriva para a
  disciplina «mesma cadeia nas duas listas».

## 0.9.12 — 2026-10-15 (um memoryId vazio depois do reinício deixou de parecer erro)

- Corrigido o `⚠️ [object Object]`: no reinício o better-sidebar restaura primeiro as abas
  persistidas, então `tab.path` está vazio, mas o código velho ainda mandava `{ids:['']}` e o
  servidor recusava («ids vazio depois do filtro»). O invólucro de erro do RPC do host é um
  **objeto** `error:{code,message}`; interpolado como texto virava `[object Object]`. Agora um id
  vazio cai direto no aviso «nenhuma memória escolhida para ver neste ciclo de inicialização», **sem
  requisição**.
- Mensagens de falha legíveis: primeiro `error.message`, depois `HTTP <status>` para não-2xx e só
  então «memória não encontrada». A única fonte de dados do visor ganhou prova de contrato de
  servidor (prime-memory `tests/records-meta.test.ts`).

## 0.9.11 — 2026-10-15 (visor de detalhe de memória agregado neste plugin)

- **Entrada do salto conectada**: um botão à direita da barra de avaliação e em cada linha `ref` dos
  espaços abre a aba `dsh-md-memory-viewer:memory` via `betterSidebar.openTab`. **Canal de aba, sem
  sistema de arquivos**: o enfoque anterior de fileViewer (uma rota `<id>.memory` fingida) era
  resolvida pelo EditorHost do host como arquivo físico e dava sempre ENOENT.
- **O componente do visor mora aqui agora** (`src/client/memory-viewer/viewer.tsx`); o plugin
  independente `dsh-md-memory-viewer` se aposenta. O tipo de aba é registrado em `apply()`
  (`hidden: true`, fora do menu +), assim as abas restauradas depois do reinício continuam com dono.
- **Referência ao service pelo módulo `memory-tab.ts`**: em componentes profundos
  `ctx.get('betterSidebar')` é recusado em silêncio pelo proxy estrito (clique sem efeito nem erro);
  a referência é capturada uma vez no `apply()`.
- **Estado vazio**: sem `memoryId` (aba restaurada antes do registro) o painel mostra «nenhuma
  memória escolhida para ver neste ciclo de inicialização» em vez de um buraco.
- **Markdown no corpo da memória**: o tooltip e o visor compartilham um `renderMd` leve (zero
  dependência externa: hierarquia de títulos / negrito / código em linha / listas); todos os dados
  vêm da API `dsh-memory/records-meta`, nada é lido do disco.
- **Hierarquia de exibição corrigida**: o título vem do `name` da memória e é mostrado em
  13px/600/cor primária; a linha de cenário desceu para 10px como informação subordinada — antes os
  dois tinham corpo quase igual e um cabeçalho do corpo (`## 结论`/`## 事实`) era exibido como se
  fosse o nome da memória.

## 0.9.10 — 2026-10-14 (capacidade de busca elevada pelo que foi medido, e sessões velhas reexibidas)

- Tetos do fold de busca redefinidos: fontes 20→**64**, consultas 20→**48**, balde de URLs do turno
  20→**64** (resumo em 160 caracteres e 5 consultas por fonte não mudam).
- A base é medida, não chutada: em 348 sessões locais (70 com busca), consultas distintas por sessão
  p50=7/p90=29/p95=38/p99=67 e fontes distintas p50=16/p90=54/p95=63/p99=164, fontes por turno
  p50=16/p90=41/p95=51/máx=65. O teto antigo (20) parava no p55 — **até a sessão mediana era
  truncada**, e era dali que saía o «retornou 0 linhas».
- `stateVersion` subiu para 2: **mesmo sem mudança de forma é preciso subir**. O checkpoint gravado
  com o teto antigo já perdeu as fontes; só linhas descartadas são refeitas pelo fluxo de eventos.
  Sem subir, só sessões novas seriam consertadas — e quem está reportando 0 são justamente as velhas.
- Novo guarda de orçamento permanente: no pior preenchimento o quadro inteiro cabe em 62.047 bytes
  (dentro dos 96KB) e o teste afirma que os tetos realmente agem; uma sessão típica dá ~15KB.
- Os tetos por enquanto não entram na página de configurações: moram na metade host e virar item de
  configuração exige mexer no schema Config do host, no `.volatile()` e nos formulários das seis
  linhas, além de valer só para frente (aumentar não recupera fontes já truncadas, a menos que se
  suba a versão de novo e se refaça a releitura).

## 0.9.9 — 2026-10-14 (clusters de busca todos dobrados por padrão)

- Os clusters de consulta da aba **Buscas** agora **dobram por padrão, incluindo os do turno atual**:
  ao entrar na aba se vê uma linha por consulta com a contagem que ela realmente carrega, sem
  derramar de cara uma dezena de balões de resultado.
- A versão anterior tratava «os clusters do turno ficam abertos» e, medido em sessão real, isso
  enterrava justamente a lista de perguntas que o leitor quer percorrer.
- Abre-se o que se clica; o estado de expansão é lembrado no componente pela chave do texto da
  consulta, então um quadro novo da projeção não fecha o grupo que você acabou de abrir.
- Removido o campo `SearchCluster.latest`, que deixou de ser consumido — campo sem consumidor é
  fonte de corrosão.
- Os casos de teste agora prendem três coisas: dobra tudo por padrão, o clique abre só a linha
  clicada, novo clique recolhe; o teste de sanitização de links passou a **abrir antes de afirmar**
  (não dá para confundir «não renderizou» com «não tem link»).

## 0.9.8 — 2026-10-14 (corrigido o «abrir não mostra nada» do agrupamento: mudou a forma do estado, a versão tem de mudar junto)

- Corrigido o defeito de campo do 0.9.7: com os resultados agrupados por consulta, **o título do
  grupo tinha número e abrir dava vazio**.
- Causa raiz: o state da projeção mudou de um `query` único para o conjunto `queries[]`, mas
  `stateVersion` ficou em 0. O `restore` do host só descarta o checkpoint e refaz do fluxo de
  eventos quando a versão não bate (`session-projection/src/index.ts:88-92`, `:122-126`); o estado
  velho foi enfiado no schema novo, `queries` virou vazio por padrão e **todas as fontes caíram no
  grupo do fim**, deixando cada cluster de consulta sem membros.
- `stateVersion` subiu para 1: checkpoints antigos são invalidados e refeitos, e a pertença é
  redobrada a partir do fluxo de eventos.
- O título do grupo agora só informa **quantas linhas o cluster realmente tem** (não mais o `hits`
  da chamada): título e conteúdo não podem mais divergir.
- Cluster vazio renderiza como **linha simples, sem clique**: nada de seta que abre o nada. Fontes
  não reivindicadas continuam no grupo do fim «Fontes · N» e não são silenciosamente descartadas.
- Novo caso de guarda do lado do registro: prende `stateVersion`=1 e demonstra ao mesmo tempo que
  uma linha da forma antiga é mesmo esvaziada pelo schema novo — as duas coisas precisam valer juntas,
  senão é a condição de reprodução deste bug.

## 0.9.7 — 2026-10-14 (resultados de busca agrupados e dobrados por consulta)

- A aba **Buscas** passou a **agrupar por consulta**: cada consulta ocupa uma linha de título
  dobrável (`Consultas · {count}` com «retornou N») e abrir mostra os balões de resultado que ela
  trouxe; acabou a coluna plana de balões.
- Por padrão abre só o cluster **do turno atual**; os anteriores viram uma linha. O estado de
  expansão fica no estado do componente pela chave do texto, então um quadro novo da projeção não
  fecha o grupo que o leitor acabou de abrir.
- As fontes agora lembram de **todas** as consultas que as trouxeram (`queries[]`, teto 5, união
  entre chamadas): uma chamada que mescla consultas não fica mais pendurada só na última; a mesma
  fonte aparece em todos os clusters a que pertence — isso é fato, não renderização duplicada.
- Fontes sem consulta listada que as reivindique (consulta estourou o teto, ou quadro anterior à
  atualização) vão para o grupo do fim «Fontes · N», sem descarte silencioso.
- Compatibilidade com quadros antigos: os schemas de state e view dão valor padrão a `queries` e um
  quadro antigo com o `query` único é lido como `[query]`.
- Retirada a etiqueta de nome de ferramenta introduzida no 0.9.5 (o dado continua no quadro, só não
  vai para a tela).

## 0.9.6 — 2026-10-14 (aba de buscas virou fluxo de balões de resultado)

- A aba **Buscas** não lista mais títulos de consulta nem etiqueta `advanced_search`/`web_search`,
  e os dois títulos de grupo «Consultas · N» / «Fontes · N» saem: cada fonte é um **balão
  alinhado à esquerda**, lido como no fluxo de conversa da coluna da esquerda.
- Dentro do balão, na ordem: título (link clicável), site, resumo; a marca «este turno» desceu para o
  rodapé do balão e rola junto com a fonte, sem se separar do conteúdo.
- Fonte encontrada mais de uma vez ganha `×N` dentro do balão (sem chave nova de idioma; a contagem
  fala sozinha).
- A camada de dobramento não muda: a consulta e o nome da ferramenta continuam escritos no quadro
  `dshSummarySearchRefs`, apenas não vão mais para a tela — outra superfície pode consumi-los.
- Continuam a nota de degradação sem fontes e o rodapé de truncamento; a disciplina de links é a
  mesma (só http/https viram âncora, com `rel="noreferrer noopener"`).

## 0.9.5 — 2026-10-14 (aba de buscas também cobre o web_search do host)

- As referências de busca agora dobram o `web_search` do host além do `advanced_search`: o modelo
  vai por padrão na ferramenta do host e rastrejar só a ferramenta-plugin deixava vazia justamente a
  sessão «mas eu pedi para procurar».
- As duas formas de argumento são aceitas: o `query` (string única) do `advanced_search` e as
  `queries` (vetor) do `web_search`, abrindo uma linha por consulta quando uma chamada mescla
  várias (a contagem de fontes é o total da chamada inteira, sem repartir à força por consulta).
- Cada linha de consulta informa a ferramenta que a respondeu (sem traduzir: é um identificador de
  linha que se pode grep na transcrição).
- Reexibição de 250 sessões reais: as sessões com linha de consulta subiram de 20 para 52, dobrando
  472 linhas de consulta do host e 777 linhas de fonte.
- A dica de estado vazio nomeia as duas ferramentas (9 idiomas); se faltar `tool` no quadro (metade
  host desatualizada), ele é lido como `advanced_search` e a linha não some.

## 0.9.4 — 2026-10-14 (aba «Buscas» na seção de referências)

- Nova projeção `dshSummarySearchRefs`: dobra só o `advanced_search`, não o `web_search` do host —
  para o leitor são fatos diferentes (um é o plugin que você instalou, configurável, com suas chaves;
  o outro é o cano do host). A consulta vem de `tool/call.arguments.query` e as fontes de
  `tool/result.meta.sources[]`; resultado não liquidado ou com isError não conta como referência.
- A seção «Referências» ganhou a terceira aba «Buscas», com contagem nos dois grupos: «Consultas · N»
  (com quantas fontes cada uma retornou) e «Fontes · N» (título / host / resumo, as do turno
  marcadas). A URL da fonte é dado não confiável devolvido pelo provider através do modelo, então só
  http/https vira link (com `rel="noreferrer noopener"`) e qualquer outro protocolo degrada para texto.
- Caminho de degradação: um dsh-free-search antigo que não publique `presentationMeta` registra as
  consultas com 0 fontes e mostra a nota «as fontes aparecem depois de atualizar», em vez de deixar
  uma lista vazia que parece «procurei e não achei». Reexibição de 250 sessões reais: 20 chamadas
  dobraram 20 consultas e 0 fontes — exatamente a trilha de degradação, provada.
- Com limites: 20 linhas em cada um dos três (fontes / consultas / turno), resumo cortado em 160
  caracteres; quando o número real estoura, o rodapé informa o total da sessão.
- Quando as capacidades das abas mudam, a aba ativa recai na primeira disponível e as setas de direção
  só circulam entre as abas disponíveis. Dez chaves novas nos 9 idiomas.

## 0.9.3 — 2026-10-13 (skills e memória lado a lado em «Referências»)

- As três seções do rodapé do quadro (referências de skills / recordação da sessão / slots de
  memória) viraram **uma** seção «Referências» com duas abas, «Skills» e «Memória»: clicáveis, e as
  setas esquerda/direita também trocam quando a barra de abas está focada. Numa barra lateral estreita
  o progresso e os artefatos deixam de ser empurrados para fora da tela.
- A aba não selecionada continua viva (`display:none`, não desmontagem): a linha selecionada da
  memória, o pending da avaliação e a expansão do histórico continuam onde estavam depois de trocar de aba.
- As duas abas se condicionam separadamente: com capacidade de um lado só, não fica aba «clique e
  apare vazio»; se sobra só Memória, a aba padrão recai nela. Com capacidade nenhuma dos dois lados
  (projeção ausente / interruptores todos desligados), a seção inteira some.
- Na aba Skills cai o título de seção que duplicava a aba (`SkillUsageSection` ganhou `hideHeader`;
  o modo avulso continua por padrão). Na aba Memória ficam os títulos próprios de recordação e slots —
  são fatos diferentes e juntá-los borraria os dois.
- Três chaves novas nos 9 idiomas: `section.references`, `references.tabSkills`, `references.tabMemory`.

## 0.9.2 — 2026-10-13 (segundo canal para as referências de skills + catálogo disponível)

- «Referências de skills» parou de reconhecer só a chamada da ferramenta `skill`: a
  `user/message.source.kind === 'skill-invocation'` marcada pelo próprio host (o usuário clicou numa
  skill, o corpo entra injetado como `<skill_content>` e o host ainda pede ao modelo que não chame a
  ferramenta) entrou na mesma contagem. Medido em 250 sessões reais: 10 eram «só invocation, sem
  chamada de ferramenta» e até aqui não mostravam nada.
- Novo grupo «Disponíveis nesta sessão»: vem dos `entries[].name` do quadro `skill-catalog` e dobra
  por padrão, informando só a contagem. Cada quadro é tratado como **substituição da tabela inteira**
  (comentário do host: a etiqueta `update` significa reenvio substitutivo, não primeiro quadro), sem
  união — assim skill não fica só aumentando. Nomes já referenciados saem do grupo de disponíveis: uma
  skill não ocupa duas linhas.
- A dica de estado vazio agora explica os dois caminhos («carregada pela ferramenta» e «invocada
  direto»); três chaves de grupo novas nos 9 idiomas.
- O state da projeção ganhou `catalog`/`catalogCount` e `stateVersion` foi de 0 para 1 (o schema tem
  valores padrão, então um state antigo continua reexibível).

## 0.9.1 — 2026-10-13 (exibição em grupos)

- A seção de artefatos foi dividida em dois grupos com contagem cada: «Este turno · N» direto e
  «Alterações anteriores · N» dobrado atrás do interruptor. Quando a lista tem teto, uma nota à parte
  informa o número real da sessão («a sessão produziu {total} arquivos, a lista está truncada») — os
  dois números deixaram de ser misturados.
- A seção de recordação da sessão também foi dividida: «Recordações ativas · N» (o texto ainda está no
  contexto) direto; «Demais recordações históricas · N» (substituídas pelo resumo) dobradas atrás do
  interruptor, e ao abrir cada uma carrega a marca «substituída por resumo». Antes, as substituídas
  viravam só um número e o leitor não via o conteúdo.
- Extraídos os componentes compartilhados `FoldToggle`/`GroupHeader`, com as duas seções usando o
  mesmo visual de dobramento; cinco chaves de grupo novas nos 9 idiomas.

## 0.9.0 — 2026-10-13 (primeira publicação no npm; funde todo o conteúdo de instalação do 0.9.0-local.0…8)

Esta seção é a estreia do 0.9.0 no npm, com o conteúdo inteiro da série local: a subseção de
referências de skills (item 0.9.0-local.8 abaixo), o dobramento por substituição do resumo e o
contrato de contagem da recordação, e a sincronização das duas listas de versão (o
`dsh.plugin.json` tinha parado em `local.4`). Ela traz junto a seção «recordação desta sessão» e
os consertos de exibição antes publicados só localmente (ver as seções abaixo).

### Adicionado

- **Seção de referências de skills**: subseção somente leitura na aba Resumo, listando as skills que
  esta sessão **carregou com sucesso** pela ferramenta `skill` do host (nome · carregamentos ·
  etiqueta «este turno»). A fonte é a projeção `dshSummarySkillUsage` (registrada pela metade host
  deste plugin, dobramento síncrono puro de `turn/start` / `tool/call` / `tool/result`). O nome vem
  de `tool/call.arguments`: a ferramenta `skill` **não declara `presentationMeta` em nenhuma das
  seis linhas** (verificado tag a tag no git), logo `tool/result.meta` não existe para skills; o texto
  do resultado é deliberadamente lido fora (apresentação não é segunda fonte de verdade). Chamadas
  que falharam não contam (mesmo critério da seção de artefatos). Seis chaves novas × 9 idiomas. Sem
  a projeção, a seção inteira se esconde — sem interruptor (ela só declara o que aconteceu).

### Corrigido

- **Sincronismo das duas listas de versão**: o `dsh.plugin.json` estava em `0.9.0-local.4` enquanto
  o `package.json` já tinha chegado a `local.7` (o guarda V1 do pacote reclama); agora os dois planos
  estão em `0.9.0-local.8`.

> Nota honesta: o lote `0.6.0`→`0.9.0-local.7` (seção de recordação da sessão, semântica de
> substituição pelo resumo, camadas dos entregáveis etc.) **não foi escrito aqui versão por versão**;
> só chegou a esta seção. Preencher aquele trecho é um trabalho de redação à parte.

## 0.9.0-local.0 – local.7 — 2026-10-12 → 10-13 (ponteiro de instalação, nunca foi ao registry)

### Adicionado

- Superfície de exibição da seção de recordação: título da entrada com clamp de duas linhas, tooltip
  com o texto inteiro e as linhas aposentadas (retired) riscadas mas continuando na lista.
- Contrato de dobramento e contagem preso por testes, inclusive o ramo «todas as linhas foram
  substituídas ⇒ informa pela contagem» (que também carrega a marca recall-superseded-note).

### Alterado

- A compactação parou de esvaziar a lista de recordação: as linhas substituídas por resumo
  (superseded) dobram por padrão e o rodapé informa quantas ficaram ocultas; as aposentadas continuam
  listradas — aquela lista é o veredicto humano sobre a memória. Textos dos 9 idiomas acompanharam a
  mudança de critério.

### Corrigido

- O tooltip passou a abrir para a esquerda da linha e parou de cobrir a barra de avaliação da mesma seção.
- Os cliques dentro da barra de avaliação pararam de borbulhar — a segunda confirmação de
  «declarar obsoleta» nunca tinha chegado a valer.
- O título da linha parou de usar o `title` nativo: ele desenhava uma caixa preta fora do contrato
  de pele e repetia o conteúdo do tooltip.

## 0.8.0 — 2026-10-12

### Adicionado

- Seção «Recordação desta sessão»: consome a projeção `memoryRecall` do dsh-prime-memory e responde
  «que memórias esta sessão injetou de fato», com avaliação de relevância (0–5) e «declarar obsoleta»
  (-1, recuperável).

### Alterado

- A seção de slots de memória passou desligada por padrão: um cartão permanente de slots residentes
  ensina o usuário a ler memória como coisa residente, o contrário da recordação por relevância. O
  interruptor ficou; quem quiser a lista abre.

## 0.6.0 — 2026-10-09

### Alterado

- Versão única de escopo largo: em vez de fatiar por linha de host, `engines.dsh` e os peers passaram
  a enumerar de uma vez as 15 linhas rc (a enumeração é gerada pelo sync-hosts).

## 0.5.0 — 2026-10-04 (promoção)

> Recursos beta.1~3 todos congelados, apontando para `latest` e `dsh-0.2.0`. Conteúdo abaixo.

## 0.5.0-beta.3 — 2026-10-03

### Adicionado

- **Camadas na seção de artefatos**: os arquivos ativos (o turno mais recente) continuam em lista
  direta; as «alterações anteriores da sessão» dobram numa linha de interruptor (a contagem = linhas
  deduplicadas por caminho normalizado contra os arquivos ativos) e, abertas, são as mesmas linhas
  clicáveis da área ativa (clique vai para a pré-visualização da barra lateral). Nova chave de nove
  idiomas `deliverables.history`; `deliverables.sessionTotal` se aposenta (`sessionTotal` continua
  campo do fio, só deixa de ser renderizado à parte).

## 0.5.0-beta.2 — 2026-10-03

### Adicionado

- **Resolução das referências dos slots de memória (com a correção do dsh-prime-memory 0.20.1)**: a
  view do fio ganhou `refViews` (record_id → `[tipo] resumo do nome`, resolvido pelo prime-memory via
  L1 `getByIds` quando o quadro da projeção é montado). A seção de memória prefere o resumo de nome
  resolvido (as refs brutas vão no tooltip) e recai nas refs brutas se o host não resolveu. O
  estreitamento continua «só aceita o que existe, descarta entrada malformada».

## 0.5.0-beta.1 — 2026-10-03 (branch `feat/0.2.0-memory-slots`, dist-tag npm `beta`)

> Pré-lançamento: `dsh plugin --profile web add dsh-brief-sidebar@beta`. `latest` e `dsh-0.2.0` não
> se mexem (ainda em 0.4.0); estabilizado, sai o 0.5.0 formal.

### Adicionado

- **Terceira seção da aba Resumo: slots de memória (somente leitura)**. Assina a projeção
  `memorySlots` registrada pelo `dsh-prime-memory` (view do fio `{rev, count, openCount, slots[]}`) e
  renderiza título / pill de kind / estado / prioridade dos slots ativos, com a contagem dos abertos no
  rodapé. Só renderiza se os dois portões estiverem satisfeitos, senão a seção inteira se esconde:
  ① o interruptor ligado (ver abaixo); ② a projeção existir (sem prime-memory na composição, `faceOf`
  é sempre `undefined`). Há compatibilidade futura com `body`/`refs` que o prime-memory venha a somar
  na view do fio (estreitamento: mostra só o que existe e é válido, corpo truncado e texto integral no
  tooltip).
- **Interruptor de memória `showMemorySlots`**, nos dois cartões pelo padrão duplo do
  dsh-thinking-levels, o mesmo componente e a mesma fábrica de inject (uma só verdade):
  - **seção de configuração da família de plugins** («起子插件设置»): cartão contribuído ao sub-slot
    `dsh-family.tab` (id `brief-sidebar`, order 30);
  - **cartão de configuração da página de gerenciamento de plugins**: slot `plugins.bundle.config`
    com chave (a chave = o nome do pacote `dsh-brief-sidebar`).
  - Schema `Config` no servidor (`z.boolean().default(true).volatile()`; schemastery entra em
    `dependencies` e o tsdown o mantém externo, sem empacotar); o cliente lê e escreve por
    `configForms.get('dsh-brief-sidebar')`, com envio imediato e efeito na próxima renderização da aba
    aberta. `configForms` é resolvido por inject tardio (o serviço pode nascer depois do apply); sem o
    serviço no host, o cartão não se registra e o interruptor recai no padrão «ligado».
- i18n: 14 chaves novas — `section.memorySlots` / `slots.*` / `settings.*` — sincronizadas nos nove
  idiomas (zh/en/ja/ko/fr/de/it/ru/es).

### Alterado

- O espaço de recordação de memória reservado no `SummaryTab` (um `null` parado) virou
  `MemorySlotsSection` (fixo no fim: progresso → artefatos → memória).
- `pnpm-workspace.yaml` ganhou `packages: ['.']` (pnpm 10+ recusa `add`/`install` num arquivo de
  workspace sem esse campo).

## 0.4.0 — 2026-09-29

### Alterado

- **Troca de linha de host para DSH 0.2.0** (`main`, promovida de `compat/0.2.0`): `engines.dsh` e o
  peer `@deepseek-ai/dsh-client-locale` saem de `>=0.1.5-rc.1 <0.2.0-0` para
  `>=0.2.0-rc.1 <0.2.1-0` (fixação na janela rc; reavaliação a partir do 0.2.1). Adaptação puramente
  de metadados — a superfície consumida são todas callers puras de `ctx.get(...)` (`slots` /
  `locale` / `betterSidebar` / `sidebarRight` / `sessions`, com definições locais de interface), o
  0.2.0-rc.1 é totalmente compatível com a API de plugins do 0.1.7 e não houve mudança de código. As
  linhas 0.1.x (0.1.5/0.1.7) continuam servidas pelas branches congeladas `compat/0.1.7` /
  `compat/0.1.5` (≤0.3.1).
- Árvore de dependências atualizada pela linha nova (pnpm 12) e lockfile regenerado;
  `pnpm-workspace.yaml` ganhou `minimumReleaseAgeExclude` (para uma máquina recém-instalada conseguir
  resolver o 0.2.0-rc.1).
- A asserção de faixa de host em `tests/purity.spec.ts` acompanhou a linha 0.2.0.
- **Instalação (esta linha)**: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0`. Mapa dos
  dist-tags do npm: `dsh-0.2.0` → esta linha (`main`); `dsh-0.1.7` / `dsh-0.1.5` → as linhas 0.1.x
  (publicadas a partir das branches `compat/0.1.7` / `compat/0.1.5`).

### Documentação

- README ganhou resumos de instalação e compatibilidade em alemão, francês, russo, espanhol e italiano.
