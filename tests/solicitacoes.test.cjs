/* Correções A01–A08 da auditoria das imagens: briefing completo, leitura de
   aviso, permissão de News/comprovante, duração do evento, identificação do
   solicitante e numeração dos pedidos. Lógica pura — o que depende de DOM
   renderizado (coffee com local "Outro") está em tests/verificacao.html. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const js = path.join(__dirname, '../assets/js');

const BASE = ['data.js', 'ui.js', 'charts.js', 'views.js', 'forms.js'];
const COMPLETO = BASE.concat(['codex-home.js', 'codex-workspace.js', 'app.js']);

function setup(arquivos) {
  const memoria = new Map();
  function node() {
    return {
      innerHTML: '', scrollTop: 0, hidden: false, dataset: {}, value: '',
      addEventListener() {}, removeAttribute() {}, setAttribute() {},
      querySelectorAll() { return []; }, querySelector() { return node(); }
    };
  }
  const document = { readyState: 'loading', addEventListener() {}, getElementById() { return node(); } };
  const ctx = {
    window: {}, document, location: { hash: '#/home' },
    localStorage: { getItem: (k) => memoria.get(k), setItem: (k, v) => memoria.set(k, v) },
    setTimeout() {}
  };
  for (const f of (arquivos || BASE)) {
    vm.runInNewContext(fs.readFileSync(path.join(js, f), 'utf8'), ctx, { filename: f });
  }
  return ctx.window.WB;
}

// Popup falso: devolve o mínimo que os formulários consultam depois de abrir.
function espiarPopup(WB) {
  const abertos = [];
  WB.abrirPopup = (o) => {
    abertos.push(o);
    return { querySelector: () => ({ addEventListener() {} }), querySelectorAll: () => [] };
  };
  return abertos;
}

/* ------------------------------------------------------------------- A01 */
test('A01 · o briefing de evento inteiro é gravado, não só o resumo', () => {
  const WB = setup();
  const campos = WB.camposEvento({
    nome: 'Lançamento Bioma', descricaoCurta: 'Abertura da fase 2',
    data: '2026-10-10', inicio: '19:00', termino: '23:00', responsavel: 'Ana',
    tipo: 'Institucional', objetivo: 'Apresentar a fase 2', dinamica: 'Coquetel e apresentação',
    participantes: '120', sentadas: '80', perfil: 'Clientes e corretores',
    lista: 'link da planilha', orcamento: '15000', recursos: ['Som', 'Projetor'],
    alimentacao: 'Coquetel', cardapio: 'Finger food', restricoes: 'Duas pessoas sem glúten',
    comunicacao: ['Convite digital'], mensagem: 'Bioma é habitat, não terreno',
    divulgacao: 'Stories na semana', outras: 'Estacionamento pelo portão 2'
  });
  const rotulos = campos.map((c) => c[0]);
  const perdidos = ['Descrição curta', 'Como vai acontecer', 'Perfil do público',
    'Lista de participantes', 'Cardápio desejado', 'Restrições alimentares',
    'Mensagem-chave', 'Divulgação', 'Outras informações'];
  for (const r of perdidos) assert.ok(rotulos.includes(r), 'faltou gravar: ' + r);
  const mapa = new Map(campos);
  assert.equal(mapa.get('Restrições alimentares'), 'Duas pessoas sem glúten');
  assert.equal(mapa.get('Recursos'), 'Som, Projetor');
  assert.ok(mapa.get('Horário').includes('4h'));
});

test('A01 · campo opcional em branco não vira linha vazia no pedido', () => {
  const WB = setup();
  const campos = WB.camposEvento({ nome: 'Reunião', data: '2026-10-10', participantes: '8', alimentacao: 'Coffee' });
  const rotulos = campos.map((c) => c[0]);
  assert.ok(!rotulos.includes('Divulgação'));
  assert.ok(!rotulos.includes('Perfil do público'));
  assert.ok(rotulos.includes('Evento'));
});

