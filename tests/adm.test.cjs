/* Administrativo — os seis cadastros em formato de planilha e o atalho do ERP.
   ---------------------------------------------------------------------------
   Este arquivo nasceu de três defeitos que passaram porque NADA executava as
   telas do Administrativo: `planilha()` recebia `base` indefinido e as seis
   telas quebravam; `WB.adm.acoes` nunca entrava no mapa de ações, então nenhum
   botão respondia; e a rota de colaboradores ignorava a aba da URL. Os três
   são erros de ligação — só aparecem quando a tela é montada de verdade. Por
   isso o teste monta as seis, e monta o portal inteiro junto.

   O que depende de DOM renderizado (popups, seleção de colunas no clique)
   continua em tests/verificacao.html. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const js = path.join(__dirname, '../assets/js');

/* A ordem é a do index.html: adm-* depois de views.js (substituem WB.views.adm)
   e app.js por último, porque é ele que junta rotas e ações. */
const ARQUIVOS = ['data.js', 'ui.js', 'charts.js', 'views.js', 'forms.js',
  'fase2-data.js', 'fase2-forms.js', 'fase2-views.js',
  'adm-data.js', 'adm-forms.js', 'adm-views.js',
  'operacoes.js', 'codex-home.js', 'codex-workspace.js', 'app.js'];

const TABELAS = ['contratos', 'colaboradores', 'fornecedores', 'patrocinadores', 'bens', 'cnpjs'];

function setup(memoria) {
  const mem = memoria || new Map();
  function node() {
    return {
      innerHTML: '', scrollTop: 0, hidden: false, dataset: {}, value: '', type: 'text',
      checked: false, readOnly: false, textContent: '', open: false,
      classList: { add() {}, remove() {}, contains() { return false; } },
      addEventListener() {}, removeAttribute() {}, setAttribute() {}, focus() {},
      appendChild() {}, remove() {}, closest() { return null; },
      querySelectorAll() { return []; }, querySelector() { return node(); }
    };
  }
  const document = {
    readyState: 'loading', addEventListener() {},
    getElementById() { return node(); }, createElement() { return node(); },
    body: { classList: { add() {}, remove() {}, contains() { return false; } }, style: {} },
    documentElement: { setAttribute() {} },
    querySelector() { return null; }, querySelectorAll() { return []; }
  };
  const ctx = {
    window: { matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }), addEventListener() {} },
    document, location: { hash: '#/home' },
    localStorage: { getItem: (k) => mem.get(k), setItem: (k, v) => mem.set(k, v) },
    setTimeout() {}, console
  };
  for (const f of ARQUIVOS) vm.runInNewContext(fs.readFileSync(path.join(js, f), 'utf8'), ctx, { filename: f });
  return { WB: ctx.window.WB, A: ctx.window.WB.adm, mem };
}

/* ================================================== as telas de fato montam */

test('As seis planilhas do Administrativo montam sem erro e trazem linhas', () => {
  const { WB, A } = setup();
  for (const t of TABELAS) {
    const html = WB.views.adm(t);
    assert.ok(typeof html === 'string' && html.length > 1000, t + ' devolveu HTML');
    // Cada registro do cadastro precisa aparecer: era isto que o `base`
    // indefinido derrubava — a tela vinha vazia em vez de quebrar visivelmente.
    const primeiro = A.colecao(t)[0];
    assert.ok(primeiro, t + ' tem semente');
    assert.ok(html.includes(primeiro.id), t + ' desenhou a primeira linha');
  }
});

test('Toda planilha traz cabeçalho, filtros, seletor de colunas e botão de adicionar', () => {
  const { WB } = setup();
  for (const t of TABELAS) {
    const html = WB.views.adm(t);
    assert.ok(html.includes('data-adm-filtro="' + t + '|'), t + ' tem barra de filtros');
    assert.ok(html.includes('data-adm-col="' + t + '|'), t + ' tem seletor de colunas');
    assert.ok(html.includes('data-acao="adm-coluna" data-adm-tabela="' + t + '"'), t + ' deixa criar coluna');
    assert.ok(html.includes('data-acao="adm-novo" data-adm-tabela="' + t + '"'), t + ' tem botão de adicionar');
    assert.ok(html.includes('data-adm-status="' + t + '|'), t + ' edita a situação na célula');
    assert.ok(html.includes('data-acao="adm-ficha" data-adm-tabela="' + t + '"'), t + ' abre a ficha');
  }
});

test('Cada planilha tem a coluna de redirecionamento para o documento', () => {
  const { WB, A } = setup();
  // Contratos tem link na semente: vira âncora. O resto oferece "Colar link".
  assert.ok(WB.views.adm('contratos').includes('class="admlink"'));
  for (const t of TABELAS) {
    const html = WB.views.adm(t);
    assert.ok(html.includes('class="admlink"') || html.includes('Colar link'), t + ' tem coluna de link');
  }
  // Endereço que executa não vira link.
  assert.equal(A.urlSegura('javascript:alert(1)'), '');
  assert.equal(A.urlSegura('drive.google.com/x'), 'https://drive.google.com/x');
});

/* ====================================================== ligação com o portal */

test('As ações do Administrativo entram no mapa de ações do portal', () => {
  const { WB } = setup();
  for (const a of ['adm-novo', 'adm-editar', 'adm-ficha', 'adm-coluna', 'adm-omie']) {
    assert.equal(typeof WB.acoes[a], 'function', a + ' está ligada');
  }
});

