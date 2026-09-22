/* WeBrain — operações.
   ---------------------------------------------------------------------------
   O portal não é um lugar só com tudo dentro: cada operação do grupo tem o
   próprio conjunto de destinos, e quem trabalha no restaurante abre o WeBrain e
   vê o restaurante. Este arquivo é o dono dessa divisão — quais operações
   existem, o que cada uma tem, quem enxerga o quê e a qual operação uma rota
   pertence.

   REGRA DE ALCANCE (decisão do usuário, 21/09/2026):
   · conta de operação enxerga a própria operação e mais nada;
   · `admin` e `diretoria` enxergam todas, mais a visão Grupo We, e trocam de
     operação pelo seletor no topo da barra lateral.

   BASE COMUM, fora de qualquer operação: Início, Minhas demandas, Minhas
   solicitações e Meus indicadores individuais. São as telas que falam do
   trabalho da pessoa, não da empresa. A agenda saiu da base: ela existe só
   dentro do Início (decisão do usuário, 21/09/2026). Todo o resto —
   dashboards, governança, recursos, administrativo — passou a viver dentro de
   uma operação.

   ISTO É RECORTE DE INTERFACE, NÃO AUTORIZAÇÃO. O protótipo roda por `file://`
   e todo o conteúdo está no disco de quem abre. Esconder um destino aqui
   organiza a navegação; não protege dado. Autorização de verdade depende de
   sessão e de servidor, que ainda não existem.
   ========================================================================== */
