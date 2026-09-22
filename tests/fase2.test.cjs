/* Fase 2 — WeInvest e Nós Gastronomia.
   Cobre o que o esboço define como regra central: conversão de lead, vínculos
   entre registros, separação entre VGV / valor negociado / comissão, carteira
   preexistente × compras, contadores do menu, cálculo de margem e CMV,
   persistência com migração e o recorte de confidencialidade.

   Lógica pura: o que depende de DOM renderizado (popups, linhas dinâmicas,
   validação de formulário) está em tests/verificacao.html. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const js = path.join(__dirname, '../assets/js');

const ARQUIVOS = ['data.js', 'ui.js', 'charts.js', 'views.js', 'forms.js',
  'fase2-data.js', 'fase2-forms.js', 'fase2-views.js'];

/** Ambiente mínimo. `memoria` é compartilhável entre dois setups, que é como
    se simula "fechar e reabrir a página". */
function setup(memoria) {
  const mem = memoria || new Map();
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
  return { WB: ctx.window.WB, F2: ctx.window.WB.fase2, mem, ctx };
}

/* ====================================================== estrutura e rotas */

test('Os arquivos da Fase 2 têm sintaxe válida e não quebram o namespace WB', () => {
  const { WB, F2 } = setup();
  assert.ok(F2, 'WB.fase2 existe');
  // A Fase 1 continua inteira.
  for (const k of ['demandas', 'projetos', 'clientes', 'solicitacoes', 'governanca']) {
    assert.ok(Array.isArray(WB.data[k]) || typeof WB.data[k] === 'object', k + ' preservado');
  }
  assert.ok(Array.isArray(WB.data.wi.leads) && Array.isArray(WB.data.nos.itens));
});

test('As rotas e os ramos de navegação das duas operações estão registrados', () => {
  const { F2 } = setup();
  assert.ok(typeof F2.rotas.wi === 'function' && typeof F2.rotas.nos === 'function');
  const nav = F2.nav();
  // deepEqual não serve: os objetos nascem em outro realm do vm.
  assert.equal(nav.length, 2);
  assert.equal(nav[0].id, 'weinvest');
  assert.equal(nav[1].id, 'nosgastronomia');

  const rotas = [];
  (function varrer(itens) {
    itens.forEach((i) => (i.itens ? varrer(i.itens) : rotas.push(i.rota)));
  })(nav);

  // Cada destino da WeInvest e da Nós pedido nas fotos tem tela.
  for (const r of ['wi/dash/geral', 'wi/dash/clientes', 'wi/dash/performance', 'wi/crm',
    'wi/clientes', 'wi/leads', 'wi/ativos', 'wi/parceiros', 'wi/negocios',
    'wi/explorar/terrenos', 'wi/explorar/conexoes', 'wi/explorar/atencao',
    'nos/menu', 'nos/atendimentos/reclamacoes', 'nos/estoque',
    'nos/dash/ranking', 'nos/dash/cmv', 'nos/dash/equipe']) {
    assert.ok(rotas.indexOf(r) >= 0, 'ramo aponta para ' + r);
  }
  // E nenhum ramo aponta para lugar nenhum.
  rotas.forEach((r) => assert.ok(r && r.length, 'ramo sem rota: ' + r));
});

test('Toda rota nova devolve HTML, inclusive para id inexistente', () => {
  const { F2 } = setup();
  const casos = [
    ['wi', ['leads']], ['wi', ['clientes']], ['wi', ['cliente', 'WIC-0001']],
    ['wi', ['cliente', 'nao-existe']], ['wi', ['ativos']], ['wi', ['ativo', 'WIA-0001']],
    ['wi', ['parceiros']], ['wi', ['parceiro', 'WIP-0001']], ['wi', ['negocios']],
    ['wi', ['negocio', 'WIN-0001']], ['wi', ['crm']], ['wi', ['dash', 'geral']],
    ['wi', ['dash', 'clientes']], ['wi', ['dash', 'performance']],
    ['wi', ['explorar', 'terrenos']], ['wi', ['explorar', 'comparacao']],
    ['wi', ['explorar', 'conexoes']], ['wi', ['explorar', 'agentes']], ['wi', ['explorar', 'atencao']],
    ['nos', ['menu']], ['nos', ['menu', 'bebida']], ['nos', ['item', 'NOSI-0001']],
    ['nos', ['item', 'nao-existe']], ['nos', ['atendimentos', 'reclamacoes']],
    ['nos', ['atendimentos', 'elogios']], ['nos', ['atendimento', 'NOSA-0001']],
    ['nos', ['dash', 'geral']], ['nos', ['dash', 'clientes']], ['nos', ['dash', 'equipe']],
    ['nos', ['dash', 'ranking']], ['nos', ['dash', 'cmv']], ['nos', ['estoque']]
  ];
  casos.forEach(([raiz, partes]) => {
    const html = F2.rotas[raiz](partes);
    assert.equal(typeof html, 'string', raiz + '/' + partes.join('/'));
    assert.ok(html.length > 60, raiz + '/' + partes.join('/') + ' devolveu tela vazia');
  });
});

test('O contexto da faixa superior segue a rota, não a empresa do usuário', () => {
  const { F2 } = setup();
  assert.equal(F2.empresaDaRota('wi', ['clientes']), 'weinvest');
  assert.equal(F2.empresaDaRota('nos', ['menu']), 'nos');
  assert.equal(F2.empresaDaRota('governanca', ['metas', 'weinvest']), 'weinvest');
  assert.equal(F2.empresaDaRota('clientes', ['nos']), 'nos');
  assert.equal(F2.empresaDaRota('clientes', ['grupo']), null);
  assert.equal(F2.empresaDaRota('demandas', []), null);
});

