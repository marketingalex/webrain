/* Base da home: selo "novo" por 24 h (B03) e filtro de sprint (B02). São
   contratos de dados — quem desenha o mural e o quadro é o módulo do Codex. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const js = path.join(__dirname, '../assets/js');

function setup() {
  const memoria = new Map();
  const ctx = {
    window: {}, document: { readyState: 'loading', addEventListener() {} },
    location: { hash: '#/home' },
    localStorage: { getItem: (k) => memoria.get(k), setItem: (k, v) => memoria.set(k, v) },
    setTimeout() {}
  };
  for (const f of ['data.js', 'ui.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(js, f), 'utf8'), ctx, { filename: f });
  }
  return ctx.window.WB;
}

test('B03 · com hora registrada, o selo vale exatamente 24 horas', () => {
  const WB = setup();
  const agora = new Date('2026-09-21T15:00:00');
  const aviso = (h) => ({ publicadoEm: new Date(agora.getTime() - h * 36e5).toISOString() });
  assert.equal(WB.avisoNovo(aviso(0), agora).novo, true);
  assert.equal(WB.avisoNovo(aviso(23.5), agora).novo, true);
  assert.equal(WB.avisoNovo(aviso(24.5), agora).novo, false);
  assert.equal(WB.avisoNovo(aviso(3), agora).criterio, 'hora');
});

test('B03 · aviso do futuro não conta como novo', () => {
  const WB = setup();
  const agora = new Date('2026-09-21T15:00:00');
  assert.equal(WB.avisoNovo({ publicadoEm: '2026-09-22T10:00:00' }, agora).novo, false);
});

test('B03 · sem hora registrada, o critério cai para o dia e isso é declarado', () => {
  const WB = setup();
  const agora = new Date('2026-09-21T15:00:00');
  const hoje = WB.avisoNovo({ data: '2026-09-21' }, agora);
  assert.equal(hoje.novo, true);
  assert.equal(hoje.criterio, 'dia');
  assert.equal(WB.avisoNovo({ data: '2026-09-20' }, agora).novo, false);
  assert.equal(WB.avisoNovo({ publicadoEm: 'não é data', data: '2026-09-21' }, agora).criterio, 'dia');
  assert.equal(WB.avisoNovo(null).novo, false);
});

test('B03 · os avisos de demonstração já trazem a hora', () => {
  const WB = setup();
  const comHora = WB.data.news.filter((n) => n.publicadoEm);
  assert.ok(comHora.length >= 3, 'o mural precisa de exemplos recentes e antigos');
  assert.ok(WB.data.news.some((n) => WB.avisoNovo(n).novo), 'pelo menos um aviso deve aparecer como novo');
  assert.ok(WB.data.news.some((n) => !WB.avisoNovo(n).novo), 'e pelo menos um não');
});

test('B02 · o filtro de sprint entende "atual", um id e "todas"', () => {
  const WB = setup();
  const atual = WB.sprintAtual();
  const todas = WB.data.demandas;
  const naAtual = WB.filtrarPorSprint(todas, 'atual');
  assert.ok(naAtual.length > 0);
  assert.ok(naAtual.every((d) => d.sprint === atual.id));
  assert.ok(naAtual.length < todas.length, 'o filtro precisa recortar alguma coisa');
  assert.deepEqual(WB.filtrarPorSprint(todas, atual.id).map((d) => d.id), naAtual.map((d) => d.id));
  assert.equal(WB.filtrarPorSprint(todas, 'todas').length, todas.length);
  assert.equal(WB.filtrarPorSprint(todas, null).length, todas.length);
  assert.equal(WB.filtrarPorSprint(todas, 'sprint-que-nao-existe').length, 0);
  assert.equal(WB.filtrarPorSprint(null, 'atual').length, 0);
});

test('B02 · o filtro devolve uma lista nova, sem mexer na original', () => {
  const WB = setup();
  const antes = WB.data.demandas.length;
  const saida = WB.filtrarPorSprint(WB.data.demandas, 'todas');
  saida.pop();
  assert.equal(WB.data.demandas.length, antes);
});

/* ------------------------------------------------- módulo da home montado */
function homeModulo() {
  const ctx = {
    window: {}, document: {
      createElement() {
        return {
          innerHTML: '', className: '', listeners: {},
          addEventListener(n, fn) { this.listeners[n] = fn; },
          removeEventListener(n) { delete this.listeners[n]; },
          querySelector() { return null; }, contains() { return true; },
          remove() { this.removed = true; }
        };
      }
    },
    location: { hash: '#/home' },
    localStorage: { getItem() {}, setItem() {} }, setTimeout() {}
  };
  for (const f of ['data.js', 'ui.js', 'codex-home.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(js, f), 'utf8'), ctx, { filename: f });
  }
  return ctx.window.WB;
}

function montar(WB, extra) {
  const raiz = { addEventListener() {}, appendChild(frame) { this.frame = frame; } };
  const api = WB.home.mount(raiz, Object.assign({ data: WB.data, onAction() {} }, extra || {}));
  return { raiz, api, html: () => raiz.frame.innerHTML, clicar(sel) {
    raiz.frame.listeners.click({ target: { closest: () => sel } });
  } };
}

/* O Início deixou de listar demandas em 21/09/2026: quadro, lista e números
   foram para a tela Demandas. O que sobra aqui é o que se faz agora. */
test('C01 · o Início destaca políticas, pedidos e news, sem lista de demandas', () => {
  const WB = homeModulo();
  const html = montar(WB, { data: Object.assign({}, WB.data, { usuarioAtual: 'u1' }) }).html();
  assert.ok(html.includes('Principais políticas da We'));
  assert.ok(html.includes('wh-policy'));
  for (const acao of ['evento', 'compra', 'coffe', 'lead', 'cliente']) {
    assert.ok(html.includes(`data-action="${acao}"`), 'faltou o botão de ' + acao);
  }
  assert.ok(html.includes('News We'));
  assert.ok(html.includes('wh-news-cover'), 'cada news precisa de pré-visualização');
  // O que mudou de tela não pode continuar aparecendo aqui.
  assert.ok(!html.includes('wh-task-list'));
  assert.ok(!html.includes('wh-board'));
  assert.ok(!html.includes('wh-metrics'));
  assert.ok(!html.includes('SEU DIA'));
});

/* Desde 22/09/2026 a agenda abre na semana; "Hoje" fica a um clique. */
test('C02 · a agenda do Início é grade de horas, abre na semana e vai para hoje', () => {
  const WB = homeModulo();
  const m = montar(WB, { data: Object.assign({}, WB.data, { usuarioAtual: 'u1' }) });
  assert.ok(m.html().includes('wh-cal--week'));
  assert.ok(m.html().includes('--colunas:7'), 'a semana mostra os sete dias lado a lado');
  m.clicar({ dataset: { agenda: 'today' }, disabled: false });
  assert.ok(m.html().includes('wh-cal--day'));
  assert.ok(m.html().includes('--colunas:1'));
});

test('C03 · ordem do Início: função e sprint, News, pedidos, agenda e políticas', () => {
  const WB = homeModulo();
  const html = montar(WB, { data: Object.assign({}, WB.data, { usuarioAtual: 'u1' }) }).html();
  const pos = ['wh-context', 'wh-news-title', 'wh-requests-title', 'wh-agenda-title', 'wh-policies-title'].map((k) => html.indexOf(k));
  assert.ok(pos.every((p) => p > 0), 'faltou um bloco: ' + pos);
  assert.deepEqual(pos.slice().sort((a, b) => a - b), pos, 'a ordem dos blocos mudou');
  assert.equal((html.match(/wh-action--pedido/g) || []).length, 3, 'os três pedidos ganham a cor de destaque');
});

test('C04 · agenda compartilhada desligada sai da grade e a escolha é avisada', () => {
  const WB = homeModulo();
  const avisos = [];
  const m = montar(WB, { data: Object.assign({}, WB.data, { usuarioAtual: 'u1' }), onAction: (a, r) => avisos.push([a, r]) });
  assert.ok(m.html().includes('Reunião de diretoria'));
  m.clicar({ dataset: { agendaToggle: 'diretoria' }, disabled: false });
  assert.ok(!m.html().includes('Reunião de diretoria'), 'a agenda desligada continuou na grade');
  assert.equal(JSON.stringify(avisos.pop()), JSON.stringify(['agendas', ['diretoria']]));
  const deNovo = montar(WB, { data: Object.assign({}, WB.data, { usuarioAtual: 'u1' }), agendasOcultas: ['diretoria'] });
  assert.ok(!deNovo.html().includes('Reunião de diretoria'), 'a escolha gravada não foi respeitada');
});

test('C05 · só quem tem permissão vê publicar, fixar, apagar e escolher destaque', () => {
  const WB = homeModulo();
  const dados = Object.assign({}, WB.data, { usuarioAtual: 'u1' });
  const sem = montar(WB, { data: dados }).html();
  for (const k of ['Publicar news', 'data-news-fixar', 'data-news-apagar', 'politicas-destaque']) assert.ok(!sem.includes(k), 'apareceu sem permissão: ' + k);
  const com = montar(WB, { data: dados, permissoes: { destaque: true, publicarNews: true, todasNews: true, apagarNews: () => true } }).html();
  for (const k of ['Publicar news', 'data-news-fixar', 'data-news-apagar', 'politicas-destaque']) assert.ok(com.includes(k), 'faltou para a administração: ' + k);
});

test('C06 · news para uma empresa só aparece para quem é dela', () => {
  const WB = homeModulo();
  const news = [{ id: 'a', titulo: 'Só Nós', corpo: 'x', data: WB.d(0), publico: 'nos' }, { id: 'b', titulo: 'Grupo', corpo: 'y', data: WB.d(0), publico: 'Todos' }];
  const estado = { period: 'all', query: '', agenda: 'week', sprint: 'todas' };
  const daWe = WB.home.select(Object.assign({}, WB.data, { usuarioAtual: 'u5', news }), estado, new Date()).news.map((n) => n.id);
  const doNos = WB.home.select(Object.assign({}, WB.data, { usuarioAtual: 'u6', news }), estado, new Date()).news.map((n) => n.id);
  assert.equal(daWe.join(), 'b');
  assert.equal(doNos.sort().join(), 'a,b');
});
test('B02 · o recorte de sprint atual só deixa as demandas da sprint marcada', () => {
  const WB = homeModulo();
  const dados = Object.assign({}, WB.data, { usuarioAtual: 'u1' });
  const estado = { period: 'all', query: '', agenda: 'today', sprint: 'todas' };
  const todas = WB.home.select(dados, estado, new Date()).tasks;
  const atual = WB.home.select(dados, Object.assign({}, estado, { sprint: 'atual' }), new Date()).tasks;
  const id = WB.sprintAtual().id;
  assert.ok(atual.length > 0);
  assert.ok(atual.length < todas.length);
  assert.ok(atual.every((d) => d.sprint === id));
});

test('B02 · sem sprint marcada, o Início diz isso em vez de inventar uma', () => {
  const WB = homeModulo();
  const dados = Object.assign({}, WB.data, { sprints: WB.data.sprints.map((s) => Object.assign({}, s, { atual: false })) });
  assert.ok(montar(WB, { data: dados }).html().includes('Sem sprint atual'));
  const vazio = WB.home.select(dados, { period: 'all', query: '', agenda: 'today', sprint: 'atual' }, new Date());
  assert.equal(vazio.tasks.length, 0);
});
test('B03 · o mural marca como novo só o que tem menos de 24 horas', () => {
  const WB = homeModulo();
  const agora = new Date();
  const recente = new Date(agora.getTime() - 2 * 36e5).toISOString();
  const antigo = new Date(agora.getTime() - 40 * 36e5).toISOString();
  const dados = Object.assign({}, WB.data, {
    usuarioAtual: 'u1',
    news: [
      { id: 'a', titulo: 'Recente', corpo: 'x', autor: 'u1', data: WB.d(0), publicadoEm: recente, publico: 'Todos' },
      { id: 'b', titulo: 'Antigo', corpo: 'y', autor: 'u1', data: WB.d(-2), publicadoEm: antigo, publico: 'Todos' }
    ]
  });
  const html = montar(WB, { data: dados, now: agora }).html();
  assert.equal((html.match(/wh-tag--new/g) || []).length, 1);
  const marcado = html.slice(0, html.indexOf('wh-tag--new'));
  assert.ok(!marcado.includes('Antigo'), 'o selo caiu no aviso errado');
});
