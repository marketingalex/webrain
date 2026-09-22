/* WeBrain — Fase 2: modelo de dados das operações WeInvest e Nós Gastronomia.
   ---------------------------------------------------------------------------
   Este arquivo acrescenta coleções novas sob `WB.data.wi` (WeInvest) e
   `WB.data.nos` (Nós Gastronomia). Nada aqui substitui as coleções da Fase 1:
   `WB.data.clientes`, `WB.data.corretores` e as demais continuam como estão, e
   as telas compartilhadas passam a ler as duas fontes em vez de duplicar
   registros.

   DECISÕES DE IMPLEMENTAÇÃO (não são transcrição das fotos):
   · Base de cálculo dos percentuais de comissão = VALOR NEGOCIADO. As fotos
     mostram "(R$ / %)" sem dizer sobre o que incide o percentual.
   · Comissão líquida é CAMPO EXPLÍCITO, não fórmula. As fotos não definem
     impostos, descontos nem rateio — inventar uma conta seria afirmar regra
     que não existe. A tela só avisa quando os números não fecham.
   · VGV, valor negociado, receita e comissão são campos distintos e nunca são
     somados entre si.
   · Um lead vira cliente quando um NEGÓCIO é registrado com situação
     "vendido". "Em negociação" não converte — as fotos pedem a conversão "ao
     cadastrar venda".
   · Carteira imobiliária (o que o cliente já possui) é coleção própria dentro
     do cliente e nunca entra no resumo de "unidades compradas / VGV comprado",
     que sai só dos negócios vendidos.
   · Margem = preço − custo estimado. Margem % = margem / preço. CMV % =
     custo / preço. Preço ausente ou zero devolve `null` (a tela mostra "sem
     dado"), nunca 0 % nem 100 %.
   · Descontinuar um item do menu preserva o registro e os vínculos. Excluir de
     vez é outra ação, com confirmação separada.
   ========================================================================== */
