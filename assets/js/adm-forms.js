/* WeBrain — Administrativo: cadastros, ficha e edição em popup.
   ---------------------------------------------------------------------------
   Um formulário só para os seis cadastros: o que muda é a lista de campos,
   declarada em `CAMPOS`. Com isso, "adicionar contrato", "adicionar
   colaborador" e "adicionar CNPJ" têm o mesmo comportamento — inclusive as
   colunas criadas pelo usuário, que entram no formulário automaticamente.

   LISTA FECHADA, PORÉM ACRESCENTÁVEL: os campos com `lista` mostram um select
   com as opções conhecidas mais "Outro (digitar)". Escolhendo essa opção, um
   campo de texto aparece e o valor digitado passa a fazer parte da lista para
   os próximos cadastros. Era a decisão do usuário sobre "de qual obra".
   ========================================================================== */
(function () {
  const WB = (window.WB = window.WB || {});
  const A = WB.adm;
  if (!A) return;
  const esc = WB.esc;

  const empresaOpcoes = () => [{ valor: 'grupo', texto: 'Grupo We' }]
    .concat((WB.data.empresas || []).map((e) => ({ valor: e.id, texto: e.nome })));
  const maiuscula = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '');
  const opcoesLista = (nome) => A.lista(nome).map((v) => ({ valor: v, texto: maiuscula(v) }));

  const NOMES = {
    contratos: { singular: 'contrato', artigo: 'o' },
    colaboradores: { singular: 'colaborador', artigo: 'o' },
    fornecedores: { singular: 'cadastro', artigo: 'o' },
    patrocinadores: { singular: 'patrocinador', artigo: 'o' },
    bens: { singular: 'bem', artigo: 'o' },
    cnpjs: { singular: 'CNPJ', artigo: 'o' }
  };

  /** Como o registro se chama na tela (para títulos e mensagens). */
  function rotuloRegistro(tabela, r) {
    if (!r) return '';
    return r.nome || r.descritivo || r.razao || r.descricao || r.id || '';
  }

  /* =============================================================== CAMPOS */
  const CAMPOS = {
    contratos: (r) => [
      { rotulo: 'Descritivo do contrato', nome: 'descritivo', obrigatorio: true, span2: true, valor: r.descritivo },
      { rotulo: 'Categoria do contrato', nome: 'categoria', lista: 'contratoCategoria', obrigatorio: true, valor: r.categoria },
      { rotulo: 'De qual obra / grupo', nome: 'vinculo', lista: 'contratoVinculo', obrigatorio: true, valor: r.vinculo },
      { rotulo: 'Empresa de referência', nome: 'empresa', tipo: 'select', opcoes: empresaOpcoes(), obrigatorio: true, valor: r.empresa, ajuda: 'A empresa do nosso grupo que assina o contrato.' },
      { rotulo: 'Contratada (outra parte)', nome: 'parte', valor: r.parte },
      { rotulo: 'Valor (R$)', nome: 'valor', tipo: 'number', min: 0, valor: r.valor, ajuda: 'Deixe em branco quando o contrato for por tabela.' },
      { rotulo: 'Data do contrato', nome: 'inicio', tipo: 'date', obrigatorio: true, valor: r.inicio },
      { rotulo: 'Data de fim', nome: 'fim', tipo: 'date', valor: r.fim, ajuda: 'Em branco = prazo indeterminado.' },
      { rotulo: 'Situação', nome: 'status', tipo: 'select', opcoes: opcoesLista('contratoStatus'), obrigatorio: true, valor: r.status },
      { rotulo: 'Reajuste', nome: 'reajuste', valor: r.reajuste, placeholder: 'IPCA anual, tabela trimestral…' },
      { rotulo: 'Link do contrato', nome: 'link', span2: true, valor: r.link, placeholder: 'https://…', ajuda: 'Vira o botão "Abrir" na coluna Contrato.' },
      { rotulo: 'Observações', nome: 'observacoes', tipo: 'textarea', span2: true, valor: r.observacoes }
    ],

    colaboradores: (r) => [
      { rotulo: 'Nome', nome: 'nome', obrigatorio: true, span2: true, valor: r.nome },
      { rotulo: 'Cargo', nome: 'cargo', obrigatorio: true, valor: r.cargo },
      { rotulo: 'Empresa', nome: 'empresa', tipo: 'select', opcoes: empresaOpcoes(), obrigatorio: true, valor: r.empresa },
      { rotulo: 'Setor', nome: 'setor', lista: 'setor', obrigatorio: true, valor: r.setor },
      { rotulo: 'Formato de contratação', nome: 'contratacao', tipo: 'select', opcoes: opcoesLista('contratacao'), obrigatorio: true, valor: r.contratacao },
      { rotulo: 'Data de admissão', nome: 'admissao', tipo: 'date', obrigatorio: true, valor: r.admissao },
      { rotulo: 'Data de desligamento', nome: 'desligamento', tipo: 'date', valor: r.desligamento, ajuda: 'Só quando houver.' },
      { rotulo: 'Situação atual', nome: 'status', tipo: 'select', opcoes: opcoesLista('colaboradorStatus'), obrigatorio: true, valor: r.status },
      { rotulo: 'Telefone', nome: 'telefone', valor: r.telefone, placeholder: '(45) 90000-0000' },
      { rotulo: 'E-mail', nome: 'email', tipo: 'email', valor: r.email },
      { rotulo: 'Endereço', nome: 'endereco', span2: true, valor: r.endereco },
      { rotulo: 'CPF', nome: 'cpf', valor: r.cpf, ajuda: 'Obrigatório para CLT e PJ.' },
      { rotulo: 'Chave PIX', nome: 'pix', valor: r.pix },
      { rotulo: 'CNPJ (quando PJ)', nome: 'cnpj', valor: r.cnpj },
      { rotulo: 'Razão social (quando PJ)', nome: 'razaoSocial', valor: r.razaoSocial },
      { rotulo: 'Link do contrato', nome: 'link', span2: true, valor: r.link, placeholder: 'https://…' },
      { rotulo: 'Observações', nome: 'observacoes', tipo: 'textarea', span2: true, valor: r.observacoes }
    ],

    fornecedores: (r) => [
      { rotulo: 'Nome / empresa', nome: 'nome', obrigatorio: true, span2: true, valor: r.nome },
      { rotulo: 'Classe', nome: 'classe', tipo: 'select', opcoes: opcoesLista('fornecedorClasse'), obrigatorio: true, valor: r.classe },
      { rotulo: 'Categoria', nome: 'categoria', lista: 'fornecedorCategoria', obrigatorio: true, valor: r.categoria },
      { rotulo: 'CNPJ', nome: 'cnpj', valor: r.cnpj },
      { rotulo: 'Empresa do grupo', nome: 'empresa', tipo: 'select', opcoes: empresaOpcoes(), obrigatorio: true, valor: r.empresa },
      { rotulo: 'Nome do contato', nome: 'contatoNome', valor: r.contatoNome },
      { rotulo: 'Telefone do contato', nome: 'contatoTelefone', valor: r.contatoTelefone, placeholder: '(45) 90000-0000' },
      { rotulo: 'Endereço', nome: 'endereco', span2: true, valor: r.endereco },
      { rotulo: 'Situação', nome: 'status', tipo: 'select', opcoes: opcoesLista('fornecedorStatus'), obrigatorio: true, valor: r.status },
      { rotulo: 'Link do contrato', nome: 'link', valor: r.link, placeholder: 'https://…' },
      { rotulo: 'Observações', nome: 'observacoes', tipo: 'textarea', span2: true, valor: r.observacoes }
    ],

    patrocinadores: (r) => [
      { rotulo: 'Patrocinador', nome: 'nome', obrigatorio: true, span2: true, valor: r.nome },
      { rotulo: 'Projeto ou evento', nome: 'projeto', obrigatorio: true, valor: r.projeto },
      { rotulo: 'Tipo de cota', nome: 'cota', lista: 'patrocinioCota', obrigatorio: true, valor: r.cota },
      { rotulo: 'Valor da cota (R$)', nome: 'valor', tipo: 'number', min: 0, valor: r.valor },
      { rotulo: 'Empresa do grupo', nome: 'empresa', tipo: 'select', opcoes: empresaOpcoes(), obrigatorio: true, valor: r.empresa },
      { rotulo: 'Nome do contato', nome: 'contatoNome', valor: r.contatoNome },
      { rotulo: 'Telefone do contato', nome: 'contatoTelefone', valor: r.contatoTelefone, placeholder: '(45) 90000-0000' },
      { rotulo: 'Situação', nome: 'status', tipo: 'select', opcoes: opcoesLista('patrocinioStatus'), obrigatorio: true, valor: r.status },
      { rotulo: 'Link do contrato', nome: 'link', span2: true, valor: r.link, placeholder: 'https://…' },
      { rotulo: 'Observações', nome: 'observacoes', tipo: 'textarea', span2: true, valor: r.observacoes }
    ],

    bens: (r) => [
      { rotulo: 'Descrição do item', nome: 'descricao', obrigatorio: true, span2: true, valor: r.descricao },
      { rotulo: 'Nº de patrimônio', nome: 'patrimonio', valor: r.patrimonio },
      { rotulo: 'Empresa a que pertence', nome: 'empresa', tipo: 'select', opcoes: empresaOpcoes(), obrigatorio: true, valor: r.empresa },
      { rotulo: 'Data de aquisição', nome: 'aquisicao', tipo: 'date', obrigatorio: true, valor: r.aquisicao },
      { rotulo: 'Data de venda', nome: 'venda', tipo: 'date', valor: r.venda, ajuda: 'Só quando o bem for vendido.' },
      { rotulo: 'Valor pago (R$)', nome: 'valorPago', tipo: 'number', min: 0, valor: r.valorPago },
      { rotulo: 'Valor vendido (R$)', nome: 'valorVendido', tipo: 'number', min: 0, valor: r.valorVendido },
      { rotulo: 'Situação', nome: 'status', tipo: 'select', opcoes: opcoesLista('bemStatus'), obrigatorio: true, valor: r.status },
      { rotulo: 'Local de armazenagem', nome: 'local', lista: 'bemLocal', valor: r.local },
      { rotulo: 'Estado de uso', nome: 'estado', tipo: 'select', opcoes: opcoesLista('bemEstado'), obrigatorio: true, valor: r.estado },
      { rotulo: 'Link da nota / documento', nome: 'link', span2: true, valor: r.link, placeholder: 'https://…' },
      { rotulo: 'Observações', nome: 'observacoes', tipo: 'textarea', span2: true, valor: r.observacoes }
    ],

    cnpjs: (r) => [
      { rotulo: 'Razão social', nome: 'razao', obrigatorio: true, span2: true, valor: r.razao },
      { rotulo: 'Nome fantasia', nome: 'fantasia', valor: r.fantasia },
      { rotulo: 'CNPJ', nome: 'cnpj', obrigatorio: true, valor: r.cnpj, placeholder: '00.000.000/0001-00' },
      { rotulo: 'Regime tributário', nome: 'regime', lista: 'cnpjRegime', obrigatorio: true, valor: r.regime },
      { rotulo: 'Data de abertura', nome: 'abertura', tipo: 'date', valor: r.abertura },
      { rotulo: 'Operação do grupo', nome: 'empresa', tipo: 'select', opcoes: empresaOpcoes(), obrigatorio: true, valor: r.empresa },
      { rotulo: 'Endereço', nome: 'endereco', span2: true, valor: r.endereco },
      { rotulo: 'Situação', nome: 'situacao', tipo: 'select', opcoes: opcoesLista('cnpjSituacao'), obrigatorio: true, valor: r.situacao },
      { rotulo: 'Link do contrato social', nome: 'link', span2: true, valor: r.link, placeholder: 'https://…' },
      { rotulo: 'Observações', nome: 'observacoes', tipo: 'textarea', span2: true, valor: r.observacoes }
    ]
  };

  /** Campos do cadastro + um campo para cada coluna criada pelo usuário. */
  function camposDe(tabela, registro) {
    const base = CAMPOS[tabela](registro || {});
    const extras = A.colunasExtras(tabela).map((c) => ({
      rotulo: c.titulo, nome: 'ex_' + c.k, extra: c.k,
      valor: registro && registro.extras ? registro.extras[c.k] : ''
    }));
    return base.concat(extras);
  }

  /* ------------------------------------------------- campo de lista aberta */
  function campoLista(c) {
    const id = 'l_' + c.nome;
    const opcoes = A.lista(c.lista);
    const conhecido = !c.valor || opcoes.indexOf(c.valor) >= 0;
    return `<div class="fld ${c.span2 ? 'span2' : ''}">
      <label for="${id}">${esc(c.rotulo)}${c.obrigatorio ? ' <span class="fld__req" aria-hidden="true">*</span>' : ''}</label>
      <select class="inp" id="${id}" name="${esc(c.nome)}" data-adm-lista="${esc(c.lista)}"${c.obrigatorio ? ' required' : ''}>
        <option value="">Selecione</option>
        ${opcoes.map((v) => `<option value="${esc(v)}"${v === c.valor ? ' selected' : ''}>${esc(maiuscula(v))}</option>`).join('')}
        <option value="__novo"${conhecido ? '' : ' selected'}>+ Outro (digitar)</option>
      </select>
      <input class="inp admnovo" name="${esc(c.nome)}__novo" type="text" placeholder="Digite o novo valor"
        value="${esc(conhecido ? '' : c.valor)}"${conhecido ? ' hidden' : ''}>
      ${c.ajuda ? `<span class="fld__help">${esc(c.ajuda)}</span>` : ''}
    </div>`;
  }

  const desenhaCampo = (c) => (c.lista ? campoLista(c) : WB.campo(c));

  /** Mostra o campo de texto quando "Outro (digitar)" é escolhido. */
  function ligarListas(ov) {
    ov.querySelectorAll('[data-adm-lista]').forEach((sel) => {
      const novo = sel.parentElement.querySelector('.admnovo');
      if (!novo) return;
      const sincronizar = () => {
        const aberto = sel.value === '__novo';
        novo.hidden = !aberto;
        if (aberto && sel.hasAttribute('required')) novo.setAttribute('required', '');
        else novo.removeAttribute('required');
        if (aberto) novo.focus();
      };
      sel.addEventListener('change', sincronizar);
    });
  }

  /** Mesma mecânica de envio dos outros formulários do portal. */
  function ligarEnvio(ov, aoEnviar) {
    const form = ov.querySelector('form');
    const btn = ov.querySelector('[data-enviar]');
    if (!form || !btn) return;
    form.addEventListener('submit', (e) => e.preventDefault());
    btn.addEventListener('click', () => {
      if (btn.dataset.enviando === '1') return;
      if (!WB.validar(form)) return;
      btn.dataset.enviando = '1';
      btn.setAttribute('aria-disabled', 'true');
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="btn__spin"></i>Salvando…';
      setTimeout(() => {
        try {
          aoEnviar(WB.lerForm(form));
        } catch (err) {
          btn.dataset.enviando = '';
          btn.removeAttribute('aria-disabled');
          btn.innerHTML = original;
          WB.toast('Não foi possível salvar. Seus dados continuam preenchidos — tente de novo.', 'erro');
        }
      }, 200);
    });
  }

  /** Lê o formulário para cima do registro, resolvendo listas e números. */
  function aplicar(tabela, registro, v) {
    const campos = camposDe(tabela, registro);
    campos.forEach((c) => {
      let valor = v[c.nome];
      if (Array.isArray(valor)) valor = valor[0];
      if (c.lista && valor === '__novo') {
        valor = A.acrescentarOpcao(c.lista, v[c.nome + '__novo']);
      }
      if (c.tipo === 'number') {
        const s = String(valor == null ? '' : valor).trim();
        valor = s === '' ? null : Number(s);
      } else {
        valor = String(valor == null ? '' : valor).trim();
      }
      if (c.extra) {
        registro.extras = registro.extras || {};
        registro.extras[c.extra] = valor;
      } else {
        registro[c.nome] = valor;
      }
    });
    return registro;
  }

  /* ============================================================ ADICIONAR */
  WB.abrirAdmNovo = function (tabela, presets) {
    if (!CAMPOS[tabela]) return;
    const nome = NOMES[tabela] || { singular: 'registro' };
    const base = A.migrar(tabela, Object.assign({ id: '', extras: {} }, presets || {}));
    const campos = camposDe(tabela, base);

    const ov = WB.abrirPopup({
      tipo: 'Administrativo',
      titulo: 'Adicionar ' + (presets && presets.classe ? presets.classe.toLowerCase() : nome.singular),
      largo: true,
      corpo: `<form novalidate class="admform"><div class="fgrid fgrid--2">${campos.map(desenhaCampo).join('')}</div></form>`,
      rodape: `<span class="grow"></span>
        <button class="btn" data-fechar>Cancelar</button>
        <button class="btn btn--primary" data-enviar>Salvar</button>`
    });
    ligarListas(ov);
    ligarEnvio(ov, (v) => {
      const registro = aplicar(tabela, A.migrar(tabela, { id: A.novoId(tabela), extras: {} }), v);
      A.gravar(tabela, registro);
      WB.fecharPopup();
      WB.toast('Registro criado: ' + rotuloRegistro(tabela, registro) + '.');
      if (WB.rerender) WB.rerender();
    });
  };

  /* =============================================================== EDITAR */
  WB.abrirAdmEditar = function (tabela, id) {
    const atual = A.registro(tabela, id);
    if (!atual) { WB.toast('Registro não encontrado.', 'erro'); return; }
    const nome = NOMES[tabela] || { singular: 'registro' };
    const campos = camposDe(tabela, atual);

    const ov = WB.abrirPopup({
      tipo: 'Administrativo',
      titulo: 'Editar ' + nome.singular,
      largo: true,
      corpo: `<form novalidate class="admform"><div class="fgrid fgrid--2">${campos.map(desenhaCampo).join('')}</div></form>`,
      rodape: `<button class="btn btn--ghost admexcluir" data-adm-excluir="${esc(tabela)}|${esc(id)}">Excluir registro</button>
        <span class="grow"></span>
        <button class="btn" data-fechar>Cancelar</button>
        <button class="btn btn--primary" data-enviar>Salvar alterações</button>`
    });
    ligarListas(ov);
    const excluir = ov.querySelector('[data-adm-excluir]');
    if (excluir) excluir.addEventListener('click', () => WB.admExcluir(tabela, id));
    ligarEnvio(ov, (v) => {
      // Copiar antes de aplicar: se algo falhar no meio, o registro na lista
      // não fica pela metade.
      const copia = aplicar(tabela, JSON.parse(JSON.stringify(atual)), v);
      A.gravar(tabela, copia);
      WB.fecharPopup();
      WB.toast('Alterações salvas.');
      if (WB.rerender) WB.rerender();
    });
  };

  /* ================================================================ FICHA */
  WB.abrirAdmFicha = function (tabela, id) {
    const r = A.registro(tabela, id);
    if (!r) { WB.toast('Registro não encontrado.', 'erro'); return; }
    const campos = camposDe(tabela, r);
    const linha = (c) => {
      let v = c.extra ? (r.extras || {})[c.extra] : r[c.nome];
      if (c.tipo === 'date') v = v ? WB.fmtDataCurta(v) : '';
      else if (c.tipo === 'number') v = (v == null || v === '') ? '' : WB.moeda(v);
      else if (c.nome === 'empresa') v = v === 'grupo' || !v ? 'Grupo We' : WB.empresaNome(v);
      if (c.nome === 'link' && v) {
        const u = A.urlSegura(v);
        return `<dt>${esc(c.rotulo)}</dt><dd>${u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>` : esc(v)}</dd>`;
      }
      return `<dt>${esc(c.rotulo)}</dt><dd>${v === '' || v == null ? '<span class="muted">não informado</span>' : esc(v)}</dd>`;
    };

    WB.abrirPopup({
      tipo: 'Administrativo',
      titulo: rotuloRegistro(tabela, r) || 'Registro',
      largo: true,
      corpo: `<div class="admficha">
        <p class="admficha__id"><span class="mono">${esc(r.id)}</span></p>
        <dl class="dl">${campos.map(linha).join('')}</dl>
      </div>`,
      rodape: `<span class="grow"></span>
        <button class="btn" data-fechar>Fechar</button>
        <button class="btn btn--primary" data-acao="adm-editar" data-adm-tabela="${esc(tabela)}" data-id="${esc(r.id)}">Editar</button>`
    }).querySelectorAll('[data-acao="adm-editar"]').forEach((b) =>
      b.addEventListener('click', () => WB.abrirAdmEditar(tabela, r.id)));
  };

  /* ============================================================== EXCLUIR */
  WB.admExcluir = function (tabela, id) {
    const r = A.registro(tabela, id);
    if (!r) return;
    const nome = rotuloRegistro(tabela, r);
    const ov = WB.abrirPopup({
      tipo: 'Confirmar',
      titulo: 'Excluir registro',
      corpo: `<div style="padding:4px 0 8px">
        <p>Excluir <strong>${esc(nome)}</strong> do cadastro?</p>
        <p class="muted" style="font-size:14px">O registro sai da planilha e do que está guardado neste navegador. Não há como desfazer daqui.</p>
      </div>`,
      rodape: `<span class="grow"></span>
        <button class="btn" data-fechar>Manter</button>
        <button class="btn btn--primary" data-adm-confirma>Excluir</button>`
    });
    ov.querySelector('[data-adm-confirma]').addEventListener('click', () => {
      A.remover(tabela, id);
      WB.fecharPopup();
      WB.toast('Registro excluído.');
      if (WB.rerender) WB.rerender();
    });
  };

  /* ================================================== SITUAÇÃO NA CÉLULA */
  WB.admMudarSituacao = function (tabela, campo, id, valor) {
    const r = A.registro(tabela, id);
    if (!r) return;

    /* Desligar alguém sem data de desligamento deixaria o cadastro contando
       uma história incompleta. A tela pergunta a data em vez de inventar. */
    if (tabela === 'colaboradores' && campo === 'status' && valor === 'desligado' && !r.desligamento) {
      const ov = WB.abrirPopup({
        tipo: 'Colaboradores',
        titulo: 'Registrar desligamento',
        corpo: `<form novalidate><p class="muted" style="margin:0 0 14px">Desligando <strong>${esc(r.nome)}</strong>. Informe a data — ela aparece na planilha e na aba de desligados.</p>
          <div class="fgrid fgrid--2">${WB.campo({ rotulo: 'Data de desligamento', nome: 'desligamento', tipo: 'date', obrigatorio: true, valor: WB.d(0) })}</div>
        </form>`,
        rodape: `<span class="grow"></span>
          <button class="btn" data-fechar>Cancelar</button>
          <button class="btn btn--primary" data-enviar>Registrar desligamento</button>`
      });
      // Cancelar devolve o select ao valor anterior: quem fechou não mudou nada.
      ov.querySelectorAll('[data-fechar]').forEach((b) =>
        b.addEventListener('click', () => { if (WB.rerender) WB.rerender(); }));
      ligarEnvio(ov, (v) => {
        r.status = 'desligado';
        r.desligamento = v.desligamento || WB.d(0);
        A.gravar(tabela, r);
        WB.fecharPopup();
        WB.toast(r.nome + ' passou para desligado em ' + WB.fmtDataCurta(r.desligamento) + '.');
        if (WB.rerender) WB.rerender();
      });
      return;
    }

    const anterior = r[campo];
    r[campo] = valor;
    let extra = '';
    // Reativar alguém e manter a data de desligamento seria contraditório.
    if (tabela === 'colaboradores' && campo === 'status' && anterior === 'desligado' && valor !== 'desligado' && r.desligamento) {
      r.desligamento = '';
      extra = ' A data de desligamento foi apagada.';
    }
    A.gravar(tabela, r);
    WB.toast('Situação alterada para "' + valor + '".' + extra);
    if (WB.rerender) WB.rerender();
  };

  /* ======================================================= COLUNAS NOVAS */
  WB.abrirAdmColuna = function (tabela) {
    const ov = WB.abrirPopup({
      tipo: 'Planilha',
      titulo: 'Adicionar coluna',
      corpo: `<form novalidate>
        <p class="muted" style="margin:0 0 14px">A coluna nova vale para todos os registros deste cadastro. O conteúdo é texto livre, preenchido ao editar cada linha.</p>
        <div class="fgrid fgrid--2">${WB.campo({ rotulo: 'Nome da coluna', nome: 'titulo', obrigatorio: true, span2: true, placeholder: 'Ex.: Centro de custo' })}</div>
      </form>`,
      rodape: `<span class="grow"></span>
        <button class="btn" data-fechar>Cancelar</button>
        <button class="btn btn--primary" data-enviar>Criar coluna</button>`
    });
    ligarEnvio(ov, (v) => {
      const nova = A.criarColuna(tabela, v.titulo);
      if (!nova) {
        WB.fecharPopup();
        WB.toast('Já existe uma coluna com esse nome nesta planilha.', 'erro');
        return;
      }
      // Coluna recém-criada nasce visível, senão ninguém a encontra.
      const guardadas = A.colunasVisiveis(tabela);
      if (guardadas) A.definirColunas(tabela, guardadas.concat([nova.k]));
      WB.fecharPopup();
      WB.toast('Coluna "' + nova.titulo + '" criada.');
      if (WB.rerender) WB.rerender();
    });
  };

  WB.admExcluirColuna = function (tabela, k) {
    const col = A.colunasExtras(tabela).find((c) => c.k === k);
    if (!col) return;
    const ov = WB.abrirPopup({
      tipo: 'Planilha',
      titulo: 'Excluir coluna',
      corpo: `<div style="padding:4px 0 8px">
        <p>Excluir a coluna <strong>${esc(col.titulo)}</strong> desta planilha?</p>
        <p class="muted" style="font-size:14px">Ela some da planilha e da ficha. O que já foi digitado continua guardado e reaparece se a coluna for criada de novo com o mesmo nome.</p>
      </div>`,
      rodape: `<span class="grow"></span>
        <button class="btn" data-fechar>Manter</button>
        <button class="btn btn--primary" data-adm-confirma>Excluir coluna</button>`
    });
    ov.querySelector('[data-adm-confirma]').addEventListener('click', () => {
      A.excluirColuna(tabela, k);
      const guardadas = A.colunasVisiveis(tabela);
      if (guardadas) A.definirColunas(tabela, guardadas.filter((x) => x !== k));
      WB.fecharPopup();
      WB.toast('Coluna excluída.');
      if (WB.rerender) WB.rerender();
    });
  };

  /* ============================================================ ERP — OMIE
     O atalho da barra lateral abre o Omie direto. Para isso o portal precisa
     saber o endereço, e ele é colado aqui — uma vez, valendo para todo mundo
     que abrir este WeBrain. Enquanto não houver endereço, o atalho leva para
     a tela do ERP, que é onde este formulário mora. */
  WB.abrirAdmOmie = function () {
    const atual = A.omie();
    const ov = WB.abrirPopup({
      tipo: 'Administrativo',
      titulo: atual ? 'Trocar o link do Omie' : 'Cadastrar o link do Omie',
      corpo: `<form novalidate>
        <p class="muted" style="margin:0 0 14px">Cole o endereço com que a equipe entra no Omie. Ele passa a valer no atalho da barra lateral, que abre o ERP em outra aba sem passar por tela nenhuma.</p>
        <div class="fgrid fgrid--2">${WB.campo({
          rotulo: 'Endereço do Omie', nome: 'url', span2: true, valor: atual,
          placeholder: 'https://app.omie.com.br/...',
          ajuda: 'Só endereços http:// ou https:// são aceitos.'
        })}</div>
      </form>`,
      rodape: `${atual ? '<button class="btn btn--ghost" data-adm-limpar-omie>Remover o link</button>' : ''}
        <span class="grow"></span>
        <button class="btn" data-fechar>Cancelar</button>
        <button class="btn btn--primary" data-enviar>Salvar link</button>`
    });
    const limpar = ov.querySelector('[data-adm-limpar-omie]');
    if (limpar) limpar.addEventListener('click', () => {
      A.definirOmie('');
      WB.fecharPopup();
      WB.toast('Link do Omie removido.');
      if (WB.renderSidebar) WB.renderSidebar();
      if (WB.rerender) WB.rerender();
    });
    ligarEnvio(ov, (v) => {
      if (String(v.url || '').trim() && !A.urlSegura(v.url)) {
        /* Endereço recusado: o popup continua aberto com o que foi digitado,
           então o botão precisa voltar a poder ser clicado. */
        const btn = ov.querySelector('[data-enviar]');
        btn.dataset.enviando = '';
        btn.removeAttribute('aria-disabled');
        btn.innerHTML = 'Salvar link';
        WB.toast('Esse endereço não é um link http:// ou https://.', 'erro');
        return;
      }
      const u = A.definirOmie(v.url);
      WB.fecharPopup();
      WB.toast(u ? 'Link do Omie salvo. O atalho da lateral já abre o ERP.' : 'Link do Omie removido.');
      if (WB.renderSidebar) WB.renderSidebar();
      if (WB.rerender) WB.rerender();
    });
  };

  /* =============================================================== AÇÕES
     Entram no mesmo mapa de ações do portal (app.js), então os botões usam
     `data-acao` como qualquer outro. */
  A.acoes = {
    'adm-omie': () => WB.abrirAdmOmie(),
    'adm-novo': (el) => {
      const t = el && el.dataset ? el.dataset.admTabela : '';
      const classe = el && el.dataset ? el.dataset.classe : '';
      WB.abrirAdmNovo(t, classe ? { classe } : null);
    },
    'adm-editar': (el) => WB.abrirAdmEditar(el.dataset.admTabela, el.dataset.id),
    'adm-ficha': (el) => WB.abrirAdmFicha(el.dataset.admTabela, el.dataset.id),
    'adm-coluna': (el) => WB.abrirAdmColuna(el.dataset.admTabela)
  };
})();
