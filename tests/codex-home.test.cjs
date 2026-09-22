const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = { window: {}, document: { createElement() {
  return { innerHTML: '', className: '', listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; },
    removeEventListener(name) { delete this.listeners[name]; }, remove() { this.removed = true; } };
} } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/codex-home.js'), 'utf8'), context);
const home = context.window.WB.home;
const now = new Date(2026, 8, 17, 23, 30);
const data = {
  usuarioAtual: 'me', pessoas: [{ id: 'me', nome: 'Alex', setor: 'Marketing' }],
  projetos: [{ id: 'p', nome: 'Comunicação' }],
  demandas: [
    { id:'today', responsavel:'me', nome:'Revisar briefing', projeto:'p', prazo:'2026-09-17', status:'afazer' },
    { id:'late', responsavel:'me', nome:'Aprovar', prazo:'2026-09-16', status:'andamento' },
    { id:'next', responsavel:'me', nome:'Planejar', prazo:'2026-09-21', status:'afazer' },
    { id:'done', responsavel:'me', nome:'Concluída', prazo:'2026-09-10', status:'concluida' },
    { id:'other', responsavel:'other', nome:'Privada', prazo:'2026-09-17', status:'afazer' },
    { id:'invalid', responsavel:'me', nome:'Sem prazo', prazo:'2026-02-30', status:'afazer' }
  ],
  news: [{ id:'public', publico:'Todos', data:'2026-09-17' }, { id:'team', publico:'Marketing', data:'2026-09-17' }, { id:'restricted', publico:'Diretoria', data:'2026-09-17' }],
  agenda: [{ titulo:'Hoje', dia:'2026-09-17', inicio:'09:00' }, { titulo:'Domingo', dia:'2026-09-20', inicio:'09:00' }, { titulo:'Segunda', dia:'2026-09-21', inicio:'09:00' }]
};
const state = { period:'today', query:'', agenda:'today' };
const ids = records => Array.from(records, d => d.id);
test('Hoje considera somente demandas próprias em aberto e calendário local', () => {
  const view = home.select(data, state, now);
  assert.deepEqual(ids(view.tasks), ['today']);
  assert.equal(view.today, 1); assert.equal(view.late, 1); assert.equal(view.done, 1);
  assert.equal(view.bounds.today, '2026-09-17');
});
test('Semana termina domingo e não inclui segunda seguinte', () => {
  const view = home.select(data, { ...state, period:'week', agenda:'week' }, now);
  assert.deepEqual(ids(view.tasks), ['late', 'today']);
  assert.equal(view.agenda.length, 2);
});
test('Atrasadas exclui concluídas e datas inválidas', () => {
  assert.deepEqual(ids(home.select(data, { ...state, period:'late' }, now).tasks), ['late']);
});
test('Busca encontra projeto sem exigir acentos', () => {
  assert.deepEqual(ids(home.select(data, { ...state, period:'all', query:'comunicacao' }, now).tasks), ['today']);
});
test('Sem sessão não exibe demandas, agenda nem avisos', () => {
  const view = home.select({ ...data, usuarioAtual:null }, { ...state, period:'all' }, now);
  assert.equal(view.tasks.length, 0); assert.equal(view.agenda.length, 0); assert.equal(view.news.length, 0);
});
test('Avisos restritos a outro setor não aparecem', () => {
  assert.deepEqual(ids(home.select(data, state, now).news).sort(), ['public', 'team']);
});
test('Montagem escapa conteúdo, desabilita ações sem callback e permite atualização e limpeza', () => {
  const root = { addEventListener() {}, appendChild(frame) { this.frame = frame; } };
  const instance = home.mount(root, { data:{ ...data, pessoas:[{ id:'me', nome:'<img src=x onerror=alert(1)>', setor:'Marketing' }] }, now });
  assert.ok(root.frame.innerHTML.includes('Ambiente de demonstração'));
  assert.ok(root.frame.innerHTML.includes('&lt;img'));
  assert.ok(!root.frame.innerHTML.includes('<img'));
  // Sem callback, os pedidos do Início ficam desabilitados em vez de mentir.
  assert.ok(root.frame.innerHTML.includes('data-action="evento" disabled'));
  instance.update({ demo:false, onAction() {} });
  assert.ok(!root.frame.innerHTML.includes('Ambiente de demonstração'));
  assert.ok(!root.frame.innerHTML.includes('data-action="evento" disabled'));
  instance.destroy(); assert.equal(root.frame.removed, true);
});
