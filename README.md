# WeBrain — Cérebro We

Atualização do Codex em 22/09: Projetos, Cronograma e Painel de controle usam
`assets/js/codex-projects.js`, `assets/js/codex-projects-views.js` e
`assets/css/codex-projects.css`. O catálogo abre a ficha completa; prazos são
compartilhados com as demandas; encerramento preserva o histórico; reports são
cadastrados manualmente. Filtros incluem empresa, situação, sprint e período.
Detalhes e limites da verificação: `../ENTREGA_CODEX_2026-09-22.md`.
Suíte final desta entrega: **170 testes aprovados**, incluindo
`tests/codex-projects.test.cjs`. A revisão visual desta entrega está pendente
por indisponibilidade do navegador na ferramenta de UI.

Portal interno do Grupo We. Protótipo navegável construído a partir das 15
fotografias em `../Imagens Construção`.

## Como abrir

A tela de login está em `login.html`: formulário central com e-mail e senha,
recuperação de senha e solicitação de acesso. A seleção de empresa e perfil foi
removida; essas informações deverão vir da conta quando a autenticação for
conectada. É uma prévia de frontend: valida campos localmente, não envia nem
armazena credenciais e não autentica. O link de demonstração abre o portal.
O roteiro `tests/login-browser.html?test` verifica os controles em desktop e celular.
Duplo clique em `index.html`. Não precisa de servidor, instalação nem internet —
sem rede, o navegador usa as fontes do sistema no lugar da Montserrat.

## Dados

**Tudo em `assets/js/data.js` é conteúdo de demonstração.** Nomes, valores, metas
e documentos são inventados para exercitar as telas. A interface deixa isso
visível no selo *Dados de demonstração*, controlado por `WB.data.demonstracao`.
Ao ligar as fontes reais, troque esse arquivo e coloque a flag em `false`.

## Estrutura

```
index.html                    casca e ordem de carregamento
assets/css/app.css            tokens, casca e componentes
assets/css/codex-home.css     estilos da tela inicial (Codex)
assets/css/codex-workspace.css estilos de demandas/projetos/pedidos (Codex)
assets/js/data.js             dados e contratos
assets/js/ui.js               DOM, formatação, popup, toast, storage
assets/js/charts.js           gráficos SVG e paleta de série validada
assets/js/forms.js            solicitações e cadastros
assets/js/views.js            telas
assets/js/codex-home.js       módulo WB.home (Codex)
assets/js/codex-workspace.js  módulo WB.workspace (Codex)
assets/js/fase2-data.js       WeInvest e Nós: modelo, opções e persistência
assets/js/fase2-forms.js      cadastros da Fase 2 em popup
assets/js/fase2-views.js      telas, navegação e rotas da Fase 2
assets/css/fase2.css          acréscimos de estilo da Fase 2
assets/js/adm-data.js         administrativo: contratos, bens, CNPJs e afins
assets/js/adm-forms.js        cadastros do administrativo
assets/js/adm-views.js        as telas do administrativo em formato de planilha
assets/css/adm.css            estilo das planilhas do administrativo
assets/js/comercial-data.js   lead, funil do CRM, conversão em cliente
assets/js/comercial-forms.js  cadastro de lead, de cliente e a conversão
assets/js/comercial-views.js  o quadro do funil, #/leads e #/clientes
assets/css/comercial.css      estilo do funil e da galeria do News
assets/js/operacoes.js        base fixa da lateral e árvore de cada operação
assets/js/app.js              navegação, rotas e mapa de ações
inicio-preview.html           preview isolado da home (Codex)
workspace-preview.html        preview isolado do workspace (Codex)
tests/*.test.cjs              testes de lógica em node --test
tests/verificacao.html        roteiro de verificação no navegador
```

A divisão de responsabilidade entre os dois agentes, os contratos de dados e as
decisões de design estão em `../ALINHAMENTO_CLAUDE_CODEX.md`.

## Rotas