/* =================================================== conversão de lead */

function novoNegocio(F2, WB, dados) {
  return Object.assign({
    id: F2.novoId('WIN', WB.data.wi.negocios),
    clienteId: null, leadId: null, clienteRepresentante: '', ativoRepresentante: '',
    responsavel: 'u7', semParceiro: true, parceiros: [], situacao: 'negociacao',
    valorNegociado: null, vgv: null, unidades: 1,
    comissaoBrutaValor: null, comissaoBrutaPct: null, comissaoLiquidaValor: null,
    comissoes: [], formato: '', contrato: '', valorRecebido: null, dataFechamento: '',
    observacoes: '', criadoEm: WB.d(0), atualizadoEm: WB.d(0)
  }, dados);
}

test('Registrar uma venda converte o lead em cliente e preserva o vínculo', () => {
  const { WB, F2 } = setup();
  const lead = F2.lead('WIL-0001');
  assert.equal(lead.status, 'qualificado');
  assert.equal(lead.clienteId, null);
  const antes = WB.data.wi.clientes.length;

  const n = novoNegocio(F2, WB, {
    leadId: lead.id, ativoId: 'WIA-0004', situacao: 'vendido',
    valorNegociado: 950000, vgv: 980000, dataFechamento: WB.d(-1)
  });
  F2.aplicarNegocio(n);
  F2.gravar('wi.negocios', n);

  assert.equal(WB.data.wi.clientes.length, antes + 1, 'um cliente novo');
  assert.equal(lead.status, 'convertido');
  assert.ok(lead.clienteId, 'lead aponta para o cliente');
  assert.equal(n.clienteId, lead.clienteId, 'negócio aponta para o mesmo cliente');

  const cliente = F2.cliente(lead.clienteId);
  assert.equal(cliente.nome, lead.nome);
  assert.equal(cliente.leadId, lead.id, 'o cliente lembra de onde veio');
  // O histórico do lead não se perde na conversão.
  assert.ok(cliente.historico.interacoes.some((i) => i.texto.indexOf(lead.id) >= 0));
  assert.ok(cliente.historico.interacoes.some((i) => i.texto.indexOf(lead.observacoes) >= 0));
});

test('Salvar o mesmo negócio de novo não duplica cliente, conversão nem carteira', () => {
  const { WB, F2 } = setup();
  const n = novoNegocio(F2, WB, {
    leadId: 'WIL-0001', ativoId: 'WIA-0004', situacao: 'vendido',
    valorNegociado: 950000, vgv: 980000, dataFechamento: WB.d(-1)
  });
  F2.aplicarNegocio(n);
  F2.gravar('wi.negocios', n);

  const clientes = WB.data.wi.clientes.length;
  const negocios = WB.data.wi.negocios.length;
  const carteira = F2.cliente(n.clienteId).carteira.length;

  // Três novas gravações do mesmo registro — é o que acontece quando alguém
  // reabre o negócio e clica em salvar.
  for (let i = 0; i < 3; i++) { F2.aplicarNegocio(n); F2.gravar('wi.negocios', n); }

  assert.equal(WB.data.wi.clientes.length, clientes, 'nenhum cliente a mais');
  assert.equal(WB.data.wi.negocios.length, negocios, 'nenhum negócio a mais');
  assert.equal(F2.cliente(n.clienteId).carteira.length, carteira, 'nenhuma linha de carteira a mais');
  assert.equal(WB.data.wi.leads.filter((l) => l.id === 'WIL-0001').length, 1);
});

test('Negócio em negociação não converte lead, não vende o ativo e não entra no VGV', () => {
  const { WB, F2 } = setup();
  const lead = F2.lead('WIL-0004');
  const ativo = F2.ativo('WIA-0004');
  const vendasAntes = F2.vendas().length;

  const n = novoNegocio(F2, WB, {
    leadId: lead.id, ativoId: ativo.id, situacao: 'negociacao', valorNegociado: 900000, vgv: 980000
  });
  const efeitos = F2.aplicarNegocio(n);
  F2.gravar('wi.negocios', n);

  assert.equal(efeitos.length, 0, 'nenhum efeito colateral');
  assert.equal(lead.status, 'novo');
  assert.equal(lead.clienteId, null);
  assert.equal(ativo.status, 'disponivel');
  assert.equal(F2.vendas().length, vendasAntes, 'não conta como venda');
});

test('Venda atualiza o ativo e registra a compra na carteira com a origem', () => {
  const { WB, F2 } = setup();
  const n = novoNegocio(F2, WB, {
    clienteId: 'WIC-0002', ativoId: 'WIA-0004', situacao: 'vendido',
    valorNegociado: 940000, vgv: 980000, dataFechamento: WB.d(0)
  });
  F2.aplicarNegocio(n);
  F2.gravar('wi.negocios', n);

  assert.equal(F2.ativo('WIA-0004').status, 'vendido');
  const linha = F2.cliente('WIC-0002').carteira.find((c) => c.ativoId === 'WIA-0004');
  assert.ok(linha, 'entrou na carteira');
  assert.equal(linha.negocioId, n.id, 'a linha sabe que veio de uma compra');
});

/* ================================ carteira × compras × VGV × comissão */

