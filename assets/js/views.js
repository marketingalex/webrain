/* WeBrain — telas. Cada função devolve HTML; `ligar` conecta os eventos. */
(function () {
  const WB = (window.WB = window.WB || {});
  const esc = WB.esc;
  const V = (WB.views = {});

  /* ------------------------------------------------------------- genéricos */

  /* O cabeçalho de página é título e, quando ajuda, uma linha de subtítulo.
     O kicker acima do título ("Trabalho", "Gestão", "WeInvest · Recursos")
     saiu em 22/09/2026: ele repetia o ramo que a lateral já marca, e o pedido
     foi limpar esse cabeçalho em todas as abas. O que ele carregava de único
     — o id do registro, a empresa do projeto — desceu para o subtítulo. */
  function cabecalho(o) {
    return `<header class="phead">
      <div class="phead__row">
        <div>
          <h1>${esc(o.titulo)}</h1>
          ${o.sub ? `<p class="phead__sub">${esc(o.sub)}</p>` : ''}
        </div>
        ${o.acoes ? `<div class="phead__actions">${o.acoes}</div>` : ''}
      </div>
    </header>`;
  }
  WB.cabecalho = cabecalho;

  /** Tabela padrão: cabeçalho fixo, rolagem própria identificada, célula formatável.
      Com mais de cinco linhas ganha busca e ordenação por coluna — quem liga os
      eventos é `WB.ligarTabelas`. Passe `busca: false` para desligar, e
      `ordenavel: false` na coluna que não faz sentido ordenar. */
  function tabela(colunas, linhas, opts) {
    const o = opts || {};
    if (!linhas.length) return WB.vazio(o.vazioTitulo || 'Nada por aqui ainda', o.vazioTexto || '', o.vazioAcao);
    const ferramentas = o.busca !== false && linhas.length > 5;
    const id = 'tbl_' + Math.random().toString(36).slice(2, 8);

    const corpo = `<div class="tbl__scrollnote">Role a tabela na horizontal para ver todas as colunas.</div>
      <div class="tbl__wrap"><table class="tbl" id="${id}">
      <thead><tr>${colunas.map((c, i) => {
        const cls = c.num ? ' class="tbl__num"' : '';
        if (!ferramentas || c.ordenavel === false) return `<th scope="col"${cls}>${esc(c.titulo)}</th>`;
        return `<th scope="col" aria-sort="none"${cls}><button type="button" class="tbl__sort" data-ordenar="${i}">${esc(c.titulo)}<i class="tbl__arrow" aria-hidden="true"></i></button></th>`;
      }).join('')}</tr></thead>
      <tbody>${linhas.map((l) => `<tr>${colunas.map((c) => {
        const v = typeof c.valor === 'function' ? c.valor(l) : l[c.valor];
        const ord = typeof c.ord === 'function' ? ` data-ord="${esc(c.ord(l))}"` : '';
        return `<td${c.num ? ' class="tbl__num"' : ''}${ord}>${c.bruto ? v : esc(v == null ? '—' : v)}</td>`;
      }).join('')}</tr>`).join('')}</tbody>
    </table></div>`;

    if (!ferramentas) return corpo;

    return `<div class="tblbox" data-tabela>
      <div class="tblbox__bar">
        <label class="tblbox__search">
          <span class="sr">${esc(o.buscaRotulo || 'Filtrar esta tabela')}</span>
          ${WB.icon('busca', 15)}
          <input type="search" data-tbl-busca aria-controls="${id}" autocomplete="off" placeholder="${esc(o.buscaTexto || 'Filtrar nesta tabela…')}">
        </label>
        <span class="tblbox__count" data-tbl-conta aria-live="polite">${linhas.length} registros</span>
      </div>
      ${corpo}
      <p class="tblbox__none" data-tbl-vazio hidden>Nenhuma linha corresponde ao filtro. Apague o texto para ver tudo de novo.</p>
    </div>`;
  }
  WB.tabela = tabela;

  function cartaoTabela(titulo, colunas, linhas, opts) {
    return `<section class="card">
      <div class="card__head"><h2 class="card__title">${esc(titulo)}</h2>
        ${(opts && opts.tools) || `<span class="card__tools muted">${linhas.length} ${linhas.length === 1 ? 'registro' : 'registros'}</span>`}</div>
      <div class="card__body card__body--flush">${tabela(colunas, linhas, opts)}</div>
    </section>`;
  }

  function kpiCards(kpis) {
    return `<div class="grid grid--4">${kpis.map((k) => `<div class="card kpi">
      <div class="kpi__label">${esc(k.rotulo)}</div>
      <div class="kpi__value">${k.valor == null ? '<span class="kpi__na">sem dado</span>' : esc(k.valor)}</div>
      <div class="kpi__foot">
        ${k.delta ? `<span class="kpi__delta kpi__delta--${k.delta > 0 ? 'up' : 'down'}">${k.delta > 0 ? '+' : ''}${k.delta}%</span>` : ''}
        <span>${esc(k.nota || '')}</span>
      </div>
    </div>`).join('')}</div>`;
  }

  function abas(itens, ativa, base) {
    return `<div class="tabs" role="tablist">${itens.map((i) =>
      `<a class="tab" role="tab" href="#${base}/${i.id}" aria-selected="${i.id === ativa}">${esc(i.nome)}</a>`).join('')}</div>`;
  }

  /* ================================================================== HOME
     Tela de reserva. O Início que aparece no portal é o módulo `WB.home`
     (`codex-home.js`); esta versão só entra se aquele arquivo não carregar.
     Desde 22/09/2026 ela segue o mesmo recorte, para as duas não contarem
     histórias diferentes: saudação, função e sprint em destaque, políticas
     em galeria, pedidos, News We e agenda.

     O que saiu daqui e para onde foi: a lista de demandas e os quatro números
     para `#/demandas`, os indicadores individuais para `#/indicadores` e os
     atalhos para o cabeçalho, que está em todas as páginas. */
  V.home = function () {
    const eu = WB.eu();
    const sprint = WB.sprintAtual();
    const politicas = WB.data.governanca.documentos.filter((g) => g.categoria === 'Políticas').slice(0, 6);
    /* Os cinco pedidos ficam no mesmo bloco: abrir um evento e cadastrar um
       lead são o mesmo gesto para quem usa o portal — antes o lead vivia
       escondido num botão do cabeçalho. `acao` casa com o mapa `WB.acoes`. */
    const PEDIDOS = [
      { acao: 'evento', icone: 'calendario', nome: 'Solicitar evento', hint: 'Encontros, treinamentos e experiências' },
      { acao: 'compra', icone: 'carrinho', nome: 'Solicitar compra ou pagamento', hint: 'Materiais, serviços e notas' },
      { acao: 'coffe', icone: 'cafe', nome: 'Solicitar coffee', hint: 'Café e recepção de visitas' },
      { acao: 'lead', icone: 'estrela', nome: 'Cadastrar novo lead', hint: 'Quem acabou de chegar' },
      { acao: 'cliente', icone: 'pessoa', nome: 'Cadastrar novo cliente', hint: 'Quem fechou com a gente' }
    ];

    return `${cabecalho({
      titulo: `Olá, ${eu.nome.split(' ')[0]}.`,
      sub: WB.fmtDataLonga(WB.d(0))
    })}

    <div class="ctxbar">
      <span class="ctxbar__item">${esc(eu.funcao)}</span>
      <span class="ctxbar__item ctxbar__item--sprint">${sprint
        ? esc(sprint.nome) + ' · até ' + WB.fmtData(sprint.fim)
        : 'Sem sprint atual'}</span>
      ${eu.setor ? `<span class="ctxbar__item ctxbar__item--quiet">${esc(eu.setor)}</span>` : ''}
    </div>

    <div class="grid grid--2" style="margin-bottom:16px">
      <section class="card">
        <div class="card__head"><h2 class="card__title">Principais políticas da We</h2>
          <div class="card__tools"><a href="#/governanca/politicas">Ver todas</a></div></div>
        <div class="card__body">
          ${politicas.length ? `<div class="polgal">
            ${politicas.map((p) => `<a class="polgal__item" href="#/governanca/politicas">
              <span class="polgal__ic">${WB.icon('doc', 20)}</span>
              <strong>${esc(p.nome)}</strong>
              <span class="polgal__meta">${esc(p.setor || 'Grupo We')} · <span class="mono">${esc(p.versao || 'sem versão')}</span></span>
              ${WB.dias(p.revisao) < 0 ? WB.chip('Revisão vencida', 'late') : ''}
            </a>`).join('')}
          </div>` : WB.vazio('Nenhuma política publicada', 'As políticas do grupo aparecem aqui assim que forem publicadas.')}
        </div>
      </section>

      <section class="card">
        <div class="card__head"><h2 class="card__title">Pedidos e cadastros</h2></div>
        <div class="card__body">
          <div class="asks asks--auto">
            ${PEDIDOS.map((p) => `<button class="ask" data-acao="${esc(p.acao)}">
              <span class="ask__ic">${WB.icon(p.icone, 20)}</span>
              <span class="ask__name">${esc(p.nome)}</span>
              <span class="ask__hint">${esc(p.hint)}</span>
            </button>`).join('')}
          </div>
        </div>
      </section>
    </div>

    <section class="card" style="margin-bottom:16px">
      <div class="card__head"><h2 class="card__title">News We</h2>
        ${['admin', 'head', 'diretoria'].indexOf(eu.papel) >= 0
          ? `<div class="card__tools"><button class="btn btn--sm" data-acao="news">Publicar</button></div>` : ''}</div>
      <div class="card__body card__body--flush">${V.mural(4)}</div>
    </section>

    <section class="card">
      <div class="card__head"><h2 class="card__title">Agenda</h2>
        <span class="card__tools muted">${WB.icon('calendario', 14)} Google Agenda</span></div>
      <div class="card__body card__body--flush">${V.agendaCompacta(8)}</div>
      <div class="card__foot muted">A agenda não tem tela própria: ela vive aqui, no início.</div>
    </section>`;
  };

  /* ------------------------------------- meus indicadores individuais
     Aba própria desde 21/09/2026; refeita em 22/09/2026 a pedido do usuário.
     O que a tela passou a dizer, na ordem em que ela diz:

       1. de quem são estes números — nome em destaque, com função e setor;
       2. os atalhos de consulta da pessoa: PDI e descritivo de cargo, quando a
          administração já cadastrou. São configuração individual (`WB.pessoa`),
          não documento do portal — por isso abrem em outra aba;
       3. o período — hoje, semana, mês, ano ou geral, guardado no `store` para
          a escolha valer na próxima visita;
       4. os cartões, com ícone e caixa própria.

     A sprint saiu: ela é o ritmo do time, e esta tela é da pessoa. */
  const PERIODOS_IND = [['hoje', 'Hoje'], ['semana', 'Semana'], ['mes', 'Mês'], ['ano', 'Ano'], ['geral', 'Geral']];

  V.indicadoresPagina = function () {
    const eu = WB.eu();
    const periodo = WB.store.get('indicadores.periodo', 'geral');
    const atual = PERIODOS_IND.some(([id]) => id === periodo) ? periodo : 'geral';
    const podeConfigurar = WB.pode('desenvolvimento');

    const atalho = (registro, rotulo, icone, vazio) => registro && registro.url
      ? `<a class="indatalho" href="${esc(registro.url)}" target="_blank" rel="noopener">
           <span class="indatalho__ic">${WB.icon(icone, 20)}</span>
           <span class="indatalho__txt"><strong>${esc(registro.titulo || rotulo)}</strong>
             <small>${registro.atualizado ? 'atualizado em ' + WB.fmtData(registro.atualizado) : rotulo}</small></span>
           <span class="indatalho__seta" aria-hidden="true">↗</span>
         </a>`
      : `<div class="indatalho indatalho--vazio">
           <span class="indatalho__ic">${WB.icon(icone, 20)}</span>
           <span class="indatalho__txt"><strong>${esc(rotulo)}</strong><small>${esc(vazio)}</small></span>
         </div>`;

    return cabecalho({
      titulo: 'Meus indicadores individuais',
      sub: 'O que estes números mostram vem do seu acesso: as demandas atribuídas a você e os pedidos que você abriu.',
      acoes: podeConfigurar ? `<button class="btn" data-acao="desenvolvimento" data-id="${esc(eu.id)}">${WB.icon('engrenagem', 14)} PDI e descritivo</button>` : ''
    }) + `<section class="card indpessoa">
      <div class="indpessoa__quem">
        <span class="av av--lg">${esc(WB.iniciais(eu.nome))}</span>
        <div>
          <h2 class="indpessoa__nome">${esc(eu.nome)}</h2>
          <p class="indpessoa__meta">${esc(eu.funcao)}${eu.setor ? ' · ' + esc(eu.setor) : ''}${eu.empresa ? ' · ' + esc(WB.empresaNome(eu.empresa)) : ''}</p>
        </div>
      </div>
      <div class="indpessoa__atalhos">
        ${atalho(eu.pdi, 'Meu PDI', 'estrela', podeConfigurar ? 'Nenhum PDI cadastrado — cadastre em "PDI e descritivo".' : 'Ainda não cadastrado pela administração.')}
        ${atalho(eu.descritivoCargo, 'Descritivo do cargo', 'doc', podeConfigurar ? 'Nenhum descritivo cadastrado.' : 'Ainda não cadastrado pela administração.')}
      </div>
    </section>

    <div class="indbar" role="group" aria-label="Período dos indicadores">
      ${PERIODOS_IND.map(([id, rotulo]) => `<button class="indbar__btn" data-periodo-ind="${id}" aria-pressed="${atual === id}">${rotulo}</button>`).join('')}
      <span class="muted indbar__nota">${atual === 'geral' ? 'Todo o histórico' : 'Recorte por ' + PERIODOS_IND.find(([id]) => id === atual)[1].toLowerCase()}</span>
    </div>

    <section class="card">
      <div class="card__body">${V.indicadores(eu, { periodo: atual })}</div>
      <div class="card__foot muted">Calculados a partir das demandas e solicitações que já existem. Nenhuma base nova é criada para esta tela.</div>
    </section>`;
  };

  /* A mesma tela, vista pela administração para outra pessoa: mesmo cálculo,
     com o nome de quem está sendo lido em destaque. Usada pelo painel de
     pessoas; a pessoa comum continua vendo só a dela. */
  V.indicadoresDe = function (pessoaId) {
    const alvo = WB.pessoa(pessoaId);
    if (!alvo.id || !WB.pode('desenvolvimento')) return WB.vazio('Sem acesso', 'Os indicadores de outra pessoa são visíveis para a administração.');
    return cabecalho({ titulo: alvo.nome, sub: 'Indicadores individuais, no mesmo cálculo que a pessoa vê.' }) +
      `<section class="card"><div class="card__body">${V.indicadores(alvo, { periodo: 'geral' })}</div></section>`;
  };

  /* ------------------------------------------------------- lista / kanban */
  // As seis situações vêm de `data.js`: o quadro segue o mesmo vocabulário
  // da tela de demandas, senão a mesma demanda teria dois nomes de estado.
  const COLUNAS_KB = Object.entries(WB.STATUS_DEMANDA).map(([id, nome]) => ({ id, nome }));

  function filtrarJanela(lista, janela) {
    if (janela === 'todas') return lista;
    const limite = janela === 'dia' ? 0 : 7;
    return lista.filter((d) => {
      const n = WB.dias(d.prazo);
      return n !== null && n <= limite;
    });
  }

  V.listaDemandas = function (lista, modo, janela) {
    const itens = filtrarJanela(lista, janela);
    if (!itens.length) {
      return WB.vazio(
        'Nada com prazo nesta janela',
        'Amplie o período ou crie a próxima demanda.',
        '<button class="btn btn--primary" data-acao="demanda">Nova demanda</button>'
      );
    }
    if (modo === 'kanban') {
      return `<div class="kb">${COLUNAS_KB.map((c) => {
        const dela = itens.filter((d) => d.status === c.id);
        return `<div class="kb__col">
          <div class="kb__head">${esc(c.nome)}<span class="kb__count">${dela.length}</span></div>
          <div class="kb__body">${dela.map((d) => `<div class="kbc">
            <button class="kbc__title" data-demanda="${esc(d.id)}" style="all:unset;cursor:pointer;font-weight:600;font-size:13px;display:block">${esc(d.nome)}</button>
            <div class="kbc__meta">${WB.tipoMark(d.tipo)} ${esc(WB.prazoTexto(d.prazo))}</div>
            <div class="kbc__move">
              <button class="btn btn--sm" data-mover="${esc(d.id)}" data-dir="-1" aria-label="Mover para a coluna anterior">◀</button>
              <button class="btn btn--sm" data-mover="${esc(d.id)}" data-dir="1" aria-label="Mover para a próxima coluna">▶</button>
            </div>
          </div>`).join('') || '<p class="muted" style="font-size:12px;margin:4px">—</p>'}</div>
        </div>`;
      }).join('')}</div>`;
    }
    return `<div class="rows">${itens.map((d) => {
      const proj = WB.projeto(d.projeto);
      return `<button class="row" data-demanda="${esc(d.id)}">
        ${WB.tipoMark(d.tipo)}
        <span class="row__main">
          <span class="row__title">${esc(d.nome)}</span>
          <span class="row__meta">
            <span>${esc(proj ? proj.nome : 'Sem projeto')}</span>
            <span>·</span><span>${esc(WB.pessoa(d.responsavel).nome)}</span>
            ${d.prioridade === 'alta' ? '<span>·</span><span>Prioridade alta</span>' : ''}
          </span>
        </span>
        <span class="row__side">${WB.demandaFechada(d) ? '' : WB.chipPrazo(d)}${WB.chipStatus(d.status)}</span>
      </button>`;
    }).join('')}</div>`;
  };

  /* -------------------------------------------------------- indicadores
     "Dinâmico por papel/função", como pede o esboço: analista vê o próprio
     trabalho; head e diretoria ganham a leitura da equipe; admin ganha a das
     integrações. Todo número sai de coleção que já existe — nenhuma fonte nova
     é criada para esta tela.

     22/09/2026: os cartões ganharam ícone e caixa própria, e passaram a
     respeitar o período escolhido na aba (`o.periodo`). Pontualidade só é
     calculada sobre demandas que têm `concluidaEm`; sem essa data não dá para
     saber se a entrega foi no prazo, e a tela diz "sem dado" em vez de
     inventar um número. `omitirBasicos` continua tirando os dois cartões que
     outra tela já mostra. */
  V.indicadores = function (eu, o) {
    const op = o || {};
    const hoje = WB.d(0);
    const faixa = WB.janelaPeriodo(op.periodo || 'geral', hoje);
    const noPeriodo = (d) => WB.noPeriodoDemanda(d, faixa);
    const fechada = (d) => WB.demandaFechada(d);

    const todas = WB.data.demandas.filter((d) => d.responsavel === eu.id);
    const minhas = todas.filter(noPeriodo);
    const abertas = minhas.filter((d) => !fechada(d));
    const atras = abertas.filter((d) => WB.dias(d.prazo) < 0);
    const fechadas = minhas.filter(fechada);
    const comRegistro = fechadas.filter((d) => d.concluidaEm && d.prazo);
    const noPrazo = comRegistro.length ? Math.round((comRegistro.filter((d) => d.concluidaEm <= d.prazo).length / comRegistro.length) * 100) : null;
    const meus = WB.data.solicitacoes.filter((s) => s.solicitante === eu.id && WB.noPeriodoData(s.data, faixa));
    const abriu = WB.data.demandas.filter((d) => d.criador === eu.id && d.responsavel !== eu.id && noPeriodo(d));

    const cartoes = [];
    if (!op.omitirBasicos) {
      cartoes.push({ ic: 'lista', rotulo: 'Demandas abertas', valor: String(abertas.length), nota: 'atribuídas a você' });
      cartoes.push({ ic: 'alerta', rotulo: 'Atrasadas', valor: String(atras.length), nota: atras.length ? 'precisam de nova data' : 'nenhuma pendente', alerta: !!atras.length });
    }
    cartoes.push({ ic: 'calendario', rotulo: 'Para hoje', valor: String(abertas.filter((d) => d.prazo === hoje).length), nota: 'vencem hoje' });
    cartoes.push({ ic: 'info', rotulo: 'Em aprovação', valor: String(minhas.filter((d) => d.status === 'aprovacao').length), nota: 'esperando aceite' });
    cartoes.push({ ic: 'check', rotulo: 'Entregues', valor: String(fechadas.length), nota: 'aprovadas ou concluídas' });
    cartoes.push({ ic: 'grafico', rotulo: 'Entrega no prazo', valor: noPrazo == null ? null : noPrazo + '%', nota: comRegistro.length ? 'em ' + comRegistro.length + ' com data de fechamento' : 'nenhuma entrega tem data de fechamento' });
    cartoes.push({ ic: 'carrinho', rotulo: 'Pedidos que você abriu', valor: String(meus.length), nota: 'compras, eventos e coffee' });
    cartoes.push({ ic: 'raio', rotulo: 'Demandas que você criou', valor: String(abriu.length), nota: 'sob responsabilidade de outras pessoas' });

    if (['head', 'diretoria', 'admin'].indexOf(eu.papel) >= 0) {
      const equipe = WB.data.pessoas.filter((p) => p.setor === eu.setor && p.id !== eu.id);
      const ids = equipe.map((p) => p.id);
      const daEquipe = WB.data.demandas.filter((d) => ids.indexOf(d.responsavel) >= 0 && !fechada(d) && noPeriodo(d));
      const atrasEquipe = daEquipe.filter((d) => WB.dias(d.prazo) < 0);
      cartoes.push({
        ic: 'pessoa', rotulo: 'Em aberto na sua equipe', valor: String(daEquipe.length),
        nota: equipe.length + ' pessoa' + (equipe.length === 1 ? '' : 's') + ' em ' + eu.setor
      });
      cartoes.push({
        ic: 'alerta', rotulo: 'Atrasadas na equipe', valor: String(atrasEquipe.length), alerta: !!atrasEquipe.length,
        nota: atrasEquipe.length ? 'converse antes do fim da sprint' : 'nada vencido'
      });
    }

    if (eu.papel === 'admin') {
      const pendentes = WB.data.solicitacoes.filter((s) => s.status === 'em análise' && WB.noPeriodoData(s.data, faixa));
      const conectadas = (WB.data.integracoes || []).filter((i) => i.status === 'conectada' || i.status === 'ativa');
      cartoes.push({ ic: 'pasta', rotulo: 'Pedidos aguardando análise', valor: String(pendentes.length), nota: 'de todo o grupo' });
      cartoes.push({
        ic: 'link', rotulo: 'Integrações conectadas',
        valor: conectadas.length + ' de ' + (WB.data.integracoes || []).length, nota: 'fontes ligadas ao portal'
      });
    }

    return `<div class="ind">${cartoes.map((c) => `<article class="ind__card${c.alerta ? ' ind__card--alerta' : ''}">
      <span class="ind__ic">${WB.icon(c.ic, 18)}</span>
      <strong class="ind__valor">${c.valor == null ? '<span class="kpi__na">sem dado</span>' : esc(c.valor)}</strong>
      <span class="ind__rotulo">${esc(c.rotulo)}</span>
      <small class="ind__nota">${esc(c.nota)}</small>
    </article>`).join('')}</div>`;
  };

  /* -------------------------------------------------------------- agenda */
  V.agendaCompacta = function (dias) {
    const grupos = {};
    WB.data.agenda.forEach((e) => {
      if (WB.dias(e.dia) < 0 || WB.dias(e.dia) >= dias) return;
      (grupos[e.dia] = grupos[e.dia] || []).push(e);
    });
    const chaves = Object.keys(grupos).sort();
    if (!chaves.length) return WB.vazio('Sem compromissos', 'Nada marcado para os próximos dias.');
    return chaves.map((dia) => `
      <div class="ag__daylabel">${WB.dias(dia) === 0 ? 'Hoje' : WB.fmtDataLonga(dia)}</div>
      ${grupos[dia].map((e) => `<div class="ag ag--${esc(e.tipo)}">
        <i class="ag__rail"></i>
        <span class="ag__time">${esc(e.inicio)}</span>
        <span class="ag__body">
          <span class="ag__title">${esc(e.titulo)}</span>
          <span class="ag__meta">${esc(e.local)} · até ${esc(e.fim)} · ${esc(e.origem)}</span>
        </span>
      </div>`).join('')}`).join('');
  };

  /* A agenda não tem tela própria: ela vive no Início, e `#/agenda` redireciona
     para lá (app.js). Só o bloco compacto acima sobrou. */

  /* --------------------------------------------------------------- mural */
  V.mural = function (limite) {
    const lista = WB.data.news.slice().sort((a, b) => (b.fixado - a.fixado) || (a.data < b.data ? 1 : -1)).slice(0, limite || 99);
    return lista.map((n) => `<article class="news">
      <div class="news__top">
        ${WB.dias(n.data) === 0 ? '<span class="news__new">novo</span>' : ''}
        ${n.fixado ? WB.chip('Fixado', 'idle') : ''}
        <span class="news__title">${esc(n.titulo)}</span>
      </div>
      <p class="news__body" style="margin:0">${esc(n.corpo)}</p>
      <div class="news__meta">${esc(WB.pessoa(n.autor).nome)} · ${WB.fmtDataCurta(n.data)} · para ${esc(n.publico)}</div>
    </article>`).join('');
  };

  /* ============================================================ DEMANDAS */
  V.demandas = function (params) {
    const f = Object.assign({ resp: WB.data.usuarioAtual, status: '', projeto: '', prioridade: '', sprint: '' },
      WB.store.get('filtros.demandas', {}), params || {});
    WB.store.set('filtros.demandas', f);

    let lista = WB.data.demandas.slice();
    if (f.resp) lista = lista.filter((d) => d.responsavel === f.resp);
    if (f.status) lista = lista.filter((d) => f.status === 'atrasada' ? (!WB.demandaFechada(d) && WB.dias(d.prazo) < 0) : d.status === f.status);
    if (f.projeto) lista = lista.filter((d) => d.projeto === f.projeto);
    if (f.prioridade) lista = lista.filter((d) => d.prioridade === f.prioridade);
    if (f.sprint) lista = lista.filter((d) => d.sprint === f.sprint);

    const modo = WB.store.get('demandas.modo', 'lista');

    return cabecalho({
      titulo: 'Demandas',
      sub: 'A mesma demanda aparece aqui e dentro do projeto. Alterar em um lugar altera nos dois.',
      acoes: `<button class="btn btn--primary" data-acao="demanda">${WB.icon('mais')} Nova demanda</button>`
    }) + `
    <div class="filters" data-filtros>
      <label for="fd-resp">Responsável</label>
      <select class="inp" id="fd-resp" data-f="resp">
        <option value="">Qualquer pessoa</option>
        ${WB.data.pessoas.map((p) => `<option value="${esc(p.id)}"${f.resp === p.id ? ' selected' : ''}>${esc(p.nome)}</option>`).join('')}
      </select>
      <label for="fd-status">Situação</label>
      <select class="inp" id="fd-status" data-f="status">
        <option value="">Todas</option>
        <option value="atrasada"${f.status === 'atrasada' ? ' selected' : ''}>Atrasadas</option>
        ${COLUNAS_KB.map((c) => `<option value="${esc(c.id)}"${f.status === c.id ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}
      </select>
      <label for="fd-proj">Projeto</label>
      <select class="inp" id="fd-proj" data-f="projeto">
        <option value="">Todos</option>
        ${WB.data.projetos.map((p) => `<option value="${esc(p.id)}"${f.projeto === p.id ? ' selected' : ''}>${esc(p.nome)}</option>`).join('')}
      </select>
      <label for="fd-sprint">Sprint</label>
      <select class="inp" id="fd-sprint" data-f="sprint">
        <option value="">Todas</option>
        ${WB.data.sprints.map((s) => `<option value="${esc(s.id)}"${f.sprint === s.id ? ' selected' : ''}>${esc(s.nome)}${s.atual ? ' (atual)' : ''}</option>`).join('')}
      </select>
      <span style="flex:1"></span>
      <div class="seg" role="group" aria-label="Formato">
        <button data-modo="lista" aria-pressed="${modo === 'lista'}">Lista</button>
        <button data-modo="kanban" aria-pressed="${modo === 'kanban'}">Kanban</button>
      </div>
    </div>
    <section class="card"><div class="card__body card__body--flush" data-demandas>
      ${V.listaDemandas(lista, modo, 'todas')}
    </div></section>`;
  };

  /* ------------------------------------------------- detalhe da demanda */
  V.popupDemanda = function (id) {
    const d = WB.data.demandas.find((x) => x.id === id);
    if (!d) return;
    const proj = WB.projeto(d.projeto);
    const sprint = WB.data.sprints.find((s) => s.id === d.sprint);
    WB.abrirPopup({
      tipo: WB.tipoNome(d.tipo),
      titulo: d.nome,
      corpo: `
        <div class="inline" style="margin-bottom:16px">${WB.chipStatus(d.status)}${WB.chipPrazo(d)}
          ${d.prioridade === 'alta' ? WB.chip('Prioridade alta', 'warn') : WB.chip('Prioridade ' + esc(d.prioridade), 'idle')}</div>
        <p>${esc(d.descricao || 'Sem descrição.')}</p>
        <dl class="dl">
          <dt>Projeto</dt><dd>${proj ? `<a href="#/projeto/${esc(proj.id)}">${esc(proj.nome)}</a>` : '—'}</dd>
          <dt>Responsável</dt><dd>${esc(WB.pessoa(d.responsavel).nome)} · ${esc(WB.pessoa(d.responsavel).funcao)}</dd>
          <dt>Prazo</dt><dd>${WB.fmtDataCurta(d.prazo)} (${esc(WB.prazoTexto(d.prazo))})</dd>
          <dt>Sprint</dt><dd>${sprint ? esc(sprint.nome) : 'fora de sprint'}</dd>
          <dt>Tipo</dt><dd>${esc(WB.tipoNome(d.tipo))}</dd>
          ${d.extras && d.extras.length ? `<dt>Vínculos</dt><dd>${esc(d.extras.join(', '))}</dd>` : ''}
        </dl>`,
      rodape: `<span class="grow"></span>
        <button class="btn" data-fechar>Fechar</button>
        ${!WB.demandaFechada(d) ? '<button class="btn btn--primary" data-concluir>Marcar como concluída</button>' : ''}`
    });
    const b = document.querySelector('[data-concluir]');
    if (b) b.addEventListener('click', () => {
      d.status = 'concluida';
      // A data de fechamento é o que permite dizer se a entrega foi no prazo.
      d.concluidaEm = WB.d(0);
      WB.avisarCriador(d, 'concluiu');
      WB.fecharPopup();
      WB.toast('Demanda concluída.');
      WB.rerender();
    });
  };

  /* =========================================================== PROJETOS */
  V.projetos = function () {
    return cabecalho({
      titulo: 'Projetos ativos',
      sub: 'Cada projeto reúne briefing, escopo, cronograma, tarefas, documentos, decisões e riscos.',
      acoes: `<a class="btn" href="#/projetos-arquivados">Arquivados</a>
              <button class="btn btn--primary" data-acao="projeto">${WB.icon('mais')} Novo projeto</button>`
    }) + `<div class="grid grid--2">
      ${WB.data.projetos.map((p) => {
        const dem = WB.data.demandas.filter((d) => d.projeto === p.id);
        const atras = dem.filter((d) => !WB.demandaFechada(d) && WB.dias(d.prazo) < 0).length;
        const riscos = (p.riscos || []).filter((r) => r.status === 'aberto').length;
        return `<a class="card" href="#/projeto/${esc(p.id)}" style="text-decoration:none;display:block">
          <div class="card__head">
            <h2 class="card__title">${esc(p.nome)}</h2>
            <span class="card__tools"><i class="legend__sw ${esc(WB.empresaSerie(p.empresa))}"></i>
              <span class="muted" style="font-size:13px">${esc(WB.empresaNome(p.empresa))}</span></span>
          </div>
          <div class="card__body">
            <p style="color:var(--ink-2);font-size:14px">${esc(p.resumo)}</p>
            <div class="bar" style="margin:14px 0 8px"><i style="width:${p.progresso}%"></i></div>
            <div class="inline" style="font-size:13px;color:var(--ink-3)">
              <span class="num">${p.progresso}% concluído</span>
              <span>·</span><span>${esc(WB.pessoa(p.responsavel).nome)}</span>
              <span>·</span><span>entrega ${WB.fmtData(p.fim)}</span>
            </div>
            <div class="inline" style="margin-top:12px">
              ${WB.chip(`${dem.length} demandas`, 'idle')}
              ${atras ? WB.chip(`${atras} atrasada${atras > 1 ? 's' : ''}`, 'late') : ''}
              ${riscos ? WB.chip(`${riscos} risco${riscos > 1 ? 's' : ''} aberto${riscos > 1 ? 's' : ''}`, 'warn') : ''}
            </div>
          </div>
        </a>`;
      }).join('')}
    </div>`;
  };

  V.projetosArquivados = function (id) {
    const registros = (WB.data.projetosArquivados || []).filter(p=>!id || p.id===id);
    if(id && !registros.length) return WB.vazio('Projeto arquivado não encontrado','Escolha outro projeto no menu lateral.');
    return cabecalho({ titulo: 'Projetos arquivados', sub: 'Encerrados, com o resultado e a lição registrados.' }) +
      cartaoTabela('Concluídos', [
        { titulo: 'Projeto', valor: 'nome' },
        { titulo: 'Empresa', valor: (p) => WB.empresaNome(p.empresa) },
        { titulo: 'Responsável', valor: (p) => WB.pessoa(p.responsavel).nome },
        { titulo: 'Encerrado', valor: (p) => WB.fmtDataCurta(p.encerrado) },
        { titulo: 'Resultado', valor: 'resultado' },
        { titulo: 'O que aprendemos', valor: 'licoes' }
      ], registros);
  };

  const ABAS_PROJ = [
    { id: 'briefing', nome: 'Briefing / TAP' },
    { id: 'escopo', nome: 'Escopo' },
    { id: 'cronograma', nome: 'Cronograma' },
    { id: 'tarefas', nome: 'Lista de tarefas' },
    { id: 'documentos', nome: 'Documentos e atalhos' },
    { id: 'decisoes', nome: 'Log de decisões' },
    { id: 'riscos', nome: 'Riscos e incidentes' }
  ];

  V.projeto = function (id, aba) {
    const p = WB.projeto(id);
    if (!p) return WB.vazio('Projeto não encontrado', 'Talvez ele tenha sido arquivado.', '<a class="btn" href="#/projetos">Voltar aos projetos</a>');
    const a = aba || 'briefing';
    const b = p.briefing || {};
    const dem = WB.data.demandas.filter((d) => d.projeto === p.id);

    let corpo = '';
    if (a === 'briefing') {
      const linha = (t, v) => `<dt>${esc(t)}</dt><dd>${v ? esc(v) : '<span class="muted">não preenchido</span>'}</dd>`;
      const listaOu = (arr) => (arr && arr.length) ? `<ul style="margin:0;padding-left:18px">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<span class="muted">não preenchido</span>';
      corpo = `<section class="card"><div class="card__body">
        <dl class="dl">
          ${linha('Contexto', b.contexto)}
          ${linha('Objetivo', b.objetivo)}
          <dt>Escopo incluso</dt><dd>${listaOu(b.escopoIncluso)}</dd>
          <dt>Fora do escopo</dt><dd>${listaOu(b.escopoExcluso)}</dd>
          <dt>Premissas</dt><dd>${listaOu(b.premissas)}</dd>
          <dt>Restrições</dt><dd>${listaOu(b.restricoes)}</dd>
          ${linha('Patrocinador', b.patrocinador ? WB.pessoa(b.patrocinador).nome : '')}
          ${linha('Gerente do projeto', b.gerente ? WB.pessoa(b.gerente).nome : '')}
          ${linha('Critério de entrega', b.criterios)}
        </dl>
      </div></section>`;
    } else if (a === 'escopo') {
      corpo = `<section class="card">
        <div class="card__head"><h2 class="card__title">Marcos e entregáveis</h2></div>
        <div class="card__body card__body--flush"><div class="rows">
          ${(p.marcos || []).map((m) => `<div class="row" style="cursor:default;align-items:flex-start">
            ${WB.tipoMark('marco')}
            <span class="row__main">
              <span class="row__title">${esc(m.nome)}</span>
              <span class="row__meta">${(m.entregaveis || []).map((e) => esc(e)).join(' · ') || 'sem entregáveis registrados'}</span>
            </span>
            <span class="row__side">${WB.chipStatus(m.status)}<span class="muted">${WB.fmtData(m.prazo)}</span></span>
          </div>`).join('') || WB.vazio('Escopo ainda não definido', 'Comece registrando os marcos do projeto.')}
        </div></div>
      </section>`;
    } else if (a === 'cronograma') {
      corpo = V.gantt((p.marcos || []).map((m) => ({ nome: m.nome, inicio: p.inicio, fim: m.prazo, status: m.status })), p.inicio, p.fim);
    } else if (a === 'tarefas') {
      corpo = `<section class="card">
        <div class="card__head"><h2 class="card__title">Tarefas do projeto</h2>
          <div class="card__tools"><button class="btn btn--sm btn--primary" data-acao="demanda" data-projeto="${esc(p.id)}">Nova demanda</button></div></div>
        <div class="card__body card__body--flush" data-demandas>${V.listaDemandas(dem, 'lista', 'todas')}</div>
      </section>`;
    } else if (a === 'documentos') {
      corpo = cartaoTabela('Documentos e atalhos', [
        { titulo: 'Nome', valor: (x) => `<a href="${esc(x.link)}">${esc(x.nome)}</a>`, bruto: true },
        { titulo: 'Tipo', valor: 'tipo' },
        { titulo: 'Versão', valor: (x) => `<span class="mono">${esc(x.versao)}</span>`, bruto: true },
        { titulo: 'Atualizado', valor: (x) => WB.fmtDataCurta(x.atualizado) }
      ], p.documentos || [], { vazioTitulo: 'Sem documentos ainda', vazioTexto: 'Anexe o TAP, o plano e os atalhos das pastas.' });
    } else if (a === 'decisoes') {
      corpo = cartaoTabela('Log de decisões', [
        { titulo: 'Data', valor: (x) => WB.fmtDataCurta(x.data) },
        { titulo: 'Decisão', valor: 'decisao' },
        { titulo: 'Por quê', valor: 'porque' },
        { titulo: 'Quem decidiu', valor: (x) => WB.pessoa(x.autor).nome },
        { titulo: 'Impacto', valor: (x) => WB.chip(x.impacto === 'alto' ? 'Alto' : 'Médio', x.impacto === 'alto' ? 'warn' : 'idle'), bruto: true }
      ], p.decisoes || [], { vazioTitulo: 'Nenhuma decisão registrada', vazioTexto: 'Registre aqui o que foi decidido e por quê — é isso que o projeto seguinte vai consultar.' });
    } else {
      corpo = cartaoTabela('Riscos e incidentes', [
        { titulo: 'Tipo', valor: (x) => x.tipo === 'risco' ? 'Risco' : 'Incidente' },
        { titulo: 'Descrição', valor: 'titulo' },
        { titulo: 'Probabilidade', valor: (x) => x.probabilidade },
        { titulo: 'Impacto', valor: (x) => x.impacto },
        { titulo: 'Resposta', valor: 'resposta' },
        { titulo: 'Dono', valor: (x) => WB.pessoa(x.dono).nome },
        { titulo: 'Situação', valor: (x) => WB.chipStatus(x.status), bruto: true }
      ], p.riscos || [], { vazioTitulo: 'Nenhum risco aberto', vazioTexto: 'Registre riscos assim que forem identificados, com resposta e dono.' });
    }

    return cabecalho({
      /* Empresa e empreendimento vinham num kicker acima do título. Agora abrem
         o subtítulo, que já é onde a tela descreve o projeto. */
      titulo: p.nome,
      sub: [WB.empresaNome(p.empresa) + (p.empreendimento !== '—' ? ' · ' + p.empreendimento : ''), p.resumo].filter(Boolean).join(' — '),
      acoes: `<a class="btn" href="#/projetos">Todos os projetos</a>`
    }) + abas(ABAS_PROJ, a, '/projeto/' + p.id) + corpo;
  };

  /* --------------------------------------------------------- cronograma */
  V.gantt = function (itens, inicio, fim) {
    if (!itens.length) return WB.vazio('Sem cronograma', 'Defina os marcos para ver a linha do tempo.');
    const ini = WB.toDate(inicio).getTime();
    const fimT = WB.toDate(fim).getTime();
    const span = Math.max(fimT - ini, 86400000);
    const hojePct = ((WB.hoje.getTime() - ini) / span) * 100;

    return `<section class="card">
      <div class="gantt__head">
        <div class="eyebrow">Marco</div>
        <div class="gantt__scale"><span>${WB.fmtData(inicio)}</span><span>${WB.fmtData(fim)}</span></div>
      </div>
      ${itens.map((m) => {
        const s = ((WB.toDate(m.inicio).getTime() - ini) / span) * 100;
        const e = ((WB.toDate(m.fim).getTime() - ini) / span) * 100;
        const atrasado = m.status !== 'concluida' && WB.dias(m.fim) < 0;
        const cls = m.status === 'concluida' ? 'ok' : atrasado ? 'late' : m.status === 'andamento' ? 'warn' : '';
        return `<div class="gantt__row">
          <div class="gantt__label" title="${esc(m.nome)}">${esc(m.nome)}</div>
          <div class="gantt__track">
            <div class="gantt__bar ${cls ? 'gantt__bar--' + cls : ''}" style="left:${Math.max(s, 0)}%;width:${Math.max(e - s, 2)}%"></div>
            ${hojePct >= 0 && hojePct <= 100 ? `<div class="gantt__today" style="left:${hojePct}%" title="Hoje"></div>` : ''}
          </div>
        </div>`;
      }).join('')}
      <div class="card__foot muted">A linha laranja marca hoje. Barra vermelha indica marco com prazo vencido.</div>
    </section>`;
  };

  V.cronograma = function (projetoId) {
    const projetos=WB.data.projetos.filter(p=>!projetoId || p.id===projetoId);
    if(projetoId && !projetos.length) return WB.vazio('Projeto não encontrado','Escolha outro projeto no menu lateral.');
    const sprint = WB.sprintAtual();
    const todos = [];
    projetos.forEach((p) => (p.marcos || []).forEach((m) =>
      todos.push({ nome: p.nome + ' · ' + m.nome, inicio: p.inicio, fim: m.prazo, status: m.status })));
    const ini = projetos.reduce((a, p) => (p.inicio < a ? p.inicio : a), WB.d(0));
    const fim = projetos.reduce((a, p) => (p.fim > a ? p.fim : a), WB.d(0));

    return cabecalho({
      titulo: 'Cronograma geral',
      sub: 'Todos os marcos dos projetos ativos em uma linha só, com a definição de sprints do grupo.'
    }) + `
    <div class="filters"><label for="cronograma-projeto">Projeto</label><select class="inp" id="cronograma-projeto" data-rota-filtro="cronograma"><option value="">Todos os projetos</option>${WB.data.projetos.map(p=>`<option value="${esc(p.id)}"${p.id===projetoId?' selected':''}>${esc(p.nome)}</option>`).join('')}</select></div>
    <section class="card" style="margin-bottom:16px">
      <div class="card__head"><h2 class="card__title">Sprints</h2>
        <span class="card__tools muted">${sprint ? 'Corrente: ' + esc(sprint.nome) : ''}</span></div>
      <div class="card__body card__body--flush"><div class="rows">
        ${WB.data.sprints.map((s) => {
          const dela = WB.data.demandas.filter((d) => d.sprint === s.id && (!projetoId || d.projeto===projetoId));
          const ok = dela.filter((d) => WB.demandaFechada(d)).length;
          return `<div class="row" style="cursor:default">
            <span class="row__main">
              <span class="row__title">${esc(s.nome)} ${s.atual ? WB.chip('em andamento', 'info') : ''}</span>
              <span class="row__meta">${WB.fmtDataCurta(s.inicio)} – ${WB.fmtDataCurta(s.fim)}</span>
            </span>
            <span class="row__side" style="width:200px">
              <div class="bar" style="flex:1;min-width:110px"><i style="width:${dela.length ? (ok / dela.length) * 100 : 0}%"></i></div>
              <span class="muted num">${ok}/${dela.length}</span>
            </span>
          </div>`;
        }).join('')}
      </div></div>
    </section>` + V.gantt(todos, ini, fim);
  };

  /* ---------------------------------------------------- painel de controle */
  V.painelControle = function (aba) {
    const a = aba || 'dashboard';
    const todasDem = WB.data.demandas;
    const atras = todasDem.filter((d) => !WB.demandaFechada(d) && WB.dias(d.prazo) < 0);
    const decisoes = [];
    const riscos = [];
    WB.data.projetos.forEach((p) => {
      (p.decisoes || []).forEach((d) => decisoes.push(Object.assign({ projeto: p.nome }, d)));
      (p.riscos || []).forEach((r) => riscos.push(Object.assign({ projeto: p.nome }, r)));
    });
    decisoes.sort((x, y) => (x.data < y.data ? 1 : -1));
    riscos.sort((x, y) => (x.data < y.data ? 1 : -1));

    let corpo = '';
    if (a === 'dashboard') {
      corpo = kpiCards([
        { rotulo: 'Projetos ativos', valor: String(WB.data.projetos.length), nota: 'em execução' },
        { rotulo: 'Demandas abertas', valor: String(todasDem.filter((d) => !WB.demandaFechada(d)).length), nota: 'no grupo' },
        { rotulo: 'Atrasadas', valor: String(atras.length), nota: atras.length ? 'exigem nova data' : 'nenhuma' },
        { rotulo: 'Riscos abertos', valor: String(riscos.filter((r) => r.status === 'aberto').length), nota: 'em todos os projetos' }
      ]) + `<div class="grid grid--2" style="margin-top:16px">
        <section class="card">
          <div class="card__head"><h2 class="card__title">Progresso por projeto</h2></div>
          ${WB.barras(WB.data.projetos.map((p) => ({ rotulo: p.nome.length > 26 ? p.nome.slice(0, 25) + '…' : p.nome, valor: p.progresso })),
            { formatar: (v) => v + '%', descricao: 'Percentual concluído por projeto', colRotulo: 'Projeto', colValor: 'Concluído' })}
        </section>
        <section class="card">
          <div class="card__head"><h2 class="card__title">Demandas por situação</h2></div>
          ${WB.barras(COLUNAS_KB.map((c) => ({ rotulo: c.nome, valor: todasDem.filter((d) => d.status === c.id).length })),
            { descricao: 'Quantidade de demandas por situação', colRotulo: 'Situação', colValor: 'Demandas' })}
        </section>
      </div>`;
    } else if (a === 'reports') {
      corpo = cartaoTabela('Status report por projeto', [
        { titulo: 'Projeto', valor: (p) => `<a href="#/projeto/${esc(p.id)}">${esc(p.nome)}</a>`, bruto: true },
        { titulo: 'Responsável', valor: (p) => WB.pessoa(p.responsavel).nome },
        { titulo: 'Progresso', valor: (p) => p.progresso + '%', num: true },
        { titulo: 'Demandas abertas', valor: (p) => WB.data.demandas.filter((d) => d.projeto === p.id && !WB.demandaFechada(d)).length, num: true },
        { titulo: 'Atrasadas', valor: (p) => WB.data.demandas.filter((d) => d.projeto === p.id && !WB.demandaFechada(d) && WB.dias(d.prazo) < 0).length, num: true },
        { titulo: 'Riscos abertos', valor: (p) => (p.riscos || []).filter((r) => r.status === 'aberto').length, num: true },
        { titulo: 'Entrega', valor: (p) => WB.fmtDataCurta(p.fim) }
      ], WB.data.projetos);
    } else if (a === 'decisoes') {
      corpo = cartaoTabela('Log geral de decisões', [
        { titulo: 'Data', valor: (x) => WB.fmtDataCurta(x.data) },
        { titulo: 'Projeto', valor: 'projeto' },
        { titulo: 'Decisão', valor: 'decisao' },
        { titulo: 'Por quê', valor: 'porque' },
        { titulo: 'Quem decidiu', valor: (x) => WB.pessoa(x.autor).nome }
      ], decisoes);
    } else {
      corpo = cartaoTabela('Registro geral de riscos e incidentes', [
        { titulo: 'Data', valor: (x) => WB.fmtDataCurta(x.data) },
        { titulo: 'Projeto', valor: 'projeto' },
        { titulo: 'Tipo', valor: (x) => x.tipo === 'risco' ? 'Risco' : 'Incidente' },
        { titulo: 'Descrição', valor: 'titulo' },
        { titulo: 'Resposta', valor: 'resposta' },
        { titulo: 'Dono', valor: (x) => WB.pessoa(x.dono).nome },
        { titulo: 'Situação', valor: (x) => WB.chipStatus(x.status), bruto: true }
      ], riscos);
    }

    return cabecalho({ titulo: 'Painel de controle', sub: 'A visão de quem acompanha vários projetos ao mesmo tempo.' }) +
      abas([
        { id: 'dashboard', nome: 'Dashboard' },
        { id: 'reports', nome: 'Status reports' },
        { id: 'decisoes', nome: 'Log geral de decisões' },
        { id: 'riscos', nome: 'Riscos e incidentes' }
      ], a, '/painel-controle') + corpo;
  };

  /* ========================================================== DASHBOARDS */
  V.dashGrupo = function () {
    const g = WB.data.dash.grupo;
    return cabecalho({ titulo: 'Grupo We', sub: 'Consolidado das quatro operações: financeiro, vendas e indicadores.' }) +
      kpiCards(g.kpis) + `
      <div class="grid grid--2" style="margin-top:16px">
        <section class="card">
          <div class="card__head"><h2 class="card__title">Receita do mês por empresa</h2></div>
          ${WB.barras(g.receitaPorEmpresa.map((r, i) => ({ rotulo: r.empresa, valor: r.valor, serie: 's' + (i + 1) })),
            { porSerie: true, formatar: (v) => WB.moeda(v), descricao: 'Receita do mês por empresa do grupo', colRotulo: 'Empresa', colValor: 'Receita' })}
        </section>
        <section class="card">
          <div class="card__head"><h2 class="card__title">Receita por mês, em milhões</h2></div>
          ${WB.empilhado(g.serieReceita.map((m) => Object.assign({ rotulo: m.mes }, m)),
            [{ chave: 'weinc', rotulo: 'We Incorporadora' }, { chave: 'weinvest', rotulo: 'WeInvest' },
             { chave: 'nos', rotulo: 'Nós Gastronomia' }, { chave: 'casawe', rotulo: 'CasaWE' }],
            { formatar: (v) => 'R$ ' + v + ' mi', descricao: 'Composição da receita mensal por empresa' })}
        </section>
      </div>`;
  };

  V.dashIncorporadora = function (aba) {
    const d = WB.data.dash.incorporadora;
    const a = aba || 'geral';
    let corpo;
    if (a === 'geral') {
      corpo = kpiCards(d.geral.kpis) + `<section class="card" style="margin-top:16px">
        <div class="card__head"><h2 class="card__title">Funil comercial, últimos 30 dias</h2></div>
        <div class="card__body card__body--flush">${WB.funil(d.geral.funil)}</div>
      </section>`;
    } else {
      const e = a === 'bioma' ? d.bioma : d.vicente;
      corpo = kpiCards(e.kpis) + `<section class="card" style="margin-top:16px">
        <div class="card__head"><h2 class="card__title">Unidades vendidas por mês</h2></div>
        ${WB.colunas(e.vendasMes.map((m) => ({ rotulo: m.mes, valor: m.valor })),
          { descricao: 'Unidades vendidas por mês', colRotulo: 'Mês', colValor: 'Unidades' })}
      </section>`;
    }
    return cabecalho({ titulo: 'We Incorporadora', sub: 'Desempenho geral e por empreendimento.' }) +
      abas([{ id: 'geral', nome: 'Geral' }, { id: 'bioma', nome: 'Bioma' }, { id: 'vicente', nome: 'Vicente by We' }], a, '/dash/incorporadora') + corpo;
  };

  V.dashClientes = function () {
    const c = WB.data.dash.clientes;
    return cabecalho({ titulo: 'Perfil de clientes', sub: 'De onde vêm e quem são as pessoas que compram com a We.' }) +
      kpiCards(c.kpis) + `<div class="grid grid--2" style="margin-top:16px">
        <section class="card">
          <div class="card__head"><h2 class="card__title">Leads por origem</h2></div>
          ${WB.barras(c.origem.map((o) => ({ rotulo: o.origem, valor: o.valor })),
            { formatar: (v) => WB.milhar(v), descricao: 'Leads por origem', colRotulo: 'Origem', colValor: 'Leads' })}
        </section>
        <section class="card">
          <div class="card__head"><h2 class="card__title">Faixa etária, em % da base</h2></div>
          ${WB.barras(c.faixaEtaria.map((f) => ({ rotulo: f.faixa, valor: f.valor })),
            { formatar: (v) => v + '%', descricao: 'Distribuição da base por faixa etária', colRotulo: 'Faixa', colValor: 'Participação' })}
        </section>
      </div>`;
  };

  V.dashPerformance = function (empresaId) {
    const p = WB.data.dash.performance;
    const empresas=WB.data.empresas.filter(e=>!empresaId || e.id===empresaId);
    if(empresaId && !empresas.length) return WB.vazio('Empresa não encontrada','Escolha uma empresa no menu lateral.');
    const linhas = empresas.map((e) => Object.assign({ empresa: e }, p[e.id] || {}));
    return cabecalho({ titulo: 'Performance das equipes', sub: 'Entrega no prazo, carga aberta e conclusão de sprint por operação.' }) +
      `<div class="filters"><label for="performance-empresa">Empresa</label><select class="inp" id="performance-empresa" data-rota-filtro="dash/performance"><option value="">Todas as empresas</option>${WB.data.empresas.map(e=>`<option value="${esc(e.id)}"${e.id===empresaId?' selected':''}>${esc(e.nome)}</option>`).join('')}</select></div><div class="grid grid--2">
        <section class="card">
          <div class="card__head"><h2 class="card__title">Entrega no prazo</h2></div>
          ${WB.barras(linhas.map((l) => ({ rotulo: l.empresa.nome, valor: l.entregaNoPrazo, serie: l.empresa.serie })),
            { porSerie: true, formatar: (v) => v + '%', descricao: 'Entrega no prazo por empresa', colRotulo: 'Empresa', colValor: 'No prazo' })}
        </section>
        <section class="card">
          <div class="card__head"><h2 class="card__title">Conclusão da sprint corrente</h2></div>
          ${WB.barras(linhas.map((l) => ({ rotulo: l.empresa.nome, valor: l.sprintConcluido, serie: l.empresa.serie })),
            { porSerie: true, formatar: (v) => v + '%', descricao: 'Conclusão da sprint por empresa', colRotulo: 'Empresa', colValor: 'Concluído' })}
        </section>
      </div>
      <div style="margin-top:16px">${cartaoTabela('Números por equipe', [
        { titulo: 'Empresa', valor: (l) => l.empresa.nome },
        { titulo: 'Pessoas', valor: 'pessoas', num: true },
        { titulo: 'Demandas abertas', valor: 'demandasAbertas', num: true },
        { titulo: 'Atrasadas', valor: 'atrasadas', num: true },
        { titulo: 'Entrega no prazo', valor: (l) => l.entregaNoPrazo + '%', num: true },
        { titulo: 'Sprint concluída', valor: (l) => l.sprintConcluido + '%', num: true }
      ], linhas)}</div>`;
  };

  /* ========================================================== GOVERNANÇA */
  /* `empresa` é o recorte opcional de #/governanca/:secao/:empresa. Sem ele,
     a tela segue mostrando o grupo inteiro, como antes da Fase 2. */
  function recorteEmpresa(empresa) {
    const valida = empresa && WB.data.empresas.some((e) => e.id === empresa);
    return valida ? empresa : null;
  }
  function avisoRecorte(empresa, total, visiveis) {
    if (!empresa) return '';
    return `<div class="rule" style="margin-bottom:16px">
      <strong>Recorte por operação: ${esc(WB.empresaNome(empresa))}.</strong>
      <p style="margin:6px 0 0">${visiveis} de ${total} registros. Documentos do Grupo We valem para todas as operações e também aparecem aqui.
      <a href="#/governanca/metas">Ver tudo</a>.</p></div>`;
  }

  V.metas = function (empresa) {
    const f = recorteEmpresa(empresa);
    const todas = WB.data.governanca.metas;
    const m = f ? todas.filter((x) => x.empresa === f || x.empresa === 'grupo') : todas;
    return cabecalho({
      titulo: f ? 'Metas ' + WB.empresaNome(f) : 'Metas',
      sub: 'O que o grupo se comprometeu a entregar e onde cada meta está.'
    }) + avisoRecorte(f, todas.length, m.length) +
      (m.length ? '' : WB.vazio('Nenhuma meta nesta operação', 'As metas registradas para esta empresa aparecem aqui.')) +
      `<section class="card"><div class="card__body card__body--flush"><div class="rows">
        ${m.map((x) => `<div class="row" style="cursor:default">
          <span class="row__main">
            <span class="row__title">${esc(x.meta)}</span>
            <span class="row__meta">${esc(WB.empresaNome(x.empresa))} · ${esc(WB.pessoa(x.dono).nome)} · meta ${esc(x.alvo)}</span>
            <div class="bar bar--${x.progresso >= 100 ? 'ok' : x.progresso >= 60 ? '' : 'warn'}" style="margin-top:8px;max-width:420px"><i style="width:${Math.min(x.progresso, 100)}%"></i></div>
          </span>
          <span class="row__side"><strong>${esc(x.atual)}</strong>${WB.chip(x.progresso + '%', x.progresso >= 100 ? 'ok' : x.progresso >= 60 ? 'idle' : 'warn')}</span>
        </div>`).join('')}
      </div></div></section>`;
  };

  function docsGovernanca(categoria, titulo, sub, empresa) {
    const f = recorteEmpresa(empresa);
    const todos = WB.data.governanca.documentos.filter((d) => d.categoria === categoria);
    const docs = f ? todos.filter((d) => d.empresa === f || d.empresa === 'grupo') : todos;
    const vencidos = docs.filter((d) => WB.dias(d.revisao) < 0);
    return cabecalho({ titulo, sub }) +
      avisoRecorte(f, todos.length, docs.length) +
      (vencidos.length ? `<div class="rule" style="margin-bottom:16px;border-left-color:var(--late)">
        <strong>${vencidos.length} documento${vencidos.length > 1 ? 's' : ''} com revisão vencida.</strong>
        <p style="margin:6px 0 0">${esc(vencidos.map((v) => v.nome).join(' · '))}</p></div>` : '') +
      cartaoTabela(titulo, [
        { titulo: 'Documento', valor: (d) => `<a href="${esc(d.link)}">${esc(d.nome)}</a>`, bruto: true },
        { titulo: 'Empresa', valor: (d) => d.empresa === 'grupo' ? 'Grupo We' : WB.empresaNome(d.empresa) },
        { titulo: 'Setor', valor: 'setor' },
        { titulo: 'Versão', valor: (d) => `<span class="mono">${esc(d.versao)}</span>`, bruto: true },
        { titulo: 'Atualizado', valor: (d) => WB.fmtDataCurta(d.atualizado) },
        { titulo: 'Responsável', valor: (d) => WB.pessoa(d.responsavel).nome },
        { titulo: 'Revisão', valor: (d) => WB.dias(d.revisao) < 0 ? WB.chip('Vencida', 'late') : WB.chip(WB.prazoTexto(d.revisao), 'idle'), bruto: true }
      ], docs, { vazioTitulo: 'Nenhum documento nesta categoria', vazioTexto: 'Publique o primeiro para que a equipe tenha uma referência única.' });
  }

  V.politicas = (e) => docsGovernanca('Políticas', 'Cultura e políticas', 'Documentos com versão, responsável e data da próxima revisão.', e);
  V.processos = (e) => docsGovernanca('Processos', 'Processos e procedimentos', 'Como cada coisa é feita aqui, com link direto para o documento vigente.', e);
  V.treinamentos = (e) => docsGovernanca('Treinamentos', 'Treinamentos e conhecimento', 'Trilhas e materiais de formação, com controle de versão.', e);
  V.cultura = (e) => docsGovernanca('Cultura', 'Cultura', 'Manuais de cultura e uso de marca.', e);

  /* ============================================================ RECURSOS */
  /* O esboço traz Atas com três subníveis (equipe/setor, diretoria, 1:1) e
     Clientes com um por operação. Aqui eles são abas dentro da tela, como no
     painel de controle e nos dashboards — a navegação lateral não cresce. */
  const TIPOS_ATA = [
    { id: 'todas', nome: 'Todas' },
    { id: 'equipe', nome: 'Equipe / setor' },
    { id: 'diretoria', nome: 'Diretoria' },
    { id: '1a1', nome: '1:1' }
  ];

  V.atas = function (tipo) {
    const f = TIPOS_ATA.some((t) => t.id === tipo) ? tipo : 'todas';
    const eu = WB.eu();
    const podeRestrito = ['admin', 'head', 'diretoria'].indexOf(eu.papel) >= 0;
    const visiveis = WB.data.atas.filter((a) => !a.restrito || podeRestrito);
    const ocultas = WB.data.atas.length - visiveis.length;
    const lista = f === 'todas' ? visiveis : visiveis.filter((a) => a.tipo === f);
    const restritaFechada = !podeRestrito && (f === 'diretoria' || f === '1a1');

    return cabecalho({ titulo: 'Atas de reunião', sub: 'Equipe e setor são abertas. Diretoria e 1:1 dependem de permissão.' }) +
      abas(TIPOS_ATA, f, '/atas') +
      (ocultas && f === 'todas' ? `<div class="rule" style="margin-bottom:16px">
        <strong>${ocultas} ata${ocultas > 1 ? 's' : ''} não aparece${ocultas > 1 ? 'm' : ''} para o seu perfil.</strong>
        <p style="margin:6px 0 0">Atas de diretoria e de 1:1 são restritas. Peça acesso a quem conduz a reunião.</p></div>` : '') +
      cartaoTabela(TIPOS_ATA.find((t) => t.id === f).nome, [
        { titulo: 'Reunião', valor: 'titulo' },
        { titulo: 'Tipo', valor: (a) => ({ equipe: 'Equipe / setor', diretoria: 'Diretoria', '1a1': '1:1' })[a.tipo] },
        { titulo: 'Setor', valor: 'setor' },
        { titulo: 'Data', valor: (a) => WB.fmtDataCurta(a.data), ord: (a) => a.data },
        { titulo: 'Participantes', valor: (a) => a.participantes.map((p) => WB.pessoa(p).nome.split(' ')[0]).join(', ') },
        { titulo: 'Resumo', valor: 'resumo' },
        { titulo: 'Acesso', valor: (a) => a.restrito ? WB.chip('Restrita', 'warn') : WB.chip('Aberta', 'idle'), bruto: true }
      ], lista, {
        vazioTitulo: restritaFechada ? 'Estas atas são restritas' : 'Nenhuma ata neste tipo',
        vazioTexto: restritaFechada
          ? 'Seu perfil não alcança atas de diretoria nem de 1:1. Peça acesso a quem conduz a reunião.'
          : 'As atas registradas com este tipo aparecem aqui.'
      });
  };

  V.clientes = function (empresa) {
    const opcoes = [{ id: 'grupo', nome: 'Grupo We' }].concat(
      WB.data.empresas.map((e) => ({ id: e.id, nome: e.curto || e.nome })));
    const f = opcoes.some((o) => o.id === empresa) ? empresa : 'grupo';
    /* A WeInvest tem coleção própria, com ficha completa. Em vez de copiar os
       registros para cá, a tela projeta as duas fontes: um registro, uma
       origem. */
    const base = (WB.fase2 && WB.fase2.clientesUnificados) ? WB.fase2.clientesUnificados() : WB.data.clientes;
    const lista = f === 'grupo' ? base : base.filter((c) => c.empresa === f);
    const leads = lista.filter((c) => c.tipo === 'lead').length;

    return cabecalho({
      titulo: 'Clientes e leads', sub: 'Base do grupo, com a empresa de origem e o responsável pelo atendimento.',
      acoes: `<button class="btn" data-acao="lead">Registrar lead</button><button class="btn btn--primary" data-acao="cliente">Registrar cliente</button>`
    }) + abas(opcoes, f, '/clientes') +
    (f === 'weinvest' || f === 'grupo' ? `<div class="rule" style="margin-bottom:16px">
      <strong>Os registros da WeInvest têm ficha própria.</strong>
      <p style="margin:6px 0 0">Esta tela é a visão do grupo. Perfil imobiliário, carteira, histórico e negócios ficam em
      <a href="#/wi/clientes">Clientes WeInvest</a>.</p></div>` : '') +
    cartaoTabela(opcoes.find((o) => o.id === f).nome, [
      { titulo: 'Nome', bruto: true, ord: (c) => c.nome, valor: (c) => c.rota ? `<a href="${esc(c.rota)}">${esc(c.nome)}</a>` : esc(c.nome) },
      { titulo: 'Tipo', valor: (c) => c.tipo === 'lead' ? WB.chip('Lead', 'info') : WB.chip('Cliente', 'ok'), bruto: true, ord: (c) => c.tipo },
      { titulo: 'Empresa', valor: (c) => WB.empresaNome(c.empresa) },
      { titulo: 'Produto', valor: 'produto' },
      { titulo: 'Origem', valor: 'origem' },
      { titulo: 'Etapa', valor: 'etapa' },
      { titulo: 'Valor', valor: (c) => c.valor ? WB.moeda(c.valor) : '—', num: true, ord: (c) => c.valor || '' },
      { titulo: 'Responsável', valor: (c) => WB.pessoa(c.responsavel).nome },
      { titulo: 'Desde', valor: (c) => WB.fmtDataCurta(c.desde), ord: (c) => c.desde },
      { titulo: 'Contato', valor: (c) => `<span class="mono">${esc(c.telefone)}</span>`, bruto: true, ordenavel: false }
    ], lista, {
      tools: `<span class="card__tools muted">${lista.length} ${lista.length === 1 ? 'registro' : 'registros'} · ${leads} lead${leads === 1 ? '' : 's'}</span>`,
      vazioTitulo: 'Nenhum registro nesta operação',
      vazioTexto: 'Registre um lead ou um cliente para esta empresa e ele aparece aqui.',
      vazioAcao: '<button class="btn btn--primary" data-acao="lead">Registrar lead</button>'
    });
  };

  V.idVisual = function () {
    return cabecalho({ titulo: 'Identidade visual', sub: 'Arquivos de marca com versão. Use sempre o original — não reconstrua o logotipo.' }) +
      cartaoTabela('Arquivos', [
        { titulo: 'Item', valor: 'item' },
        { titulo: 'Formatos', valor: 'formatos' },
        { titulo: 'Versão', valor: (x) => `<span class="mono">${esc(x.versao)}</span>`, bruto: true },
        { titulo: 'Atualizado', valor: (x) => WB.fmtDataCurta(x.atualizado) }
      ], WB.data.idVisual);
  };

  V.galeria = function () {
    return cabecalho({ titulo: 'Galeria de fotos e vídeos', sub: 'Registro de obra, produto e eventos, organizado por empresa.' }) +
      `<div class="grid grid--3">${WB.data.galeria.map((g) => `<article class="card">
        <div class="card__body">
          <div class="inline" style="margin-bottom:8px">
            <i class="legend__sw ${esc(g.empresa === 'grupo' ? 's1' : WB.empresaSerie(g.empresa))}"></i>
            <span class="eyebrow">${esc(g.empresa === 'grupo' ? 'Grupo We' : WB.empresaNome(g.empresa))}</span>
          </div>
          <h3>${esc(g.titulo)}</h3>
          <p class="muted" style="font-size:13px;margin:6px 0 0">${esc(g.tipo)} · ${g.qtd} ${g.tipo === 'Vídeo' ? 'itens' : 'fotos'} · ${WB.fmtDataCurta(g.data)}</p>
        </div>
      </article>`).join('')}</div>`;
  };

  V.links = function () {
    const grupos = {};
    WB.data.links.forEach((l) => (grupos[l.grupo] = grupos[l.grupo] || []).push(l));
    return cabecalho({ titulo: 'Principais links', sub: 'Os sistemas e pastas que a equipe usa todo dia.' }) +
      Object.keys(grupos).map((g) => `<section class="card" style="margin-bottom:16px">
        <div class="card__head"><h2 class="card__title">${esc(g)}</h2></div>
        <div class="card__body card__body--flush"><div class="rows">
          ${grupos[g].map((l) => `<a class="row" href="${esc(l.url)}">
            <span class="tmark">${WB.icon('link', 11)}</span>
            <span class="row__main"><span class="row__title">${esc(l.nome)}</span>
              <span class="row__meta">${esc(l.descricao)}</span></span>
            <span class="row__side">${WB.icon('seta', 14)}</span>
          </a>`).join('')}
        </div></div>
      </section>`).join('');
  };

  /* =========================================================== COMERCIAL */
  V.crm = function () {
    const leads = WB.data.clientes.filter((c) => c.tipo === 'lead');
    return cabecalho({
      titulo: 'CRM', sub: 'Espelho do funil comercial dentro do portal.',
      acoes: `<button class="btn btn--primary" data-acao="lead">Registrar lead</button>`
    }) + `<div class="rule" style="margin-bottom:16px">
      <strong>Integração pendente.</strong>
      <p style="margin:6px 0 0">A conexão com o CRM ainda não está ativa. O que aparece aqui foi cadastrado dentro do WeBrain.</p>
    </div>` + cartaoTabela('Leads em aberto', [
      { titulo: 'Nome', valor: 'nome' },
      { titulo: 'Produto', valor: 'produto' },
      { titulo: 'Origem', valor: 'origem' },
      { titulo: 'Etapa', valor: 'etapa' },
      { titulo: 'Responsável', valor: (c) => WB.pessoa(c.responsavel).nome },
      { titulo: 'Entrou em', valor: (c) => WB.fmtDataCurta(c.desde) }
    ], leads, { vazioTitulo: 'Nenhum lead em aberto', vazioTexto: 'Registre o primeiro para começar o acompanhamento.', vazioAcao: '<button class="btn btn--primary" data-acao="lead">Registrar lead</button>' });
  };

  V.agentes = function () {
    return cabecalho({ titulo: 'Agentes digitais', sub: 'Atendimento automatizado por canal, com volume e conversão.' }) +
      cartaoTabela('Agentes', [
        { titulo: 'Agente', valor: 'nome' },
        { titulo: 'Canal', valor: 'canal' },
        { titulo: 'O que faz', valor: 'funcao' },
        { titulo: 'Conversas em 30 dias', valor: (a) => WB.milhar(a.conversas30d), num: true },
        { titulo: 'Conversão', valor: (a) => a.conversao ? a.conversao + '%' : '—', num: true },
        { titulo: 'Situação', valor: (a) => WB.chipStatus(a.status), bruto: true }
      ], WB.data.agentes);
  };

  V.corretores = function () {
    return cabecalho({ titulo: 'Corretores e imobiliárias', sub: 'Rede credenciada, com histórico de vendas dos últimos 12 meses.' }) +
      cartaoTabela('Rede credenciada', [
        { titulo: 'Parceiro', valor: 'nome' },
        { titulo: 'Tipo', valor: 'tipo' },
        { titulo: 'Responsável', valor: 'responsavel' },
        { titulo: 'Vendas 12m', valor: 'vendas12m', num: true },
        { titulo: 'VGV 12m', valor: (c) => WB.moeda(c.vgv12m), num: true },
        { titulo: 'Parceiro desde', valor: (c) => WB.fmtDataCurta(c.desde) },
        { titulo: 'Situação', valor: (c) => WB.chipStatus(c.status), bruto: true }
      ], WB.data.corretores);
  };

  /* ============================================== ADMINISTRATIVO E OPERAÇÃO */
  V.erp = function () {
    /* O endereço do Omie é cadastrado pela equipe e guardado em `adm-data.js`.
       É o mesmo que alimenta o atalho da barra lateral. Sem os arquivos do
       Administrativo carregados, a tela continua existindo — sem o botão. */
    const omie = (WB.adm && WB.adm.omie) ? WB.adm.omie() : '';
    return cabecalho({ titulo: 'ERP — Omie', sub: 'Financeiro, notas fiscais e contratos ficam no Omie. Aqui está o acesso e o estado da conexão.' }) +
      `<div class="grid grid--2">
        <section class="card"><div class="card__body">
          <div class="inline" style="margin-bottom:10px">${WB.chipStatus('conectado')}<span class="muted">última sincronização hoje</span></div>
          <h3>Abrir o Omie</h3>
          <p class="muted" style="font-size:14px">O lançamento financeiro continua sendo feito no ERP. O WeBrain lê os dados para os painéis.</p>
          ${omie
            ? `<div class="inline" style="margin-top:8px;gap:8px">
                 <a class="btn btn--primary" href="${esc(omie)}" target="_blank" rel="noopener">${WB.icon('link')} Abrir ERP</a>
                 <button class="btn btn--ghost" data-acao="adm-omie">Trocar o link</button>
               </div>
               <p class="muted" style="font-size:13px;margin:10px 0 0">O mesmo endereço está no atalho <strong>ERP — Omie</strong> da barra lateral, que abre o ERP direto em outra aba.</p>`
            : WB.adm
              ? `<button class="btn btn--primary" data-acao="adm-omie" style="margin-top:8px">${WB.icon('link')} Cadastrar o link do Omie</button>
                 <p class="muted" style="font-size:13px;margin:10px 0 0">Enquanto o endereço não estiver cadastrado, o item da barra lateral traz para cá em vez de abrir o ERP.</p>`
              : `<p class="muted" style="font-size:13px;margin:10px 0 0">O endereço do Omie ainda não foi cadastrado.</p>`}
        </div></section>
        <section class="card"><div class="card__body">
          <h3>O que o WeBrain consome</h3>
          <ul style="color:var(--ink-2);font-size:14px;padding-left:18px;margin:8px 0 0">
            <li>Receita consolidada por empresa</li>
            <li>Contas a pagar originadas de solicitações de compra</li>
            <li>Cadastro de fornecedores e CNPJs</li>
          </ul>
        </div></section>
      </div>`;
  };

  const TABELAS_ADM = {
    contratos: {
      titulo: 'Gestão de contratos', sub: 'Vigência, valor e parte contratada.',
      dados: () => WB.data.contratos,
      colunas: [
        { titulo: 'Objeto', valor: 'objeto' },
        { titulo: 'Parte', valor: 'parte' },
        { titulo: 'Empresa', valor: (c) => c.empresa === 'grupo' ? 'Grupo We' : WB.empresaNome(c.empresa) },
        { titulo: 'Valor', valor: (c) => c.valor ? WB.moeda(c.valor) : '—', num: true },
        { titulo: 'Início', valor: (c) => WB.fmtDataCurta(c.inicio) },
        { titulo: 'Fim', valor: (c) => WB.fmtDataCurta(c.fim) },
        { titulo: 'Reajuste', valor: 'reajuste' },
        { titulo: 'Situação', valor: (c) => WB.chipStatus(c.status), bruto: true }
      ]
    },
    colaboradores: {
      titulo: 'Colaboradores', sub: 'Quem é quem, por empresa e setor.',
      dados: () => WB.data.colaboradores,
      colunas: [
        { titulo: 'Nome', valor: 'nome' },
        { titulo: 'Função', valor: 'funcao' },
        { titulo: 'Empresa', valor: (c) => WB.empresaNome(c.empresa) },
        { titulo: 'Setor', valor: 'setor' },
        { titulo: 'Contrato', valor: 'contrato' },
        { titulo: 'Admissão', valor: (c) => WB.fmtDataCurta(c.admissao) },
        { titulo: 'Situação', valor: (c) => WB.chipStatus(c.status), bruto: true }
      ]
    },
    fornecedores: {
      titulo: 'Fornecedores e parceiros', sub: 'Quem fornece e quem executa junto com a gente.',
      dados: () => WB.data.fornecedores.map((f) => Object.assign({ classe: 'Fornecedor' }, f))
        .concat(WB.data.parceiros.map((p) => ({ classe: 'Parceiro', nome: p.nome, cnpj: '—', categoria: p.tipo, contato: p.escopo, empresa: p.empresa, status: p.status }))),
      colunas: [
        { titulo: 'Nome', valor: 'nome' },
        { titulo: 'Classe', valor: 'classe' },
        { titulo: 'Categoria', valor: 'categoria' },
        { titulo: 'CNPJ', valor: (f) => `<span class="mono">${esc(f.cnpj)}</span>`, bruto: true },
        { titulo: 'Contato / escopo', valor: 'contato' },
        { titulo: 'Empresa', valor: (f) => f.empresa === 'grupo' ? 'Grupo We' : WB.empresaNome(f.empresa) },
        { titulo: 'Situação', valor: (f) => WB.chipStatus(f.status), bruto: true }
      ]
    },
    patrocinadores: {
      titulo: 'Patrocinadores', sub: 'Cotas negociadas por evento.',
      dados: () => WB.data.patrocinadores,
      colunas: [
        { titulo: 'Patrocinador', valor: 'nome' },
        { titulo: 'Evento', valor: 'evento' },
        { titulo: 'Cota', valor: 'cota' },
        { titulo: 'Valor', valor: (p) => WB.moeda(p.valor), num: true },
        { titulo: 'Contato', valor: 'contato' },
        { titulo: 'Situação', valor: (p) => WB.chipStatus(p.status), bruto: true }
      ]
    },
    bens: {
      titulo: 'Bens adquiridos', sub: 'Patrimônio do grupo, com responsável e estado.',
      dados: () => WB.data.bens,
      colunas: [
        { titulo: 'Item', valor: 'item' },
        { titulo: 'Patrimônio', valor: (b) => `<span class="mono">${esc(b.patrimonio)}</span>`, bruto: true },
        { titulo: 'Empresa', valor: (b) => WB.empresaNome(b.empresa) },
        { titulo: 'Responsável', valor: (b) => WB.pessoa(b.responsavel).nome },
        { titulo: 'Aquisição', valor: (b) => WB.fmtDataCurta(b.aquisicao) },
        { titulo: 'Valor', valor: (b) => WB.moeda(b.valor), num: true },
        { titulo: 'Estado', valor: 'estado' }
      ]
    },
    cnpjs: {
      titulo: 'CNPJs', sub: 'Todas as pessoas jurídicas do grupo, incluindo as SPEs.',
      dados: () => WB.data.cnpjs,
      colunas: [
        { titulo: 'Razão social', valor: 'razao' },
        { titulo: 'Nome fantasia', valor: 'fantasia' },
        { titulo: 'CNPJ', valor: (c) => `<span class="mono">${esc(c.cnpj)}</span>`, bruto: true },
        { titulo: 'Regime', valor: 'regime' },
        { titulo: 'Abertura', valor: (c) => WB.fmtDataCurta(c.abertura) },
        { titulo: 'Situação', valor: (c) => WB.chip('Ativa', 'ok'), bruto: true }
      ]
    }
  };

  V.adm = function (qual) {
    const t = TABELAS_ADM[qual];
    if (!t) return WB.vazio('Página não encontrada', '');
    return cabecalho({ titulo: t.titulo, sub: t.sub }) +
      cartaoTabela(t.titulo, t.colunas, t.dados());
  };

  /* ========================================================== SOLICITAÇÕES */
  V.solicitacoes = function (filtro) {
    const f = filtro || 'todas';
    const minhas = WB.data.solicitacoes.filter((s) =>
      s.solicitante === WB.data.usuarioAtual && (f === 'todas' || s.tipo === f));
    const rotulo = { compra: 'Compras e pagamentos', evento: 'Eventos', coffe: 'Coffee' };

    return cabecalho({
      titulo: 'Minhas solicitações',
      sub: 'Histórico dos pedidos que você abriu, com número e situação.',
      acoes: `<button class="btn" data-acao="evento">Evento</button>
              <button class="btn" data-acao="compra">Compra</button>
              <button class="btn" data-acao="coffe">Coffee</button>`
    }) + abas([
      { id: 'todas', nome: 'Todas' }, { id: 'evento', nome: 'Eventos' },
      { id: 'compra', nome: 'Compras' }, { id: 'coffe', nome: 'Coffee' }
    ], f, '/solicitacoes') +
    cartaoTabela('Pedidos', [
      { titulo: 'Número', valor: (s) => `<span class="mono">${esc(s.id)}</span>`, bruto: true },
      { titulo: 'Tipo', valor: (s) => rotulo[s.tipo] || s.tipo },
      { titulo: 'Pedido', valor: 'titulo' },
      { titulo: 'Resumo', valor: 'resumo' },
      { titulo: 'Aberto em', valor: (s) => WB.fmtDataCurta(s.data) },
      { titulo: 'Situação', valor: (s) => WB.chipStatus(s.status), bruto: true }
    ], minhas, {
      vazioTitulo: 'Você ainda não abriu pedidos',
      vazioTexto: 'Compras, eventos e coffee ficam registrados aqui assim que forem enviados.',
      vazioAcao: '<button class="btn btn--primary" data-acao="coffe">Solicitar coffee</button>'
    });
  };

  /* ============================================================= PAINEL ADM */
  V.painelAdm = function () {
    if (WB.eu().papel !== 'admin') {
      return WB.vazio('Acesso restrito',
        'O painel de administração é visível apenas para administradores do sistema. Fale com a Operações se você precisa desse acesso.',
        '<a class="btn" href="#/home">Voltar ao início</a>');
    }
    return cabecalho({ titulo: 'Painel de administração', sub: 'Integrações e fontes de dados que alimentam o portal.' }) +
      cartaoTabela('Integrações', [
        { titulo: 'Sistema', valor: 'nome' },
        { titulo: 'O que traz', valor: 'escopo' },
        { titulo: 'Responsável', valor: (i) => WB.pessoa(i.dono).nome },
        { titulo: 'Última sincronização', valor: (i) => i.ultimaSync === '—' ? 'nunca' : WB.fmtDataCurta(i.ultimaSync) },
        { titulo: 'Situação', valor: (i) => WB.chipStatus(i.status), bruto: true }
      ], WB.data.integracoes) +
      `<div class="rule" style="margin-top:16px">
        <strong>Neste protótipo nenhuma integração está de fato conectada.</strong>
        <p style="margin:6px 0 0">As situações acima descrevem o desenho pretendido. Nada é lido ou escrito em sistema externo.</p>
      </div>`;
  };

  /* ================================================================ PERFIL */
  V.perfil = function () {
    const eu = WB.eu();
    const tema = WB.store.get('tema', 'auto');
    return cabecalho({ titulo: 'Meu perfil' }) + `
      <div class="grid grid--2">
        <section class="card"><div class="card__body">
          <div class="inline" style="margin-bottom:16px">
            <span class="av av--lg">${esc(WB.iniciais(eu.nome))}</span>
            <span><strong style="display:block;font-size:17px">${esc(eu.nome)}</strong>
              <span class="muted">${esc(eu.funcao)}</span></span>
          </div>
          <dl class="dl">
            <dt>Empresa</dt><dd>${esc(WB.empresaNome(eu.empresa))}</dd>
            <dt>Setor</dt><dd>${esc(eu.setor)}</dd>
            <dt>Perfil de acesso</dt><dd>${esc({ admin: 'Administrador', head: 'Head', diretoria: 'Diretoria', analista: 'Analista' }[eu.papel] || eu.papel)}</dd>
            ${eu.email ? `<dt>E-mail</dt><dd>${esc(eu.email)}</dd>` : ''}
          </dl>
        </div></section>

        <section class="card">
          <div class="card__head"><h2 class="card__title">Preferências</h2></div>
          <div class="card__body">
            <div class="fld">
              <label>Tema da interface</label>
              <div class="opts" data-tema>
                <label class="opt"><input type="radio" name="tema" value="auto"${tema === 'auto' ? ' checked' : ''}>Seguir o sistema</label>
                <label class="opt"><input type="radio" name="tema" value="light"${tema === 'light' ? ' checked' : ''}>Claro</label>
                <label class="opt"><input type="radio" name="tema" value="dark"${tema === 'dark' ? ' checked' : ''}>Escuro</label>
              </div>
              <span class="fld__help">A escolha fica salva neste navegador.</span>
            </div>
            <div class="fld" style="margin-top:20px">
              <label>Ver o portal como</label>
              <select class="inp" data-trocar-usuario>
                ${WB.data.pessoas.map((p) => `<option value="${esc(p.id)}"${p.id === WB.data.usuarioAtual ? ' selected' : ''}>${esc(p.nome)} · ${esc(p.funcao)} · ${esc(WB.empresaNome(p.empresa))}</option>`).join('')}
              </select>
              <span class="fld__help">Recurso do protótipo, para conferir o que cada perfil enxerga — inclusive quais operações. Quem é de uma operação vê só a dela; administradores e diretoria veem todas. Não existe no sistema real.</span>
            </div>
          </div>
        </section>
      </div>`;
  };

  /* ================================================================= BUSCA */
  V.busca = function (q) {
    const termo = (q || '').trim().toLowerCase();
    if (termo.length < 2) {
      return cabecalho({ titulo: 'Busca' }) +
        WB.vazio('Digite ao menos duas letras', 'A busca varre demandas, projetos, documentos, pessoas, clientes e solicitações.');
    }
    const bate = (s) => String(s || '').toLowerCase().indexOf(termo) >= 0;
    const grupos = [
      { nome: 'Demandas', itens: WB.data.demandas.filter((d) => bate(d.nome) || bate(d.descricao)).map((d) => ({ t: d.nome, s: WB.pessoa(d.responsavel).nome + ' · ' + WB.prazoTexto(d.prazo), h: '#/demandas' })) },
      { nome: 'Projetos', itens: WB.data.projetos.filter((p) => bate(p.nome) || bate(p.resumo)).map((p) => ({ t: p.nome, s: p.resumo, h: '#/projeto/' + p.id })) },
      { nome: 'Documentos', itens: WB.data.governanca.documentos.filter((d) => bate(d.nome)).map((d) => ({ t: d.nome, s: d.categoria + ' · ' + d.versao, h: '#/governanca/politicas' })) },
      { nome: 'Pessoas', itens: WB.data.pessoas.filter((p) => bate(p.nome) || bate(p.funcao)).map((p) => ({ t: p.nome, s: p.funcao + ' · ' + WB.empresaNome(p.empresa), h: '#/colaboradores' })) },
      { nome: 'Clientes e leads', itens: WB.data.clientes.filter((c) => bate(c.nome) || bate(c.produto)).map((c) => ({ t: c.nome, s: c.produto + ' · ' + c.etapa, h: '#/clientes' })) },
      { nome: 'Solicitações', itens: WB.data.solicitacoes.filter((s) => bate(s.titulo) || bate(s.id)).map((s) => ({ t: s.titulo, s: s.id + ' · ' + s.status, h: '#/solicitacoes' })) }
    ].filter((g) => g.itens.length)
      // Registros da Fase 2. A busca respeita o mesmo recorte de
      // confidencialidade das listas de ativos.
      .concat((WB.fase2 && WB.fase2.buscar) ? WB.fase2.buscar(termo) : []);

    const total = grupos.reduce((a, g) => a + g.itens.length, 0);
    return cabecalho({
      titulo: `“${q}”`,
      sub: `${total} ${total === 1 ? 'resultado' : 'resultados'} no que você tem permissão para ver.`
    }) + (total ? `<section class="card"><div class="card__body card__body--flush">
        ${grupos.map((g) => `<div class="searchres__grp">${esc(g.nome)} · ${g.itens.length}</div>
          <div class="rows">${g.itens.map((i) => `<a class="row" href="${esc(i.h)}">
            <span class="row__main"><span class="row__title">${esc(i.t)}</span>
              <span class="row__meta">${esc(i.s)}</span></span>
            <span class="row__side">${WB.icon('seta', 14)}</span></a>`).join('')}</div>`).join('')}
      </div></section>`
      : WB.vazio('Nada encontrado', 'Tente outra palavra, ou procure pelo nome do projeto.'));
  };
})();