`#/home` · `#/demandas` · `#/projetos` · `#/projeto/:id/:aba` ·
`#/projetos-arquivados` · `#/cronograma` · `#/painel-controle/:aba` ·
`#/indicadores` · `#/solicitacoes` · `#/dash/grupo` · `#/dash/incorporadora/:aba` ·
`#/dash/clientes` · `#/dash/performance` · `#/governanca/:secao` · `#/atas/:tipo` ·
`#/clientes/:empresa` · `#/id-visual` · `#/galeria` · `#/links` · `#/crm` · `#/agentes` ·
`#/corretores` · `#/erp` · `#/leads` · `#/contratos` · `#/colaboradores` · `#/fornecedores` ·
`#/patrocinadores` · `#/bens` · `#/cnpjs` · `#/painel-adm` · `#/perfil` ·
`#/busca/:termo`

As rotas `#/home`, `#/demandas`, `#/projetos` e `#/solicitacoes` são
renderizadas pelos módulos do Codex (`WB.home` e `WB.workspace`). Sem esses
arquivos carregados, as telas equivalentes de `views.js` assumem no lugar.

A agenda não tem tela própria: ela vive no Início, e `#/agenda` redireciona
para `#/home` — endereços antigos continuam funcionando.

`#/solicitacoes/:tipo` redireciona para `#/solicitacoes`, porque o módulo tem o
filtro de tipo dentro da própria tela.

`#/atas/:tipo` (`todas`, `equipe`, `diretoria`, `1a1`) e `#/clientes/:empresa`
(`grupo` ou o id da operação) são os subníveis do esboço, resolvidos como abas
dentro da tela. Valor desconhecido cai na primeira aba.

### Rotas da Fase 2

WeInvest: `#/wi/dash/:aba` (`geral`, `clientes`, `performance`) · `#/wi/crm` ·
`#/wi/leads` · `#/wi/clientes` · `#/wi/cliente/:id` · `#/wi/ativos` ·
`#/wi/ativo/:id` · `#/wi/parceiros` · `#/wi/parceiro/:id` · `#/wi/negocios` ·
`#/wi/negocio/:id` · `#/wi/explorar/:tema` (`terrenos`, `comparacao`,
`conexoes`, `agentes`, `atencao`).

Nós Gastronomia: `#/nos/dash/:aba` (`geral`, `clientes`, `equipe`, `ranking`,
`cmv`) · `#/nos/menu/:filtro` · `#/nos/item/:id` ·
`#/nos/atendimentos/:tipo` (`reclamacoes`, `elogios`, `todos`) ·
`#/nos/atendimento/:id` · `#/nos/estoque`.

`#/governanca/:secao/:empresa` é novo: com o terceiro segmento a tela mostra os
registros da operação mais os do Grupo We e diz o tamanho do recorte; sem ele,
continua igual à Fase 1. Id de registro inexistente devolve uma tela de "não
encontrado" com o caminho de volta, nunca um erro.

## Início

O Início é o módulo `WB.home` do Codex, e só ele — o complemento que `app.js`
montava embaixo saiu em 21/09/2026. A tela é do que se faz agora:

- **Saudação e data.** "Olá, fulana" e o dia. Sem eyebrow, sem subtítulo.
- **Função e sprint**, numa faixa de destaque com fundo próprio.
- **Principais políticas da We**, em galeria de botões com ícone, setor e
  versão. O botão não mostra o documento: leva a `#/governanca/politicas`.
- **Pedidos e cadastros**, no mesmo bloco e com ícone: solicitar evento,
  compra ou pagamento e coffee, mais cadastrar lead e cadastrar cliente. Lead e
  cliente vinham de um botão discreto no cabeçalho; agora têm o mesmo peso dos
  pedidos, porque são a mesma decisão para quem usa o portal.
- **News We** (o antigo mural de avisos), em galeria com capa. A capa vem do
  campo `capa` do comunicado; sem imagem, o módulo desenha uma a partir do id,
  sempre a mesma cor para o mesmo aviso. Clicar abre o texto inteiro.