test('Carteira preexistente não vira compra, VGV nem comissão', () => {
  const { WB, F2 } = setup();
  const c = F2.cliente('WIC-0001');
  // Duas linhas na carteira: uma preexistente, uma vinda de compra.
  assert.equal(c.carteira.length, 2);
  assert.equal(c.carteira.filter((x) => !x.negocioId).length, 1, 'uma preexistente');
  assert.equal(c.carteira.filter((x) => x.negocioId).length, 1, 'uma comprada pela WeInvest');

  const r = F2.resumoCliente('WIC-0001');
  const vendas = F2.vendas().filter((n) => n.clienteId === 'WIC-0001');
  // O resumo sai só dos negócios vendidos, nunca da carteira.
  assert.equal(r.unidades, vendas.reduce((s, n) => s + (n.unidades || 1), 0));
  assert.equal(r.vgvComprado, vendas.reduce((s, n) => s + n.vgv, 0));
  assert.notEqual(r.vgvComprado, r.valorNegociado, 'VGV e valor negociado são grandezas distintas');

  // Acrescentar um imóvel só na carteira não mexe em nenhum indicador.
  c.carteira.push({ id: 'CT-9999', ativoId: null, descricao: 'Chácara herdada', status: 'Possui', observacoes: '' });
  const depois = F2.resumoCliente('WIC-0001');
  assert.equal(depois.vgvComprado, r.vgvComprado);
  assert.equal(depois.unidades, r.unidades);
});

test('Cliente sem venda devolve "sem dados", não zero', () => {
  const { F2 } = setup();
  const r = F2.resumoCliente('nao-existe');
  assert.equal(r.vgvComprado, null);
  assert.equal(r.unidades, null);
  assert.equal(r.vendas, 0);
});

test('Comissão prevista, recebida e líquida são coisas diferentes', () => {
  const { F2 } = setup();
  const n = F2.negocio('WIN-0001');
  const c = F2.resumoComissoes(n);
  assert.equal(c.prevista, 53400 + 26700);
  assert.equal(c.recebida, 53400, 'só a linha marcada como recebida');
  assert.equal(c.aReceber, 26700);
  assert.equal(c.bruta, 89000);
  assert.equal(c.liquida, 80100);
  assert.notEqual(c.bruta, c.liquida);
  assert.equal(c.excedeBruta, false);

  // Comissão líquida não informada continua nula: nada é deduzido.
  const n2 = F2.negocio('WIN-0002');
  assert.equal(F2.resumoComissoes(n2).liquida, null);
});

test('Rateio maior que a comissão bruta é avisado, não corrigido', () => {
  const { F2 } = setup();
  const n = F2.negocio('WIN-0001');
  const original = JSON.parse(JSON.stringify(n.comissoes));
  n.comissoes.push({ id: 'X', beneficiario: 'outro', parceiroId: null, valor: 50000, percentual: null, recebido: false, dataRecebimento: '' });
  const c = F2.resumoComissoes(n);
  assert.equal(c.excedeBruta, true);
  assert.equal(c.prevista, 130100, 'o sistema não ajusta o valor');
  assert.equal(n.comissaoBrutaValor, 89000, 'a bruta continua como estava');
  n.comissoes = original;
});

test('Percentual sempre incide sobre o valor negociado e nunca divide por zero', () => {
  const { F2 } = setup();
  assert.equal(F2.percentualSobre(89000, 1780000).toFixed(2), '5.00');
  assert.equal(F2.percentualSobre(100, 0), null);
  assert.equal(F2.percentualSobre(null, 1000), null);
  assert.equal(F2.percentualSobre(100, null), null);
});

test('Valor a receber sai de negociado menos recebido, e some se faltar campo', () => {
  const { F2 } = setup();
  assert.equal(F2.aReceber(F2.negocio('WIN-0001')), 1780000 - 534000);
  assert.equal(F2.aReceber(F2.negocio('WIN-0003')), null);
});

/* ==================================================== parceiro e ativos */

test('Performance do parceiro sai dos registros, com denominadores declarados', () => {
  const { F2 } = setup();
  const p = F2.performanceParceiro('WIP-0002');
  assert.equal(p.negocios, 1);
  assert.equal(p.vendas, 1);
  assert.equal(p.conversao, 100);
  assert.equal(p.volumeGerado, 1780000);
  assert.equal(p.vgvVendido, 1850000);
  assert.equal(p.angariacoes, 1, 'ativo cuja origem é este parceiro');
  assert.equal(p.comissoesPrevistas, 26700);
  assert.equal(p.comissoesRecebidas, 0, 'a linha dele ainda não foi recebida');

  // Parceiro sem negócio não vira zero enganoso.
  const inativo = F2.performanceParceiro('WIP-0003');
  assert.equal(inativo.conversao, null);
  assert.equal(inativo.volumeGerado, null);
  assert.equal(inativo.vgvVendido, null);
});

test('Ativo confidencial some das listas e da busca de quem não pode ver', () => {
  const { WB, F2 } = setup();
  const confidencial = F2.ativo('WIA-0002');
  assert.equal(confidencial.confidencial, true);

  assert.equal(F2.podeVerAtivo(confidencial, 'analista'), false);
  assert.equal(F2.podeVerAtivo(confidencial, 'diretoria'), true);

  WB.data.usuarioAtual = 'u7'; // analista
  assert.equal(F2.ativosVisiveis().some((a) => a.id === 'WIA-0002'), false);
  const grupoAtivos = F2.buscar('Santa Vera').find((g) => g.nome === 'WeInvest — ativos');
  assert.equal(grupoAtivos, undefined, 'a busca respeita o mesmo recorte');

  WB.data.usuarioAtual = 'u3'; // diretoria
  assert.equal(F2.ativosVisiveis().some((a) => a.id === 'WIA-0002'), true);
  assert.ok(F2.buscar('Santa Vera').find((g) => g.nome === 'WeInvest — ativos'));
});

