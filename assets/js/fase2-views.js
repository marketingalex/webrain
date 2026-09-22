/* WeBrain — Fase 2: telas das operações WeInvest e Nós Gastronomia.
   Cada função devolve HTML; os eventos saem do mapa de ações de `app.js`
   (`data-acao`) e dos links de rota. Nada aqui inventa número: quando não há
   registro para calcular, a tela diz "sem dados" em vez de mostrar zero. */
(function () {
  const WB = (window.WB = window.WB || {});
  const F2 = (WB.fase2 = WB.fase2 || {});
  const esc = WB.esc;
  const num = F2.num;

  const cabecalho = (o) => WB.cabecalho(o);
  const tabela = (c, l, o) => WB.tabela(c, l, o);

  function cartao(titulo, corpo, o) {
    const op = o || {};
    return `<section class="card" ${op.estilo ? 'style="' + op.estilo + '"' : ''}>
      ${titulo ? `<div class="card__head"><h2 class="card__title">${esc(titulo)}</h2>${op.tools || ''}</div>` : ''}
      <div class="card__body ${op.flush ? 'card__body--flush' : ''}">${corpo}</div>
    </section>`;
  }

  function cartaoTabela(titulo, colunas, linhas, opts) {
    const o = opts || {};
    return cartao(titulo, tabela(colunas, linhas, o), {
      flush: true,
      tools: o.tools || `<span class="card__tools muted">${linhas.length} ${linhas.length === 1 ? 'registro' : 'registros'}</span>`,
      estilo: o.estilo
    });
  }

  function kpis(lista) {
    return `<div class="grid grid--4">${lista.map((k) => `<div class="card kpi">
      <div class="kpi__label">${esc(k.rotulo)}</div>
      <div class="kpi__value">${k.valor == null ? '<span class="kpi__na">sem dados</span>' : esc(k.valor)}</div>
      <div class="kpi__foot"><span>${esc(k.nota || '')}</span></div>
    </div>`).join('')}</div>`;
  }

  function abas(itens, ativa, base) {
    return `<div class="tabs" role="tablist">${itens.map((i) =>
      `<a class="tab" role="tab" href="#${base}/${i.id}" aria-selected="${i.id === ativa}">${esc(i.nome)}</a>`).join('')}</div>`;
  }

  function dl(pares) {
    return `<dl class="dl">${pares.filter(Boolean).map((p) =>
      `<dt>${esc(p[0])}</dt><dd>${p[2] ? p[1] : (p[1] == null || p[1] === '' ? '<span class="muted">não informado</span>' : esc(p[1]))}</dd>`).join('')}</dl>`;
  }

  /** Nota de leitura: separa o que veio das fotos do que decidimos. */
  function nota(tipo, texto) {
    const rotulos = { suposto: 'Decisão de implementação', parcial: 'Leitura parcial da foto', duvida: 'Dúvida em aberto' };
    return `<div class="f2nota f2nota--${tipo}"><strong>${esc(rotulos[tipo] || 'Nota')}.</strong> ${esc(texto)}</div>`;
  }
  F2.nota = nota;

  const moeda = (v) => F2.moedaOuVazio(v);
  const data = (v) => (v ? WB.fmtDataCurta(v) : '—');

  function voltar(href, texto) {
    return `<a class="f2voltar" href="${esc(href)}">${WB.icon('seta', 13)} ${esc(texto)}</a>`;
  }

  function naoEncontrado(texto, href, rotulo) {
    return WB.vazio('Registro não encontrado', texto, `<a class="btn" href="${esc(href)}">${esc(rotulo)}</a>`);
  }

  /* ====================================================================
     WEINVEST
     ==================================================================== */
  const V = (F2.views = {});

  const CHIP_LEAD = {
    novo: 'info', contato: 'idle', qualificado: 'idle',
    negociacao: 'warn', convertido: 'ok', perdido: 'late'
  };
  const CHIP_ATIVO = { disponivel: 'ok', indisponivel: 'warn', vendido: 'idle' };
  const CHIP_NEGOCIO = { negociacao: 'warn', vendido: 'ok', perdido: 'late' };
  const CHIP_RECL = { aberta: 'late', tratativa: 'warn', resolvida: 'ok' };
  const CHIP_ITEM = { ativo: 'ok', teste: 'info', descontinuado: 'idle' };

  const chipDe = (mapa, opcao, valor) => WB.chip(F2.rotulo(opcao, valor), mapa[valor] || 'idle');

  /* -------------------------------------------------------------- leads */
  V.leads = function () {
    const lista = WB.data.wi.leads;
    const convertidos = lista.filter((l) => l.status === 'convertido').length;
    return cabecalho({
      titulo: 'Leads',
      sub: 'Entrada do funil. Um lead vira cliente quando uma venda é registrada para ele.',
      acoes: `<button class="btn btn--primary" data-acao="wi-lead">Cadastrar lead</button>`
    }) +
    nota('suposto', 'As etapas do funil não aparecem nas fotos. A lista de situações abaixo é decisão de implementação e foi mantida curta de propósito.') +
    cartaoTabela('Leads', [
      { titulo: 'Número', valor: (l) => `<span class="mono">${esc(l.id)}</span>`, bruto: true },
      { titulo: 'Nome', valor: 'nome' },
      { titulo: 'Telefone', valor: (l) => l.telefone || '—' },
      { titulo: 'E-mail', valor: (l) => l.email || '—' },
      { titulo: 'Canal de origem', valor: (l) => l.canal || '—' },
      { titulo: 'Categoria de interesse', valor: (l) => l.categoria || '—' },
      { titulo: 'Entrada', valor: (l) => data(l.dataEntrada), ord: (l) => l.dataEntrada },
      { titulo: 'Responsável', valor: (l) => WB.pessoa(l.responsavel).nome },
      { titulo: 'Situação', valor: (l) => chipDe(CHIP_LEAD, 'leadStatus', l.status), bruto: true, ord: (l) => l.status },
      {
        titulo: 'Cliente', ordenavel: false, bruto: true,
        valor: (l) => l.clienteId
          ? `<a href="#/wi/cliente/${esc(l.clienteId)}">${esc(l.clienteId)}</a>`
          : '<span class="muted">—</span>'
      },
      {
        titulo: 'Ações', ordenavel: false, bruto: true,
        valor: (l) => `<button class="btn btn--sm" data-acao="wi-lead-editar" data-id="${esc(l.id)}">Editar</button>
          ${l.status === 'convertido' ? '' : `<button class="btn btn--sm" data-acao="wi-negocio-lead" data-id="${esc(l.id)}">Registrar negócio</button>`}`
      }
    ], lista, {
      tools: `<span class="card__tools muted">${lista.length} leads · ${convertidos} convertido${convertidos === 1 ? '' : 's'}</span>`,
      vazioTitulo: 'Nenhum lead cadastrado',
      vazioTexto: 'Cadastre o primeiro lead da WeInvest para começar o funil.',
      vazioAcao: '<button class="btn btn--primary" data-acao="wi-lead">Cadastrar lead</button>'
    });
  };

  /* ----------------------------------------------------------- clientes */
  V.clientes = function () {
    const lista = WB.data.wi.clientes;
    return cabecalho({
      titulo: 'Clientes',
      sub: 'Ficha completa, grupo familiar/econômico, perfil imobiliário e carteira.',
      acoes: `<button class="btn" data-acao="wi-lead">Cadastrar lead</button>
              <button class="btn btn--primary" data-acao="wi-cliente">Cadastrar cliente</button>`
    }) +
    cartaoTabela('Clientes WeInvest', [
      { titulo: 'Cliente', bruto: true, valor: (c) => `<a href="#/wi/cliente/${esc(c.id)}">${esc(F2.nomeCliente(c))}</a>`, ord: (c) => F2.nomeCliente(c) },
      { titulo: 'Tipo', valor: (c) => (c.categoria === 'pj' ? 'PJ' : 'PF') },
      { titulo: 'Grupo', valor: (c) => c.grupoFamiliar || '—' },
      { titulo: 'Classificação', valor: (c) => c.classificacao || '—' },
      { titulo: 'Canal de origem', valor: (c) => c.canalOrigem || '—' },
      { titulo: 'Perfil', valor: (c) => (c.perfil && c.perfil.perfilInvestimento) || '—' },
      { titulo: 'Unidades compradas', num: true, valor: (c) => { const r = F2.resumoCliente(c.id); return r.unidades == null ? '—' : r.unidades; } },
      { titulo: 'VGV comprado', num: true, valor: (c) => moeda(F2.resumoCliente(c.id).vgvComprado) },
      { titulo: 'Carteira', num: true, valor: (c) => (c.carteira || []).length },
      { titulo: 'Responsável', valor: (c) => WB.pessoa(c.responsavel).nome },
      { titulo: 'Desde', valor: (c) => data(c.dataEntrada), ord: (c) => c.dataEntrada }
    ], lista, {
      vazioTitulo: 'Nenhum cliente WeInvest',
      vazioTexto: 'Cadastre um cliente ou registre uma venda a partir de um lead.',
      vazioAcao: '<button class="btn btn--primary" data-acao="wi-cliente">Cadastrar cliente</button>'
    }) +
    nota('suposto', 'Unidades compradas e VGV comprado saem apenas dos negócios com venda registrada. A carteira imobiliária — o que o cliente já possuía — é contada à parte e nunca entra nesses dois números.');
  };

  V.cliente = function (id) {
    const c = F2.cliente(id);
    if (!c) return naoEncontrado('Nenhum cliente da WeInvest com este identificador.', '#/wi/clientes', 'Ver todos os clientes');
    const r = F2.resumoCliente(c.id);
    const perfil = c.perfil || {};
    const hist = c.historico || { interacoes: [], proximosPassos: [] };
    const negocios = WB.data.wi.negocios.filter((n) => n.clienteId === c.id);
    const lead = c.leadId ? F2.lead(c.leadId) : null;
    const cp = c.comprovacao || {};

    return voltar('#/wi/clientes', 'Clientes WeInvest') +
      cabecalho({
        titulo: F2.nomeCliente(c),
        sub: [c.id, c.categoria === 'pj' ? 'Pessoa jurídica' : 'Pessoa física', c.grupoFamiliar].filter(Boolean).join(' · '),
        acoes: `<button class="btn" data-acao="wi-interacao" data-id="${esc(c.id)}">Registrar interação</button>
                <button class="btn" data-acao="wi-comprovacao" data-id="${esc(c.id)}">Comprovar relacionamento</button>
                <button class="btn btn--primary" data-acao="wi-cliente-editar" data-id="${esc(c.id)}">Editar ficha</button>`
      }) +
      kpis([
        { rotulo: 'Unidades compradas', valor: r.unidades == null ? null : String(r.unidades), nota: 'só vendas registradas' },
        { rotulo: 'VGV comprado', valor: r.vgvComprado == null ? null : WB.moeda(r.vgvComprado), nota: 'soma do VGV das vendas' },
        { rotulo: 'Em negociação', valor: String(r.emNegociacao), nota: 'negócios ainda abertos' },
        { rotulo: 'Carteira preexistente', valor: String((c.carteira || []).filter((x) => !x.negocioId).length), nota: 'imóveis que já possuía' }
      ]) +
      `<div class="grid grid--2">
        ${cartao('Informações', dl([
          ['Categoria', c.categoria === 'pj' ? 'Pessoa jurídica' : 'Pessoa física'],
          c.categoria === 'pj' ? ['Razão social', c.razaoSocial] : null,
          c.categoria === 'pj' ? ['CNPJ', c.cnpj] : ['CPF', c.cpf],
          [c.categoria === 'pj' ? 'Representante' : 'Nome completo', c.nome],
          ['WhatsApp', c.whatsapp], ['E-mail', c.email],
          ['Grupo familiar / econômico', c.grupoFamiliar],
          ['Descrição dos familiares', c.descricaoFamiliares],
          ['Responsável', WB.pessoa(c.responsavel).nome],
          ['Data de entrada', data(c.dataEntrada)],
          ['Classificação', c.classificacao],
          ['Canal de origem', c.canalOrigem],
          ['Veio do lead', lead ? `<a href="#/wi/leads">${esc(lead.id)} · ${esc(lead.nome)}</a>` : '<span class="muted">cadastro direto</span>', true],
          ['Comprovação de relacionamento', cp.registrado
            ? esc(cp.tipo) + ' · ' + esc(data(cp.data)) + (cp.obs ? ' · ' + esc(cp.obs) : '')
            : '<span class="muted">não registrada</span>', true]
        ]))}
        ${cartao('Perfil imobiliário', dl([
          ['Objetivos', (perfil.objetivos || []).join(', ')],
          ['Regiões de interesse', (perfil.regioes || []).join(', ')],
          ['Ticket', perfil.ticketMin == null && perfil.ticketMax == null ? '' : moeda(perfil.ticketMin) + ' a ' + moeda(perfil.ticketMax)],
          ['Categorias de interesse', (perfil.categorias || []).join(', ')],
          ['Preferências', perfil.preferencias],
          ['Restrições', perfil.restricoes],
          ['Perfil de investimento', perfil.perfilInvestimento]
        ]))}
      </div>` +
      cartaoTabela('Carteira imobiliária — o que o cliente possui', [
        { titulo: 'Imóvel', bruto: true, valor: (x) => {
          const a = x.ativoId ? F2.ativo(x.ativoId) : null;
          return a ? `<a href="#/wi/ativo/${esc(a.id)}">${esc(a.titulo)}</a>` : esc(x.descricao || '—');
        } },
        { titulo: 'Na base WeInvest', valor: (x) => (x.ativoId ? 'Sim' : 'Não — descrição livre') },
        { titulo: 'Status', valor: (x) => x.status || '—' },
        { titulo: 'Observações / intenção', valor: (x) => x.observacoes || '—' },
        { titulo: 'Origem', bruto: true, valor: (x) => x.negocioId
          ? `<a href="#/wi/negocio/${esc(x.negocioId)}">Comprado pela WeInvest</a>`
          : '<span class="muted">Preexistente</span>' }
      ], c.carteira || [], {
        busca: false,
        vazioTitulo: 'Carteira vazia',
        vazioTexto: 'Nenhum imóvel registrado. Edite a ficha para incluir o que o cliente já possui.',
        vazioAcao: `<button class="btn" data-acao="wi-cliente-editar" data-id="${esc(c.id)}">Editar ficha</button>`
      }) +
      cartaoTabela('Compras pela WeInvest', [
        { titulo: 'Negócio', bruto: true, valor: (n) => `<a href="#/wi/negocio/${esc(n.id)}">${esc(n.id)}</a>` },
        { titulo: 'Ativo', valor: (n) => { const a = F2.ativo(n.ativoId); return a ? a.titulo : '—'; } },
        { titulo: 'Situação', valor: (n) => chipDe(CHIP_NEGOCIO, 'negocioSituacao', n.situacao), bruto: true },
        { titulo: 'Valor negociado', num: true, valor: (n) => moeda(n.valorNegociado) },
        { titulo: 'VGV', num: true, valor: (n) => moeda(n.vgv) },
        { titulo: 'Fechamento', valor: (n) => data(n.dataFechamento), ord: (n) => n.dataFechamento }
      ], negocios, {
        busca: false,
        vazioTitulo: 'Nenhuma compra registrada',
        vazioTexto: 'Compras feitas pela WeInvest aparecem aqui. Isso é diferente da carteira preexistente acima.',
        vazioAcao: `<button class="btn btn--primary" data-acao="wi-negocio-cliente" data-id="${esc(c.id)}">Registrar venda / negócio</button>`
      }) +
      `<div class="grid grid--2">
        ${cartao('Histórico de interações', (hist.interacoes || []).length
          ? `<div class="rows">${hist.interacoes.map((i) => `<div class="row" style="cursor:default">
              <span class="row__main"><span class="row__title">${esc(i.tipo || 'Interação')}</span>
                <span class="row__meta">${esc(data(i.data))} · ${esc(WB.pessoa(i.autor).nome)}</span>
                <span class="row__meta">${esc(i.texto)}</span></span></div>`).join('')}</div>`
          : WB.vazio('Sem interações', 'Registre a primeira conversa com este cliente.',
            `<button class="btn" data-acao="wi-interacao" data-id="${esc(c.id)}">Registrar interação</button>`), { flush: true })}
        ${cartao('Próximos passos', (hist.proximosPassos || []).length
          ? `<div class="rows">${hist.proximosPassos.map((p) => `<div class="row" style="cursor:default">
              <span class="row__main"><span class="row__title">${esc(p.texto)}</span>
                <span class="row__meta">${p.data ? esc(WB.prazoTexto(p.data)) + ' · ' + esc(data(p.data)) : 'sem data'}</span></span>
              <span class="row__side">${p.feito ? WB.chip('Feito', 'ok') : WB.chip('Pendente', 'warn')}</span></div>`).join('')}</div>`
          : WB.vazio('Nenhum próximo passo', 'Combine o próximo contato ao registrar uma interação.'), { flush: true })}
      </div>`;
  };

  /* ------------------------------------------------------------- ativos */
  V.ativos = function () {
    const todos = WB.data.wi.ativos;
    const lista = F2.ativosVisiveis();
    const ocultos = todos.length - lista.length;
    return cabecalho({
      titulo: 'Ativos e empreendimentos',
      sub: 'Base de ativos com status, categoria, localização, preço e origem.',
      acoes: `<button class="btn btn--primary" data-acao="wi-ativo">Cadastrar ativo</button>`
    }) +
    (ocultos ? `<div class="rule" style="margin-bottom:16px">
      <strong>${ocultos} ativo${ocultos > 1 ? 's' : ''} confidencial${ocultos > 1 ? 'is' : ''} não aparece${ocultos > 1 ? 'm' : ''} para o seu perfil.</strong>
      <p style="margin:6px 0 0">Este recorte é de interface. Ele também vale na busca, mas <strong>não é autorização</strong>: num protótipo que roda por <code>file://</code>, quem abre os arquivos lê tudo. Autorização real depende de servidor.</p>
    </div>` : '') +
    cartaoTabela('Ativos', [
      { titulo: 'Ativo', bruto: true, valor: (a) => `<a href="#/wi/ativo/${esc(a.id)}">${esc(a.titulo)}</a>${a.confidencial ? ' ' + WB.chip('Confidencial', 'warn') : ''}`, ord: (a) => a.titulo },
      { titulo: 'Status', valor: (a) => chipDe(CHIP_ATIVO, 'ativoStatus', a.status), bruto: true, ord: (a) => a.status },
      { titulo: 'Categoria', valor: (a) => a.categoria || '—' },
      { titulo: 'Tipo', valor: (a) => a.tipo || '—' },
      { titulo: 'Município', valor: (a) => (a.municipio || '—') + (a.estado ? ' / ' + a.estado : '') },
      { titulo: 'Área (m²)', num: true, valor: (a) => (a.area == null ? '—' : WB.milhar(a.area)), ord: (a) => a.area || '' },
      { titulo: 'Preço total', num: true, valor: (a) => moeda(a.precoTotal), ord: (a) => a.precoTotal || '' },
      { titulo: 'Preço/m²', num: true, valor: (a) => moeda(a.precoM2), ord: (a) => a.precoM2 || '' },
      { titulo: 'Origem', valor: (a) => a.origem === 'parceiro' ? (F2.nomeParceiro(F2.parceiro(a.parceiroId)) || 'Parceiro') : 'WeInvest' },
      { titulo: 'Exclusividade', valor: (a) => a.exclusividade ? 'Sim' + (a.exclusividadePrazo ? ' · até ' + data(a.exclusividadePrazo) : '') : 'Não' }
    ], lista, {
      vazioTitulo: 'Nenhum ativo visível',
      vazioTexto: 'Cadastre um ativo ou peça acesso aos que estão marcados como confidenciais.',
      vazioAcao: '<button class="btn btn--primary" data-acao="wi-ativo">Cadastrar ativo</button>'
    });
  };

  V.ativo = function (id) {
    const a = F2.ativo(id);
    if (!a) return naoEncontrado('Nenhum ativo com este identificador.', '#/wi/ativos', 'Ver todos os ativos');
    if (!F2.podeVerAtivo(a)) {
      return WB.vazio('Ativo confidencial',
        'Este ativo está marcado como confidencial e o seu perfil não está na lista de quem pode visualizar. O recorte é de interface, não autorização de servidor.',
        '<a class="btn" href="#/wi/ativos">Voltar aos ativos</a>');
    }
    const negocios = WB.data.wi.negocios.filter((n) => n.ativoId === a.id);
    const parceiro = a.parceiroId ? F2.parceiro(a.parceiroId) : null;
    const donos = WB.data.wi.clientes.filter((c) => (c.carteira || []).some((x) => x.ativoId === a.id));

    return voltar('#/wi/ativos', 'Ativos WeInvest') +
      cabecalho({
        titulo: a.titulo,
        sub: [a.id, F2.rotulo('ativoStatus', a.status), a.categoria, a.tipo].filter(Boolean).join(' · '),
        acoes: `<button class="btn" data-acao="wi-negocio-ativo" data-id="${esc(a.id)}">Registrar venda / negócio</button>
                <button class="btn btn--primary" data-acao="wi-ativo-editar" data-id="${esc(a.id)}">Editar ativo</button>`
      }) +
      `<div class="grid grid--2">
        ${cartao('Ficha', dl([
          ['Status', F2.rotulo('ativoStatus', a.status)],
          ['Categoria', a.categoria], ['Tipo', a.tipo],
          ['Endereço', a.endereco], ['Município / estado', [a.municipio, a.estado].filter(Boolean).join(' / ')],
          ['Coordenadas', a.coordenadas],
          ['Preço total', moeda(a.precoTotal), true],
          ['Área / metragem', a.area == null ? '' : WB.milhar(a.area) + ' m²'],
          ['Preço por m²', moeda(a.precoM2) + (a.precoM2Calculado ? ' <span class="muted">(calculado: preço ÷ área)</span>' : ''), true],
          ['Quartos', a.quartos == null ? '' : String(a.quartos)],
          ['Vagas', a.vagas == null ? '' : String(a.vagas)],
          ['Particularidades', a.particularidades],
          ['Observações', a.observacoes]
        ]))}
        ${cartao('Origem, comissão e acesso', dl([
          ['Origem', a.origem === 'parceiro' ? 'Parceiro' : 'WeInvest'],
          ['Quem trouxe o ativo', parceiro ? `<a href="#/wi/parceiro/${esc(parceiro.id)}">${esc(F2.nomeParceiro(parceiro))}</a>` : (a.origem === 'weinvest' ? 'Equipe WeInvest' : ''), true],
          ['Comissão', a.comissaoPercentual == null ? (a.comissaoCondicao || '') : F2.pct(a.comissaoPercentual) + (a.comissaoCondicao ? ' · ' + a.comissaoCondicao : '')],
          ['Exclusividade', a.exclusividade ? 'Sim' + (a.exclusividadePrazo ? ' · prazo ' + data(a.exclusividadePrazo) : '') : 'Não'],
          ['Confidencialidade', a.confidencial
            ? 'Sim · visível para ' + (a.confidencialPara || []).join(', ')
            : 'Não'],
          ['Proprietários', (a.proprietarios || []).length
            ? (a.proprietarios || []).map((p) => esc(p.nome) + (p.clienteId ? ` · <a href="#/wi/cliente/${esc(p.clienteId)}">ficha</a>` : '')).join('<br>')
            : '', true]
        ]) + (a.confidencial ? nota('suposto', 'O filtro de confidencialidade vale nas listas e na busca deste protótipo, mas não substitui autorização de servidor.') : ''))}
      </div>` +
      `<div class="grid grid--2">
        ${cartaoTabela('Documentos', [
          { titulo: 'Documento', valor: 'nome' }, { titulo: 'Tipo', valor: (x) => x.tipo || '—' },
          { titulo: 'Endereço', bruto: true, valor: (x) => x.url ? `<a href="${esc(x.url)}">abrir</a>` : '—' }
        ], a.documentos || [], { busca: false, vazioTitulo: 'Sem documentos', vazioTexto: 'Este protótipo guarda referências e endereços, não arquivos.' })}
        ${cartaoTabela('Fotos e vídeos', [
          { titulo: 'Item', valor: 'nome' }, { titulo: 'Tipo', valor: (x) => x.tipo || '—' },
          { titulo: 'Endereço', bruto: true, valor: (x) => x.url ? `<a href="${esc(x.url)}">abrir</a>` : '—' }
        ], a.midia || [], { busca: false, vazioTitulo: 'Sem mídia', vazioTexto: 'Nenhuma galeria referenciada. Não há upload remoto aqui.' })}
      </div>` +
      cartaoTabela('Negócios deste ativo', [
        { titulo: 'Negócio', bruto: true, valor: (n) => `<a href="#/wi/negocio/${esc(n.id)}">${esc(n.id)}</a>` },
        { titulo: 'Cliente', valor: (n) => F2.nomeCliente(F2.cliente(n.clienteId)) },
        { titulo: 'Situação', valor: (n) => chipDe(CHIP_NEGOCIO, 'negocioSituacao', n.situacao), bruto: true },
        { titulo: 'Valor negociado', num: true, valor: (n) => moeda(n.valorNegociado) },
        { titulo: 'Fechamento', valor: (n) => data(n.dataFechamento) }
      ], negocios, { busca: false, vazioTitulo: 'Nenhum negócio', vazioTexto: 'Registre uma venda ou negociação para este ativo.' }) +
      (donos.length ? cartaoTabela('Clientes que têm este ativo na carteira', [
        { titulo: 'Cliente', bruto: true, valor: (c) => `<a href="#/wi/cliente/${esc(c.id)}">${esc(F2.nomeCliente(c))}</a>` },
        { titulo: 'Situação na carteira', valor: (c) => (c.carteira.find((x) => x.ativoId === a.id) || {}).status || '—' }
      ], donos, { busca: false }) : '');
  };

  /* ---------------------------------------------------------- parceiros */
  V.parceiros = function () {
    const lista = WB.data.wi.parceiros;
    return cabecalho({
      titulo: 'Parceiros',
      sub: 'Originadores e parceiros externos, com histórico e performance calculados dos registros.',
      acoes: `<button class="btn btn--primary" data-acao="wi-parceiro">Adicionar parceiro</button>`
    }) +
    cartaoTabela('Parceiros', [
      { titulo: 'Parceiro', bruto: true, valor: (p) => `<a href="#/wi/parceiro/${esc(p.id)}">${esc(F2.nomeParceiro(p))}</a>`, ord: (p) => F2.nomeParceiro(p) },
      { titulo: 'Pessoa', valor: (p) => (p.categoriaPessoa === 'pj' ? 'PJ' : 'PF') },
      { titulo: 'Categoria', valor: (p) => F2.rotulo('parceiroCategoria', p.categoria) },
      { titulo: 'Tipo / perfil', valor: (p) => (p.tipos || []).join(', ') || '—' },
      { titulo: 'Mercados', valor: (p) => (p.mercados || []).join(', ') || '—' },
      { titulo: 'Especialidade', valor: (p) => (p.especialidades || []).join(', ') || '—' },
      { titulo: 'Angariações', num: true, valor: (p) => F2.performanceParceiro(p.id).angariacoes },
      { titulo: 'Vendas', num: true, valor: (p) => F2.performanceParceiro(p.id).vendas },
      { titulo: 'VGV vendido', num: true, valor: (p) => moeda(F2.performanceParceiro(p.id).vgvVendido) },
      { titulo: 'Situação', valor: (p) => WB.chipStatus(p.status), bruto: true }
    ], lista, {
      vazioTitulo: 'Nenhum parceiro',
      vazioTexto: 'Adicione o primeiro parceiro da WeInvest.',
      vazioAcao: '<button class="btn btn--primary" data-acao="wi-parceiro">Adicionar parceiro</button>'
    }) +
    nota('suposto', 'Fórmulas: taxa de conversão = negócios vendidos ÷ negócios em que o parceiro participou; volume gerado = soma do valor negociado das vendas; angariações = ativos cuja origem é este parceiro. As fotos não definem esses denominadores.');
  };

  V.parceiro = function (id) {
    const p = F2.parceiro(id);
    if (!p) return naoEncontrado('Nenhum parceiro com este identificador.', '#/wi/parceiros', 'Ver todos os parceiros');
    const perf = F2.performanceParceiro(p.id);
    const negocios = WB.data.wi.negocios.filter((n) => (n.parceiros || []).some((x) => x.parceiroId === p.id));

    return voltar('#/wi/parceiros', 'Parceiros WeInvest') +
      cabecalho({
        titulo: F2.nomeParceiro(p),
        sub: [p.id, F2.rotulo('parceiroCategoria', p.categoria), (p.tipos || []).join(', ')].filter(Boolean).join(' · '),
        acoes: `<button class="btn btn--primary" data-acao="wi-parceiro-editar" data-id="${esc(p.id)}">Editar parceiro</button>`
      }) +
      kpis([
        { rotulo: 'Volume gerado', valor: perf.volumeGerado == null ? null : WB.moeda(perf.volumeGerado), nota: 'valor negociado das vendas' },
        { rotulo: 'Taxa de conversão', valor: perf.conversao == null ? null : F2.pct(perf.conversao), nota: perf.negocios + ' negócio(s) com participação' },
        { rotulo: 'VGV vendido', valor: perf.vgvVendido == null ? null : WB.moeda(perf.vgvVendido), nota: 'soma do VGV das vendas' },
        { rotulo: 'Angariações / vendas', valor: perf.angariacoes + ' / ' + perf.vendas, nota: 'ativos originados e vendas fechadas' }
      ]) +
      nota('suposto', 'Conversão = vendas ÷ negócios em que participou. Não é lead→venda: o lead não pertence ao parceiro. Todos os números acima saem dos registros desta base; nenhum é fixo.') +
      `<div class="grid grid--2">
        ${cartao('Cadastro', dl([
          ['Categoria de pessoa', p.categoriaPessoa === 'pj' ? 'Pessoa jurídica' : 'Pessoa física'],
          p.categoriaPessoa === 'pj' ? ['Razão social', p.razaoSocial] : ['Nome completo', p.nome],
          p.categoriaPessoa === 'pj' ? ['CNPJ', p.cnpj] : ['CPF', p.cpf],
          p.categoriaPessoa === 'pj' ? ['Representante', p.nome] : null,
          ['Status', p.status === 'ativo' ? 'Ativo' : 'Inativo'],
          ['Categoria', F2.rotulo('parceiroCategoria', p.categoria)],
          ['Tipo / perfil profissional', (p.tipos || []).join(', ')],
          ['Mercados / cidades', (p.mercados || []).join(', ')],
          ['Especialidade', (p.especialidades || []).join(', ')],
          ['WhatsApp', p.whatsapp], ['E-mail', p.email],
          ['Parceiro desde', data(p.desde)], ['Observações', p.observacoes]
        ]))}
        ${cartao('Comissões', dl([
          ['Comissão prevista', perf.comissoes.length ? WB.moeda(perf.comissoesPrevistas) : '', true],
          ['Comissão efetivamente recebida', perf.comissoes.length ? WB.moeda(perf.comissoesRecebidas) : '', true],
          ['A receber', perf.comissoes.length ? WB.moeda(perf.comissoesPrevistas - perf.comissoesRecebidas) : '', true],
          ['Linhas de comissão', String(perf.comissoes.length)]
        ]) + nota('suposto', 'Prevista e recebida são coisas diferentes: "recebida" só conta a linha marcada como recebida, com data. Nada é deduzido automaticamente.'))}
      </div>` +
      cartaoTabela('Ativos originados', [
        { titulo: 'Ativo', bruto: true, valor: (a) => `<a href="#/wi/ativo/${esc(a.id)}">${esc(a.titulo)}</a>` },
        { titulo: 'Status', valor: (a) => chipDe(CHIP_ATIVO, 'ativoStatus', a.status), bruto: true },
        { titulo: 'Categoria', valor: (a) => a.categoria || '—' },
        { titulo: 'Preço total', num: true, valor: (a) => moeda(a.precoTotal) }
      ], perf.ativosOriginados, { busca: false, vazioTitulo: 'Nenhum ativo originado', vazioTexto: 'Ativos com origem "parceiro" apontando para este cadastro aparecem aqui.' }) +
      cartaoTabela('Negócios em que participou', [
        { titulo: 'Negócio', bruto: true, valor: (n) => `<a href="#/wi/negocio/${esc(n.id)}">${esc(n.id)}</a>` },
        { titulo: 'Papel', valor: (n) => F2.rotulo('papelParceiro', ((n.parceiros || []).find((x) => x.parceiroId === p.id) || {}).papel) },
        { titulo: 'Cliente', valor: (n) => F2.nomeCliente(F2.cliente(n.clienteId)) },
        { titulo: 'Situação', valor: (n) => chipDe(CHIP_NEGOCIO, 'negocioSituacao', n.situacao), bruto: true },
        { titulo: 'Valor negociado', num: true, valor: (n) => moeda(n.valorNegociado) },
        { titulo: 'Comissão deste parceiro', num: true, valor: (n) => {
          const linhas = (n.comissoes || []).filter((c) => c.beneficiario === 'parceiro' && c.parceiroId === p.id);
          return linhas.length ? WB.moeda(linhas.reduce((s, c) => s + (num(c.valor) || 0), 0)) : '—';
        } }
      ], negocios, { busca: false, vazioTitulo: 'Nenhum negócio', vazioTexto: 'Negócios que listam este parceiro aparecem aqui.' }) +
      (perf.clientesIndicados.length ? cartaoTabela('Clientes indicados', [
        { titulo: 'Cliente', bruto: true, valor: (c) => `<a href="#/wi/cliente/${esc(c.id)}">${esc(F2.nomeCliente(c))}</a>` }
      ], perf.clientesIndicados, { busca: false }) : '');
  };

  /* ----------------------------------------------------------- negócios */
  V.negocios = function () {
    const lista = WB.data.wi.negocios;
    const vendidos = lista.filter((n) => n.situacao === 'vendido');
    return cabecalho({
      titulo: 'Vendas e negócios',
      sub: 'Negociação em aberto e venda registrada são situações distintas — só a venda converte lead e alimenta os resumos.',
      acoes: `<button class="btn btn--primary" data-acao="wi-negocio">Cadastrar venda / negócio</button>`
    }) +
    kpis([
      { rotulo: 'Vendas registradas', valor: String(vendidos.length), nota: 'situação "venda registrada"' },
      { rotulo: 'VGV vendido', valor: vendidos.length ? WB.moeda(vendidos.reduce((s, n) => s + (num(n.vgv) || 0), 0)) : null, nota: 'soma do campo VGV' },
      { rotulo: 'Valor negociado', valor: vendidos.length ? WB.moeda(vendidos.reduce((s, n) => s + (num(n.valorNegociado) || 0), 0)) : null, nota: 'não é VGV nem receita' },
      { rotulo: 'Em negociação', valor: String(lista.filter((n) => n.situacao === 'negociacao').length), nota: 'oportunidades abertas' }
    ]) +
    cartaoTabela('Negócios', [
      { titulo: 'Número', bruto: true, valor: (n) => `<a href="#/wi/negocio/${esc(n.id)}"><span class="mono">${esc(n.id)}</span></a>` },
      { titulo: 'Cliente', valor: (n) => F2.nomeCliente(F2.cliente(n.clienteId)) },
      { titulo: 'Ativo', valor: (n) => { const a = F2.ativo(n.ativoId); return a ? a.titulo : '—'; } },
      { titulo: 'Responsável', valor: (n) => WB.pessoa(n.responsavel).nome },
      { titulo: 'Parceiros', valor: (n) => (n.parceiros || []).length ? n.parceiros.map((x) => F2.nomeParceiro(F2.parceiro(x.parceiroId))).join(', ') : 'Sem parceiro' },
      { titulo: 'Situação', valor: (n) => chipDe(CHIP_NEGOCIO, 'negocioSituacao', n.situacao), bruto: true, ord: (n) => n.situacao },
      { titulo: 'Valor negociado', num: true, valor: (n) => moeda(n.valorNegociado), ord: (n) => n.valorNegociado || '' },
      { titulo: 'VGV', num: true, valor: (n) => moeda(n.vgv), ord: (n) => n.vgv || '' },
      { titulo: 'Comissão bruta', num: true, valor: (n) => moeda(n.comissaoBrutaValor) },
      { titulo: 'Comissão líquida', num: true, valor: (n) => moeda(n.comissaoLiquidaValor) },
      { titulo: 'Fechamento', valor: (n) => data(n.dataFechamento), ord: (n) => n.dataFechamento }
    ], lista, {
      vazioTitulo: 'Nenhum negócio',
      vazioTexto: 'Registre a primeira negociação ou venda da WeInvest.',
      vazioAcao: '<button class="btn btn--primary" data-acao="wi-negocio">Cadastrar venda / negócio</button>'
    }) +
    nota('suposto', 'VGV, valor negociado, comissão bruta e comissão líquida são campos independentes. O sistema nunca calcula um a partir do outro — as fotos não definem impostos, descontos nem rateio.');
  };

  V.negocio = function (id) {
    const n = F2.negocio(id);
    if (!n) return naoEncontrado('Nenhum negócio com este identificador.', '#/wi/negocios', 'Ver todos os negócios');
    const cliente = F2.cliente(n.clienteId);
    const ativo = F2.ativo(n.ativoId);
    const lead = n.leadId ? F2.lead(n.leadId) : null;
    const com = F2.resumoComissoes(n);
    const aReceber = F2.aReceber(n);
    const pctBruta = F2.percentualSobre(n.comissaoBrutaValor, n.valorNegociado);

    return voltar('#/wi/negocios', 'Vendas e negócios') +
      cabecalho({
        titulo: (ativo ? ativo.titulo : 'Negócio ' + n.id),
        sub: [n.id, F2.rotulo('negocioSituacao', n.situacao), cliente ? F2.nomeCliente(cliente) : ''].filter(Boolean).join(' · '),
        acoes: `<button class="btn btn--primary" data-acao="wi-negocio-editar" data-id="${esc(n.id)}">Editar negócio</button>`
      }) +
      (com.excedeBruta ? `<div class="rule" style="margin-bottom:16px;border-left-color:var(--late)">
        <strong>A soma do rateio passa da comissão bruta.</strong>
        <p style="margin:6px 0 0">Rateio ${WB.moeda(com.prevista)} contra bruta ${WB.moeda(com.bruta)}. Nada foi ajustado: as regras de divisão não estão definidas nas fotos.</p>
      </div>` : '') +
      kpis([
        { rotulo: 'Valor negociado', valor: n.valorNegociado == null ? null : WB.moeda(n.valorNegociado), nota: 'base de cálculo dos percentuais' },
        { rotulo: 'VGV', valor: n.vgv == null ? null : WB.moeda(n.vgv), nota: 'valor geral de vendas do ativo' },
        { rotulo: 'Comissão bruta', valor: n.comissaoBrutaValor == null ? null : WB.moeda(n.comissaoBrutaValor), nota: pctBruta == null ? 'percentual não calculável' : F2.pct(pctBruta) + ' do valor negociado' },
        { rotulo: 'Comissão líquida', valor: n.comissaoLiquidaValor == null ? null : WB.moeda(n.comissaoLiquidaValor), nota: 'campo informado, não calculado' }
      ]) +
      `<div class="grid grid--2">
        ${cartao('Partes', dl([
          ['Cliente', cliente ? `<a href="#/wi/cliente/${esc(cliente.id)}">${esc(F2.nomeCliente(cliente))}</a>` : '', true],
          ['Representante do cliente', n.clienteRepresentante],
          ['Ativo', ativo ? `<a href="#/wi/ativo/${esc(ativo.id)}">${esc(ativo.titulo)}</a>` : '', true],
          ['Representante do ativo', n.ativoRepresentante],
          ['Responsável pela negociação', WB.pessoa(n.responsavel).nome],
          ['Parceiros envolvidos', (n.parceiros || []).length
            ? n.parceiros.map((x) => `<a href="#/wi/parceiro/${esc(x.parceiroId)}">${esc(F2.nomeParceiro(F2.parceiro(x.parceiroId)))}</a> · ${esc(F2.rotulo('papelParceiro', x.papel))}`).join('<br>')
            : 'Sem parceiro', true],
          ['Lead de origem', lead ? esc(lead.id) + ' · ' + esc(lead.nome) + ' · ' + esc(F2.rotulo('leadStatus', lead.status)) : '<span class="muted">venda direta</span>', true]
        ]))}
        ${cartao('Condições', dl([
          ['Situação', F2.rotulo('negocioSituacao', n.situacao)],
          ['Formato da negociação', n.formato],
          ['Contrato', n.contrato],
          ['Data de fechamento', n.dataFechamento ? data(n.dataFechamento) : ''],
          ['Unidades', n.unidades == null ? '' : String(n.unidades)],
          ['Valor recebido', moeda(n.valorRecebido), true],
          ['Valor a receber', aReceber == null ? '<span class="muted">depende de valor negociado e recebido</span>' : WB.moeda(aReceber), true],
          ['Observações', n.observacoes]
        ]))}
      </div>` +
      cartaoTabela('Rateio da comissão', [
        { titulo: 'Beneficiário', valor: (c) => c.beneficiario === 'parceiro' ? F2.nomeParceiro(F2.parceiro(c.parceiroId)) : (c.beneficiario === 'weinvest' ? 'WeInvest' : 'Outro') },
        { titulo: 'Valor', num: true, valor: (c) => moeda(c.valor) },
        { titulo: '% sobre o negociado', num: true, valor: (c) => (c.percentual == null ? '—' : F2.pct(c.percentual)) },
        { titulo: 'Situação', valor: (c) => c.recebido ? WB.chip('Recebida', 'ok') : WB.chip('Prevista', 'warn'), bruto: true },
        { titulo: 'Data do recebimento', valor: (c) => data(c.dataRecebimento) }
      ], n.comissoes || [], {
        busca: false,
        tools: `<span class="card__tools muted">prevista ${com.prevista == null ? '—' : WB.moeda(com.prevista)} · recebida ${com.recebida == null ? '—' : WB.moeda(com.recebida)}</span>`,
        vazioTitulo: 'Sem rateio informado',
        vazioTexto: 'Nenhuma linha de comissão foi registrada. O sistema não divide a comissão sozinho.'
      }) +
      nota('suposto', 'Comissão prevista soma todas as linhas; comissão recebida soma só as marcadas como recebidas, que exigem data. Os percentuais incidem sobre o valor negociado.');
  };

  /* ----------------------------------------------- CRM e dashboards WI */
  V.crm = function () {
    const leads = WB.data.wi.leads.filter((l) => l.status !== 'convertido' && l.status !== 'perdido');
    const negociacao = WB.data.wi.negocios.filter((n) => n.situacao === 'negociacao');
    const funil = [
      { etapa: 'Leads em aberto', valor: leads.length },
      { etapa: 'Qualificados', valor: WB.data.wi.leads.filter((l) => ['qualificado', 'negociacao'].indexOf(l.status) >= 0).length },
      { etapa: 'Negócios em negociação', valor: negociacao.length },
      { etapa: 'Vendas registradas', valor: F2.vendas().length }
    ];
    return cabecalho({
      titulo: 'CRM',
      sub: 'Funil da WeInvest montado com os registros do próprio portal.',
      acoes: `<button class="btn" data-acao="wi-lead">Cadastrar lead</button>
              <button class="btn btn--primary" data-acao="wi-negocio">Cadastrar venda / negócio</button>`
    }) +
    `<div class="rule" style="margin-bottom:16px"><strong>Integração de CRM externo não está conectada.</strong>
      <p style="margin:6px 0 0">Tudo abaixo foi cadastrado dentro do WeBrain. Nada é lido de um CRM de mercado.</p></div>` +
    nota('duvida', 'Os estágios do CRM não estão definidos nas fotos. Este funil usa as situações de lead e de negócio que existem hoje; é o que dá para sustentar sem inventar etapas.') +
    cartao('Funil', WB.funil(funil), { flush: true }) +
    cartaoTabela('Leads em aberto', [
      { titulo: 'Lead', valor: 'nome' },
      { titulo: 'Canal', valor: (l) => l.canal || '—' },
      { titulo: 'Categoria', valor: (l) => l.categoria || '—' },
      { titulo: 'Situação', valor: (l) => chipDe(CHIP_LEAD, 'leadStatus', l.status), bruto: true },
      { titulo: 'Responsável', valor: (l) => WB.pessoa(l.responsavel).nome },
      { titulo: 'Entrada', valor: (l) => data(l.dataEntrada) },
      { titulo: 'Ações', ordenavel: false, bruto: true, valor: (l) => `<button class="btn btn--sm" data-acao="wi-negocio-lead" data-id="${esc(l.id)}">Registrar negócio</button>` }
    ], leads, { vazioTitulo: 'Nenhum lead em aberto', vazioTexto: 'Cadastre um lead para começar o acompanhamento.' }) +
    cartaoTabela('Negócios em negociação', [
      { titulo: 'Negócio', bruto: true, valor: (n) => `<a href="#/wi/negocio/${esc(n.id)}">${esc(n.id)}</a>` },
      { titulo: 'Cliente ou lead', valor: (n) => n.clienteId ? F2.nomeCliente(F2.cliente(n.clienteId)) : ((F2.lead(n.leadId) || {}).nome || '—') },
      { titulo: 'Ativo', valor: (n) => (F2.ativo(n.ativoId) || {}).titulo || '—' },
      { titulo: 'Valor negociado', num: true, valor: (n) => moeda(n.valorNegociado) },
      { titulo: 'Atualizado', valor: (n) => data(n.atualizadoEm) }
    ], negociacao, { busca: false, vazioTitulo: 'Nenhuma negociação aberta', vazioTexto: 'Negócios com situação "em negociação" aparecem aqui.' });
  };

  V.dash = function (aba) {
    const abasDash = [
      { id: 'geral', nome: 'WeInvest' },
      { id: 'clientes', nome: 'Perfil de cliente' },
      { id: 'performance', nome: 'Performance do time' }
    ];
    const f = abasDash.some((a) => a.id === aba) ? aba : 'geral';
    const topo = cabecalho({
      titulo: 'Painéis WeInvest',
      sub: 'Todos os números saem dos registros desta base. Sem registro, a tela diz "sem dados".'
    }) + abas(abasDash, f, '/wi/dash');

    if (f === 'clientes') return topo + dashClientes();
    if (f === 'performance') return topo + dashPerformance();
    return topo + dashGeral();
  };

  function dashGeral() {
    const vendas = F2.vendas();
    const ativos = F2.ativosVisiveis();
    const disponiveis = ativos.filter((a) => a.status === 'disponivel');
    const vgv = vendas.reduce((s, n) => s + (num(n.vgv) || 0), 0);
    const negociado = vendas.reduce((s, n) => s + (num(n.valorNegociado) || 0), 0);
    const comissaoPrevista = vendas.reduce((s, n) => s + ((F2.resumoComissoes(n).prevista) || 0), 0);
    const comissaoRecebida = vendas.reduce((s, n) => s + ((F2.resumoComissoes(n).recebida) || 0), 0);
    const porCategoria = {};
    ativos.forEach((a) => { const k = a.categoria || 'Sem categoria'; porCategoria[k] = (porCategoria[k] || 0) + 1; });

    return kpis([
      { rotulo: 'Vendas registradas', valor: String(vendas.length), nota: 'negócios com situação "venda registrada"' },
      { rotulo: 'VGV vendido', valor: vendas.length ? WB.moeda(vgv) : null, nota: 'soma do campo VGV' },
      { rotulo: 'Valor negociado', valor: vendas.length ? WB.moeda(negociado) : null, nota: 'não é receita nem comissão' },
      { rotulo: 'Ativos disponíveis', valor: disponiveis.length + ' de ' + ativos.length, nota: 'no seu escopo de visualização' }
    ]) +
    kpis([
      { rotulo: 'Comissão prevista', valor: comissaoPrevista ? WB.moeda(comissaoPrevista) : null, nota: 'soma do rateio das vendas' },
      { rotulo: 'Comissão recebida', valor: comissaoRecebida ? WB.moeda(comissaoRecebida) : null, nota: 'só linhas marcadas como recebidas' },
      { rotulo: 'Leads em aberto', valor: String(WB.data.wi.leads.filter((l) => ['convertido', 'perdido'].indexOf(l.status) < 0).length), nota: 'entrada do funil' },
      { rotulo: 'Parceiros ativos', valor: String(WB.data.wi.parceiros.filter((p) => p.status === 'ativo').length), nota: 'de ' + WB.data.wi.parceiros.length + ' cadastrados' }
    ]) +
    `<div class="grid grid--2">
      ${cartao('Ativos por categoria', Object.keys(porCategoria).length
        ? WB.barras(Object.keys(porCategoria).map((k) => ({ rotulo: k, valor: porCategoria[k] })), { descricao: 'Ativos por categoria', colRotulo: 'Categoria', colValor: 'Ativos' })
        : WB.vazio('Sem ativos', 'Cadastre ativos para ver a distribuição por categoria.'), { flush: true })}
      ${cartao('VGV vendido por negócio', vendas.length
        ? WB.barras(vendas.map((n) => ({ rotulo: (F2.ativo(n.ativoId) || {}).titulo || n.id, valor: num(n.vgv) || 0 })), { descricao: 'VGV por negócio', formatar: WB.moeda, colRotulo: 'Negócio', colValor: 'VGV' })
        : WB.vazio('Sem vendas registradas', 'O VGV aparece quando existir ao menos um negócio com venda registrada.'), { flush: true })}
    </div>` +
    nota('suposto', 'Comissão prevista e recebida somam as linhas de rateio dos negócios vendidos. Não há dedução de imposto: as fotos não definem nenhuma.');
  }

  function dashClientes() {
    const clientes = WB.data.wi.clientes;
    if (!clientes.length) return WB.vazio('Sem clientes', 'Cadastre clientes WeInvest para ver o perfil da base.');
    const conta = (campo) => {
      const m = {};
      clientes.forEach((c) => {
        const vals = campo(c);
        (Array.isArray(vals) ? vals : [vals]).filter(Boolean).forEach((v) => { m[v] = (m[v] || 0) + 1; });
      });
      return Object.keys(m).map((k) => ({ rotulo: k, valor: m[k] }));
    };
    const objetivos = conta((c) => (c.perfil || {}).objetivos);
    const perfilInv = conta((c) => (c.perfil || {}).perfilInvestimento);
    const classif = conta((c) => c.classificacao);
    const canal = conta((c) => c.canalOrigem);
    const grafico = (titulo, dados, colRotulo) => cartao(titulo, dados.length
      ? WB.barras(dados, { descricao: titulo, colRotulo, colValor: 'Clientes' })
      : WB.vazio('Sem dados', 'Nenhum cliente com este campo preenchido.'), { flush: true });

    return kpis([
      { rotulo: 'Clientes', valor: String(clientes.length), nota: 'base WeInvest' },
      { rotulo: 'Pessoa jurídica', valor: String(clientes.filter((c) => c.categoria === 'pj').length), nota: 'de ' + clientes.length },
      { rotulo: 'Com compra registrada', valor: String(clientes.filter((c) => F2.resumoCliente(c.id).vendas > 0).length), nota: 'ao menos uma venda' },
      { rotulo: 'Com carteira preexistente', valor: String(clientes.filter((c) => (c.carteira || []).some((x) => !x.negocioId)).length), nota: 'imóveis anteriores à WeInvest' }
    ]) +
    `<div class="grid grid--2">
      ${grafico('Objetivos declarados', objetivos, 'Objetivo')}
      ${grafico('Perfil de investimento', perfilInv, 'Perfil')}
      ${grafico('Classificação', classif, 'Classificação')}
      ${grafico('Canal de origem', canal, 'Canal')}
    </div>` +
    cartaoTabela('Base de clientes', [
      { titulo: 'Cliente', bruto: true, valor: (c) => `<a href="#/wi/cliente/${esc(c.id)}">${esc(F2.nomeCliente(c))}</a>` },
      { titulo: 'Objetivos', valor: (c) => ((c.perfil || {}).objetivos || []).join(', ') || '—' },
      { titulo: 'Ticket', valor: (c) => { const p = c.perfil || {}; return p.ticketMin == null && p.ticketMax == null ? '—' : moeda(p.ticketMin) + ' a ' + moeda(p.ticketMax); } },
      { titulo: 'Regiões', valor: (c) => ((c.perfil || {}).regioes || []).join(', ') || '—' },
      { titulo: 'VGV comprado', num: true, valor: (c) => moeda(F2.resumoCliente(c.id).vgvComprado) }
    ], clientes, { busca: false });
  }

  function dashPerformance() {
    const pessoas = {};
    F2.vendas().forEach((n) => {
      const k = n.responsavel || 'sem-responsavel';
      pessoas[k] = pessoas[k] || { vendas: 0, vgv: 0, negociado: 0 };
      pessoas[k].vendas += 1;
      pessoas[k].vgv += num(n.vgv) || 0;
      pessoas[k].negociado += num(n.valorNegociado) || 0;
    });
    const ranking = Object.keys(pessoas).map((k) => ({
      pessoa: WB.pessoa(k).nome, vendas: pessoas[k].vendas, vgv: pessoas[k].vgv, negociado: pessoas[k].negociado
    })).sort((a, b) => b.vgv - a.vgv);

    const parceiros = WB.data.wi.parceiros.map((p) => Object.assign({ parceiro: p }, F2.performanceParceiro(p.id)))
      .sort((a, b) => (b.vgvVendido || 0) - (a.vgvVendido || 0));

    return (ranking.length
      ? cartao('Ranking do time por VGV vendido', WB.barras(ranking.map((r) => ({ rotulo: r.pessoa, valor: r.vgv })), { descricao: 'VGV por responsável', formatar: WB.moeda, colRotulo: 'Responsável', colValor: 'VGV' }), { flush: true })
      : WB.vazio('Sem vendas registradas', 'O ranking do time aparece quando existir ao menos uma venda registrada com responsável.')) +
    cartaoTabela('Time', [
      { titulo: 'Responsável', valor: 'pessoa' },
      { titulo: 'Vendas', num: true, valor: 'vendas' },
      { titulo: 'VGV vendido', num: true, valor: (r) => WB.moeda(r.vgv) },
      { titulo: 'Valor negociado', num: true, valor: (r) => WB.moeda(r.negociado) }
    ], ranking, { busca: false, vazioTitulo: 'Sem dados de time', vazioTexto: 'Nenhuma venda registrada até aqui.' }) +
    cartaoTabela('Parceiros', [
      { titulo: 'Parceiro', bruto: true, valor: (r) => `<a href="#/wi/parceiro/${esc(r.parceiro.id)}">${esc(F2.nomeParceiro(r.parceiro))}</a>` },
      { titulo: 'Negócios', num: true, valor: 'negocios' },
      { titulo: 'Vendas', num: true, valor: 'vendas' },
      { titulo: 'Conversão', num: true, valor: (r) => (r.conversao == null ? '—' : F2.pct(r.conversao)) },
      { titulo: 'Angariações', num: true, valor: 'angariacoes' },
      { titulo: 'VGV vendido', num: true, valor: (r) => moeda(r.vgvVendido) },
      { titulo: 'Comissão recebida', num: true, valor: (r) => (r.comissoes.length ? WB.moeda(r.comissoesRecebidas) : '—') }
    ], parceiros, { busca: false }) +
    nota('suposto', 'O ranking usa o responsável pela negociação registrado em cada venda. As fotos pedem "performance do time (ranking)" sem definir critério — este é o critério adotado.');
  }

  /* ------------------------------------------- itens exploratórios WI */
  const EXPLORAR = {
    terrenos: {
      titulo: 'Inteligência de terrenos',
      leitura: 'Na foto o item aparece ligado a "Ativos", dentro de um agrupamento circulado junto com comparação, documentação e conexões relevantes. A relação exata não está definida.',
      interpretacao: 'Interpretamos como uma leitura derivada da base de ativos: recorte dos ativos de tipo terreno, fazenda e área para desenvolvimento.',
      conteudo: () => {
        const tipos = ['Terreno', 'Fazenda', 'Área para desenvolvimento'];
        const lista = F2.ativosVisiveis().filter((a) => tipos.indexOf(a.tipo) >= 0);
        return cartaoTabela('Terrenos e áreas na base', [
          { titulo: 'Ativo', bruto: true, valor: (a) => `<a href="#/wi/ativo/${esc(a.id)}">${esc(a.titulo)}</a>` },
          { titulo: 'Tipo', valor: (a) => a.tipo },
          { titulo: 'Município', valor: (a) => (a.municipio || '—') + (a.estado ? ' / ' + a.estado : '') },
          { titulo: 'Área (m²)', num: true, valor: (a) => (a.area == null ? '—' : WB.milhar(a.area)) },
          { titulo: 'Preço/m²', num: true, valor: (a) => moeda(a.precoM2) },
          { titulo: 'Status', valor: (a) => chipDe(CHIP_ATIVO, 'ativoStatus', a.status), bruto: true }
        ], lista, { vazioTitulo: 'Nenhum terreno na base', vazioTexto: 'Cadastre ativos do tipo terreno, fazenda ou área para desenvolvimento.' });
      }
    },
    comparacao: {
      titulo: 'Comparação e documentação de ativos',
      leitura: 'As palavras "comparação" e "documentação" aparecem soltas ao lado de "Ativos", sem campos nem regra de comparação.',
      interpretacao: 'Interpretamos como uma tabela lado a lado dos ativos visíveis, com preço, área, preço/m² e quantos documentos cada um tem referenciados.',
      conteudo: () => {
        const lista = F2.ativosVisiveis();
        const semDoc = lista.filter((a) => !(a.documentos || []).length).length;
        return (semDoc ? `<div class="rule" style="margin-bottom:16px"><strong>${semDoc} ativo${semDoc > 1 ? 's' : ''} sem documento referenciado.</strong>
          <p style="margin:6px 0 0">Referência de documento, não arquivo: este protótipo não guarda binários.</p></div>` : '') +
        cartaoTabela('Comparação', [
          { titulo: 'Ativo', bruto: true, valor: (a) => `<a href="#/wi/ativo/${esc(a.id)}">${esc(a.titulo)}</a>` },
          { titulo: 'Categoria', valor: (a) => a.categoria || '—' },
          { titulo: 'Tipo', valor: (a) => a.tipo || '—' },
          { titulo: 'Área (m²)', num: true, valor: (a) => (a.area == null ? '—' : WB.milhar(a.area)) },
          { titulo: 'Preço total', num: true, valor: (a) => moeda(a.precoTotal) },
          { titulo: 'Preço/m²', num: true, valor: (a) => moeda(a.precoM2) },
          { titulo: 'Documentos', num: true, valor: (a) => (a.documentos || []).length },
          { titulo: 'Mídia', num: true, valor: (a) => (a.midia || []).length }
        ], lista, { vazioTitulo: 'Nenhum ativo visível', vazioTexto: 'Cadastre ativos para comparar.' });
      }
    },
    conexoes: {
      titulo: 'Conexões relevantes',
      leitura: 'O termo aparece duas vezes na foto: uma riscada ao lado de "documentação" e outra solta no agrupamento circulado. Não há campos.',
      interpretacao: 'Interpretamos como o mapa de ligações já existentes entre os registros: quem indicou quem, qual parceiro originou qual ativo e quais clientes compartilham grupo econômico. Nenhuma inferência automática, nenhuma IA.',
      conteudo: () => {
        const ligacoes = [];
        WB.data.wi.ativos.forEach((a) => {
          if (a.origem === 'parceiro' && a.parceiroId) {
            ligacoes.push({ de: F2.nomeParceiro(F2.parceiro(a.parceiroId)), tipo: 'originou o ativo', para: a.titulo, rota: '#/wi/ativo/' + a.id });
          }
        });
        WB.data.wi.negocios.forEach((n) => {
          (n.parceiros || []).forEach((p) => {
            ligacoes.push({ de: F2.nomeParceiro(F2.parceiro(p.parceiroId)), tipo: F2.rotulo('papelParceiro', p.papel).toLowerCase() + ' no negócio', para: n.id, rota: '#/wi/negocio/' + n.id });
          });
        });
        WB.data.wi.clientes.forEach((c) => {
          (c.vinculos || []).forEach((v) => {
            if (v.nome) ligacoes.push({ de: F2.nomeCliente(c), tipo: v.tipo || 'vínculo', para: v.nome, rota: '#/wi/cliente/' + c.id });
          });
        });
        WB.data.wi.leads.forEach((l) => {
          if (l.clienteId) ligacoes.push({ de: l.nome + ' (lead)', tipo: 'convertido no cliente', para: l.clienteId, rota: '#/wi/cliente/' + l.clienteId });
        });
        return cartaoTabela('Ligações registradas', [
          { titulo: 'De', valor: 'de' }, { titulo: 'Relação', valor: 'tipo' },
          { titulo: 'Para', valor: 'para' },
          { titulo: 'Abrir', ordenavel: false, bruto: true, valor: (x) => `<a href="${esc(x.rota)}">ver registro</a>` }
        ], ligacoes, { vazioTitulo: 'Nenhuma conexão registrada', vazioTexto: 'As ligações aparecem conforme os vínculos forem preenchidos nos cadastros.' });
      }
    },
    agentes: {
      titulo: 'Agentes digitais',
      leitura: 'O item aparece na lista circulada da foto, sem detalhamento.',
      interpretacao: 'Reaproveitamos a tela de agentes já existente no portal. Nenhum agente roda aqui: a lista descreve o desenho pretendido.',
      conteudo: () => `<div class="rule" style="margin-bottom:16px"><strong>Nenhum agente está em execução.</strong>
        <p style="margin:6px 0 0">Não há IA, atendimento automático nem integração de mensagens neste protótipo. A tabela abaixo é o cadastro de demonstração do portal.</p></div>` +
        cartaoTabela('Agentes cadastrados', [
          { titulo: 'Agente', valor: 'nome' }, { titulo: 'Canal', valor: 'canal' },
          { titulo: 'O que faz', valor: 'funcao' },
          { titulo: 'Situação', valor: (a) => WB.chipStatus(a.status), bruto: true }
        ], WB.data.agentes, { busca: false })
    },
    atencao: {
      titulo: 'Negócios que precisam de atenção',
      leitura: 'Último item da lista circulada, sem regra de alerta definida.',
      interpretacao: 'Definimos quatro sinais objetivos, todos derivados de campos existentes. Nenhum deles é previsão nem pontuação.',
      conteudo: () => {
        const linhas = [];
        WB.data.wi.negocios.forEach((n) => {
          const motivos = [];
          const com = F2.resumoComissoes(n);
          if (n.situacao === 'negociacao' && n.atualizadoEm && WB.dias(n.atualizadoEm) < -30) motivos.push('Sem atualização há mais de 30 dias');
          if (n.situacao === 'vendido' && n.comissaoLiquidaValor == null) motivos.push('Comissão líquida não informada');
          if (com.excedeBruta) motivos.push('Rateio maior que a comissão bruta');
          const aReceber = F2.aReceber(n);
          if (n.situacao === 'vendido' && aReceber != null && aReceber > 0) motivos.push('Valor a receber em aberto');
          if (com.aReceber != null && com.aReceber > 0) motivos.push('Comissão prevista ainda não recebida');
          if (motivos.length) linhas.push({ negocio: n, motivos });
        });
        return cartaoTabela('Negócios sinalizados', [
          { titulo: 'Negócio', bruto: true, valor: (x) => `<a href="#/wi/negocio/${esc(x.negocio.id)}">${esc(x.negocio.id)}</a>` },
          { titulo: 'Cliente', valor: (x) => F2.nomeCliente(F2.cliente(x.negocio.clienteId)) },
          { titulo: 'Situação', valor: (x) => chipDe(CHIP_NEGOCIO, 'negocioSituacao', x.negocio.situacao), bruto: true },
          { titulo: 'Sinais', valor: (x) => x.motivos.join(' · ') }
        ], linhas, { vazioTitulo: 'Nada sinalizado', vazioTexto: 'Nenhum negócio bateu os critérios de atenção definidos aqui.' });
      }
    }
  };

  V.explorar = function (tema) {
    const chaves = Object.keys(EXPLORAR);
    const f = EXPLORAR[tema] ? tema : chaves[0];
    const e = EXPLORAR[f];
    return cabecalho({
      titulo: e.titulo,
      sub: 'Item visível na foto sem posição nem regra definida. Abaixo, a leitura e a interpretação adotadas.'
    }) +
    abas(chaves.map((k) => ({ id: k, nome: EXPLORAR[k].titulo })), f, '/wi/explorar') +
    `<div class="f2nota f2nota--duvida"><strong>O que a foto mostra.</strong> ${esc(e.leitura)}</div>
     <div class="f2nota f2nota--suposto"><strong>Como interpretamos.</strong> ${esc(e.interpretacao)}</div>` +
    e.conteudo();
  };

  /* ====================================================================
     NÓS GASTRONOMIA
     ==================================================================== */
  const N = (F2.nos = F2.nos || {});

  N.menu = function (filtro) {
    const tipos = [{ id: 'todos', nome: 'Todos' }, { id: 'prato', nome: 'Pratos' }, { id: 'bebida', nome: 'Bebidas e drinks' }, { id: 'descontinuados', nome: 'Descontinuados' }];
    const f = tipos.some((t) => t.id === filtro) ? filtro : 'todos';
    const todos = WB.data.nos.itens;
    const lista = f === 'descontinuados'
      ? todos.filter((i) => i.status === 'descontinuado')
      : todos.filter((i) => i.status !== 'descontinuado' && (f === 'todos' || i.tipo === f));
    const cmv = F2.cmvCardapio();

    return cabecalho({
      titulo: 'Menu',
      sub: 'Cardápio com CMV, descrição e preço. Descontinuar tira do cardápio sem apagar o histórico.',
      acoes: `<button class="btn" data-acao="nos-prato">Novo prato</button>
              <button class="btn" data-acao="nos-bebida">Nova bebida / drink</button>`
    }) +
    kpis([
      { rotulo: 'Itens no cardápio', valor: String(todos.filter((i) => i.status !== 'descontinuado').length), nota: todos.filter((i) => i.status === 'descontinuado').length + ' descontinuado(s)' },
      { rotulo: 'CMV médio', valor: cmv.media == null ? null : F2.pct(cmv.media), nota: cmv.comDados + ' de ' + cmv.itens + ' itens com preço e custo' },
      { rotulo: 'Em teste', valor: String(todos.filter((i) => i.status === 'teste').length), nota: 'ainda não liberados' },
      { rotulo: 'Sem preço informado', valor: String(todos.filter((i) => i.status !== 'descontinuado' && !num(i.precoVenda)).length), nota: 'não entram no CMV' }
    ]) +
    abas(tipos, f, '/nos/menu') +
    cartaoTabela(tipos.find((t) => t.id === f).nome, [
      { titulo: 'Item', bruto: true, valor: (i) => `<a href="#/nos/item/${esc(i.id)}">${esc(i.nome)}</a>`, ord: (i) => i.nome },
      { titulo: 'Tipo', valor: (i) => F2.rotulo('itemTipo', i.tipo) },
      { titulo: 'Categoria', valor: (i) => i.categoria || '—' },
      { titulo: 'Descrição', valor: (i) => i.descricao || '—' },
      { titulo: 'Preço', num: true, valor: (i) => moeda(i.precoVenda), ord: (i) => i.precoVenda || '' },
      { titulo: 'Custo estimado', num: true, valor: (i) => moeda(i.custoEstimado) },
      { titulo: 'Margem', num: true, valor: (i) => { const m = F2.margemItem(i); return m.margem == null ? '—' : WB.moeda(m.margem); } },
      { titulo: 'CMV', num: true, valor: (i) => { const m = F2.margemItem(i); return m.cmvPct == null ? '—' : F2.pct(m.cmvPct); } },
      { titulo: 'Elogios', num: true, valor: (i) => F2.contadoresItem(i.id).elogios },
      { titulo: 'Reclamações', num: true, valor: (i) => F2.contadoresItem(i.id).reclamacoes },
      { titulo: 'Status', valor: (i) => chipDe(CHIP_ITEM, 'itemStatus', i.status), bruto: true, ord: (i) => i.status },
      { titulo: 'Ações', ordenavel: false, bruto: true, valor: (i) => i.status === 'descontinuado'
        ? `<button class="btn btn--sm" data-acao="nos-item-reativar" data-id="${esc(i.id)}">Reativar</button>`
        : `<button class="btn btn--sm" data-acao="nos-item-editar" data-id="${esc(i.id)}">Editar</button>
           <button class="btn btn--sm" data-acao="nos-item-remover" data-id="${esc(i.id)}">Excluir do menu</button>` }
    ], lista, {
      vazioTitulo: f === 'descontinuados' ? 'Nenhum item descontinuado' : 'Nenhum item neste recorte',
      vazioTexto: f === 'descontinuados' ? 'Itens retirados do cardápio ficam guardados aqui, com os vínculos preservados.' : 'Adicione um prato ou uma bebida ao menu.',
      vazioAcao: f === 'descontinuados' ? '' : '<button class="btn btn--primary" data-acao="nos-prato">Novo prato</button>'
    }) +
    nota('suposto', 'Margem = preço − custo estimado. Margem % = margem ÷ preço. CMV % = custo ÷ preço. Item sem preço ou com preço zero fica "sem dado" e não entra no CMV médio. Custo estimado é da ficha técnica, não custo contábil realizado.');
  };

  N.item = function (id) {
    const i = F2.item(id);
    if (!i) return naoEncontrado('Nenhum item de menu com este identificador.', '#/nos/menu', 'Ver o menu');
    const m = F2.margemItem(i);
    const c = F2.contadoresItem(i.id);
    const atendimentos = WB.data.nos.atendimentos.filter((a) => a.itemId === i.id);
    const ehPrato = i.tipo === 'prato';

    return voltar('#/nos/menu', 'Menu Nós Gastronomia') +
      cabecalho({
        titulo: i.nome,
        sub: [i.id, F2.rotulo('itemTipo', i.tipo), i.categoria, F2.rotulo('itemStatus', i.status)].filter(Boolean).join(' · '),
        acoes: i.status === 'descontinuado'
          ? `<button class="btn btn--primary" data-acao="nos-item-reativar" data-id="${esc(i.id)}">Reativar no cardápio</button>`
          : `<button class="btn" data-acao="nos-item-remover" data-id="${esc(i.id)}">Excluir do menu</button>
             <button class="btn btn--primary" data-acao="nos-item-editar" data-id="${esc(i.id)}">Editar item</button>`
      }) +
      (i.status === 'descontinuado' ? `<div class="rule" style="margin-bottom:16px">
        <strong>Item descontinuado em ${esc(data(i.descontinuadoEm))}.</strong>
        <p style="margin:6px 0 0">${esc(i.motivoDescontinuacao || 'Sem motivo registrado.')} O cadastro e os ${atendimentos.length} atendimento(s) vinculados continuam aqui.</p>
      </div>` : '') +
      kpis([
        { rotulo: 'Preço de venda', valor: i.precoVenda == null ? null : WB.moeda(i.precoVenda), nota: 'informado no cadastro' },
        { rotulo: 'Custo estimado', valor: i.custoEstimado == null ? null : WB.moeda(i.custoEstimado), nota: 'da ficha técnica' },
        { rotulo: 'Margem', valor: m.margem == null ? null : WB.moeda(m.margem), nota: m.margemPct == null ? 'percentual sem dado' : F2.pct(m.margemPct) },
        { rotulo: 'CMV', valor: m.cmvPct == null ? null : F2.pct(m.cmvPct), nota: 'custo ÷ preço' }
      ]) +
      `<div class="grid grid--2">
        ${cartao('Identificação', dl([
          ['Tipo', F2.rotulo('itemTipo', i.tipo)],
          ['Categoria', i.categoria],
          ['Descrição', i.descricao],
          ehPrato ? ['Serve quantas pessoas', i.servePessoas == null ? '' : String(i.servePessoas)] : null,
          ['Foto', i.foto ? `<a href="${esc(i.foto)}">abrir referência</a>` : '<span class="muted">sem referência</span>', true],
          ['Responsável / chef', WB.pessoa(i.responsavel).nome],
          ['Criado em', data(i.criadoEm)]
        ]))}
        ${cartao('Ficha técnica e comercial', dl([
          ehPrato ? ['Tempo médio de preparo', i.tempoPreparo == null ? '' : i.tempoPreparo + ' min'] : null,
          ['Ingredientes', i.ingredientes],
          ['Restrições atendidas', (i.restricoes || []).join(', ')],
          ['Disponibilidade', i.disponibilidade],
          ['Período servido', (i.periodos || []).join(', ')],
          ['Status', F2.rotulo('itemStatus', i.status)],
          ['Elogios / reclamações', c.elogios + ' / ' + c.reclamacoes + (c.reclamacoesAbertas ? ' (' + c.reclamacoesAbertas + ' em aberto)' : '')]
        ]) + (ehPrato ? '' : nota('parcial', 'A foto do formulário de bebida está cortada. Porções e tempo de preparo, que são campos de prato, não foram copiados para cá de propósito.')))}
      </div>` +
      cartaoTabela('Atendimentos vinculados', [
        { titulo: 'Registro', bruto: true, valor: (a) => `<a href="#/nos/atendimento/${esc(a.id)}">${esc(a.id)}</a>` },
        { titulo: 'Tipo', valor: (a) => (a.tipo === 'elogio' ? WB.chip('Elogio', 'ok') : WB.chip('Reclamação', 'late')), bruto: true },
        { titulo: 'Cliente', valor: 'clienteNome' },
        { titulo: 'Data', valor: (a) => data(a.dataOcorrido), ord: (a) => a.dataOcorrido },
        { titulo: 'Canal', valor: (a) => a.canal || '—' },
        { titulo: 'Situação', bruto: true, valor: (a) => (a.tipo === 'reclamacao' ? chipDe(CHIP_RECL, 'reclamacaoStatus', a.status) : '—') }
      ], atendimentos, { busca: false, vazioTitulo: 'Nenhum atendimento vinculado', vazioTexto: 'Elogios e reclamações que citam este item aparecem aqui e alimentam os contadores.' });
  };

  N.atendimentos = function (filtro) {
    const tipos = [{ id: 'reclamacoes', nome: 'Reclamações' }, { id: 'elogios', nome: 'Elogios' }, { id: 'todos', nome: 'Todos' }];
    const f = tipos.some((t) => t.id === filtro) ? filtro : 'reclamacoes';
    const todos = WB.data.nos.atendimentos;
    const lista = f === 'todos' ? todos : todos.filter((a) => a.tipo === (f === 'elogios' ? 'elogio' : 'reclamacao'));
    const reclamacoes = todos.filter((a) => a.tipo === 'reclamacao');

    const colunas = [
      { titulo: 'Registro', bruto: true, valor: (a) => `<a href="#/nos/atendimento/${esc(a.id)}"><span class="mono">${esc(a.id)}</span></a>` },
      { titulo: 'Tipo', bruto: true, valor: (a) => (a.tipo === 'elogio' ? WB.chip('Elogio', 'ok') : WB.chip('Reclamação', 'late')), ord: (a) => a.tipo },
      { titulo: 'Cliente', valor: 'clienteNome' },
      { titulo: 'Data do ocorrido', valor: (a) => data(a.dataOcorrido), ord: (a) => a.dataOcorrido },
      { titulo: 'Canal', valor: (a) => a.canal || '—' },
      { titulo: 'Categoria', valor: (a) => a.categoria || '—' },
      { titulo: 'Item', bruto: true, valor: (a) => { const i = F2.item(a.itemId); return i ? `<a href="#/nos/item/${esc(i.id)}">${esc(i.nome)}</a>` : '—'; } },
      { titulo: 'Funcionário', valor: (a) => (a.funcionarioId ? WB.pessoa(a.funcionarioId).nome : '—') },
      { titulo: 'Gravidade', valor: (a) => (a.gravidade ? F2.rotulo('gravidade', a.gravidade) : '—') },
      { titulo: 'Situação', bruto: true, ord: (a) => a.status || '', valor: (a) => (a.tipo === 'reclamacao' ? chipDe(CHIP_RECL, 'reclamacaoStatus', a.status) : '—') },
      { titulo: 'Ações', ordenavel: false, bruto: true, valor: (a) => `<button class="btn btn--sm" data-acao="${a.tipo === 'elogio' ? 'nos-elogio-editar' : 'nos-reclamacao-editar'}" data-id="${esc(a.id)}">Abrir e editar</button>` }
    ];

    return cabecalho({
      titulo: 'Reclamações e elogios',
      sub: 'Registro de atendimento. Os contadores de cada prato e drink saem daqui.',
      acoes: `<button class="btn" data-acao="nos-elogio">Registrar elogio</button>
              <button class="btn btn--primary" data-acao="nos-reclamacao">Registrar reclamação</button>`
    }) +
    kpis([
      { rotulo: 'Reclamações abertas', valor: String(reclamacoes.filter((a) => a.status === 'aberta').length), nota: 'ainda sem tratativa' },
      { rotulo: 'Em tratativa', valor: String(reclamacoes.filter((a) => a.status === 'tratativa').length), nota: 'com responsável definido' },
      { rotulo: 'Resolvidas', valor: String(reclamacoes.filter((a) => a.status === 'resolvida').length), nota: 'de ' + reclamacoes.length + ' reclamações' },
      { rotulo: 'Elogios', valor: String(todos.filter((a) => a.tipo === 'elogio').length), nota: 'registrados' }
    ]) +
    abas(tipos, f, '/nos/atendimentos') +
    cartaoTabela(tipos.find((t) => t.id === f).nome, colunas, lista, {
      vazioTitulo: 'Nenhum registro',
      vazioTexto: 'Registre a primeira reclamação ou o primeiro elogio.',
      vazioAcao: '<button class="btn btn--primary" data-acao="nos-reclamacao">Registrar reclamação</button>'
    }) +
    (f === 'elogios' || f === 'todos' ? nota('suposto', 'Os campos do elogio não estão detalhados na foto: reaproveitamos cliente, data, canal, descrição, item e funcionário, sem gravidade nem tratativa. Esquema a validar.') : '');
  };

  N.atendimento = function (id) {
    const a = F2.atendimento(id);
    if (!a) return naoEncontrado('Nenhum atendimento com este identificador.', '#/nos/atendimentos/todos', 'Ver os atendimentos');
    const item = F2.item(a.itemId);
    const reclamacao = a.tipo === 'reclamacao';

    return voltar('#/nos/atendimentos/' + (reclamacao ? 'reclamacoes' : 'elogios'), reclamacao ? 'Reclamações' : 'Elogios') +
      cabecalho({
        titulo: a.clienteNome || 'Atendimento',
        sub: [a.id, reclamacao ? 'Reclamação' : 'Elogio', data(a.dataOcorrido), a.canal, a.categoria].filter(Boolean).join(' · '),
        acoes: `<button class="btn btn--primary" data-acao="${reclamacao ? 'nos-reclamacao-editar' : 'nos-elogio-editar'}" data-id="${esc(a.id)}">Editar registro</button>`
      }) +
      (reclamacao ? `<div class="f2fluxo" role="list" aria-label="Andamento da tratativa">
        ${F2.opc('reclamacaoStatus').map((s, idx) => {
          const ordem = ['aberta', 'tratativa', 'resolvida'];
          const atual = ordem.indexOf(a.status);
          const estado = idx < atual ? 'feito' : (idx === atual ? 'atual' : 'futuro');
          return `<span class="f2fluxo__p f2fluxo__p--${estado}" role="listitem">${esc(s.texto)}${estado === 'atual' ? ' · agora' : ''}</span>`;
        }).join('')}
      </div>` : '') +
      `<div class="grid grid--2">
        ${cartao('Identificação e conteúdo', dl([
          ['Tipo', reclamacao ? 'Reclamação' : 'Elogio'],
          ['Cliente', a.clienteNome],
          ['Data do ocorrido', data(a.dataOcorrido)],
          ['Canal', a.canal],
          reclamacao ? ['Categoria', a.categoria] : null,
          reclamacao ? ['Gravidade', a.gravidade ? F2.rotulo('gravidade', a.gravidade) : ''] : null,
          ['Descrição', a.descricao],
          ['Prato / drink relacionado', item ? `<a href="#/nos/item/${esc(item.id)}">${esc(item.nome)}</a>` : '', true],
          ['Funcionário envolvido', a.funcionarioId ? WB.pessoa(a.funcionarioId).nome : ''],
          ['Registrado por', WB.pessoa(a.registradoPor).nome]
        ]))}
        ${reclamacao ? cartao('Tratativa', dl([
          ['Status', F2.rotulo('reclamacaoStatus', a.status)],
          ['Responsável pela resposta', a.responsavelResposta ? WB.pessoa(a.responsavelResposta).nome : ''],
          ['Ação tomada', a.acaoTomada],
          ['Data de resolução', a.dataResolucao ? data(a.dataResolucao) : '']
        ]) + `<div style="margin-top:14px"><button class="btn btn--primary" data-acao="nos-reclamacao-editar" data-id="${esc(a.id)}">Atualizar tratativa</button></div>`)
        : cartao('Sobre este registro', nota('suposto', 'Elogio não tem gravidade nem tratativa: a foto mostra só a ação e o título. Este esquema reaproveita os campos da reclamação que fazem sentido e está sujeito a validação.'))}
      </div>`;
  };

  N.dash = function (aba) {
    const abasDash = [
      { id: 'geral', nome: 'Nós Gastronomia' },
      { id: 'clientes', nome: 'Clientes' },
      { id: 'equipe', nome: 'Performance da equipe' },
      { id: 'ranking', nome: 'Ranking de pedidos' },
      { id: 'cmv', nome: 'CMV' }
    ];
    const f = abasDash.some((x) => x.id === aba) ? aba : 'geral';
    const topo = cabecalho({
      titulo: 'Painéis Nós Gastronomia',
      sub: 'Calculados a partir do menu e dos atendimentos registrados.'
    }) + abas(abasDash, f, '/nos/dash');

    if (f === 'clientes') return topo + nosDashClientes();
    if (f === 'equipe') return topo + nosDashEquipe();
    if (f === 'ranking') return topo + nosRanking();
    if (f === 'cmv') return topo + nosCmv();
    return topo + nosDashGeral();
  };

  function nosDashGeral() {
    const itens = WB.data.nos.itens;
    const ativos = itens.filter((i) => i.status !== 'descontinuado');
    const at = WB.data.nos.atendimentos;
    const recl = at.filter((a) => a.tipo === 'reclamacao');
    const cmv = F2.cmvCardapio();
    const porCategoria = {};
    ativos.forEach((i) => { const k = i.categoria || 'Sem categoria'; porCategoria[k] = (porCategoria[k] || 0) + 1; });
    const porCategoriaRecl = {};
    recl.forEach((a) => { const k = a.categoria || 'Sem categoria'; porCategoriaRecl[k] = (porCategoriaRecl[k] || 0) + 1; });

    return kpis([
      { rotulo: 'Itens no cardápio', valor: String(ativos.length), nota: itens.length - ativos.length + ' descontinuado(s)' },
      { rotulo: 'CMV médio', valor: cmv.media == null ? null : F2.pct(cmv.media), nota: cmv.comDados + ' itens com preço e custo' },
      { rotulo: 'Reclamações abertas', valor: String(recl.filter((a) => a.status !== 'resolvida').length), nota: 'de ' + recl.length + ' registradas' },
      { rotulo: 'Elogios', valor: String(at.filter((a) => a.tipo === 'elogio').length), nota: 'registrados no período todo' }
    ]) +
    `<div class="grid grid--2">
      ${cartao('Itens por categoria', Object.keys(porCategoria).length
        ? WB.barras(Object.keys(porCategoria).map((k) => ({ rotulo: k, valor: porCategoria[k] })), { descricao: 'Itens por categoria', colRotulo: 'Categoria', colValor: 'Itens' })
        : WB.vazio('Cardápio vazio', 'Adicione pratos ou bebidas.'), { flush: true })}
      ${cartao('Reclamações por categoria', Object.keys(porCategoriaRecl).length
        ? WB.barras(Object.keys(porCategoriaRecl).map((k) => ({ rotulo: k, valor: porCategoriaRecl[k] })), { descricao: 'Reclamações por categoria', colRotulo: 'Categoria', colValor: 'Reclamações' })
        : WB.vazio('Sem reclamações', 'Nenhuma reclamação registrada.'), { flush: true })}
    </div>` +
    nota('duvida', 'Receita, ticket médio e volume de vendas dependem de dados de pedido, que não aparecem em nenhuma das oito fotos. Por isso não estão aqui.');
  }

  function nosDashClientes() {
    const at = WB.data.nos.atendimentos;
    if (!at.length) return WB.vazio('Sem atendimentos', 'Registre reclamações e elogios para ver o perfil de contato dos clientes.');
    const porCanal = {};
    at.forEach((a) => { const k = a.canal || 'Sem canal'; porCanal[k] = (porCanal[k] || 0) + 1; });
    const clientes = {};
    at.forEach((a) => {
      const k = a.clienteNome || 'Não identificado';
      clientes[k] = clientes[k] || { nome: k, elogios: 0, reclamacoes: 0 };
      clientes[k][a.tipo === 'elogio' ? 'elogios' : 'reclamacoes'] += 1;
    });
    const lista = Object.keys(clientes).map((k) => clientes[k]).sort((a, b) => (b.elogios + b.reclamacoes) - (a.elogios + a.reclamacoes));

    return kpis([
      { rotulo: 'Contatos registrados', valor: String(at.length), nota: 'elogios e reclamações' },
      { rotulo: 'Clientes distintos', valor: String(lista.length), nota: 'pelo nome informado' },
      { rotulo: 'Canal mais usado', valor: Object.keys(porCanal).sort((a, b) => porCanal[b] - porCanal[a])[0] || null, nota: 'por número de registros' },
      { rotulo: 'Clientes só com elogio', valor: String(lista.filter((c) => c.elogios && !c.reclamacoes).length), nota: 'sem nenhuma reclamação' }
    ]) +
    cartao('Contatos por canal', WB.barras(Object.keys(porCanal).map((k) => ({ rotulo: k, valor: porCanal[k] })), { descricao: 'Contatos por canal', colRotulo: 'Canal', colValor: 'Registros' }), { flush: true }) +
    cartaoTabela('Clientes', [
      { titulo: 'Cliente', valor: 'nome' },
      { titulo: 'Elogios', num: true, valor: 'elogios' },
      { titulo: 'Reclamações', num: true, valor: 'reclamacoes' }
    ], lista, { busca: false }) +
    nota('suposto', 'Não existe cadastro de cliente da Nós Gastronomia nas fotos. O agrupamento usa o nome digitado no atendimento — por isso "Não identificado" e mesas aparecem como cliente.');
  }

  function nosDashEquipe() {
    const at = WB.data.nos.atendimentos.filter((a) => a.funcionarioId || a.responsavelResposta);
    const mapa = {};
    WB.data.nos.atendimentos.forEach((a) => {
      if (a.funcionarioId) {
        mapa[a.funcionarioId] = mapa[a.funcionarioId] || { id: a.funcionarioId, elogios: 0, reclamacoes: 0, tratativas: 0 };
        mapa[a.funcionarioId][a.tipo === 'elogio' ? 'elogios' : 'reclamacoes'] += 1;
      }
      if (a.responsavelResposta) {
        mapa[a.responsavelResposta] = mapa[a.responsavelResposta] || { id: a.responsavelResposta, elogios: 0, reclamacoes: 0, tratativas: 0 };
        mapa[a.responsavelResposta].tratativas += 1;
      }
    });
    const lista = Object.keys(mapa).map((k) => mapa[k]);

    return `<div class="f2nota f2nota--duvida"><strong>A própria foto marca este painel com interrogação.</strong>
      "Performance da Equipe (?)" está escrito assim no rascunho, sem critério, sem meta e sem fonte. Não criamos ranking de pessoas: abaixo estão apenas as contagens verificáveis dos atendimentos, que não medem desempenho.</div>` +
    (lista.length
      ? cartaoTabela('Menções em atendimentos', [
        { titulo: 'Pessoa', valor: (r) => WB.pessoa(r.id).nome },
        { titulo: 'Elogios em que foi citada', num: true, valor: 'elogios' },
        { titulo: 'Reclamações em que foi citada', num: true, valor: 'reclamacoes' },
        { titulo: 'Tratativas sob responsabilidade', num: true, valor: 'tratativas' }
      ], lista, { busca: false })
      : WB.vazio('Sem dados de equipe', 'Nenhum atendimento cita funcionário ou responsável pela resposta.')) +
    nota('duvida', 'Um ranking de equipe exigiria definição de critério, período e meta — nada disso está nas fotos, e ' + at.length + ' registro(s) não sustentariam um ranking mesmo se houvesse.');
  }

  function nosRanking() {
    const ranking = F2.rankingPedidos();
    if (!ranking) {
      return WB.vazio('Sem dados de pedidos',
        'O ranking de "mais pedidos" e "menos pedidos" depende de registros de pedido ou venda por item. Nenhuma das oito fotos detalha essa fonte, e ela não existe nesta base. Elogios não são usados como aproximação de demanda: elogio mede satisfação, não volume.',
        '<a class="btn" href="#/nos/atendimentos/elogios">Ver elogios registrados</a>') +
        nota('duvida', 'Para ligar este painel é preciso definir de onde vêm os pedidos: PDV, ERP ou lançamento manual. Enquanto isso, a tela fica vazia de propósito.');
    }
    return cartao('Mais pedidos', WB.barras(ranking.slice(0, 10).map((r) => ({ rotulo: r.item.nome, valor: r.quantidade })), { descricao: 'Itens mais pedidos', colRotulo: 'Item', colValor: 'Pedidos' }), { flush: true }) +
      cartao('Menos pedidos', WB.barras(ranking.slice(-10).reverse().map((r) => ({ rotulo: r.item.nome, valor: r.quantidade })), { descricao: 'Itens menos pedidos', colRotulo: 'Item', colValor: 'Pedidos' }), { flush: true });
  }

  function nosCmv() {
    const itens = WB.data.nos.itens.filter((i) => i.status !== 'descontinuado');
    const comDados = itens.filter((i) => F2.margemItem(i).cmvPct != null);
    const semDados = itens.filter((i) => F2.margemItem(i).cmvPct == null);
    const cmvPrato = F2.cmvCardapio('prato');
    const cmvBebida = F2.cmvCardapio('bebida');

    return kpis([
      { rotulo: 'CMV médio — cardápio', valor: F2.cmvCardapio().media == null ? null : F2.pct(F2.cmvCardapio().media), nota: comDados.length + ' de ' + itens.length + ' itens' },
      { rotulo: 'CMV médio — pratos', valor: cmvPrato.media == null ? null : F2.pct(cmvPrato.media), nota: cmvPrato.comDados + ' pratos com dados' },
      { rotulo: 'CMV médio — bebidas', valor: cmvBebida.media == null ? null : F2.pct(cmvBebida.media), nota: cmvBebida.comDados + ' bebidas com dados' },
      { rotulo: 'Sem preço ou custo', valor: String(semDados.length), nota: 'ficam fora da média' }
    ]) +
    (comDados.length
      ? cartao('CMV por item', WB.barras(comDados.slice().sort((a, b) => F2.margemItem(b).cmvPct - F2.margemItem(a).cmvPct).map((i) => ({ rotulo: i.nome, valor: Number(F2.margemItem(i).cmvPct.toFixed(1)) })), { descricao: 'CMV por item', formatar: (v) => F2.pct(v), colRotulo: 'Item', colValor: 'CMV' }), { flush: true })
      : WB.vazio('Sem dados de CMV', 'Informe preço de venda e custo estimado nos itens do menu.')) +
    cartaoTabela('Detalhe', [
      { titulo: 'Item', bruto: true, valor: (i) => `<a href="#/nos/item/${esc(i.id)}">${esc(i.nome)}</a>` },
      { titulo: 'Tipo', valor: (i) => F2.rotulo('itemTipo', i.tipo) },
      { titulo: 'Preço', num: true, valor: (i) => moeda(i.precoVenda) },
      { titulo: 'Custo estimado', num: true, valor: (i) => moeda(i.custoEstimado) },
      { titulo: 'Margem', num: true, valor: (i) => { const m = F2.margemItem(i); return m.margem == null ? '—' : WB.moeda(m.margem); } },
      { titulo: 'Margem %', num: true, valor: (i) => { const m = F2.margemItem(i); return m.margemPct == null ? '—' : F2.pct(m.margemPct); } },
      { titulo: 'CMV %', num: true, valor: (i) => { const m = F2.margemItem(i); return m.cmvPct == null ? '—' : F2.pct(m.cmvPct); } }
    ], itens, { busca: false }) +
    nota('suposto', 'CMV aqui é custo estimado da ficha técnica ÷ preço de venda, item a item. Não é CMV contábil, que precisaria de compras, estoque e consumo real — dados que não estão nas fotos nem nesta base.');
  }

  N.estoque = function () {
    return cabecalho({ titulo: 'Estoque' }) +
      WB.vazio('Destino previsto, fluxo não especificado',
        'A palavra "ESTOQUE" aparece na foto como um destino do menu lateral, sem campos, sem telas e sem regra. Não montamos um controle de compras e estoque a partir disso — seria inventar um sistema inteiro.',
        '<a class="btn" href="#/nos/menu">Ir para o menu</a>') +
      nota('duvida', 'Para especificar: o estoque é por insumo ou por item do cardápio? Entra pelo ERP, por nota fiscal ou por contagem manual? Precisa de unidade, lote e validade?');
  };

  /* ====================================================================
     NAVEGAÇÃO E ROTAS
     ==================================================================== */
  const link = (rota, nome) => ({ rota, nome });
  const ramo = (id, nome, itens) => ({ id, nome, itens });

  /* As duas operações da Fase 2, no formato que `operacoes.js` registra:
     cada uma é um portal próprio, com os ramos que as fotos listam para ela. */
  F2.operacoes = {
    weinvest: {
      id: 'weinvest', nome: 'WeInvest',
      resumo: 'Leads, clientes, ativos, parceiros e negócios.',
      inicio: 'wi/dash/geral',
      itens: () => F2.nav()[0].itens
    },
    nos: {
      id: 'nos', nome: 'Nós Gastronomia',
      resumo: 'Menu, atendimento e indicadores da casa.',
      inicio: 'nos/dash/geral',
      itens: () => F2.nav()[1].itens
    }
  };

  /** A qual operação uma rota da Fase 2 pertence. */
  F2.operacaoDaRota = function (raiz) {
    if (raiz === 'wi') return 'weinvest';
    if (raiz === 'nos') return 'nos';
    return null;
  };

  /** Ramos da barra lateral, no formato que `app.js` desenha. */
  F2.nav = function () {
    return [
      ramo('weinvest', 'WeInvest', [
        ramo('wi-dash', 'Dashboards', [
          link('wi/dash/geral', 'WeInvest'),
          link('wi/dash/clientes', 'Perfil de cliente'),
          link('wi/dash/performance', 'Performance do time (ranking)')
        ]),
        ramo('wi-demandas', 'Demandas', [link('wi/crm', 'CRM')]),
        ramo('wi-controle', 'Painel de controle', [
          link('painel-controle/decisoes', 'Log geral de decisões'),
          link('painel-controle/riscos', 'Registro geral de riscos')
        ]),
        ramo('wi-gov', 'Governança', [
          link('governanca/metas/weinvest', 'Metas WeInvest'),
          link('governanca/politicas/weinvest', 'Cultura e políticas'),
          link('governanca/processos/weinvest', 'Processos e procedimentos'),
          link('governanca/treinamentos/weinvest', 'Treinamentos e conhecimentos')
        ]),
        ramo('wi-recursos', 'Recursos', [
          link('atas/todas', 'Atas de reuniões'),
          link('wi/clientes', 'Clientes (grupos / famílias)'),
          link('wi/leads', 'Leads'),
          link('wi/ativos', 'Ativos'),
          link('wi/parceiros', 'Parceiros'),
          link('wi/negocios', 'Negócios'),
          link('bens', 'Bens adquiridos')
        ]),
        ramo('wi-explorar', 'Exploratório', [
          link('wi/explorar/terrenos', 'Inteligência de terrenos'),
          link('wi/explorar/comparacao', 'Comparação e documentação'),
          link('wi/explorar/conexoes', 'Conexões relevantes'),
          link('wi/explorar/agentes', 'Agentes digitais'),
          link('wi/explorar/atencao', 'Negócios que precisam de atenção')
        ])
      ]),
      ramo('nosgastronomia', 'Nós Gastronomia', [
        ramo('nos-dash', 'Dashboards', [
          link('nos/dash/geral', 'Nós Gastronomia'),
          link('nos/dash/clientes', 'Clientes'),
          link('nos/dash/equipe', 'Performance da equipe (?)'),
          link('nos/dash/ranking', 'Ranking de pedidos'),
          link('nos/dash/cmv', 'CMV')
        ]),
        ramo('nos-trabalho', 'Demandas e projetos', [
          link('projetos', 'Ativos'),
          link('projetos-arquivados', 'Arquivados / concluídos'),
          link('cronograma', 'Cronograma geral'),
          link('painel-controle/reports', 'Painel de controle — status report'),
          link('painel-controle/decisoes', 'Log geral de decisões'),
          link('painel-controle/riscos', 'Riscos e incidentes')
        ]),
        ramo('nos-gov', 'Governança Nós', [
          link('governanca/metas/nos', 'Metas Nós'),
          link('governanca/politicas/nos', 'Cultura e políticas'),
          link('governanca/processos/nos', 'Processos e procedimentos'),
          link('governanca/treinamentos/nos', 'Treinamentos e conhecimentos')
        ]),
        ramo('nos-recursos', 'Recursos', [
          link('nos/menu', 'Menu (CMV, descrição e preço)'),
          link('atas/todas', 'Atas de reuniões'),
          link('clientes/nos', 'Clientes'),
          link('id-visual', 'Atalho — identidade visual'),
          link('galeria', 'Atalho — galeria de fotos'),
          link('links', 'Principais links'),
          link('nos/atendimentos/reclamacoes', 'Reclamações e elogios'),
          link('nos/estoque', 'Estoque')
        ]),
        ramo('nos-adm', 'Administrativo', [
          link('erp', 'ERP'),
          link('contratos', 'Gestão de contratos'),
          link('cnpjs', 'CNPJs'),
          link('colaboradores', 'Colaboradores'),
          link('fornecedores', 'Fornecedores'),
          link('bens', 'Bens adquiridos')
        ])
      ])
    ];
  };

  /** Rotas registradas em `app.js`. */
  F2.rotas = {
    wi: (p) => ({
      leads: () => V.leads(),
      clientes: () => V.clientes(),
      cliente: () => V.cliente(p[1]),
      ativos: () => V.ativos(),
      ativo: () => V.ativo(p[1]),
      parceiros: () => V.parceiros(),
      parceiro: () => V.parceiro(p[1]),
      negocios: () => V.negocios(),
      negocio: () => V.negocio(p[1]),
      crm: () => V.crm(),
      dash: () => V.dash(p[1]),
      explorar: () => V.explorar(p[1])
    }[p[0]] || (() => V.dash('geral')))(),
    nos: (p) => ({
      menu: () => N.menu(p[1]),
      item: () => N.item(p[1]),
      atendimentos: () => N.atendimentos(p[1]),
      atendimento: () => N.atendimento(p[1]),
      dash: () => N.dash(p[1]),
      estoque: () => N.estoque()
    }[p[0]] || (() => N.dash('geral')))()
  };

  /** Ações ligadas pelos botões `data-acao`. */
  F2.acoes = {
    'wi-lead': () => F2.abrirLead(),
    'wi-lead-editar': (el) => F2.abrirLead(el.dataset.id),
    'wi-cliente': () => F2.abrirClienteWi(),
    'wi-cliente-editar': (el) => F2.abrirClienteWi(el.dataset.id),
    'wi-comprovacao': (el) => F2.abrirComprovacao(el.dataset.id),
    'wi-interacao': (el) => F2.abrirInteracao(el.dataset.id),
    'wi-ativo': () => F2.abrirAtivo(),
    'wi-ativo-editar': (el) => F2.abrirAtivo(el.dataset.id),
    'wi-parceiro': () => F2.abrirParceiro(),
    'wi-parceiro-editar': (el) => F2.abrirParceiro(el.dataset.id),
    'wi-negocio': () => F2.abrirNegocio(),
    'wi-negocio-editar': (el) => F2.abrirNegocio(el.dataset.id),
    'wi-negocio-lead': (el) => F2.abrirNegocio(null, { leadId: el.dataset.id }),
    'wi-negocio-cliente': (el) => F2.abrirNegocio(null, { clienteId: el.dataset.id }),
    'wi-negocio-ativo': (el) => F2.abrirNegocio(null, { ativoId: el.dataset.id }),
    'nos-prato': () => F2.abrirItemMenu('prato'),
    'nos-bebida': () => F2.abrirItemMenu('bebida'),
    'nos-item-editar': (el) => F2.abrirItemMenu(null, el.dataset.id),
    'nos-item-remover': (el) => F2.abrirRemoverItem(el.dataset.id),
    'nos-item-reativar': (el) => F2.reativarItem(el.dataset.id),
    'nos-reclamacao': () => F2.abrirReclamacao(),
    'nos-reclamacao-editar': (el) => F2.abrirReclamacao(el.dataset.id),
    'nos-elogio': () => F2.abrirElogio(),
    'nos-elogio-editar': (el) => F2.abrirElogio(el.dataset.id)
  };

  /** Empresa do contexto, a partir da rota. */
  F2.empresaDaRota = function (raiz, partes) {
    if (raiz === 'wi') return 'weinvest';
    if (raiz === 'nos') return 'nos';
    // Seções compartilhadas com recorte por empresa na própria rota.
    if (raiz === 'governanca' && partes && partes[1]) return partes[1];
    if (raiz === 'clientes' && partes && partes[0] && partes[0] !== 'grupo') return partes[0];
    return null;
  };

  /** Resultados da Fase 2 para a busca global. */
  F2.buscar = function (termo) {
    const t = String(termo || '').toLowerCase();
    const bate = (s) => String(s || '').toLowerCase().indexOf(t) >= 0;
    return [
      { nome: 'WeInvest — leads', itens: WB.data.wi.leads.filter((l) => bate(l.nome) || bate(l.id) || bate(l.email)).map((l) => ({ t: l.nome, s: l.id + ' · ' + F2.rotulo('leadStatus', l.status), h: '#/wi/leads' })) },
      { nome: 'WeInvest — clientes', itens: WB.data.wi.clientes.filter((c) => bate(F2.nomeCliente(c)) || bate(c.id) || bate(c.grupoFamiliar)).map((c) => ({ t: F2.nomeCliente(c), s: c.id + (c.grupoFamiliar ? ' · ' + c.grupoFamiliar : ''), h: '#/wi/cliente/' + c.id })) },
      // A busca respeita o mesmo recorte de confidencialidade das listas.
      { nome: 'WeInvest — ativos', itens: F2.ativosVisiveis().filter((a) => bate(a.titulo) || bate(a.id) || bate(a.municipio)).map((a) => ({ t: a.titulo, s: a.id + ' · ' + F2.rotulo('ativoStatus', a.status), h: '#/wi/ativo/' + a.id })) },
      { nome: 'WeInvest — parceiros', itens: WB.data.wi.parceiros.filter((p) => bate(F2.nomeParceiro(p)) || bate(p.id)).map((p) => ({ t: F2.nomeParceiro(p), s: p.id + ' · ' + F2.rotulo('parceiroCategoria', p.categoria), h: '#/wi/parceiro/' + p.id })) },
      { nome: 'WeInvest — negócios', itens: WB.data.wi.negocios.filter((n) => bate(n.id) || bate(n.contrato)).map((n) => ({ t: n.id + ' · ' + ((F2.ativo(n.ativoId) || {}).titulo || ''), s: F2.rotulo('negocioSituacao', n.situacao), h: '#/wi/negocio/' + n.id })) },
      { nome: 'Nós — menu', itens: WB.data.nos.itens.filter((i) => bate(i.nome) || bate(i.id) || bate(i.ingredientes)).map((i) => ({ t: i.nome, s: F2.rotulo('itemTipo', i.tipo) + ' · ' + F2.rotulo('itemStatus', i.status), h: '#/nos/item/' + i.id })) },
      { nome: 'Nós — atendimentos', itens: WB.data.nos.atendimentos.filter((a) => bate(a.clienteNome) || bate(a.id) || bate(a.descricao)).map((a) => ({ t: (a.tipo === 'elogio' ? 'Elogio' : 'Reclamação') + ' · ' + a.clienteNome, s: a.id + ' · ' + WB.fmtDataCurta(a.dataOcorrido), h: '#/nos/atendimento/' + a.id })) }
    ].filter((g) => g.itens.length);
  };
})();