- **Agenda**, em grade de horas como num calendário: *Hoje* numa coluna e
  *Semana* com os sete dias lado a lado, na horizontal. Compromisso sem horário
  aparece numa faixa à parte, em vez de ser encaixado num horário inventado.

Um aviso é marcado como **Novo** nas primeiras 24 horas. A regra é
`WB.avisoNovo(aviso, agora)`: com `publicadoEm` conta 24 horas exatas; com
apenas `data` cai para "publicado hoje" e devolve qual critério usou.

`WB.views.home`, em `views.js`, é a tela de reserva: ela só aparece se
`codex-home.js` não carregar, e segue o mesmo recorte para o portal não contar
duas histórias diferentes de "início".

## Demandas e indicadores

`#/demandas` é o módulo `WB.workspace`. O título é só *Demandas* — a tela já é a
das minhas, então o filtro "Minhas demandas" não existe mais; o recorte nasce
ligado. Estão aqui os números da pessoa, as visões de **Tabela**, **Kanban** e
**Calendário** (por prazo, dentro do mês; demanda sem prazo não entra e a tela
diz quantas ficaram de fora) e uma caixa única com busca, filtros, agrupamento e
ordem.

O formato escolhido fica guardado — visão, agrupamento, ordem, colunas e período
voltam como foram deixados, inclusive depois do F5. Na tabela dá para **escolher
as colunas** (o nome da demanda não sai: sem ele a linha não identifica nada; a
coluna *Início* nasce desligada). No calendário cada demanda leva a **cor da
situação**, com a situação por extenso no `title` — cor sozinha não comunica.

A **seleção** é uma caixinha sem rótulo ao lado do nome, e existe nos três
formatos: tabela, kanban e calendário. Marcar uma ou mais abre a barra de
alteração em lote.

### A ficha da demanda

Clicar em qualquer demanda abre a ficha, que começa pelo caminho: **projeto ›
entregável**, os dois em destaque e o entregável clicável, porque a primeira
pergunta de quem abre é de onde aquilo veio. Depois vêm responsável, situação,
prioridade, **período** (início → prazo), tipo e quem abriu a demanda; a
descrição; os subitens; as **referências**; e a **conversa da demanda** — o chat
interno, onde comentar não fecha o painel e a mensagem fica gravada no registro.

Quem pode mexer tem **Editar** (o formulário inteiro: nome, responsável,
situação, tipo, prioridade, início, prazo e descrição) e **Apagar**. Quem não
pode lê o motivo, vindo de `WB.podeEditarDemanda`. Apagar diz **antes** quem vai
ser avisado, e os subitens não somem junto — perdem o vínculo.

Comentar não é editar: quem não pode mexer no prazo pode falar na demanda.

### Situações

Seis, definidas em `WB.STATUS_DEMANDA` (`data.js`) e usadas por todas as telas:

| id | na tela | o que quer dizer |
|---|---|---|
| `afazer` | A fazer | ainda não começou |
| `andamento` | Em andamento | em execução |
| `aprovacao` | Em aprovação | enviada para aceite de quem pediu |
| `revisao` | Para revisar | voltou com ajuste a fazer |
| `aprovada` | Aprovada | quem pediu aceitou |
| `concluida` | Concluída | encerrada |

Aprovada e concluída são passos separados de propósito: dá para aceitar a
entrega e ainda ter pendência de fechamento. As duas contam como fechadas —
`WB.STATUS_FECHADO` e `WB.demandaFechada(d)`, que é por onde todo cálculo passa.
Comparar `status === 'concluida'` direto deixaria a demanda aprovada contando
como aberta.

### Hierarquia e quem pode mexer

`WB.TIPOS_DEMANDA` descreve os quatro tipos e quem mexe em cada um:

- **Marco** e **Entregável** são a linha do cronograma. Quem define, e quem muda
  a data, é a administração (admin e diretoria).
- **Tarefa** é o que uma área faz para o entregável acontecer. **Subtarefa** é o
  recorte dela. Head e diretoria mexem em qualquer uma; analista mexe nas que
  são dele — as que ele criou ou as que estão sob a responsabilidade dele.