/* ================================================ Nós Gastronomia */

test('Margem e CMV tratam preço zero e dado ausente como "sem dado"', () => {
  const { F2 } = setup();
  const cheio = F2.margemItem({ precoVenda: 168, custoEstimado: 54 });
  assert.equal(cheio.margem, 114);
  assert.equal(cheio.margemPct.toFixed(2), '67.86');
  assert.equal(cheio.cmvPct.toFixed(2), '32.14');

  const semPreco = F2.margemItem({ precoVenda: null, custoEstimado: 10 });
  assert.equal(semPreco.margem, null);
  assert.equal(semPreco.cmvPct, null);

  const precoZero = F2.margemItem({ precoVenda: 0, custoEstimado: 6 });
  assert.equal(precoZero.margem, -6);
  assert.equal(precoZero.margemPct, null, 'não vira -Infinity nem 0%');
  assert.equal(precoZero.cmvPct, null);

  const semCusto = F2.margemItem({ precoVenda: 48, custoEstimado: null });
  assert.equal(semCusto.margem, null);
});

test('O CMV médio ignora item sem dado e não conta descontinuado', () => {
  const { WB, F2 } = setup();
  const c = F2.cmvCardapio();
  const ativos = WB.data.nos.itens.filter((i) => i.status !== 'descontinuado');
  const comDados = ativos.filter((i) => F2.margemItem(i).cmvPct != null);
  assert.equal(c.itens, ativos.length);
  assert.equal(c.comDados, comDados.length);
  assert.ok(comDados.length < ativos.length, 'há item sem preço na base de demonstração');
  const esperado = comDados.reduce((s, i) => s + F2.margemItem(i).cmvPct, 0) / comDados.length;
  assert.equal(c.media.toFixed(6), esperado.toFixed(6));
  // Descontinuado fora da conta.
  assert.equal(ativos.some((i) => i.id === 'NOSI-0004'), false);
});

test('Elogios e reclamações alimentam os contadores do item certo', () => {
  const { WB, F2 } = setup();
  let c = F2.contadoresItem('NOSI-0001');
  assert.equal(c.elogios, 1);
  assert.equal(c.reclamacoes, 1);
  assert.equal(c.reclamacoesAbertas, 0, 'a reclamação deste item está resolvida');

  WB.data.nos.atendimentos.unshift({
    id: 'NOSA-9001', tipo: 'elogio', clienteNome: 'Teste', clienteId: null,
    dataOcorrido: WB.d(0), canal: 'Presencial', categoria: '', descricao: 'Elogio de teste',
    itemId: 'NOSI-0001', funcionarioId: '', gravidade: '', responsavelResposta: '',
    acaoTomada: '', status: '', dataResolucao: '', registradoPor: 'u6', criadoEm: WB.d(0)
  });
  c = F2.contadoresItem('NOSI-0001');
  assert.equal(c.elogios, 2, 'o contador segue o registro');
  assert.equal(c.reclamacoes, 1, 'elogio não conta como reclamação');

  // Reclamação aberta é contada como aberta.
  assert.equal(F2.contadoresItem('NOSI-0002').reclamacoesAbertas, 1);
  assert.equal(F2.contadoresItem('nao-existe').elogios, 0);
});

test('A reclamação percorre aberta → em tratativa → resolvida sem perder o item', () => {
  const { F2 } = setup();
  const r = F2.atendimento('NOSA-0003');
  assert.equal(r.status, 'aberta');
  r.status = 'tratativa'; r.responsavelResposta = 'u6';
  F2.gravar('nos.atendimentos', r);
  assert.equal(F2.atendimento('NOSA-0003').status, 'tratativa');
  r.status = 'resolvida'; r.acaoTomada = 'Confirmação por escrito enviada.'; r.dataResolucao = '2026-09-21';
  F2.gravar('nos.atendimentos', r);
  const final = F2.atendimento('NOSA-0003');
  assert.equal(final.status, 'resolvida');
  assert.equal(final.id, 'NOSA-0003', 'o mesmo registro, não uma cópia');
});

test('Descontinuar preserva o cadastro e os vínculos; excluir remove o cadastro', () => {
  const { WB, F2 } = setup();
  const item = F2.item('NOSI-0001');
  const vinculosAntes = WB.data.nos.atendimentos.filter((a) => a.itemId === item.id).length;
  assert.ok(vinculosAntes > 0);

  item.status = 'descontinuado';
  item.descontinuadoEm = WB.d(0);
  F2.gravar('nos.itens', item);
  assert.ok(F2.item('NOSI-0001'), 'o cadastro continua existindo');
  assert.equal(WB.data.nos.atendimentos.filter((a) => a.itemId === 'NOSI-0001').length, vinculosAntes);
  assert.equal(F2.contadoresItem('NOSI-0001').elogios, 1, 'contador preservado');

  F2.reativarItem('NOSI-0001');
  assert.equal(F2.item('NOSI-0001').status, 'ativo');
  assert.equal(F2.item('NOSI-0001').descontinuadoEm, '');

  assert.equal(F2.remover('nos.itens', 'NOSI-0001'), true);
  assert.equal(F2.item('NOSI-0001'), null, 'exclusão definitiva é outra coisa');
  assert.equal(F2.remover('nos.itens', 'NOSI-0001'), false, 'remover de novo não quebra');
});

