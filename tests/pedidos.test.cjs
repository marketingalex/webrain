/* Pedidos — segunda remessa de ajustes (22/09/2026): situações, filas de
   aprovação, coffee agora × agendado, edição que volta para análise, apagar
   que some para os dois lados, notificação, moeda e listas que crescem.
   Lógica pura sobre pedidos.js; o que depende do DOM real fica em
   tests/verificacao.html. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const js = path.join(__dirname, '../assets/js');

function setup() {
  const memoria = new Map();
  const ctx = {
    window: {}, document: { addEventListener() {}, getElementById() { return null; } },
    location: { hash: '#/home' },
    localStorage: { getItem: (k) => memoria.get(k), setItem: (k, v) => memoria.set(k, v) },
    setTimeout() {}
  };
  for (const f of ['data.js', 'ui.js', 'pedidos.js', 'forms.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(js, f), 'utf8'), ctx, { filename: f });
  }
  const WB = ctx.window.WB;
  WB.renderTopbar = () => {};
  return WB;
}
const como = (WB, id) => { WB.data.usuarioAtual = id; };
// Arrays criados dentro do vm têm outro protótipo: compara pelo conteúdo.
const igual = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);

test('P01 · três situações, e os nomes antigos caem na certa', () => {
  const WB = setup();
  const P = WB.pedidos;
  igual(P.STATUS.map((s) => s.id), ['em análise', 'confirmado', 'concluído']);
  assert.equal(P.normalizarStatus('aprovada'), 'confirmado');
  assert.equal(P.normalizarStatus('confirmada'), 'confirmado');
  assert.equal(P.normalizarStatus('paga'), 'concluído');
  assert.equal(P.normalizarStatus('atendida'), 'concluído');
  assert.equal(P.normalizarStatus('qualquer coisa'), 'em análise');
  assert.ok(P.selo('confirmado').includes('Confirmado · em andamento'));
});

test('P02 · evento vai só para o responsável escolhido no pedido', () => {
  const WB = setup();
  const P = WB.pedidos;
  como(WB, 'u5');
  const s = P.registrar({ tipo: 'evento', titulo: 'Jantar de parceiros', responsavel: 'u9', valores: { responsavelEvento: 'u9' } });
  assert.equal(s.status, 'em análise');
  igual(P.aprovadores(s), ['u9']);
  assert.ok(P.podeAprovar(s, 'u9'));
  assert.ok(!P.podeAprovar(s, 'u4'));
  assert.ok(P.podeAprovar(s, 'u1'), 'a administração vê tudo');
  const aviso = WB.minhasNotificacoes('u9')[0];
  assert.ok(aviso && aviso.texto.includes('Jantar de parceiros'), 'o responsável não foi avisado');
  assert.ok(!WB.minhasNotificacoes('u4').some((n) => n.texto.includes('Jantar de parceiros')), 'aviso vazou para quem não aprova');
});

test('P03 · coffee agora e coffee agendado caem em filas diferentes', () => {
  const WB = setup();
  const P = WB.pedidos;
  const agora = { tipo: 'coffe', valores: { quando: 'imediato' } };
  const agendado = { tipo: 'coffe', valores: { quando: 'agendar' } };
  assert.equal(P.filaDe(agora), 'coffe-agora');
  assert.equal(P.filaDe(agendado), 'coffe-agendado');
  assert.notEqual(JSON.stringify(P.aprovadores(agora)), JSON.stringify(P.aprovadores(agendado)));
});

test('P04 · para agora, só o que fica sempre pronto na casa', () => {
  const WB = setup();
  const P = WB.pedidos;
  const agora = P.cardapioPara('agora');
  assert.ok(agora.length >= 1);
  assert.ok(agora.every((c) => c.quando.includes('agora')));
  assert.ok(!agora.some((c) => /premium|jantar/i.test(c.nome)));
  assert.equal(P.opcaoCardapio('casa').preparo, 15);
  const agendar = P.cardapioPara('agendar').map((c) => c.id);
  for (const id of ['premium1', 'premium2', 'jantar1', 'jantar2']) assert.ok(agendar.includes(id), 'faltou ' + id);
  assert.equal(P.opcaoCardapio('jantar1').modo, 'pessoas');
  assert.equal(P.opcaoCardapio('premium1').modo, 'itens');
});

test('P05 · editar devolve para análise e avisa quem aprova', () => {
  const WB = setup();
  const P = WB.pedidos;
  como(WB, 'u5');
  const s = P.registrar({ tipo: 'compra', titulo: 'Compra — cadeiras', valores: {} });
  como(WB, 'u1');
  P.mudarStatus(s.id, 'confirmado');
  assert.equal(P.achar(s.id).status, 'confirmado');
  assert.ok(WB.minhasNotificacoes('u5').some((n) => n.texto.includes('Confirmado')), 'quem pediu não soube da mudança');
  como(WB, 'u5');
  const editado = P.atualizar(s.id, { titulo: 'Compra — cadeiras e mesas' });
  assert.equal(editado.status, 'em análise');
  assert.equal(editado.titulo, 'Compra — cadeiras e mesas');
  como(WB, 'u4');
  assert.equal(P.atualizar(s.id, { titulo: 'x' }), null, 'outra pessoa não edita o pedido');
});

test('P06 · só quem aprova muda a situação', () => {
  const WB = setup();
  const P = WB.pedidos;
  como(WB, 'u5');
  const s = P.registrar({ tipo: 'compra', titulo: 'Compra — toner', valores: {} });
  assert.equal(P.mudarStatus(s.id, 'concluído'), null);
  como(WB, P.responsaveisDaFila('compra')[0]);
  assert.equal(P.mudarStatus(s.id, 'concluído').status, 'concluído');
});

test('P07 · apagar some para quem pediu e para quem aprova, e não volta no F5', () => {
  const WB = setup();
  const P = WB.pedidos;
  como(WB, 'u1');
  const antes = WB.data.solicitacoes.length;
  const semente = WB.data.solicitacoes.find((s) => s.solicitante === 'u1');
  assert.ok(P.apagar(semente.id));
  assert.equal(WB.data.solicitacoes.length, antes - 1);
  // Recarregar: o estado gravado vence a semente.
  WB.data.solicitacoes.unshift(semente);
  P.carregar();
  assert.ok(!WB.data.solicitacoes.some((s) => s.id === semente.id), 'o pedido apagado voltou');
  como(WB, 'u5');
  const alheio = WB.data.solicitacoes.find((s) => s.solicitante !== 'u5');
  assert.equal(P.apagar(alheio.id), false, 'ninguém apaga pedido de outra pessoa');
});

test('P08 · quem aprova é a administração que define', () => {
  const WB = setup();
  const P = WB.pedidos;
  como(WB, 'u5');
  assert.equal(P.definirResponsaveis('compra', ['u5']), false);
  como(WB, 'u1');
  assert.ok(P.definirResponsaveis('compra', ['u7']));
  igual(P.responsaveisDaFila('compra'), ['u7']);
  assert.ok(P.temAprovacao('u7'));
  assert.ok(!P.temAprovacao('u5'));
  assert.ok(P.temAprovacao('u1'));
});

test('P09 · campo em real: R$ 1.234,56 enquanto se digita, número na gravação', () => {
  const WB = setup();
  const P = WB.pedidos;
  assert.equal(P.lerMoeda('R$ 1.234,56'), 1234.56);
  assert.equal(P.lerMoeda('15000'), 15000);
  assert.equal(P.lerMoeda(''), 0);
  assert.match(P.formatarMoeda(1234.56).replace(/\s/g, ' '), /^R\$ 1\.234,56$/);
});

test('P10 · item novo numa lista fica gravado e não duplica', () => {
  const WB = setup();
  const P = WB.pedidos;
  const antes = WB.data.opcoes.empresasPedido.length;
  assert.equal(P.adicionarOpcao('empresasPedido', '  Bioma   Fase 3 '), 'Bioma Fase 3');
  assert.equal(P.adicionarOpcao('empresasPedido', 'bioma fase 3'), 'Bioma Fase 3');
  assert.equal(WB.data.opcoes.empresasPedido.length, antes + 1);
  assert.equal(P.adicionarOpcao('listaQueNaoExiste', 'x'), '');
  igual(WB.store.get('pedidos.opcoes').empresasPedido, ['Bioma Fase 3']);
});

test('P11 · "Evento interno da equipe" é um tipo de evento', () => {
  const WB = setup();
  assert.ok(WB.data.opcoes.tipoEvento.includes('Evento interno da equipe'));
  assert.ok(!WB.data.opcoes.formatoAlimentacao.includes('Outro'), '"Outro" virou "adicionar"');
});

test('P12 · o detalhe separa o evento pelos sete blocos do pedido', () => {
  const WB = setup();
  const secoes = WB.secoesEvento({ nome: 'Lançamento', data: '2026-10-10', inicio: '19:00', termino: '23:00', tipo: 'Lançamento',
    objetivo: 'Abrir vendas', participantes: '80', orcamento: 15000, recursos: ['Som'], alimentacao: 'Coquetel', comunicacao: ['Convites'], outras: 'Portão 2',
    lista: { nome: 'convidados.xlsx', tamanho: 20480, guardado: true } });
  igual(secoes.map((s) => s.titulo), ['Identificação', 'Objetivo e descrição', 'Público e participantes', 'Orçamento e recursos', 'Gastronomia', 'Marketing', 'Demais informações']);
  const publico = new Map(secoes[2].campos);
  assert.ok(publico.get('Lista de participantes').startsWith('convidados.xlsx'));
});

test('P13 · confirmação sem número do pedido e sem "o que ainda não aconteceu"', () => {
  const fonte = fs.readFileSync(path.join(js, 'forms.js'), 'utf8');
  assert.ok(!fonte.includes('O que ainda não aconteceu'));
  assert.ok(!fonte.includes('confirm__id'));
  assert.ok(!fonte.includes('Enviar briefing'));
  assert.ok(fonte.includes('Enviar solicitação'));
  assert.ok(fonte.includes("rotulo: 'Data de vencimento'"));
  assert.ok(!/rotulo: 'CNPJ ou CPF do fornecedor'[^}]*obrigatorio: true/.test(fonte), 'CNPJ/CPF não é obrigatório');
});
