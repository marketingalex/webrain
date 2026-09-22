/* WeBrain — Comercial: lead, funil e cliente.
   ---------------------------------------------------------------------------
   Este arquivo é o dono do MODELO comercial. As telas ficam em
   `comercial-views.js` e os formulários em `comercial-forms.js`. Os três
   SUBSTITUEM o que `views.js` e `forms.js` já oferecem — sem eles carregados,
   o portal volta ao cadastro simples e à tela única de "Clientes e leads".

   O QUE MUDOU, E POR QUÊ (decisões do usuário, 22/09/2026)

   · QUEM TROUXE ≠ QUEM ATENDE. Antes, `responsavel` era preenchido com quem
     cadastrou, e pronto. Só que um colaborador de fora do comercial que traz um
     lead não é quem vai tocar a negociação. Agora são dois campos:
     `trazidoPor`, gravado sozinho e nunca editável, e `responsavel`, que é
     escolhido — e PODE FICAR VAZIO. Lead sem responsável é um estado válido e
     visível, não um defeito: é o sinal de que alguém do comercial precisa
     assumir.

   · ETAPA E SITUAÇÃO SE SEPARARAM. O campo `etapa` guardava dois sentidos ao
     mesmo tempo: "Qualificação" num lead e "Ativo" num cliente. Enquanto fosse
     um campo só, não dava para perguntar quantos leads estão em Propostas sem
     esbarrar em cliente. `etapa` ficou sendo o funil do lead; `situacao`, a do
     cliente.

   · O FUNIL É O DO DASHBOARD. Leads · Qualificados · Visitas · Propostas ·
     Vendas já existiam em `WB.data.dash`, como número fixo. Usar as mesmas
     etapas faz o CRM e o dashboard contarem a mesma história.

   · CHEGAR EM "VENDAS" É O QUE CONVERTE. Não há botão "virou cliente" em lugar
     nenhum: o lead vira cliente ao alcançar a última coluna, e nesse momento o
     portal pede o que um lead não tem (valor, contrato, documento).

   O QUE ESTE PROTÓTIPO NÃO FAZ: nada é lido nem gravado em CRM externo. O funil
   é do portal.
   ========================================================================== */