test('Ranking de pedidos fica sem dados enquanto não houver pedidos', () => {
  const { WB, F2 } = setup();
  assert.equal(WB.data.nos.pedidos.length, 0);
  assert.equal(F2.rankingPedidos(), null, 'sem fonte, sem ranking');

  // Elogio não é demanda: registrar elogios não faz o ranking aparecer.
  WB.data.nos.atendimentos.push({ id: 'X', tipo: 'elogio', itemId: 'NOSI-0002', dataOcorrido: WB.d(0), clienteNome: 'a', canal: 'Presencial', descricao: 'b' });
  assert.equal(F2.rankingPedidos(), null);

  // Com pedidos, o ranking existe e sai ordenado.
  WB.data.nos.pedidos.push({ itemId: 'NOSI-0002', quantidade: 5 }, { itemId: 'NOSI-0001', quantidade: 9 });
  const r = F2.rankingPedidos();
  assert.equal(r.length, 2);
  assert.equal(r[0].item.id, 'NOSI-0001');
  assert.equal(r[0].quantidade, 9);
});

/* ============================================ persistência e migração */

test('O que é cadastrado volta depois de recarregar a página', () => {
  const memoria = new Map();
  const a = setup(memoria);
  const item = {
    id: a.F2.novoId('NOSI', a.WB.data.nos.itens), tipo: 'bebida', nome: 'Chá gelado de hibisco',
    categoria: 'Sem álcool', descricao: '', foto: '', servePessoas: null, tempoPreparo: null,
    ingredientes: 'Hibisco, limão.', restricoes: ['Vegano'], precoVenda: 18, custoEstimado: 4,
    disponibilidade: 'Sazonal', periodos: ['Tarde'], status: 'ativo', responsavel: 'u6',
    criadoEm: a.WB.d(0), descontinuadoEm: '', motivoDescontinuacao: ''
  };
  a.F2.gravar('nos.itens', item);

  const lead = {
    id: a.F2.novoId('WIL', a.WB.data.wi.leads), nome: 'Teste Persistência', telefone: '',
    email: '', canal: 'Site', categoria: 'We Coast', dataEntrada: a.WB.d(0),
    status: 'novo', responsavel: 'u7', observacoes: '', clienteId: null
  };
  a.F2.gravar('wi.leads', lead);

  // Nova sessão, mesmo armazenamento.
  const b = setup(memoria);
  b.F2.carregar();
  assert.ok(b.F2.item(item.id), 'o item do menu voltou');
  assert.equal(b.F2.item(item.id).nome, 'Chá gelado de hibisco');
  assert.ok(b.F2.lead(lead.id), 'o lead voltou');
  // E as sementes continuam lá.
  assert.ok(b.F2.item('NOSI-0001'));
  assert.ok(b.F2.lead('WIL-0001'));
  // IDs não se repetem entre sessões.
  assert.notEqual(b.F2.novoId('NOSI', b.WB.data.nos.itens), item.id);
});

test('Edição gravada vence a semente e não cria um segundo registro', () => {
  const memoria = new Map();
  const a = setup(memoria);
  const item = a.F2.item('NOSI-0002');
  item.precoVenda = 129;
  a.F2.gravar('nos.itens', item);
  const total = a.WB.data.nos.itens.length;

  const b = setup(memoria);
  b.F2.carregar();
  assert.equal(b.WB.data.nos.itens.filter((i) => i.id === 'NOSI-0002').length, 1);
  assert.equal(b.F2.item('NOSI-0002').precoVenda, 129);
  assert.equal(b.WB.data.nos.itens.length, total);
});

test('Registro gravado sem os campos novos é migrado em vez de quebrar a tela', () => {
  const memoria = new Map();
  const a = setup(memoria);
  // Formato antigo: só o essencial, sem carteira, perfil, histórico nem vínculos.
  a.WB.store.set('f2.wi.clientes', {
    v: 1,
    itens: [{ id: 'WIC-9001', nome: 'Cliente Antigo', categoria: 'pf', responsavel: 'u7' }]
  });
  // E uma coleção gravada como array puro, sem o envelope de versão.
  a.WB.store.set('f2.wi.leads', [{ id: 'WIL-9001', nome: 'Lead Antigo' }]);

  const b = setup(memoria);
  b.F2.carregar();

  const c = b.F2.cliente('WIC-9001');
  assert.ok(c, 'o registro antigo entrou');
  assert.equal(c.carteira.length, 0);
  assert.equal(c.vinculos.length, 0);
  assert.equal(c.perfil.objetivos.length, 0);
  assert.equal(c.perfil.ticketMin, null);
  assert.equal(c.historico.proximosPassos.length, 0);
  assert.equal(c.comprovacao.registrado, false);
  // E as telas que dependem desses campos continuam devolvendo HTML.
  assert.ok(b.F2.rotas.wi(['cliente', 'WIC-9001']).length > 60);
  assert.ok(b.F2.rotas.wi(['clientes']).length > 60);
  assert.equal(b.F2.resumoCliente('WIC-9001').vgvComprado, null);

  const l = b.F2.lead('WIL-9001');
  assert.ok(l, 'array puro também é aceito');
  assert.equal(l.status, 'novo');
  assert.equal(l.clienteId, null);
  assert.ok(b.F2.rotas.wi(['leads']).length > 60);
});

