/* Cabeçalho de página e Início de reserva — 22/09/2026.
   O pedido do usuário foi limpar o cabeçalho de todas as abas: sai o kicker
   acima do título ("Trabalho", "Gestão", "WeInvest · Recursos"), que só
   repetia o ramo já marcado na lateral. O que ele carregava de único — o id
   do registro, a empresa do projeto — tinha de descer para o subtítulo, e é
   isso que os testes abaixo prendem: não basta sumir, não pode perder dado.

   O Início de reserva (`WB.views.home`) é a tela que aparece se o módulo do
   Codex não carregar. Ele precisa contar a mesma história do módulo, senão o
   portal mostra duas ideias diferentes de "início" conforme o que carregou. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const js = path.join(__dirname, '../assets/js');

const ARQUIVOS = ['data.js', 'ui.js', 'charts.js', 'views.js', 'forms.js',
  'fase2-data.js', 'fase2-forms.js', 'fase2-views.js', 'adm-data.js', 'adm-forms.js', 'adm-views.js'];

function setup() {
  const mem = new Map();
  function node() {
    return {
      innerHTML: '', scrollTop: 0, hidden: false, dataset: {}, value: '', type: 'text',
      checked: false, readOnly: false, textContent: '',
      addEventListener() {}, removeAttribute() {}, setAttribute() {}, focus() {},
      appendChild() {}, remove() {}, closest() { return node(); },
      querySelectorAll() { return []; }, querySelector() { return node(); }
    };
  }
  const document = {
    readyState: 'loading', addEventListener() {},
    getElementById() { return node(); }, createElement() { return node(); },
    body: { classList: { add() {}, remove() {}, contains() { return false; } }, style: {} },
    documentElement: { setAttribute() {} },
    querySelector() { return null; }
  };
  const ctx = {
    window: { matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }) },
    document, location: { hash: '#/home' },
    localStorage: { getItem: (k) => mem.get(k), setItem: (k, v) => mem.set(k, v) },
    setTimeout() {}, console
  };
  for (const f of ARQUIVOS) vm.runInNewContext(fs.readFileSync(path.join(js, f), 'utf8'), ctx, { filename: f });
  return ctx.window.WB;
}

test('Nenhuma tela declara kicker de cabeçalho', () => {
  for (const f of fs.readdirSync(js).filter((n) => n.endsWith('.js'))) {
    const fonte = fs.readFileSync(path.join(js, f), 'utf8');
    assert.equal(/eyebrow\s*:/.test(fonte), false, `${f} ainda passa eyebrow para o cabeçalho`);
  }
  // O `cabecalho` também não desenha mais o bloco, então nem um resto de
  // chamada antiga volta a aparecer por acidente.
  const WB = setup();
  const html = WB.cabecalho({ titulo: 'Demandas', sub: 'Uma linha.' });
  assert.equal(html.includes('class="eyebrow"'), false);
  assert.ok(html.includes('<h1>Demandas</h1>'));
  assert.ok(html.includes('Uma linha.'));
});

test('Telas do portal mantêm só título e subtítulo no cabeçalho', () => {
  const WB = setup();
  for (const tela of ['projetos', 'cronograma', 'metas', 'politicas', 'atas', 'links', 'perfil']) {
    if (typeof WB.views[tela] !== 'function') continue;
    const html = WB.views[tela]();
    // Só o cabeçalho: `.eyebrow` segue válido dentro do conteúdo (o rótulo
    // "Marco" no cronograma, a empresa em cada álbum da galeria).
    const cabecalho = html.slice(0, html.indexOf('</header>'));
    assert.equal(cabecalho.includes('class="eyebrow"'), false, `a tela ${tela} ainda tem kicker`);
    assert.ok(cabecalho.includes('<h1>'), `a tela ${tela} perdeu o título`);
  }
});

test('Ficha de registro continua mostrando o identificador, agora no subtítulo', () => {
  const WB = setup();
  const cliente = WB.data.wi.clientes[0];
  const html = WB.fase2.rotas.wi(['cliente', cliente.id]);
  assert.equal(html.includes('class="eyebrow"'), false);
  const cabecalho = html.slice(0, html.indexOf('</header>'));
  assert.ok(cabecalho.includes(cliente.id), 'o id do cliente sumiu junto com o kicker');

  const ativo = WB.data.wi.ativos[0];
  const ficha = WB.fase2.rotas.wi(['ativo', ativo.id]);
  assert.ok(ficha.slice(0, ficha.indexOf('</header>')).includes(ativo.id), 'o id do ativo sumiu');
});

test('Projeto leva empresa e empreendimento para o subtítulo', () => {
  const WB = setup();
  const p = WB.data.projetos[0];
  const html = WB.views.projeto(p.id, 'briefing');
  const cabecalho = html.slice(0, html.indexOf('</header>'));
  assert.equal(cabecalho.includes('class="eyebrow"'), false);
  assert.ok(cabecalho.includes(WB.empresaNome(p.empresa)), 'a empresa do projeto sumiu do cabeçalho');
});

test('Início de reserva conta a mesma história do módulo', () => {
  const WB = setup();
  const html = WB.views.home();
  // O que precisa estar: saudação, faixa de função e sprint, políticas em
  // galeria, os cinco pedidos (com lead e cliente juntos), News We e agenda.
  assert.ok(html.includes('Olá, '));
  assert.ok(html.includes('class="ctxbar"'), 'função e sprint precisam da faixa de destaque');
  assert.ok(html.includes('class="polgal"'), 'as políticas viram galeria');
  assert.ok(html.includes('News We'));
  assert.ok(html.includes('Agenda'));
  for (const acao of ['evento', 'compra', 'coffe', 'lead', 'cliente']) {
    assert.ok(html.includes(`data-acao="${acao}"`), `falta o pedido ${acao} no bloco em destaque`);
  }
  // O que saiu daqui — cada um tem tela própria agora.
  assert.equal(html.includes('data-demandas'), false, 'a lista de demandas mora em #/demandas');
  assert.equal(html.includes('Indicadores individuais'), false, 'os indicadores moram em #/indicadores');
  assert.equal(html.includes('class="sc__add"'), false, 'os atalhos moram no cabeçalho');
  assert.equal(html.includes('Avisos'), false, 'o mural passou a se chamar News We');
});

test('A agenda não tem mais tela própria', () => {
  const WB = setup();
  assert.equal(typeof WB.views.agenda, 'undefined', 'a agenda vive dentro do Início');
  assert.equal(typeof WB.views.agendaCompacta, 'function', 'o bloco compacto continua, para o Início usar');
});
