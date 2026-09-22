/* WeBrain — base de dados de demonstração
   Tudo aqui é conteúdo de exemplo. Substituir pelas fontes reais na integração. */
(function () {
  const WB = (window.WB = window.WB || {});

  const HOJE = new Date();
  HOJE.setHours(0, 0, 0, 0);

  /** Data ISO deslocada em N dias a partir de hoje. */
  function d(offset) {
    const x = new Date(HOJE);
    x.setDate(x.getDate() + offset);
    return x.toISOString().slice(0, 10);
  }
  /** Momento ISO deslocado em N horas a partir de agora — para o selo de 24 h. */
  function dh(horas) {
    const x = new Date();
    x.setHours(x.getHours() + horas);
    return x.toISOString();
  }

  WB.hoje = HOJE;
  WB.d = d;
  WB.dh = dh;

  const EMPRESAS = [
    { id: 'weinc', nome: 'We Incorporadora', curto: 'We Inc', serie: 's1' },
    { id: 'weinvest', nome: 'WeInvest', curto: 'WeInvest', serie: 's2' },
    { id: 'nos', nome: 'Nós Gastronomia', curto: 'Nós', serie: 's3' },
    { id: 'casawe', nome: 'CasaWE', curto: 'CasaWE', serie: 's4' }
  ];

  const PESSOAS = [
    { id: 'u1', nome: 'Alex Souza', funcao: 'Head de Marketing', empresa: 'weinc', papel: 'admin', email: 'marketing@weinc.imb.br', setor: 'Marketing' },
    { id: 'u2', nome: 'Cinthia Vantini', funcao: 'Coordenadora de Operações', empresa: 'weinc', papel: 'head', setor: 'Operações' },
    { id: 'u3', nome: 'Douglas Ferraz', funcao: 'Diretor Executivo', empresa: 'weinc', papel: 'diretoria', setor: 'Diretoria' },
    { id: 'u4', nome: 'Rafael Toledo', funcao: 'Head Comercial', empresa: 'weinc', papel: 'head', setor: 'Comercial' },
    { id: 'u5', nome: 'Mariana Klein', funcao: 'Analista Comercial', empresa: 'weinc', papel: 'analista', setor: 'Comercial',
      /* PDI e descritivo de cargo são configurados pela administração, uma
         pessoa por vez, e aparecem como atalho na tela de indicadores dela.
         Sem o registro, a tela diz que ainda não foi definido — não inventa. */
      pdi: { titulo: 'PDI 2026 — Mariana Klein', url: 'https://drive.google.com/pdi-mariana', atualizado: d(-40), autor: 'u4' },
      descritivoCargo: { titulo: 'Descritivo — Analista Comercial', url: 'https://drive.google.com/cargo-analista-comercial', atualizado: d(-120), autor: 'u2' } },
    { id: 'u6', nome: 'Juliana Prado', funcao: 'Gerente de Operações', empresa: 'nos', papel: 'head', setor: 'Operações' },
    { id: 'u7', nome: 'Bruno Sato', funcao: 'Analista Financeiro', empresa: 'weinvest', papel: 'analista', setor: 'Financeiro' },
    { id: 'u8', nome: 'Letícia Amaral', funcao: 'Assistente Administrativo', empresa: 'weinc', papel: 'analista', setor: 'Administrativo' },
    /* Responsável pelos eventos com gastronomia (pedido do usuário, 22/09/2026).
       O sobrenome não foi informado — não inventei um. */
    { id: 'u9', nome: 'Vinícius', funcao: 'Head de Gastronomia', empresa: 'nos', papel: 'head', setor: 'Gastronomia' }
  ];

  const SPRINTS = [
    { id: 's11', nome: 'Sprint 11', inicio: d(-21), fim: d(-15) },
    { id: 's12', nome: 'Sprint 12', inicio: d(-14), fim: d(-8) },
    { id: 's13', nome: 'Sprint 13', inicio: d(-7), fim: d(-1) },
    { id: 's14', nome: 'Sprint 14', inicio: d(0), fim: d(6), atual: true },
    { id: 's15', nome: 'Sprint 15', inicio: d(7), fim: d(13) },
    { id: 's16', nome: 'Sprint 16', inicio: d(14), fim: d(20) }
  ];

  /* ---------------------------------------------------------------- demandas
     Hierarquia (22/09/2026, a pedido do usuário):

       marco / entregavel   o que o projeto se comprometeu a entregar. Quem
                            define, e quem mexe na data, é a administração —
                            é a linha do cronograma, não o trabalho do dia.
       tarefa               o que uma área faz para o entregável acontecer.
                            Head e responsável mexem à vontade.
       subtarefa            o recorte da tarefa, mesmo regime da tarefa.

     `WB.TIPOS_DEMANDA` guarda o nível de cada tipo e `WB.podeEditarDemanda`
     aplica a regra. Tarefa e subtarefa precisam de `pai`: elas existem por
     causa de um entregável, e um nível solto não diria de onde veio.

     status: afazer | andamento | aprovacao | revisao | aprovada | concluida
     Os dois últimos passos são separados de propósito: "aprovada" é o aceite
     de quem pediu; "concluída" é o encerramento. Uma demanda pode ser
     aprovada e ainda ter pendência de fechamento — e pode voltar de
     "aprovacao" para "revisao" sem virar retrabalho invisível.

     Campos de data: `inicio` e `prazo` (começo e fim). `criador` é quem abriu
     a demanda — é essa pessoa que o portal avisa quando outra mexe ou apaga.
     `comentarios` é o chat interno da demanda; `anexos`, as referências.    */
  const DEMANDAS = [
    // p1 — entregáveis (administração) e as tarefas de cada um.
    { id: 'dm00', nome: 'Campanha de lançamento no ar', projeto: 'p1', tipo: 'entregavel', responsavel: 'u1', inicio: d(-20), prazo: d(8), prioridade: 'alta', status: 'andamento', sprint: 's14', criador: 'u3', descricao: 'Campanha completa de lançamento da Fase 2, do conceito à veiculação.' },
    { id: 'dm01', nome: 'Aprovar peças do lançamento Fase 2', projeto: 'p1', tipo: 'tarefa', responsavel: 'u1', inicio: d(-2), prazo: d(0), prioridade: 'alta', status: 'aprovacao', sprint: 's14', pai: 'dm00', criador: 'u2', descricao: 'Revisar e aprovar o kit de peças de lançamento com a agência antes do envio para produção.',
      comentarios: [
        { id: 'cm1', autor: 'u2', texto: 'Subi a rodada 3 das peças na pasta do Drive. Falta só o anúncio de jornal.', data: dh(28) },
        { id: 'cm2', autor: 'u1', texto: 'Aprovo as digitais. O jornal eu devolvo amanhã com ajuste de texto legal.', data: dh(5) }
      ],
      anexos: [{ id: 'an1', nome: 'kit-pecas-rodada-3.pdf', tamanho: 4820000, autor: 'u2', data: dh(28) }] },
    { id: 'dm03', nome: 'Fechar contrato da mídia OOH', projeto: 'p1', tipo: 'tarefa', responsavel: 'u1', inicio: d(-12), prazo: d(-3), prioridade: 'alta', status: 'andamento', sprint: 's13', pai: 'dm00', criador: 'u1', descricao: 'Negociação dos 6 pontos de outdoor na BR-277 e Av. Brasil.' },
    { id: 'dm16', nome: 'Fechar plano de mídia de setembro', projeto: 'p1', tipo: 'tarefa', responsavel: 'u1', inicio: d(-18), prazo: d(-10), prioridade: 'media', status: 'concluida', concluidaEm: d(-11), sprint: 's12', pai: 'dm00', criador: 'u1', descricao: 'Distribuição entre Meta, Google e OOH.' },
    { id: 'dm13', nome: 'Revisar política de descontos', projeto: 'p1', tipo: 'tarefa', responsavel: 'u1', inicio: d(-6), prazo: d(-2), prioridade: 'media', status: 'revisao', sprint: 's13', pai: 'dm00', criador: 'u3', descricao: 'Alçadas por faixa de desconto e registro obrigatório no CRM.' },

    { id: 'dm20', nome: 'Stand de vendas entregue', projeto: 'p1', tipo: 'entregavel', responsavel: 'u2', inicio: d(-30), prazo: d(12), prioridade: 'alta', status: 'andamento', sprint: 's15', criador: 'u3', descricao: 'Projeto, execução e operação do stand no terreno do Bioma.' },
    { id: 'dm02', nome: 'Briefing do stand de vendas', projeto: 'p1', tipo: 'tarefa', responsavel: 'u1', inicio: d(-1), prazo: d(1), prioridade: 'media', status: 'afazer', sprint: 's14', pai: 'dm20', criador: 'u2', descricao: 'Consolidar requisitos de arquitetura, mobiliário e sinalização do stand.' },
    { id: 'dm14', nome: 'Subir galeria de fotos da obra', projeto: 'p1', tipo: 'subtarefa', responsavel: 'u1', inicio: d(2), prazo: d(4), prioridade: 'baixa', status: 'afazer', sprint: 's15', pai: 'dm02', criador: 'u1', descricao: 'Drone + térreo, marcação mensal.' },

    { id: 'dm21', nome: 'Rede comercial treinada', projeto: 'p1', tipo: 'entregavel', responsavel: 'u4', inicio: d(-5), prazo: d(18), prioridade: 'alta', status: 'afazer', sprint: 's15', criador: 'u3', descricao: 'Argumentário publicado e duas turmas de corretores formadas.' },
    { id: 'dm04', nome: 'Treinar corretores no argumentário Bioma', projeto: 'p1', tipo: 'tarefa', responsavel: 'u4', inicio: d(0), prazo: d(2), prioridade: 'alta', status: 'afazer', sprint: 's14', pai: 'dm21', criador: 'u4', descricao: 'Duas turmas de 20 corretores, com prova prática de argumentação.' },
    { id: 'dm05', nome: 'Publicar tabela de preços revisada', projeto: 'p1', tipo: 'tarefa', responsavel: 'u4', inicio: d(-4), prazo: d(-1), prioridade: 'alta', status: 'revisao', sprint: 's14', pai: 'dm21', criador: 'u3', descricao: 'Tabela pós-reajuste de INCC, com validação da diretoria.' },
    { id: 'dm06', nome: 'Lançamento aberto ao público', projeto: 'p1', tipo: 'marco', responsavel: 'u3', inicio: d(24), prazo: d(24), prioridade: 'alta', status: 'afazer', sprint: 's16', criador: 'u3', descricao: 'Abertura oficial de vendas da Fase 2 do Bioma.' },

    // p2 — Vicente
    { id: 'dm07', nome: 'Nova identidade do Vicente — rodada 2', projeto: 'p2', tipo: 'entregavel', responsavel: 'u1', inicio: d(-8), prazo: d(5), prioridade: 'media', status: 'andamento', sprint: 's15', criador: 'u3', descricao: 'Ajustes de aplicação em fachada, impressos e assinatura digital.' },
    { id: 'dm08', nome: 'Ensaio fotográfico do decorado', projeto: 'p2', tipo: 'tarefa', responsavel: 'u5', inicio: d(-9), prazo: d(-5), prioridade: 'media', status: 'afazer', sprint: 's13', pai: 'dm07', criador: 'u1', descricao: 'Fotógrafo contratado, pendente de liberação do apartamento modelo.' },
    { id: 'dm15', nome: 'Onboarding de 3 corretores parceiros', projeto: 'p2', tipo: 'tarefa', responsavel: 'u5', inicio: d(3), prazo: d(6), prioridade: 'baixa', status: 'afazer', sprint: 's15', pai: 'dm07', criador: 'u4', descricao: 'Cadastro, credencial e acesso ao material de venda.' },
    { id: 'dm17', nome: 'Manual de aplicação de marca (exemplo)', projeto: 'p2', tipo: 'entregavel', responsavel: 'u1', inicio: d(-20), prazo: d(-12), prioridade: 'media', status: 'aprovada', concluidaEm: d(-14), sprint: 's12', criador: 'u3', descricao: 'Publicado no ID visual com controle de versão.' },

    // p3 — Nós Gastronomia
    { id: 'dm09', nome: 'Cardápio de inverno — validação', projeto: 'p3', tipo: 'entregavel', responsavel: 'u6', inicio: d(-7), prazo: d(3), prioridade: 'media', status: 'aprovacao', sprint: 's14', criador: 'u3', descricao: 'Degustação com diretoria e fechamento de ficha técnica.' },
    { id: 'dm10', nome: 'Alvará sanitário da CasaWE', projeto: 'p3', tipo: 'tarefa', responsavel: 'u8', inicio: d(-25), prazo: d(-8), prioridade: 'alta', status: 'andamento', sprint: 's13', pai: 'dm09', criador: 'u6', descricao: 'Protocolo feito, aguardando vistoria da vigilância sanitária.' },

    // p4 — WeInvest
    { id: 'dm11', nome: 'Tese de alocação 2026', projeto: 'p4', tipo: 'entregavel', responsavel: 'u7', inicio: d(1), prazo: d(9), prioridade: 'alta', status: 'afazer', sprint: 's15', criador: 'u3', descricao: 'Documento de alocação da carteira com cenários macro.' },
    { id: 'dm12', nome: 'Relatório mensal aos investidores', projeto: 'p4', tipo: 'tarefa', responsavel: 'u7', inicio: d(-3), prazo: d(0), prioridade: 'alta', status: 'andamento', sprint: 's14', pai: 'dm11', criador: 'u7', descricao: 'Fechamento de agosto, com abertura por ativo.' },
    { id: 'dm18', nome: 'Integração CRM ↔ WeBrain', projeto: 'p4', tipo: 'tarefa', responsavel: 'u2', inicio: d(7), prazo: d(11), prioridade: 'alta', status: 'afazer', sprint: 's16', pai: 'dm11', criador: 'u2', descricao: 'Espelhar leads e status de funil dentro do portal.' }
  ];

  /* ---------------------------------------------------------------- projetos */
  const PROJETOS = [
    {
      id: 'p1', nome: 'Lançamento Bioma — Fase 2', empresa: 'weinc', empreendimento: 'Bioma',
      status: 'ativo', prioridade: 'urgente', responsavel: 'u1', inicio: d(-60), fim: d(45), progresso: 62,
      resumo: 'Abertura de vendas da segunda fase do Bioma, com stand próprio e treinamento da rede credenciada.',
      briefing: {
        contexto: 'A Fase 1 vendeu 84% do estoque em 7 meses. A Fase 2 entra com 96 terrenos e exige reposicionamento da comunicação para um público que já conhece o produto.',
        objetivo: 'Vender 40% do estoque da Fase 2 em até 90 dias da abertura, mantendo o ticket médio acima de R$ 410 mil.',
        escopoIncluso: ['Campanha de pré-lançamento e lançamento', 'Stand de vendas no terreno', 'Treinamento da rede de corretores', 'Material de venda impresso e digital'],
        escopoExcluso: ['Obras de infraestrutura do loteamento', 'Regularização cartorial dos lotes'],
        premissas: ['Aprovação do memorial até 30 dias antes da abertura', 'Verba de mídia aprovada em R$ 380 mil'],
        restricoes: ['Não comunicar preço antes da aprovação da tabela pela diretoria'],
        patrocinador: 'u3', gerente: 'u1',
        criterios: 'Lançamento é considerado entregue quando o stand estiver operando, a rede treinada e a campanha no ar simultaneamente.'
      },
      marcos: [
        { id: 'mc1', nome: 'Aprovação do conceito criativo', prazo: d(-30), status: 'concluida', entregaveis: ['Rota criativa aprovada', 'Manual de campanha'] },
        { id: 'mc2', nome: 'Stand de vendas entregue', prazo: d(12), status: 'andamento', entregaveis: ['Projeto executivo', 'Mobiliário instalado', 'Sinalização'] },
        { id: 'mc3', nome: 'Rede comercial treinada', prazo: d(18), status: 'afazer', entregaveis: ['Argumentário', 'Duas turmas concluídas'] },
        { id: 'mc4', nome: 'Lançamento aberto ao público', prazo: d(24), status: 'afazer', entregaveis: ['Campanha no ar', 'Tabela publicada', 'Plantão ativo'] }
      ],
      documentos: [
        { nome: 'TAP — Lançamento Bioma Fase 2', tipo: 'Documento', versao: 'v2.1', atualizado: d(-18), link: '#' },
        { nome: 'Plano de mídia setembro/outubro', tipo: 'Planilha', versao: 'v1.4', atualizado: d(-6), link: '#' },
        { nome: 'Pasta de criação — Drive', tipo: 'Atalho', versao: '—', atualizado: d(-2), link: '#' },
        { nome: 'Tabela de preços Fase 2', tipo: 'Planilha', versao: 'v3.0', atualizado: d(-1), link: '#' }
      ],
      decisoes: [
        { data: d(-27), decisao: 'Manter a marca WeNature como assinatura do Bioma', porque: 'Reconhecimento espontâneo de 38% na pesquisa de setembro.', autor: 'u3', impacto: 'alto' },
        { data: d(-14), decisao: 'Adiar o stand em 2 semanas', porque: 'Atraso na entrega do mobiliário pelo fornecedor.', autor: 'u1', impacto: 'medio' },
        { data: d(-4), decisao: 'Concentrar 60% da verba em mídia local', porque: 'Custo por lead 41% menor que campanhas regionais.', autor: 'u1', impacto: 'medio' }
      ],
      riscos: [
        { id: 'r1', tipo: 'risco', titulo: 'Atraso do mobiliário do stand', probabilidade: 'media', impacto: 'alto', resposta: 'Fornecedor reserva contratado; multa contratual por atraso.', dono: 'u2', status: 'aberto', data: d(-14) },
        { id: 'r2', tipo: 'risco', titulo: 'Reajuste de INCC acima do previsto', probabilidade: 'baixa', impacto: 'alto', resposta: 'Cláusula de revisão trimestral na tabela.', dono: 'u7', status: 'monitorado', data: d(-20) },
        { id: 'r3', tipo: 'incidente', titulo: 'Vazamento da tabela de preços no grupo de corretores', probabilidade: '—', impacto: 'medio', resposta: 'Comunicado oficial e bloqueio da versão antiga no portal.', dono: 'u4', status: 'resolvido', data: d(-9) }
      ]
    },
    {
      id: 'p2', nome: 'Reposicionamento Vicente by We', empresa: 'weinc', empreendimento: 'Vicente by We',
      status: 'ativo', prioridade: 'normal', responsavel: 'u1', inicio: d(-40), fim: d(70), progresso: 35,
      resumo: 'Reposicionar o Vicente como produto de alto padrão no Country, com nova identidade e decorado fotografado.',
      briefing: {
        contexto: 'O Vicente é percebido como um produto intermediário, apesar de metragem e acabamento de alto padrão.',
        objetivo: 'Elevar a percepção de valor e sustentar um ticket 12% acima da praça até o fim do ano.',
        escopoIncluso: ['Nova identidade do empreendimento', 'Ensaio do decorado', 'Novo material de venda'],
        escopoExcluso: ['Alteração de projeto arquitetônico'],
        premissas: ['Decorado liberado para fotografia até o fim do mês'],
        restricoes: ['Manter o nome Vicente by We'],
        patrocinador: 'u3', gerente: 'u1',
        criterios: 'Entregue quando o novo material estiver em uso pela equipe comercial e a identidade aplicada em todos os pontos de contato.'
      },
      marcos: [
        { id: 'mc1', nome: 'Diagnóstico de percepção concluído', prazo: d(-20), status: 'concluida', entregaveis: ['Pesquisa com 120 clientes'] },
        { id: 'mc2', nome: 'Identidade aprovada', prazo: d(14), status: 'andamento', entregaveis: ['Rodada 2 de identidade', 'Aplicações'] },
        { id: 'mc3', nome: 'Material de venda em uso', prazo: d(55), status: 'afazer', entregaveis: ['Book impresso', 'Apresentação digital'] }
      ],
      documentos: [
        { nome: 'Pesquisa de percepção — Vicente', tipo: 'Documento', versao: 'v1.0', atualizado: d(-20), link: '#' },
        { nome: 'Identidade Vicente — rodada 2', tipo: 'Atalho', versao: 'v2.0', atualizado: d(-3), link: '#' }
      ],
      decisoes: [
        { data: d(-16), decisao: 'Assinar como "Vicente by We", sem submarca', porque: 'Reforça o endosso da incorporadora sem diluir o produto.', autor: 'u1', impacto: 'alto' }
      ],
      riscos: [
        { id: 'r1', tipo: 'risco', titulo: 'Decorado indisponível para o ensaio', probabilidade: 'alta', impacto: 'medio', resposta: 'Janela alternativa reservada no fim do mês.', dono: 'u5', status: 'aberto', data: d(-5) }
      ]
    },
    {
      id: 'p3', nome: 'Abertura Nós Gastronomia na CasaWE', empresa: 'nos', empreendimento: '—',
      status: 'ativo', prioridade: 'alta', responsavel: 'u6', inicio: d(-75), fim: d(30), progresso: 71,
      resumo: 'Operação gastronômica permanente dentro da CasaWE, atendendo eventos do grupo e público externo.',
      briefing: {
        contexto: 'A CasaWE recebe em média 14 eventos por mês e hoje depende de buffet terceirizado.',
        objetivo: 'Internalizar a operação de alimentos e bebidas, reduzindo custo por evento em 25%.',
        escopoIncluso: ['Cozinha equipada', 'Equipe fixa', 'Cardápios padronizados', 'Licenças'],
        escopoExcluso: ['Delivery e operação de rua'],
        premissas: ['Alvará sanitário emitido antes da abertura'],
        restricoes: ['Operação não pode conflitar com a agenda de eventos do grupo'],
        patrocinador: 'u3', gerente: 'u6',
        criterios: 'Entregue quando o primeiro evento for atendido integralmente pela equipe própria.'
      },
      marcos: [
        { id: 'mc1', nome: 'Cozinha entregue', prazo: d(-10), status: 'concluida', entregaveis: ['Equipamentos instalados'] },
        { id: 'mc2', nome: 'Licenças emitidas', prazo: d(5), status: 'andamento', entregaveis: ['Alvará sanitário', 'Bombeiros'] },
        { id: 'mc3', nome: 'Primeiro evento próprio', prazo: d(22), status: 'afazer', entregaveis: ['Evento atendido', 'Relatório de custo'] }
      ],
      documentos: [
        { nome: 'Fichas técnicas — cardápio base', tipo: 'Planilha', versao: 'v1.2', atualizado: d(-8), link: '#' },
        { nome: 'Protocolo vigilância sanitária', tipo: 'Documento', versao: 'v1.0', atualizado: d(-8), link: '#' }
      ],
      decisoes: [
        { data: d(-30), decisao: 'Operar com equipe fixa em vez de freelancers', porque: 'Padrão de serviço e custo previsível por evento.', autor: 'u6', impacto: 'alto' }
      ],
      riscos: [
        { id: 'r1', tipo: 'risco', titulo: 'Vistoria sanitária fora do prazo', probabilidade: 'media', impacto: 'alto', resposta: 'Acompanhamento semanal junto ao protocolo.', dono: 'u8', status: 'aberto', data: d(-8) }
      ]
    },
    {
      id: 'p4', nome: 'Estruturação We Invest — Carteira 2026', empresa: 'weinvest', empreendimento: '—',
      status: 'ativo', prioridade: 'normal', responsavel: 'u7', inicio: d(-25), fim: d(90), progresso: 22,
      resumo: 'Definir tese de alocação, régua de relatórios e integração de CRM da We Invest para o ciclo 2026.',
      briefing: {
        contexto: 'A base de investidores cresceu 60% no último ano sem que a régua de comunicação acompanhasse.',
        objetivo: 'Padronizar a prestação de contas e reduzir o tempo de fechamento mensal de 12 para 4 dias úteis.',
        escopoIncluso: ['Tese de alocação', 'Relatório mensal padronizado', 'Integração CRM'],
        escopoExcluso: ['Captação de novos investidores'],
        premissas: ['Dados do ERP disponíveis via integração'],
        restricoes: ['Nenhum dado de investidor sai do ambiente do grupo'],
        patrocinador: 'u3', gerente: 'u7',
        criterios: 'Entregue quando o fechamento mensal rodar dentro do prazo por dois ciclos consecutivos.'
      },
      marcos: [
        { id: 'mc1', nome: 'Tese de alocação publicada', prazo: d(9), status: 'andamento', entregaveis: ['Documento de tese', 'Cenários'] },
        { id: 'mc2', nome: 'Relatório padronizado', prazo: d(40), status: 'afazer', entregaveis: ['Template', 'Dois ciclos rodados'] },
        { id: 'mc3', nome: 'CRM integrado ao WeBrain', prazo: d(75), status: 'afazer', entregaveis: ['Espelho de leads', 'Funil no portal'] }
      ],
      documentos: [
        { nome: 'Tese de alocação 2026 — rascunho', tipo: 'Documento', versao: 'v0.4', atualizado: d(-2), link: '#' }
      ],
      decisoes: [],
      riscos: [
        { id: 'r1', tipo: 'risco', titulo: 'Integração do ERP sem API documentada', probabilidade: 'alta', impacto: 'alto', resposta: 'Exportação agendada como plano B.', dono: 'u2', status: 'aberto', data: d(-4) }
      ]
    }
  ];

  /* Projetos fora da operação do dia a dia. Desde 22/09/2026 eles têm a mesma
     forma dos ativos: a galeria de Projetos é uma só, com filtro de situação,
     e abrir um arquivado abre a mesma tela de projeto — com o termo de
     encerramento preenchido. `status` separa concluído de arquivado:
     concluído chegou ao fim previsto; arquivado foi interrompido. */
  const PROJETOS_ARQUIVADOS = [
    {
      id: 'pa1', nome: 'Pré-lançamento Bioma — Fase 1', empresa: 'weinc', empreendimento: 'Bioma',
      status: 'concluido', prioridade: 'normal', responsavel: 'u1',
      inicio: d(-330), fim: d(-120), encerrado: d(-120), progresso: 100,
      resumo: 'Abertura de vendas da primeira fase do Bioma, com campanha regional e plantão no terreno.',
      resultado: '84% do estoque vendido em 7 meses',
      licoes: 'Mídia local superou mídia regional em custo por lead.',
      briefing: {
        contexto: 'Primeiro loteamento da We Incorporadora no eixo norte de Cascavel.',
        objetivo: 'Vender 70% da Fase 1 em 9 meses.',
        escopoIncluso: ['Campanha de pré-lançamento', 'Plantão no terreno', 'Treinamento da rede'],
        escopoExcluso: ['Infraestrutura do loteamento'],
        premissas: ['Registro de incorporação aprovado antes da abertura'],
        restricoes: ['Sem comunicação de preço antes do registro'],
        patrocinador: 'u3', gerente: 'u1',
        criterios: 'Entregue com o plantão operando e a rede treinada.'
      },
      marcos: [
        { id: 'mc1', nome: 'Campanha no ar', prazo: d(-300), status: 'concluida', entregaveis: ['Campanha aprovada'] },
        { id: 'mc2', nome: 'Abertura de vendas', prazo: d(-280), status: 'concluida', entregaveis: ['Plantão ativo', 'Tabela publicada'] },
        { id: 'mc3', nome: 'Meta de 70% atingida', prazo: d(-130), status: 'concluida', entregaveis: ['Relatório de vendas'] }
      ],
      documentos: [
        { id: 'doc-pa1-1', nome: 'Relatório final de vendas — Fase 1', tipo: 'Documento', versao: 'v1.0', atualizado: d(-120), link: '#' }
      ],
      decisoes: [
        { data: d(-290), decisao: 'Concentrar mídia em Cascavel e região', porque: 'Custo por lead 44% menor que a campanha estadual.', autor: 'u1', impacto: 'alto' }
      ],
      riscos: [
        { id: 'r1', tipo: 'risco', titulo: 'Atraso no registro de incorporação', probabilidade: 'media', impacto: 'alto', resposta: 'Acompanhamento semanal no cartório.', dono: 'u2', status: 'resolvido', data: d(-310) }
      ],
      encerramento: {
        data: d(-120), resultado: '84% do estoque vendido em 7 meses',
        licoes: 'Mídia local superou mídia regional em custo por lead.',
        pendencias: 'Nenhuma.', aceite: 'u3'
      }
    },
    {
      id: 'pa2', nome: 'Implantação ERP Omie', empresa: 'weinc', empreendimento: '—',
      status: 'concluido', prioridade: 'normal', responsavel: 'u8',
      inicio: d(-260), fim: d(-95), encerrado: d(-95), progresso: 100,
      resumo: 'Migração do financeiro, das notas fiscais e dos contratos para o Omie.',
      resultado: 'Migração concluída com 3 semanas de atraso',
      licoes: 'Congelar cadastros antes da virada evita retrabalho.',
      briefing: {
        contexto: 'O controle financeiro vivia em planilhas paralelas por empresa.',
        objetivo: 'Centralizar financeiro, notas e contratos em um único ERP.',
        escopoIncluso: ['Migração de cadastros', 'Treinamento do administrativo', 'Integração bancária'],
        escopoExcluso: ['Folha de pagamento'],
        premissas: ['Base de cadastros limpa antes da virada'],
        restricoes: ['Virada fora do fechamento mensal'],
        patrocinador: 'u3', gerente: 'u8',
        criterios: 'Entregue com dois fechamentos mensais rodados dentro do ERP.'
      },
      marcos: [
        { id: 'mc1', nome: 'Cadastros migrados', prazo: d(-180), status: 'concluida', entregaveis: ['Base migrada e conferida'] },
        { id: 'mc2', nome: 'Primeiro fechamento no ERP', prazo: d(-130), status: 'concluida', entregaveis: ['Fechamento validado'] }
      ],
      documentos: [
        { id: 'doc-pa2-1', nome: 'Plano de migração — Omie', tipo: 'Documento', versao: 'v2.0', atualizado: d(-190), link: '#' }
      ],
      decisoes: [
        { data: d(-200), decisao: 'Migrar por empresa, não tudo de uma vez', porque: 'Reduz o impacto de erro na virada.', autor: 'u8', impacto: 'alto' }
      ],
      riscos: [
        { id: 'r1', tipo: 'incidente', titulo: 'Duplicidade de fornecedores na carga', probabilidade: '—', impacto: 'medio', resposta: 'Deduplicação manual antes do segundo lote.', dono: 'u8', status: 'resolvido', data: d(-175) }
      ],
      encerramento: {
        data: d(-95), resultado: 'Migração concluída com 3 semanas de atraso',
        licoes: 'Congelar cadastros antes da virada evita retrabalho.',
        pendencias: 'Integração bancária de uma conta ficou para o time financeiro.', aceite: 'u3'
      }
    },
    {
      id: 'pa3', nome: 'Reforma da CasaWE', empresa: 'casawe', empreendimento: '—',
      status: 'arquivado', prioridade: 'normal', responsavel: 'u2',
      inicio: d(-240), fim: d(-60), encerrado: d(-60), progresso: 100,
      resumo: 'Reforma do casarão para receber eventos do grupo e a operação gastronômica.',
      resultado: 'Entregue no prazo, 6% acima do orçamento',
      licoes: 'Reserva de contingência de 10% foi insuficiente.',
      briefing: {
        contexto: 'A CasaWE recebia eventos sem estrutura de cozinha nem acessibilidade.',
        objetivo: 'Entregar o espaço pronto para eventos até o fim do semestre.',
        escopoIncluso: ['Reforma estrutural', 'Acessibilidade', 'Infraestrutura de cozinha'],
        escopoExcluso: ['Mobiliário e decoração'],
        premissas: ['Alvará de reforma aprovado'],
        restricoes: ['Obra sem interromper a agenda de eventos do grupo'],
        patrocinador: 'u3', gerente: 'u2',
        criterios: 'Entregue com habite-se e primeiro evento realizado.'
      },
      marcos: [
        { id: 'mc1', nome: 'Obra estrutural concluída', prazo: d(-120), status: 'concluida', entregaveis: ['Laudo estrutural'] },
        { id: 'mc2', nome: 'Espaço liberado para eventos', prazo: d(-65), status: 'concluida', entregaveis: ['Vistoria concluída'] }
      ],
      documentos: [
        { id: 'doc-pa3-1', nome: 'Prestação de contas da obra', tipo: 'Planilha', versao: 'v1.2', atualizado: d(-60), link: '#' }
      ],
      decisoes: [
        { data: d(-150), decisao: 'Refazer a rede elétrica inteira', porque: 'A rede antiga não suportava a carga da cozinha.', autor: 'u2', impacto: 'alto' }
      ],
      riscos: [
        { id: 'r1', tipo: 'risco', titulo: 'Estouro de orçamento', probabilidade: 'alta', impacto: 'medio', resposta: 'Contingência de 10% e revisão quinzenal.', dono: 'u2', status: 'resolvido', data: d(-200) }
      ],
      encerramento: {
        data: d(-60), resultado: 'Entregue no prazo, 6% acima do orçamento',
        licoes: 'Reserva de contingência de 10% foi insuficiente.',
        pendencias: 'Paisagismo externo foi arquivado junto com o projeto.', aceite: 'u3'
      }
    }
  ];

  /* ----------------------------------------------------------- status report
     Documento semanal escrito fora do portal. Aqui fica só o registro: a qual
     sprint pertence, de qual projeto fala e onde está o material. O conteúdo
     de verdade é o link — a tela não inventa resumo do que não leu. */
  const STATUS_REPORTS = [
    { id: 'sr3', sprint: 's13', projeto: 'p1', titulo: 'Status report — Bioma Fase 2', link: '#', data: d(-1), autor: 'u1', observacao: 'Stand e treinamento em risco de calendário.' },
    { id: 'sr2', sprint: 's13', projeto: 'p3', titulo: 'Status report — Nós Gastronomia', link: '#', data: d(-1), autor: 'u6', observacao: '' },
    { id: 'sr1', sprint: 's12', projeto: 'p1', titulo: 'Status report — Bioma Fase 2', link: '#', data: d(-8), autor: 'u1', observacao: '' }
  ];

  /* -------------------------------------------------------------- governança */
  const GOVERNANCA = {
    metas: [
      { meta: 'VGV lançado no ano', alvo: 'R$ 180 mi', atual: 'R$ 118 mi', progresso: 66, empresa: 'weinc', dono: 'u3' },
      { meta: 'Velocidade de vendas Bioma', alvo: '18 lotes/mês', atual: '14 lotes/mês', progresso: 78, empresa: 'weinc', dono: 'u4' },
      { meta: 'Custo por lead qualificado', alvo: 'até R$ 85', atual: 'R$ 71', progresso: 100, empresa: 'weinc', dono: 'u1' },
      { meta: 'Eventos atendidos por equipe própria', alvo: '100%', atual: '35%', progresso: 35, empresa: 'nos', dono: 'u6' },
      { meta: 'Prazo de fechamento mensal', alvo: '4 dias úteis', atual: '12 dias úteis', progresso: 20, empresa: 'weinvest', dono: 'u7' }
    ],
    documentos: [
      { nome: 'Política de Proteção da Carteira de Clientes', categoria: 'Políticas', empresa: 'weinc', setor: 'Comercial', versao: 'v1.0', atualizado: d(-8), revisao: d(180), responsavel: 'u2', link: '#' },
      { nome: 'Código de Conduta Grupo We', categoria: 'Políticas', empresa: 'grupo', setor: 'Diretoria', versao: 'v3.2', atualizado: d(-200), revisao: d(-20), responsavel: 'u3', link: '#' },
      { nome: 'Política de Descontos e Alçadas', categoria: 'Políticas', empresa: 'weinc', setor: 'Comercial', versao: 'v2.0', atualizado: d(-45), revisao: d(140), responsavel: 'u4', link: '#' },
      { nome: 'Manual da Cultura We', categoria: 'Cultura', empresa: 'grupo', setor: 'Gente', versao: 'v2.1', atualizado: d(-90), revisao: d(90), responsavel: 'u3', link: '#' },
      { nome: 'Processo de Solicitação de Compra', categoria: 'Processos', empresa: 'grupo', setor: 'Administrativo', versao: 'v1.3', atualizado: d(-30), revisao: d(150), responsavel: 'u8', link: '#' },
      { nome: 'Processo de Solicitação de Evento', categoria: 'Processos', empresa: 'grupo', setor: 'Marketing', versao: 'v1.1', atualizado: d(-60), revisao: d(120), responsavel: 'u1', link: '#' },
      { nome: 'Procedimento de Fechamento Mensal', categoria: 'Processos', empresa: 'weinvest', setor: 'Financeiro', versao: 'v1.0', atualizado: d(-220), revisao: d(-35), responsavel: 'u7', link: '#' },
      { nome: 'Onboarding de Corretor Parceiro', categoria: 'Treinamentos', empresa: 'weinc', setor: 'Comercial', versao: 'v1.2', atualizado: d(-15), revisao: d(165), responsavel: 'u4', link: '#' },
      { nome: 'Trilha de Argumentação Bioma', categoria: 'Treinamentos', empresa: 'weinc', setor: 'Comercial', versao: 'v1.0', atualizado: d(-5), revisao: d(175), responsavel: 'u4', link: '#' },
      { nome: 'Uso da Marca e ID Visual', categoria: 'Cultura', empresa: 'grupo', setor: 'Marketing', versao: 'v4.0', atualizado: d(-12), revisao: d(170), responsavel: 'u1', link: '#' }
    ]
  };

  /* ---------------------------------------------------------------- recursos */
  const ATAS = [
    { id: 'a1', titulo: 'Sprint review — Operações', tipo: 'equipe', setor: 'Operações', data: d(-2), participantes: ['u2', 'u1', 'u8'], resumo: 'Revisão das entregas da Sprint 13 e repasse de pendências do stand.', restrito: false },
    { id: 'a2', titulo: 'Comitê de lançamento Bioma', tipo: 'equipe', setor: 'Marketing', data: d(-6), participantes: ['u1', 'u4', 'u3'], resumo: 'Definição da data de abertura e da distribuição de verba.', restrito: false },
    { id: 'a3', titulo: 'Reunião de diretoria — setembro', tipo: 'diretoria', setor: 'Diretoria', data: d(-9), participantes: ['u3', 'u2', 'u7'], resumo: 'Acompanhamento de VGV e aprovação da tabela Fase 2.', restrito: true },
    { id: 'a4', titulo: '1:1 Alex × Douglas', tipo: '1a1', setor: 'Marketing', data: d(-4), participantes: ['u1', 'u3'], resumo: 'PDI e prioridades do trimestre.', restrito: true },
    { id: 'a5', titulo: 'Alinhamento Nós Gastronomia', tipo: 'equipe', setor: 'Operações', data: d(-11), participantes: ['u6', 'u2'], resumo: 'Cardápios padrão e escala da equipe fixa.', restrito: false }
  ];

  const CLIENTES = [
    { id: 'c1', nome: 'Marcelo Andrade', tipo: 'cliente', empresa: 'weinc', produto: 'Bioma — Lote 42', origem: 'Indicação', valor: 438000, etapa: 'Contrato assinado', responsavel: 'u5', desde: d(-40), telefone: '(45) 99xxx-1020' },
    { id: 'c2', nome: 'Fernanda Ruiz', tipo: 'lead', empresa: 'weinc', produto: 'Bioma — Fase 2', origem: 'Meta Ads', valor: 0, etapa: 'Qualificação', responsavel: 'u5', desde: d(-3), telefone: '(45) 99xxx-4417' },
    { id: 'c3', nome: 'Construtora Horizonte', tipo: 'cliente', empresa: 'weinvest', produto: 'Carteira Renda', origem: 'Prospecção ativa', valor: 1250000, etapa: 'Ativo', responsavel: 'u7', desde: d(-210), telefone: '(45) 3xxx-7700' },
    { id: 'c4', nome: 'Patrícia Lemos', tipo: 'lead', empresa: 'weinc', produto: 'Vicente by We', origem: 'Portal imobiliário', valor: 0, etapa: 'Visita agendada', responsavel: 'u5', desde: d(-1), telefone: '(45) 99xxx-8832' },
    { id: 'c5', nome: 'Grupo Sabor & Cia', tipo: 'cliente', empresa: 'nos', produto: 'Eventos corporativos', origem: 'Parceria', valor: 96000, etapa: 'Recorrente', responsavel: 'u6', desde: d(-150), telefone: '(45) 3xxx-2210' },
    { id: 'c6', nome: 'Ricardo Menezes', tipo: 'lead', empresa: 'weinc', produto: 'Bioma — Fase 2', origem: 'Corretor parceiro', valor: 0, etapa: 'Proposta enviada', responsavel: 'u4', desde: d(-7), telefone: '(45) 99xxx-6654' }
  ];

  const LINKS = [
    { nome: 'ERP — Omie', url: '#/erp', grupo: 'Sistemas', descricao: 'Acesso ao ERP e cadastro do link do sistema' },
    { nome: 'CRM comercial', url: '#', grupo: 'Sistemas', descricao: 'Funil, leads e carteira' },
    { nome: 'Google Agenda We', url: '#', grupo: 'Sistemas', descricao: 'Agenda compartilhada do grupo' },
    { nome: 'Drive — Marketing', url: '#', grupo: 'Arquivos', descricao: 'Peças, fotos e vídeos' },
    { nome: 'Drive — Jurídico', url: '#', grupo: 'Arquivos', descricao: 'Contratos e procurações' },
    { nome: 'Portal do corretor', url: '#', grupo: 'Comercial', descricao: 'Tabelas e material de venda' },
    { nome: 'ID visual Grupo We', url: '#', grupo: 'Marca', descricao: 'Logos, fontes e aplicações' },
    { nome: 'Banco de imagens', url: '#', grupo: 'Marca', descricao: 'Fotos de obra e institucional' }
  ];

  const ID_VISUAL = [
    { item: 'Logo Grupo We', formatos: 'SVG, PNG, EPS', versao: 'v4.0', atualizado: d(-12) },
    { item: 'Logo We Inc', formatos: 'SVG, PNG, EPS', versao: 'v4.0', atualizado: d(-12) },
    { item: 'Logo We Invest', formatos: 'SVG, PNG', versao: 'v2.0', atualizado: d(-80) },
    { item: 'Logo Nós Gastronomia', formatos: 'SVG, PNG', versao: 'v1.3', atualizado: d(-55) },
    { item: 'Marca Bioma / WeNature', formatos: 'SVG, PNG, EPS', versao: 'v2.2', atualizado: d(-30) },
    { item: 'Marca Vicente by We', formatos: 'SVG, PNG', versao: 'v2.0 (rascunho)', atualizado: d(-3) },
    { item: 'Tipografia institucional', formatos: 'OTF, WOFF2', versao: 'v1.0', atualizado: d(-200) },
    { item: 'Paleta e aplicações', formatos: 'PDF', versao: 'v4.0', atualizado: d(-12) }
  ];

  const GALERIA = [
    { titulo: 'Obra Bioma — setembro', tipo: 'Fotos', qtd: 128, data: d(-5), empresa: 'weinc' },
    { titulo: 'Drone Bioma — Fase 2', tipo: 'Vídeo', qtd: 6, data: d(-5), empresa: 'weinc' },
    { titulo: 'Decorado Vicente', tipo: 'Fotos', qtd: 64, data: d(-25), empresa: 'weinc' },
    { titulo: 'Evento de fechamento — agosto', tipo: 'Fotos', qtd: 210, data: d(-30), empresa: 'casawe' },
    { titulo: 'Pratos — cardápio de inverno', tipo: 'Fotos', qtd: 48, data: d(-10), empresa: 'nos' },
    { titulo: 'Institucional Grupo We', tipo: 'Vídeo', qtd: 3, data: d(-90), empresa: 'grupo' }
  ];

  /* --------------------------------------------------------------- comercial */
  const CORRETORES = [
    { nome: 'Imobiliária Alvorada', tipo: 'Imobiliária', responsavel: 'Sandra Muniz', vendas12m: 22, vgv12m: 9100000, status: 'ativo', desde: d(-600) },
    { nome: 'Imobiliária Cascavel Prime', tipo: 'Imobiliária', responsavel: 'Élcio Barreto', vendas12m: 17, vgv12m: 7300000, status: 'ativo', desde: d(-420) },
    { nome: 'Tiago Moretti', tipo: 'Corretor autônomo', responsavel: 'Tiago Moretti', vendas12m: 11, vgv12m: 4600000, status: 'ativo', desde: d(-300) },
    { nome: 'Vanessa Duarte', tipo: 'Corretor autônomo', responsavel: 'Vanessa Duarte', vendas12m: 9, vgv12m: 3800000, status: 'ativo', desde: d(-200) },
    { nome: 'Imobiliária Terra Nova', tipo: 'Imobiliária', responsavel: 'Paulo Grandi', vendas12m: 3, vgv12m: 1200000, status: 'inativo', desde: d(-900) }
  ];

  const AGENTES = [
    { nome: 'Atendente Bioma', canal: 'WhatsApp', funcao: 'Qualifica leads e agenda visitas', conversas30d: 1840, conversao: 18, status: 'ativo' },
    { nome: 'Assistente do corretor', canal: 'Portal', funcao: 'Responde dúvidas de tabela e disponibilidade', conversas30d: 620, conversao: 0, status: 'ativo' },
    { nome: 'Pós-venda We Inc', canal: 'WhatsApp', funcao: 'Acompanha cliente do contrato à entrega', conversas30d: 310, conversao: 0, status: 'ativo' },
    { nome: 'Recepção Nós Gastronomia', canal: 'Instagram', funcao: 'Reserva de mesas e orçamento de evento', conversas30d: 275, conversao: 24, status: 'piloto' }
  ];

  /* ---------------------------------------------------- administrativo e op. */
  const COLABORADORES = PESSOAS.map((p, i) => ({
    ...p,
    admissao: d(-(120 + i * 180)),
    contrato: i % 4 === 0 ? 'PJ' : 'CLT',
    status: 'ativo'
  }));

  const FORNECEDORES = [
    { nome: 'Marcenaria Kunz', cnpj: '11.222.333/0001-44', categoria: 'Mobiliário', contato: 'Elias Kunz', empresa: 'weinc', status: 'ativo' },
    { nome: 'Agência Norte Criativa', cnpj: '22.333.444/0001-55', categoria: 'Publicidade', contato: 'Bianca Ferri', empresa: 'weinc', status: 'ativo' },
    { nome: 'OOH Paraná Mídia', cnpj: '33.444.555/0001-66', categoria: 'Mídia exterior', contato: 'Marcos Lauer', empresa: 'weinc', status: 'ativo' },
    { nome: 'Distribuidora Boa Mesa', cnpj: '44.555.666/0001-77', categoria: 'Alimentos', contato: 'Célia Roldão', empresa: 'nos', status: 'ativo' },
    { nome: 'TecnoClima Refrigeração', cnpj: '55.666.777/0001-88', categoria: 'Manutenção', contato: 'Ivan Prestes', empresa: 'casawe', status: 'inativo' }
  ];

  const PARCEIROS = [
    { nome: 'Arq. Helena Vilar', tipo: 'Arquitetura', escopo: 'Projeto do stand e decorado', empresa: 'weinc', status: 'ativo' },
    { nome: 'Escritório Barros & Dias', tipo: 'Jurídico', escopo: 'Contratos e regularização', empresa: 'grupo', status: 'ativo' },
    { nome: 'Vinícola Serra Alta', tipo: 'Fornecimento', escopo: 'Carta de vinhos dos eventos', empresa: 'nos', status: 'ativo' }
  ];

  const PATROCINADORES = [
    { nome: 'Banco Regional Sul', evento: 'Lançamento Bioma Fase 2', cota: 'Master', valor: 120000, status: 'confirmado', contato: 'Rodrigo Sales' },
    { nome: 'Concessionária Vetor', evento: 'Lançamento Bioma Fase 2', cota: 'Ouro', valor: 60000, status: 'confirmado', contato: 'Aline Petri' },
    { nome: 'Construtora Horizonte', evento: 'Encontro de investidores', cota: 'Prata', valor: 25000, status: 'negociação', contato: 'Ivo Castanho' }
  ];

  const BENS = [
    { item: 'Notebook Dell Latitude 5440', patrimonio: 'WE-0182', empresa: 'weinc', responsavel: 'u1', aquisicao: d(-300), valor: 7400, estado: 'em uso' },
    { item: 'Forno combinado Rational', patrimonio: 'NOS-0034', empresa: 'nos', responsavel: 'u6', aquisicao: d(-60), valor: 68000, estado: 'em uso' },
    { item: 'Mobiliário do stand — lote 1', patrimonio: 'WE-0219', empresa: 'weinc', responsavel: 'u2', aquisicao: d(-14), valor: 143000, estado: 'em trânsito' },
    { item: 'Projetor Epson 5050', patrimonio: 'CW-0007', empresa: 'casawe', responsavel: 'u2', aquisicao: d(-420), valor: 12900, estado: 'em uso' },
    { item: 'Drone DJI Mavic 3', patrimonio: 'WE-0143', empresa: 'weinc', responsavel: 'u1', aquisicao: d(-500), valor: 21000, estado: 'em manutenção' }
  ];

  const CNPJS = [
    { razao: 'We Incorporadora Ltda.', fantasia: 'We Inc', cnpj: '10.101.101/0001-01', empresa: 'weinc', regime: 'Lucro Presumido', situacao: 'ativa', abertura: d(-2600) },
    { razao: 'WeInvest Gestão Patrimonial Ltda.', fantasia: 'WeInvest', cnpj: '20.202.202/0001-02', empresa: 'weinvest', regime: 'Lucro Real', situacao: 'ativa', abertura: d(-1400) },
    { razao: 'Nós Gastronomia e Eventos Ltda.', fantasia: 'Nós Gastronomia', cnpj: '30.303.303/0001-03', empresa: 'nos', regime: 'Simples Nacional', situacao: 'ativa', abertura: d(-700) },
    { razao: 'CasaWE Administração de Espaços Ltda.', fantasia: 'CasaWE', cnpj: '40.404.404/0001-04', empresa: 'casawe', regime: 'Simples Nacional', situacao: 'ativa', abertura: d(-500) },
    { razao: 'Bioma Empreendimentos SPE Ltda.', fantasia: 'SPE Bioma', cnpj: '50.505.505/0001-05', empresa: 'weinc', regime: 'Lucro Presumido', situacao: 'ativa', abertura: d(-900) }
  ];

  const CONTRATOS = [
    { objeto: 'Mobiliário do stand de vendas', parte: 'Marcenaria Kunz', empresa: 'weinc', valor: 143000, inicio: d(-45), fim: d(20), status: 'vigente', reajuste: 'não se aplica' },
    { objeto: 'Verba de publicidade — setembro a dezembro', parte: 'Agência Norte Criativa', empresa: 'weinc', valor: 380000, inicio: d(-30), fim: d(75), status: 'vigente', reajuste: 'IPCA anual' },
    { objeto: 'Locação de 6 pontos OOH', parte: 'OOH Paraná Mídia', empresa: 'weinc', valor: 96000, inicio: d(-5), fim: d(85), status: 'em assinatura', reajuste: 'não se aplica' },
    { objeto: 'Fornecimento de insumos', parte: 'Distribuidora Boa Mesa', empresa: 'nos', valor: 0, inicio: d(-120), fim: d(245), status: 'vigente', reajuste: 'tabela trimestral' },
    { objeto: 'Assessoria jurídica mensal', parte: 'Barros & Dias', empresa: 'grupo', valor: 14500, inicio: d(-365), fim: d(-5), status: 'vencido', reajuste: 'IPCA anual' }
  ];

  /* ------------------------------------------------------------------ agenda */
  /* Agendas que a conta lê. A primeira é a do e-mail de acesso; as outras
     foram compartilhadas com ele. No Início cada uma liga e desliga — a
     leitura do Google Agenda ainda é demonstrativa. */
  const AGENDAS = [
    { id: 'principal', nome: 'Minha agenda', conta: 'marketing@weinc.imb.br', cor: '#374b58', propria: true },
    { id: 'salas', nome: 'Salas de reunião We', conta: 'salas@weinc.imb.br', cor: '#2f6b5f' },
    { id: 'diretoria', nome: 'Diretoria', conta: 'diretoria@weinc.imb.br', cor: '#54497c' },
    { id: 'eventos', nome: 'Eventos Grupo We', conta: 'eventos@weinc.imb.br', cor: '#c24d00' },
    { id: 'nos', nome: 'Nós Gastronomia', conta: 'contato@nosgastronomia.com.br', cor: '#8a3b3b' }
  ];

  const AGENDA = [
    { titulo: 'Daily de Operações', inicio: '08:30', fim: '08:45', dia: d(0), local: 'Sala reunião principal', origem: 'Google Agenda', tipo: 'reuniao', agenda: 'principal' },
    { titulo: 'Aprovação das peças — Fase 2', inicio: '10:00', fim: '11:30', dia: d(0), local: 'Sala Douglas', origem: 'WeBrain', tipo: 'reuniao', agenda: 'principal' },
    { titulo: 'Degustação cardápio de inverno', inicio: '14:00', fim: '16:00', dia: d(0), local: 'CasaWE', origem: 'WeBrain', tipo: 'evento', agenda: 'nos' },
    { titulo: 'Sala Douglas reservada', inicio: '16:30', fim: '17:30', dia: d(0), local: 'Sala Douglas', origem: 'Google Agenda', tipo: 'reuniao', agenda: 'salas' },
    { titulo: 'Visita técnica ao stand', inicio: '09:00', fim: '10:30', dia: d(1), local: 'Terreno Bioma', origem: 'Google Agenda', tipo: 'reuniao', agenda: 'principal' },
    { titulo: 'Comitê comercial', inicio: '15:00', fim: '16:00', dia: d(1), local: 'Sala reuniões pocket', origem: 'Google Agenda', tipo: 'reuniao', agenda: 'principal' },
    { titulo: 'Reunião de diretoria', inicio: '08:00', fim: '09:30', dia: d(1), local: 'Sala Douglas', origem: 'Google Agenda', tipo: 'reuniao', agenda: 'diretoria' },
    { titulo: 'Treinamento de corretores — turma 1', inicio: '08:00', fim: '12:00', dia: d(2), local: 'CasaWE', origem: 'WeBrain', tipo: 'evento', agenda: 'eventos' },
    { titulo: 'Jantar com parceiros', inicio: '19:00', fim: '22:00', dia: d(2), local: 'Nós Gastronomia', origem: 'Google Agenda', tipo: 'evento', agenda: 'nos' },
    { titulo: '1:1 com Douglas', inicio: '17:00', fim: '17:45', dia: d(3), local: 'Sala Douglas', origem: 'Google Agenda', tipo: 'reuniao', agenda: 'principal' },
    { titulo: 'Fechamento de mídia', inicio: '11:00', fim: '12:00', dia: d(4), local: 'Online', origem: 'Google Agenda', tipo: 'reuniao', agenda: 'principal' }
  ];

  const NEWS = [
    { id: 'n1', titulo: 'Tabela da Fase 2 do Bioma publicada', corpo: 'A tabela revisada já está no portal do corretor. A versão anterior foi bloqueada — usem apenas a v3.0.', autor: 'u4', data: d(0), publicadoEm: dh(-3), fixado: true, publico: 'Comercial' },
    { id: 'n2', titulo: 'Nova política de proteção de carteira', corpo: 'Entrou em vigor a política que define como o registro de atendimento protege a carteira do corretor. Leitura obrigatória.', autor: 'u2', data: d(0), publicadoEm: dh(-9), fixado: true, publico: 'Todos' },
    { id: 'n3', titulo: 'CasaWE fechada para manutenção na sexta', corpo: 'Não haverá atendimento nem eventos na sexta-feira. Reagendem o que estiver marcado.', autor: 'u2', data: d(-1), publicadoEm: dh(-30), fixado: false, publico: 'Todos' },
    { id: 'n4', titulo: 'Cardápio de inverno em degustação', corpo: 'A degustação com a diretoria acontece hoje às 14h. O cardápio aprovado entra na próxima semana.', autor: 'u6', data: d(-2), publicadoEm: dh(-52), fixado: false, publico: 'Todos' },
    { id: 'n5', titulo: 'WeBrain: solicitações agora pelo portal', corpo: 'Compras, eventos e coffee passam a ser pedidos exclusivamente pelo WeBrain. O e-mail de solicitações será desativado.', autor: 'u3', data: d(-4), fixado: false, publico: 'Todos' }
  ];

  const NOTIFICACOES = [
    { id: 'nt1', texto: 'Sua solicitação de coffee para hoje às 10h foi confirmada.', data: d(0), lida: false, rota: '#/solicitacoes' },
    { id: 'nt2', texto: 'Cinthia Vantini atribuiu a você "Aprovar peças do lançamento Fase 2".', data: d(0), lida: false, rota: '#/demandas' },
    { id: 'nt3', texto: 'Código de Conduta Grupo We está com revisão vencida.', data: d(-1), lida: false, rota: '#/governanca/politicas' },
    { id: 'nt4', texto: 'Risco aberto em Bioma Fase 2: atraso do mobiliário do stand.', data: d(-2), lida: true, rota: '#/projeto/p1/riscos' },
    { id: 'nt5', texto: 'Novo lead recebido: Patrícia Lemos (Vicente by We).', data: d(-1), lida: true, rota: '#/crm' }
  ];

  const ATALHOS = [
    { nome: 'Drive — Marketing', url: '#', icone: 'pasta' },
    { nome: 'CRM comercial', url: '#', icone: 'funil' },
    { nome: 'ERP — Omie', url: '#/erp', icone: 'cubo' },
    { nome: 'Portal do corretor', url: '#', icone: 'chave' },
    { nome: 'Tabela Bioma v3.0', url: '#', icone: 'planilha' }
  ];

  /* ---------------------------------------------------------- solicitações */
  /* Situações dos pedidos (pedido do usuário, 22/09/2026): em análise →
     confirmado / em andamento → concluído. O fluxo vive em pedidos.js. */
  const SOLICITACOES = [
    { id: 'SOL-0241', tipo: 'coffe', titulo: 'Coffee — reunião com Banco Regional', solicitante: 'u1', data: d(-1), status: 'confirmado', resumo: 'Sala Douglas · 6 pessoas · Coffee Premium — opção 1', valores: { quando: 'agendar', dia: d(0), hora: '10:00', local: 'Sala Douglas', participantes: '6', cardapio: 'premium1', ocasiao: 'Reunião' } },
    { id: 'SOL-0240', tipo: 'compra', titulo: 'Compra — sinalização do stand', solicitante: 'u1', data: d(-2), status: 'em análise', resumo: 'R$ 18.400,00 em 2x · We Inc', valores: { empresa: 'We Inc', motivo: 'Evento', descricao: 'Sinalização do stand', valor: '18400', parcelas: '2', vencimento: d(10), documento: '33.444.555/0001-66' } },
    { id: 'SOL-0238', tipo: 'evento', titulo: 'Treinamento de corretores turma 1', solicitante: 'u4', data: d(-5), status: 'confirmado', responsavel: 'u1', resumo: 'CasaWE · 40 participantes · almoço', valores: { nome: 'Treinamento de corretores turma 1', participantes: '40', alimentacao: 'Almoço', responsavelEvento: 'u1' } },
    { id: 'SOL-0236', tipo: 'compra', titulo: 'Compra — insumos da degustação', solicitante: 'u6', data: d(-6), status: 'concluído', resumo: 'R$ 3.120,00 à vista · Nós Gastronomia', valores: { empresa: 'Nós Gastronomia', descricao: 'Insumos da degustação', valor: '3120', parcelas: '1' } },
    { id: 'SOL-0233', tipo: 'coffe', titulo: 'Coffee — fechamento lote 42', solicitante: 'u5', data: d(-9), status: 'concluído', resumo: 'Sala de atendimento 2 · 3 pessoas · Coffee da casa', valores: { quando: 'imediato', local: 'Sala de atendimento 2', participantes: '3', cardapio: 'casa' } }
  ];

  /* -------------------------------------------------------------- dashboards */
  const DASH = {
    grupo: {
      kpis: [
        { rotulo: 'VGV lançado no ano', valor: 'R$ 118 mi', delta: 12, nota: 'meta R$ 180 mi' },
        { rotulo: 'Receita consolidada (mês)', valor: 'R$ 9,4 mi', delta: 6, nota: 'vs. agosto' },
        { rotulo: 'Margem operacional', valor: '23,8%', delta: -1.4, nota: 'vs. agosto' },
        { rotulo: 'Colaboradores ativos', valor: '48', delta: 3, nota: '3 admissões no mês' }
      ],
      receitaPorEmpresa: [
        { empresa: 'We Incorporadora', valor: 6200000 },
        { empresa: 'WeInvest', valor: 1900000 },
        { empresa: 'Nós Gastronomia', valor: 840000 },
        { empresa: 'CasaWE', valor: 460000 }
      ],
      serieReceita: [
        { mes: 'abr', weinc: 4.1, weinvest: 1.4, nos: 0.5, casawe: 0.3 },
        { mes: 'mai', weinc: 4.8, weinvest: 1.5, nos: 0.6, casawe: 0.3 },
        { mes: 'jun', weinc: 5.2, weinvest: 1.6, nos: 0.7, casawe: 0.4 },
        { mes: 'jul', weinc: 5.0, weinvest: 1.7, nos: 0.7, casawe: 0.4 },
        { mes: 'ago', weinc: 5.9, weinvest: 1.8, nos: 0.8, casawe: 0.4 },
        { mes: 'set', weinc: 6.2, weinvest: 1.9, nos: 0.84, casawe: 0.46 }
      ]
    },
    incorporadora: {
      geral: {
        kpis: [
          { rotulo: 'Unidades vendidas (mês)', valor: '14', delta: -18, nota: 'meta 18' },
          { rotulo: 'Ticket médio', valor: 'R$ 416 mil', delta: 4, nota: 'vs. agosto' },
          { rotulo: 'Leads qualificados', valor: '287', delta: 22, nota: 'últimos 30 dias' },
          { rotulo: 'Custo por lead', valor: 'R$ 71', delta: -16, nota: 'meta até R$ 85' }
        ],
        funil: [
          { etapa: 'Leads', valor: 1240 },
          { etapa: 'Qualificados', valor: 287 },
          { etapa: 'Visitas', valor: 96 },
          { etapa: 'Propostas', valor: 38 },
          { etapa: 'Vendas', valor: 14 }
        ]
      },
      bioma: {
        kpis: [
          { rotulo: 'Estoque disponível', valor: '58 de 96', delta: 0, nota: 'Fase 2' },
          { rotulo: 'Velocidade de vendas', valor: '14 lotes/mês', delta: -8, nota: 'meta 18' },
          { rotulo: 'VGV da fase', valor: 'R$ 39,9 mi', delta: 0, nota: '96 lotes' },
          { rotulo: 'Obra concluída', valor: '72%', delta: 5, nota: 'infra e paisagismo' }
        ],
        vendasMes: [
          { mes: 'abr', valor: 9 }, { mes: 'mai', valor: 11 }, { mes: 'jun', valor: 16 },
          { mes: 'jul', valor: 13 }, { mes: 'ago', valor: 17 }, { mes: 'set', valor: 14 }
        ]
      },
      vicente: {
        kpis: [
          { rotulo: 'Estoque disponível', valor: '22 de 64', delta: 0, nota: 'torre única' },
          { rotulo: 'Velocidade de vendas', valor: '5 un./mês', delta: 25, nota: 'meta 4' },
          { rotulo: 'VGV do empreendimento', valor: 'R$ 61,4 mi', delta: 0, nota: '64 unidades' },
          { rotulo: 'Obra concluída', valor: '41%', delta: 3, nota: 'estrutura' }
        ],
        vendasMes: [
          { mes: 'abr', valor: 3 }, { mes: 'mai', valor: 4 }, { mes: 'jun', valor: 4 },
          { mes: 'jul', valor: 6 }, { mes: 'ago', valor: 4 }, { mes: 'set', valor: 5 }
        ]
      }
    },
    clientes: {
      kpis: [
        { rotulo: 'Base ativa', valor: '412', delta: 8, nota: 'clientes com contrato' },
        { rotulo: 'Leads no mês', valor: '1.240', delta: 22, nota: 'todas as origens' },
        { rotulo: 'Taxa de conversão', valor: '1,1%', delta: -0.2, nota: 'lead → venda' },
        { rotulo: 'NPS', valor: '71', delta: 4, nota: 'última apuração' }
      ],
      origem: [
        { origem: 'Meta Ads', valor: 486 },
        { origem: 'Corretor parceiro', valor: 312 },
        { origem: 'Indicação', valor: 224 },
        { origem: 'Portal imobiliário', valor: 138 },
        { origem: 'Prospecção ativa', valor: 80 }
      ],
      faixaEtaria: [
        { faixa: '25–34', valor: 18 }, { faixa: '35–44', valor: 37 },
        { faixa: '45–54', valor: 28 }, { faixa: '55+', valor: 17 }
      ]
    },
    performance: {
      weinc: { entregaNoPrazo: 78, demandasAbertas: 24, atrasadas: 5, sprintConcluido: 71, pessoas: 22 },
      weinvest: { entregaNoPrazo: 64, demandasAbertas: 9, atrasadas: 3, sprintConcluido: 55, pessoas: 6 },
      nos: { entregaNoPrazo: 85, demandasAbertas: 12, atrasadas: 2, sprintConcluido: 80, pessoas: 14 },
      casawe: { entregaNoPrazo: 91, demandasAbertas: 5, atrasadas: 0, sprintConcluido: 88, pessoas: 6 }
    }
  };

  /* ------------------------------------------------- opções dos formulários */
  const OPCOES = {
    empresasPedido: ['Grupo We', 'We Inc', 'WeInvest', 'Nós Gastronomia', 'CasaWE'],
    motivoCompra: ['Evento', 'Equipamento', 'Manutenção', 'Outro'],
    ocasiaoCoffe: ['Reunião', 'Fechamento', 'Parceiro', 'Visita técnica', 'Outro'],
    locais: ['Sala de reunião principal', 'Sala Douglas', 'Sala de atendimento 1', 'Sala de atendimento 2', 'Sala de atendimento 3', 'Sala de atendimento 4', 'Sala de reuniões pocket'],
    cardapios: [
      { id: 'cafe', nome: 'Café', descricao: 'Café, água, chá e biscoito amanteigado.' },
      { id: 'premium1', nome: 'Coffee Premium — opção 1', descricao: 'Café, sucos, pães de queijo, mini sanduíches e frutas.' },
      { id: 'premium2', nome: 'Coffee Premium — opção 2', descricao: 'Café, sucos, salgados assados, bolo e tábua de frios.' },
      { id: 'jantar1', nome: 'Jantar — opção 1', descricao: 'Entrada, prato principal com guarnição e sobremesa.' },
      { id: 'jantar2', nome: 'Jantar — opção 2', descricao: 'Coquetel volante com seis tipos de canapé e sobremesa.' }
    ],
    tipoEvento: ['Posicionamento de marca', 'Lançamento', 'Relacionamento', 'Parceiros', 'Marco da jornada', 'Evento interno da equipe', 'Outro'],
    /* Formato de alimentação, comunicação, recursos, empresas do pedido e
       locais aceitam item novo digitado no próprio formulário — pedidos.js
       grava o acréscimo. Por isso "Outro" saiu destas listas. */
    formatoAlimentacao: ['Não terá', 'Coquetel', 'Jantar', 'Almoço', 'Coffee', 'Apenas bebidas'],
    comunicacao: ['Convites', 'ID visual', 'Registro (foto/vídeo)', 'Redes sociais', 'Sinalização'],
    recursosEvento: ['Espaço', 'Mobiliário', 'Equipamentos de som', 'Projeção', 'Iluminação', 'Estacionamento'],
    tipoDemanda: [
      { id: 'marco', nome: 'Marco', ajuda: 'Ponto de controle do projeto. Não tem esforço próprio.' },
      { id: 'entregavel', nome: 'Entregável', ajuda: 'Resultado concreto que pertence a um marco.' },
      { id: 'tarefa', nome: 'Tarefa', ajuda: 'Trabalho executável por uma pessoa.' },
      { id: 'subtarefa', nome: 'Subtarefa', ajuda: 'Quebra de uma tarefa maior.' }
    ],
    prioridade: ['Alta', 'Média', 'Baixa'],
    anexosCompra: ['Nota fiscal', 'Cupom fiscal', 'Boleto bancário']
  };

  const INTEGRACOES = [
    { nome: 'Omie (ERP)', escopo: 'Financeiro, notas fiscais, contratos', status: 'conectado', ultimaSync: d(0), dono: 'u8' },
    { nome: 'Google Agenda', escopo: 'Agenda do grupo e das salas', status: 'conectado', ultimaSync: d(0), dono: 'u2' },
    { nome: 'CRM comercial', escopo: 'Leads, funil e carteira', status: 'parcial', ultimaSync: d(-1), dono: 'u4' },
    { nome: 'Google Drive', escopo: 'Documentos, fotos e vídeos', status: 'conectado', ultimaSync: d(0), dono: 'u1' },
    { nome: 'WhatsApp Business', escopo: 'Agentes digitais e atendimento', status: 'conectado', ultimaSync: d(0), dono: 'u1' },
    { nome: 'Portal do corretor', escopo: 'Tabelas e material de venda', status: 'pendente', ultimaSync: '—', dono: 'u4' }
  ];

  WB.data = {
    empresas: EMPRESAS, pessoas: PESSOAS, sprints: SPRINTS, demandas: DEMANDAS,
    projetos: PROJETOS, projetosArquivados: PROJETOS_ARQUIVADOS, governanca: GOVERNANCA,
    atas: ATAS, clientes: CLIENTES, links: LINKS, idVisual: ID_VISUAL, galeria: GALERIA,
    corretores: CORRETORES, agentes: AGENTES, colaboradores: COLABORADORES,
    fornecedores: FORNECEDORES, parceiros: PARCEIROS, patrocinadores: PATROCINADORES,
    bens: BENS, cnpjs: CNPJS, contratos: CONTRATOS, agenda: AGENDA, agendas: AGENDAS, news: NEWS,
    notificacoes: NOTIFICACOES, atalhos: ATALHOS, solicitacoes: SOLICITACOES,
    statusReports: STATUS_REPORTS,
    dash: DASH, opcoes: OPCOES, integracoes: INTEGRACOES,
    /* Sinaliza para a interface que nada aqui veio de sistema real. */
    demonstracao: true,
    usuarioAtual: 'u1'
  };

  /* ------------------------------------------------------------ utilitários */
  WB.pessoa = (id) => PESSOAS.find((p) => p.id === id) || { nome: '—', funcao: '' };
  WB.empresa = (id) => EMPRESAS.find((e) => e.id === id) || { nome: 'Grupo We', cor: 'ink' };
  /* ------------------------------------------------------------- projetos
     Ativos, concluídos e arquivados são a mesma coisa vista em situações
     diferentes: uma lista só, um filtro na tela. `WB.projeto` acha qualquer
     um — abrir um projeto encerrado não pode dar "não encontrado". */
  WB.projetosTodos = () => PROJETOS.concat(PROJETOS_ARQUIVADOS);
  WB.projeto = (id) => PROJETOS.find((p) => p.id === id) ||
    PROJETOS_ARQUIVADOS.find((p) => p.id === id) || null;
  WB.projetoAtivo = (p) => !!p && p.status !== 'concluido' && p.status !== 'arquivado';

  /* Prioridade do projeto. Três níveis, decisão do usuário (22/09/2026). A cor
     nunca vai sozinha: a bandeira sempre leva o rótulo junto. */
  WB.PRIORIDADES = [
    { id: 'normal', nome: 'Normal', cor: 'idle' },
    { id: 'alta', nome: 'Alta', cor: 'warn' },
    { id: 'urgente', nome: 'Urgente', cor: 'late' }
  ];
  WB.prioridade = (id) => WB.PRIORIDADES.find((p) => p.id === id) || WB.PRIORIDADES[0];

  /* Situação do projeto para filtro e rótulo. */
  WB.SITUACOES_PROJETO = [
    { id: 'ativos', nome: 'Ativos' },
    { id: 'concluidos', nome: 'Concluídos' },
    { id: 'arquivados', nome: 'Arquivados' },
    { id: 'todos', nome: 'Todos' }
  ];
  WB.filtrarProjetos = function (situacao) {
    const lista = WB.projetosTodos();
    if (situacao === 'todos') return lista.slice();
    if (situacao === 'concluidos') return lista.filter((p) => p.status === 'concluido');
    if (situacao === 'arquivados') return lista.filter((p) => p.status === 'arquivado');
    return lista.filter((p) => WB.projetoAtivo(p));
  };

  /* Completa o que faltar em projeto vindo de semente antiga ou do que a
     pessoa cadastrou: sem isto, editar um documento sem id apagaria o vizinho. */
  function normalizarProjeto(p, i) {
    if (!p || typeof p !== 'object') return p;
    if (!p.status) p.status = 'ativo';
    if (!p.prioridade) p.prioridade = 'normal';
    if (typeof p.progresso !== 'number') p.progresso = 0;
    ['marcos', 'documentos', 'decisoes', 'riscos'].forEach((k) => {
      if (!Array.isArray(p[k])) p[k] = [];
    });
    if (!p.briefing || typeof p.briefing !== 'object') p.briefing = {};
    p.marcos.forEach((m, j) => { if (m && !m.id) m.id = 'mc' + (j + 1); });
    p.documentos.forEach((x, j) => { if (x && !x.id) x.id = 'doc-' + p.id + '-' + (j + 1); });
    p.decisoes.forEach((x, j) => { if (x && !x.id) x.id = 'dec-' + p.id + '-' + (j + 1); });
    p.riscos.forEach((x, j) => { if (x && !x.id) x.id = 'rsk-' + p.id + '-' + (j + 1); });
    if (!p.id) p.id = 'p-' + (i + 1);
    return p;
  }
  WB.normalizarProjetos = function () {
    PROJETOS.forEach(normalizarProjeto);
    PROJETOS_ARQUIVADOS.forEach(normalizarProjeto);
  };

  /* Gravação. A Fase 2 já reidrata projeto NOVO (`reidratarLegado`), mas nada
     guardava a EDIÇÃO de um projeto existente — mudar um prazo, anexar um
     documento ou encerrar um projeto sumia no F5. Aqui vai o estado inteiro
     das duas listas, sob chave própria, e na leitura o gravado vence. */
  const CHAVE_PROJETOS = 'pm.projetos';
  const CHAVE_REPORTS = 'pm.reports';

  WB.salvarProjetos = function () {
    if (!WB.store) return;
    WB.store.set(CHAVE_PROJETOS, { ativos: PROJETOS, arquivados: PROJETOS_ARQUIVADOS });
  };
  WB.salvarReports = function () {
    if (!WB.store) return;
    WB.store.set(CHAVE_REPORTS, WB.data.statusReports);
  };

  function fundir(alvo, salvos) {
    if (!Array.isArray(salvos)) return;
    const indice = {};
    alvo.forEach((x, i) => { if (x && x.id) indice[x.id] = i; });
    salvos.forEach((r) => {
      if (!r || !r.id) return;
      if (indice[r.id] != null) alvo[indice[r.id]] = r;
      else alvo.push(r);
    });
  }

  WB.carregarProjetos = function () {
    if (!WB.store) return;
    const bruto = WB.store.get(CHAVE_PROJETOS, null);
    if (bruto && typeof bruto === 'object') {
      fundir(PROJETOS, bruto.ativos);
      fundir(PROJETOS_ARQUIVADOS, bruto.arquivados);
    }
    const reports = WB.store.get(CHAVE_REPORTS, null);
    if (Array.isArray(reports)) fundir(WB.data.statusReports, reports);
    WB.normalizarProjetos();
    /* Um projeto pode ter sido encerrado nesta sessão: ele muda de lista, não
       de identidade. A lista de ativos não pode continuar mostrando o que já
       foi encerrado. */
    for (let i = PROJETOS.length - 1; i >= 0; i--) {
      if (!WB.projetoAtivo(PROJETOS[i])) PROJETOS_ARQUIVADOS.unshift(PROJETOS.splice(i, 1)[0]);
    }
  };

  /** Encerra um projeto: sai dos ativos, entra nos encerrados, com o termo. */
  WB.encerrarProjeto = function (id, termo, situacao) {
    const i = PROJETOS.findIndex((p) => p.id === id);
    if (i < 0) return null;
    const p = PROJETOS[i];
    p.status = situacao === 'arquivado' ? 'arquivado' : 'concluido';
    p.encerramento = termo;
    p.encerrado = (termo && termo.data) || WB.d(0);
    p.resultado = (termo && termo.resultado) || '';
    p.licoes = (termo && termo.licoes) || '';
    if (p.status === 'concluido') p.progresso = 100;
    PROJETOS.splice(i, 1);
    PROJETOS_ARQUIVADOS.unshift(p);
    WB.salvarProjetos();
    return p;
  };

  /** Reabre um projeto encerrado: volta para os ativos, guardando o termo. */
  WB.reabrirProjeto = function (id) {
    const i = PROJETOS_ARQUIVADOS.findIndex((p) => p.id === id);
    if (i < 0) return null;
    const p = PROJETOS_ARQUIVADOS[i];
    p.status = 'ativo';
    PROJETOS_ARQUIVADOS.splice(i, 1);
    PROJETOS.push(p);
    WB.salvarProjetos();
    return p;
  };
  WB.eu = () => WB.pessoa(WB.data.usuarioAtual);

  /* Quem pode o quê. As fotos dizem "somente p/ Adms e Heads" — diretoria não
     aparece nessas listas, então não entra aqui. Os cinco perfis do login
     (Administrador/Gestor/Equipe/Parceiro/Corretor) ainda não estão unificados
     com estes papéis; quando forem, é este mapa que muda, não cada tela. */
  const PODE = {
    news: ['admin', 'head'],
    comprovante: ['admin', 'head'],
    /* Só a administração escolhe o que fica em destaque no Início (políticas
       e news fixadas), apaga news de outra pessoa e define quem aprova. */
    destaque: ['admin'],
    gerirNews: ['admin'],
    configurarAprovacao: ['admin'],
    // Entregáveis, marcos e as datas deles: decisão da administração.
    entregavel: ['admin', 'diretoria'],
    // PDI e descritivo de cargo são configurados por quem administra.
    desenvolvimento: ['admin', 'diretoria']
  };
  WB.pode = (capacidade) => (PODE[capacidade] || []).indexOf(WB.eu().papel) >= 0;

  /* ------------------------------------------------- situações e hierarquia
     Fonte única das situações e dos tipos de demanda. O módulo do workspace
     carrega estes mapas quando eles existem e mantém uma cópia de reserva
     para rodar isolado nos testes dele. */
  WB.STATUS_DEMANDA = {
    afazer: 'A fazer',
    andamento: 'Em andamento',
    aprovacao: 'Em aprovação',
    revisao: 'Para revisar',
    aprovada: 'Aprovada',
    concluida: 'Concluída'
  };
  // Situação que encerra a demanda: conta como feita nos números e nas barras.
  WB.STATUS_FECHADO = ['aprovada', 'concluida'];
  WB.demandaFechada = (d) => WB.STATUS_FECHADO.indexOf((d || {}).status) >= 0;

  /* `nivel` é a profundidade na hierarquia; `de` diz quem pode criar e mexer.
     Marco e entregável são linha de cronograma: mudam por decisão da
     administração. Tarefa e subtarefa são o trabalho de quem executa. */
  WB.TIPOS_DEMANDA = {
    marco: { nome: 'Marco', nivel: 0, de: ['admin', 'diretoria'], precisaPai: false },
    entregavel: { nome: 'Entregável', nivel: 0, de: ['admin', 'diretoria'], precisaPai: false },
    tarefa: { nome: 'Tarefa', nivel: 1, de: ['admin', 'diretoria', 'head', 'analista'], precisaPai: true },
    subtarefa: { nome: 'Subtarefa', nivel: 2, de: ['admin', 'diretoria', 'head', 'analista'], precisaPai: true }
  };

  /* Quem pode mexer nesta demanda. Entregável e marco: só administração.
     Tarefa e subtarefa: head e diretoria de qualquer uma; analista, nas que
     são dele — as que ele criou ou as que estão sob a responsabilidade dele.
     Devolve o motivo junto, porque a tela precisa dizer por que não deixa. */
  WB.podeEditarDemanda = function (demanda, pessoa) {
    const eu = pessoa || WB.eu();
    if (!demanda || !eu) return { pode: false, motivo: 'Sessão não identificada.' };
    const tipo = WB.TIPOS_DEMANDA[demanda.tipo] || WB.TIPOS_DEMANDA.tarefa;
    if (tipo.de.indexOf(eu.papel) < 0) {
      return { pode: false, motivo: tipo.nome + ' é definido pela administração — fale com a Operações para mudar prazo ou escopo.' };
    }
    if (eu.papel === 'analista' && demanda.responsavel !== eu.id && demanda.criador !== eu.id) {
      return { pode: false, motivo: 'Esta ' + tipo.nome.toLowerCase() + ' é de outra pessoa. Peça ao responsável ou ao head da área.' };
    }
    return { pode: true, motivo: '' };
  };

  /* Mexer numa demanda que outra pessoa abriu avisa quem abriu. É a regra que
     o usuário pediu: ninguém descobre por acaso que a própria demanda mudou
     ou sumiu. Quem mexe na própria não recebe aviso de si mesmo. */
  WB.notificar = function (pessoaId, texto, rota) {
    if (!pessoaId || !texto) return null;
    const n = {
      id: 'nt' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      texto: texto, data: d(0), lida: false, rota: rota || '#/demandas', pessoa: pessoaId
    };
    WB.data.notificacoes.unshift(n);
    WB.store.set('notificacoes', WB.data.notificacoes);
    return n;
  };
  /* Notificação sem `pessoa` é do portal inteiro (as de demonstração são
     assim); com `pessoa`, só quem é dela vê. */
  /* Aviso de quem mexeu na demanda de outra pessoa. É a regra que o usuário
     pediu: quem abriu a demanda fica sabendo que ela mudou, foi comentada ou
     foi apagada — e nunca recebe aviso do que ele mesmo fez.

     `acao` entra no texto como verbo já conjugado ("alterou", "apagou"). O
     nome da demanda vai junto porque, depois de apagada, é só o que resta. */
  WB.avisarCriador = function (demanda, acao, detalhe) {
    if (!demanda) return null;
    const dono = demanda.criador || demanda.responsavel;
    if (!dono || dono === WB.data.usuarioAtual) return null;
    const quem = WB.eu().nome;
    const texto = `${quem} ${acao} a demanda "${demanda.nome}"${detalhe ? ' — ' + detalhe : ''}.`;
    return WB.notificar(dono, texto, '#/demandas');
  };
  WB.minhasNotificacoes = function (pessoaId) {
    const alvo = pessoaId || WB.data.usuarioAtual;
    return (WB.data.notificacoes || []).filter((n) => !n.pessoa || n.pessoa === alvo);
  };

  /* ------------------------------------------------------------- períodos
     Uma só definição de "hoje / semana / mês / ano / geral", usada pela aba de
     indicadores e disponível para o módulo de demandas e solicitações. A
     semana começa na segunda. `intervalo` é a escolha livre de datas.
     Devolve `null` em "geral": sem janela, sem recorte. */
  WB.janelaPeriodo = function (periodo, hoje, de, ate) {
    const base = hoje && /^\d{4}-\d{2}-\d{2}$/.test(hoje) ? hoje : d(0);
    const data = WB.toDate(base);
    const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    if (periodo === 'hoje') return { de: base, ate: base };
    if (periodo === 'semana') {
      const ini = new Date(data); ini.setDate(data.getDate() - ((data.getDay() + 6) % 7));
      const fim = new Date(ini); fim.setDate(ini.getDate() + 6);
      return { de: iso(ini), ate: iso(fim) };
    }
    if (periodo === 'mes') return { de: iso(new Date(data.getFullYear(), data.getMonth(), 1)), ate: iso(new Date(data.getFullYear(), data.getMonth() + 1, 0)) };
    if (periodo === 'ano') return { de: data.getFullYear() + '-01-01', ate: data.getFullYear() + '-12-31' };
    if (periodo === 'intervalo' && (de || ate)) return { de: de || '0000-01-01', ate: ate || '9999-12-31' };
    return null;
  };
  /* Uma demanda entra no período quando o intervalo dela (início → prazo)
     encosta na janela. Sem prazo nem início ela não tem quando: aparece só em
     "geral", em vez de ser empurrada para um dia que ninguém combinou. */
  WB.noPeriodoDemanda = function (demanda, faixa) {
    if (!faixa) return true;
    if (!demanda) return false;
    const ini = demanda.inicio || demanda.prazo;
    const fim = demanda.prazo || demanda.inicio;
    if (!ini || !fim) return false;
    return ini <= faixa.ate && fim >= faixa.de;
  };
  WB.noPeriodoData = function (valor, faixa) {
    if (!faixa) return true;
    return !!valor && valor >= faixa.de && valor <= faixa.ate;
  };

  /* ------------------------------------------- PDI e descritivo de cargo
     Configuração individual, feita por quem administra, que a pessoa vê como
     atalho na aba de indicadores dela. Fica guardada à parte das pessoas —
     `pessoas` é base de demonstração e é recarregada a cada boot; o que a
     administração cadastra tem de sobreviver ao F5.

     `carregar` roda no boot (app.js), depois que `WB.store` existe. */
  WB.desenvolvimento = {
    chave: 'pessoas.desenvolvimento',
    carregar() {
      const guardado = WB.store.get(this.chave, {});
      if (!guardado || typeof guardado !== 'object') return;
      WB.data.pessoas.forEach((p) => {
        const reg = guardado[p.id];
        if (!reg) return;
        if (reg.pdi) p.pdi = reg.pdi;
        if (reg.descritivoCargo) p.descritivoCargo = reg.descritivoCargo;
      });
    },
    salvar(pessoaId, dados) {
      const p = WB.pessoa(pessoaId);
      if (!p || !p.id) return false;
      // Campo em branco apaga o registro: é assim que se tira um PDI vencido.
      p.pdi = dados.pdi && dados.pdi.url ? dados.pdi : null;
      p.descritivoCargo = dados.descritivoCargo && dados.descritivoCargo.url ? dados.descritivoCargo : null;
      const guardado = WB.store.get(this.chave, {}) || {};
      guardado[p.id] = { pdi: p.pdi, descritivoCargo: p.descritivoCargo };
      WB.store.set(this.chave, guardado);
      return true;
    }
  };

  /* Um aviso é "novo" nas primeiras 24 horas. `publicadoEm` guarda a hora exata
     e é o que o mural deve usar. Registro que só tem `data` não permite contar
     24 horas — nesse caso vale o dia da publicação, e a função diz qual dos dois
     critérios usou, para a tela não prometer precisão que não existe. */
  WB.avisoNovo = function (aviso, agora) {
    if (!aviso) return { novo: false, criterio: 'sem registro' };
    // `instanceof Date` falha quando a data vem de outro contexto (iframe, teste).
    const ref = agora && typeof agora.getTime === 'function' ? agora : new Date();
    if (aviso.publicadoEm) {
      const t = new Date(aviso.publicadoEm).getTime();
      if (!isNaN(t)) {
        const horas = (ref.getTime() - t) / 36e5;
        return { novo: horas >= 0 && horas < 24, horas, criterio: 'hora' };
      }
    }
    const hoje = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-${String(ref.getDate()).padStart(2, '0')}`;
    return { novo: String(aviso.data || '').slice(0, 10) === hoje, criterio: 'dia' };
  };

  /* Filtro de sprint, usado pela home e pelo quadro de demandas. `atual` resolve
     para a sprint marcada em SPRINTS; qualquer outro valor é o id da sprint. */
  WB.filtrarPorSprint = function (demandas, sprint) {
    if (!sprint || sprint === 'todas') return (demandas || []).slice();
    const alvo = sprint === 'atual' ? (SPRINTS.find((s) => s.atual) || {}).id : sprint;
    if (!alvo) return [];
    return (demandas || []).filter((x) => x && x.sprint === alvo);
  };
  WB.sprintAtual = () => SPRINTS.find((s) => s.atual);
  WB.empresaNome = (id) => (WB.empresa(id) || {}).nome || 'Grupo We';
  WB.empresaSerie = (id) => (WB.empresa(id) || {}).serie || 's1';

  /* As sementes também passam pela normalização: as telas de projeto contam
     com id em marco, documento, decisão e risco para poder editar um sem
     mexer no vizinho. */
  WB.normalizarProjetos();
})();
