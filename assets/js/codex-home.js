/* WeBrain — início e componentes de apresentação. Responsabilidade: Codex.
   ---------------------------------------------------------------------------
   Reformulado em 21/09/2026 a pedido do usuário (registro em
   ALINHAMENTO_CLAUDE_CODEX.md). O que mudou e por quê:

   · saudação sem "WE / SEU DIA" e sem subtítulo — sobrou "Olá, fulana" e a data;
   · função e sprint viraram faixa de destaque, com cor de fundo;
   · a lista de demandas, o quadro e os quatro números saíram daqui: o lugar
     deles é a tela Demandas. O Início é do que se faz agora;
   · entraram, em destaque: as principais políticas em galeria de botões e os
     pedidos (evento, compra, coffee) com lead e cliente no mesmo bloco;
   · "Avisos" virou "News We", com capa de pré-visualização;
   · a agenda passou a ser uma grade de horas, como num calendário, com hoje e
     a semana lado a lado.

   Segunda remessa, 22/09/2026 (Claude, a pedido do usuário — registro em
   ALINHAMENTO_CLAUDE_CODEX.md):
   · ordem: cabeçalho com função e sprint → News → pedidos → agenda →
     principais políticas;
   · News em galeria menor (até quatro), com "Publicar news" para admin e
     heads, fixar para a administração e apagar para quem pode;
   · pedidos em cor cheia, numa faixa própria;
   · agenda abre na semana e liga/desliga cada agenda compartilhada;
   · políticas em destaque escolhidas pela administração (`settings.politicas`).
   As permissões chegam prontas em `settings.permissoes`: o módulo não decide
   quem pode o quê.

   `select` continua entregando o recorte de demandas: ele é o contrato de
   dados do módulo, usado pelos testes e pela tela de demandas. O Início apenas
   deixou de desenhá-lo.                                                      */