test('Cadastros da Fase 1 também voltam depois de recarregar', () => {
  const memoria = new Map();
  const a = setup(memoria);
  const antes = a.WB.data.clientes.length;
  // É exatamente o que WB.abrirLead faz ao salvar.
  const novo = { id: 'cTESTE1', nome: 'Lead da Fase 1', tipo: 'lead', empresa: 'weinc', produto: 'Bioma', origem: 'Indicação', valor: 0, etapa: 'Qualificação', responsavel: 'u5', desde: a.WB.d(0), telefone: '' };
  a.WB.data.clientes.unshift(novo);
  a.WB.store.push('clientes', novo);

  const b = setup(memoria);
  assert.equal(b.WB.data.clientes.length, antes, 'antes de carregar, só as sementes');
  b.F2.carregar();
  assert.equal(b.WB.data.clientes.length, antes + 1);
  assert.ok(b.WB.data.clientes.some((c) => c.id === 'cTESTE1'));
  // Carregar duas vezes não duplica.
  b.F2.carregar();
  assert.equal(b.WB.data.clientes.filter((c) => c.id === 'cTESTE1').length, 1);
});

test('localStorage indisponível não impede a aplicação de abrir', () => {
  const mem = new Map();
  const quebrado = {
    getItem() { throw new Error('bloqueado'); },
    setItem() { throw new Error('bloqueado'); }
  };
  function node() {
    return { innerHTML: '', dataset: {}, value: '', addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return node(); } };
  }
  const ctx = {
    window: {}, document: { readyState: 'loading', addEventListener() {}, getElementById() { return node(); }, createElement() { return node(); } },
    location: { hash: '#/home' }, localStorage: quebrado, setTimeout() {}, console
  };
  for (const f of ARQUIVOS) vm.runInNewContext(fs.readFileSync(path.join(js, f), 'utf8'), ctx, { filename: f });
  const F2 = ctx.window.WB.fase2;
  assert.doesNotThrow(() => F2.carregar());
  assert.doesNotThrow(() => F2.salvar('nos.itens'));
  assert.ok(F2.rotas.nos(['menu']).length > 60);
  assert.ok(mem.size === 0);
});

/* ======================================== telas compartilhadas e recortes */

test('A tela de clientes do grupo projeta as duas fontes, sem copiar registros', () => {
  const { WB, F2 } = setup();
  const unificado = F2.clientesUnificados();
  const wi = unificado.filter((c) => c.origemRegistro === 'weinvest');
  assert.ok(wi.length >= WB.data.wi.clientes.length);
  // Nenhum registro da WeInvest foi escrito na coleção da Fase 1.
  assert.equal(WB.data.clientes.some((c) => c.id.indexOf('WIC-') === 0), false);
  // Lead convertido não aparece duas vezes (uma como lead, outra como cliente).
  const convertido = WB.data.wi.leads.find((l) => l.status === 'convertido');
  assert.ok(convertido);
  assert.equal(unificado.filter((c) => c.id === convertido.id).length, 0);
  // Cada linha da WeInvest leva para a ficha completa.
  wi.forEach((c) => assert.ok(c.rota && c.rota.indexOf('#/wi/') === 0));
});

test('Governança aceita recorte por empresa sem perder a visão do grupo', () => {
  const { WB } = setup();
  const todas = WB.views.metas();
  const wi = WB.views.metas('weinvest');
  const desconhecida = WB.views.metas('nao-existe');
  assert.ok(todas.indexOf('Velocidade de vendas Bioma') >= 0);
  assert.equal(wi.indexOf('Velocidade de vendas Bioma'), -1, 'meta de outra empresa sai do recorte');
  assert.ok(wi.indexOf('Prazo de fechamento mensal') >= 0);
  assert.ok(wi.indexOf('Recorte por operação') >= 0);
  // Empresa inválida cai na visão completa, sem tela de erro.
  assert.equal(desconhecida.indexOf('Recorte por operação'), -1);
  assert.ok(desconhecida.indexOf('Velocidade de vendas Bioma') >= 0);
  // O mesmo vale para documentos.
  assert.ok(WB.views.processos('weinvest').indexOf('Procedimento de Fechamento Mensal') >= 0);
  assert.equal(WB.views.processos('weinvest').indexOf('Trilha de Argumentação'), -1);
});

test('A busca global encontra os registros das duas operações', () => {
  const { WB, F2 } = setup();
  assert.ok(F2.buscar('helena').some((g) => g.nome.indexOf('clientes') >= 0));
  assert.ok(F2.buscar('negroni').some((g) => g.nome === 'Nós — menu'));
  assert.ok(F2.buscar('risoto').some((g) => g.nome === 'Nós — menu'));
  assert.equal(F2.buscar('zzzznaoexiste').length, 0);
  // E a tela de busca junta tudo sem quebrar.
  const html = WB.views.busca('risoto');
  assert.ok(html.indexOf('Nós — menu') >= 0);
});

/* ======================================================= dados e opções */