(function () {
  const WB = (window.WB = window.WB || {});
  const d = WB.d;
  const F2 = (WB.fase2 = WB.fase2 || {});

  /* Versão do formato persistido. Subir este número obriga a migração a rodar
     de novo sobre o que já está gravado. */
  const SCHEMA = 2;
  F2.schema = SCHEMA;

  /* ====================================================== opções de domínio
     Marcadas como `transcrito` quando saem legíveis das fotos e `suposto`
     quando são decisão nossa — a interface mostra essa diferença. */
  const OPC = {
    /* --------------------------------------------------------- WeInvest */
    canalOrigem: { origem: 'suposto', itens: ['Indicação', 'Parceiro', 'Site', 'Instagram', 'Meta Ads', 'Prospecção ativa', 'Evento', 'Portal imobiliário', 'Outro'] },
    categoriaInteresse: { origem: 'transcrito', itens: ['We Premium', 'We Coast', 'We Farm', 'We Global'] },
    leadStatus: { origem: 'suposto', itens: [
      { valor: 'novo', texto: 'Novo' },
      { valor: 'contato', texto: 'Em contato' },
      { valor: 'qualificado', texto: 'Qualificado' },
      { valor: 'negociacao', texto: 'Em negociação' },
      { valor: 'convertido', texto: 'Convertido em cliente' },
      { valor: 'perdido', texto: 'Perdido' }
    ] },
    clienteCategoria: { origem: 'transcrito', itens: [{ valor: 'pf', texto: 'Pessoa física (PF)' }, { valor: 'pj', texto: 'Pessoa jurídica (PJ)' }] },
    classificacao: { origem: 'transcrito', itens: ['Alto padrão', 'Institucional', 'Investidor'] },
    objetivos: { origem: 'transcrito', itens: ['Comprar', 'Vender', 'Investir', 'Gestão patrimonial'] },
    perfilInvestimento: { origem: 'transcrito', itens: ['Conservador', 'Moderado', 'Arrojado'] },
    carteiraStatus: { origem: 'suposto', itens: ['Possui', 'Pretende manter', 'Pretende vender', 'Pretende alugar', 'Alugado', 'Em venda'] },

    ativoStatus: { origem: 'transcrito', itens: [
      { valor: 'disponivel', texto: 'Disponível' },
      { valor: 'indisponivel', texto: 'Indisponível' },
      { valor: 'vendido', texto: 'Vendido' }
    ] },
    ativoCategoria: { origem: 'transcrito', itens: ['We Premium', 'We Coast', 'We Farm', 'We Global'] },
    ativoTipo: { origem: 'transcrito', itens: ['Apartamento', 'Casa', 'Terreno', 'Área para desenvolvimento', 'Fazenda', 'Comercial', 'Galpão logístico', 'Cabana'] },
    ativoOrigem: { origem: 'transcrito', itens: [{ valor: 'weinvest', texto: 'WeInvest' }, { valor: 'parceiro', texto: 'Parceiro' }] },

    parceiroCategoria: { origem: 'transcrito', itens: [{ valor: 'originador', texto: 'Originador' }, { valor: 'externo', texto: 'Parceiro externo' }] },
    parceiroTipo: { origem: 'transcrito', itens: ['Corretor', 'Imobiliária', 'Incorporadora', 'Construtora', 'Consultor', 'Sócio', 'Sócio fundador'] },

    negocioSituacao: { origem: 'suposto', itens: [
      { valor: 'negociacao', texto: 'Em negociação' },
      { valor: 'vendido', texto: 'Venda registrada' },
      { valor: 'perdido', texto: 'Perdido' }
    ] },
    papelParceiro: { origem: 'transcrito', itens: [{ valor: 'originador', texto: 'Originador' }, { valor: 'angariador', texto: 'Angariador' }] },
    negocioFormato: { origem: 'suposto', itens: ['À vista', 'Financiado', 'Permuta', 'Parcelado direto', 'Misto', 'Outro'] },

    /* ------------------------------------------------- Nós Gastronomia */
    itemTipo: { origem: 'transcrito', itens: [{ valor: 'prato', texto: 'Prato' }, { valor: 'bebida', texto: 'Bebida / drink' }] },
    pratoCategoria: { origem: 'transcrito', itens: ['Entrada', 'Principal', 'Sobremesa', 'Acompanhamento'] },
    /* A foto do formulário de bebida está cortada: dá para ler "sem ál…" e
       "café / …". O resto da lista é suposição configurável. */
    bebidaCategoria: { origem: 'parcial', itens: ['Sem álcool', 'Café', 'Drink', 'Cerveja', 'Vinho', 'Destilado', 'Suco', 'Água'] },
    restricoes: { origem: 'transcrito', itens: ['Vegetariano', 'Vegano', 'Sem glúten', 'Sem lactose'] },
    disponibilidade: { origem: 'transcrito', itens: ['Permanente', 'Sazonal', 'Edição limitada'] },
    periodo: { origem: 'transcrito', itens: ['Manhã', 'Tarde', 'Noite'] },
    itemStatus: { origem: 'transcrito', itens: [
      { valor: 'ativo', texto: 'Ativo' },
      { valor: 'teste', texto: 'Em teste' },
      { valor: 'descontinuado', texto: 'Descontinuado' }
    ] },
    atendimentoCanal: { origem: 'transcrito', itens: ['Presencial', 'Telefone', 'Redes sociais', 'Plataforma de avaliação', 'Google'] },
    reclamacaoCategoria: { origem: 'transcrito', itens: ['Atendimento', 'Qualidade da comida / prato', 'Tempo de espera', 'Ambiente', 'Limpeza', 'Preço', 'Outro'] },
    gravidade: { origem: 'transcrito', itens: [{ valor: 'leve', texto: 'Leve' }, { valor: 'moderada', texto: 'Moderada' }, { valor: 'grave', texto: 'Grave' }] },
    reclamacaoStatus: { origem: 'transcrito', itens: [
      { valor: 'aberta', texto: 'Aberta' },
      { valor: 'tratativa', texto: 'Em tratativa' },
      { valor: 'resolvida', texto: 'Resolvida' }
    ] }
  };
  F2.opcoes = OPC;
  /** Lista simples de valores para o `WB.campo`. */
  F2.opc = (nome) => (OPC[nome] || { itens: [] }).itens;
  F2.opcOrigem = (nome) => (OPC[nome] || {}).origem || 'suposto';
  /** Texto de exibição de um valor de opção (aceita string ou {valor,texto}). */
  F2.rotulo = function (nome, valor) {
    const achado = F2.opc(nome).find((o) => (typeof o === 'string' ? o : o.valor) === valor);
    if (!achado) return valor || '—';
    return typeof achado === 'string' ? achado : achado.texto;
  };

  /* ================================================================== IDs
     Prefixados e estáveis. O contador nunca anda para trás: parte do maior
     número já gravado e do que ficou no armazenamento. */
  F2.novoId = function (prefixo, colecao) {
    const re = new RegExp('^' + prefixo + '-(\\d+)$');
    const maior = (colecao || []).reduce((max, x) => {
      const m = re.exec(String((x && x.id) || ''));
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0);
    const chave = 'f2.seq.' + prefixo;
    const proximo = Math.max(maior, WB.store.get(chave, 0)) + 1;
    WB.store.set(chave, proximo);
    return prefixo + '-' + String(proximo).padStart(4, '0');
  };

  /* ========================================================== números
     Nenhum destes devolve zero quando falta dado: devolvem `null`, e a tela
     mostra "sem dado". Um zero inventado vira número em painel. */
  const num = (v) => {
    if (v == null || v === '' || v === '—') return null;
    const n = Number(String(v).replace(/\./g, '').replace(',', '.'));
    return isFinite(n) ? n : null;
  };
  F2.num = num;

  F2.pct = (v, casas) => (v == null ? '—' : Number(v).toFixed(casas == null ? 1 : casas).replace('.', ',') + '%');
  F2.moedaOuVazio = (v) => (num(v) == null ? '—' : WB.moeda(num(v)));

  /** Percentual sobre o valor negociado. Documentado na tela junto do número. */
  F2.percentualSobre = function (parte, base) {
    const p = num(parte), b = num(base);
    if (p == null || b == null || b === 0) return null;
    return (p / b) * 100;
  };

  /** Margem e CMV de um item do menu. Preço ausente ou zero → sem dado. */
  F2.margemItem = function (item) {
    const preco = num(item && item.precoVenda);
    const custo = num(item && item.custoEstimado);
    if (preco == null || custo == null) return { margem: null, margemPct: null, cmvPct: null };
    if (preco === 0) return { margem: preco - custo, margemPct: null, cmvPct: null };
    return { margem: preco - custo, margemPct: ((preco - custo) / preco) * 100, cmvPct: (custo / preco) * 100 };
  };

  /* ============================================================ WEINVEST */
  const LEADS = [
    { id: 'WIL-0001', nome: 'Fernanda Ruiz', telefone: '(45) 99xxx-4417', email: 'fernanda.demo@exemplo.test', canal: 'Meta Ads', categoria: 'We Premium', dataEntrada: d(-12), status: 'qualificado', responsavel: 'u7', observacoes: 'Procura apartamento frente-mar para segunda residência.', clienteId: null },
    { id: 'WIL-0002', nome: 'Ricardo Menezes', telefone: '(45) 99xxx-6654', email: 'ricardo.demo@exemplo.test', canal: 'Parceiro', categoria: 'We Farm', dataEntrada: d(-30), status: 'negociacao', responsavel: 'u4', observacoes: 'Interesse em área para desenvolvimento no oeste do Paraná.', clienteId: null },
    { id: 'WIL-0003', nome: 'Helena Sarmento', telefone: '(45) 99xxx-2001', email: 'helena.demo@exemplo.test', canal: 'Indicação', categoria: 'We Coast', dataEntrada: d(-60), status: 'convertido', responsavel: 'u7', observacoes: 'Indicada pela Construtora Horizonte.', clienteId: 'WIC-0002' },
    { id: 'WIL-0004', nome: 'Otávio Brandt', telefone: '(45) 99xxx-7788', email: 'otavio.demo@exemplo.test', canal: 'Site', categoria: 'We Global', dataEntrada: d(-4), status: 'novo', responsavel: 'u7', observacoes: '', clienteId: null }
  ];

  const CLIENTES_WI = [
    {
      id: 'WIC-0001', categoria: 'pj', nome: 'Ivo Castanho', cpf: '', razaoSocial: 'Construtora Horizonte Ltda.', cnpj: '61.000.000/0001-00',
      whatsapp: '(45) 3xxx-7700', email: 'contato.demo@exemplo.test',
      grupoFamiliar: 'Grupo Horizonte', vinculos: [{ tipo: 'Empresa do mesmo grupo', nome: 'Horizonte Participações S.A.', clienteId: null }],
      descricaoFamiliares: 'Holding familiar de três sócios, segunda geração.',
      responsavel: 'u7', dataEntrada: d(-210),
      comprovacao: { registrado: true, tipo: 'Contrato de prestação de serviço assinado', data: d(-208), obs: 'Documento arquivado fora do WeBrain. Aqui fica apenas o registro de que existe.' },
      classificacao: 'Institucional', canalOrigem: 'Prospecção ativa',
      perfil: {
        objetivos: ['Investir', 'Gestão patrimonial'], regioes: ['Cascavel', 'Foz do Iguaçu'],
        ticketMin: 1500000, ticketMax: 8000000, categorias: ['We Global', 'We Farm'],
        preferencias: 'Ativos geradores de renda, prontos para locação.',
        restricoes: 'Não aceita imóvel em litígio nem área sem matrícula individualizada.',
        perfilInvestimento: 'Moderado'
      },
      historico: {
        interacoes: [
          { data: d(-30), tipo: 'Reunião', texto: 'Apresentação da carteira de galpões logísticos.', autor: 'u7' },
          { data: d(-9), tipo: 'WhatsApp', texto: 'Pediu comparativo de rentabilidade entre dois galpões.', autor: 'u7' }
        ],
        proximosPassos: [{ data: d(6), texto: 'Enviar estudo de rentabilidade do Galpão BR-277.', feito: false }]
      },
      carteira: [
        { id: 'CT-0001', ativoId: null, descricao: 'Sala comercial — Centro, Cascavel (fora da base WeInvest)', status: 'Pretende alugar', observacoes: 'Comprada antes do relacionamento com a WeInvest.' },
        // Esta linha veio de uma compra: o `negocioId` é o que separa o que o
        // cliente já tinha do que ele comprou pela WeInvest.
        { id: 'CT-0002', ativoId: 'WIA-0003', descricao: '', status: 'Possui', observacoes: 'Adquirido pela WeInvest no negócio WIN-0002.', negocioId: 'WIN-0002' }
      ],
      leadId: null, empresa: 'weinvest', criadoEm: d(-210), atualizadoEm: d(-9)
    },
    {
      id: 'WIC-0002', categoria: 'pf', nome: 'Helena Sarmento', cpf: '000.000.000-00', razaoSocial: '', cnpj: '',
      whatsapp: '(45) 99xxx-2001', email: 'helena.demo@exemplo.test',
      grupoFamiliar: 'Família Sarmento', vinculos: [{ tipo: 'Cônjuge', nome: 'Paulo Sarmento', clienteId: null }],
      descricaoFamiliares: 'Casal, dois filhos maiores de idade.',
      responsavel: 'u7', dataEntrada: d(-58),
      comprovacao: { registrado: false, tipo: '', data: '', obs: '' },
      classificacao: 'Alto padrão', canalOrigem: 'Indicação',
      perfil: {
        objetivos: ['Comprar'], regioes: ['Guaratuba', 'Matinhos'],
        ticketMin: 900000, ticketMax: 2200000, categorias: ['We Coast'],
        preferencias: 'Frente-mar, no mínimo três suítes, vista desimpedida.',
        restricoes: 'Não quer térreo nem prédio sem elevador.',
        perfilInvestimento: 'Conservador'
      },
      historico: {
        interacoes: [{ data: d(-40), tipo: 'Visita', texto: 'Visitou o apartamento frente-mar em Guaratuba.', autor: 'u7' }],
        proximosPassos: []
      },
      carteira: [],
      leadId: 'WIL-0003', empresa: 'weinvest', criadoEm: d(-58), atualizadoEm: d(-40)
    }
  ];

  const PARCEIROS_WI = [
    {
      id: 'WIP-0001', categoriaPessoa: 'pj', nome: 'Sandra Muniz', cpf: '', razaoSocial: 'Imobiliária Alvorada Ltda.', cnpj: '62.000.000/0001-00',
      status: 'ativo', categoria: 'externo', tipos: ['Imobiliária', 'Corretor'],
      mercados: ['Cascavel', 'Toledo'], especialidades: ['We Premium', 'We Farm'],
      whatsapp: '(45) 3xxx-1100', email: 'alvorada.demo@exemplo.test', desde: d(-600),
      observacoes: 'Parceria de angariação no oeste do Paraná.'
    },
    {
      id: 'WIP-0002', categoriaPessoa: 'pf', nome: 'Tiago Moretti', cpf: '000.000.000-00', razaoSocial: '', cnpj: '',
      status: 'ativo', categoria: 'originador', tipos: ['Corretor', 'Consultor'],
      mercados: ['Guaratuba', 'Matinhos'], especialidades: ['We Coast'],
      whatsapp: '(41) 99xxx-3322', email: 'tiago.demo@exemplo.test', desde: d(-300),
      observacoes: 'Traz clientes do litoral paranaense.'
    },
    {
      id: 'WIP-0003', categoriaPessoa: 'pj', nome: 'Paulo Grandi', cpf: '', razaoSocial: 'Terra Nova Negócios Imobiliários Ltda.', cnpj: '63.000.000/0001-00',
      status: 'inativo', categoria: 'externo', tipos: ['Imobiliária'],
      mercados: ['Foz do Iguaçu'], especialidades: ['We Global'],
      whatsapp: '(45) 3xxx-9090', email: 'terranova.demo@exemplo.test', desde: d(-900),
      observacoes: 'Sem operação conjunta nos últimos 12 meses.'
    }
  ];

  const ATIVOS = [
    {
      id: 'WIA-0001', titulo: 'Frente-mar Guaratuba — Torre Sul, 1201', status: 'vendido',
      categoria: 'We Coast', tipo: 'Apartamento',
      endereco: 'Av. Atlântica, 1200', municipio: 'Guaratuba', estado: 'PR', coordenadas: '-25.8790, -48.5745',
      precoTotal: 1850000, precoM2: null, area: 182,
      quartos: 3, vagas: 2, particularidades: 'Três suítes, varanda gourmet, vista desimpedida.',
      proprietarios: [{ tipo: 'pessoa', nome: 'Espólio Rodrigues (exemplo)', documento: '', clienteId: null }],
      origem: 'parceiro', parceiroId: 'WIP-0002',
      comissaoPercentual: 5, comissaoCondicao: 'Sobre o valor negociado, paga no ato do contrato.',
      exclusividade: true, exclusividadePrazo: d(120),
      confidencial: false, confidencialPara: [],
      documentos: [{ nome: 'Matrícula 44.221', url: '#', tipo: 'Matrícula' }],
      midia: [{ nome: 'Ensaio fotográfico — 24 fotos', url: '#', tipo: 'Galeria' }],
      observacoes: 'Vendido no negócio WIN-0001.'
    },
    {
      id: 'WIA-0002', titulo: 'Fazenda Santa Vera — 480 ha', status: 'disponivel',
      categoria: 'We Farm', tipo: 'Fazenda',
      endereco: 'Rodovia PR-182, km 42', municipio: 'Assis Chateaubriand', estado: 'PR', coordenadas: '-24.4150, -53.5200',
      precoTotal: 42000000, precoM2: null, area: 4800000,
      quartos: null, vagas: null, particularidades: 'Lavoura mecanizada, sede reformada, dois poços artesianos.',
      proprietarios: [{ tipo: 'empresa', nome: 'Agro Santa Vera Ltda. (exemplo)', documento: '', clienteId: null }],
      origem: 'weinvest', parceiroId: null,
      comissaoPercentual: 3, comissaoCondicao: '',
      exclusividade: true, exclusividadePrazo: d(200),
      confidencial: true, confidencialPara: ['admin', 'diretoria', 'head'],
      documentos: [], midia: [], observacoes: 'Ativo confidencial: proprietário pediu discrição.'
    },
    {
      id: 'WIA-0003', titulo: 'Galpão logístico BR-277 — Módulo B', status: 'vendido',
      categoria: 'We Global', tipo: 'Galpão logístico',
      endereco: 'BR-277, km 580', municipio: 'Cascavel', estado: 'PR', coordenadas: '-24.9550, -53.4552',
      precoTotal: 12400000, precoM2: 3100, area: 4000,
      quartos: null, vagas: 40, particularidades: 'Pé-direito 12 m, doca nivelada, energia trifásica.',
      proprietarios: [{ tipo: 'empresa', nome: 'Logística Oeste S.A. (exemplo)', documento: '', clienteId: null }],
      origem: 'weinvest', parceiroId: null,
      comissaoPercentual: 4, comissaoCondicao: '',
      exclusividade: false, exclusividadePrazo: '',
      confidencial: false, confidencialPara: [],
      documentos: [{ nome: 'Habite-se', url: '#', tipo: 'Licença' }], midia: [], observacoes: ''
    },
    {
      id: 'WIA-0004', titulo: 'Cabana Serra do Mar — Lote 7', status: 'disponivel',
      categoria: 'We Premium', tipo: 'Cabana',
      endereco: 'Estrada da Graciosa, s/n', municipio: 'Morretes', estado: 'PR', coordenadas: '-25.4770, -48.8340',
      precoTotal: 980000, precoM2: null, area: 210,
      quartos: 2, vagas: 2, particularidades: 'Estrutura em madeira laminada, deck com ofurô.',
      proprietarios: [{ tipo: 'pessoa', nome: 'Marina Kupfer (exemplo)', documento: '', clienteId: null }],
      origem: 'parceiro', parceiroId: 'WIP-0001',
      comissaoPercentual: 6, comissaoCondicao: '',
      exclusividade: false, exclusividadePrazo: '',
      confidencial: false, confidencialPara: [],
      documentos: [], midia: [], observacoes: ''
    }
  ];

  const NEGOCIOS = [
    {
      id: 'WIN-0001', clienteId: 'WIC-0002', clienteRepresentante: 'Helena Sarmento',
      ativoId: 'WIA-0001', ativoRepresentante: 'Espólio Rodrigues (exemplo)',
      responsavel: 'u7', semParceiro: false,
      parceiros: [{ parceiroId: 'WIP-0002', papel: 'originador' }],
      situacao: 'vendido', valorNegociado: 1780000, vgv: 1850000, unidades: 1,
      comissaoBrutaValor: 89000, comissaoBrutaPct: 5, comissaoLiquidaValor: 80100,
      comissoes: [
        { id: 'WICM-0001', beneficiario: 'weinvest', parceiroId: null, valor: 53400, percentual: 3, recebido: true, dataRecebimento: d(-35) },
        { id: 'WICM-0002', beneficiario: 'parceiro', parceiroId: 'WIP-0002', valor: 26700, percentual: 1.5, recebido: false, dataRecebimento: '' }
      ],
      formato: 'Financiado', contrato: 'CT-WI-2026-014',
      valorRecebido: 534000, dataFechamento: d(-38),
      leadId: 'WIL-0003', observacoes: '', criadoEm: d(-45), atualizadoEm: d(-35)
    },
    {
      id: 'WIN-0002', clienteId: 'WIC-0001', clienteRepresentante: 'Ivo Castanho',
      ativoId: 'WIA-0003', ativoRepresentante: 'Logística Oeste S.A. (exemplo)',
      responsavel: 'u7', semParceiro: true, parceiros: [],
      situacao: 'vendido', valorNegociado: 12000000, vgv: 12400000, unidades: 1,
      comissaoBrutaValor: 480000, comissaoBrutaPct: 4, comissaoLiquidaValor: null,
      comissoes: [{ id: 'WICM-0003', beneficiario: 'weinvest', parceiroId: null, valor: 480000, percentual: 4, recebido: true, dataRecebimento: d(-88) }],
      formato: 'À vista', contrato: 'CT-WI-2026-009',
      valorRecebido: 12000000, dataFechamento: d(-92),
      leadId: null, observacoes: 'Comissão líquida ainda não informada pelo financeiro.', criadoEm: d(-100), atualizadoEm: d(-88)
    },
    {
      id: 'WIN-0003', clienteId: 'WIC-0001', clienteRepresentante: 'Ivo Castanho',
      ativoId: 'WIA-0002', ativoRepresentante: 'Agro Santa Vera Ltda. (exemplo)',
      responsavel: 'u7', semParceiro: false,
      parceiros: [{ parceiroId: 'WIP-0001', papel: 'angariador' }],
      situacao: 'negociacao', valorNegociado: 39500000, vgv: 42000000, unidades: 1,
      comissaoBrutaValor: null, comissaoBrutaPct: 3, comissaoLiquidaValor: null,
      comissoes: [],
      formato: 'Permuta', contrato: '', valorRecebido: null, dataFechamento: '',
      leadId: 'WIL-0002', observacoes: 'Proposta em análise pelo proprietário.', criadoEm: d(-20), atualizadoEm: d(-6)
    }
  ];

  /* ==================================================== NÓS GASTRONOMIA */
  const ITENS_MENU = [
    {
      id: 'NOSI-0001', tipo: 'prato', nome: 'Costela ao barro com purê de mandioquinha', categoria: 'Principal',
      descricao: 'Costela bovina assada 12 horas, servida na travessa de barro com purê de mandioquinha e farofa de coentro.',
      foto: '', servePessoas: 2, tempoPreparo: 25,
      ingredientes: 'Costela bovina, mandioquinha, manteiga, coentro, farinha de mandioca, alho.',
      restricoes: ['Sem glúten'],
      precoVenda: 168, custoEstimado: 54,
      disponibilidade: 'Permanente', periodos: ['Noite'],
      status: 'ativo', responsavel: 'u6', criadoEm: d(-240), descontinuadoEm: '', motivoDescontinuacao: ''
    },
    {
      id: 'NOSI-0002', tipo: 'prato', nome: 'Risoto de funghi com trufa branca', categoria: 'Principal',
      descricao: 'Arroz carnaroli, mix de funghi secchi, finalizado com azeite trufado.',
      foto: '', servePessoas: 1, tempoPreparo: 20,
      ingredientes: 'Arroz carnaroli, funghi secchi, vinho branco, parmesão, azeite trufado.',
      restricoes: ['Vegetariano', 'Sem glúten'],
      precoVenda: 96, custoEstimado: 38,
      disponibilidade: 'Permanente', periodos: ['Tarde', 'Noite'],
      status: 'ativo', responsavel: 'u6', criadoEm: d(-200), descontinuadoEm: '', motivoDescontinuacao: ''
    },
    {
      id: 'NOSI-0003', tipo: 'prato', nome: 'Tartare de atum com manga', categoria: 'Entrada',
      descricao: 'Atum fresco em cubos, manga, gengibre e crocante de arroz.',
      foto: '', servePessoas: 1, tempoPreparo: 12,
      ingredientes: 'Atum, manga, gengibre, shoyu, arroz.', restricoes: ['Sem lactose'],
      precoVenda: 72, custoEstimado: 34,
      disponibilidade: 'Sazonal', periodos: ['Noite'],
      status: 'teste', responsavel: 'u6', criadoEm: d(-25), descontinuadoEm: '', motivoDescontinuacao: ''
    },
    {
      id: 'NOSI-0004', tipo: 'prato', nome: 'Bobó de camarão da casa', categoria: 'Principal',
      descricao: 'Camarão sete-barbas, creme de mandioca e azeite de dendê.',
      foto: '', servePessoas: 2, tempoPreparo: 30,
      ingredientes: 'Camarão, mandioca, leite de coco, dendê, coentro.', restricoes: [],
      precoVenda: 154, custoEstimado: 72,
      disponibilidade: 'Permanente', periodos: ['Tarde', 'Noite'],
      status: 'descontinuado', responsavel: 'u6', criadoEm: d(-400), descontinuadoEm: d(-30),
      motivoDescontinuacao: 'Fornecedor de camarão sem regularidade de entrega.'
    },
    {
      id: 'NOSI-0005', tipo: 'bebida', nome: 'Negroni da casa', categoria: 'Drink',
      descricao: 'Gim artesanal, vermute rosso e bitter, com casca de laranja queimada.',
      foto: '', servePessoas: null, tempoPreparo: null,
      ingredientes: 'Gim, vermute rosso, bitter, laranja.', restricoes: [],
      precoVenda: 48, custoEstimado: 15,
      disponibilidade: 'Permanente', periodos: ['Noite'],
      status: 'ativo', responsavel: 'u6', criadoEm: d(-180), descontinuadoEm: '', motivoDescontinuacao: ''
    },
    {
      id: 'NOSI-0006', tipo: 'bebida', nome: 'Café coado da serra', categoria: 'Café',
      descricao: 'Grão da Serra do Caparaó, torra média, coado na hora.',
      foto: '', servePessoas: null, tempoPreparo: null,
      ingredientes: 'Café em grão, água filtrada.', restricoes: ['Vegano', 'Sem glúten', 'Sem lactose'],
      precoVenda: 14, custoEstimado: 3,
      disponibilidade: 'Permanente', periodos: ['Manhã', 'Tarde', 'Noite'],
      status: 'ativo', responsavel: 'u6', criadoEm: d(-300), descontinuadoEm: '', motivoDescontinuacao: ''
    },
    {
      id: 'NOSI-0007', tipo: 'bebida', nome: 'Limonada de capim-santo', categoria: 'Sem álcool',
      descricao: 'Limão siciliano, infusão de capim-santo e xarope de agave.',
      foto: '', servePessoas: null, tempoPreparo: null,
      ingredientes: 'Limão siciliano, capim-santo, agave, água com gás.', restricoes: ['Vegano', 'Sem lactose'],
      precoVenda: 0, custoEstimado: 6,
      disponibilidade: 'Sazonal', periodos: ['Tarde'],
      status: 'teste', responsavel: 'u6', criadoEm: d(-10), descontinuadoEm: '', motivoDescontinuacao: ''
    }
  ];

  const ATENDIMENTOS = [
    {
      id: 'NOSA-0001', tipo: 'reclamacao', clienteNome: 'Mesa 12 — cliente não identificado', clienteId: null,
      dataOcorrido: d(-9), canal: 'Presencial', categoria: 'Tempo de espera',
      descricao: 'Prato principal demorou 55 minutos em noite de casa cheia.',
      itemId: 'NOSI-0001', funcionarioId: 'u6', gravidade: 'moderada',
      responsavelResposta: 'u6', acaoTomada: 'Sobremesa cortesia e pedido de desculpas da gerência.',
      status: 'resolvida', dataResolucao: d(-8), registradoPor: 'u6', criadoEm: d(-9)
    },
    {
      id: 'NOSA-0002', tipo: 'reclamacao', clienteNome: 'Avaliação Google — perfil "R. Lima"', clienteId: null,
      dataOcorrido: d(-3), canal: 'Google', categoria: 'Qualidade da comida / prato',
      descricao: 'Risoto chegou com ponto de arroz passado.',
      itemId: 'NOSI-0002', funcionarioId: '', gravidade: 'leve',
      responsavelResposta: 'u6', acaoTomada: 'Resposta pública na avaliação e alinhamento com a cozinha.',
      status: 'tratativa', dataResolucao: '', registradoPor: 'u6', criadoEm: d(-3)
    },
    {
      id: 'NOSA-0003', tipo: 'reclamacao', clienteNome: 'Grupo Sabor & Cia', clienteId: null,
      dataOcorrido: d(-1), canal: 'Telefone', categoria: 'Atendimento',
      descricao: 'Reserva de evento não foi confirmada por escrito.',
      itemId: '', funcionarioId: '', gravidade: 'grave',
      responsavelResposta: '', acaoTomada: '', status: 'aberta', dataResolucao: '',
      registradoPor: 'u6', criadoEm: d(-1)
    },
    {
      id: 'NOSA-0004', tipo: 'elogio', clienteNome: 'Mesa 4 — cliente não identificado', clienteId: null,
      dataOcorrido: d(-6), canal: 'Presencial', categoria: '',
      descricao: 'Elogiou o ponto da costela e a apresentação na travessa de barro.',
      itemId: 'NOSI-0001', funcionarioId: 'u6', gravidade: '',
      responsavelResposta: '', acaoTomada: '', status: '', dataResolucao: '',
      registradoPor: 'u6', criadoEm: d(-6)
    },
    {
      id: 'NOSA-0005', tipo: 'elogio', clienteNome: 'Avaliação Google — perfil "C. Prado"', clienteId: null,
      dataOcorrido: d(-2), canal: 'Google', categoria: '',
      descricao: 'Destacou o Negroni da casa e o atendimento do bar.',
      itemId: 'NOSI-0005', funcionarioId: '', gravidade: '',
      responsavelResposta: '', acaoTomada: '', status: '', dataResolucao: '',
      registradoPor: 'u6', criadoEm: d(-2)
    },
    {
      id: 'NOSA-0006', tipo: 'elogio', clienteNome: 'Mesa 9 — cliente não identificado', clienteId: null,
      dataOcorrido: d(-15), canal: 'Redes sociais', categoria: '',
      descricao: 'Publicou foto do risoto marcando a casa.',
      itemId: 'NOSI-0002', funcionarioId: '', gravidade: '',
      responsavelResposta: '', acaoTomada: '', status: '', dataResolucao: '',
      registradoPor: 'u6', criadoEm: d(-15)
    }
  ];

  WB.data.wi = { leads: LEADS, clientes: CLIENTES_WI, ativos: ATIVOS, parceiros: PARCEIROS_WI, negocios: NEGOCIOS };
  WB.data.nos = { itens: ITENS_MENU, atendimentos: ATENDIMENTOS };

  /* Pedidos/vendas de itens do menu não aparecem em nenhuma das oito fotos.
     Sem eles, "mais pedidos / menos pedidos" não tem fonte. A coleção existe
     vazia para o ranking dizer "sem dados" em vez de inventar demanda a partir
     de elogios. */
  WB.data.nos.pedidos = [];

  /* ========================================================= PERSISTÊNCIA
     `WB.store` já grava sob `webrain.v1`. A Fase 1 gravava os cadastros mas
     nunca os lia de volta ao abrir — nada sobrevivia a um F5. Aqui a leitura
     existe, para as coleções novas e para as antigas. */

  /* Campos que um registro precisa ter. Registro gravado antes de um campo
     existir recebe o padrão, em vez de quebrar a tela. */
  const PADROES = {
    'wi.leads': { nome: '', telefone: '', email: '', canal: '', categoria: '', dataEntrada: '', status: 'novo', responsavel: '', observacoes: '', clienteId: null },
    'wi.clientes': {
      categoria: 'pf', nome: '', cpf: '', razaoSocial: '', cnpj: '', whatsapp: '', email: '',
      grupoFamiliar: '', vinculos: [], descricaoFamiliares: '', responsavel: '', dataEntrada: '',
      comprovacao: { registrado: false, tipo: '', data: '', obs: '' }, classificacao: '', canalOrigem: '',
      perfil: { objetivos: [], regioes: [], ticketMin: null, ticketMax: null, categorias: [], preferencias: '', restricoes: '', perfilInvestimento: '' },
      historico: { interacoes: [], proximosPassos: [] }, carteira: [], leadId: null, empresa: 'weinvest',
      criadoEm: '', atualizadoEm: ''
    },
    'wi.ativos': {
      titulo: '', status: 'disponivel', categoria: '', tipo: '', endereco: '', municipio: '', estado: '', coordenadas: '',
      precoTotal: null, precoM2: null, area: null, quartos: null, vagas: null, particularidades: '',
      proprietarios: [], origem: 'weinvest', parceiroId: null, comissaoPercentual: null, comissaoCondicao: '',
      exclusividade: false, exclusividadePrazo: '', confidencial: false, confidencialPara: [],
      documentos: [], midia: [], observacoes: ''
    },
    'wi.parceiros': {
      categoriaPessoa: 'pf', nome: '', cpf: '', razaoSocial: '', cnpj: '', status: 'ativo', categoria: 'externo',
      tipos: [], mercados: [], especialidades: [], whatsapp: '', email: '', desde: '', observacoes: ''
    },
    'wi.negocios': {
      clienteId: null, clienteRepresentante: '', ativoId: null, ativoRepresentante: '', responsavel: '',
      semParceiro: false, parceiros: [], situacao: 'negociacao', valorNegociado: null, vgv: null, unidades: 1,
      comissaoBrutaValor: null, comissaoBrutaPct: null, comissaoLiquidaValor: null, comissoes: [],
      formato: '', contrato: '', valorRecebido: null, dataFechamento: '', leadId: null, observacoes: '',
      criadoEm: '', atualizadoEm: ''
    },
    'nos.itens': {
      tipo: 'prato', nome: '', categoria: '', descricao: '', foto: '', servePessoas: null, tempoPreparo: null,
      ingredientes: '', restricoes: [], precoVenda: null, custoEstimado: null, disponibilidade: '',
      periodos: [], status: 'ativo', responsavel: '', criadoEm: '', descontinuadoEm: '', motivoDescontinuacao: ''
    },
    'nos.atendimentos': {
      tipo: 'reclamacao', clienteNome: '', clienteId: null, dataOcorrido: '', canal: '', categoria: '',
      descricao: '', itemId: '', funcionarioId: '', gravidade: '', responsavelResposta: '', acaoTomada: '',
      status: '', dataResolucao: '', registradoPor: '', criadoEm: ''
    }
  };

  /** Completa um registro com os campos que faltam, sem sobrescrever os que já
      vieram. Objetos aninhados são completados em um nível. */
  function migrar(colecao, registro) {
    const padrao = PADROES[colecao];
    if (!padrao || !registro || typeof registro !== 'object') return registro;
    Object.keys(padrao).forEach((k) => {
      const p = padrao[k];
      if (!(k in registro) || registro[k] === undefined) {
        registro[k] = Array.isArray(p) ? [] : (p && typeof p === 'object' ? JSON.parse(JSON.stringify(p)) : p);
        return;
      }
      if (p && typeof p === 'object' && !Array.isArray(p) && registro[k] && typeof registro[k] === 'object') {
        Object.keys(p).forEach((sub) => {
          if (!(sub in registro[k])) registro[k][sub] = Array.isArray(p[sub]) ? [] : p[sub];
        });
      }
    });
    return registro;
  }
  F2.migrar = migrar;

  const CAMINHOS = {
    'wi.leads': () => WB.data.wi.leads,
    'wi.clientes': () => WB.data.wi.clientes,
    'wi.ativos': () => WB.data.wi.ativos,
    'wi.parceiros': () => WB.data.wi.parceiros,
    'wi.negocios': () => WB.data.wi.negocios,
    'nos.itens': () => WB.data.nos.itens,
    'nos.atendimentos': () => WB.data.nos.atendimentos
  };
  F2.colecao = (nome) => (CAMINHOS[nome] ? CAMINHOS[nome]() : []);

  /** Grava a coleção inteira. Chamado depois de criar, editar ou remover. */
  F2.salvar = function (nome) {
    WB.store.set('f2.' + nome, { v: SCHEMA, itens: F2.colecao(nome) });
  };

  /** Lê o que estiver gravado e funde com as sementes: mesmo id = o gravado
      vence (é a edição do usuário); id novo entra no topo. */
  function carregarColecao(nome) {
    const bruto = WB.store.get('f2.' + nome, null);
    if (!bruto) return;
    const itens = Array.isArray(bruto) ? bruto : (bruto && Array.isArray(bruto.itens) ? bruto.itens : null);
    if (!itens) return;
    const alvo = F2.colecao(nome);
    const indice = {};
    alvo.forEach((x, i) => { indice[x.id] = i; });
    itens.forEach((r) => {
      if (!r || !r.id) return;
      migrar(nome, r);
      if (indice[r.id] != null) alvo[indice[r.id]] = r;
      else alvo.push(r);
    });
    // A ordem gravada é a que o usuário viu por último.
    const ordem = {};
    itens.forEach((r, i) => { if (r && r.id) ordem[r.id] = i; });
    alvo.sort((a, b) => {
      const ia = ordem[a.id], ib = ordem[b.id];
      if (ia == null && ib == null) return 0;
      if (ia == null) return 1;
      if (ib == null) return -1;
      return ia - ib;
    });
  }

  /* Coleções da Fase 1 que eram gravadas com `WB.store.push` e nunca lidas de
     volta. Sem isto, tudo que a pessoa cadastrava sumia ao recarregar. */
  function reidratarLegado(chave, alvo) {
    const salvos = WB.store.get(chave, null);
    if (!Array.isArray(salvos) || !Array.isArray(alvo)) return;
    const vistos = {};
    alvo.forEach((x) => { if (x && x.id) vistos[x.id] = true; });
    // `push` insere no topo: o mais novo é o primeiro. Percorrendo de trás
    // para a frente e inserindo no topo, a ordem original volta.
    for (let i = salvos.length - 1; i >= 0; i--) {
      const r = salvos[i];
      if (!r || !r.id || vistos[r.id]) continue;
      alvo.unshift(r);
      vistos[r.id] = true;
    }
  }

  F2.carregar = function () {
    Object.keys(CAMINHOS).forEach(carregarColecao);
    reidratarLegado('clientes', WB.data.clientes);
    reidratarLegado('demandas', WB.data.demandas);
    reidratarLegado('projetos', WB.data.projetos);
    reidratarLegado('solicitacoes', WB.data.solicitacoes);
    reidratarLegado('news', WB.data.news);
    const atalhos = WB.store.get('atalhos', null);
    if (Array.isArray(atalhos) && atalhos.length) WB.data.atalhos = atalhos;
    WB.store.set('f2.schema', SCHEMA);
  };

  /* ====================================================== busca de registro */
  const acha = (lista, id) => (id ? (lista || []).find((x) => x.id === id) || null : null);
  F2.lead = (id) => acha(WB.data.wi.leads, id);
  F2.cliente = (id) => acha(WB.data.wi.clientes, id);
  F2.ativo = (id) => acha(WB.data.wi.ativos, id);
  F2.parceiro = (id) => acha(WB.data.wi.parceiros, id);
  F2.negocio = (id) => acha(WB.data.wi.negocios, id);
  F2.item = (id) => acha(WB.data.nos.itens, id);
  F2.atendimento = (id) => acha(WB.data.nos.atendimentos, id);

  /** Nome de exibição de um cliente WeInvest, conforme PF ou PJ. */
  F2.nomeCliente = function (c) {
    if (!c) return '—';
    return c.categoria === 'pj' ? (c.razaoSocial || c.nome || '—') : (c.nome || c.razaoSocial || '—');
  };
  F2.nomeParceiro = function (p) {
    if (!p) return '—';
    return p.categoriaPessoa === 'pj' ? (p.razaoSocial || p.nome || '—') : (p.nome || p.razaoSocial || '—');
  };

  /* ================================================== escopo de visualização
     Confidencialidade filtra listas e busca, mas isto é FRONTEND: quem abrir o
     arquivo lê tudo. A tela diz isso onde o filtro aparece. */
  F2.podeVerAtivo = function (ativo, papel) {
    if (!ativo || !ativo.confidencial) return true;
    const p = papel || WB.eu().papel;
    const lista = ativo.confidencialPara && ativo.confidencialPara.length
      ? ativo.confidencialPara : ['admin', 'diretoria', 'head'];
    return lista.indexOf(p) >= 0;
  };
  F2.ativosVisiveis = function (papel) {
    return WB.data.wi.ativos.filter((a) => F2.podeVerAtivo(a, papel));
  };

  /* ============================================================ INDICADORES
     Todos saem dos registros. Nenhum número fixo, nenhum denominador
     implícito: cada fórmula está escrita aqui e repetida na tela. */

  /** Negócios com venda registrada. Negociação em aberto não conta como venda. */
  F2.vendas = () => WB.data.wi.negocios.filter((n) => n.situacao === 'vendido');

  /** Resumo do cliente: sai só das vendas registradas dele. A carteira
      preexistente NÃO entra aqui — são coisas diferentes. */
  F2.resumoCliente = function (clienteId) {
    const vendas = F2.vendas().filter((n) => n.clienteId === clienteId);
    const vgv = vendas.reduce((s, n) => s + (num(n.vgv) || 0), 0);
    const negociado = vendas.reduce((s, n) => s + (num(n.valorNegociado) || 0), 0);
    const unidades = vendas.reduce((s, n) => s + (num(n.unidades) || 1), 0);
    return {
      vendas: vendas.length,
      unidades: vendas.length ? unidades : null,
      vgvComprado: vendas.length ? vgv : null,
      valorNegociado: vendas.length ? negociado : null,
      emNegociacao: WB.data.wi.negocios.filter((n) => n.clienteId === clienteId && n.situacao === 'negociacao').length
    };
  };

  /** Performance de parceiro. Denominadores declarados:
      · taxa de conversão = negócios vendidos ÷ negócios em que participou
        (não é lead→venda: o parceiro não é dono do lead).
      · volume gerado = soma do valor negociado dos negócios vendidos.
      · angariações = ativos cuja origem é este parceiro. */
  F2.performanceParceiro = function (parceiroId) {
    const participa = (n) => (n.parceiros || []).some((p) => p.parceiroId === parceiroId);
    const negocios = WB.data.wi.negocios.filter(participa);
    const vendidos = negocios.filter((n) => n.situacao === 'vendido');
    const angariacoes = WB.data.wi.ativos.filter((a) => a.origem === 'parceiro' && a.parceiroId === parceiroId);
    const comissoes = [];
    WB.data.wi.negocios.forEach((n) => {
      (n.comissoes || []).forEach((c) => {
        if (c.beneficiario === 'parceiro' && c.parceiroId === parceiroId) comissoes.push({ negocio: n, comissao: c });
      });
    });
    const soma = (lista, campo) => lista.reduce((s, x) => s + (num(x[campo]) || 0), 0);
    return {
      negocios: negocios.length,
      vendas: vendidos.length,
      conversao: negocios.length ? (vendidos.length / negocios.length) * 100 : null,
      volumeGerado: vendidos.length ? soma(vendidos, 'valorNegociado') : null,
      vgvVendido: vendidos.length ? soma(vendidos, 'vgv') : null,
      angariacoes: angariacoes.length,
      ativosOriginados: angariacoes,
      clientesIndicados: WB.data.wi.clientes.filter((c) => (c.vinculos || []).some((v) => v.parceiroId === parceiroId)),
      comissoesPrevistas: comissoes.reduce((s, x) => s + (num(x.comissao.valor) || 0), 0),
      comissoesRecebidas: comissoes.filter((x) => x.comissao.recebido).reduce((s, x) => s + (num(x.comissao.valor) || 0), 0),
      comissoes
    };
  };

  /** Comissão prevista × recebida de um negócio. Nada aqui é deduzido: se a
      comissão líquida não foi informada, devolve `null`. */
  F2.resumoComissoes = function (negocio) {
    const linhas = (negocio && negocio.comissoes) || [];
    const prevista = linhas.reduce((s, c) => s + (num(c.valor) || 0), 0);
    const recebida = linhas.filter((c) => c.recebido).reduce((s, c) => s + (num(c.valor) || 0), 0);
    const bruta = num(negocio && negocio.comissaoBrutaValor);
    return {
      prevista: linhas.length ? prevista : null,
      recebida: linhas.length ? recebida : null,
      aReceber: linhas.length ? prevista - recebida : null,
      bruta,
      liquida: num(negocio && negocio.comissaoLiquidaValor),
      // Aviso, não correção automática: o rateio não está definido nas fotos.
      excedeBruta: bruta != null && linhas.length > 0 && prevista > bruta + 0.005
    };
  };

  /** Valor a receber do negócio: campo explícito, derivado de recebido. */
  F2.aReceber = function (negocio) {
    const total = num(negocio && negocio.valorNegociado);
    const recebido = num(negocio && negocio.valorRecebido);
    if (total == null || recebido == null) return null;
    return total - recebido;
  };

  /** Contagem de elogios e reclamações por item do menu. */
  F2.contadoresItem = function (itemId) {
    const lista = WB.data.nos.atendimentos.filter((a) => a.itemId === itemId);
    return {
      elogios: lista.filter((a) => a.tipo === 'elogio').length,
      reclamacoes: lista.filter((a) => a.tipo === 'reclamacao').length,
      reclamacoesAbertas: lista.filter((a) => a.tipo === 'reclamacao' && a.status !== 'resolvida').length
    };
  };

  /** Ranking de pedidos. Sem a coleção de pedidos, devolve `null` — o painel
      mostra estado sem dados em vez de usar elogios como proxy de demanda. */
  F2.rankingPedidos = function () {
    const pedidos = WB.data.nos.pedidos || [];
    if (!pedidos.length) return null;
    const conta = {};
    pedidos.forEach((p) => { conta[p.itemId] = (conta[p.itemId] || 0) + (num(p.quantidade) || 1); });
    return Object.keys(conta)
      .map((id) => ({ item: F2.item(id), quantidade: conta[id] }))
      .filter((x) => x.item)
      .sort((a, b) => b.quantidade - a.quantidade);
  };

  /** CMV médio do cardápio ativo, ponderado só pelo que tem preço e custo. */
  F2.cmvCardapio = function (tipo) {
    const itens = WB.data.nos.itens.filter((i) =>
      i.status !== 'descontinuado' && (!tipo || i.tipo === tipo));
    const comDados = itens.filter((i) => {
      const m = F2.margemItem(i);
      return m.cmvPct != null;
    });
    if (!comDados.length) return { media: null, itens: itens.length, comDados: 0 };
    const soma = comDados.reduce((s, i) => s + F2.margemItem(i).cmvPct, 0);
    return { media: soma / comDados.length, itens: itens.length, comDados: comDados.length };
  };

  /* ================================================ visão unificada clientes
     A tela "Clientes e leads" da Fase 1 lê `WB.data.clientes`. Os registros da
     WeInvest ficam na coleção própria — em vez de copiá-los para lá, a tela
     compartilhada projeta as duas fontes. Um registro, uma origem. */
  F2.clientesUnificados = function () {
    const base = WB.data.clientes.map((c) => Object.assign({ origemRegistro: 'grupo' }, c));
    const wiClientes = WB.data.wi.clientes.map((c) => {
      const r = F2.resumoCliente(c.id);
      return {
        id: c.id, nome: F2.nomeCliente(c), tipo: 'cliente', empresa: 'weinvest',
        produto: (c.perfil.categorias || []).join(', ') || '—',
        origem: c.canalOrigem || '—', etapa: c.classificacao || '—',
        valor: r.vgvComprado, responsavel: c.responsavel, desde: c.dataEntrada,
        telefone: c.whatsapp || '—', origemRegistro: 'weinvest', rota: '#/wi/cliente/' + c.id
      };
    });
    const wiLeads = WB.data.wi.leads.filter((l) => l.status !== 'convertido').map((l) => ({
      id: l.id, nome: l.nome, tipo: 'lead', empresa: 'weinvest',
      produto: l.categoria || '—', origem: l.canal || '—',
      etapa: F2.rotulo('leadStatus', l.status), valor: 0, responsavel: l.responsavel,
      desde: l.dataEntrada, telefone: l.telefone || '—', origemRegistro: 'weinvest', rota: '#/wi/leads'
    }));
    return base.concat(wiClientes, wiLeads);
  };
})();
