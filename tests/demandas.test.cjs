/* Ajustes de 21/09/2026 nas telas de Demandas e Minhas solicitações.
   Os testes do próprio módulo do Codex ficam em `codex-workspace.test.cjs`;
   estes cobrem o que o usuário pediu para mudar — números na tela de demandas,
   caixa única de filtros, calendário por prazo, histórico editável — e a nova
   aba de indicadores individuais. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const js = path.join(__dirname, '../assets/js');

function element() {
  return { innerHTML:'', children:[], listeners:{}, open:false,
    appendChild(child) { this.children.push(child); }, setAttribute() {},
    addEventListener(name, fn) { this.listeners[name] = fn; },
    removeEventListener(name) { delete this.listeners[name]; },
    querySelector() { return null; }, showModal() { this.open = true; },
    close() { this.open = false; }, remove() { this.removed = true; } };
}

/* Base real do portal: os números e o calendário precisam bater com os dados
   de demonstração, não com uma amostra inventada aqui. */
function portal() {
  const memoria = new Map();
  const ctx = {
    window: {}, document: { readyState:'loading', addEventListener() {}, createElement:element },
    location: { hash:'#/demandas' },
    localStorage: { getItem:(k)=>memoria.get(k), setItem:(k,v)=>memoria.set(k,v) },
    setTimeout() {}
  };
  // `pedidos*` trazem o Histórico de solicitações, que saiu do módulo do Codex.
  for (const f of ['data.js', 'ui.js', 'charts.js', 'views.js', 'pedidos.js', 'pedidos-views.js', 'codex-workspace.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(js, f), 'utf8'), ctx, { filename:f });
  }
  return ctx.window.WB;
}

function montar(WB, opcoes) {
  const raiz = element();
  const api = WB.workspace.mount(raiz, Object.assign({ data:WB.data, page:'demandas', now:new Date() }, opcoes || {}));
  const casca = raiz.children[0];
  return { api, casca, conteudo:casca.children[0], painel:casca.children[1],
    html:() => casca.children[0].innerHTML,
    clicar(dataset, atributo) {
      const botao = { disabled:false, dataset, hasAttribute:(n) => n === atributo };
      casca.listeners.click({ target:{ closest:() => botao } });
    },
    /* Trocar um select ou marcar uma caixa: o módulo lê do elemento apenas o
       dataset, o value, o checked e o type. */
    mudar(dataset, extra) {
      const el = Object.assign({ dataset, value:'', type:'checkbox', checked:false, hasAttribute:() => false }, extra || {});
      casca.listeners.change({ target:el });
    } };
}

test('Demandas trazem os quatro números que saíram do Início', () => {
  const WB = portal();
  const m = montar(WB);
  const html = m.html();
  for (const rotulo of ['Em aberto', 'Para hoje', 'Precisam de atenção', 'Concluídas']) {
    assert.ok(html.includes(rotulo), 'faltou o cartão ' + rotulo);
  }
  // 22/09/2026: cada indicador leva ícone junto do rótulo — cor sozinha não diz
  // o que é atraso, o que é do dia e o que já foi concluído.
  assert.equal((html.match(/ww-metric-ic/g) || []).length, 4, 'os quatro cartões têm ícone');
  for (const tom of ['ww-metric--aberto', 'ww-metric--hoje', 'ww-metric--atraso', 'ww-metric--feito']) {
    assert.ok(html.includes(tom), 'faltou o tom ' + tom);
  }
  // Com o período em "Tudo" os números voltam a ser o total das minhas demandas.
  m.clicar({ periodo:'tudo' });
  const total = m.html();
  const minhas = WB.data.demandas.filter((d) => d.responsavel === WB.data.usuarioAtual);
  // 22/09/2026: fechada deixou de ser só 'concluida'. Quem sabe quais
  // situações fecham uma demanda é `WB.demandaFechada`, não este teste.
  const abertas = minhas.filter((d) => !WB.demandaFechada(d)).length;
  assert.ok(total.includes(`<strong>${abertas}</strong>`), 'o número em aberto precisa sair dos dados');
  assert.ok(html.includes('<h1>Demandas</h1>'));
  assert.equal(html.includes('WORKSPACE / WE'), false, 'o eyebrow saiu do cabeçalho');
});

/* 22/09/2026 — pedido do usuário: o período escolhido vale para os indicadores
   e para a lista, e o formato de visualização fica pré-estabelecido. */
test('O período recorta indicadores e lista, e atrasada entra em qualquer período', () => {
  const WB = portal();
  const hoje = WB.d(0);
  const m = montar(WB);
  const dentro = (periodo) => {
    m.clicar({ periodo });
    return WB.workspace.filterTasks(WB.data, { mine:true, query:'', periodo }, hoje);
  };

  const minhas = WB.data.demandas.filter((d) => d.responsavel === WB.data.usuarioAtual);
  const atrasadas = minhas.filter((d) => !WB.demandaFechada(d) && WB.dias(d.prazo) < 0);
  assert.ok(atrasadas.length > 0, 'a base precisa ter demanda atrasada para o teste valer');

  const soHoje = dentro('hoje');
  assert.ok(soHoje.length < minhas.length, 'o recorte de hoje precisa ser menor que o total');
  for (const d of soHoje) {
    const ok = d.prazo === hoje || (!WB.demandaFechada(d) && WB.dias(d.prazo) < 0);
    assert.ok(ok, `"${d.nome}" não é de hoje nem está atrasada`);
  }
  for (const d of atrasadas) {
    assert.ok(soHoje.some((x) => x.id === d.id), 'atrasada some do recorte de hoje');
  }
  assert.equal(dentro('tudo').length, minhas.length, '"Tudo" mostra todas as minhas');

  // Concluída olha para trás: "concluí nesta semana" é passado, não futuro.
  const feitaOntem = { id:'feita-ontem', nome:'Feita ontem', projeto:'p1', responsavel:WB.data.usuarioAtual, status:'concluida', prazo:WB.d(-1) };
  const feitaAntes = { id:'feita-antes', nome:'Feita há um mês', projeto:'p1', responsavel:WB.data.usuarioAtual, status:'concluida', prazo:WB.d(-30) };
  WB.data.demandas.push(feitaOntem, feitaAntes);
  const semana = dentro('semana').map((d) => d.id);
  assert.ok(semana.includes('feita-ontem'), 'concluída ontem conta na semana');
  assert.equal(semana.includes('feita-antes'), false, 'concluída há um mês não conta na semana');

  // A tela diz a regra em vez de deixar a pessoa descobrir que sumiu algo.
  assert.ok(m.html().includes('Atrasada e demanda sem prazo aparecem em qualquer período'));
  // E "0 concluídas" no recorte não pode parecer defeito: o histórico fica junto.
  assert.ok(m.html().includes('no histórico'));
});

test('O formato de visualização escolhido volta na próxima montagem', () => {
  const WB = portal();
  const primeira = montar(WB);
  assert.ok(primeira.html().includes('data-view="table" aria-pressed="true"'), 'começa em tabela');
  primeira.clicar({ view:'kanban' });
  assert.equal(WB.store.get('demandas.view', 'table'), 'kanban', 'a escolha vai para o armazenamento');
  primeira.api.destroy();

  const segunda = montar(WB);
  assert.ok(segunda.html().includes('data-view="kanban" aria-pressed="true"'), 'a tela reabre no formato guardado');
  assert.ok(segunda.html().includes('o formato escolhido fica guardado'), 'a tela avisa que guarda');
});

test('O recorte é sempre das minhas demandas, sem botão para desligar', () => {
  const WB = portal();
  const m = montar(WB);
  assert.equal(m.html().includes('data-mine'), false);
  const minhas = WB.data.demandas.filter((d) => d.responsavel === WB.data.usuarioAtual);
  const outras = WB.data.demandas.filter((d) => d.responsavel !== WB.data.usuarioAtual);
  assert.ok(outras.length > 0, 'a base precisa ter demanda de outra pessoa para o teste valer');

  /* Desde a hierarquia de 22/09/2026 o entregável de uma tarefa minha pode ser
     de outra pessoa. Ele aparece — mas só como linha de contexto, sem campo
     editável —, porque esconder o entregável esconderia de onde a tarefa veio. */
  const porId = new Map(WB.data.demandas.map((d) => [d.id, d]));
  const contexto = new Set();
  for (const d of minhas) {
    let pai = porId.get(d.pai);
    while (pai && pai.projeto === d.projeto && !contexto.has(pai.id)) { contexto.add(pai.id); pai = porId.get(pai.pai); }
  }
  for (const d of outras) {
    if (contexto.has(d.id)) continue;
    assert.equal(m.html().includes(`data-detail="${d.id}"`), false, d.id + ' não é minha');
  }
  const ancestral = outras.find((d) => contexto.has(d.id));
  if (ancestral) {
    assert.ok(m.html().includes(`data-detail="${ancestral.id}"`), 'o entregável da minha tarefa precisa aparecer');
    assert.ok(m.html().includes('ww-context-row'), 'e precisa vir marcado como contexto');
  }
});

test('Busca e filtros ficam numa caixa só, com contagem do que está ativo', () => {
  const WB = portal();
  const m = montar(WB);
  assert.ok(m.html().includes('ww-filterbox'));
  assert.equal(m.html().includes('ww-filterpanel'), false, 'a caixa começa fechada');
  m.clicar({}, 'data-filtros');
  assert.ok(m.html().includes('ww-filterpanel'));
  assert.equal(m.html().includes('ww-count'), false, 'sem filtro aplicado não há contagem');
  m.clicar({}, 'data-late');
  assert.ok(m.html().includes('ww-count'), 'com filtro aplicado a contagem aparece');
});

test('O calendário põe cada demanda no dia do prazo e declara as sem prazo', () => {
  const WB = portal();
  const hoje = new Date();
  const chave = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const m = montar(WB, { now:hoje });
  m.clicar({ view:'calendar' });
  const html = m.html();
  assert.ok(html.includes('ww-cal-grid'));
  assert.ok(html.includes('ww-cal-cell--hoje'), 'o dia de hoje fica marcado');
  const doDia = WB.data.demandas.filter((d) => d.responsavel === WB.data.usuarioAtual && d.prazo === chave(hoje));
  for (const d of doDia.slice(0, 3)) assert.ok(html.includes(`data-detail="${d.id}"`), d.nome + ' precisa cair no dia de hoje');
  // Mudar de mês não pode perder o calendário nem a tela.
  const outro = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  m.clicar({ mes:`${outro.getFullYear()}-${String(outro.getMonth() + 1).padStart(2, '0')}` });
  assert.ok(m.html().includes('ww-cal-grid'));
});

test('Solicitações: título sozinho, botões discretos e histórico editável', () => {
  const WB = portal();
  const m = montar(WB, { page:'solicitacoes', onRequest() {}, onEditRequest() { return true; } });
  const html = m.html();
  assert.ok(html.includes('<h1>Minhas solicitações</h1>'));
  assert.ok(html.includes('ww-request-actions--slim'), 'os botões de abrir pedido ficaram discretos');
  assert.ok(html.includes('Histórico'));
  const meu = WB.data.solicitacoes.find((s) => s.solicitante === WB.data.usuarioAtual);
  assert.ok(html.includes(`data-request-edit="${meu.id}"`));
  m.clicar({ requestEdit:meu.id });
  assert.ok(m.painel.innerHTML.includes('data-edit-form'));
  assert.ok(m.painel.innerHTML.includes('name="titulo"'));
  // Situação e número não entram no formulário: eles são do fluxo de aprovação.
  assert.equal(m.painel.innerHTML.includes('name="status"'), false);
});

test('Sem callback de edição, o histórico não promete o que não faz', () => {
  const WB = portal();
  assert.equal(montar(WB, { page:'solicitacoes' }).html().includes('data-request-edit'), false);
});

/* A aba refeita em 22/09/2026: o nome da pessoa em destaque, sem sprint (ela é
   o ritmo do time, não da pessoa), filtro de período e os atalhos de PDI e
   descritivo de cargo. */
test('A aba de indicadores individuais fala do usuário da sessão', () => {
  const WB = portal();
  const eu = WB.eu();
  const html = WB.views.indicadoresPagina();
  assert.ok(html.includes('Meus indicadores individuais'));
  assert.ok(html.includes(eu.nome), 'o nome da pessoa abre a tela');
  assert.ok(html.includes('indpessoa__nome'), 'e vem em destaque, não numa linha de apoio');
  assert.equal(html.includes(WB.sprintAtual().nome), false, 'a sprint saiu: esta tela é da pessoa');
  assert.ok(html.includes('Pedidos que você abriu'));
});

test('Os indicadores têm período guardado, ícone e caixa própria', () => {
  const WB = portal();
  for (const [id] of [['hoje'], ['semana'], ['mes'], ['ano'], ['geral']]) {
    assert.ok(WB.views.indicadoresPagina().includes(`data-periodo-ind="${id}"`), 'falta o período ' + id);
  }
  assert.ok(WB.views.indicadoresPagina().includes('aria-pressed="true"'), 'um período está sempre escolhido');
  WB.store.set('indicadores.periodo', 'mes');
  assert.ok(WB.views.indicadoresPagina().includes('data-periodo-ind="mes" aria-pressed="true"'), 'a escolha volta na próxima visita');

  const cartoes = WB.views.indicadores(WB.eu(), { periodo: 'geral' });
  assert.ok(cartoes.includes('ind__card') && cartoes.includes('ind__ic'), 'cada número é uma caixa com ícone');
  assert.ok(cartoes.includes('Em aprovação') && cartoes.includes('Entregues'), 'as situações novas entram nos números');
});

test('O período recorta demandas e pedidos pelo mesmo calendário', () => {
  const WB = portal();
  const hoje = WB.d(0);
  const so = WB.janelaPeriodo('hoje', hoje);
  assert.equal(so.de, hoje); assert.equal(so.ate, hoje);
  assert.equal(WB.janelaPeriodo('geral', hoje), null, 'geral não recorta nada');
  const semana = WB.janelaPeriodo('semana', hoje);
  assert.ok(semana.de <= hoje && semana.ate >= hoje, 'a semana contém hoje');
  assert.equal(WB.janelaPeriodo('ano', hoje).de, hoje.slice(0, 4) + '-01-01');

  // Demanda sem data nenhuma não pertence a período: só aparece em "geral".
  assert.equal(WB.noPeriodoDemanda({ nome: 'sem data' }, so), false);
  assert.equal(WB.noPeriodoDemanda({ nome: 'sem data' }, null), true);
  // A janela da demanda encosta na do filtro: entra mesmo começando antes.
  assert.equal(WB.noPeriodoDemanda({ inicio: WB.d(-5), prazo: WB.d(5) }, so), true);
  assert.equal(WB.noPeriodoDemanda({ inicio: WB.d(-9), prazo: WB.d(-8) }, so), false);
});

test('Pontualidade só é calculada quando existe data de fechamento', () => {
  const WB = portal();
  const eu = WB.eu();
  WB.data.demandas = WB.data.demandas.map((d) => (d.responsavel === eu.id ? { ...d, concluidaEm: undefined } : d));
  assert.ok(WB.views.indicadores(eu, { periodo: 'geral' }).includes('sem dado'),
    'sem data de fechamento a tela diz "sem dado" em vez de estimar');
  WB.data.demandas.push({ id: 'dmx', nome: 'Entregue no prazo', projeto: 'p1', tipo: 'tarefa', responsavel: eu.id,
    prazo: WB.d(-2), concluidaEm: WB.d(-3), status: 'concluida', prioridade: 'media' });
  const html = WB.views.indicadores(eu, { periodo: 'geral' });
  assert.ok(html.includes('100%'), 'entrega antes do prazo conta como pontual');
});

test('PDI e descritivo de cargo viram atalho de consulta da pessoa', () => {
  const WB = portal();
  const eu = WB.eu();
  assert.ok(WB.views.indicadoresPagina().includes('Nenhum PDI cadastrado'),
    'sem cadastro, a tela diz que não existe em vez de mostrar botão morto');

  WB.desenvolvimento.salvar(eu.id, {
    pdi: { titulo: 'PDI 2026', url: 'https://exemplo.invalid/pdi', atualizado: WB.d(-3) },
    descritivoCargo: { titulo: 'Descritivo — Head', url: 'https://exemplo.invalid/cargo', atualizado: WB.d(-9) }
  });
  const html = WB.views.indicadoresPagina();
  assert.ok(html.includes('https://exemplo.invalid/pdi') && html.includes('PDI 2026'));
  assert.ok(html.includes('https://exemplo.invalid/cargo'));
  assert.ok(html.includes('target="_blank"'), 'o documento abre fora do portal');

  // Sobrevive ao F5: quem administra cadastra uma vez.
  const outra = portal();
  assert.equal(outra.pessoa(eu.id).pdi, undefined, 'a base de demonstração não traz o cadastro');
  outra.store.set('pessoas.desenvolvimento', { [eu.id]: { pdi: { titulo: 'PDI 2026', url: 'https://exemplo.invalid/pdi' } } });
  outra.desenvolvimento.carregar();
  assert.equal(outra.pessoa(eu.id).pdi.url, 'https://exemplo.invalid/pdi');
});

/* ------------------------------------------------------------------------
   Os itens que estavam em aberto na lista de 22/09 e foram fechados: seleção
   nos três formatos, escolha de colunas, ficha completa da demanda (chat,
   anexos, editar, apagar) e os períodos novos. O módulo é do Codex — por isso
   estes testes moram aqui, e não em `codex-workspace.test.cjs`. */

test('A seleção é uma caixinha ao lado do nome, nos três formatos', () => {
  const WB = portal();
  const m = montar(WB);
  assert.equal(m.html().includes('Selecionar resultados'), false, 'a barra de selecionar tudo saiu');
  assert.ok(m.html().includes('class="ww-check"'), 'a tabela tem a caixinha na linha');
  assert.ok(/ww-check[^>]*data-select=/.test(m.html()), 'e ela é a que seleciona a demanda');

  m.clicar({ view: 'kanban' });
  assert.ok(m.html().includes('ww-card-head') && m.html().includes('ww-check'), 'o kanban também tem');
  m.clicar({ view: 'calendar' });
  assert.ok(m.html().includes('ww-cal-item') && m.html().includes('ww-check'), 'o calendário também tem');
  m.clicar({ view: 'table' });
});

test('A cor da situação entra no calendário', () => {
  const WB = portal();
  const m = montar(WB);
  m.clicar({ view: 'calendar' });
  const html = m.html();
  const comCor = (WB.data.demandas || []).filter((d) => d.responsavel === WB.data.usuarioAtual && /^\d{4}-\d{2}-\d{2}$/.test(d.prazo || ''));
  assert.ok(comCor.some((d) => html.includes('ww-cal-task--' + d.status)), 'cada demanda leva a classe da situação');
  // Cor sozinha não comunica: a situação também vai por escrito no title.
  assert.ok(html.includes('· Em andamento') || html.includes('· A fazer'), 'e a situação aparece por extenso no title');
  m.clicar({ view: 'table' });
});

test('A tabela deixa escolher as colunas, e a escolha fica guardada', () => {
  const WB = portal();
  const m = montar(WB);
  assert.ok(m.html().includes('data-colunas'), 'o botão de colunas existe na tabela');
  assert.equal(m.html().includes('data-coluna="prazo"'), false, 'o painel começa fechado');
  m.clicar({}, 'data-colunas');
  assert.ok(m.html().includes('data-coluna="prazo"') && m.html().includes('data-coluna="inicio"'));
  assert.ok(m.html().includes('>Prazo</th>'), 'prazo está ligado por padrão');
  assert.equal(m.html().includes('>Início</th>'), false, 'início começa desligado');

  m.mudar({ coluna: 'inicio' }, { checked: true });
  assert.ok(m.html().includes('>Início</th>'), 'ligar a coluna acrescenta a coluna');
  assert.equal(WB.store.get('demandas.colunas', {}).inicio, true, 'e a escolha fica guardada');

  // Kanban não tem colunas de tabela para escolher.
  m.clicar({ view: 'kanban' });
  assert.equal(m.html().includes('data-colunas'), false);
  m.clicar({ view: 'table' });
});

test('A ficha da demanda mostra o caminho, o período e quem abriu', () => {
  const WB = portal();
  const m = montar(WB);
  const tarefa = WB.data.demandas.find((d) => d.responsavel === WB.data.usuarioAtual && d.pai);
  m.clicar({ detail: tarefa.id });
  const ficha = m.painel.innerHTML;
  const pai = WB.data.demandas.find((d) => d.id === tarefa.pai);
  assert.ok(ficha.includes('ww-detail-chip--projeto'), 'o projeto abre a ficha, em destaque');
  assert.ok(ficha.includes(pai.nome), 'o entregável de onde a tarefa veio aparece');
  assert.ok(ficha.includes('Entregável:') || ficha.includes('Marco:'), 'e diz que é o entregável');
  assert.ok(ficha.includes('Período'), 'início e prazo viram um período só');
  assert.ok(ficha.includes('Aberta por'), 'quem abriu a demanda fica registrado na ficha');
});

test('A ficha tem chat e referências quando a aplicação liga os dois', () => {
  const WB = portal();
  const enviados = [];
  const m = montar(WB, {
    onComment: (id, texto) => { enviados.push([id, texto]); return { id: 'cm9', autor: WB.data.usuarioAtual, texto, data: new Date().toISOString() }; },
    onAttach: (id, arquivo) => ({ id: 'an9', nome: arquivo.nome, tamanho: arquivo.tamanho, autor: WB.data.usuarioAtual, data: new Date().toISOString() })
  });
  const comConversa = WB.data.demandas.find((d) => (d.comentarios || []).length);
  m.clicar({ detail: comConversa.id });
  const ficha = m.painel.innerHTML;
  assert.ok(ficha.includes('Conversa da demanda'), 'o chat interno abre com a ficha');
  assert.ok(ficha.includes(comConversa.comentarios[0].texto), 'e traz o que já foi dito');
  assert.ok(ficha.includes('data-chat-form'), 'com campo para escrever');
  assert.ok(ficha.includes('Referências'), 'as referências têm lugar próprio');
  assert.ok(ficha.includes('data-anexo'), 'e dá para anexar');
  assert.ok(ficha.includes('o arquivo em si não é enviado'), 'a tela diz o que guarda de verdade');
});

test('Editar e apagar só aparecem para quem pode mexer naquele tipo', () => {
  const WB = portal();
  const entregavel = WB.data.demandas.find((d) => d.tipo === 'entregavel');
  const tarefa = WB.data.demandas.find((d) => d.tipo === 'tarefa' && d.responsavel === WB.data.usuarioAtual);

  // Analista não mexe em entregável — a ficha diz o motivo em vez de sumir.
  const analista = WB.data.pessoas.find((p) => p.papel === 'analista');
  WB.data.usuarioAtual = analista.id;
  const comRegra = montar(WB, { onUpdate: () => true, permissao: (d) => WB.podeEditarDemanda(d, analista) });
  comRegra.clicar({ detail: entregavel.id });
  assert.equal(comRegra.painel.innerHTML.includes('data-editar'), false, 'analista não edita entregável');
  assert.ok(comRegra.painel.innerHTML.includes('definido pela administração'), 'e a ficha explica por quê');

  // Admin mexe, e o botão de apagar só aparece com a exclusão ligada.
  const admin = WB.data.pessoas.find((p) => p.papel === 'admin');
  WB.data.usuarioAtual = admin.id;
  const semApagar = montar(WB, { onUpdate: () => true, permissao: (d) => WB.podeEditarDemanda(d, admin) });
  semApagar.clicar({ detail: tarefa.id });
  assert.ok(semApagar.painel.innerHTML.includes('data-editar'), 'admin edita');
  assert.equal(semApagar.painel.innerHTML.includes('data-apagar'), false, 'sem onDelete não há botão de apagar');

  const comApagar = montar(WB, { onUpdate: () => true, permissao: (d) => WB.podeEditarDemanda(d, admin), onDelete: () => true });
  comApagar.clicar({ detail: tarefa.id });
  assert.ok(comApagar.painel.innerHTML.includes('data-apagar'), 'com onDelete, apagar aparece');
  comApagar.clicar({ apagar: tarefa.id });
  assert.ok(comApagar.painel.innerHTML.includes('será avisada') || comApagar.painel.innerHTML.includes('ninguém precisa ser avisado'),
    'a confirmação diz quem será avisado antes de apagar');
});

test('Apagar avisa quem abriu a demanda, e não quem apagou', () => {
  const WB = portal();
  const eu = WB.eu();
  const minha = WB.data.demandas.find((d) => d.criador === eu.id);
  const deOutra = WB.data.demandas.find((d) => d.criador && d.criador !== eu.id);

  const antes = WB.data.notificacoes.length;
  WB.avisarCriador(minha, 'apagou');
  assert.equal(WB.data.notificacoes.length, antes, 'ninguém é avisado do que fez');

  WB.avisarCriador(deOutra, 'apagou');
  const aviso = WB.data.notificacoes[0];
  assert.equal(WB.data.notificacoes.length, antes + 1);
  assert.equal(aviso.pessoa, deOutra.criador, 'o aviso vai para quem abriu');
  assert.ok(aviso.texto.includes(deOutra.nome), 'e diz qual demanda era — depois de apagada, é o que resta');
  assert.equal(WB.minhasNotificacoes(eu.id).indexOf(aviso), -1, 'quem apagou não vê o aviso na própria caixa');
});

test('O período tem mês e escolha de datas, além de hoje e semana', () => {
  const WB = portal();
  const m = montar(WB);
  for (const id of ['hoje', 'semana', 'mes', 'intervalo', 'tudo']) {
    assert.ok(m.html().includes(`data-periodo="${id}"`), 'falta o período ' + id);
  }
  m.clicar({ periodo: 'intervalo' });
  assert.ok(m.html().includes('data-filter="de"') && m.html().includes('data-filter="ate"'), '"Escolher" abre as duas datas');
  assert.equal(WB.store.get('demandas.periodo', ''), 'intervalo', 'o período escolhido fica guardado');
  m.clicar({ periodo: 'semana' });
  assert.equal(m.html().includes('data-filter="de"'), false, 'e as datas somem ao sair do intervalo');
});

test('Histórico de solicitações filtra por período', () => {
  const WB = portal();
  const html = WB.views.solicitacoes('coffe');
  for (const id of ['hoje', 'semana', 'mes', 'ano', 'geral']) {
    assert.ok(html.includes(`data-periodo-pedido="${id}"`), 'falta o período ' + id);
  }
  WB.store.set('solicitacoes.periodo', 'hoje');
  const hoje = WB.views.solicitacoes('coffe');
  assert.ok(hoje.includes('data-periodo-pedido="hoje" aria-pressed="true"'), 'a escolha volta na próxima visita');
  const meus = WB.data.solicitacoes.filter((s) => s.solicitante === WB.data.usuarioAtual && s.tipo === 'coffe');
  const deHoje = meus.filter((s) => s.data === WB.d(0));
  if (meus.length > deHoje.length) {
    const antigo = meus.find((s) => s.data !== WB.d(0));
    assert.equal(hoje.includes(`data-pedido-abrir="${antigo.id}"`), false, 'pedido de outro dia sai do recorte');
  }
});
