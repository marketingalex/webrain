/* WeBrain — Administrativo: os seis registros do menu (contratos,
   colaboradores, fornecedores e parceiros, patrocinadores, bens adquiridos e
   CNPJs).
   ---------------------------------------------------------------------------
   Este arquivo é o dono do MODELO desses seis cadastros. As telas ficam em
   `adm-views.js` e os formulários em `adm-forms.js`. Sem estes três arquivos
   carregados, o portal volta exatamente às tabelas somente-leitura de
   `views.js` — nada aqui substitui coleção da Fase 1 nem da Fase 2.

   DECISÕES QUE NÃO SE LEEM NO CÓDIGO (usuário, 21/09/2026):
   · "De qual obra / grupo" é LISTA FECHADA, mas acrescentável: quem cadastra
     escolhe entre as obras e empresas conhecidas e pode registrar uma nova pela
     própria opção "Outro (digitar)". O valor novo passa a valer para os
     próximos cadastros — por isso as listas são persistidas.
   · Os dados pessoais do colaborador (CPF, CNPJ, PIX, endereço, telefone,
     e-mail) EXISTEM como colunas da planilha, mas nascem desmarcadas no seletor
     de colunas. Quem precisa, marca.
   · Fornecedor e parceiro são o MESMO registro, separados pelo campo `classe`.
     Era isso que o pedido descrevia ("um botão de adicionar aqui no fornecedor
     um novo parceiro").

   O QUE ESTE PROTÓTIPO NÃO FAZ: nada é lido nem gravado em sistema externo. Os
   links de contrato são endereços que a pessoa cola; o portal só redireciona.
   ========================================================================== */