(function () {
  const WB = (window.WB = window.WB || {});

  const link = (rota, nome, contador) => ({ rota, nome, contador });
  const ramo = (id, nome, itens) => ({ id, nome, itens });
  const idRota = (id) => encodeURIComponent(id);

  /* ATALHO DO ERP (pedido do usuário, 22/09/2026): o item do Omie na lateral
     não é para abrir uma tela do portal, é para abrir o ERP. Com o endereço
     cadastrado (tela #/erp), ele vira link externo e abre em outra aba; sem
     endereço, continua levando para a tela, que é onde se cadastra. Ler a
     cada montagem é de propósito: salvar o link redesenha a lateral e o
     atalho muda na hora. */
  const linkOmie = () => {
    const url = (WB.adm && WB.adm.omie) ? WB.adm.omie() : '';
    return url ? { nome: 'ERP — Omie', externo: url } : link('erp', 'ERP — Omie');
  };

  /* -------------------------------------------------------- base comum */
  /* "Minhas solicitações" virou "Histórico de solicitações", e quem aprova
     pedidos — ou administra — ganha "Solicitações a aprovar", com a contagem
     do que está em análise (pedido do usuário, 22/09/2026). */
  WB.navBase = () => [
    link('home', 'Início'),
    link('demandas', 'Minhas demandas', 'demandas'),
    link('solicitacoes', 'Histórico de solicitações'),
    ...(WB.pedidos && WB.pedidos.temAprovacao(WB.data.usuarioAtual) ? [link('aprovacoes', 'Solicitações a aprovar', 'aprovar')] : []),
    link('indicadores', 'Meus indicadores individuais')
  ];

  /* --------------------------------------------------------- operações
     `itens()` devolve os ramos da barra lateral. `inicio` é para onde a troca
     de operação leva quando a rota atual não pertence à nova operação. */
  const OPERACOES = {
    grupo: {
      id: 'grupo',
      nome: 'Grupo We',
      resumo: 'Visão consolidada das quatro operações.',
      inicio: 'dash/grupo',
      somentePapeis: ['admin', 'diretoria'],
      itens: () => [
        ramo('grupo-dash', 'Dashboards', [
          link('dash/grupo', 'Grupo We'),
          link('dash/clientes', 'Perfil de clientes'),
          ramo('grupo-performance', 'Performance das equipes', [
            link('dash/performance', 'Todas as empresas'),
            ...WB.data.empresas.map((e) => link('dash/performance/' + idRota(e.id), e.nome))
          ])
        ]),
        ramo('grupo-trabalho', 'Demandas e projetos', [
          link('projetos', 'Todos os projetos'),
          link('projetos-arquivados', 'Arquivados / concluídos'),
          link('cronograma', 'Cronograma geral'),
          ramo('grupo-controle', 'Painel de controle', [
            link('painel-controle/dashboard', 'Dashboard'),
            link('painel-controle/reports', 'Status reports'),
            link('painel-controle/decisoes', 'Log geral de decisões'),
            link('painel-controle/riscos', 'Riscos e incidentes')
          ])
        ]),
        ramo('grupo-governanca', 'Governança do grupo', [
          link('governanca/metas', 'Metas'),
          link('governanca/politicas', 'Cultura e políticas'),
          link('governanca/processos', 'Processos e procedimentos'),
          link('governanca/treinamentos', 'Treinamentos e conhecimentos')
        ]),
        ramo('grupo-recursos', 'Recursos', [
          link('atas', 'Atas de reunião'),
          link('leads', 'Leads'),
          link('clientes', 'Clientes'),
          link('id-visual', 'Identidade visual'),
          link('galeria', 'Galeria'),
          link('links', 'Principais links')
        ]),
        ramo('grupo-adm', 'Administrativo', [
          linkOmie(),
          link('contratos', 'Contratos'),
          link('colaboradores', 'Colaboradores'),
          link('fornecedores', 'Fornecedores e parceiros'),
          link('patrocinadores', 'Patrocinadores'),
          link('bens', 'Bens adquiridos'),
          link('cnpjs', 'CNPJs')
        ])
      ]
    },

    weinc: {
      id: 'weinc',
      nome: 'We Incorporadora',
      resumo: 'Lançamentos, obra e rede credenciada.',
      inicio: 'dash/incorporadora',
      itens: () => [
        ramo('dashboards', 'Dashboards', [
          ramo('incorporadora', 'We Incorporadora', [
            link('dash/incorporadora', 'Visão geral'),
            link('dash/incorporadora/bioma', 'Bioma'),
            link('dash/incorporadora/vicente', 'Vicente by We')
          ]),
          link('dash/clientes', 'Perfil de clientes'),
          link('dash/performance/weinc', 'Performance da equipe')
        ]),
        ramo('trabalho', 'Demandas e projetos', [
          ramo('ativos', 'Ativos', [
            link('projetos', 'Todos os projetos'),
            ...WB.data.projetos.filter((p) => p.empresa === 'weinc' && p.status !== 'concluido' && p.status !== 'arquivado')
              .map((p) => link('projeto/' + idRota(p.id), p.nome))
          ]),
          ramo('arquivados', 'Arquivados / Concluídos', [
            link('projetos-arquivados', 'Todos os arquivados'),
            ...(WB.data.projetosArquivados || []).filter((p) => p.empresa === 'weinc')
              .map((p) => link('projetos-arquivados/' + idRota(p.id), p.nome))
          ]),
          link('cronograma', 'Cronograma geral'),
          ramo('controle', 'Painel de controle', [
            link('painel-controle/dashboard', 'Dashboard'),
            link('painel-controle/reports', 'Status reports'),
            link('painel-controle/decisoes', 'Log geral de decisões'),
            link('painel-controle/riscos', 'Riscos e incidentes')
          ])
        ]),
        ramo('governanca', 'Governança We Inc', [
          link('governanca/metas/weinc', 'Metas We Inc'),
          link('governanca/politicas/weinc', 'Cultura e políticas'),
          link('governanca/processos/weinc', 'Processos e procedimentos'),
          link('governanca/treinamentos/weinc', 'Treinamentos e conhecimentos')
        ]),
        ramo('Recursos', 'Recursos', [
          link('atas', 'Atas de reunião'),
          link('leads/weinc', 'Leads'),
          link('clientes/weinc', 'Clientes'),
          link('id-visual', 'Identidade visual'),
          link('galeria', 'Galeria'),
          link('links', 'Principais links')
        ]),
        ramo('Comercial', 'Comercial', [
          link('crm', 'CRM'),
          link('agentes', 'Agentes digitais'),
          link('corretores', 'Corretores e imobiliárias')
        ]),
        ramo('Administrativo', 'Administrativo', [
          linkOmie(),
          link('contratos', 'Contratos'),
          link('colaboradores', 'Colaboradores'),
          link('fornecedores', 'Fornecedores e parceiros'),
          link('patrocinadores', 'Patrocinadores'),
          link('bens', 'Bens adquiridos'),
          link('cnpjs', 'CNPJs')
        ])
      ]
    },

    casawe: {
      id: 'casawe',
      nome: 'CasaWE',
      resumo: 'Operação sem portal desenhado nas fotos.',
      inicio: 'home',
      /* Nenhuma das fotos de esboço traz o menu da CasaWE. Em vez de copiar o
         de outra operação, a árvore fica no que já existe com recorte por
         empresa, e a própria tela inicial diz que falta desenhar esta. */
      semDesenho: true,
      itens: () => [
        ramo('casawe-dash', 'Dashboards', [link('dash/performance/casawe', 'Performance da equipe')]),
        ramo('casawe-trabalho', 'Demandas e projetos', [
          link('projetos', 'Projetos'),
          link('cronograma', 'Cronograma geral')
        ]),
        ramo('casawe-recursos', 'Recursos', [
          link('atas', 'Atas de reunião'),
          link('leads/casawe', 'Leads'),
          link('clientes/casawe', 'Clientes'),
          link('id-visual', 'Identidade visual'),
          link('galeria', 'Galeria'),
          link('links', 'Principais links')
        ]),
        ramo('casawe-adm', 'Administrativo', [
          link('colaboradores', 'Colaboradores'),
          link('fornecedores', 'Fornecedores e parceiros'),
          link('bens', 'Bens adquiridos'),
          link('cnpjs', 'CNPJs')
        ])
      ]
    }
  };

  /* As duas operações da Fase 2 trazem a própria árvore. Sem os arquivos da
     Fase 2 carregados, elas simplesmente não existem no seletor. */
  if (WB.fase2 && WB.fase2.operacoes) {
    Object.keys(WB.fase2.operacoes).forEach((id) => {
      OPERACOES[id] = WB.fase2.operacoes[id];
    });
  }

  WB.operacoes = OPERACOES;
  WB.operacao = (id) => OPERACOES[id] || null;

  /* ------------------------------------------------------------- alcance */
  const VE_TUDO = ['admin', 'diretoria'];
  WB.veTodasOperacoes = (papel) => VE_TUDO.indexOf(papel || WB.eu().papel) >= 0;

  /** Ids das operações que a pessoa logada enxerga, na ordem do seletor. */
  WB.operacoesVisiveis = function () {
    const eu = WB.eu();
    if (WB.veTodasOperacoes(eu.papel)) {
      const ordem = ['grupo', 'weinc', 'weinvest', 'nos', 'casawe'];
      return ordem.filter((id) => OPERACOES[id]);
    }
    // Conta de operação: só a própria. Papel sem empresa conhecida não vê
    // nenhuma operação — e a tela diz isso em vez de abrir a de outra pessoa.
    return OPERACOES[eu.empresa] ? [eu.empresa] : [];
  };

  /** Operação em foco. Só devolve algo que a pessoa possa ver. */
  WB.operacaoAtual = function () {
    const visiveis = WB.operacoesVisiveis();
    if (!visiveis.length) return null;
    const guardada = WB.store.get('operacao.' + WB.eu().id, '');
    if (guardada && visiveis.indexOf(guardada) >= 0) return guardada;
    /* Padrão: a operação da própria pessoa, inclusive para quem vê todas —
       um admin da We Incorporadora abre no portal da We Incorporadora e vai ao
       Grupo We quando quiser, não ao contrário. */
    const eu = WB.eu();
    if (visiveis.indexOf(eu.empresa) >= 0) return eu.empresa;
    return visiveis[0];
  };

  WB.definirOperacao = function (id) {
    if (WB.operacoesVisiveis().indexOf(id) < 0) return false;
    WB.store.set('operacao.' + WB.eu().id, id);
    return true;
  };

  /* -------------------------------------------------- rota × operação
     Só as rotas que pertencem claramente a uma operação são declaradas aqui.
     As telas compartilhadas (projetos, atas, ERP, bens…) devolvem `null`:
     elas existem em mais de uma operação e não fazem sentido bloquear. */
  WB.operacaoDaRota = function (raiz, partes) {
    const p = partes || [];
    if (WB.fase2 && WB.fase2.operacaoDaRota) {
      const f2 = WB.fase2.operacaoDaRota(raiz, p);
      if (f2) return f2;
    }
    if (raiz === 'dash') {
      if (p[0] === 'grupo') return 'grupo';
      if (p[0] === 'incorporadora') return 'weinc';
    }
    if (raiz === 'painel-adm') return 'grupo';
    return null;
  };

  /** A pessoa pode abrir esta rota? Rota compartilhada: sempre sim. */
  WB.podeVerRota = function (raiz, partes) {
    const dona = WB.operacaoDaRota(raiz, partes);
    if (!dona) return true;
    return WB.operacoesVisiveis().indexOf(dona) >= 0;
  };

  /** Tela de recusa. Diz o motivo e não finge que houve bloqueio de servidor. */
  WB.telaSemAcesso = function (raiz, partes) {
    const dona = WB.operacao(WB.operacaoDaRota(raiz, partes));
    const minha = WB.operacao(WB.operacaoAtual());
    return WB.vazio(
      'Esta tela é de outra operação',
      'Ela pertence a ' + ((dona && dona.nome) || 'outra operação') + ', e o seu acesso é ' +
      ((minha && minha.nome) || 'de outra operação') + '. Se você precisa acompanhar as duas, ' +
      'peça a inclusão à Operações — é permissão de conta, não configuração desta tela. ' +
      'Neste protótipo o recorte é de interface: ele organiza a navegação, mas não é autorização de servidor.',
      '<a class="btn btn--primary" href="#/home">Ir para o início</a>');
  };
})();