/* ------------------------------------------------------------------- A07 */
test('A07 · duração prevista é calculada e a virada do dia é declarada', () => {
  const WB = setup();
  assert.equal(WB.duracaoPrevista('19:00', '23:00').texto, '4h');
  assert.equal(WB.duracaoPrevista('19:00', '23:00').viraODia, false);
  assert.equal(WB.duracaoPrevista('09:30', '11:15').texto, '1h45');
  assert.equal(WB.duracaoPrevista('14:00', '14:40').texto, '40 min');
  const noite = WB.duracaoPrevista('22:00', '02:00');
  assert.equal(noite.texto, '4h');
  assert.equal(noite.viraODia, true);
  assert.equal(WB.duracaoPrevista('20:00', '20:00').minutos, 24 * 60);
  assert.equal(WB.duracaoPrevista('', '23:00'), null);
  assert.equal(WB.duracaoPrevista('19:00', 'qualquer'), null);
});

/* ------------------------------------------------------------------- A08 */
test('A08 · número do pedido não repete nem anda para trás entre sessões', () => {
  const WB = setup();
  WB.data.solicitacoes = [{ id: 'SOL-0412' }];
  assert.equal(WB.novoIdSolicitacao(), 'SOL-0413');
  assert.equal(WB.novoIdSolicitacao(), 'SOL-0414');
  // Registro saindo da lista não pode liberar o número para outro pedido.
  WB.data.solicitacoes = [];
  assert.equal(WB.novoIdSolicitacao(), 'SOL-0415');
  assert.equal(WB.store.get('solicitacoes.seq', 0), 415);
});

test('A08 · lista vazia começa acima da faixa demonstrativa', () => {
  const WB = setup();
  WB.data.solicitacoes = [];
  assert.match(WB.novoIdSolicitacao(), /^SOL-\d{4}$/);
  assert.ok(Number(WB.novoIdSolicitacao().slice(4)) > 300);
});

/* ------------------------------------------------------------------- A06 */
/* O quadro "Vale para todo pedido" saiu dos pedidos em 22/09/2026, a pedido
   do usuário. O solicitante continua vindo da sessão de quem está usando. */
test('A06 · sem o quadro "Vale para todo pedido", o solicitante segue a sessão', () => {
  const WB = setup();
  const fonte = fs.readFileSync(path.join(js, 'forms.js'), 'utf8');
  assert.ok(!fonte.includes('Vale para todo pedido'));
  assert.ok(!/blocoRegra\(\)/.test(fonte));
  const outro = WB.data.pessoas.find((p) => p.id !== WB.data.usuarioAtual);
  WB.data.usuarioAtual = outro.id;
  assert.equal(WB.eu().nome, outro.nome);
});

/* ------------------------------------------------------------------- A03 */
test('A03 · ler comunicado abre o texto do aviso, não o formulário de publicar', () => {
  const WB = setup();
  let publicou = false;
  WB.abrirNews = () => { publicou = true; };
  const popups = espiarPopup(WB);
  const autor = WB.data.pessoas[0];
  WB.lerAviso({ id: 'n9', titulo: 'Tabela nova', corpo: 'Usem a v3.', autor: autor.id, data: WB.d(0), fixado: true, publico: 'Comercial' });
  assert.equal(publicou, false);
  assert.equal(popups.length, 1);
  assert.equal(popups[0].titulo, 'Tabela nova');
  assert.ok(popups[0].corpo.includes('Usem a v3.'));
  assert.ok(popups[0].corpo.includes('Comercial'));
  assert.ok(popups[0].corpo.includes(autor.nome));
});

test('A03 · conteúdo do aviso é escapado', () => {
  const WB = setup();
  const popups = espiarPopup(WB);
  WB.lerAviso({ titulo: 'x', corpo: '<script>alert(2)</script>', autor: 'u1', data: WB.d(0), publico: 'Todos' });
  assert.ok(!popups[0].corpo.includes('<script>'));
  assert.ok(popups[0].corpo.includes('&lt;script&gt;'));
});