(function () {
  'use strict';
  const WB = window.WB = window.WB || {};
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const validKey = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
    const [y, m, d] = value.split('-').map(Number);
    return dateKey(new Date(y, m - 1, d)) === value;
  };
  const shortDate = value => validKey(value) ? `${value.slice(8, 10)}/${value.slice(5, 7)}` : 'Sem prazo';
  const fold = value => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const toDate = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
  function boundaries(now) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    const end = new Date(start); end.setDate(end.getDate() + 6);
    return { today: dateKey(now), start: dateKey(start), end: dateKey(end) };
  }
  function select(data, state, now) {
    const bounds = boundaries(now);
    const user = (data.pessoas || []).find(p => p.id === data.usuarioAtual);
    const own = user ? (data.demandas || []).filter(d => d.responsavel === user.id) : [];
    const open = own.filter(d => d.status !== 'concluida');
    const late = d => validKey(d.prazo) && d.prazo < bounds.today;
    const projects = new Map((data.projetos || []).map(p => [p.id, p]));
    const sprint = (data.sprints || []).find(s => s.atual);
    const tasks = open.filter(d => {
      const match = state.period === 'all' || (state.period === 'today' && d.prazo === bounds.today) ||
        (state.period === 'late' && late(d)) || (state.period === 'week' && validKey(d.prazo) && d.prazo >= bounds.start && d.prazo <= bounds.end);
      return match && fold(`${d.nome} ${projects.get(d.projeto)?.nome || ''}`).includes(fold(state.query));
    }).filter(d => state.sprint !== 'atual' || (!!sprint && d.sprint === sprint.id))
      .sort((a, b) => (validKey(a.prazo) ? a.prazo : '9999').localeCompare(validKey(b.prazo) ? b.prazo : '9999'));
    /* Agendas desligadas pela pessoa saem da grade. Compromisso sem agenda é
       da agenda principal. */
    const ocultas = state.ocultas || [];
    const agenda = user ? (data.agenda || []).filter(e => validKey(e.dia) && ocultas.indexOf(e.agenda || 'principal') < 0 && (state.agenda === 'today' ? e.dia === bounds.today : e.dia >= bounds.start && e.dia <= bounds.end))
      .sort((a, b) => `${a.dia} ${a.inicio}`.localeCompare(`${b.dia} ${b.inicio}`)) : [];
    /* Quem publica escolhe o público: o grupo todo ("Todos") ou só quem tem
       acesso a uma empresa (o id dela). Setor e função continuam valendo para
       as news antigas. A administração vê todas, para poder gerir. */
    const news = user ? (data.news || []).filter(n => state.todasNews || n.publico === 'Todos' || n.publico === user.setor || n.publico === user.funcao || (user.empresa && n.publico === user.empresa))
      .sort((a, b) => Number(!!b.fixado) - Number(!!a.fixado) || String(b.data).localeCompare(String(a.data))).slice(0, 4) : [];
    return { user, open, tasks, agenda, news, projects, bounds, sprint, late: open.filter(late).length,
      today: open.filter(d => d.prazo === bounds.today).length, done: own.filter(d => d.status === 'concluida').length };
  }
  const tag = (label, tone = '') => `<span class="wh-tag ${tone ? `wh-tag--${escape(tone)}` : ''}">${escape(label)}</span>`;
  const empty = (title, text) => `<div class="wh-empty"><strong>${escape(title)}</strong><p>${escape(text)}</p></div>`;
  const arrow = '<span aria-hidden="true">↗</span>';
  /* Selo "novo": 24 horas quando o registro tem hora, o dia da publicação quando
     só tem data. A regra mora em `WB.avisoNovo` (data.js) para o mural e as
     outras telas contarem do mesmo jeito. Sem ela, o selo simplesmente não sai. */
  const novo = (aviso, now) => typeof WB.avisoNovo === 'function' && WB.avisoNovo(aviso, now).novo;

  /* --------------------------------------------------------------- ícones
     Desenhados aqui, e não em `WB.icon`, para o módulo continuar de pé
     sozinho — os testes o carregam sem `ui.js`. */
  const ICONES = {
    doc: '<path d="M6 3h7l4 4v14H6z"/><path d="M13 3v4h4"/><path d="M9 12h6M9 16h6"/>',
    evento: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    compra: '<circle cx="9.5" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M2.5 3.5h2.8l2.5 11h11L21 7.5H6.2"/>',
    cafe: '<path d="M4 8h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M17 9.5h1.5a2.3 2.3 0 0 1 0 4.6H17"/><path d="M7.5 3v2M11.5 2.6v2.4"/><path d="M3 21h15"/>',
    lead: '<circle cx="10" cy="8" r="3.4"/><path d="M3.5 20a6.5 6.5 0 0 1 11-4.7"/><path d="M18 14.5v6M15 17.5h6"/>',
    cliente: '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5.8a3.4 3.4 0 0 1 0 6.4"/><path d="M17.4 14.6A6.5 6.5 0 0 1 21.5 20"/>',
    news: '<path d="M4 9.5h3l7-4.5v14l-7-4.5H4z"/><path d="M17.5 9.5a3.6 3.6 0 0 1 0 5"/><path d="M7 14.5V19h3"/>',
    relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.3l3.2 2"/>'
  };
  const icone = (nome, tamanho) => `<svg class="wh-ic" width="${tamanho || 20}" height="${tamanho || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ''}</svg>`;

  /* -------------------------------------------------------------- pedidos
     O rótulo diz a ação inteira: não há mais frase de apoio acima do bloco.
     Lead e cliente entram junto porque são o mesmo gesto — começar alguma
     coisa — e estavam escondidos no rodapé da tela. */
  const PEDIDOS = [
    { acao: 'evento', icone: 'evento', titulo: 'Solicitar evento', texto: 'Encontros, treinamentos e experiências' },
    { acao: 'compra', icone: 'compra', titulo: 'Solicitar compra ou pagamento', texto: 'Materiais, serviços e notas' },
    { acao: 'coffe', icone: 'cafe', titulo: 'Solicitar coffee', texto: 'Café e recepção de visitas' },
    { acao: 'lead', icone: 'lead', titulo: 'Cadastrar novo lead', texto: 'Quem acabou de chegar' },
    { acao: 'cliente', icone: 'cliente', titulo: 'Cadastrar novo cliente', texto: 'Quem fechou com a gente' }
  ];

  /* ---------------------------------------------------------------- capas
     A base não guarda imagem de news. Em vez de deixar um buraco na galeria,
     a capa é desenhada a partir do id — a mesma cor sempre para o mesmo aviso
     — e o campo `capa` assume assim que existir imagem de verdade. Endereço de
     capa só vale em forma de imagem: `javascript:` num src seria execução de
     código vinda de um formulário. */
  const PALETAS = [['#374b58', '#6d8b9c'], ['#ff5f00', '#ffa863'], ['#2f6b5f', '#69ad98'], ['#54497c', '#9b8fc6'], ['#8a3b3b', '#cf8272']];
  const capaSegura = url => /^(https?:\/\/|data:image\/|assets\/|\.{0,2}\/)/i.test(String(url || '')) ? String(url) : '';
  function capa(aviso) {
    const url = capaSegura(aviso.capa);
    if (url) return `<span class="wh-news-cover"><img src="${escape(url)}" alt=""></span>`;
    const soma = String(aviso.id || aviso.titulo || '').split('').reduce((total, c) => total + c.charCodeAt(0), 0);
    const [c1, c2] = PALETAS[soma % PALETAS.length];
    return `<span class="wh-news-cover wh-news-cover--gerada" style="--c1:${c1};--c2:${c2}" aria-hidden="true">${icone('news', 30)}</span>`;
  }

  /* --------------------------------------------------------------- agenda
     Grade de horas, como num calendário: a mesma régua à esquerda e um dia por
     coluna. Na semana são sete colunas lado a lado — era esse o pedido, ver dia
     após dia na horizontal em vez de uma lista comprida. */
  const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const minutos = valor => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(valor || ''));
    if (!m) return null;
    const total = Number(m[1]) * 60 + Number(m[2]);
    return total >= 0 && total <= 1440 ? total : null;
  };
  const hhmm = total => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

  /* Compromissos que se cruzam dividem a largura da coluna em vez de um cobrir
     o outro. Cada grupo de sobreposição resolve as próprias faixas. */
  function distribuir(eventos) {
    const ordenados = eventos.slice().sort((a, b) => (a.ini - b.ini) || (a.fim - b.fim));
    const saida = [];
    let grupo = [], fimGrupo = -1;
    const fechar = () => {
      if (!grupo.length) return;
      const faixas = [];
      grupo.forEach(ev => {
        let i = faixas.findIndex(fim => fim <= ev.ini);
        if (i < 0) i = faixas.length;
        faixas[i] = ev.fim; ev.faixa = i;
      });
      grupo.forEach(ev => { ev.faixas = faixas.length; saida.push(ev); });
      grupo = []; fimGrupo = -1;
    };
    ordenados.forEach(ev => {
      if (grupo.length && ev.ini >= fimGrupo) fechar();
      grupo.push(ev); fimGrupo = Math.max(fimGrupo, ev.fim);
    });
    fechar();
    return saida;
  }

  function prepararAgenda(lista) {
    const comHora = [], semHora = [];
    lista.forEach(e => {
      const ini = minutos(e.inicio);
      if (ini == null) { semHora.push(e); return; }
      const fim = minutos(e.fim);
      comHora.push({ e, ini, fim: Math.max(fim == null ? ini + 60 : fim, ini + 20) });
    });
    return { comHora, semHora };
  }

  /* Cor do compromisso = cor da agenda de onde ele vem. Só entra cor em
     formato hexadecimal: o valor vai para um atributo style. */
  const corSegura = cor => /^#[0-9a-f]{3,8}$/i.test(String(cor || '')) ? cor : '';
  function agendaCalendario(view, state, cores = {}) {
    const { comHora, semHora } = prepararAgenda(view.agenda);
    const dias = state.agenda === 'today'
      ? [view.bounds.today]
      : Array.from({ length: 7 }, (_, i) => { const d = toDate(view.bounds.start); d.setDate(d.getDate() + i); return dateKey(d); });
    if (!comHora.length && !semHora.length) {
      return empty('Agenda livre neste período', 'Seus compromissos aparecerão aqui quando estiverem disponíveis.');
    }
    /* A janela acompanha o dia real: nunca menos que 8h–19h, e cresce quando
       alguém marca algo às 7h ou às 21h. Sem isso o primeiro compromisso do dia
       ficaria fora da grade. */
    const inicioJanela = Math.floor(Math.min(8 * 60, ...comHora.map(x => x.ini)) / 60) * 60;
    const fimJanela = Math.ceil(Math.max(19 * 60, ...comHora.map(x => x.fim)) / 60) * 60;
    const total = fimJanela - inicioJanela;
    const horas = [];
    for (let h = inicioJanela; h < fimJanela; h += 60) horas.push(h);
    const pct = min => ((min - inicioJanela) / total) * 100;

    const coluna = dia => {
      const doDia = distribuir(comHora.filter(x => x.e.dia === dia));
      return `<div class="wh-cal-col">
        ${horas.map(() => '<i class="wh-cal-line"></i>').join('')}
        ${doDia.map(x => {
          const largura = 100 / x.faixas;
          const cor = corSegura(cores[x.e.agenda || 'principal']);
          return `<article class="wh-cal-ev wh-cal-ev--${escape(x.e.tipo || 'reuniao')}${cor ? ' wh-cal-ev--cor' : ''}" style="top:${pct(x.ini).toFixed(2)}%;height:${((x.fim - x.ini) / total * 100).toFixed(2)}%;left:${(x.faixa * largura).toFixed(2)}%;width:calc(${largura.toFixed(2)}% - 5px)${cor ? ';--ag:' + cor : ''}">
            <strong>${escape(x.e.titulo)}</strong>
            <span>${escape(hhmm(x.ini))}–${escape(hhmm(x.fim))}${x.e.local ? ' · ' + escape(x.e.local) : ''}</span>
          </article>`;
        }).join('')}
      </div>`;
    };

    return `<div class="wh-cal ${state.agenda === 'week' ? 'wh-cal--week' : 'wh-cal--day'}" style="--colunas:${dias.length}">
      <div class="wh-cal-head">
        <span class="wh-cal-corner">${icone('relogio', 14)}</span>
        ${dias.map(dia => {
          const d = toDate(dia);
          return `<span class="wh-cal-day ${dia === view.bounds.today ? 'wh-cal-day--today' : ''}"><small>${DIAS_CURTOS[d.getDay()]}</small><strong>${d.getDate()}</strong></span>`;
        }).join('')}
      </div>
      <div class="wh-cal-body">
        <div class="wh-cal-rail">${horas.map(h => `<span>${hhmm(h)}</span>`).join('')}</div>
        <div class="wh-cal-grid">${dias.map(coluna).join('')}</div>
      </div>
      ${semHora.length ? `<div class="wh-cal-loose"><span class="wh-muted">Sem horário definido</span>${semHora.map(e => `<span class="wh-tag">${escape(e.titulo)} · ${shortDate(e.dia)}</span>`).join('')}</div>` : ''}
    </div>`;
  }

  function mount(root, options = {}) {
    if (!root || !root.addEventListener) throw new Error('WB.home.mount precisa de um elemento DOM.');
    let settings = { demo: true, ...options };
    let disposed = false;
    let view;
    /* `period`, `query`, `mode` e `sprint` continuam no estado porque `select`
       é o mesmo contrato de dados usado pela tela de demandas e pelos testes.
       O Início não os controla mais: quem filtra demanda é a tela Demandas. */
    /* A agenda abre na semana (pedido do usuário, 22/09/2026); "Hoje" fica a
       um clique. `ocultas` são as agendas compartilhadas que a pessoa
       desligou — vem gravado de fora, por pessoa. */
    const state = { period: 'all', agenda: 'week', query: '', mode: 'lista', sprint: 'todas', ocultas: Array.isArray(settings.agendasOcultas) ? settings.agendasOcultas.slice() : [] };
    const frame = document.createElement('div'); frame.className = 'we-home'; root.appendChild(frame);
    const enabled = () => typeof settings.onAction === 'function';
    const unavailable = () => enabled() ? '' : ' disabled title="Ação disponível após conectar os formulários do sistema"';
    const pode = chave => !!(settings.permissoes && settings.permissoes[chave]);
    const podeApagar = n => !!(settings.permissoes && typeof settings.permissoes.apagarNews === 'function' && settings.permissoes.apagarNews(n));

    /* Galeria de botões, não lista de documento: ícone, nome e uma linha
       dizendo de quem é e em que versão está. O documento abre na tela de
       cultura e políticas. O que fica aqui quem escolhe é a administração
       (`settings.politicas`); sem escolha, as seis primeiras políticas. */
    function politicas(data) {
      const documentos = Array.isArray(settings.politicas) ? settings.politicas
        : ((data.governanca || {}).documentos || []).filter(d => d.categoria === 'Políticas').slice(0, 6);
      if (!documentos.length) return empty('Nenhuma política em destaque', pode('destaque') ? 'Use "Escolher destaque" para fixar as políticas que aparecem aqui.' : 'As políticas do grupo aparecem aqui assim que forem publicadas.');
      return `<div class="wh-policy-grid">${documentos.map(d => `<a class="wh-policy" href="#/governanca/politicas">
        <span class="wh-policy-ic">${icone('doc', 22)}</span>
        <strong>${escape(d.nome)}</strong>
        <span class="wh-policy-meta">${escape(d.setor || 'Grupo We')} · ${escape(d.versao || 'sem versão')}</span>
        ${validKey(d.revisao) && d.revisao < view.bounds.today ? tag('Revisão vencida', 'late') : ''}
      </a>`).join('')}</div>`;
    }

    /* Os três pedidos vêm primeiro e em cor cheia — é o que se procura aqui.
       Lead e cliente continuam no bloco, num tom mais discreto. */
    function pedidos() {
      return `<div class="wh-actions">${PEDIDOS.map(p => `<button class="wh-action${['evento', 'compra', 'coffe'].indexOf(p.acao) >= 0 ? ' wh-action--pedido' : ''}" data-action="${p.acao}"${unavailable()}>
        <span class="wh-action-ic">${icone(p.icone, 24)}</span>
        <strong>${escape(p.titulo)}${arrow}</strong>
        <span>${escape(p.texto)}</span>
      </button>`).join('')}</div>`;
    }

    const publicoTexto = (data, publico) => {
      if (!publico || publico === 'Todos') return 'Todo o grupo';
      const e = (data.empresas || []).find(x => x.id === publico);
      return e ? e.nome : publico;
    };

    function newsWe(data, now) {
      if (!view.news.length) return empty('Nenhuma news para você', pode('publicarNews') ? 'Use "Publicar news" para fazer o primeiro comunicado.' : 'Os comunicados da sua equipe aparecerão aqui.');
      return `<div class="wh-news-grid">${view.news.map((n, index) => `<article class="wh-news-card">
        ${capa(n)}
        <div class="wh-news-body">
          <div class="wh-news-meta"><span class="wh-news-tags">${tag(n.fixado ? 'Fixado' : 'Comunicado')}${novo(n, now) ? tag('Novo', 'new') : ''}</span><span>${shortDate(n.data)}</span></div>
          <h3>${escape(n.titulo)}</h3>
          <p>${escape(n.corpo)}</p>
          <span class="wh-news-para">Para: ${escape(publicoTexto(data, n.publico))}</span>
          <div class="wh-news-foot">
            <button class="wh-text-button" data-news="${index}"${unavailable()}>Ler ${arrow}</button>
            ${pode('destaque') ? `<button class="wh-mini" data-news-fixar="${index}"${unavailable()}>${n.fixado ? 'Desafixar' : 'Fixar'}</button>` : ''}
            ${podeApagar(n) ? `<button class="wh-mini wh-mini--danger" data-news-apagar="${index}"${unavailable()} aria-label="Apagar a news ${escape(n.titulo)}">Apagar</button>` : ''}
          </div>
        </div>
      </article>`).join('')}</div>`;
    }

    /* Liga e desliga as agendas compartilhadas com a conta. A própria agenda
       também pode sair — a escolha é da pessoa. */
    function agendasFiltro(data) {
      const agendas = data.agendas || [];
      if (!agendas.length) return '';
      return `<div class="wh-agendas" role="group" aria-label="Agendas visíveis">
        <span class="wh-muted">Lida de ${escape(settings.conta || 'sua conta')}:</span>
        ${agendas.map(a => {
          const ligada = state.ocultas.indexOf(a.id) < 0;
          const cor = corSegura(a.cor);
          return `<button class="wh-agenda-chip" data-agenda-toggle="${escape(a.id)}" aria-pressed="${ligada}" title="${escape(a.conta || '')}"${cor ? ` style="--ag:${cor}"` : ''}><i aria-hidden="true"></i>${escape(a.nome)}</button>`;
        }).join('')}
      </div>`;
    }

    function render() {
      if (disposed) return;
      const data = settings.data || WB.data || {};
      const now = settings.now || new Date();
      state.todasNews = pode('todasNews');
      view = select(data, state, now);
      const name = view.user?.nome?.split(' ')[0] || 'visitante';
      const sprint = view.sprint;
      const cores = {};
      (data.agendas || []).forEach(a => { cores[a.id] = a.cor; });
      /* Ordem pedida em 22/09/2026: cabeçalho com função e sprint, News,
         pedidos, agenda e, por último, as principais políticas. */
      frame.innerHTML = `
        ${settings.demo ? '<div class="wh-demo"><span class="wh-demo-dot" aria-hidden="true"></span> Ambiente de demonstração <span>Dados ilustrativos · sem integração com serviços reais</span></div>' : ''}
        <header class="wh-heading"><h1>Olá, ${escape(name)}.</h1>
        <div class="wh-date"><span>${escape(new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(now))}</span><strong>${escape(new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(now))}</strong></div></header>
        <div class="wh-context">
          <span class="wh-context-item">${escape(view.user?.funcao || 'Sessão não identificada')}</span>
          <span class="wh-context-item wh-context-item--sprint">${escape(sprint?.nome || 'Sem sprint atual')}${sprint && validKey(sprint.fim) ? ' · até ' + shortDate(sprint.fim) : ''}</span>
          <span class="wh-context-item wh-context-item--quiet">${escape(view.user?.setor || 'Acesso restrito')}</span>
        </div>
        <section class="wh-panel wh-news" aria-labelledby="wh-news-title">
          <div class="wh-panel-head"><h2 id="wh-news-title">News We</h2>
            <button class="wh-text-button" data-action="news-galeria"${unavailable()}>Ver todas ${arrow}</button>
            ${pode('publicarNews') ? `<button class="wh-head-button" data-action="news"${unavailable()}>+ Publicar news</button>` : '<span class="wh-muted">Para o seu perfil</span>'}
          </div>
          ${newsWe(data, now)}
        </section>
        <section class="wh-panel wh-requests" aria-labelledby="wh-requests-title">
          <h2 id="wh-requests-title" class="wh-sr">Pedidos e cadastros</h2>
          ${pedidos()}
          ${!enabled() ? '<p class="wh-integration-note">As ações serão habilitadas quando os formulários estiverem conectados.</p>' : ''}
        </section>
        <section class="wh-panel wh-agenda" aria-labelledby="wh-agenda-title">
          <div class="wh-panel-head"><h2 id="wh-agenda-title">Agenda</h2>
            <div class="wh-segment" role="group" aria-label="Período da agenda">${[['week', 'Semana'], ['today', 'Hoje']].map(([key, label]) => `<button data-agenda="${key}" aria-pressed="${state.agenda === key}">${label}</button>`).join('')}</div>
          </div>
          ${agendasFiltro(data)}
          ${agendaCalendario(view, state, cores)}
        </section>
        <section class="wh-panel wh-policies" aria-labelledby="wh-policies-title">
          <div class="wh-panel-head"><h2 id="wh-policies-title">Principais políticas da We</h2>
            <span class="wh-head-actions">${pode('destaque') ? `<button class="wh-head-button wh-head-button--quiet" data-action="politicas-destaque"${unavailable()}>Escolher destaque</button>` : ''}<a class="wh-text-button" href="#/governanca/politicas">Ver todas ${arrow}</a></span>
          </div>
          ${politicas(data)}
        </section>`;
    }
    function rerenderAndFocus(selector) {
      render();
      const element = frame.querySelector(selector);
      if (element) element.focus();
    }
    function click(event) {
      const button = event.target.closest('button'); if (!button || !frame.contains(button) || button.disabled) return;
      if (button.dataset.agenda) { state.agenda = button.dataset.agenda; rerenderAndFocus(`[data-agenda="${state.agenda}"]`); }
      else if (button.dataset.agendaToggle) {
        const id = button.dataset.agendaToggle;
        const i = state.ocultas.indexOf(id);
        if (i >= 0) state.ocultas.splice(i, 1); else state.ocultas.push(id);
        if (enabled()) settings.onAction('agendas', state.ocultas.slice());
        rerenderAndFocus(`[data-agenda-toggle="${id}"]`);
      }
      else if (enabled()) {
        if (button.dataset.news != null) settings.onAction('aviso', view.news[Number(button.dataset.news)]);
        else if (button.dataset.newsFixar != null) settings.onAction('news-fixar', view.news[Number(button.dataset.newsFixar)]);
        else if (button.dataset.newsApagar != null) settings.onAction('news-apagar', view.news[Number(button.dataset.newsApagar)]);
        else if (button.dataset.action) settings.onAction(button.dataset.action, null);
      }
    }
    frame.addEventListener('click', click); render();
    return {
      update(next = {}) { settings = { ...settings, ...next }; if (Array.isArray(next.agendasOcultas)) state.ocultas = next.agendasOcultas.slice(); render(); },
      destroy() { disposed = true; frame.removeEventListener('click', click); frame.remove(); }
    };
  }
  WB.home = { mount, select, components: { tag, empty } };
})();