test('As opções dizem se vieram da foto ou de decisão nossa', () => {
  const { F2 } = setup();
  assert.equal(F2.opcOrigem('ativoTipo'), 'transcrito');
  assert.equal(F2.opcOrigem('bebidaCategoria'), 'parcial');
  assert.equal(F2.opcOrigem('negocioSituacao'), 'suposto');
  // Opções riscadas na foto não entram como requisito.
  const tipos = F2.opc('ativoTipo');
  assert.equal(tipos.indexOf('Sala'), -1);
  assert.ok(tipos.indexOf('Cabana') >= 0);
  assert.equal(F2.opc('parceiroTipo').indexOf('Proprietário'), -1);
  // Categoria e tipo/perfil do parceiro são campos separados.
  assert.equal(F2.opc('parceiroCategoria').length, 2);
  assert.ok(F2.opc('parceiroTipo').length > 2);
  assert.equal(F2.rotulo('ativoStatus', 'vendido'), 'Vendido');
  assert.equal(F2.rotulo('ativoStatus', 'inexistente'), 'inexistente');
});

test('Nomes de exibição respeitam PF e PJ', () => {
  const { F2 } = setup();
  assert.equal(F2.nomeCliente(F2.cliente('WIC-0001')), 'Construtora Horizonte Ltda.');
  assert.equal(F2.nomeCliente(F2.cliente('WIC-0002')), 'Helena Sarmento');
  assert.equal(F2.nomeCliente(null), '—');
  assert.equal(F2.nomeParceiro(F2.parceiro('WIP-0002')), 'Tiago Moretti');
  assert.equal(F2.nomeParceiro(F2.parceiro('WIP-0001')), 'Imobiliária Alvorada Ltda.');
});

test('Os dados de demonstração não usam documento nem contato real', () => {
  const { WB } = setup();
  const texto = JSON.stringify([WB.data.wi, WB.data.nos]);
  // CPF de exemplo é sempre a máscara zerada; e-mails ficam em domínio reservado.
  (texto.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/g) || []).forEach((cpf) =>
    assert.equal(cpf, '000.000.000-00'));
  (texto.match(/[\w.]+@[\w.]+/g) || []).forEach((email) =>
    assert.ok(/@exemplo\.test$/.test(email), 'e-mail fora do domínio reservado: ' + email));
  // Telefones ficam mascarados.
  (texto.match(/\(\d{2}\)\s?9\d[\dx]{3}-\d{4}/g) || []).forEach((tel) =>
    assert.ok(tel.indexOf('x') >= 0, 'telefone sem máscara: ' + tel));
});

/* ========================================= portal por operação
   Cada operação do grupo é um portal próprio. Quem trabalha no restaurante
   abre o WeBrain e vê o restaurante; admin e diretoria veem todas e trocam
   pelo seletor. O recorte é de interface — estes testes cobrem a navegação e a
   recusa de rota, não autorização, que não existe neste protótipo. */

/** Monta a aplicação inteira (com `app.js`) e devolve a lateral desenhada. */
function montarApp(hash, usuario, memoria) {
  const mem = memoria || new Map();
  function node() {
    return {
      innerHTML: '', scrollTop: 0, hidden: false, dataset: {}, value: '',
      addEventListener() {}, removeAttribute() {}, setAttribute() {}, focus() {},
      querySelectorAll() { return []; }, querySelector() { return node(); }
    };
  }
  const nos = new Map();
  const document = {
    readyState: 'loading', addEventListener() {},
    getElementById(id) { if (!nos.has(id)) nos.set(id, node()); return nos.get(id); },
    createElement() { return node(); }, querySelector() { return null; }
  };
  const ctx = {
    window: { matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }) },
    document, location: { hash },
    localStorage: { getItem: (k) => mem.get(k), setItem: (k, v) => mem.set(k, v) },
    setTimeout() {}, console
  };
  for (const f of ARQUIVOS.concat(['operacoes.js', 'app.js'])) {
    vm.runInNewContext(fs.readFileSync(path.join(js, f), 'utf8'), ctx, { filename: f });
  }
  const WB = ctx.window.WB;
  if (usuario) WB.data.usuarioAtual = usuario;
  WB.renderSidebar();
  return {
    WB, ctx, mem, html: nos.get('sidebar').innerHTML,
    redesenhar() { WB.renderSidebar(); return nos.get('sidebar').innerHTML; }
  };
}

const ramos = (html) => (html.match(/data-nav-branch="([^"]+)"/g) || [])
  .map((m) => m.slice('data-nav-branch="'.length, -1));

test('Quem é de uma operação abre o portal dela, e só dela', () => {
  // Juliana Prado é head da Nós Gastronomia — não é admin nem diretoria.
  const s = montarApp('#/home', 'u6');
  assert.equal(s.WB.eu().empresa, 'nos');
  assert.equal(s.WB.veTodasOperacoes(), false);

  const visiveis = s.WB.operacoesVisiveis();
  assert.equal(visiveis.length, 1);
  assert.equal(visiveis[0], 'nos');
  assert.equal(s.WB.operacaoAtual(), 'nos');

  const meus = ramos(s.html);
  assert.ok(meus.some((r) => r.indexOf('nos-') === 0), 'tem os ramos da Nós');
  assert.equal(meus.some((r) => r.indexOf('wi-') === 0), false, 'nenhum ramo da WeInvest');
  assert.equal(meus.some((r) => r.indexOf('grupo-') === 0), false, 'nenhum ramo do Grupo We');
  assert.equal(meus.indexOf('Comercial') >= 0, false, 'nenhum ramo da We Incorporadora');

  // A base comum continua: o trabalho da pessoa não pertence a uma operação.
  ['#/home', '#/demandas', '#/solicitacoes', '#/indicadores'].forEach((r) =>
    assert.ok(s.html.indexOf('href="' + r + '"') >= 0, r + ' na base comum'));

  // Sem seletor, mas com o nome da operação visível.
  assert.equal(s.html.indexOf('data-operacao') >= 0, false, 'não pode trocar de operação');
  assert.ok(s.html.indexOf('sb__op--fixa') >= 0);
  assert.ok(s.html.indexOf('Nós Gastronomia') >= 0);
});