test('A03 · aviso ausente avisa em vez de abrir um popup vazio', () => {
  const WB = setup();
  const popups = espiarPopup(WB);
  const erros = [];
  WB.toast = (m, t) => erros.push([m, t]);
  WB.lerAviso(null);
  assert.equal(popups.length, 0);
  assert.equal(erros.length, 1);
  assert.equal(erros[0][1], 'erro');
});

test('A03 · o mapa de ações separa ler aviso de publicar aviso', () => {
  const WB = setup(COMPLETO);
  let lido = null, publicou = false;
  WB.lerAviso = (r) => { lido = r; };
  WB.abrirNews = () => { publicou = true; };
  const aviso = { id: 'n1', titulo: 'x' };
  WB.acoes.aviso(null, aviso);
  assert.equal(lido, aviso);
  assert.equal(publicou, false);
  WB.acoes.news(null);
  assert.equal(publicou, true);
});

/* ------------------------------------------------------------------- A04 */
test('A04 · publicar News e marcar comprovante ficam com admin e head', () => {
  const WB = setup();
  const porPapel = (papel) => WB.data.pessoas.find((p) => p.papel === papel);
  for (const papel of ['admin', 'head']) {
    const p = porPapel(papel);
    if (!p) continue;
    WB.data.usuarioAtual = p.id;
    assert.equal(WB.pode('news'), true, papel + ' deveria publicar');
    assert.equal(WB.pode('comprovante'), true, papel + ' deveria marcar comprovante');
  }
  for (const papel of ['diretoria', 'analista']) {
    const p = porPapel(papel);
    if (!p) continue;
    WB.data.usuarioAtual = p.id;
    assert.equal(WB.pode('news'), false, papel + ' não deveria publicar');
    assert.equal(WB.pode('comprovante'), false, papel + ' não deveria marcar comprovante');
  }
  assert.equal(WB.pode('capacidade-inexistente'), false);
});

test('A04 · quem não pode publicar recebe recusa em vez do formulário', () => {
  const WB = setup();
  const semDireito = WB.data.pessoas.find((p) => p.papel !== 'admin' && p.papel !== 'head');
  WB.data.usuarioAtual = semDireito.id;
  const erros = [];
  WB.toast = (m, t) => erros.push([m, t]);
  const popups = espiarPopup(WB);
  WB.abrirNews();
  assert.equal(popups.length, 0);
  assert.equal(erros.length, 1);
  assert.equal(erros[0][1], 'erro');
});

test('A04 · o menu da conta e o formulário usam a mesma matriz', () => {
  const fonteApp = fs.readFileSync(path.join(js, 'app.js'), 'utf8');
  const fonteForms = fs.readFileSync(path.join(js, 'forms.js'), 'utf8');
  assert.ok(fonteApp.includes("WB.pode('news')"));
  assert.ok(fonteForms.includes("WB.pode('news')"));
  assert.ok(fonteForms.includes("WB.pode('comprovante')"));
  // Nenhuma tela pode voltar a decidir permissão com lista própria de papéis.
  assert.ok(!/'admin', 'head', 'diretoria'/.test(fonteApp));
  assert.ok(!/'admin', 'head', 'diretoria'/.test(fonteForms));
});

/* ------------------------------------------------------------------- B03 */
test('B03 · aviso publicado guarda a hora, base para o selo de 24 horas', () => {
  const fonte = fs.readFileSync(path.join(js, 'forms.js'), 'utf8');
  assert.ok(fonte.includes('publicadoEm: new Date().toISOString()'));
});

/* ------------------------------------------------------------------- A05 */
/* Desde 22/09/2026 o local não tem mais "Outro": a lista aceita local novo,
   que fica gravado. O campo continua fora do bloco exclusivo do agendamento. */
test('A05 · o local do coffee aceita item novo, nos dois modos', () => {
  const fonte = fs.readFileSync(path.join(js, 'forms.js'), 'utf8');
  const completo = fonte.indexOf('data-completo');
  const local = fonte.indexOf("chave: 'locais'");
  assert.ok(local > 0, 'o local precisa aceitar item novo');
  assert.ok(local < completo, 'o local precisa vir antes do bloco de agendamento');
  assert.ok(!fonte.includes("locais.concat(['Outro'])"));
});
