/* WeBrain — Administrativo: as seis telas em formato de planilha.
   ---------------------------------------------------------------------------
   Uma função monta todas: `planilha()`. O que muda de tela para tela é a
   definição das colunas, dos filtros e dos indicadores. Assim contratos,
   colaboradores, fornecedores, patrocinadores, bens e CNPJs têm exatamente o
   mesmo cabeçalho, a mesma barra de filtros, o mesmo seletor de colunas e a
   mesma forma de editar — que é o que o pedido chamou de "formato de planilha".

   O QUE CADA PARTE FAZ
   · Cabeçalho: mesmo padrão das telas da Fase 2 (etiqueta, título, resumo,
     botões de ação) seguido dos indicadores da tela.
   · Filtros: selects montados a partir dos valores que existem no cadastro.
     Ficam guardados por tela; trocar um deles redesenha a lista.
   · Colunas: todo campo do cadastro pode ser mostrado ou escondido, e dá para
     CRIAR coluna nova (campo livre, guardado em `registro.extras`).
   · Situação: select direto na célula. Mudar ali grava na hora — é o caminho
     curto pedido ("mudar o status se eu quiser"). A ficha completa e o
     formulário continuam existindo para o resto.
   · Busca da tabela: é a busca padrão de `WB.tabela`, que filtra no DOM já
     desenhado — o texto digitado não se perde e o foco não salta.

   Este arquivo SUBSTITUI `WB.views.adm`. Sem ele, as tabelas antigas de
   `views.js` continuam valendo.
   ========================================================================== */