test('Analista da WeInvest vê a WeInvest, não a Nós nem o Grupo', () => {
  const s = montarApp('#/home', 'u7');
  assert.equal(s.WB.operacaoAtual(), 'weinvest');
  const meus = ramos(s.html);
  assert.ok(meus.some((r) => r.indexOf('wi-') === 0));
  assert.equal(meus.some((r) => r.indexOf('nos-') === 0), false);

  assert.equal(s.WB.podeVerRota('nos', ['menu']), false);
  assert.equal(s.WB.podeVerRota('wi', ['negocios']), true);
  assert.equal(s.WB.podeVerRota('dash', ['grupo']), false);
  // Destino compartilhado não é bloqueado: existe em mais de uma operação.
  assert.equal(s.WB.podeVerRota('atas', ['todas']), true);
  assert.equal(s.WB.podeVerRota('projetos', []), true);
});

test('Admin e diretoria enxergam todas as operações e trocam pelo seletor', () => {
  const s = montarApp('#/home', 'u1'); // Alex Souza, admin, We Incorporadora
  assert.equal(s.WB.veTodasOperacoes(), true);
  const visiveis = s.WB.operacoesVisiveis();
  ['grupo', 'weinc', 'weinvest', 'nos', 'casawe'].forEach((id) =>
    assert.ok(visiveis.indexOf(id) >= 0, id + ' visível'));
  // Abre na própria operação, não no Grupo We.
  assert.equal(s.WB.operacaoAtual(), 'weinc');
  assert.ok(s.html.indexOf('data-operacao') >= 0, 'tem seletor de operação');
  assert.ok(ramos(s.html).indexOf('Comercial') >= 0, 'árvore da We Incorporadora');

  // Trocar de operação troca a árvore inteira.
  assert.equal(s.WB.definirOperacao('nos'), true);
  const depois = ramos(s.redesenhar());
  assert.ok(depois.some((r) => r.indexOf('nos-') === 0));
  assert.equal(depois.indexOf('Comercial') >= 0, false);
  assert.equal(s.WB.operacaoAtual(), 'nos');

  // Diretoria também.
  const d = montarApp('#/home', 'u3');
  assert.equal(d.WB.veTodasOperacoes(), true);
  assert.ok(d.html.indexOf('data-operacao') >= 0);
});

test('Ninguém consegue focar uma operação que não enxerga', () => {
  const s = montarApp('#/home', 'u6'); // Nós
  assert.equal(s.WB.definirOperacao('weinvest'), false);
  assert.equal(s.WB.operacaoAtual(), 'nos');
  // Nem gravando na marra no armazenamento.
  s.WB.store.set('operacao.u6', 'weinvest');
  assert.equal(s.WB.operacaoAtual(), 'nos', 'valor inválido guardado cai no padrão');
});

test('Rota de outra operação é recusada com explicação, não renderizada', () => {
  const s = montarApp('#/home', 'u6');
  const tela = s.WB.telaSemAcesso('wi', ['negocios']);
  assert.ok(tela.indexOf('outra operação') >= 0);
  assert.ok(tela.indexOf('WeInvest') >= 0, 'diz de quem é a tela');
  assert.ok(tela.indexOf('Nós Gastronomia') >= 0, 'diz qual é o acesso da pessoa');
  // E declara que o recorte é de interface, não autorização.
  assert.ok(tela.indexOf('não é autorização de servidor') >= 0);
});

test('A operação em foco fica guardada por pessoa', () => {
  const memoria = new Map();
  const a = montarApp('#/home', 'u1', memoria);
  a.WB.definirOperacao('weinvest');
  assert.equal(a.WB.operacaoAtual(), 'weinvest');

  // Outra sessão, mesmo navegador: o foco volta.
  const b = montarApp('#/home', 'u1', memoria);
  assert.equal(b.WB.operacaoAtual(), 'weinvest');

  // E é por pessoa: outro usuário não herda o foco.
  const c = montarApp('#/home', 'u6', memoria);
  assert.equal(c.WB.operacaoAtual(), 'nos');
});

test('Cada operação tem destino inicial próprio e árvore não vazia', () => {
  const { WB } = montarApp('#/home', 'u1');
  ['grupo', 'weinc', 'weinvest', 'nos', 'casawe'].forEach((id) => {
    const o = WB.operacao(id);
    assert.ok(o, id + ' registrada');
    assert.ok(o.nome && o.inicio, id + ' tem nome e início');
    assert.ok(o.itens().length > 0, id + ' tem ramos');
  });
  assert.equal(WB.operacao('weinvest').inicio, 'wi/dash/geral');
  assert.equal(WB.operacao('nos').inicio, 'nos/dash/geral');
  // A CasaWE não tem portal desenhado nas fotos, e isso fica declarado.
  assert.equal(WB.operacao('casawe').semDesenho, true);
});

test('Destino que aparece em dois lugares marca "página atual" uma vez só', () => {
  const s = montarApp('#/atas/todas', 'u1');
  assert.equal((s.html.match(/aria-current="page"/g) || []).length, 1);
  const t = montarApp('#/nos/menu', 'u6');
  assert.equal((t.html.match(/aria-current="page"/g) || []).length, 1);
  assert.ok(t.html.indexOf('href="#/nos/menu" aria-current="page"') >= 0);
});