test('Fornecedor e parceiro são o mesmo cadastro, com um botão para cada', () => {
  const { WB } = setup();
  const html = WB.views.adm('fornecedores');
  assert.ok(html.includes('data-classe="Fornecedor"'));
  assert.ok(html.includes('data-classe="Parceiro"'));
});

/* ============================================================ colaboradores */

test('As abas de colaboradores recortam a lista, e a rota leva a aba adiante', () => {
  const { WB, A } = setup();
  const desligado = A.colecao('colaboradores').find((c) => c.status === 'desligado');
  const ativo = A.colecao('colaboradores').find((c) => c.status === 'ativo');
  assert.ok(desligado && ativo, 'a semente tem os dois casos');

  const aba = WB.views.adm('colaboradores', 'desligados');
  assert.ok(aba.includes(desligado.nome), 'aba Desligados mostra quem saiu');
  assert.ok(!aba.includes(ativo.nome), 'aba Desligados não mostra quem ficou');

  const padrao = WB.views.adm('colaboradores');
  assert.ok(padrao.includes(ativo.nome) && !padrao.includes(desligado.nome), 'sem aba, mostra os ativos');

  /* A rota é quem passa a aba da URL (#/colaboradores/desligados) para a tela.
     Compara-se o recorte, não o HTML inteiro: cada tabela nasce com um id
     sorteado, então duas montagens nunca são idênticas caractere a caractere. */
  const pelaRota = WB.rotas.colaboradores(['desligados']);
  assert.ok(pelaRota.includes(desligado.nome) && !pelaRota.includes(ativo.nome));
});

test('Os dados pessoais existem como coluna, mas nascem escondidos', () => {
  const { WB, A } = setup();
  const html = WB.views.adm('colaboradores');
  const comCpf = A.colecao('colaboradores').find((c) => c.cpf);
  assert.ok(comCpf, 'a semente tem CPF');
  assert.ok(html.includes('data-adm-col="colaboradores|cpf"'), 'CPF está no seletor de colunas');
  assert.ok(!html.includes(comCpf.cpf), 'CPF não aparece na planilha antes de ser marcado');

  A.definirColunas('colaboradores', ['nome', 'cpf']);
  assert.ok(WB.views.adm('colaboradores').includes(comCpf.cpf), 'marcada, a coluna aparece');
});

/* ================================================================= filtros */

test('O filtro recorta a planilha e fica guardado entre aberturas', () => {
  const { WB, A, mem } = setup();
  const total = A.colecao('contratos').length;
  A.definirFiltro('contratos', 'status', 'vigente');
  const html = WB.views.adm('contratos');
  const vigentes = A.colecao('contratos').filter((c) => c.status === 'vigente').length;
  assert.ok(vigentes < total, 'o filtro tem o que recortar');
  assert.ok(html.includes(vigentes + ' de ' + total + ' registros'), 'a contagem mostra o recorte');

  // Reabrir a página: o recorte continua.
  const outra = setup(mem);
  assert.equal(outra.A.filtros('contratos').status, 'vigente');
  outra.A.limparFiltros('contratos');
  assert.ok(outra.WB.views.adm('contratos').includes(total + ' registros'));
});

/* ============================================================ colunas novas */

test('Coluna criada aparece na planilha e o valor sobrevive à exclusão dela', () => {
  const { WB, A } = setup();
  const nova = A.criarColuna('bens', 'Centro de custo');
  assert.ok(nova && nova.k.startsWith('x_'));
  assert.ok(WB.views.adm('bens').includes(nova.titulo), 'a coluna nova entra no seletor');

  const bem = A.colecao('bens')[0];
  bem.extras[nova.k] = 'CC-42';
  A.gravar('bens', bem);
  A.definirColunas('bens', ['descricao', nova.k]);
  assert.ok(WB.views.adm('bens').includes('CC-42'), 'o valor digitado aparece');

  A.excluirColuna('bens', nova.k);
  assert.ok(!WB.views.adm('bens').includes(nova.titulo), 'excluída, some da planilha');
  assert.equal(A.registro('bens', bem.id).extras[nova.k], 'CC-42', 'o valor continua guardado');
});

/* ================================================================ ERP Omie */

test('Sem link cadastrado, o item do ERP na lateral leva para a tela do ERP', () => {
  const { WB } = setup();
  assert.equal(WB.adm.omie(), '');
  const itens = WB.operacao('grupo').itens();
  const adm = itens.find((r) => r.id === 'grupo-adm');
  const erp = adm.itens[0];
  assert.equal(erp.rota, 'erp');
  assert.ok(!erp.externo, 'sem endereço não há atalho externo');
  assert.ok(WB.views.erp().includes('data-acao="adm-omie"'), 'a tela oferece cadastrar o link');
});

test('Com link cadastrado, o item vira atalho externo e a tela abre o ERP', () => {
  const { WB } = setup();
  WB.adm.definirOmie('app.omie.com.br/entrar');
  assert.equal(WB.adm.omie(), 'https://app.omie.com.br/entrar');

  for (const op of ['grupo', 'weinc']) {
    const ramo = WB.operacao(op).itens().find((r) => r.nome === 'Administrativo');
    const erp = ramo.itens[0];
    assert.equal(erp.externo, 'https://app.omie.com.br/entrar', op + ': atalho direto');
    assert.ok(!erp.rota, op + ': atalho externo não é rota do portal');
  }

  const tela = WB.views.erp();
  assert.ok(tela.includes('href="https://app.omie.com.br/entrar"') && tela.includes('target="_blank"'));

  // Endereço que não é http(s) é recusado e não fica guardado.
  WB.adm.definirOmie('javascript:alert(1)');
  assert.equal(WB.adm.omie(), '');
});