Tarefa e subtarefa precisam de `pai`: elas existem por causa de um entregável, e
um nível solto não diria de onde veio. `WB.podeEditarDemanda(demanda, pessoa)`
devolve `{ pode, motivo }` — o motivo é o texto que a tela mostra quando o campo
está travado, em vez de um botão que não faz nada.

### O que a demanda guarda

Além de nome, projeto, responsável, prioridade e sprint: `inicio` e `prazo`
(começo e fim), `criador` (quem abriu), `concluidaEm` (data do fechamento),
`comentarios[]` (o chat interno) e `anexos[]` (nome, tamanho, autor e data da
referência — sem servidor de arquivos, o conteúdo não sobe, e a tela diz isso).

Quem abriu a demanda é avisado quando **outra** pessoa mexe, comenta, anexa ou
apaga: `WB.avisarCriador`. Ninguém recebe aviso do que fez. Aviso com
destinatário aparece só para a pessoa dele — `WB.notificar` cria,
`WB.minhasNotificacoes` filtra, e o sino usa essa lista. Apagar não apaga os
subitens junto: eles perdem o vínculo, porque cascata levaria trabalho de outras
pessoas sem elas saberem.

### Períodos

`WB.janelaPeriodo(periodo, hoje, de, ate)` devolve `{ de, ate }` — ou `null` em
`geral`, que não recorta nada. Aceita `hoje`, `semana` (começa na segunda),
`mes`, `ano` e `intervalo`. `WB.noPeriodoDemanda` decide pela janela
`início → prazo`: demanda sem data nenhuma não pertence a período e só aparece
em "geral". `WB.noPeriodoData` faz o mesmo para a data de uma solicitação. É a
mesma definição de "semana" para demandas, solicitações e indicadores.

A tela de demandas tem o recorte em **Hoje · Semana · Mês · Escolher · Tudo**,
com uma regra própria que ela explica na barra: o que está aberto olha para a
frente, o que fechou olha para trás, e atrasada ou sem prazo aparece em
qualquer período. "Escolher" abre as duas datas e vale ao pé da letra. O
**Histórico de solicitações** tem o mesmo recorte (Hoje · Semana · Mês · Ano ·
Tudo), pela data do pedido, com a contagem em cada botão.

### Indicadores individuais

`#/indicadores` é aba própria desde 21/09/2026 e foi refeita em 22/09: o nome da
pessoa abre a tela, a sprint saiu (é ritmo do time, não da pessoa), há filtro de
**hoje / semana / mês / ano / geral** — guardado, para voltar como foi deixado —
e cada número é uma caixa com ícone.

O recorte é individual e muda por papel: todo mundo vê o próprio trabalho; head,
diretoria e admin ganham a leitura da equipe; admin ganha pedidos em análise e
integrações conectadas. Pontualidade só é calculada sobre demandas que têm
`concluidaEm`; sem essa data não dá para saber se a entrega saiu no prazo, e a
tela diz "sem dado" em vez de estimar. Nenhum número vem de fonte nova.

**PDI e descritivo de cargo** são configuração individual da administração
(`WB.pode('desenvolvimento')`), que aparece para a pessoa como dois atalhos de
consulta no topo da aba. O portal guarda o endereço, não o arquivo — e só
endereço `http(s)`. Ficam em `WB.store`, sob `pessoas.desenvolvimento`, porque
`pessoas` é base de demonstração e é reconstruída a cada boot. Campo em branco
remove o atalho.

## Solicitações

Compra, coffee e evento abrem em popup, gravam em `WB.data.solicitacoes` e
recebem um número `SOL-####` que não repete entre recargas — ele parte do maior
número em uso e de um contador guardado no `store`.

O briefing de evento tem sete blocos e **todos** são gravados: o que a pessoa
escreve em perfil do público, cardápio, restrições, mensagem-chave ou
divulgação entra no pedido, não só o resumo. Campo opcional em branco não vira
linha. A duração prevista é calculada a partir do início e do término, e
término igual ou anterior ao início é declarado como virada do dia. Enviar com
um campo obrigatório vazio abre o bloco onde ele está.

