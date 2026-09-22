/* Comercial — lead, funil do CRM, conversão e as duas listas.
   ---------------------------------------------------------------------------
   O que este arquivo protege, em uma frase cada:

   · quem trouxe o lead não é, necessariamente, quem vai atendê-lo;
   · `etapa` é do lead e `situacao` é do cliente — nunca o mesmo campo;
   · chegar na última coluna do funil é o que converte, e conversão move a
     MESMA linha de lista, não cria uma cópia;
   · registro que mora na WeInvest não é movido por este funil.

   O que depende de DOM (arrastar, o popup de conversão, a galeria do News)
   está em tests/verificacao.html. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.join(__dirname, '..');
const js = path.join(raiz, 'assets/js');

/* A ordem de carregamento é lida do próprio index.html. Assim, quando um
   arquivo novo entrar no portal, o teste passa a carregá-lo sozinho em vez de
   testar uma composição que não existe mais. */
const ARQUIVOS = [...fs.readFileSync(path.join(raiz, 'index.html'), 'utf8')
  .matchAll(/<script src="assets\/js\/([^"]+)"/g)].map((m) => m[1]);

function setup(memoria) {
  const mem = memoria || new Map();
  function node() {
    return {
      innerHTML: '', scrollTop: 0, hidden: false, dataset: {}, value: '', type: 'text',
      checked: false, readOnly: false, textContent: '', open: false,
      classList: { add() {}, remove() {}, contains() { return false; } },
      addEventListener() {}, removeAttribute() {}, setAttribute() {}, hasAttribute() { return false; },
      focus() {}, appendChild() {}, remove() {}, closest() { return null; },
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
  for (const f of ARQUIVOS) {
    vm.runInNewContext(fs.readFileSync(path.join(js, f), 'utf8'), ctx, { filename: f });
  }
  const WB = ctx.window.WB;
  WB.comercial.carregar();
  return { WB, C: WB.comercial, mem };
}

/* O HTML sai escapado: um nome com "&" vira "&amp;" e não bate com a string
   crua. Comparar sempre pelo nome escapado. */
function temNome(WB, html, nome) { return html.includes(WB.esc(nome)); }

/* Cria um lead sem passar pelo formulário, que é DOM. Mesmos campos que
   `WB.abrirLead` grava. */
function novoLead(C, WB, extra) {
  const produto = (extra && extra.produto) || 'Bioma';
  return C.gravar(Object.assign({
    id: C.novoId(), nome: 'Lead de teste', tipo: 'lead',
    empresa: C.empresaDoProduto(produto), produto, origem: 'Indicação', valor: 0,
    etapa: C.primeiraEtapa(), etapaDesde: WB.d(0), situacao: '',
    trazidoPor: 'u5', responsavel: '', desde: WB.d(0), telefone: '(45) 90000-0000'
  }, extra || {}));
}

/* ============================================================== MIGRAÇÃO */

test('A etapa antiga se divide em funil do lead e situação do cliente', () => {
  const { C } = setup();

  const lead = C.migrar({ tipo: 'lead', etapa: 'Proposta enviada', responsavel: 'u4' });
  assert.equal(lead.etapa, 'Propostas', 'etapa antiga vira etapa do funil');
  assert.equal(lead.situacao, '', 'lead não tem situação de cliente');

  const cliente = C.migrar({ tipo: 'cliente', etapa: 'Ativo', responsavel: 'u4' });
  assert.equal(cliente.situacao, 'Ativo', 'o que estava em etapa era situação');
  assert.equal(cliente.etapa, '', 'cliente sai do funil');
});

test('Quem estava como responsável passa a constar também como quem trouxe', () => {
  const { C } = setup();
  const r = C.migrar({ tipo: 'lead', etapa: 'Qualificação', responsavel: 'u5' });
  assert.equal(r.trazidoPor, 'u5', 'antes os dois papéis eram um só');
  assert.equal(r.responsavel, 'u5');
});

test('Etapa desconhecida não some com o lead: ele volta para a primeira coluna', () => {
  const { C } = setup();
  const r = C.migrar({ tipo: 'lead', etapa: 'Etapa que não existe mais' });
  assert.equal(r.etapa, C.primeiraEtapa());
});

test('A base inteira migra no carregamento, sem sobrar etapa antiga', () => {
  const { WB, C } = setup();
  const antigas = ['Qualificação', 'Visita agendada', 'Proposta enviada'];
  WB.data.clientes.forEach((c) => {
    assert.ok(!antigas.includes(c.etapa), c.nome + ' não ficou com etapa antiga');
    if (c.tipo === 'cliente') assert.equal(c.etapa, '', c.nome + ' é cliente e saiu do funil');
    else assert.ok(C.funil().includes(c.etapa), c.nome + ' está numa coluna do funil');
  });
});

/* ================================================================== LEAD */

test('Lead nasce na primeira coluna, com quem trouxe preenchido', () => {
  const { WB, C } = setup();
  const l = novoLead(C, WB);
  assert.equal(l.etapa, 'Leads');
  assert.equal(l.trazidoPor, 'u5');
  assert.equal(C.porEtapa()['Leads'].some((x) => x.id === l.id), true);
});

test('Lead sem responsável é estado válido, e aparece destacado no CRM', () => {
  const { WB, C } = setup();
  const l = novoLead(C, WB, { nome: 'Sem dono ainda', responsavel: '' });
  assert.equal(l.responsavel, '');

  const crm = WB.views.crm();
  assert.ok(crm.includes('Sem responsável'), 'o cartão diz que falta responsável');
  assert.ok(crm.includes('data-acao="crm-assumir" data-id="' + l.id + '"'), 'e oferece assumir');

  C.definirResponsavel(l.id, 'u4');
  assert.equal(C.registro(l.id).responsavel, 'u4');
});

test('A empresa sai do produto escolhido, e não é weinc para tudo', () => {
  const { WB, C } = setup();
  assert.equal(C.empresaDoProduto('Bioma'), 'weinc');
  assert.equal(C.empresaDoProduto('Nós Gastronomia'), 'nos');
  assert.equal(C.empresaDoProduto('WeInvest'), 'weinvest');
  assert.equal(C.empresaDoProduto('CasaWE'), 'casawe');
  assert.equal(novoLead(C, WB, { produto: 'Nós Gastronomia' }).empresa, 'nos');
  // Produto que o usuário acrescentou não tem operação conhecida: cai na maior.
  assert.equal(C.empresaDoProduto('Produto inventado'), 'weinc');
});

test('Produto e origem são listas acrescentáveis, e o acréscimo sobrevive ao F5', () => {
  const { WB, mem } = setup();
  assert.ok(WB.lista('comercialProduto').includes('Bioma'));
  WB.acrescentarOpcao('comercialProduto', 'Bioma — Fase 3');
  assert.ok(WB.lista('comercialProduto').includes('Bioma — Fase 3'));

  const outra = setup(mem);
  assert.ok(outra.WB.lista('comercialProduto').includes('Bioma — Fase 3'), 'voltou depois de reabrir');
  assert.ok(outra.WB.lista('comercialProduto').includes('Bioma'), 'sem sobrescrever a base');
});

/* ================================================================= FUNIL */

test('Mover pelo funil grava, mas chegar na última coluna pede a conversão', () => {
  const { WB, C } = setup();
  const l = novoLead(C, WB);

  assert.equal(C.moverEtapa(l.id, 'Visitas').etapa, 'Visitas');
  assert.equal(C.registro(l.id).etapa, 'Visitas', 'ficou gravado');

  // A última coluna não é uma etapa como as outras: ela converte.
  assert.equal(C.moverEtapa(l.id, C.etapaFinal()), 'conversao');
  assert.equal(C.registro(l.id).tipo, 'lead', 'e nada foi gravado antes de confirmar');
  assert.equal(C.registro(l.id).etapa, 'Visitas', 'o lead continua onde estava');
});

test('Etapa inventada é recusada em vez de corromper o registro', () => {
  const { WB, C } = setup();
  const l = novoLead(C, WB);
  assert.equal(C.moverEtapa(l.id, 'Etapa que não existe'), null);
  assert.equal(C.registro(l.id).etapa, 'Leads');
});

/* ============================================================= CONVERSÃO */

test('Converter move a mesma linha de uma lista para a outra', () => {
  const { WB, C } = setup();
  const l = novoLead(C, WB, { nome: 'Vai comprar' });
  const leadsAntes = C.listar('lead').length;
  const clientesAntes = C.listar('cliente').length;

  C.converter(l.id, { situacao: 'Contrato assinado', valor: 250000 });

  assert.equal(C.listar('lead').length, leadsAntes - 1, 'saiu de Leads');
  assert.equal(C.listar('cliente').length, clientesAntes + 1, 'entrou em Clientes');
  assert.equal(WB.data.clientes.filter((c) => c.id === l.id).length, 1, 'é a mesma linha, não uma cópia');

  const r = C.registro(l.id);
  assert.equal(r.tipo, 'cliente');
  assert.equal(r.etapa, '', 'saiu do funil');
  assert.equal(r.situacao, 'Contrato assinado');
  assert.equal(r.valor, 250000);
  assert.equal(r.convertidoEm, WB.d(0), 'guardou quando virou cliente');
  assert.equal(r.trazidoPor, 'u5', 'quem trouxe continua registrado depois da venda');
});

test('Converter com um contrato do Administrativo traz valor e link de lá', () => {
  const { C } = setup();
  const contratos = C.contratosDisponiveis();
  assert.ok(contratos.length, 'o Administrativo está carregado');

  const comValor = contratos.find((c) => c.valor);
  const dados = C.dadosDoContrato(comValor.id);
  assert.equal(dados.valor, comValor.valor);
  assert.equal(dados.link, comValor.link);
  assert.equal(C.dadosDoContrato('CTR-inexistente'), null);
});

test('Converter um registro que não é lead não faz nada', () => {
  const { C } = setup();
  const cliente = C.listar('cliente').find((c) => C.eDoGrupo(c));
  assert.equal(C.converter(cliente.id, { situacao: 'Ativo' }), null);
  assert.equal(C.converter('id-que-nao-existe', {}), null);
});

/* ================================================== as duas listas separadas */

test('Leads e Clientes mostram cada um a sua metade, e nunca a do outro', () => {
  const { WB, C } = setup();
  const lead = C.listar('lead').find((c) => C.eDoGrupo(c));
  const cliente = C.listar('cliente').find((c) => C.eDoGrupo(c));
  assert.ok(lead && cliente, 'a semente tem os dois casos');

  const telaLeads = WB.views.leads();
  assert.ok(temNome(WB, telaLeads, lead.nome));
  assert.ok(!temNome(WB, telaLeads, cliente.nome), 'cliente não aparece em Leads');

  const telaClientes = WB.views.clientes();
  assert.ok(temNome(WB, telaClientes, cliente.nome));
  assert.ok(!temNome(WB, telaClientes, lead.nome), 'lead não aparece em Clientes');
});

test('As duas telas mantêm o recorte por empresa, e a rota leva a aba adiante', () => {
  const { WB, C } = setup();
  const nos = C.listar('cliente', 'nos');
  const outra = C.listar('cliente').find((c) => c.empresa !== 'nos' && C.eDoGrupo(c));
  assert.ok(nos.length && outra, 'a semente tem cliente da Nós e de outra empresa');

  const tela = WB.rotas.leads(['weinc']);
  assert.ok(tela.includes('aria-selected="true"'), 'a aba da empresa fica marcada');

  const clientesNos = WB.rotas.clientes(['nos']);
  assert.ok(temNome(WB, clientesNos, nos[0].nome));
  assert.ok(!temNome(WB, clientesNos, outra.nome), 'a aba da Nós não mostra cliente de outra');
});

test('A conversão tira o nome de uma tela e põe na outra, na mesma ação', () => {
  const { WB, C } = setup();
  const l = novoLead(C, WB, { nome: 'Vai mudar de lista' });
  assert.ok(temNome(WB, WB.views.leads(), l.nome));
  assert.ok(!temNome(WB, WB.views.clientes(), l.nome));

  C.converter(l.id, { situacao: 'Ativo' });

  assert.ok(!temNome(WB, WB.views.leads(), l.nome), 'sumiu de Leads');
  assert.ok(temNome(WB, WB.views.clientes(), l.nome), 'apareceu em Clientes');
});

/* ================================================================ WEINVEST */

test('Lead que mora na WeInvest aparece no funil, mas não é arrastado daqui', () => {
  const { WB, C } = setup();
  const deLa = C.listar('lead').find((l) => !C.eDoGrupo(l));
  assert.ok(deLa, 'a Fase 2 projeta leads da WeInvest');

  const crm = WB.views.crm();
  assert.ok(temNome(WB, crm, deLa.nome), 'ele aparece no quadro');
  assert.ok(!crm.includes('data-crm-drag="' + deLa.id + '"'), 'mas sem alça de arrastar');
  assert.ok(crm.includes('#/wi/leads'), 'e com caminho para a tela dele');

  // Nem pelo caminho curto: ele não está na coleção do grupo.
  assert.equal(C.moverEtapa(deLa.id, 'Visitas'), null);
});

test('Lead cadastrado com produto WeInvest é do grupo, e esse sim se move', () => {
  const { WB, C } = setup();
  const l = novoLead(C, WB, { produto: 'WeInvest', nome: 'WeInvest pelo Início' });
  assert.equal(l.empresa, 'weinvest');
  assert.equal(C.eDoGrupo(l), true, 'nasceu na coleção do grupo');
  assert.equal(C.moverEtapa(l.id, 'Propostas').etapa, 'Propostas');
});

/* ============================================================== LIGAÇÕES */

test('O portal conhece as rotas, as ações e a galeria do News', () => {
  const { WB } = setup();
  assert.equal(typeof WB.rotas.leads, 'function');
  assert.equal(typeof WB.rotas.clientes, 'function');
  assert.equal(typeof WB.rotas.crm, 'function');
  for (const a of ['lead', 'cliente', 'crm-assumir', 'news-galeria']) {
    assert.equal(typeof WB.acoes[a], 'function', a + ' está ligada');
  }
  assert.equal(typeof WB.abrirGaleriaNews, 'function');
  assert.equal(typeof WB.abrirConversao, 'function');
});

test('A lateral leva aos dois destinos, em todas as operações que tinham a tela', () => {
  const { WB } = setup();
  const rotas = (op) => {
    const achadas = [];
    (function anda(itens) {
      itens.forEach((i) => (i.itens ? anda(i.itens) : achadas.push(i.rota)));
    })(WB.operacao(op).itens());
    return achadas;
  };
  const grupo = rotas('grupo');
  assert.ok(grupo.includes('leads') && grupo.includes('clientes'));
  const weinc = rotas('weinc');
  assert.ok(weinc.includes('leads/weinc') && weinc.includes('clientes/weinc'));
  assert.ok(!grupo.includes('clientes e leads'), 'o destino único deixou de existir');
});

test('O funil do CRM usa as mesmas etapas do funil do dashboard', () => {
  const { WB, C } = setup();
  const dash = WB.data.dash && WB.data.dash.incorporadora && WB.data.dash.incorporadora.geral;
  const doDash = (dash && dash.funil ? dash.funil : []).map((f) => f.etapa);
  assert.deepEqual(C.funil().slice(), doDash.slice(),
    'CRM e dashboard precisam contar a mesma história de funil');
});