(function () {
  const WB = (window.WB = window.WB || {});
  const A = WB.adm;
  if (!A) return; // sem adm-data.js não há o que desenhar
  const esc = WB.esc;
  const V = (WB.views = WB.views || {});

  const dataBR = (iso) => (iso ? WB.fmtDataCurta(iso) : '—');
  const texto = (v) => (v == null || v === '' ? '—' : v);
  /* Valor vazio NÃO é zero. Devolvendo 0 aqui, a linha sem valor ia para o
     começo da ordenação crescente; devolvendo vazio, ela fica no fim nas duas
     direções, que é a regra da tabela do portal (ui.js, chaveOrdem). */
  const ordNum = (v) => (v == null || v === '' ? '' : Number(v));
  const empresaNome = (id) => (id === 'grupo' || !id ? 'Grupo We' : WB.empresaNome(id));
  const empresaOpcoes = () => [{ valor: 'grupo', texto: 'Grupo We' }]
    .concat((WB.data.empresas || []).map((e) => ({ valor: e.id, texto: e.nome })));

  /* Só http(s) e mailto viram link clicável. A regra é uma só, e mora em
     `adm-data.js`, porque a barra lateral e a tela do ERP usam a mesma. */
  const urlSegura = A.urlSegura;

  /* Tom do chip/― da situação. Mesma paleta dos chips do portal. */
  const TOM = {
    vigente: 'ok', ativo: 'ok', ativa: 'ok', confirmado: 'ok', 'em uso': 'ok', novo: 'ok', bom: 'ok',
    'em assinatura': 'warn', negociação: 'warn', 'em homologação': 'warn', afastado: 'warn',
    'em manutenção': 'warn', 'em estoque': 'warn', 'em abertura': 'warn', regular: 'warn', suspensa: 'warn',
    vencido: 'late', inativo: 'late', desligado: 'late', cancelado: 'late', baixada: 'late',
    ruim: 'late', inservível: 'late',
    vendido: 'info', encerrado: 'idle', baixado: 'idle'
  };
  const tom = (v) => TOM[v] || 'idle';
  const maiuscula = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '—');

  /* ---------------------------------------------------------- cabeçalho */
  function cabecalho(o) {
    return WB.cabecalho(o);
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

  /* ================================================ COLUNAS REUTILIZÁVEIS */

  /** Situação editável na própria célula. */
  function colSituacao(tabela, cfg) {
    const campo = cfg.campo || 'status';
    return {
      k: campo, titulo: cfg.titulo || 'Situação', fixa: true, bruto: true,
      ord: (r) => r[campo] || '',
      valor: (r) => {
        const atual = r[campo] || '';
        return `<span class="admsit admsit--${tom(atual)}">
          <select class="admsit__sel" data-adm-status="${esc(tabela)}|${esc(campo)}|${esc(r.id)}" aria-label="Situação deste registro">
            ${A.lista(cfg.lista).map((v) => `<option value="${esc(v)}"${v === atual ? ' selected' : ''}>${esc(maiuscula(v))}</option>`).join('')}
          </select></span>`;
      }
    };
  }

  /** Coluna de redirecionamento: link clicável, ou o caminho para colar um. */
  function colLink(tabela, cfg) {
    return {
      k: 'link', titulo: cfg.titulo || 'Contrato', ordenavel: false, bruto: true,
      valor: (r) => {
        const u = urlSegura(r.link);
        if (u) return `<a class="admlink" href="${esc(u)}" target="_blank" rel="noopener">${WB.icon('link', 14)} Abrir</a>`;
        return `<button class="btn btn--sm btn--ghost" data-acao="adm-editar" data-adm-tabela="${esc(tabela)}" data-id="${esc(r.id)}">Colar link</button>`;
      }
    };
  }

  function colAcoes(tabela) {
    return {
      k: '__acoes', titulo: 'Ações', ordenavel: false, fixa: true, bruto: true,
      valor: (r) => `<span class="admacoes">
        <button class="btn btn--sm" data-acao="adm-ficha" data-adm-tabela="${esc(tabela)}" data-id="${esc(r.id)}">Abrir</button>
        <button class="btn btn--sm btn--ghost" data-acao="adm-editar" data-adm-tabela="${esc(tabela)}" data-id="${esc(r.id)}">Editar</button>
      </span>`
    };
  }

  const colId = (rotulo) => ({
    k: 'id', titulo: rotulo || 'Nº', padrao: false, bruto: true,
    valor: (r) => `<span class="mono">${esc(r.id)}</span>`
  });

  /* ============================================================ PLANILHA */

  /* O painel de colunas é um <details>. Guardar se ele está aberto evita que
     ele feche a cada marcação — a tela é redesenhada a cada mudança. */
  let painelColunas = '';

  function montarColunas(tabela, definidas) {
    const extras = A.colunasExtras(tabela).map((c) => ({
      k: c.k, titulo: c.titulo, extra: true,
      valor: (r) => texto(r.extras ? r.extras[c.k] : '')
    }));
    return definidas.concat(extras);
  }

  function visiveisDe(tabela, todas) {
    const guardadas = A.colunasVisiveis(tabela);
    return todas.filter((c) => c.fixa || (guardadas ? guardadas.indexOf(c.k) >= 0 : c.padrao !== false));
  }

  function barraColunas(tabela, todas, visiveis) {
    const marcadas = {};
    visiveis.forEach((c) => { marcadas[c.k] = true; });
    const aberto = painelColunas === tabela;
    return `<details class="admcols"${aberto ? ' open' : ''} data-adm-painel="${esc(tabela)}">
      <summary class="btn btn--sm">${WB.icon('grid', 14)} Colunas · ${visiveis.length}/${todas.length}</summary>
      <div class="admcols__pan">
        <p class="admcols__t">Mostrar nesta planilha</p>
        <div class="admcols__lista">
          ${todas.map((c) => `<label class="admcols__it${c.fixa ? ' admcols__it--fixa' : ''}">
            <input type="checkbox" data-adm-col="${esc(tabela)}|${esc(c.k)}"${marcadas[c.k] ? ' checked' : ''}${c.fixa ? ' disabled' : ''}>
            <span>${esc(c.titulo)}</span>
            ${c.extra ? `<button type="button" class="admcols__x" data-adm-excluircoluna="${esc(tabela)}|${esc(c.k)}" aria-label="Excluir a coluna ${esc(c.titulo)}" title="Excluir esta coluna">${WB.icon('x', 12)}</button>` : ''}
          </label>`).join('')}
        </div>
        <button type="button" class="btn btn--sm btn--ghost admcols__nova" data-acao="adm-coluna" data-adm-tabela="${esc(tabela)}">${WB.icon('mais', 13)} Adicionar coluna</button>
        <p class="admcols__nota">Colunas fixas identificam o registro e não podem ser escondidas.</p>
      </div>
    </details>`;
  }

  function barraFiltros(tabela, filtros, base) {
    const atuais = A.filtros(tabela);
    const algum = filtros.some((f) => atuais[f.k]);
    const campos = filtros.map((f) => {
      let opcoes;
      if (f.opcoes) {
        opcoes = f.opcoes();
      } else {
        // Sem lista declarada, as opções são os valores que existem no cadastro.
        const vistos = [];
        base.forEach((r) => {
          const v = f.valor ? f.valor(r) : r[f.k];
          if (v !== '' && v != null && vistos.indexOf(v) < 0) vistos.push(v);
        });
        vistos.sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
        opcoes = vistos.map((v) => ({ valor: v, texto: maiuscula(v) }));
      }
      const atual = atuais[f.k] || '';
      return `<label class="admf">
        <span class="admf__rot">${esc(f.rotulo)}</span>
        <select class="inp admf__sel" data-adm-filtro="${esc(tabela)}|${esc(f.k)}">
          <option value="">${esc(f.todos || 'Todos')}</option>
          ${opcoes.map((o) => {
            const v = typeof o === 'string' ? o : o.valor;
            const t = typeof o === 'string' ? o : o.texto;
            return `<option value="${esc(v)}"${String(v) === String(atual) ? ' selected' : ''}>${esc(t)}</option>`;
          }).join('')}
        </select>
      </label>`;
    }).join('');

    return `<div class="admbar__fs">${campos}
      ${algum ? `<button class="btn btn--sm btn--ghost admbar__limpar" data-adm-limpar="${esc(tabela)}">${WB.icon('x', 13)} Limpar filtros</button>` : ''}
    </div>`;
  }

  function aplicarFiltros(tabela, filtros, base) {
    const atuais = A.filtros(tabela);
    return base.filter((r) => filtros.every((f) => {
      const escolhido = atuais[f.k];
      if (!escolhido) return true;
      const v = f.valor ? f.valor(r) : r[f.k];
      return String(v == null ? '' : v) === String(escolhido);
    }));
  }

  /**
   * Monta a tela inteira de um cadastro.
   * cfg: { tabela, titulo, sub, acoes, indicadores, abas, colunas,
   *        filtros, base, vazioTitulo, vazioTexto, nota }
   */
  function planilha(cfg) {
    const t = cfg.tabela;
    const base = cfg.base || A.colecao(t);
    const todas = montarColunas(t, cfg.colunas);
    const visiveis = visiveisDe(t, todas);
    const linhas = aplicarFiltros(t, cfg.filtros, base);

    const corpo = `<section class="card admcard">
      <div class="admbar">
        ${barraFiltros(t, cfg.filtros, base)}
        <div class="admbar__dir">
          <span class="admbar__conta">${linhas.length === base.length
            ? `${base.length} ${base.length === 1 ? 'registro' : 'registros'}`
            : `${linhas.length} de ${base.length} registros`}</span>
          ${barraColunas(t, todas, visiveis)}
        </div>
      </div>
      <div class="card__body card__body--flush">
        ${WB.tabela(visiveis, linhas, {
          busca: true,
          buscaTexto: cfg.buscaTexto || 'Buscar nesta planilha…',
          vazioTitulo: cfg.vazioTitulo || 'Nenhum registro com esses filtros',
          vazioTexto: cfg.vazioTexto || 'Troque ou limpe os filtros para ver o cadastro inteiro.',
          vazioAcao: `<button class="btn" data-adm-limpar="${esc(t)}">Limpar filtros</button>`
        })}
      </div>
    </section>`;

    return cabecalho({ titulo: cfg.titulo, sub: cfg.sub, acoes: cfg.acoes }) +
      (cfg.indicadores ? kpis(cfg.indicadores) : '') +
      (cfg.abas || '') +
      corpo +
      (cfg.nota || '');
  }

  /* ============================================================ CONTRATOS */
  function telaContratos() {
    const t = 'contratos';
    const base = A.colecao(t);
    const vigentes = base.filter((c) => c.status === 'vigente');
    return planilha({
      tabela: t,
      base,
      titulo: 'Contratos',
      sub: 'Registro dos contratos do grupo: categoria, obra, empresa contratante, vigência e o link do documento.',
      acoes: `<button class="btn btn--primary" data-acao="adm-novo" data-adm-tabela="contratos">${WB.icon('mais', 15)} Adicionar contrato</button>`,
      indicadores: [
        { rotulo: 'Vigentes', valor: String(vigentes.length), nota: 'de ' + base.length + ' contratos' },
        { rotulo: 'Em assinatura', valor: String(base.filter((c) => c.status === 'em assinatura').length), nota: 'aguardando as partes' },
        { rotulo: 'Vencidos', valor: String(base.filter((c) => c.status === 'vencido').length), nota: 'sem renovação registrada' },
        { rotulo: 'Valor dos vigentes', valor: WB.moeda(vigentes.reduce((s, c) => s + (Number(c.valor) || 0), 0)), nota: 'soma dos contratos com valor fechado' }
      ],
      filtros: [
        { k: 'categoria', rotulo: 'Categoria', todos: 'Todas' },
        { k: 'vinculo', rotulo: 'Obra / grupo', todos: 'Todas' },
        { k: 'empresa', rotulo: 'Empresa', todos: 'Todas', opcoes: empresaOpcoes },
        { k: 'status', rotulo: 'Situação', todos: 'Todas' }
      ],
      colunas: [
        colId('Nº'),
        { k: 'categoria', titulo: 'Categoria', valor: (c) => texto(c.categoria) },
        { k: 'vinculo', titulo: 'Obra / grupo', valor: (c) => texto(c.vinculo) },
        { k: 'descritivo', titulo: 'Descritivo', fixa: true, valor: (c) => texto(c.descritivo) },
        { k: 'parte', titulo: 'Contratada', valor: (c) => texto(c.parte) },
        { k: 'empresa', titulo: 'Empresa de referência', valor: (c) => empresaNome(c.empresa) },
        { k: 'valor', titulo: 'Valor', num: true, ord: (c) => ordNum(c.valor), valor: (c) => (c.valor == null || c.valor === '' ? '—' : WB.moeda(c.valor)) },
        { k: 'inicio', titulo: 'Data do contrato', ord: (c) => c.inicio || '', valor: (c) => dataBR(c.inicio) },
        { k: 'fim', titulo: 'Fim', ord: (c) => c.fim || '', valor: (c) => dataBR(c.fim) },
        { k: 'reajuste', titulo: 'Reajuste', padrao: false, valor: (c) => texto(c.reajuste) },
        { k: 'observacoes', titulo: 'Observações', padrao: false, valor: (c) => texto(c.observacoes) },
        colSituacao(t, { lista: 'contratoStatus' }),
        colLink(t, { titulo: 'Contrato' }),
        colAcoes(t)
      ]
    });
  }

  /* ======================================================== COLABORADORES */
  function telaColaboradores(filtro) {
    const t = 'colaboradores';
    const todos = A.colecao(t);
    const guias = [{ id: 'ativos', nome: 'Ativos' }, { id: 'desligados', nome: 'Desligados' }, { id: 'todos', nome: 'Todos' }];
    const f = guias.some((g) => g.id === filtro) ? filtro : 'ativos';
    const base = f === 'todos' ? todos
      : f === 'desligados' ? todos.filter((c) => c.status === 'desligado')
      : todos.filter((c) => c.status !== 'desligado');

    return planilha({
      tabela: t,
      base,
      titulo: 'Colaboradores',
      sub: 'Quem trabalha no grupo, com vínculo, datas e os dados administrativos de cada pessoa.',
      acoes: `<button class="btn btn--primary" data-acao="adm-novo" data-adm-tabela="colaboradores">${WB.icon('mais', 15)} Adicionar colaborador</button>`,
      indicadores: [
        { rotulo: 'Ativos', valor: String(todos.filter((c) => c.status === 'ativo').length), nota: 'em atividade hoje' },
        { rotulo: 'Afastados', valor: String(todos.filter((c) => c.status === 'afastado').length), nota: 'vínculo mantido' },
        { rotulo: 'Desligados', valor: String(todos.filter((c) => c.status === 'desligado').length), nota: 'histórico preservado' },
        { rotulo: 'PJ / CLT', valor: todos.filter((c) => c.contratacao === 'PJ').length + ' / ' + todos.filter((c) => c.contratacao === 'CLT').length, nota: 'formato de contratação' }
      ],
      abas: abas(guias, f, '/colaboradores'),
      filtros: [
        { k: 'empresa', rotulo: 'Empresa', todos: 'Todas', opcoes: empresaOpcoes },
        { k: 'setor', rotulo: 'Setor', todos: 'Todos' },
        { k: 'cargo', rotulo: 'Cargo', todos: 'Todos' },
        { k: 'contratacao', rotulo: 'Contratação', todos: 'PJ e CLT' },
        { k: 'status', rotulo: 'Situação', todos: 'Todas' }
      ],
      colunas: [
        { k: 'nome', titulo: 'Nome', fixa: true, valor: (c) => texto(c.nome) },
        { k: 'cargo', titulo: 'Cargo', valor: (c) => texto(c.cargo) },
        { k: 'empresa', titulo: 'Empresa', valor: (c) => empresaNome(c.empresa) },
        { k: 'setor', titulo: 'Setor', valor: (c) => texto(c.setor) },
        { k: 'contratacao', titulo: 'Contratação', valor: (c) => texto(c.contratacao) },
        { k: 'admissao', titulo: 'Admissão', ord: (c) => c.admissao || '', valor: (c) => dataBR(c.admissao) },
        { k: 'desligamento', titulo: 'Desligamento', ord: (c) => c.desligamento || '', valor: (c) => dataBR(c.desligamento) },
        { k: 'telefone', titulo: 'Telefone', padrao: false, valor: (c) => texto(c.telefone) },
        { k: 'email', titulo: 'E-mail', padrao: false, valor: (c) => texto(c.email) },
        { k: 'endereco', titulo: 'Endereço', padrao: false, valor: (c) => texto(c.endereco) },
        { k: 'cpf', titulo: 'CPF', padrao: false, bruto: true, valor: (c) => (c.cpf ? `<span class="mono">${esc(c.cpf)}</span>` : '—') },
        { k: 'cnpj', titulo: 'CNPJ (PJ)', padrao: false, bruto: true, valor: (c) => (c.cnpj ? `<span class="mono">${esc(c.cnpj)}</span>` : '—') },
        { k: 'razaoSocial', titulo: 'Razão social (PJ)', padrao: false, valor: (c) => texto(c.razaoSocial) },
        { k: 'pix', titulo: 'PIX', padrao: false, valor: (c) => texto(c.pix) },
        { k: 'observacoes', titulo: 'Observações', padrao: false, valor: (c) => texto(c.observacoes) },
        colSituacao(t, { lista: 'colaboradorStatus' }),
        colLink(t, { titulo: 'Contrato' }),
        colAcoes(t)
      ],
      nota: `<div class="rule" style="margin-top:16px">
        <strong>Os dados pessoais estão como colunas escondidas.</strong>
        <p style="margin:6px 0 0">CPF, CNPJ, razão social, PIX, endereço, telefone e e-mail aparecem no seletor de colunas, desmarcados. Marque o que precisar — e lembre que este protótipo roda no seu navegador, sem servidor e sem controle de acesso real.</p>
      </div>`
    });
  }

  /* ================================================ FORNECEDORES E PARCEIROS */
  function telaFornecedores() {
    const t = 'fornecedores';
    const base = A.colecao(t);
    return planilha({
      tabela: t,
      base,
      titulo: 'Fornecedores e parceiros',
      sub: 'Quem fornece e quem executa junto com a gente, com contato, endereço e contrato.',
      acoes: `<button class="btn" data-acao="adm-novo" data-adm-tabela="fornecedores" data-classe="Parceiro">${WB.icon('mais', 15)} Adicionar parceiro</button>
              <button class="btn btn--primary" data-acao="adm-novo" data-adm-tabela="fornecedores" data-classe="Fornecedor">${WB.icon('mais', 15)} Adicionar fornecedor</button>`,
      indicadores: [
        { rotulo: 'Fornecedores', valor: String(base.filter((f) => f.classe === 'Fornecedor').length), nota: 'cadastrados' },
        { rotulo: 'Parceiros', valor: String(base.filter((f) => f.classe === 'Parceiro').length), nota: 'cadastrados' },
        { rotulo: 'Ativos', valor: String(base.filter((f) => f.status === 'ativo').length), nota: 'prontos para contratar' },
        { rotulo: 'Em homologação', valor: String(base.filter((f) => f.status === 'em homologação').length), nota: 'documentação em análise' }
      ],
      filtros: [
        { k: 'classe', rotulo: 'Classe', todos: 'Fornecedores e parceiros' },
        { k: 'categoria', rotulo: 'Categoria', todos: 'Todas' },
        { k: 'empresa', rotulo: 'Empresa', todos: 'Todas', opcoes: empresaOpcoes },
        { k: 'status', rotulo: 'Situação', todos: 'Todas' }
      ],
      colunas: [
        colId('Nº'),
        { k: 'nome', titulo: 'Nome', fixa: true, valor: (f) => texto(f.nome) },
        { k: 'classe', titulo: 'Classe', valor: (f) => texto(f.classe) },
        { k: 'categoria', titulo: 'Categoria', valor: (f) => texto(f.categoria) },
        { k: 'cnpj', titulo: 'CNPJ', bruto: true, valor: (f) => (f.cnpj ? `<span class="mono">${esc(f.cnpj)}</span>` : '—') },
        { k: 'contatoNome', titulo: 'Contato', valor: (f) => texto(f.contatoNome) },
        { k: 'contatoTelefone', titulo: 'Telefone', valor: (f) => texto(f.contatoTelefone) },
        { k: 'empresa', titulo: 'Empresa', valor: (f) => empresaNome(f.empresa) },
        { k: 'endereco', titulo: 'Endereço', valor: (f) => texto(f.endereco) },
        { k: 'observacoes', titulo: 'Observações', padrao: false, valor: (f) => texto(f.observacoes) },
        colSituacao(t, { lista: 'fornecedorStatus' }),
        colLink(t, { titulo: 'Contrato' }),
        colAcoes(t)
      ]
    });
  }

  /* ======================================================= PATROCINADORES */
  function telaPatrocinadores() {
    const t = 'patrocinadores';
    const base = A.colecao(t);
    const confirmados = base.filter((p) => p.status === 'confirmado');
    return planilha({
      tabela: t,
      base,
      titulo: 'Patrocinadores',
      sub: 'Cotas negociadas por projeto ou evento, com contato, valor e contrato.',
      acoes: `<button class="btn btn--primary" data-acao="adm-novo" data-adm-tabela="patrocinadores">${WB.icon('mais', 15)} Adicionar patrocinador</button>`,
      indicadores: [
        { rotulo: 'Confirmados', valor: String(confirmados.length), nota: 'de ' + base.length + ' patrocínios' },
        { rotulo: 'Valor confirmado', valor: WB.moeda(confirmados.reduce((s, p) => s + (Number(p.valor) || 0), 0)), nota: 'soma das cotas confirmadas' },
        { rotulo: 'Em negociação', valor: String(base.filter((p) => p.status === 'negociação').length), nota: 'sem contrato ainda' },
        { rotulo: 'Projetos com cota', valor: String(base.reduce((lista, p) => (p.projeto && lista.indexOf(p.projeto) < 0 ? lista.concat([p.projeto]) : lista), []).length), nota: 'projetos ou eventos' }
      ],
      filtros: [
        { k: 'projeto', rotulo: 'Projeto / evento', todos: 'Todos' },
        { k: 'cota', rotulo: 'Tipo de cota', todos: 'Todas' },
        { k: 'empresa', rotulo: 'Empresa', todos: 'Todas', opcoes: empresaOpcoes },
        { k: 'status', rotulo: 'Situação', todos: 'Todas' }
      ],
      colunas: [
        colId('Nº'),
        { k: 'nome', titulo: 'Patrocinador', fixa: true, valor: (p) => texto(p.nome) },
        { k: 'projeto', titulo: 'Projeto / evento', valor: (p) => texto(p.projeto) },
        { k: 'cota', titulo: 'Tipo de cota', valor: (p) => texto(p.cota) },
        { k: 'valor', titulo: 'Valor da cota', num: true, ord: (p) => ordNum(p.valor), valor: (p) => (p.valor == null || p.valor === '' ? '—' : WB.moeda(p.valor)) },
        { k: 'contatoNome', titulo: 'Contato', valor: (p) => texto(p.contatoNome) },
        { k: 'contatoTelefone', titulo: 'Telefone', valor: (p) => texto(p.contatoTelefone) },
        { k: 'empresa', titulo: 'Empresa', padrao: false, valor: (p) => empresaNome(p.empresa) },
        { k: 'observacoes', titulo: 'Observações', padrao: false, valor: (p) => texto(p.observacoes) },
        colSituacao(t, { lista: 'patrocinioStatus' }),
        colLink(t, { titulo: 'Contrato' }),
        colAcoes(t)
      ]
    });
  }

  /* ======================================================= BENS ADQUIRIDOS */
  function telaBens() {
    const t = 'bens';
    const base = A.colecao(t);
    const vendidos = base.filter((b) => b.status === 'vendido');
    return planilha({
      tabela: t,
      base,
      titulo: 'Bens adquiridos',
      sub: 'Patrimônio do grupo: aquisição, venda, valores, local de armazenagem e estado de uso.',
      acoes: `<button class="btn btn--primary" data-acao="adm-novo" data-adm-tabela="bens">${WB.icon('mais', 15)} Adicionar bem</button>`,
      indicadores: [
        { rotulo: 'Itens no patrimônio', valor: String(base.filter((b) => b.status !== 'vendido' && b.status !== 'baixado').length), nota: 'fora vendidos e baixados' },
        { rotulo: 'Valor pago', valor: WB.moeda(base.reduce((s, b) => s + (Number(b.valorPago) || 0), 0)), nota: 'soma de todas as aquisições' },
        { rotulo: 'Vendidos', valor: String(vendidos.length), nota: 'com data de venda' },
        { rotulo: 'Valor vendido', valor: WB.moeda(vendidos.reduce((s, b) => s + (Number(b.valorVendido) || 0), 0)), nota: 'recebido nas vendas' }
      ],
      filtros: [
        { k: 'empresa', rotulo: 'Empresa', todos: 'Todas', opcoes: empresaOpcoes },
        { k: 'status', rotulo: 'Situação', todos: 'Todas' },
        { k: 'local', rotulo: 'Armazenagem', todos: 'Todos os locais' },
        { k: 'estado', rotulo: 'Estado de uso', todos: 'Todos' }
      ],
      colunas: [
        colId('Nº'),
        { k: 'descricao', titulo: 'Descrição do item', fixa: true, valor: (b) => texto(b.descricao) },
        { k: 'patrimonio', titulo: 'Patrimônio', bruto: true, valor: (b) => (b.patrimonio ? `<span class="mono">${esc(b.patrimonio)}</span>` : '—') },
        { k: 'empresa', titulo: 'Empresa', valor: (b) => empresaNome(b.empresa) },
        { k: 'aquisicao', titulo: 'Aquisição', ord: (b) => b.aquisicao || '', valor: (b) => dataBR(b.aquisicao) },
        { k: 'venda', titulo: 'Venda', ord: (b) => b.venda || '', valor: (b) => dataBR(b.venda) },
        { k: 'valorPago', titulo: 'Valor pago', num: true, ord: (b) => ordNum(b.valorPago), valor: (b) => (b.valorPago == null || b.valorPago === '' ? '—' : WB.moeda(b.valorPago)) },
        { k: 'valorVendido', titulo: 'Valor vendido', num: true, ord: (b) => ordNum(b.valorVendido), valor: (b) => (b.valorVendido == null || b.valorVendido === '' ? '—' : WB.moeda(b.valorVendido)) },
        { k: 'local', titulo: 'Armazenagem', valor: (b) => texto(b.local) },
        { k: 'observacoes', titulo: 'Observações', padrao: false, valor: (b) => texto(b.observacoes) },
        colSituacao(t, { lista: 'bemStatus' }),
        colSituacao(t, { campo: 'estado', titulo: 'Estado de uso', lista: 'bemEstado' }),
        colLink(t, { titulo: 'Nota / doc.' }),
        colAcoes(t)
      ]
    });
  }

  /* ================================================================ CNPJS */
  function telaCnpjs() {
    const t = 'cnpjs';
    const base = A.colecao(t);
    return planilha({
      tabela: t,
      base,
      titulo: 'CNPJs',
      sub: 'Todas as pessoas jurídicas do grupo, incluindo as SPEs, com regime, endereço e contrato social.',
      acoes: `<button class="btn btn--primary" data-acao="adm-novo" data-adm-tabela="cnpjs">${WB.icon('mais', 15)} Adicionar CNPJ</button>`,
      indicadores: [
        { rotulo: 'CNPJs ativos', valor: String(base.filter((c) => c.situacao === 'ativa').length), nota: 'de ' + base.length + ' cadastrados' },
        { rotulo: 'Simples Nacional', valor: String(base.filter((c) => c.regime === 'Simples Nacional').length), nota: 'regime tributário' },
        { rotulo: 'Lucro Presumido', valor: String(base.filter((c) => c.regime === 'Lucro Presumido').length), nota: 'regime tributário' },
        { rotulo: 'Lucro Real', valor: String(base.filter((c) => c.regime === 'Lucro Real').length), nota: 'regime tributário' }
      ],
      filtros: [
        { k: 'regime', rotulo: 'Regime', todos: 'Todos' },
        { k: 'empresa', rotulo: 'Operação', todos: 'Todas', opcoes: empresaOpcoes },
        { k: 'situacao', rotulo: 'Situação', todos: 'Todas' }
      ],
      colunas: [
        { k: 'razao', titulo: 'Razão social', fixa: true, valor: (c) => texto(c.razao) },
        { k: 'fantasia', titulo: 'Nome fantasia', valor: (c) => texto(c.fantasia) },
        { k: 'cnpj', titulo: 'CNPJ', bruto: true, valor: (c) => (c.cnpj ? `<span class="mono">${esc(c.cnpj)}</span>` : '—') },
        { k: 'regime', titulo: 'Regime', valor: (c) => texto(c.regime) },
        { k: 'abertura', titulo: 'Data de abertura', ord: (c) => c.abertura || '', valor: (c) => dataBR(c.abertura) },
        { k: 'endereco', titulo: 'Endereço', valor: (c) => texto(c.endereco) },
        { k: 'empresa', titulo: 'Operação', padrao: false, valor: (c) => empresaNome(c.empresa) },
        { k: 'observacoes', titulo: 'Observações', padrao: false, valor: (c) => texto(c.observacoes) },
        colSituacao(t, { campo: 'situacao', lista: 'cnpjSituacao' }),
        colLink(t, { titulo: 'Contrato social' }),
        colAcoes(t)
      ]
    });
  }

  /* ================================================================= ROTA */
  const TELAS = {
    contratos: telaContratos,
    colaboradores: telaColaboradores,
    fornecedores: telaFornecedores,
    patrocinadores: telaPatrocinadores,
    bens: telaBens,
    cnpjs: telaCnpjs
  };

  /** Substitui `V.adm` de views.js. O segundo parâmetro é a aba da rota
      (#/colaboradores/desligados). */
  V.adm = function (qual, filtro) {
    const tela = TELAS[qual];
    if (!tela) return WB.vazio('Página não encontrada', '');
    return tela(filtro);
  };

  /* Exposto para os testes e para quem precisar montar outra planilha. */
  A.planilha = planilha;
  A.visiveisDe = visiveisDe;
  A.montarColunas = montarColunas;
  A.aplicarFiltros = aplicarFiltros;

  /* ============================================================== EVENTOS
     Delegação no documento: a tela é redesenhada inteira a cada mudança, e
     ouvinte por elemento se perderia a cada redesenho. */
  function ligar() {
    document.addEventListener('change', (e) => {
      const filtro = e.target.closest ? e.target.closest('[data-adm-filtro]') : null;
      if (filtro) {
        const [tabela, campo] = filtro.dataset.admFiltro.split('|');
        A.definirFiltro(tabela, campo, filtro.value);
        if (WB.rerender) WB.rerender();
        return;
      }

      const coluna = e.target.closest ? e.target.closest('[data-adm-col]') : null;
      if (coluna) {
        const [tabela, k] = coluna.dataset.admCol.split('|');
        if (!TELAS[tabela]) return;
        /* Na primeira vez não há lista guardada: ela nasce do que está marcado
           na tela AGORA — o clique já mudou este checkbox, então o estado do
           DOM é exatamente o desejado. Depois disso, a lista guardada manda. */
        const atual = A.colunasVisiveis(tabela);
        let lista;
        if (atual) {
          lista = atual.filter((x) => x !== k);
          if (coluna.checked) lista.push(k);
        } else {
          const raiz = document.getElementById('conteudo');
          lista = Array.from(raiz.querySelectorAll('[data-adm-col]'))
            .filter((c) => c.checked && !c.disabled)
            .map((c) => c.dataset.admCol.split('|')[1]);
        }
        A.definirColunas(tabela, lista);
        painelColunas = tabela;
        if (WB.rerender) WB.rerender();
        return;
      }

      const sit = e.target.closest ? e.target.closest('[data-adm-status]') : null;
      if (sit) {
        const [tabela, campo, id] = sit.dataset.admStatus.split('|');
        WB.admMudarSituacao(tabela, campo, id, sit.value);
      }
    });

    document.addEventListener('click', (e) => {
      const limpar = e.target.closest ? e.target.closest('[data-adm-limpar]') : null;
      if (limpar) {
        A.limparFiltros(limpar.dataset.admLimpar);
        if (WB.rerender) WB.rerender();
        return;
      }
      const excluir = e.target.closest ? e.target.closest('[data-adm-excluircoluna]') : null;
      if (excluir) {
        e.preventDefault();
        const [tabela, k] = excluir.dataset.admExcluircoluna.split('|');
        painelColunas = tabela;
        WB.admExcluirColuna(tabela, k);
      }
    });

    // Lembrar qual painel de colunas estava aberto.
    document.addEventListener('toggle', (e) => {
      const painel = e.target && e.target.dataset ? e.target.dataset.admPainel : null;
      if (!painel) return;
      painelColunas = e.target.open ? painel : '';
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar);
  else ligar();
})();