(function () {
  const WB = (window.WB = window.WB || {});
  const A = (WB.adm = WB.adm || {});
  const d = WB.d;
  const SCHEMA = 1;

  /* ================================================================ LISTAS
     Base de cada lista fechada. O que o usuário acrescentar fica no
     localStorage e entra depois da base, sem sobrescrevê-la. */
  const LISTAS = {
    contratoCategoria: ['Obra e execução', 'Publicidade e mídia', 'Jurídico', 'Fornecimento',
      'Locação', 'Serviços', 'Tecnologia', 'Consultoria', 'Patrocínio', 'Outro'],
    contratoVinculo: ['Bioma', 'Vicente by We', 'Grupo We', 'We Incorporadora', 'WeInvest',
      'Nós Gastronomia', 'CasaWE'],
    contratoStatus: ['vigente', 'vencido', 'em assinatura'],
    contratacao: ['CLT', 'PJ'],
    colaboradorStatus: ['ativo', 'afastado', 'desligado'],
    setor: ['Diretoria', 'Comercial', 'Marketing', 'Operações', 'Financeiro', 'Administrativo', 'Obra'],
    fornecedorClasse: ['Fornecedor', 'Parceiro'],
    fornecedorCategoria: ['Mobiliário', 'Publicidade', 'Mídia exterior', 'Alimentos', 'Manutenção',
      'Arquitetura', 'Jurídico', 'Tecnologia', 'Construção', 'Serviços gerais'],
    fornecedorStatus: ['ativo', 'inativo', 'em homologação'],
    patrocinioCota: ['Master', 'Ouro', 'Prata', 'Bronze', 'Apoio', 'Permuta'],
    patrocinioStatus: ['confirmado', 'negociação', 'em assinatura', 'encerrado', 'cancelado'],
    bemStatus: ['em uso', 'em estoque', 'em manutenção', 'vendido', 'baixado'],
    bemEstado: ['novo', 'bom', 'regular', 'ruim', 'inservível'],
    bemLocal: ['Sede We Inc', 'CasaWE', 'Stand Bioma', 'Restaurante Nós', 'Depósito', 'Com o colaborador'],
    cnpjRegime: ['Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'MEI'],
    cnpjSituacao: ['ativa', 'suspensa', 'baixada', 'em abertura']
  };
  A.listasBase = LISTAS;

  /* O mecanismo de lista fechada porém acrescentável nasceu aqui e subiu para
     `ui.js` quando o comercial precisou do mesmo comportamento. Estas duas
     funções continuam existindo porque `adm-forms.js` e `adm-views.js` chamam
     por elas — mas quem manda agora é `WB.lista`. */
  WB.registrarListas(LISTAS);
  A.lista = (nome) => WB.lista(nome);
  A.acrescentarOpcao = (nome, valor) => WB.acrescentarOpcao(nome, valor);

  /* O que o usuário já tinha acrescentado ficou gravado na chave antiga.
     Levar para a nova uma única vez evita que essas opções sumam da tela. */
  (function migrarListasGravadas() {
    const antigas = WB.store.get('adm.listas', null);
    if (!antigas || typeof antigas !== 'object') return;
    const novas = WB.store.get('listas.extras', {});
    Object.keys(antigas).forEach((k) => {
      if (!Array.isArray(antigas[k])) return;
      const destino = Array.isArray(novas[k]) ? novas[k] : [];
      antigas[k].forEach((v) => { if (v && destino.indexOf(v) < 0) destino.push(v); });
      novas[k] = destino;
    });
    WB.store.set('listas.extras', novas);
    WB.store.set('adm.listas', null);
  })();

  /* ============================================================ CONTRATOS */
  const CONTRATOS = [
    { id: 'CTR-0001', categoria: 'Obra e execução', vinculo: 'Bioma', descritivo: 'Mobiliário do stand de vendas', parte: 'Marcenaria Kunz', empresa: 'weinc', valor: 143000, inicio: d(-45), fim: d(20), status: 'vigente', reajuste: 'não se aplica', link: 'https://drive.google.com/drive/my-drive', observacoes: '', extras: {} },
    { id: 'CTR-0002', categoria: 'Publicidade e mídia', vinculo: 'Bioma', descritivo: 'Verba de publicidade — setembro a dezembro', parte: 'Agência Norte Criativa', empresa: 'weinc', valor: 380000, inicio: d(-30), fim: d(75), status: 'vigente', reajuste: 'IPCA anual', link: 'https://drive.google.com/drive/my-drive', observacoes: '', extras: {} },
    { id: 'CTR-0003', categoria: 'Publicidade e mídia', vinculo: 'Bioma', descritivo: 'Locação de 6 pontos OOH na BR-277 e Av. Brasil', parte: 'OOH Paraná Mídia', empresa: 'weinc', valor: 96000, inicio: d(-5), fim: d(85), status: 'em assinatura', reajuste: 'não se aplica', link: '', observacoes: 'Minuta em revisão no jurídico.', extras: {} },
    { id: 'CTR-0004', categoria: 'Fornecimento', vinculo: 'Nós Gastronomia', descritivo: 'Fornecimento de insumos — tabela trimestral', parte: 'Distribuidora Boa Mesa', empresa: 'nos', valor: null, inicio: d(-120), fim: d(245), status: 'vigente', reajuste: 'tabela trimestral', link: '', observacoes: 'Sem valor fechado: o contrato é por tabela.', extras: {} },
    { id: 'CTR-0005', categoria: 'Jurídico', vinculo: 'Grupo We', descritivo: 'Assessoria jurídica mensal', parte: 'Escritório Barros & Dias', empresa: 'grupo', valor: 14500, inicio: d(-365), fim: d(-5), status: 'vencido', reajuste: 'IPCA anual', link: 'https://drive.google.com/drive/my-drive', observacoes: 'Renovação em negociação.', extras: {} },
    { id: 'CTR-0006', categoria: 'Obra e execução', vinculo: 'Vicente by We', descritivo: 'Projeto arquitetônico do apartamento decorado', parte: 'Arq. Helena Vilar', empresa: 'weinc', valor: 72000, inicio: d(-70), fim: d(110), status: 'vigente', reajuste: 'não se aplica', link: '', observacoes: '', extras: {} },
    { id: 'CTR-0007', categoria: 'Locação', vinculo: 'CasaWE', descritivo: 'Locação do salão de eventos', parte: 'Imobiliária Centro', empresa: 'casawe', valor: 9800, inicio: d(-200), fim: '', status: 'vigente', reajuste: 'IGP-M anual', link: '', observacoes: 'Prazo indeterminado — sem data de fim.', extras: {} }
  ];

  /* ========================================================= COLABORADORES
     Nome, cargo, empresa e setor continuam saindo de `WB.data.pessoas`: são as
     mesmas pessoas que aparecem como responsáveis no portal inteiro. O que este
     cadastro acrescenta é o lado administrativo do vínculo. */
  const DETALHE = {
    u1: { contratacao: 'CLT', admissao: d(-1240), telefone: '(45) 99912-0101', cpf: '048.221.330-12', endereco: 'Rua Paraná, 1200 — Centro, Cascavel/PR', pix: 'marketing@weinc.imb.br' },
    u2: { contratacao: 'CLT', admissao: d(-980), telefone: '(45) 99912-0202', cpf: '051.774.220-45', endereco: 'Av. Brasil, 4410 — Centro, Cascavel/PR', pix: '(45) 99912-0202' },
    u3: { contratacao: 'PJ', admissao: d(-2100), telefone: '(45) 99912-0303', cpf: '033.118.990-08', cnpj: '61.717.181/0001-90', razaoSocial: 'DF Gestão e Participações Ltda.', endereco: 'Rua Sete de Setembro, 980 — Centro, Cascavel/PR', pix: '61.717.181/0001-90' },
    u4: { contratacao: 'PJ', admissao: d(-760), telefone: '(45) 99912-0404', cpf: '062.550.110-77', cnpj: '72.828.292/0001-11', razaoSocial: 'RT Consultoria Comercial Ltda.', endereco: 'Rua Manaus, 2300 — Alto Alegre, Cascavel/PR', pix: '72.828.292/0001-11' },
    u5: { contratacao: 'CLT', admissao: d(-430), telefone: '(45) 99912-0505', cpf: '078.331.440-20', endereco: 'Rua Recife, 145 — Country, Cascavel/PR', pix: '078.331.440-20' },
    u6: { contratacao: 'CLT', admissao: d(-610), telefone: '(45) 99912-0606', cpf: '069.902.330-51', endereco: 'Rua Souza Naves, 3100 — Centro, Cascavel/PR', pix: 'juliana.prado@nos.com.br' },
    u7: { contratacao: 'PJ', admissao: d(-520), telefone: '(45) 99912-0707', cpf: '081.223.550-63', cnpj: '83.939.303/0001-22', razaoSocial: 'BS Serviços Financeiros Ltda.', endereco: 'Av. Tancredo Neves, 700 — Cascavel/PR', pix: '83.939.303/0001-22' },
    u8: { contratacao: 'CLT', admissao: d(-300), telefone: '(45) 99912-0808', cpf: '090.447.220-31', endereco: 'Rua Erechim, 560 — Neva, Cascavel/PR', pix: '090.447.220-31' }
  };

  function colaboradorDePessoa(p) {
    const x = DETALHE[p.id] || {};
    return {
      id: p.id, nome: p.nome, cargo: p.funcao, empresa: p.empresa, setor: p.setor,
      contratacao: x.contratacao || 'CLT', admissao: x.admissao || d(-365), desligamento: '',
      status: 'ativo', telefone: x.telefone || '', email: p.email || '',
      endereco: x.endereco || '', cpf: x.cpf || '', cnpj: x.cnpj || '',
      razaoSocial: x.razaoSocial || '', pix: x.pix || '', link: '', observacoes: '', extras: {}
    };
  }

  const COLABORADORES = (WB.data.pessoas || []).map(colaboradorDePessoa).concat([
    { id: 'col-ex1', nome: 'Patrícia Nunes', cargo: 'Analista de Marketing', empresa: 'weinc', setor: 'Marketing', contratacao: 'CLT', admissao: d(-820), desligamento: d(-95), status: 'desligado', telefone: '(45) 99912-0909', email: '', endereco: 'Rua Rio Grande do Sul, 88 — Cascavel/PR', cpf: '055.660.110-04', cnpj: '', razaoSocial: '', pix: '055.660.110-04', link: '', observacoes: 'Pedido de demissão.', extras: {} },
    { id: 'col-ex2', nome: 'Rogério Maffei', cargo: 'Chef de cozinha', empresa: 'nos', setor: 'Operações', contratacao: 'PJ', admissao: d(-640), desligamento: d(-40), status: 'desligado', telefone: '(45) 99912-1010', email: '', endereco: 'Rua Pernambuco, 1450 — Cascavel/PR', cpf: '044.909.770-15', cnpj: '94.040.414/0001-33', razaoSocial: 'RM Gastronomia Ltda.', pix: '94.040.414/0001-33', link: '', observacoes: 'Encerramento de contrato PJ.', extras: {} },
    { id: 'col-af1', nome: 'Silvana Ritter', cargo: 'Auxiliar administrativo', empresa: 'casawe', setor: 'Administrativo', contratacao: 'CLT', admissao: d(-380), desligamento: '', status: 'afastado', telefone: '(45) 99912-1111', email: '', endereco: 'Rua Curitiba, 210 — Cascavel/PR', cpf: '066.110.330-88', cnpj: '', razaoSocial: '', pix: '066.110.330-88', link: '', observacoes: 'Afastamento previdenciário desde o mês passado.', extras: {} }
  ]);

  /* ============================================ FORNECEDORES E PARCEIROS */
  const FORNECEDORES = [
    { id: 'FOR-0001', nome: 'Marcenaria Kunz', classe: 'Fornecedor', categoria: 'Mobiliário', cnpj: '11.222.333/0001-44', contatoNome: 'Elias Kunz', contatoTelefone: '(45) 99811-0001', empresa: 'weinc', endereco: 'Rua das Indústrias, 320 — Distrito Industrial, Cascavel/PR', status: 'ativo', link: 'https://drive.google.com/drive/my-drive', observacoes: '', extras: {} },
    { id: 'FOR-0002', nome: 'Agência Norte Criativa', classe: 'Fornecedor', categoria: 'Publicidade', cnpj: '22.333.444/0001-55', contatoNome: 'Bianca Ferri', contatoTelefone: '(45) 99811-0002', empresa: 'weinc', endereco: 'Av. Brasil, 6100 — Centro, Cascavel/PR', status: 'ativo', link: 'https://drive.google.com/drive/my-drive', observacoes: '', extras: {} },
    { id: 'FOR-0003', nome: 'OOH Paraná Mídia', classe: 'Fornecedor', categoria: 'Mídia exterior', cnpj: '33.444.555/0001-66', contatoNome: 'Marcos Lauer', contatoTelefone: '(41) 99811-0003', empresa: 'weinc', endereco: 'Rua XV de Novembro, 1500 — Curitiba/PR', status: 'em homologação', link: '', observacoes: 'Contrato em assinatura (CTR-0003).', extras: {} },
    { id: 'FOR-0004', nome: 'Distribuidora Boa Mesa', classe: 'Fornecedor', categoria: 'Alimentos', cnpj: '44.555.666/0001-77', contatoNome: 'Célia Roldão', contatoTelefone: '(45) 99811-0004', empresa: 'nos', endereco: 'Rod. BR-277, km 580 — Cascavel/PR', status: 'ativo', link: '', observacoes: '', extras: {} },
    { id: 'FOR-0005', nome: 'TecnoClima Refrigeração', classe: 'Fornecedor', categoria: 'Manutenção', cnpj: '55.666.777/0001-88', contatoNome: 'Ivan Prestes', contatoTelefone: '(45) 99811-0005', empresa: 'casawe', endereco: 'Rua Minas Gerais, 77 — Cascavel/PR', status: 'inativo', link: '', observacoes: 'Sem atendimento desde o último chamado.', extras: {} },
    { id: 'FOR-0006', nome: 'Arq. Helena Vilar', classe: 'Parceiro', categoria: 'Arquitetura', cnpj: '66.777.888/0001-99', contatoNome: 'Helena Vilar', contatoTelefone: '(45) 99811-0006', empresa: 'weinc', endereco: 'Rua Osvaldo Cruz, 410 — Cascavel/PR', status: 'ativo', link: 'https://drive.google.com/drive/my-drive', observacoes: 'Projeto do stand e do decorado.', extras: {} },
    { id: 'FOR-0007', nome: 'Escritório Barros & Dias', classe: 'Parceiro', categoria: 'Jurídico', cnpj: '77.888.999/0001-10', contatoNome: 'Renata Dias', contatoTelefone: '(45) 99811-0007', empresa: 'grupo', endereco: 'Av. Barão do Rio Branco, 900 — Cascavel/PR', status: 'ativo', link: '', observacoes: 'Contratos e regularização.', extras: {} },
    { id: 'FOR-0008', nome: 'Vinícola Serra Alta', classe: 'Parceiro', categoria: 'Alimentos', cnpj: '88.999.111/0001-21', contatoNome: 'Tiago Bertoldi', contatoTelefone: '(54) 99811-0008', empresa: 'nos', endereco: 'Linha Leopoldina, s/n — Bento Gonçalves/RS', status: 'ativo', link: '', observacoes: 'Carta de vinhos dos eventos.', extras: {} }
  ];

  /* ======================================================= PATROCINADORES */
  const PATROCINADORES = [
    { id: 'PAT-0001', nome: 'Banco Regional Sul', projeto: 'Lançamento Bioma Fase 2', cota: 'Master', valor: 120000, contatoNome: 'Rodrigo Sales', contatoTelefone: '(45) 99700-0001', empresa: 'weinc', status: 'confirmado', link: 'https://drive.google.com/drive/my-drive', observacoes: '', extras: {} },
    { id: 'PAT-0002', nome: 'Concessionária Vetor', projeto: 'Lançamento Bioma Fase 2', cota: 'Ouro', valor: 60000, contatoNome: 'Aline Petri', contatoTelefone: '(45) 99700-0002', empresa: 'weinc', status: 'confirmado', link: '', observacoes: '', extras: {} },
    { id: 'PAT-0003', nome: 'Construtora Horizonte', projeto: 'Encontro de investidores', cota: 'Prata', valor: 25000, contatoNome: 'Ivo Castanho', contatoTelefone: '(45) 99700-0003', empresa: 'weinvest', status: 'negociação', link: '', observacoes: 'Proposta enviada, sem retorno.', extras: {} },
    { id: 'PAT-0004', nome: 'Cervejaria Vale Verde', projeto: 'Festival Nós na CasaWE', cota: 'Permuta', valor: 18000, contatoNome: 'Débora Lang', contatoTelefone: '(45) 99700-0004', empresa: 'nos', status: 'em assinatura', link: '', observacoes: 'Permuta em produto, valor estimado.', extras: {} }
  ];

  /* ======================================================= BENS ADQUIRIDOS */
  const BENS = [
    { id: 'BEM-0001', descricao: 'Notebook Dell Latitude 5440', patrimonio: 'WE-0182', empresa: 'weinc', aquisicao: d(-300), venda: '', valorPago: 7400, valorVendido: null, status: 'em uso', local: 'Sede We Inc', estado: 'bom', link: '', observacoes: '', extras: {} },
    { id: 'BEM-0002', descricao: 'Forno combinado Rational', patrimonio: 'NOS-0034', empresa: 'nos', aquisicao: d(-60), venda: '', valorPago: 68000, valorVendido: null, status: 'em uso', local: 'Restaurante Nós', estado: 'novo', link: '', observacoes: '', extras: {} },
    { id: 'BEM-0003', descricao: 'Mobiliário do stand — lote 1', patrimonio: 'WE-0219', empresa: 'weinc', aquisicao: d(-14), venda: '', valorPago: 143000, valorVendido: null, status: 'em estoque', local: 'Stand Bioma', estado: 'novo', link: '', observacoes: 'Montagem prevista para a abertura do stand.', extras: {} },
    { id: 'BEM-0004', descricao: 'Projetor Epson 5050', patrimonio: 'CW-0007', empresa: 'casawe', aquisicao: d(-420), venda: d(-25), valorPago: 12900, valorVendido: 7200, status: 'vendido', local: 'CasaWE', estado: 'regular', link: '', observacoes: 'Vendido após a troca do equipamento.', extras: {} },
    { id: 'BEM-0005', descricao: 'Drone DJI Mavic 3', patrimonio: 'WE-0143', empresa: 'weinc', aquisicao: d(-500), venda: '', valorPago: 21000, valorVendido: null, status: 'em manutenção', local: 'Depósito', estado: 'regular', link: '', observacoes: 'Troca de gimbal.', extras: {} }
  ];

  /* ================================================================ CNPJS */
  const CNPJS = [
    { id: 'CNP-0001', razao: 'We Incorporadora Ltda.', fantasia: 'We Inc', cnpj: '10.101.101/0001-01', empresa: 'weinc', regime: 'Lucro Presumido', abertura: d(-2600), endereco: 'Av. Brasil, 5100 — Centro, Cascavel/PR', situacao: 'ativa', link: 'https://drive.google.com/drive/my-drive', observacoes: '', extras: {} },
    { id: 'CNP-0002', razao: 'WeInvest Gestão Patrimonial Ltda.', fantasia: 'WeInvest', cnpj: '20.202.202/0001-02', empresa: 'weinvest', regime: 'Lucro Real', abertura: d(-1400), endereco: 'Av. Brasil, 5100, sala 8 — Centro, Cascavel/PR', situacao: 'ativa', link: '', observacoes: '', extras: {} },
    { id: 'CNP-0003', razao: 'Nós Gastronomia e Eventos Ltda.', fantasia: 'Nós Gastronomia', cnpj: '30.303.303/0001-03', empresa: 'nos', regime: 'Simples Nacional', abertura: d(-700), endereco: 'Rua Souza Naves, 3100 — Centro, Cascavel/PR', situacao: 'ativa', link: '', observacoes: '', extras: {} },
    { id: 'CNP-0004', razao: 'CasaWE Administração de Espaços Ltda.', fantasia: 'CasaWE', cnpj: '40.404.404/0001-04', empresa: 'casawe', regime: 'Simples Nacional', abertura: d(-500), endereco: 'Rua Paraná, 2400 — Centro, Cascavel/PR', situacao: 'ativa', link: '', observacoes: '', extras: {} },
    { id: 'CNP-0005', razao: 'Bioma Empreendimentos SPE Ltda.', fantasia: 'SPE Bioma', cnpj: '50.505.505/0001-05', empresa: 'weinc', regime: 'Lucro Presumido', abertura: d(-900), endereco: 'Av. Brasil, 5100 — Centro, Cascavel/PR', situacao: 'ativa', link: '', observacoes: 'SPE da obra Bioma.', extras: {} }
  ];

  /* As coleções antigas tinham menos campos e nenhum id. Substituí-las aqui
     mantém `WB.data.<coleção>` como fonte única: quem já lia esses nomes
     continua lendo, agora com o registro completo. */
  WB.data.contratos = CONTRATOS;
  WB.data.colaboradores = COLABORADORES;
  WB.data.fornecedores = FORNECEDORES;
  WB.data.patrocinadores = PATROCINADORES;
  WB.data.bens = BENS;
  WB.data.cnpjs = CNPJS;

  /* ========================================================== PERSISTÊNCIA */
  const PADROES = {
    contratos: { categoria: '', vinculo: '', descritivo: '', parte: '', empresa: '', valor: null, inicio: '', fim: '', status: 'vigente', reajuste: '', link: '', observacoes: '', extras: {} },
    colaboradores: { nome: '', cargo: '', empresa: '', setor: '', contratacao: 'CLT', admissao: '', desligamento: '', status: 'ativo', telefone: '', email: '', endereco: '', cpf: '', cnpj: '', razaoSocial: '', pix: '', link: '', observacoes: '', extras: {} },
    fornecedores: { nome: '', classe: 'Fornecedor', categoria: '', cnpj: '', contatoNome: '', contatoTelefone: '', empresa: '', endereco: '', status: 'ativo', link: '', observacoes: '', extras: {} },
    patrocinadores: { nome: '', projeto: '', cota: '', valor: null, contatoNome: '', contatoTelefone: '', empresa: '', status: 'negociação', link: '', observacoes: '', extras: {} },
    bens: { descricao: '', patrimonio: '', empresa: '', aquisicao: '', venda: '', valorPago: null, valorVendido: null, status: 'em uso', local: '', estado: '', link: '', observacoes: '', extras: {} },
    cnpjs: { razao: '', fantasia: '', cnpj: '', empresa: '', regime: '', abertura: '', endereco: '', situacao: 'ativa', link: '', observacoes: '', extras: {} }
  };

  /** Completa o registro gravado com os campos que ele ainda não tinha. */
  A.migrar = function (nome, registro) {
    const padrao = PADROES[nome];
    if (!padrao || !registro || typeof registro !== 'object') return registro;
    Object.keys(padrao).forEach((k) => {
      if (k in registro && registro[k] !== undefined) return;
      const p = padrao[k];
      registro[k] = (p && typeof p === 'object' && !Array.isArray(p)) ? {} : (Array.isArray(p) ? [] : p);
    });
    if (!registro.extras || typeof registro.extras !== 'object') registro.extras = {};
    return registro;
  };

  const CAMINHOS = {
    contratos: () => WB.data.contratos,
    colaboradores: () => WB.data.colaboradores,
    fornecedores: () => WB.data.fornecedores,
    patrocinadores: () => WB.data.patrocinadores,
    bens: () => WB.data.bens,
    cnpjs: () => WB.data.cnpjs
  };
  A.tabelas = Object.keys(CAMINHOS);
  A.colecao = (nome) => (CAMINHOS[nome] ? CAMINHOS[nome]() : []);

  A.salvar = function (nome) {
    WB.store.set('adm.' + nome, { v: SCHEMA, itens: A.colecao(nome) });
  };

  /** Insere ou atualiza pelo id, grava e devolve o registro. */
  A.gravar = function (nome, registro) {
    const lista = A.colecao(nome);
    A.migrar(nome, registro);
    let achou = false;
    for (let i = 0; i < lista.length; i++) {
      if (lista[i].id === registro.id) { lista[i] = registro; achou = true; break; }
    }
    if (!achou) lista.unshift(registro);
    A.salvar(nome);
    return registro;
  };

  A.remover = function (nome, id) {
    const lista = A.colecao(nome);
    for (let i = 0; i < lista.length; i++) {
      if (lista[i].id === id) { lista.splice(i, 1); A.salvar(nome); return true; }
    }
    return false;
  };

  A.registro = function (nome, id) {
    return A.colecao(nome).find((x) => x.id === id) || null;
  };

  const PREFIXO = { contratos: 'CTR', colaboradores: 'COL', fornecedores: 'FOR', patrocinadores: 'PAT', bens: 'BEM', cnpjs: 'CNP' };

  /** Id novo que nunca anda para trás, mesmo depois de excluir registros. */
  A.novoId = function (nome) {
    const p = PREFIXO[nome] || 'REG';
    const re = new RegExp('^' + p + '-(\\d+)$');
    const maior = A.colecao(nome).reduce((max, r) => {
      const m = re.exec(String((r && r.id) || ''));
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0);
    const proximo = Math.max(maior, WB.store.get('adm.seq.' + nome, 0)) + 1;
    WB.store.set('adm.seq.' + nome, proximo);
    return p + '-' + String(proximo).padStart(4, '0');
  };

  /** Lê o que estiver gravado e funde com as sementes: mesmo id = o gravado
      vence; id novo entra no fim; a ordem gravada é a que a pessoa viu. */
  function carregarColecao(nome) {
    const bruto = WB.store.get('adm.' + nome, null);
    const itens = Array.isArray(bruto) ? bruto : (bruto && Array.isArray(bruto.itens) ? bruto.itens : null);
    if (!itens) return;
    const alvo = A.colecao(nome);
    const indice = {};
    alvo.forEach((x, i) => { indice[x.id] = i; });
    itens.forEach((r) => {
      if (!r || !r.id) return;
      A.migrar(nome, r);
      if (indice[r.id] != null) alvo[indice[r.id]] = r;
      else alvo.push(r);
    });
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

  A.carregar = function () {
    A.tabelas.forEach(carregarColecao);
    WB.store.set('adm.schema', SCHEMA);
  };

  /* ======================================================= COLUNAS EXTRAS
     "Adicionar coluna" cria um campo novo NESTE cadastro, para todos os
     registros dele. O valor mora em `registro.extras[chave]` e é preenchido na
     ficha. Excluir a coluna some com ela da planilha e da ficha; os valores já
     digitados continuam no registro e voltam se a coluna for recriada com o
     mesmo nome. */
  const chaveExtra = (titulo) => 'x_' + String(titulo).trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  A.colunasExtras = function (tabela) {
    const todas = WB.store.get('adm.extras', {});
    return Array.isArray(todas[tabela]) ? todas[tabela] : [];
  };

  A.criarColuna = function (tabela, titulo) {
    const t = String(titulo == null ? '' : titulo).trim();
    if (!t) return null;
    const k = chaveExtra(t);
    if (k === 'x_') return null;
    const todas = WB.store.get('adm.extras', {});
    const lista = Array.isArray(todas[tabela]) ? todas[tabela] : [];
    if (lista.some((c) => c.k === k)) return null;
    lista.push({ k, titulo: t });
    todas[tabela] = lista;
    WB.store.set('adm.extras', todas);
    return { k, titulo: t };
  };

  A.excluirColuna = function (tabela, k) {
    const todas = WB.store.get('adm.extras', {});
    const lista = Array.isArray(todas[tabela]) ? todas[tabela] : [];
    todas[tabela] = lista.filter((c) => c.k !== k);
    WB.store.set('adm.extras', todas);
  };

  /* ================================================================ FILTROS
     Ficam guardados: sair da tela e voltar não deve desfazer o recorte. */
  A.filtros = (tabela) => WB.store.get('adm.filtros.' + tabela, {});
  A.definirFiltro = function (tabela, campo, valor) {
    const f = A.filtros(tabela);
    if (valor === '' || valor == null) delete f[campo]; else f[campo] = valor;
    WB.store.set('adm.filtros.' + tabela, f);
  };
  A.limparFiltros = (tabela) => WB.store.set('adm.filtros.' + tabela, {});

  /* Colunas visíveis. `null` = ainda não mexeram, vale o padrão da tela. */
  A.colunasVisiveis = (tabela) => WB.store.get('adm.colunas.' + tabela, null);
  A.definirColunas = (tabela, lista) => WB.store.set('adm.colunas.' + tabela, lista);

  /* ================================================================== URLS
     Endereço colado de fora só vira link clicável se for http(s) ou mailto.
     `javascript:` e afins ficam de fora — link que executa não é link.
     Mora aqui porque as telas e a barra lateral usam a mesma regra. */
  A.urlSegura = function (u) {
    const s = String(u == null ? '' : u).trim();
    if (!s) return '';
    if (/^(https?:|mailto:)/i.test(s)) return s;
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(s)) return 'https://' + s;
    return '';
  };

  /* ============================================================ ERP — OMIE
     O financeiro do grupo vive no Omie, fora do portal. O endereço é colado
     uma vez e passa a valer nos dois lugares: o atalho da barra lateral, que
     abre o ERP direto sem passar por tela nenhuma (pedido do usuário,
     22/09/2026), e o botão da tela do ERP. Fica guardado, e não no código,
     porque é endereço de conta — muda sem que o portal mude. */
  A.omie = () => A.urlSegura(WB.store.get('adm.omie', ''));
  A.definirOmie = function (url) {
    const u = A.urlSegura(url);
    WB.store.set('adm.omie', u);
    return u;
  };
})();