No coffee, escolher local "Outro" pede a descrição do local nos dois modos,
imediato e agendado.

Publicar aviso e marcar comprovantes de compra são de `admin` e `head`. A
matriz mora em `WB.pode(...)`, em `data.js` — quando os cinco perfis do login
forem unificados com os papéis internos, é esse mapa que muda, não cada tela.
Ler um comunicado na home é outra ação: abre `WB.lerAviso`, que mostra o texto.

## Fase 2 — WeInvest e Nós Gastronomia

Duas operações com ramo próprio na barra lateral, coleções próprias
(`WB.data.wi` e `WB.data.nos`) e cadastros que gravam de verdade. Nada disso
substitui a Fase 1: as coleções antigas continuam como estavam, e as telas
compartilhadas passaram a ler as duas fontes em vez de duplicar registro.

**Persistência.** A Fase 1 gravava os cadastros no `localStorage` mas nunca os
lia de volta — tudo sumia num F5. Agora `WB.fase2.carregar()` roda no boot e
devolve tanto as coleções novas quanto as antigas (`clientes`, `demandas`,
`projetos`, `solicitacoes`, `news`, `atalhos`). Registro gravado com id que já
existe **substitui** a semente em vez de virar uma segunda linha, e registro
gravado antes de um campo existir é completado pelo padrão em vez de quebrar a
tela. O envelope tem versão (`{ v, itens }`); array puro, do formato anterior,
também é aceito.

**Conversão de lead.** Um lead vira cliente quando um negócio é registrado com
situação *venda registrada* — "em negociação" não converte. A conversão leva o
histórico do lead junto, marca o lead como convertido e guarda o vínculo nos dois
sentidos. A trava é o `lead.clienteId`: salvar o mesmo negócio de novo edita,
nunca cria um segundo cliente, uma segunda venda ou uma segunda linha de carteira.

**As grandezas não se misturam.** VGV, valor negociado, receita, comissão bruta
e comissão líquida são campos independentes. O sistema não calcula um a partir
do outro, porque as fotos não definem impostos, descontos nem rateio — quando a
soma do rateio passa da comissão bruta, a tela **avisa** em vez de ajustar.
Percentuais incidem sobre o valor negociado, e isso está escrito ao lado do
número. Comissão prevista e comissão recebida são contadas separadas.

**Carteira ≠ compra.** A carteira imobiliária guarda o que o cliente já possui.
As compras feitas pela WeInvest ficam nos negócios e são as únicas que entram em
"unidades compradas" e "VGV comprado". Quando uma venda é registrada, o ativo
entra na carteira com o `negocioId` — é o campo que separa as duas coisas.

**Menu.** Margem = preço − custo estimado; margem % = margem ÷ preço; CMV % =
custo ÷ preço. Preço ausente ou zero devolve *sem dado*, não 0 %. Custo estimado
é o da ficha técnica, não custo contábil realizado. *Excluir item do menu* abre
as duas opções com a diferença explicada: descontinuar preserva cadastro,
contadores e vínculos e permite reativar; excluir definitivamente apaga, com
confirmação em dois toques.

**Confidencialidade de ativo** filtra listas, ficha e busca pelo papel de quem
está vendo. É recorte de interface e a tela diz isso: num protótipo que roda por
`file://`, quem abre os arquivos lê tudo. Autorização de verdade depende de
servidor.

**Onde a foto não fecha**, a tela mostra uma nota classificada — *decisão de
implementação*, *leitura parcial da foto* ou *dúvida em aberto* — em vez de
apresentar a suposição como requisito. O inventário completo dessas notas está em
`../FASE2_LEITURA_E_DECISOES.md`.

## Tabelas

Toda tabela com mais de cinco linhas ganha busca e ordenação por coluna. A busca
filtra as linhas já renderizadas — a tela não é reconstruída, então o texto
digitado e o foco permanecem. A ordenação entende texto, número, dinheiro e data
no formato brasileiro; célula sem dado vai para o fim nas duas direções. Quem
chama pode passar `busca: false`, `ordenavel: false` na coluna ou `ord` para
definir a chave.

