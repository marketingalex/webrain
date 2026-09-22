/* WeBrain — casca da aplicação: navegação, cabeçalho e roteador.
   A tela inicial é do módulo WB.home (Codex). Este arquivo apenas a monta na
   rota e liga as ações dela aos formulários reais.

   A faixa de contexto (operação · área · sprint) foi removida do portal em
   21/09/2026 a pedido do usuário: ela repetia em toda tela o que o seletor da
   lateral já diz, e empurrava o conteúdo para baixo. */
(function () {
  const WB = (window.WB = window.WB || {});
  const esc = WB.esc;

  /* ---------------------------------------------------------------- rotas */
  const ROTAS = {
    'home': () => null, // montada pelo módulo WB.home
    'busca': (p) => WB.views.busca(p[0] || ''),
    'demandas': () => WB.views.demandas(),
    'projetos': () => WB.views.projetos(),
    'projetos-arquivados': (p) => WB.views.projetosArquivados(p[0]),
    'projeto': (p) => WB.views.projeto(p[0], p[1]),
    'cronograma': (p) => WB.views.cronograma(p[0]),
    'painel-controle': (p) => WB.views.painelControle(p[0]),
    'solicitacoes': (p) => WB.views.solicitacoes(p[0]),
    // Fila de quem aprova pedidos (pedidos-views.js, 22/09/2026).
    'aprovacoes': (p) => WB.views.aprovacoes(p[0]),
    'indicadores': () => WB.views.indicadoresPagina(),
    'dash': (p) => ({
      grupo: WB.views.dashGrupo,
      incorporadora: () => WB.views.dashIncorporadora(p[1]),
      clientes: WB.views.dashClientes,
      performance: () => WB.views.dashPerformance(p[1])
    }[p[0]] || WB.views.dashGrupo)(),
    /* `p[1]` é o recorte por empresa (#/governanca/metas/weinvest). Ausente,
       a tela mostra o grupo inteiro, como antes. */
    'governanca': (p) => ({
      metas: WB.views.metas, politicas: WB.views.politicas,
      processos: WB.views.processos, treinamentos: WB.views.treinamentos,
      cultura: WB.views.cultura
    }[p[0]] || WB.views.metas)(p[1]),
    'atas': (p) => WB.views.atas(p[0]),
    'clientes': (p) => WB.views.clientes(p[0]),
    // Leads ganharam tela própria: clientes e leads deixaram de dividir uma só.
    'leads': (p) => WB.views.leads(p[0]),
    'id-visual': () => WB.views.idVisual(),
    'galeria': () => WB.views.galeria(),
    'links': () => WB.views.links(),
    'crm': () => WB.views.crm(),
    'agentes': () => WB.views.agentes(),
    'corretores': () => WB.views.corretores(),
    'erp': () => WB.views.erp(),
    'contratos': () => WB.views.adm('contratos'),
    // `p[0]` é a aba da tela (#/colaboradores/desligados).
    'colaboradores': (p) => WB.views.adm('colaboradores', p[0]),
    'fornecedores': () => WB.views.adm('fornecedores'),
    'patrocinadores': () => WB.views.adm('patrocinadores'),
    'bens': () => WB.views.adm('bens'),
    'cnpjs': () => WB.views.adm('cnpjs'),
    'painel-adm': () => WB.views.painelAdm(),
    'perfil': () => WB.views.perfil()
  };

  /* As telas da Fase 2 (WeInvest e Nós Gastronomia) registram as próprias
     rotas. Sem os arquivos carregados, o portal continua com as rotas antigas. */
  if (WB.fase2 && WB.fase2.rotas) Object.assign(ROTAS, WB.fase2.rotas);
  WB.rotas = ROTAS; // exposto para os testes, como o mapa de ações

  /* ------------------------------------------------------------- estrutura */
  function contadores() {
    const minhas = WB.data.demandas.filter((d) => d.responsavel === WB.data.usuarioAtual && !WB.demandaFechada(d));
    const atrasadas = minhas.filter((d) => WB.dias(d.prazo) < 0);
    const aprovar = WB.pedidos ? WB.pedidos.pendentesDe(WB.data.usuarioAtual) : 0;
    return { demandas: minhas.length, atrasadas: atrasadas.length, aprovar };
  }

  let ultimaRotaSidebar = null;
  function renderSidebar() {
    const eu = WB.eu();
    const c = contadores();
    const atual = (location.hash.replace(/^#\//, '') || 'home');

    const rotaMudou = ultimaRotaSidebar !== atual;
    ultimaRotaSidebar = atual;
    const chave = 'sidebar.ramos.' + eu.id;
    const salvoRamos = WB.store.get(chave, {});
    const abertos = salvoRamos && typeof salvoRamos==='object' ? salvoRamos : {};
    let sequencia = 0;
    /* A árvore é a base comum mais os ramos da operação em foco. Quem é do
       restaurante abre o portal e vê o restaurante; quem é admin ou diretoria
       troca de operação pelo seletor. A definição de cada operação está em
       `operacoes.js`, não aqui. */
    const visiveis = WB.operacoesVisiveis ? WB.operacoesVisiveis() : [];
    const operacaoId = WB.operacaoAtual ? WB.operacaoAtual() : null;
    const operacao = operacaoId && WB.operacao ? WB.operacao(operacaoId) : null;
    const grupos = (WB.navBase ? WB.navBase() : []).concat(operacao ? operacao.itens() : []);
    const ativo = item => atual === item.rota || (item.rota?.startsWith('projeto/') && atual.startsWith(item.rota+'/')) || (item.rota==='cronograma' && atual.startsWith('cronograma/')) || (item.rota==='painel-controle/dashboard' && atual==='painel-controle')
      // Telas com subnível em aba (#/atas/:tipo, #/clientes/:empresa) mantêm o item pai marcado.
      || (!!item.rota && item.rota !== 'projetos-arquivados' && item.rota.indexOf('/') < 0 && atual.indexOf(item.rota + '/') === 0);
    const contemAtual = item => item.itens ? item.itens.some(contemAtual) : ativo(item);
    /* Um mesmo destino aparece em mais de um ramo desde a Fase 2 — atas, bens e
       ERP estão em Recursos e também dentro de cada operação. Só o primeiro
       recebe aria-current: dois "página atual" confundem quem navega por leitor
       de tela. */
    let jaMarcado = false;
    function desenhar(item) {
      if (!item.itens) {
        const n=item.contador ? c[item.contador] : 0;
        /* Item com `externo` não é uma tela do portal: é um atalho que abre
           outro sistema em nova aba (o ERP, por exemplo). Nunca fica marcado
           como página atual, porque o portal continua onde estava. */
        if (item.externo) {
          return `<a class="navitem navitem--fora" href="${esc(item.externo)}" target="_blank" rel="noopener">${esc(item.nome)}<span class="navitem__fora" aria-label="abre em outra aba" title="Abre em outra aba">${WB.icon('link',13)}</span></a>`;
        }
        const marcar = ativo(item) && !jaMarcado;
        if (marcar) jaMarcado = true;
        return `<a class="navitem" href="#/${esc(item.rota)}"${marcar?' aria-current="page"':''}${ativo(item)&&!marcar?' data-tambem-atual':''}>${esc(item.nome)}${n?`<span class="navitem__count">${n}</span>`:''}</a>`;
      }
      const painel='nav-ramo-'+(++sequencia);
      if (contemAtual(item) && rotaMudou) abertos[item.id]=true;
      const aberto=abertos[item.id] === true;
      return `<div class="navbranch"><div class="navbranch__heading"><button class="navbranch__toggle" data-nav-branch="${esc(item.id)}" aria-expanded="${aberto}" aria-controls="${painel}"><span class="navbranch__arrow" aria-hidden="true">${aberto?'▾':'▸'}</span>${esc(item.nome)}</button>${item.id==='trabalho'?'<button class="navbranch__add" data-nav-create aria-label="Novo projeto" title="Novo projeto">+</button>':''}</div><div class="navbranch__children" id="${painel}"${aberto?'':' hidden'}>${item.itens.map(desenhar).join('')}</div></div>`;
    }
    const arvore=grupos.map(desenhar).join('');
    WB.store.set(chave,abertos);

    /* O seletor de operação faz parte do cabeçalho da lateral e não tem mais
       rótulo escrito: a caixa sozinha já diz o que faz, e o nome da operação
       aparece dentro dela. Quem enxerga uma operação só vê o nome dela — para
       não haver dúvida sobre em qual portal está. */
    const seletor = !operacao ? '' : visiveis.length > 1
      ? `<div class="sb__op">
          <label class="sr" for="sb-operacao">Operação em foco</label>
          <select class="inp sb__op__sel" id="sb-operacao" data-operacao>
            ${visiveis.map((id) => {
              const o = WB.operacao(id);
              return `<option value="${esc(id)}"${id === operacaoId ? ' selected' : ''}>${esc(o.nome)}</option>`;
            }).join('')}
          </select>
        </div>`
      : `<div class="sb__op sb__op--fixa">
          <strong class="sb__op__nome">${esc(operacao.nome)}</strong>
        </div>`;

    /* A busca saiu daqui: ela agora mora no cabeçalho de todas as páginas,
       ao lado das notificações. */
    const html = `
      <div class="sb__head" data-operation-color="${esc(operacaoId || '')}">
        <a class="sb__brand" href="#/home">
          <span class="sb__word">We<em>Brain</em></span>
          <span class="sb__tag">cérebro we</span>
        </a>
        ${seletor}
      </div>
      <nav class="sb__scroll" aria-label="Seções do portal">
        ${arvore}
      </nav>
      ${!operacao?`<div class="sb__aviso">Sua conta não está ligada a nenhuma operação do grupo. Fale com a Operações para receber o acesso.</div>`:''}
      ${eu.papel==='admin'?'<a class="navitem sb__admin" href="#/painel-adm"'+(atual==='painel-adm'?' aria-current="page"':'')+'>Painel administrativo<small>Integrações / fontes de dados</small></a>':''}
      <div class="sb__account"><button class="sb__foot" data-conta aria-label="Abrir menu da conta">
        <span class="av">${esc(WB.iniciais(eu.nome))}</span>
        <span style="min-width:0">
          <strong style="display:block;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(eu.nome)}</strong>
          <span class="muted" style="font-size:12px">${esc(eu.funcao)}</span>
        </span>
      </button></div>`;
    const sidebar=document.getElementById('sidebar');
    const scroll=sidebar.querySelector('.sb__scroll')?.scrollTop || 0;
    sidebar.innerHTML = html;
    sidebar.querySelector('.sb__scroll').scrollTop=scroll;
    sidebar.querySelectorAll('[data-nav-branch]').forEach(button=>button.addEventListener('click',()=>{
      const aberto=button.getAttribute('aria-expanded')!=='true';
      button.setAttribute('aria-expanded',String(aberto));
      button.querySelector('.navbranch__arrow').textContent=aberto?'▾':'▸';
      document.getElementById(button.getAttribute('aria-controls')).hidden=!aberto;
      abertos[button.dataset.navBranch]=aberto; WB.store.set(chave,abertos);
    }));
    // O "+" de novo projeto mora no ramo de trabalho, que nem toda operação tem.
    const criar = sidebar.querySelector('[data-nav-create]');
    if (criar) criar.addEventListener('click',()=>WB.abrirProjeto());

    /* Trocar de operação é trocar de portal. Se a rota atual pertencer à
       operação que se está deixando, a navegação vai para o início da nova —
       senão a pessoa ficaria olhando uma tela à qual não tem mais acesso. */
    const opSel = sidebar.querySelector('[data-operacao]');
    if (opSel) opSel.addEventListener('change',()=>{
      if (!WB.definirOperacao(opSel.value)) return;
      const destino = (WB.operacao(opSel.value)||{}).inicio || 'home';
      const partes = WB.routeSegments(atual);
      const raiz = partes.shift() || 'home';
      const dona = WB.operacaoDaRota(raiz, partes);
      WB.toast('Agora você está em ' + WB.operacao(opSel.value).nome + '.');
      if (dona && dona !== opSel.value) location.hash = '#/' + destino;
      else renderSidebar();
    });
  }
  WB.renderSidebar = renderSidebar;

  /* --------------------------------------------------------------- topbar
     O cabeçalho é o mesmo em todas as páginas e passou a concentrar o que
     serve em qualquer tela: os atalhos da pessoa, a busca no cérebro we (à
     esquerda das notificações, como pedido) e a conta. A faixa de contexto
     com operação e sprint saiu do portal inteiro — quem precisa do nome da
     operação lê no seletor da lateral. */
  function renderTopbar() {
    // Aviso com destinatário é só dele; o resto do portal continua vendo tudo.
    const naoLidas = WB.minhasNotificacoes().filter((n) => !n.lida).length;
    /* Só os primeiros atalhos cabem no cabeçalho sem empurrar a busca; o
       restante continua acessível pela caixa de adicionar/editar. */
    const atalhos = (WB.data.atalhos || []).slice(0, 4);
    const externo = (url) => /^https?:/i.test(String(url || '')) ? ' target="_blank" rel="noopener"' : '';
    document.getElementById('topbar').innerHTML = `
      <button class="btn btn--ghost btn--icon navtoggle" data-nav aria-label="Abrir navegação">${WB.icon('menu')}</button>
      <div class="tbsc" aria-label="Seus atalhos">
        ${atalhos.map((a) => `<a class="tbsc__item" href="${esc(a.url)}"${externo(a.url)} title="${esc(a.nome)}">${WB.icon('link', 14)}<span>${esc(a.nome)}</span></a>`).join('')}
        <button class="tbsc__add" data-acao="atalho" aria-label="Adicionar atalho" title="Adicionar atalho">${WB.icon('mais', 14)}</button>
      </div>
      <span class="tb__spacer"></span>
      ${WB.data.demonstracao ? `<span class="tb__demo" title="Nenhum dado real do Grupo We foi usado nestas telas">${WB.icon('alerta', 12)} Demonstração</span>` : ''}
      <form class="tb__search" data-busca-topo role="search">
        <label class="sr" for="tb-busca">Buscar no cérebro we</label>
        ${WB.icon('busca', 16)}
        <input id="tb-busca" type="search" placeholder="Buscar no cérebro we…" autocomplete="off">
        <button class="sr" type="submit">Buscar</button>
      </form>
      <div class="bell">
        <button class="btn btn--ghost btn--icon" data-sino aria-label="Notificações (${naoLidas} não lidas)">${WB.icon('sino')}</button>
        ${naoLidas ? '<i class="bell__dot" aria-hidden="true"></i>' : ''}
      </div>
      <div>
        <button class="btn btn--ghost" data-conta aria-label="Sua conta" style="gap:8px">
          <span class="av av--sm">${esc(WB.iniciais(WB.eu().nome))}</span>${WB.icon('baixo', 14)}
        </button>
      </div>`;
  }
  WB.renderTopbar = renderTopbar;

  /* --------------------------------------------------- ações compartilhadas
     Um único mapa de ações, usado pelos meus botões e pelo onAction da home. */
  const ACOES = {
    evento: () => WB.abrirEvento(),
    compra: () => WB.abrirCompra(),
    coffe: () => WB.abrirCoffe(),
    coffee: () => WB.abrirCoffe(),
    demanda: (el) => WB.abrirDemanda(el && el.dataset ? { projeto: el.dataset.projeto } : null),
    'nova-demanda': () => WB.abrirDemanda(null),
    lead: () => WB.abrirLead(),
    cliente: () => WB.abrirCliente(),
    projeto: () => WB.abrirProjeto(),
    atalho: () => WB.abrirAtalho(),
    news: () => WB.abrirNews(),
    /* PDI e descritivo de cargo de uma pessoa. Configuração da administração,
       que a pessoa vê como atalho nos indicadores dela. */
    desenvolvimento: (el) => WB.abrirDesenvolvimento(el && el.dataset ? el.dataset.id : null),
    // Ler um comunicado é outra ação: vem com o registro e abre o texto.
    aviso: (el, registro) => WB.lerAviso(registro),
    // Histórico inteiro do News, aberto pelo atalho do Início. Sem rota: foi
    // pedido como atalho da tela inicial e nada mais.
    'news-galeria': () => WB.abrirGaleriaNews()
  };
  // Cadastros da Fase 2 entram no mesmo mapa — um só caminho para toda ação.
  if (WB.fase2 && WB.fase2.acoes) Object.assign(ACOES, WB.fase2.acoes);
  // Os seis cadastros do Administrativo (adm-forms.js) entram no mesmo mapa.
  if (WB.adm && WB.adm.acoes) Object.assign(ACOES, WB.adm.acoes);
  // Comercial (lead, cliente, assumir lead) também.
  if (WB.comercial && WB.comercial.acoes) Object.assign(ACOES, WB.comercial.acoes);
  WB.acoes = ACOES;

  /* -------------------------------------------------------------- módulos
     Os módulos do Codex substituem as minhas telas quando estão carregados:
     `WB.home` cobre a rota inicial e `WB.workspace` cobre demandas e projetos.
     Sem o arquivo do módulo, as minhas telas continuam valendo.
     Solicitações saiu do módulo em 22/09/2026: virou o Histórico de
     solicitações, com abas por tipo, detalhe completo, edição com
     confirmação e lixeira (pedidos-views.js). */
  const MODULOS = {
    'home': { nome: 'home' },
    'demandas': { nome: 'workspace', pagina: 'demandas' },
    // O catálogo usa a ficha completa e os filtros de codex-projects-views.js.
  };

  let modulo = null; // { nome, pagina, api }

  const temModulo = (nome) => !!(WB[nome] && typeof WB[nome].mount === 'function');

  function desmontarModulo() {
    if (!modulo) return;
    try { modulo.api.destroy(); } catch (e) { /* já desmontado */ }
    modulo = null;
  }

  function atualizarModulo() {
    if (!modulo) return;
    const o = modulo.nome === 'home' ? contextoHome() : { data: WB.data, demo: !!WB.data.demonstracao };
    if (modulo.pagina) o.page = modulo.pagina;
    modulo.api.update(o);
  }

  /* O que o Início precisa saber de quem está logado (22/09/2026): quem
     escolhe o destaque, quem publica e apaga news, quais políticas estão
     fixadas e quais agendas a pessoa escondeu. É recalculado a cada
     atualização, porque dá para trocar de usuário no protótipo. */
  const chaveAgendas = () => 'home.agendasOcultas.' + WB.data.usuarioAtual;
  function contextoHome() {
    return {
      data: WB.data,
      demo: !!WB.data.demonstracao,
      politicas: WB.politicasDestaque ? WB.politicasDestaque() : null,
      agendasOcultas: WB.store.get(chaveAgendas(), []),
      conta: WB.eu().email || '',
      permissoes: {
        destaque: WB.pode('destaque'),
        publicarNews: WB.pode('news'),
        todasNews: WB.pode('gerirNews'),
        apagarNews: (n) => !!(WB.podeApagarNews && WB.podeApagarNews(n))
      }
    };
  }

  /* Tela inicial do Codex. */
  function opcoesHome() {
    return Object.assign(contextoHome(), {
      onAction(acao, registro) {
        if (acao === 'demanda' && registro && registro.id) return WB.views.popupDemanda(registro.id);
        if (acao === 'aviso') return WB.lerAviso(registro);
        if (acao === 'politicas-destaque') return WB.editarPoliticasDestaque();
        if (acao === 'news-apagar') return WB.apagarNews(registro);
        if (acao === 'news-fixar') return WB.fixarNews(registro);
        // A escolha de agendas é da pessoa: fica gravada só para ela.
        if (acao === 'agendas') return WB.store.set(chaveAgendas(), Array.isArray(registro) ? registro : []);
        const h = ACOES[acao];
        if (h) return h(null, registro);
        WB.toast('Esta ação ainda não está ligada a um formulário.', 'erro');
      }
    });
  }

  /* Demandas, projetos e solicitações do Codex.
     O módulo trabalha sobre uma cópia dos dados e só confirma a alteração
     depois que estes callbacks resolvem — a gravação é minha.

     22/09/2026: além de gravar, estes callbacks aplicam as regras que a base
     passou a ter — quem pode mexer em quê, a data de fechamento e o aviso a
     quem abriu a demanda. O módulo desenha; a regra mora aqui. */
  function opcoesWorkspace(pagina) {
    const guardadas = WB.store.get('demandas.prefs', {}) || {};
    return {
      data: WB.data,
      page: pagina,
      onOpenProject(id) { location.hash = '#/projeto/' + encodeURIComponent(id) + '/briefing'; },
      demo: !!WB.data.demonstracao,

      /* Formato de tela escolhido pela pessoa (visão, agrupamento, ordem,
         colunas, período). Sai daqui e volta por `onPrefs`: é o que faz a aba
         voltar do jeito que ela deixou. */
      prefs: guardadas,
      onPrefs(prefs) { WB.store.set('demandas.prefs', prefs); },

      /* Entregável e marco são linha de cronograma: mudam por decisão da
         administração. Tarefa e subtarefa são de quem executa. A regra e o
         motivo vêm de `data.js`, para a tela só precisar exibir. */
      permissao(demanda) { return WB.podeEditarDemanda(demanda); },

      onUpdate(o) {
        if (WB.pm) { const result = WB.pm.updateTask(o.ids, o.changes); renderSidebar(); return result; }
        const ids = o.ids;
        const hoje = WB.d(0);
        WB.data.demandas = WB.data.demandas.map((d) => {
          if (ids.indexOf(d.id) < 0) return d;
          const nova = Object.assign({}, d, o.changes);
          // Fechou: guarda a data. Reabriu: a data sai, senão a pontualidade
          // passaria a contar uma entrega que voltou a ser trabalho.
          if (WB.demandaFechada(nova) && !nova.concluidaEm) nova.concluidaEm = hoje;
          if (!WB.demandaFechada(nova)) delete nova.concluidaEm;
          WB.avisarCriador(nova, 'alterou', Object.keys(o.changes).map((k) => ROTULO_CAMPO[k] || k).join(', '));
          return nova;
        });
        WB.store.set('demandas', WB.data.demandas);
        renderSidebar(); // os contadores da barra lateral saem do mesmo dado
      },

      onCreate(v) {
        if (WB.pm) { const nova = WB.pm.createTask(v); renderSidebar(); return nova; }
        const nova = {
          id: 'dm' + Date.now().toString(36),
          nome: v.nome,
          projeto: v.projeto,
          tipo: v.tipo || 'tarefa',
          responsavel: v.responsavel,
          // Quem abriu a demanda: é esta pessoa que o portal avisa depois.
          criador: WB.data.usuarioAtual,
          pai: v.pai || undefined,
          inicio: v.inicio || undefined,
          prazo: v.prazo,
          prioridade: v.prioridade || 'media',
          status: 'afazer',
          sprint: (WB.sprintAtual() || {}).id,
          descricao: v.descricao || '',
          comentarios: [],
          anexos: [],
          extras: []
        };
        WB.data.demandas.unshift(nova);
        WB.store.push('demandas', nova);
        // Demanda aberta para outra pessoa avisa quem vai executá-la.
        if (nova.responsavel !== WB.data.usuarioAtual) {
          WB.notificar(nova.responsavel, WB.eu().nome + ' atribuiu a você "' + nova.nome + '".', '#/demandas');
        }
        renderSidebar();
        return nova;
      },

      /* Apagar é do responsável pela regra (`podeEditarDemanda`) e avisa quem
         abriu a demanda — a não ser que seja a própria pessoa apagando. Os
         subitens perdem o vínculo em vez de sumirem junto: apagar em cascata
         levaria embora trabalho de outras pessoas sem elas saberem. */
      onDelete(id) {
        if (WB.pm) { const ok=WB.pm.deleteTask(id); renderSidebar(); return ok; }
        const d = WB.data.demandas.find((x) => x.id === id);
        if (!d) return false;
        if (!WB.podeEditarDemanda(d).pode) return false;
        WB.avisarCriador(d, 'apagou');
        WB.data.demandas = WB.data.demandas.filter((x) => x.id !== id)
          .map((x) => (x.pai === id ? Object.assign({}, x, { pai: undefined }) : x));
        WB.store.set('demandas', WB.data.demandas);
        renderSidebar();
        WB.toast('Demanda apagada.');
        return true;
      },

      /* Chat interno da demanda. Comentar não é editar: qualquer pessoa com
         acesso à tela pode falar, inclusive quem não pode mexer no prazo. */
      onComment(id, texto) {
        const d = WB.data.demandas.find((x) => x.id === id);
        if (!d) return false;
        const registro = {
          id: 'cm' + Date.now().toString(36),
          autor: WB.data.usuarioAtual,
          texto: String(texto || '').trim().slice(0, 1000),
          data: new Date().toISOString()
        };
        if (!registro.texto) return false;
        d.comentarios = (d.comentarios || []).concat(registro);
        WB.store.set('demandas', WB.data.demandas);
        WB.avisarCriador(d, 'comentou em');
        if (d.responsavel !== WB.data.usuarioAtual && d.responsavel !== d.criador) {
          WB.notificar(d.responsavel, WB.eu().nome + ' comentou em "' + d.nome + '".', '#/demandas');
        }
        return registro;
      },

      /* Anexo de referência. Sem servidor de arquivos, o portal guarda nome,
         tamanho, autor e data — e diz isso na tela. Guardar o conteúdo em
         localStorage estouraria a cota no primeiro PDF. */
      onAttach(id, arquivo) {
        const d = WB.data.demandas.find((x) => x.id === id);
        if (!d || !arquivo || !arquivo.nome) return false;
        const registro = {
          id: 'an' + Date.now().toString(36),
          nome: String(arquivo.nome).slice(0, 180),
          tamanho: Number(arquivo.tamanho) || 0,
          autor: WB.data.usuarioAtual,
          data: new Date().toISOString()
        };
        d.anexos = (d.anexos || []).concat(registro);
        WB.store.set('demandas', WB.data.demandas);
        WB.avisarCriador(d, 'anexou uma referência em');
        return registro;
      },

      // Os pedidos abrem os meus formulários reais, pelo mesmo mapa de ações.
      onRequest(tipo) {
        const h = ACOES[tipo];
        if (h) return h(null);
        WB.toast('Esta solicitação ainda não está ligada a um formulário.', 'erro');
      },

      /* Editar uma solicitação já registrada. O protótipo guarda título e
         resumo; situação e número são do fluxo de aprovação, que ainda não
         existe — então a tela deixa editar só o que ela de fato controla, e
         apenas pedidos da própria pessoa. */
      onEditRequest(id, valores) {
        const s = WB.data.solicitacoes.find((x) => x.id === id);
        if (!s || s.solicitante !== WB.data.usuarioAtual) return false;
        s.titulo = valores.titulo;
        s.resumo = valores.resumo;
        WB.store.set('solicitacoes', WB.data.solicitacoes);
        WB.toast('Solicitação atualizada.');
        return true;
      },

      // O módulo troca de página por conta própria (ex.: "Abrir demandas" de um
      // projeto). O endereço acompanha, para o link continuar descrevendo a tela.
      onPageChange(nova) {
        if (modulo) modulo.pagina = nova;
        if (location.hash !== '#/' + nova) location.hash = '#/' + nova;
      }
    };
  }
  // Nome dos campos no aviso: "alterou a demanda X — prazo, responsável".
  const ROTULO_CAMPO = { status: 'situação', responsavel: 'responsável', prioridade: 'prioridade', prazo: 'prazo', inicio: 'início', nome: 'nome', descricao: 'descrição', tipo: 'tipo' };

  function montarModulo(escolha, alvo) {
    // Mesmo módulo, outra página: atualizo em vez de remontar, para não perder
    // filtros, seleção nem rolagem.
    if (modulo && modulo.nome === escolha.nome) {
      modulo.pagina = escolha.pagina;
      atualizarModulo();
      return;
    }
    desmontarModulo();
    alvo.innerHTML = '';
    modulo = {
      nome: escolha.nome,
      pagina: escolha.pagina,
      api: escolha.nome === 'workspace'
        ? WB.workspace.mount(alvo, opcoesWorkspace(escolha.pagina))
        : WB.home.mount(alvo, opcoesHome())
    };
  }

  /* ------------------------------------------------------------- roteador */
  function render() {
    const bruto = location.hash.replace(/^#\/?/, '');
    const partes = WB.routeSegments(bruto);
    const raiz = partes.shift() || 'home';
    const alvo = document.getElementById('conteudo');

    /* A agenda deixou de ser uma tela própria: ela existe dentro do Início.
       Endereços antigos continuam funcionando — levam para lá. */
    if (raiz === 'agenda') { location.hash = '#/home'; return; }

    const escolha = MODULOS[raiz];
    const usaModulo = !!escolha && temModulo(escolha.nome);

    renderSidebar();

    /* Rota de outra operação: recusa em vez de renderizar. Vale para quem
       digita o endereço ou volta por um link antigo. */
    if (WB.podeVerRota && !WB.podeVerRota(raiz, partes)) {
      desmontarModulo();
      alvo.className = 'page';
      alvo.innerHTML = WB.telaSemAcesso(raiz, partes);
      ligarConteudo(alvo);
      window.scrollTo(0, 0);
      document.title = 'WeBrain — sem acesso';
      return;
    }

    const fn = ROTAS[raiz];
    if (!fn) {
      desmontarModulo();
      alvo.className = 'page';
      alvo.innerHTML = WB.vazio('Página não encontrada',
        'O endereço não corresponde a nenhuma seção do portal.',
        '<a class="btn btn--primary" href="#/home">Ir para o início</a>');
      return;
    }

    if (usaModulo) {
      alvo.className = 'page page--modulo';
      montarModulo(escolha, alvo);
    } else {
      desmontarModulo();
      alvo.className = 'page';
      alvo.innerHTML = fn(partes) || WB.views.home();
      WB.ligarGraficos(alvo);
      WB.ligarTabelas(alvo);
      ligarConteudo(alvo);
    }

    document.body.classList.remove('nav-open');
    window.scrollTo(0, 0);
    document.title = 'WeBrain — ' + (document.querySelector('h1') ? document.querySelector('h1').textContent : 'Cérebro We');
  }

  WB.rerender = function () {
    if (modulo) atualizarModulo();
    else render();
    renderSidebar();
    // Os atalhos moram no cabeçalho: adicionar um precisa aparecer na hora.
    renderTopbar();
  };

  /* --------------------------------------------------- eventos do conteúdo */
  function ligarConteudo(root) {
    root.querySelectorAll('[data-rota-filtro]').forEach(s=>s.addEventListener('change',()=>{
      location.hash='#/'+s.dataset.rotaFiltro+(s.value?'/'+encodeURIComponent(s.value):'');
    }));
    // Ações (botões data-acao) — o mesmo mapa da home.
    root.querySelectorAll('[data-acao]').forEach((b) => {
      b.addEventListener('click', () => {
        const h = ACOES[b.dataset.acao];
        if (h) h(b);
      });
    });

    // Abrir detalhe da demanda sem perder os filtros: é um popup, não outra rota.
    root.querySelectorAll('[data-demanda]').forEach((b) =>
      b.addEventListener('click', () => WB.views.popupDemanda(b.dataset.demanda)));

    // Kanban acessível: mover por botão, sem depender de arrastar.
    const ORDEM = Object.keys(WB.STATUS_DEMANDA);
    root.querySelectorAll('[data-mover]').forEach((b) =>
      b.addEventListener('click', () => {
        const d = WB.data.demandas.find((x) => x.id === b.dataset.mover);
        if (!d) return;
        const i = ORDEM.indexOf(d.status) + Number(b.dataset.dir);
        if (i < 0 || i >= ORDEM.length) return;
        d.status = ORDEM[i];
        // Fechar a demanda registra a data: é ela que permite dizer, depois,
        // se a entrega saiu no prazo. E quem abriu a demanda fica sabendo.
        if (WB.demandaFechada(d) && !d.concluidaEm) d.concluidaEm = WB.d(0);
        WB.avisarCriador(d, 'moveu', WB.STATUS_DEMANDA[ORDEM[i]]);
        WB.toast('"' + d.nome + '" agora está em ' + WB.STATUS_DEMANDA[ORDEM[i]] + '.');
        render();
      }));

    // Alternadores de formato/período da home própria e da tela de demandas.
    root.querySelectorAll('[data-modo]').forEach((b) =>
      b.addEventListener('click', () => {
        const chave = root.querySelector('[data-filtros]') ? 'demandas.modo' : 'home.modo';
        WB.store.set(chave, b.dataset.modo);
        render();
      }));
    root.querySelectorAll('[data-janela]').forEach((b) =>
      b.addEventListener('click', () => { WB.store.set('home.janela', b.dataset.janela); render(); }));

    /* Período da aba de indicadores individuais. Fica guardado: quem olha o
       mês não quer reescolher o mês toda vez que volta. */
    root.querySelectorAll('[data-periodo-ind]').forEach((b) =>
      b.addEventListener('click', () => { WB.store.set('indicadores.periodo', b.dataset.periodoInd); render(); }));

    /* Período do histórico de solicitações — mesma ideia, outra tela. */
    root.querySelectorAll('[data-periodo-pedido]').forEach((b) =>
      b.addEventListener('click', () => { WB.store.set('solicitacoes.periodo', b.dataset.periodoPedido); render(); }));

    // Filtros persistem entre navegações e ao fechar um detalhe.
    root.querySelectorAll('[data-f]').forEach((s) =>
      s.addEventListener('change', () => {
        const f = WB.store.get('filtros.demandas', {});
        f[s.dataset.f] = s.value;
        WB.store.set('filtros.demandas', f);
        render();
      }));

    // Preferências
    root.querySelectorAll('[data-tema] input').forEach((r) =>
      r.addEventListener('change', () => aplicarTema(r.value)));
    const troca = root.querySelector('[data-trocar-usuario]');
    if (troca) troca.addEventListener('change', () => {
      WB.data.usuarioAtual = troca.value;
      WB.store.set('usuario', troca.value);
      WB.toast('Agora você está vendo o portal como ' + WB.eu().nome + '.');
      render();
    });
  }

  /* ------------------------------------------------------------------ tema */
  const PREFERE_ESCURO = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  /* O módulo da tela inicial só reconhece data-theme. Então "seguir o sistema"
     é resolvido aqui para claro/escuro explícito — os dois sistemas de estilo
     leem a mesma fonte e nunca aparecem em temas diferentes. */
  function aplicarTema(t) {
    WB.store.set('tema', t);
    const efetivo = t === 'auto' ? (PREFERE_ESCURO && PREFERE_ESCURO.matches ? 'dark' : 'light') : t;
    document.documentElement.setAttribute('data-theme', efetivo);
  }
  if (PREFERE_ESCURO) {
    const aoMudar = () => { if (WB.store.get('tema', 'auto') === 'auto') aplicarTema('auto'); };
    if (PREFERE_ESCURO.addEventListener) PREFERE_ESCURO.addEventListener('change', aoMudar);
    else if (PREFERE_ESCURO.addListener) PREFERE_ESCURO.addListener(aoMudar);
  }

  /* --------------------------------------------------------- casca global */
  function ligarCasca() {
    const tb = document.getElementById('topbar');

    document.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-nav]');
      if (nav) { document.body.classList.toggle('nav-open'); return; }

      const sino = e.target.closest('[data-sino]');
      if (sino) {
        WB.togglePopover(sino.closest('.bell'), `
          <div class="pv__head"><strong>Notificações</strong></div>
          ${WB.minhasNotificacoes().map((n) => `<a class="nt ${n.lida ? 'nt--lida' : ''}" href="${esc(n.rota)}">
            <i class="nt__dot"></i><span>${esc(n.texto)}<br><span class="muted">${WB.fmtDataCurta(n.data)}</span></span>
          </a>`).join('')}`);
        return;
      }

      const conta = e.target.closest('[data-conta]');
      if (conta) {
        const eu = WB.eu();
        const tema = WB.store.get('tema', 'auto');
        const pv = WB.togglePopover(conta.parentElement, `
          <div class="pv__head">
            <span class="av">${esc(WB.iniciais(eu.nome))}</span>
            <span><strong style="display:block;font-size:14px">${esc(eu.nome)}</strong>
              <span class="muted" style="font-size:12px">${esc(eu.funcao)}</span></span>
          </div>
          <a class="pv__item" href="#/perfil">${WB.icon('pessoa')} Meu perfil</a>
          <a class="pv__item" href="#/solicitacoes">${WB.icon('lista')} Histórico de solicitações</a>
          ${WB.pode('news')
            ? `<button class="pv__item" data-pv="news">${WB.icon('mais')} Publicar news</button>` : ''}
          <div class="pv__sep"></div>
          <div class="pv__label">Tema</div>
          <button class="pv__item" data-pv="tema:auto">${WB.icon('engrenagem')} Seguir o sistema${tema === 'auto' ? ' ✓' : ''}</button>
          <button class="pv__item" data-pv="tema:light">${WB.icon('estrela')} Claro${tema === 'light' ? ' ✓' : ''}</button>
          <button class="pv__item" data-pv="tema:dark">${WB.icon('lua')} Escuro${tema === 'dark' ? ' ✓' : ''}</button>
          <div class="pv__sep"></div>
          <button class="pv__item" data-pv="sair">${WB.icon('sair')} Sair</button>`);

        if (!pv) return;
        pv.addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-pv]');
          if (!b) return;
          const v = b.dataset.pv;
          WB.fecharPopover();
          if (v === 'news') return WB.abrirNews();
          if (v === 'sair') return WB.toast('Sair depende da autenticação, que ainda não está conectada.', 'erro');
          if (v.indexOf('tema:') === 0) aplicarTema(v.split(':')[1]);
        });
      }
    });

    /* Busca do cabeçalho: o termo vai para a rota, então o link é
       compartilhável. O cabeçalho não é redesenhado inteiro a cada rota — o
       elemento continua o mesmo — então o ouvinte fica aqui, uma vez só. */
    tb.addEventListener('submit', (e) => {
      if (!e.target.closest('[data-busca-topo]')) return;
      e.preventDefault();
      const campo = document.getElementById('tb-busca');
      const q = campo ? campo.value.trim() : '';
      if (q) location.hash = '#/busca/' + encodeURIComponent(q);
    });

    /* O "+" dos atalhos é do cabeçalho, não do conteúdo: `ligarConteudo` liga
       os `data-acao` de dentro da página, e aqui só os de dentro do topo — sem
       isso o mesmo clique dispararia duas vezes. */
    tb.addEventListener('click', (e) => {
      const b = e.target.closest('[data-acao]');
      if (!b) return;
      const h = ACOES[b.dataset.acao];
      if (h) h(b);
    });

    // Atalho: "/" foca a busca, como em ferramentas de trabalho.
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        e.preventDefault();
        const i = document.getElementById('tb-busca');
        if (i) i.focus();
      }
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
        document.body.classList.remove('nav-open');
        document.querySelector('[data-nav]')?.focus();
      }
    });

    document.addEventListener('click', (e) => {
      if(e.target.closest('.sb a[href]')) document.body.classList.remove('nav-open');
      if (document.body.classList.contains('nav-open') && !e.target.closest('.sb') && !e.target.closest('[data-nav]')) {
        document.body.classList.remove('nav-open');
      }
    });
  }

  /* ------------------------------------------------------------------ boot */
  function iniciar() {
    aplicarTema(WB.store.get('tema', 'auto'));
    /* Antes de desenhar qualquer coisa: traz de volta o que foi cadastrado em
       sessões anteriores. Sem isto, tudo que a pessoa criava sumia no F5. */
    if (WB.fase2 && WB.fase2.carregar) WB.fase2.carregar();
    if (WB.pm) WB.pm.load();
    // PDI e descritivo de cargo cadastrados pela administração sobrevivem ao F5.
    if (WB.desenvolvimento) WB.desenvolvimento.carregar();
    // Pedidos, news e destaque do Início: o estado gravado vence a semente,
    // inclusive o que foi apagado ou editado (pedidos.js).
    if (WB.pedidos && WB.pedidos.carregar) WB.pedidos.carregar();
    /* Comercial POR ÚLTIMO entre as cargas: ele migra os registros de clientes
       para o formato novo (etapa de lead separada de situação de cliente, quem
       trouxe separado de quem atende), e precisa que o que estava gravado já
       tenha voltado — inclusive o que a Fase 2 relê. */
    if (WB.comercial && WB.comercial.carregar) WB.comercial.carregar();
    const salvo = WB.store.get('usuario', null);
    if (salvo && WB.data.pessoas.some((p) => p.id === salvo)) WB.data.usuarioAtual = salvo;

    renderTopbar();
    ligarCasca();
    if (!location.hash) location.hash = '#/home';
    render();
    window.addEventListener('hashchange', render);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