(function () {
  const WB = (window.WB = window.WB || {});
  const C = (WB.comercial = WB.comercial || {});

  /* ================================================================= FUNIL */
  const FUNIL = ['Leads', 'Qualificados', 'Visitas', 'Propostas', 'Vendas'];
  C.funil = () => FUNIL.slice();
  C.primeiraEtapa = () => FUNIL[0];
  C.etapaFinal = () => FUNIL[FUNIL.length - 1];
  C.indiceEtapa = (e) => FUNIL.indexOf(e);

  const SITUACOES = ['Contrato assinado', 'Ativo', 'Recorrente'];
  C.situacoes = () => SITUACOES.slice();

  /* ================================================================ LISTAS
     Produto e origem são listas fechadas porém acrescentáveis: quem cadastra
     escolhe entre o que existe ou registra uma opção nova, que passa a valer
     para os próximos. Mesmo mecanismo do Administrativo, agora em `ui.js`. */
  const LISTAS = {
    comercialProduto: ['Bioma', 'Vicente by We', 'WeInvest', 'Nós Gastronomia', 'CasaWE'],
    comercialOrigem: ['Meta Ads', 'Corretor parceiro', 'Indicação', 'Portal imobiliário',
      'Prospecção ativa', 'Site', 'Instagram', 'Evento', 'Outro']
  };
  WB.registrarListas(LISTAS);

  /* A qual operação o produto pertence. Antes o cadastro gravava `weinc` fixo,
     o que deixava um lead da Nós Gastronomia registrado como incorporadora. */
  const EMPRESA_DO_PRODUTO = {
    'Bioma': 'weinc',
    'Vicente by We': 'weinc',
    'WeInvest': 'weinvest',
    'Nós Gastronomia': 'nos',
    'CasaWE': 'casawe'
  };
  C.empresaDoProduto = (produto) => EMPRESA_DO_PRODUTO[produto] || 'weinc';

  /* ============================================================= MIGRAÇÃO
     Os registros antigos têm uma `etapa` que mistura lead e cliente. Isto roda
     uma vez sobre tudo que existir — semente e o que estiver gravado. */
  const ETAPA_ANTIGA = {
    'Qualificação': 'Qualificados',
    'Visita agendada': 'Visitas',
    'Proposta enviada': 'Propostas'
  };

  C.migrar = function (r) {
    if (!r || typeof r !== 'object') return r;

    if (r.tipo === 'cliente') {
      /* Num cliente, o que estava em `etapa` sempre foi situação. */
      if (!r.situacao) r.situacao = SITUACOES.indexOf(r.etapa) >= 0 ? r.etapa : 'Ativo';
      r.etapa = '';
    } else {
      if (ETAPA_ANTIGA[r.etapa]) r.etapa = ETAPA_ANTIGA[r.etapa];
      // Etapa desconhecida não pode sumir com o lead: ele volta para o começo.
      if (FUNIL.indexOf(r.etapa) < 0) r.etapa = FUNIL[0];
      if (r.situacao === undefined) r.situacao = '';
    }

    /* Antes os dois papéis eram um só. A leitura honesta do que existia é que
       quem estava no `responsavel` também foi quem trouxe. */
    if (r.trazidoPor === undefined) r.trazidoPor = r.responsavel || '';
    if (r.responsavel === undefined) r.responsavel = '';

    ['documento', 'email', 'endereco', 'contrato', 'contratoId', 'convertidoEm', 'obs']
      .forEach((k) => { if (r[k] === undefined) r[k] = ''; });

    return r;
  };

  C.migrarTudo = function () {
    (WB.data.clientes || []).forEach(C.migrar);
  };

  /* =========================================================== PERSISTÊNCIA
     `WB.store.push('clientes', …)` já era usado pelo cadastro antigo, e a Fase
     2 relê essa chave no carregamento. Gravar a coleção inteira mantém os dois
     caminhos funcionando: quem já estava gravado continua, e quem muda de
     etapa tem a mudança guardada — que `push` sozinho não daria. */
  C.salvar = function () {
    WB.store.set('clientes', (WB.data.clientes || []).slice());
  };

  C.registro = (id) => (WB.data.clientes || []).find((c) => c.id === id) || null;

  C.gravar = function (r) {
    C.migrar(r);
    const lista = WB.data.clientes;
    const i = lista.findIndex((x) => x.id === r.id);
    if (i >= 0) lista[i] = r; else lista.unshift(r);
    C.salvar();
    return r;
  };

  C.novoId = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  /* ================================================================ LEITURA
     As telas de Leads e de Clientes leem daqui, e não de `WB.data.clientes`
     direto, porque a WeInvest entra projetada — um registro, uma origem. */
  function base() {
    return (WB.fase2 && WB.fase2.clientesUnificados)
      ? WB.fase2.clientesUnificados()
      : (WB.data.clientes || []);
  }

  /** `tipo` é 'lead' ou 'cliente'. `empresa` recorta; 'grupo' traz tudo. */
  C.listar = function (tipo, empresa) {
    const lista = base().filter((c) => c.tipo === tipo);
    return (!empresa || empresa === 'grupo') ? lista : lista.filter((c) => c.empresa === empresa);
  };

  /** Registro que mora na coleção do grupo pode ser movido e editado daqui.
      O que vem projetado da Fase 2 tem funil e ficha próprios, lá. */
  C.eDoGrupo = (r) => !!r && r.origemRegistro !== 'weinvest' && !r.rota;

  /** Leads do funil do grupo, agrupados por coluna, na ordem do funil. */
  C.porEtapa = function () {
    const mapa = {};
    FUNIL.forEach((e) => { mapa[e] = []; });
    C.listar('lead').forEach((l) => {
      const e = FUNIL.indexOf(l.etapa) >= 0 ? l.etapa : FUNIL[0];
      mapa[e].push(l);
    });
    return mapa;
  };

  /** Há quantos dias o lead está parado. Sem data, devolve null em vez de 0 —
      "não sei" e "hoje" não são a mesma informação. */
  C.diasParado = function (l) {
    const d = l && (l.etapaDesde || l.desde);
    if (!d) return null;
    const n = WB.dias ? -WB.dias(d) : null;
    return typeof n === 'number' && isFinite(n) ? Math.max(0, n) : null;
  };

  /* ================================================================ FUNIL
     Mover é só mudar de etapa — MENOS chegar em Vendas, que é conversão e tem
     caminho próprio (`comercial-forms.js`). Esta função recusa esse destino de
     propósito: quem move não decide sozinho que houve venda. */
  C.moverEtapa = function (id, etapa) {
    const r = C.registro(id);
    if (!r || r.tipo !== 'lead') return null;
    if (FUNIL.indexOf(etapa) < 0) return null;
    if (etapa === C.etapaFinal()) return 'conversao';
    r.etapa = etapa;
    r.etapaDesde = WB.d(0);
    C.gravar(r);
    return r;
  };

  /** Assume o lead para si, ou para quem for indicado. */
  C.definirResponsavel = function (id, pessoa) {
    const r = C.registro(id);
    if (!r) return null;
    r.responsavel = pessoa || '';
    return C.gravar(r);
  };

  /* ============================================================= CONVERSÃO
     O lead não é copiado: é a MESMA linha que muda de lado. Por isso ela some
     da tela de Leads e aparece na de Clientes na mesma ação. */
  C.converter = function (id, dados) {
    const r = C.registro(id);
    if (!r || r.tipo !== 'lead') return null;
    const v = dados || {};
    r.tipo = 'cliente';
    r.etapa = '';
    r.situacao = v.situacao || SITUACOES[0];
    r.convertidoEm = WB.d(0);
    if (v.valor != null && v.valor !== '') r.valor = Number(v.valor) || 0;
    ['documento', 'email', 'endereco', 'contrato', 'contratoId'].forEach((k) => {
      if (v[k] != null && v[k] !== '') r[k] = v[k];
    });
    if (v.responsavel) r.responsavel = v.responsavel;
    return C.gravar(r);
  };

  /* ====================================================== CONTRATO LIGADO
     "O sistema precisa ver no contrato as informações adicionais": escolhendo
     um contrato já cadastrado no Administrativo, valor e data saem dele em vez
     de serem digitados de novo. Sem o Administrativo carregado, o campo vira
     apenas o link colado à mão. */
  C.contratosDisponiveis = function () {
    if (!WB.adm || !WB.adm.colecao) return [];
    return WB.adm.colecao('contratos').slice();
  };

  C.dadosDoContrato = function (contratoId) {
    if (!contratoId || !WB.adm || !WB.adm.registro) return null;
    const c = WB.adm.registro('contratos', contratoId);
    if (!c) return null;
    return { valor: c.valor, inicio: c.inicio, link: c.link, descritivo: c.descritivo };
  };

  /* ================================================================ CARGA
     A Fase 2 é quem relê `clientes` do armazenamento. Aqui só garantimos que,
     depois de qualquer leitura, todo registro esteja no formato novo. */
  C.carregar = function () {
    C.migrarTudo();
  };
})();