## Atalhos

- `/` foca a busca
- `Esc` fecha o popup aberto
- `Tab` circula dentro do popup e o foco volta ao ponto de origem ao fechar

## Testes

```
node --test tests/*.test.cjs        # num shell que expanda o padrão
```

198 testes, todos aprovados (23/09/2026). Passar só o diretório
(`node --test tests/`) não funciona no Node 21 daqui: ou o shell expande o
padrão, ou os arquivos vão listados um a um.

Esses testes cobrem lógica pura. O que só existe com DOM — roteador, módulos do
Codex montados, formulários, tabelas, permissão e largura — está em
`tests/verificacao.html`: abra no navegador e leia o placar. Em Chrome headless,
com **caminho absoluto** `file://` — caminho relativo o Chrome trata como busca e
abre uma página de erro:

```
chrome --headless=new --disable-gpu --allow-file-access-from-files \
       --virtual-time-budget=150000 --dump-dom \
       "file:///C:/Users/alexs/Brain_We/webrain/tests/verificacao.html"
```

A flag `--allow-file-access-from-files` é só para a parte de largura, que lê um
iframe da pasta de cima; sem ela esse trecho é pulado com aviso, e o resto roda.
Estado atual: **264 verificações, nenhuma falha**.

Para conferir celular por imagem, não use `--window-size=390 --screenshot`: o
recorte engana e parece que há vazamento horizontal onde não há. Abra o
`index.html` dentro de um iframe de 390 px e fotografe esse iframe.

## O que ainda não existe

Autenticação, permissões de servidor, upload de arquivo e as integrações com
Omie, Google Agenda, CRM, Drive e WhatsApp. A interface diz isso onde é relevante
em vez de simular um envio que não acontece. Trocar de usuário em *Meu perfil* é
recurso do protótipo, para conferir o que cada papel enxerga.

O Omie tem uma exceção: não há integração, mas há **atalho**. O endereço do ERP
é cadastrado em `#/erp` e fica guardado; a partir daí o item *ERP — Omie* da
barra lateral deixa de abrir uma tela do portal e abre o ERP em outra aba. Nada
é lido nem gravado no Omie — o portal só redireciona.

## Comercial: lead, funil e cliente

Lead e cliente são a mesma coleção (`WB.data.clientes`, campo `tipo`) mostrada
em duas telas — a separação pedida é de tela, não de armazenamento, porque a
WeInvest projeta os registros dela na mesma lista.

**Dois papéis, não um.** `trazidoPor` é quem cadastrou e nunca muda;
`responsavel` é quem toca a negociação e **pode ficar vazio**. Um colaborador de
fora do comercial traz um lead sem virar dono dele; o lead entra no CRM marcado
como sem responsável, e alguém assume em um clique.

**Dois campos de estado, não um.** `etapa` é o funil do lead
(`Leads · Qualificados · Visitas · Propostas · Vendas`, as mesmas etapas do
funil do dashboard) e `situacao` é a do cliente (`Contrato assinado`, `Ativo`,
`Recorrente`). Antes os dois sentidos dividiam o campo `etapa`, e não dava para
contar leads por etapa sem esbarrar em cliente.

**Chegar em Vendas é o que converte.** Não há botão "virou cliente": o lead
arrastado (ou movido pela caixa de etapa do cartão) até a última coluna abre o
formulário de conversão, que pede o que um lead não tem — valor, situação e o
contrato. Dá para escolher um contrato já cadastrado no Administrativo, e aí
valor e link vêm dele. Cancelar não grava nada. Confirmando, é a **mesma linha**
que muda de lista: some de `#/leads` e aparece em `#/clientes`.

O quadro arrasta, e cada cartão também tem uma caixa de etapa: arrastar não
existe no celular nem no teclado.

Produto e origem são listas fechadas porém acrescentáveis (`WB.lista` /
`WB.acrescentarOpcao`, em `ui.js`), o mesmo mecanismo do Administrativo.
