/* WeBrain — Fase 2: formulários de cadastro das operações WeInvest e Nós.
   Reutiliza `WB.abrirPopup`, `WB.campo`, `WB.opcoes`, `WB.lerForm` e
   `WB.validar` da base. O que é novo aqui: blocos com título, campos
   condicionais (PF/PJ, prato/bebida) e linhas dinâmicas (comissões, parceiros
   envolvidos, proprietários, carteira).

   Toda gravação passa por `gravar()`: escreve na coleção em memória, persiste a
   coleção inteira e redesenha a tela. Salvar de novo o mesmo registro EDITA —
   nunca cria uma segunda cópia. */
(function () {
  const WB = (window.WB = window.WB || {});
  const F2 = (WB.fase2 = WB.fase2 || {});
  const esc = WB.esc;
  const num = F2.num;

  /* ------------------------------------------------------------- estrutura */
  function bloco(titulo, conteudo, nota) {
    return `<fieldset class="f2bloco">
      <legend>${esc(titulo)}</legend>
      ${nota ? `<p class="f2bloco__nota">${esc(nota)}</p>` : ''}
      <div class="fgrid fgrid--2">${conteudo}</div>
    </fieldset>`;
  }
  F2.bloco = bloco;

  /** Grupo de caixas ou botões de opção com rótulo, ocupando a linha inteira. */
  function grupo(rotulo, nome, lista, tipo, marcados, ajuda) {
    return `<div class="fld span2">
      <label id="lb_${esc(nome)}">${esc(rotulo)}</label>
      <div role="group" aria-labelledby="lb_${esc(nome)}">${WB.opcoes(nome, lista, tipo, marcados)}</div>
      ${ajuda ? `<span class="fld__help">${esc(ajuda)}</span>` : ''}
    </div>`;
  }
  F2.grupo = grupo;

  const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  F2.arr = arr;

  /* -------------------------------------------------------- linhas dinâmicas
     Um mini-editor de tabela dentro do formulário. Os valores não passam pelo
     FormData: `lerLinhas` lê do DOM, porque a quantidade de linhas muda. */
  function linhas(nome, colunas, valores, o) {
    const op = o || {};
    const linha = (v, i) => `<tr data-linha>
      ${colunas.map((c) => {
        const val = v ? (v[c.campo] == null ? '' : v[c.campo]) : '';
        if (c.tipo === 'select') {
          return `<td><label class="sr" for="${nome}_${i}_${c.campo}">${esc(c.titulo)}</label>
            <select class="inp" id="${nome}_${i}_${c.campo}" data-campo="${esc(c.campo)}">
              ${(c.placeholder ? `<option value="">${esc(c.placeholder)}</option>` : '')}
              ${c.opcoes.map((op2) => {
                const ov = typeof op2 === 'string' ? op2 : op2.valor;
                const ot = typeof op2 === 'string' ? op2 : op2.texto;
                return `<option value="${esc(ov)}"${String(val) === String(ov) ? ' selected' : ''}>${esc(ot)}</option>`;
              }).join('')}
            </select></td>`;
        }
        if (c.tipo === 'checkbox') {
          return `<td><label class="opt"><input type="checkbox" data-campo="${esc(c.campo)}"${val ? ' checked' : ''}><span class="sr">${esc(c.titulo)}</span></label></td>`;
        }
        return `<td><label class="sr" for="${nome}_${i}_${c.campo}">${esc(c.titulo)}</label>
          <input class="inp" id="${nome}_${i}_${c.campo}" data-campo="${esc(c.campo)}" type="${c.tipo || 'text'}"${c.passo ? ` step="${c.passo}"` : ''}${c.min != null ? ` min="${c.min}"` : ''} placeholder="${esc(c.placeholder || '')}" value="${esc(val)}"></td>`;
      }).join('')}
      <td class="f2linhas__acao"><button type="button" class="btn btn--ghost btn--icon" data-linha-remover aria-label="Remover linha">${WB.icon('x', 14)}</button></td>
    </tr>`;

    const atuais = (valores && valores.length ? valores : []);
    return `<div class="fld span2 f2linhas" data-linhas="${esc(nome)}">
      <label>${esc(op.rotulo || nome)}</label>
      ${op.ajuda ? `<span class="fld__help">${esc(op.ajuda)}</span>` : ''}
      <div class="tbl__wrap"><table class="tbl tbl--form">
        <thead><tr>${colunas.map((c) => `<th scope="col">${esc(c.titulo)}</th>`).join('')}<th scope="col"><span class="sr">Remover</span></th></tr></thead>
        <tbody>${atuais.map(linha).join('')}</tbody>
      </table></div>
      <p class="f2linhas__vazio"${atuais.length ? ' hidden' : ''}>${esc(op.vazio || 'Nenhuma linha. Use o botão abaixo para adicionar.')}</p>
      <template data-linha-modelo>${linha(op.novo || {}, 'n')}</template>
      <button type="button" class="btn btn--sm" data-linha-add>${WB.icon('mais', 14)} ${esc(op.adicionar || 'Adicionar')}</button>
    </div>`;
  }
  F2.linhas = linhas;

  function ligarLinhas(raiz) {
    raiz.querySelectorAll('[data-linhas]').forEach((box) => {
      const tbody = box.querySelector('tbody');
      const modelo = box.querySelector('[data-linha-modelo]');
      const vazio = box.querySelector('.f2linhas__vazio');
      const sincronizar = () => { if (vazio) vazio.hidden = tbody.rows.length > 0; };
      box.querySelector('[data-linha-add]').addEventListener('click', () => {
        const tmp = document.createElement('tbody');
        tmp.innerHTML = modelo.innerHTML;
        const tr = tmp.querySelector('tr');
        // O modelo usa o índice "n" nos ids; com várias linhas isso repetiria.
        tr.querySelectorAll('[id]').forEach((el) => {
          const novo = el.id.replace(/_n_/, '_' + tbody.rows.length + '_');
          const rotulo = tr.querySelector('label[for="' + el.id + '"]');
          el.id = novo;
          if (rotulo) rotulo.setAttribute('for', novo);
        });
        tbody.appendChild(tr);
        sincronizar();
        const primeiro = tr.querySelector('input,select');
        if (primeiro) primeiro.focus();
      });
      tbody.addEventListener('click', (e) => {
        const b = e.target.closest('[data-linha-remover]');
        if (!b) return;
        b.closest('tr').remove();
        sincronizar();
      });
    });
  }

  /** Lê as linhas dinâmicas de um grupo. Linha totalmente vazia é descartada. */
  F2.lerLinhas = function (raiz, nome) {
    const box = raiz.querySelector('[data-linhas="' + nome + '"]');
    if (!box) return [];
    return Array.from(box.querySelectorAll('tbody tr[data-linha]')).map((tr) => {
      const o = {};
      tr.querySelectorAll('[data-campo]').forEach((el) => {
        o[el.dataset.campo] = el.type === 'checkbox' ? el.checked : el.value.trim();
      });
      return o;
    }).filter((o) => Object.keys(o).some((k) => o[k] !== '' && o[k] !== false));
  };

  /* --------------------------------------------------------- popup genérico */
  /**
   * cfg: { tipo, titulo, corpo, valores, aoSalvar(valores, form, ov), acao,
   *        aoMontar(ov), validar(form, ov) -> string|null }
   */
  function abrirForm(cfg) {
    const ov = WB.abrirPopup({
      tipo: cfg.tipo, titulo: cfg.titulo, largo: cfg.largo !== false,
      corpo: `<form novalidate class="f2form">${cfg.corpo}</form>
        <p class="f2erro" data-erro hidden role="alert"></p>`,
      rodape: `${cfg.rodapeExtra || ''}<span class="grow"></span>
        <button class="btn" data-fechar>Cancelar</button>
        <button class="btn btn--primary" data-enviar>${esc(cfg.acao || 'Salvar')}</button>`
    });
    const form = ov.querySelector('form');
    const erro = ov.querySelector('[data-erro]');
    ligarLinhas(ov);
    if (cfg.aoMontar) cfg.aoMontar(ov, form);
    WB.ligarTabelas(ov);

    form.addEventListener('submit', (e) => e.preventDefault());
    const btn = ov.querySelector('[data-enviar]');
    btn.addEventListener('click', () => {
      if (btn.dataset.enviando === '1') return;
      erro.hidden = true;
      if (!WB.validar(form)) return;
      const msg = cfg.validar ? cfg.validar(form, ov) : null;
      if (msg) {
        erro.textContent = msg;
        erro.hidden = false;
        erro.scrollIntoView ? erro.scrollIntoView({ block: 'nearest' }) : null;
        WB.toast(msg, 'erro');
        return;
      }
      btn.dataset.enviando = '1';
      btn.setAttribute('aria-disabled', 'true');
      try {
        cfg.aoSalvar(WB.lerForm(form), form, ov);
      } catch (err) {
        btn.dataset.enviando = '';
        btn.removeAttribute('aria-disabled');
        erro.textContent = 'Não foi possível gravar. Seus dados continuam preenchidos.';
        erro.hidden = false;
      }
    });
    return ov;
  }
  F2.abrirForm = abrirForm;

  /** Escreve na coleção (cria ou substitui pelo id), persiste e redesenha. */
  function gravar(colecao, registro) {
    const lista = F2.colecao(colecao);
    const i = lista.findIndex((x) => x.id === registro.id);
    if (i >= 0) lista[i] = registro; else lista.unshift(registro);
    F2.migrar(colecao, registro);
    F2.salvar(colecao);
    return registro;
  }
  F2.gravar = gravar;

  function remover(colecao, id) {
    const lista = F2.colecao(colecao);
    const i = lista.findIndex((x) => x.id === id);
    if (i < 0) return false;
    lista.splice(i, 1);
    F2.salvar(colecao);
    return true;
  }
  F2.remover = remover;

  function fechar(mensagem) {
    WB.fecharPopup();
    if (mensagem) WB.toast(mensagem);
    if (WB.rerender) WB.rerender();
  }

  const pessoasOpc = () => WB.data.pessoas.map((p) => ({ valor: p.id, texto: p.nome }));
  const hoje = () => WB.d(0);

  /* ====================================================== WEINVEST — LEAD */
  F2.abrirLead = function (id) {
    const atual = F2.lead(id);
    const v = atual || {};
    abrirForm({
      tipo: 'WeInvest', titulo: atual ? 'Editar lead' : 'Cadastrar lead',
      acao: atual ? 'Salvar alterações' : 'Cadastrar lead',
      corpo: bloco('Identificação', [
        WB.campo({ rotulo: 'Nome', nome: 'nome', obrigatorio: true, valor: v.nome, span2: true }),
        WB.campo({ rotulo: 'Telefone', nome: 'telefone', valor: v.telefone, placeholder: '(45) 90000-0000' }),
        WB.campo({ rotulo: 'E-mail', nome: 'email', tipo: 'email', valor: v.email }),
        WB.campo({ rotulo: 'Canal de origem', nome: 'canal', tipo: 'select', placeholder: 'Selecione', opcoes: F2.opc('canalOrigem'), valor: v.canal }),
        WB.campo({ rotulo: 'Categoria de interesse inicial', nome: 'categoria', tipo: 'select', placeholder: 'Selecione', opcoes: F2.opc('categoriaInteresse'), valor: v.categoria }),
        WB.campo({ rotulo: 'Data de entrada', nome: 'dataEntrada', tipo: 'date', obrigatorio: true, valor: v.dataEntrada || hoje() }),
        WB.campo({ rotulo: 'Responsável', nome: 'responsavel', tipo: 'select', placeholder: 'Selecione', opcoes: pessoasOpc(), valor: v.responsavel || WB.data.usuarioAtual }),
        WB.campo({ rotulo: 'Situação no funil', nome: 'status', tipo: 'select', opcoes: F2.opc('leadStatus').filter((o) => o.valor !== 'convertido'), valor: v.status === 'convertido' ? 'qualificado' : (v.status || 'novo'), ajuda: 'A situação "convertido" é aplicada pelo sistema quando uma venda é registrada.' }),
        WB.campo({ rotulo: 'Observações', nome: 'observacoes', tipo: 'textarea', span2: true, valor: v.observacoes })
      ].join(''), 'As etapas do funil não estão definidas nas fotos: esta lista é decisão de implementação e pode ser trocada.'),
      validar: (form) => {
        const data = form.querySelector('[name="dataEntrada"]').value;
        if (data && data > hoje()) return 'A data de entrada não pode estar no futuro.';
        return null;
      },
      aoSalvar: (val) => {
        const reg = Object.assign({}, atual || {}, {
          id: (atual && atual.id) || F2.novoId('WIL', WB.data.wi.leads),
          nome: val.nome.trim(), telefone: val.telefone, email: val.email,
          canal: val.canal, categoria: val.categoria, dataEntrada: val.dataEntrada,
          responsavel: val.responsavel, observacoes: val.observacoes,
          // Lead já convertido não volta atrás por edição de formulário.
          status: (atual && atual.status === 'convertido') ? 'convertido' : val.status,
          clienteId: (atual && atual.clienteId) || null
        });
        gravar('wi.leads', reg);
        fechar(atual ? 'Lead atualizado.' : 'Lead ' + reg.id + ' cadastrado.');
      }
    });
  };

  /* ================================================== WEINVEST — CLIENTE */
  F2.abrirClienteWi = function (id, preset) {
    const atual = F2.cliente(id);
    const v = atual || Object.assign({
      categoria: 'pf', perfil: {}, historico: { interacoes: [], proximosPassos: [] },
      carteira: [], vinculos: [], comprovacao: {}
    }, preset || {});
    const perfil = v.perfil || {};

    const identificacao = `
      ${grupo('Categoria', 'categoria', F2.opc('clienteCategoria'), 'radio', [v.categoria || 'pf'])}
      <div class="f2cond" data-cond="pf"${v.categoria === 'pj' ? ' hidden' : ''}>
        <div class="fgrid fgrid--2">
          ${WB.campo({ rotulo: 'Nome completo', nome: 'nome', valor: v.nome })}
          ${WB.campo({ rotulo: 'CPF', nome: 'cpf', valor: v.cpf, placeholder: '000.000.000-00' })}
        </div>
      </div>
      <div class="f2cond" data-cond="pj"${v.categoria === 'pj' ? '' : ' hidden'}>
        <div class="fgrid fgrid--2">
          ${WB.campo({ rotulo: 'Razão social', nome: 'razaoSocial', valor: v.razaoSocial })}
          ${WB.campo({ rotulo: 'CNPJ', nome: 'cnpj', valor: v.cnpj, placeholder: '00.000.000/0000-00' })}
          ${WB.campo({ rotulo: 'Nome do representante', nome: 'nomePj', valor: v.nome, span2: true })}
        </div>
      </div>
      <div class="fgrid fgrid--2">
        ${WB.campo({ rotulo: 'WhatsApp', nome: 'whatsapp', valor: v.whatsapp })}
        ${WB.campo({ rotulo: 'E-mail', nome: 'email', tipo: 'email', valor: v.email })}
        ${WB.campo({ rotulo: 'Grupo familiar / econômico', nome: 'grupoFamiliar', valor: v.grupoFamiliar, span2: true })}
        ${WB.campo({ rotulo: 'Descrição dos familiares', nome: 'descricaoFamiliares', tipo: 'textarea', valor: v.descricaoFamiliares, span2: true })}
      </div>`;

    const corpo =
      bloco('Identificação', identificacao) +
      `<fieldset class="f2bloco"><legend>Vínculos do grupo</legend>
        ${linhas('vinculos', [
          { titulo: 'Relação', campo: 'tipo', placeholder: 'Cônjuge, filho, holding…' },
          { titulo: 'Pessoa ou empresa', campo: 'nome' },
          { titulo: 'Cliente na base', campo: 'clienteId', tipo: 'select', placeholder: 'Sem vínculo na base', opcoes: WB.data.wi.clientes.filter((c) => c.id !== (atual && atual.id)).map((c) => ({ valor: c.id, texto: F2.nomeCliente(c) })) }
        ], v.vinculos, { rotulo: 'Pessoas e empresas ligadas', adicionar: 'Adicionar vínculo', vazio: 'Nenhum vínculo registrado.' })}
      </fieldset>` +
      bloco('Relacionamento', [
        WB.campo({ rotulo: 'Responsável', nome: 'responsavel', tipo: 'select', obrigatorio: true, placeholder: 'Selecione', opcoes: pessoasOpc(), valor: v.responsavel || WB.data.usuarioAtual }),
        WB.campo({ rotulo: 'Data de entrada', nome: 'dataEntrada', tipo: 'date', obrigatorio: true, valor: v.dataEntrada || hoje() }),
        WB.campo({ rotulo: 'Classificação', nome: 'classificacao', tipo: 'select', placeholder: 'Selecione', opcoes: F2.opc('classificacao'), valor: v.classificacao, ajuda: 'A foto lista exemplos, não uma taxonomia fechada.' }),
        WB.campo({ rotulo: 'Canal de origem', nome: 'canalOrigem', tipo: 'select', placeholder: 'Selecione', opcoes: F2.opc('canalOrigem'), valor: v.canalOrigem })
      ].join('')) +
      bloco('Perfil imobiliário', [
        grupo('Objetivos', 'objetivos', F2.opc('objetivos'), 'checkbox', arr(perfil.objetivos)),
        WB.campo({ rotulo: 'Regiões de interesse', nome: 'regioes', valor: arr(perfil.regioes).join(', '), span2: true, ajuda: 'Separe por vírgula.' }),
        WB.campo({ rotulo: 'Ticket mínimo (R$)', nome: 'ticketMin', tipo: 'number', min: 0, passo: '1000', valor: perfil.ticketMin }),
        WB.campo({ rotulo: 'Ticket máximo (R$)', nome: 'ticketMax', tipo: 'number', min: 0, passo: '1000', valor: perfil.ticketMax }),
        grupo('Categorias de interesse', 'categorias', F2.opc('categoriaInteresse'), 'checkbox', arr(perfil.categorias)),
        WB.campo({ rotulo: 'Preferências (características desejadas)', nome: 'preferencias', tipo: 'textarea', valor: perfil.preferencias, span2: true }),
        WB.campo({ rotulo: 'Restrições (o que não aceita)', nome: 'restricoes', tipo: 'textarea', valor: perfil.restricoes, span2: true }),
        grupo('Perfil de investimento', 'perfilInvestimento', F2.opc('perfilInvestimento'), 'radio', [perfil.perfilInvestimento])
      ].join('')) +
      `<fieldset class="f2bloco"><legend>Carteira imobiliária</legend>
        <p class="f2bloco__nota">O que o cliente já possui. Não se confunde com as compras feitas pela WeInvest, que saem dos negócios registrados.</p>
        ${linhas('carteira', [
          { titulo: 'Ativo na base', campo: 'ativoId', tipo: 'select', placeholder: 'Descrição livre', opcoes: WB.data.wi.ativos.map((a) => ({ valor: a.id, texto: a.titulo })) },
          { titulo: 'Descrição (se fora da base)', campo: 'descricao' },
          { titulo: 'Status', campo: 'status', tipo: 'select', placeholder: 'Selecione', opcoes: F2.opc('carteiraStatus') },
          { titulo: 'Observações / intenção', campo: 'observacoes' }
        ], v.carteira, { rotulo: 'Imóveis que o cliente já possui', adicionar: 'Adicionar imóvel', vazio: 'Nenhum imóvel registrado na carteira.', ajuda: 'A nomenclatura exata do status está rasurada na foto. Esta lista é editável.' })}
      </fieldset>`;

    abrirForm({
      tipo: 'WeInvest', titulo: atual ? 'Editar cliente' : 'Cadastrar cliente',
      acao: atual ? 'Salvar alterações' : 'Cadastrar cliente',
      corpo,
      aoMontar: (ov) => {
        const alternar = () => {
          const pj = ov.querySelector('input[name="categoria"][value="pj"]').checked;
          ov.querySelector('[data-cond="pf"]').hidden = pj;
          ov.querySelector('[data-cond="pj"]').hidden = !pj;
        };
        ov.querySelectorAll('input[name="categoria"]').forEach((r) => r.addEventListener('change', alternar));
        alternar();
      },
      validar: (form, ov) => {
        const pj = ov.querySelector('input[name="categoria"][value="pj"]').checked;
        const nome = pj ? form.querySelector('[name="razaoSocial"]').value : form.querySelector('[name="nome"]').value;
        if (!String(nome).trim()) return pj ? 'Informe a razão social.' : 'Informe o nome completo.';
        const min = num(form.querySelector('[name="ticketMin"]').value);
        const max = num(form.querySelector('[name="ticketMax"]').value);
        if (min != null && max != null && min > max) return 'O ticket mínimo não pode ser maior que o máximo.';
        if (form.querySelector('[name="dataEntrada"]').value > hoje()) return 'A data de entrada não pode estar no futuro.';
        return null;
      },
      aoSalvar: (val, form, ov) => {
        const pj = ov.querySelector('input[name="categoria"][value="pj"]').checked;
        const reg = Object.assign({}, atual || {}, {
          id: (atual && atual.id) || F2.novoId('WIC', WB.data.wi.clientes),
          categoria: pj ? 'pj' : 'pf',
          nome: (pj ? val.nomePj : val.nome) || '',
          cpf: pj ? (atual ? atual.cpf : '') : val.cpf,
          razaoSocial: pj ? val.razaoSocial : (atual ? atual.razaoSocial : ''),
          cnpj: pj ? val.cnpj : (atual ? atual.cnpj : ''),
          whatsapp: val.whatsapp, email: val.email,
          grupoFamiliar: val.grupoFamiliar, descricaoFamiliares: val.descricaoFamiliares,
          vinculos: F2.lerLinhas(ov, 'vinculos'),
          responsavel: val.responsavel, dataEntrada: val.dataEntrada,
          classificacao: val.classificacao, canalOrigem: val.canalOrigem,
          perfil: {
            objetivos: arr(val.objetivos),
            regioes: String(val.regioes || '').split(',').map((s) => s.trim()).filter(Boolean),
            ticketMin: num(val.ticketMin), ticketMax: num(val.ticketMax),
            categorias: arr(val.categorias),
            preferencias: val.preferencias, restricoes: val.restricoes,
            perfilInvestimento: val.perfilInvestimento || ''
          },
          carteira: F2.lerLinhas(ov, 'carteira').map((c, i) => Object.assign({
            id: (atual && atual.carteira && atual.carteira[i] && atual.carteira[i].id) || F2.novoId('CT', (atual && atual.carteira) || [])
          }, c)),
          historico: (atual && atual.historico) || { interacoes: [], proximosPassos: [] },
          comprovacao: (atual && atual.comprovacao) || { registrado: false, tipo: '', data: '', obs: '' },
          leadId: (atual && atual.leadId) || (preset && preset.leadId) || null,
          empresa: 'weinvest',
          criadoEm: (atual && atual.criadoEm) || hoje(), atualizadoEm: hoje()
        });
        gravar('wi.clientes', reg);
        if (!atual && preset && preset.leadId) {
          const lead = F2.lead(preset.leadId);
          if (lead && !lead.clienteId) { lead.clienteId = reg.id; lead.status = 'convertido'; F2.salvar('wi.leads'); }
        }
        fechar(atual ? 'Cliente atualizado.' : 'Cliente ' + reg.id + ' cadastrado.');
        if (!atual) location.hash = '#/wi/cliente/' + reg.id;
      }
    });
  };

  /* Comprovação de relacionamento: as fotos pedem a ação e o popup, mas não
     dizem o que comprova nem como. Registramos a declaração — não um arquivo,
     que este protótipo não sabe guardar. */
  F2.abrirComprovacao = function (clienteId) {
    const c = F2.cliente(clienteId);
    if (!c) return WB.toast('Cliente não encontrado.', 'erro');
    const cp = c.comprovacao || {};
    abrirForm({
      tipo: 'WeInvest', titulo: 'Comprovar relacionamento', largo: false,
      acao: 'Registrar comprovação',
      corpo: `<div class="rule" style="margin-bottom:16px">
          <strong>O que este registro é — e o que não é.</strong>
          <ul>
            <li>Fica registrado <em>que existe</em> um comprovante e qual é ele.</li>
            <li>O arquivo continua fora do WeBrain: não há upload neste protótipo.</li>
            <li>A foto não define o conteúdo dessa comprovação. Este formato é decisão de implementação.</li>
          </ul>
        </div>` +
        bloco('Comprovação', [
          WB.campo({ rotulo: 'Cliente', nome: 'cliente', valor: F2.nomeCliente(c), span2: true }),
          WB.campo({ rotulo: 'Tipo de comprovante', nome: 'tipo', obrigatorio: true, valor: cp.tipo, span2: true, placeholder: 'Contrato assinado, proposta aceita, e-mail de aceite…' }),
          WB.campo({ rotulo: 'Data', nome: 'data', tipo: 'date', obrigatorio: true, valor: cp.data || hoje() }),
          WB.campo({ rotulo: 'Onde está o documento', nome: 'obs', valor: cp.obs, placeholder: 'Pasta, processo ou sistema externo' })
        ].join('')),
      aoMontar: (ov) => { ov.querySelector('[name="cliente"]').readOnly = true; },
      validar: (form) => (form.querySelector('[name="data"]').value > hoje() ? 'A data da comprovação não pode estar no futuro.' : null),
      aoSalvar: (val) => {
        c.comprovacao = { registrado: true, tipo: val.tipo, data: val.data, obs: val.obs };
        c.atualizadoEm = hoje();
        F2.salvar('wi.clientes');
        fechar('Comprovação registrada.');
      }
    });
  };

  F2.abrirInteracao = function (clienteId) {
    const c = F2.cliente(clienteId);
    if (!c) return WB.toast('Cliente não encontrado.', 'erro');
    abrirForm({
      tipo: 'WeInvest', titulo: 'Registrar interação', largo: false, acao: 'Registrar',
      corpo: bloco('Interação', [
        WB.campo({ rotulo: 'Data', nome: 'data', tipo: 'date', obrigatorio: true, valor: hoje() }),
        WB.campo({ rotulo: 'Tipo', nome: 'tipo', tipo: 'select', opcoes: ['Reunião', 'Visita', 'Ligação', 'WhatsApp', 'E-mail', 'Outro'], valor: 'Reunião' }),
        WB.campo({ rotulo: 'O que aconteceu', nome: 'texto', tipo: 'textarea', obrigatorio: true, span2: true })
      ].join('')) +
      bloco('Próximo passo (opcional)', [
        WB.campo({ rotulo: 'Data prevista', nome: 'passoData', tipo: 'date' }),
        WB.campo({ rotulo: 'O que fazer', nome: 'passoTexto', span2: true })
      ].join('')),
      validar: (form) => (form.querySelector('[name="data"]').value > hoje() ? 'A interação não pode ser registrada com data futura.' : null),
      aoSalvar: (val) => {
        c.historico = c.historico || { interacoes: [], proximosPassos: [] };
        c.historico.interacoes.unshift({ data: val.data, tipo: val.tipo, texto: val.texto, autor: WB.data.usuarioAtual });
        if (String(val.passoTexto || '').trim()) {
          c.historico.proximosPassos.unshift({ data: val.passoData || '', texto: val.passoTexto, feito: false });
        }
        c.atualizadoEm = hoje();
        F2.salvar('wi.clientes');
        fechar('Interação registrada.');
      }
    });
  };

  /* ==================================================== WEINVEST — ATIVO */
  F2.abrirAtivo = function (id) {
    const atual = F2.ativo(id);
    const v = atual || {};
    const parceirosOpc = WB.data.wi.parceiros.map((p) => ({ valor: p.id, texto: F2.nomeParceiro(p) }));

    const corpo =
      bloco('Identificação', [
        WB.campo({ rotulo: 'Título / identificação', nome: 'titulo', obrigatorio: true, valor: v.titulo, span2: true }),
        WB.campo({ rotulo: 'Status', nome: 'status', tipo: 'select', obrigatorio: true, opcoes: F2.opc('ativoStatus'), valor: v.status || 'disponivel' }),
        WB.campo({ rotulo: 'Categoria', nome: 'categoria', tipo: 'select', placeholder: 'Selecione', opcoes: F2.opc('ativoCategoria'), valor: v.categoria }),
        WB.campo({ rotulo: 'Tipo', nome: 'tipo', tipo: 'select', placeholder: 'Selecione', opcoes: F2.opc('ativoTipo'), valor: v.tipo, span2: true })
      ].join('')) +
      bloco('Localização', [
        WB.campo({ rotulo: 'Endereço', nome: 'endereco', valor: v.endereco, span2: true }),
        WB.campo({ rotulo: 'Município', nome: 'municipio', valor: v.municipio }),
        WB.campo({ rotulo: 'Estado', nome: 'estado', valor: v.estado, placeholder: 'PR' }),
        WB.campo({ rotulo: 'Coordenadas', nome: 'coordenadas', valor: v.coordenadas, span2: true, placeholder: '-24.9555, -53.4552' })
      ].join('')) +
      bloco('Preço e área', [
        WB.campo({ rotulo: 'Preço total (R$)', nome: 'precoTotal', tipo: 'number', min: 0, passo: '1000', valor: v.precoTotal }),
        WB.campo({ rotulo: 'Área / metragem (m²)', nome: 'area', tipo: 'number', min: 0, passo: '0.01', valor: v.area }),
        WB.campo({ rotulo: 'Preço por m² (R$)', nome: 'precoM2', tipo: 'number', min: 0, passo: '0.01', valor: v.precoM2, ajuda: 'Deixe em branco para calcular a partir do preço total e da área.' })
      ].join('')) +
      bloco('Características', [
        WB.campo({ rotulo: 'Quartos', nome: 'quartos', tipo: 'number', min: 0, valor: v.quartos }),
        WB.campo({ rotulo: 'Vagas', nome: 'vagas', tipo: 'number', min: 0, valor: v.vagas }),
        WB.campo({ rotulo: 'Particularidades', nome: 'particularidades', tipo: 'textarea', valor: v.particularidades, span2: true })
      ].join('')) +
      `<fieldset class="f2bloco"><legend>Proprietários</legend>
        ${linhas('proprietarios', [
          { titulo: 'Tipo', campo: 'tipo', tipo: 'select', opcoes: [{ valor: 'pessoa', texto: 'Pessoa' }, { valor: 'empresa', texto: 'Empresa' }] },
          { titulo: 'Nome / razão social', campo: 'nome' },
          { titulo: 'CPF / CNPJ', campo: 'documento' },
          { titulo: 'Cliente na base', campo: 'clienteId', tipo: 'select', placeholder: 'Não é cliente', opcoes: WB.data.wi.clientes.map((c) => ({ valor: c.id, texto: F2.nomeCliente(c) })) }
        ], v.proprietarios, { rotulo: 'Pessoa ou empresa proprietária', adicionar: 'Adicionar proprietário', vazio: 'Nenhum proprietário informado.' })}
      </fieldset>` +
      bloco('Origem e comissão', [
        WB.campo({ rotulo: 'Origem', nome: 'origem', tipo: 'select', opcoes: F2.opc('ativoOrigem'), valor: v.origem || 'weinvest', ajuda: 'Quem trouxe o ativo.' }),
        WB.campo({ rotulo: 'Parceiro que originou', nome: 'parceiroId', tipo: 'select', placeholder: 'Nenhum', opcoes: parceirosOpc, valor: v.parceiroId }),
        WB.campo({ rotulo: 'Comissão (%)', nome: 'comissaoPercentual', tipo: 'number', min: 0, passo: '0.01', valor: v.comissaoPercentual, ajuda: 'Percentual sobre o valor negociado da venda.' }),
        WB.campo({ rotulo: 'Comissão — condição', nome: 'comissaoCondicao', valor: v.comissaoCondicao, placeholder: 'Quando e como é paga' })
      ].join('')) +
      bloco('Exclusividade e confidencialidade', [
        grupo('Exclusividade', 'exclusividade', [{ valor: 'sim', texto: 'Sim' }, { valor: 'nao', texto: 'Não' }], 'radio', [v.exclusividade ? 'sim' : 'nao']),
        WB.campo({ rotulo: 'Prazo da exclusividade', nome: 'exclusividadePrazo', tipo: 'date', valor: v.exclusividadePrazo, span2: true }),
        grupo('Confidencialidade', 'confidencial', [{ valor: 'sim', texto: 'Sim' }, { valor: 'nao', texto: 'Não' }], 'radio', [v.confidencial ? 'sim' : 'nao']),
        grupo('Quem pode visualizar', 'confidencialPara', [
          { valor: 'admin', texto: 'Administrador' }, { valor: 'diretoria', texto: 'Diretoria' },
          { valor: 'head', texto: 'Head' }, { valor: 'analista', texto: 'Analista' }
        ], 'checkbox', arr(v.confidencialPara).length ? arr(v.confidencialPara) : ['admin', 'diretoria', 'head'],
          'Este filtro é de interface. Ele esconde o ativo das listas e da busca, mas não é autorização: quem abrir os arquivos do protótipo lê tudo.')
      ].join('')) +
      `<fieldset class="f2bloco"><legend>Documentos e mídia</legend>
        <p class="f2bloco__nota">Referências e endereços, não arquivos. Este protótipo não faz upload nem guarda binários.</p>
        ${linhas('documentos', [
          { titulo: 'Documento', campo: 'nome' },
          { titulo: 'Tipo', campo: 'tipo', placeholder: 'Matrícula, licença…' },
          { titulo: 'Endereço (URL)', campo: 'url', placeholder: 'https://' }
        ], v.documentos, { rotulo: 'Documentos', adicionar: 'Adicionar documento', vazio: 'Nenhum documento referenciado.' })}
        ${linhas('midia', [
          { titulo: 'Item', campo: 'nome' },
          { titulo: 'Tipo', campo: 'tipo', placeholder: 'Galeria, vídeo…' },
          { titulo: 'Endereço (URL)', campo: 'url', placeholder: 'https://' }
        ], v.midia, { rotulo: 'Fotos e vídeos', adicionar: 'Adicionar mídia', vazio: 'Nenhuma mídia referenciada.' })}
      </fieldset>` +
      bloco('Observações', WB.campo({ rotulo: 'Observações', nome: 'observacoes', tipo: 'textarea', valor: v.observacoes, span2: true }));

    abrirForm({
      tipo: 'WeInvest', titulo: atual ? 'Editar ativo' : 'Cadastrar empreendimento / ativo',
      acao: atual ? 'Salvar alterações' : 'Cadastrar ativo',
      corpo,
      aoMontar: (ov) => {
        const origem = ov.querySelector('[name="origem"]');
        const parceiro = ov.querySelector('[name="parceiroId"]').closest('.fld');
        const sincronizar = () => { parceiro.hidden = origem.value !== 'parceiro'; };
        origem.addEventListener('change', sincronizar);
        sincronizar();
      },
      validar: (form, ov) => {
        if (form.querySelector('[name="origem"]').value === 'parceiro' && !form.querySelector('[name="parceiroId"]').value) {
          return 'Origem "Parceiro" exige indicar qual parceiro trouxe o ativo.';
        }
        const exc = ov.querySelector('input[name="exclusividade"][value="sim"]').checked;
        const prazo = form.querySelector('[name="exclusividadePrazo"]').value;
        if (exc && prazo && prazo < hoje()) return 'O prazo de exclusividade já passou. Ajuste a data ou marque exclusividade "Não".';
        const pct = num(form.querySelector('[name="comissaoPercentual"]').value);
        if (pct != null && (pct < 0 || pct > 100)) return 'A comissão em percentual precisa ficar entre 0 e 100.';
        return null;
      },
      aoSalvar: (val, form, ov) => {
        const precoTotal = num(val.precoTotal);
        const area = num(val.area);
        let precoM2 = num(val.precoM2);
        // Calculado só quando não foi informado — e a ficha diz que é calculado.
        if (precoM2 == null && precoTotal != null && area) precoM2 = precoTotal / area;
        const reg = Object.assign({}, atual || {}, {
          id: (atual && atual.id) || F2.novoId('WIA', WB.data.wi.ativos),
          titulo: val.titulo.trim(), status: val.status, categoria: val.categoria, tipo: val.tipo,
          endereco: val.endereco, municipio: val.municipio, estado: val.estado, coordenadas: val.coordenadas,
          precoTotal, area, precoM2,
          precoM2Calculado: num(val.precoM2) == null && precoM2 != null,
          quartos: num(val.quartos), vagas: num(val.vagas), particularidades: val.particularidades,
          proprietarios: F2.lerLinhas(ov, 'proprietarios'),
          origem: val.origem, parceiroId: val.origem === 'parceiro' ? val.parceiroId : null,
          comissaoPercentual: num(val.comissaoPercentual), comissaoCondicao: val.comissaoCondicao,
          exclusividade: val.exclusividade === 'sim', exclusividadePrazo: val.exclusividadePrazo,
          confidencial: val.confidencial === 'sim', confidencialPara: arr(val.confidencialPara),
          documentos: F2.lerLinhas(ov, 'documentos'), midia: F2.lerLinhas(ov, 'midia'),
          observacoes: val.observacoes
        });
        gravar('wi.ativos', reg);
        fechar(atual ? 'Ativo atualizado.' : 'Ativo ' + reg.id + ' cadastrado.');
      }
    });
  };

  /* ================================================= WEINVEST — PARCEIRO */
  F2.abrirParceiro = function (id) {
    const atual = F2.parceiro(id);
    const v = atual || {};
    const corpo =
      bloco('Identificação', `
        ${grupo('Categoria de pessoa', 'categoriaPessoa', F2.opc('clienteCategoria'), 'radio', [v.categoriaPessoa || 'pf'])}
        <div class="f2cond span2" data-cond="pf"${v.categoriaPessoa === 'pj' ? ' hidden' : ''}>
          <div class="fgrid fgrid--2">
            ${WB.campo({ rotulo: 'Nome completo', nome: 'nome', valor: v.nome })}
            ${WB.campo({ rotulo: 'CPF', nome: 'cpf', valor: v.cpf })}
          </div>
        </div>
        <div class="f2cond span2" data-cond="pj"${v.categoriaPessoa === 'pj' ? '' : ' hidden'}>
          <div class="fgrid fgrid--2">
            ${WB.campo({ rotulo: 'Razão social', nome: 'razaoSocial', valor: v.razaoSocial })}
            ${WB.campo({ rotulo: 'CNPJ', nome: 'cnpj', valor: v.cnpj })}
            ${WB.campo({ rotulo: 'Nome do representante', nome: 'nomePj', valor: v.nome, span2: true })}
          </div>
        </div>`) +
      bloco('Enquadramento', [
        WB.campo({ rotulo: 'Status', nome: 'status', tipo: 'select', opcoes: [{ valor: 'ativo', texto: 'Ativo' }, { valor: 'inativo', texto: 'Inativo' }], valor: v.status || 'ativo' }),
        WB.campo({ rotulo: 'Categoria', nome: 'categoria', tipo: 'select', opcoes: F2.opc('parceiroCategoria'), valor: v.categoria || 'externo', ajuda: 'Originador ou parceiro externo.' }),
        grupo('Tipo / perfil profissional', 'tipos', F2.opc('parceiroTipo'), 'checkbox', arr(v.tipos),
          'Campo separado da categoria e do enquadramento PF/PJ. Um parceiro pode acumular perfis.')
      ].join('')) +
      bloco('Atuação e contato', [
        WB.campo({ rotulo: 'Mercados / cidades de atuação', nome: 'mercados', valor: arr(v.mercados).join(', '), span2: true, ajuda: 'Separe por vírgula.' }),
        grupo('Especialidade (categoria de ativo que domina)', 'especialidades', F2.opc('categoriaInteresse'), 'checkbox', arr(v.especialidades)),
        WB.campo({ rotulo: 'WhatsApp', nome: 'whatsapp', valor: v.whatsapp }),
        WB.campo({ rotulo: 'E-mail', nome: 'email', tipo: 'email', valor: v.email }),
        WB.campo({ rotulo: 'Parceiro desde', nome: 'desde', tipo: 'date', valor: v.desde || hoje() }),
        WB.campo({ rotulo: 'Observações', nome: 'observacoes', tipo: 'textarea', valor: v.observacoes, span2: true })
      ].join('')) +
      `<div class="rule"><strong>Histórico e performance não são digitados.</strong>
        <p style="margin:6px 0 0">Ativos originados, clientes indicados, negócios, comissões e indicadores saem dos registros ligados a este parceiro. Abra a ficha para vê-los.</p></div>`;

    abrirForm({
      tipo: 'WeInvest', titulo: atual ? 'Editar parceiro' : 'Adicionar parceiro',
      acao: atual ? 'Salvar alterações' : 'Adicionar parceiro',
      corpo,
      aoMontar: (ov) => {
        const alternar = () => {
          const pj = ov.querySelector('input[name="categoriaPessoa"][value="pj"]').checked;
          ov.querySelector('[data-cond="pf"]').hidden = pj;
          ov.querySelector('[data-cond="pj"]').hidden = !pj;
        };
        ov.querySelectorAll('input[name="categoriaPessoa"]').forEach((r) => r.addEventListener('change', alternar));
        alternar();
      },
      validar: (form, ov) => {
        const pj = ov.querySelector('input[name="categoriaPessoa"][value="pj"]').checked;
        const nome = pj ? form.querySelector('[name="razaoSocial"]').value : form.querySelector('[name="nome"]').value;
        if (!String(nome).trim()) return pj ? 'Informe a razão social.' : 'Informe o nome completo.';
        return null;
      },
      aoSalvar: (val, form, ov) => {
        const pj = ov.querySelector('input[name="categoriaPessoa"][value="pj"]').checked;
        const reg = Object.assign({}, atual || {}, {
          id: (atual && atual.id) || F2.novoId('WIP', WB.data.wi.parceiros),
          categoriaPessoa: pj ? 'pj' : 'pf',
          nome: (pj ? val.nomePj : val.nome) || '',
          cpf: pj ? (atual ? atual.cpf : '') : val.cpf,
          razaoSocial: pj ? val.razaoSocial : (atual ? atual.razaoSocial : ''),
          cnpj: pj ? val.cnpj : (atual ? atual.cnpj : ''),
          status: val.status, categoria: val.categoria, tipos: arr(val.tipos),
          mercados: String(val.mercados || '').split(',').map((s) => s.trim()).filter(Boolean),
          especialidades: arr(val.especialidades),
          whatsapp: val.whatsapp, email: val.email, desde: val.desde, observacoes: val.observacoes
        });
        gravar('wi.parceiros', reg);
        fechar(atual ? 'Parceiro atualizado.' : 'Parceiro ' + reg.id + ' adicionado.');
      }
    });
  };

  /* ========================================== WEINVEST — VENDA / NEGÓCIO */
  F2.abrirNegocio = function (id, preset) {
    const atual = F2.negocio(id);
    const v = atual || Object.assign({ comissoes: [], parceiros: [] }, preset || {});
    const clientesOpc = WB.data.wi.clientes.map((c) => ({ valor: c.id, texto: F2.nomeCliente(c) + ' · ' + c.id }));
    const leadsOpc = WB.data.wi.leads.filter((l) => l.status !== 'convertido' || (atual && atual.leadId === l.id))
      .map((l) => ({ valor: l.id, texto: l.nome + ' · ' + l.id }));
    const ativosOpc = F2.ativosVisiveis().map((a) => ({ valor: a.id, texto: a.titulo + ' · ' + F2.rotulo('ativoStatus', a.status) }));
    const parceirosOpc = WB.data.wi.parceiros.map((p) => ({ valor: p.id, texto: F2.nomeParceiro(p) }));
    const compradorInicial = v.clienteId ? 'cliente' : (v.leadId ? 'lead' : 'cliente');

    const corpo =
      `<div class="rule" style="margin-bottom:16px">
        <strong>Negociação e venda não são a mesma coisa.</strong>
        <ul>
          <li><em>Em negociação</em> registra a oportunidade: não converte lead, não muda o status do ativo, não entra no VGV vendido.</li>
          <li><em>Venda registrada</em> converte o lead em cliente, marca o ativo como vendido e alimenta os resumos.</li>
          <li>Os estágios intermediários do CRM não estão definidos nas fotos — estas três situações são decisão de implementação.</li>
        </ul>
      </div>` +
      bloco('Comprador', `
        ${grupo('Origem do comprador', 'tipoComprador', [{ valor: 'cliente', texto: 'Cliente já cadastrado' }, { valor: 'lead', texto: 'Lead (vira cliente ao registrar a venda)' }], 'radio', [compradorInicial])}
        <div class="f2cond span2" data-cond="cliente">
          <div class="fgrid fgrid--2">
            ${WB.campo({ rotulo: 'Cliente', nome: 'clienteId', tipo: 'select', placeholder: 'Selecione', opcoes: clientesOpc, valor: v.clienteId, span2: true })}
          </div>
        </div>
        <div class="f2cond span2" data-cond="lead">
          <div class="fgrid fgrid--2">
            ${WB.campo({ rotulo: 'Lead', nome: 'leadId', tipo: 'select', placeholder: 'Selecione', opcoes: leadsOpc, valor: v.leadId, span2: true, ajuda: 'Ao registrar a venda, o lead passa para a lista de clientes com o histórico preservado.' })}
          </div>
        </div>
        ${WB.campo({ rotulo: 'Representante do cliente', nome: 'clienteRepresentante', valor: v.clienteRepresentante, span2: true })}`) +
      bloco('Ativo', [
        WB.campo({ rotulo: 'Ativo', nome: 'ativoId', tipo: 'select', obrigatorio: true, placeholder: 'Selecione', opcoes: ativosOpc, valor: v.ativoId, span2: true }),
        WB.campo({ rotulo: 'Representante do ativo', nome: 'ativoRepresentante', valor: v.ativoRepresentante, span2: true })
      ].join('')) +
      bloco('Negociação', [
        WB.campo({ rotulo: 'Responsável pela negociação', nome: 'responsavel', tipo: 'select', obrigatorio: true, placeholder: 'Selecione', opcoes: pessoasOpc(), valor: v.responsavel || WB.data.usuarioAtual }),
        WB.campo({ rotulo: 'Situação', nome: 'situacao', tipo: 'select', obrigatorio: true, opcoes: F2.opc('negocioSituacao'), valor: v.situacao || 'negociacao' }),
        WB.campo({ rotulo: 'Formato da negociação', nome: 'formato', tipo: 'select', placeholder: 'Selecione', opcoes: F2.opc('negocioFormato'), valor: v.formato }),
        WB.campo({ rotulo: 'Contrato', nome: 'contrato', valor: v.contrato, placeholder: 'Número ou referência' }),
        WB.campo({ rotulo: 'Data de fechamento', nome: 'dataFechamento', tipo: 'date', valor: v.dataFechamento }),
        WB.campo({ rotulo: 'Unidades', nome: 'unidades', tipo: 'number', min: 1, valor: v.unidades == null ? 1 : v.unidades })
      ].join('')) +
      bloco('Valores', [
        WB.campo({ rotulo: 'Valor negociado (R$)', nome: 'valorNegociado', tipo: 'number', min: 0, passo: '0.01', valor: v.valorNegociado, ajuda: 'Base de cálculo de todos os percentuais desta tela.' }),
        WB.campo({ rotulo: 'VGV (R$)', nome: 'vgv', tipo: 'number', min: 0, passo: '0.01', valor: v.vgv, ajuda: 'Valor geral de vendas do ativo. Não é receita nem comissão.' }),
        WB.campo({ rotulo: 'Valor já recebido (R$)', nome: 'valorRecebido', tipo: 'number', min: 0, passo: '0.01', valor: v.valorRecebido, ajuda: 'O valor a receber é a diferença para o valor negociado.' })
      ].join(''), 'VGV, valor negociado, receita e comissão são campos distintos. O sistema não soma nem deduz um do outro.') +
      bloco('Comissão', [
        WB.campo({ rotulo: 'Comissão bruta (R$)', nome: 'comissaoBrutaValor', tipo: 'number', min: 0, passo: '0.01', valor: v.comissaoBrutaValor }),
        WB.campo({ rotulo: 'Comissão bruta (%)', nome: 'comissaoBrutaPct', tipo: 'number', min: 0, passo: '0.01', valor: v.comissaoBrutaPct, ajuda: 'Percentual sobre o valor negociado.' }),
        WB.campo({ rotulo: 'Comissão líquida (R$)', nome: 'comissaoLiquidaValor', tipo: 'number', min: 0, passo: '0.01', valor: v.comissaoLiquidaValor, ajuda: 'Campo informado, não calculado: as fotos não definem impostos nem descontos.', span2: true })
      ].join('')) +
      `<fieldset class="f2bloco"><legend>Parceiros envolvidos</legend>
        <p class="f2bloco__nota">Deixe vazio quando não houver parceiro no negócio.</p>
        ${linhas('parceirosEnvolvidos', [
          { titulo: 'Parceiro', campo: 'parceiroId', tipo: 'select', placeholder: 'Selecione', opcoes: parceirosOpc },
          { titulo: 'Papel', campo: 'papel', tipo: 'select', placeholder: 'Selecione', opcoes: F2.opc('papelParceiro') }
        ], v.parceiros, { rotulo: 'Quem participou', adicionar: 'Adicionar parceiro', vazio: 'Sem parceiro neste negócio.' })}
      </fieldset>` +
      `<fieldset class="f2bloco"><legend>Rateio da comissão</legend>
        <p class="f2bloco__nota">As regras de rateio não estão definidas nas fotos. Cada linha é informada à mão; o sistema só avisa quando a soma passa da comissão bruta.</p>
        ${linhas('comissoes', [
          { titulo: 'Beneficiário', campo: 'beneficiario', tipo: 'select', placeholder: 'Selecione', opcoes: [{ valor: 'weinvest', texto: 'WeInvest' }, { valor: 'parceiro', texto: 'Parceiro' }, { valor: 'outro', texto: 'Outro' }] },
          { titulo: 'Parceiro', campo: 'parceiroId', tipo: 'select', placeholder: '—', opcoes: parceirosOpc },
          { titulo: 'Valor (R$)', campo: 'valor', tipo: 'number', min: 0, passo: '0.01' },
          { titulo: '% sobre o negociado', campo: 'percentual', tipo: 'number', min: 0, passo: '0.01' },
          { titulo: 'Recebida', campo: 'recebido', tipo: 'checkbox' },
          { titulo: 'Data do recebimento', campo: 'dataRecebimento', tipo: 'date' }
        ], v.comissoes, { rotulo: 'Comissões', adicionar: 'Nova comissão', vazio: 'Nenhuma comissão informada.' })}
      </fieldset>` +
      bloco('Observações', WB.campo({ rotulo: 'Observações', nome: 'observacoes', tipo: 'textarea', valor: v.observacoes, span2: true }));

    abrirForm({
      tipo: 'WeInvest', titulo: atual ? 'Editar venda / negócio' : 'Cadastrar venda / negócio',
      acao: atual ? 'Salvar alterações' : 'Registrar',
      corpo,
      aoMontar: (ov) => {
        const alternar = () => {
          const tipo = ov.querySelector('input[name="tipoComprador"]:checked').value;
          ov.querySelector('[data-cond="cliente"]').hidden = tipo !== 'cliente';
          ov.querySelector('[data-cond="lead"]').hidden = tipo !== 'lead';
        };
        ov.querySelectorAll('input[name="tipoComprador"]').forEach((r) => r.addEventListener('change', alternar));
        alternar();
      },
      validar: (form, ov) => {
        const tipo = ov.querySelector('input[name="tipoComprador"]:checked').value;
        if (tipo === 'cliente' && !form.querySelector('[name="clienteId"]').value) return 'Selecione o cliente do negócio.';
        if (tipo === 'lead' && !form.querySelector('[name="leadId"]').value) return 'Selecione o lead do negócio.';
        const situacao = form.querySelector('[name="situacao"]').value;
        const negociado = num(form.querySelector('[name="valorNegociado"]').value);
        const recebido = num(form.querySelector('[name="valorRecebido"]').value);
        const fechamento = form.querySelector('[name="dataFechamento"]').value;
        if (situacao === 'vendido' && negociado == null) return 'Uma venda registrada precisa do valor negociado.';
        if (situacao === 'vendido' && !fechamento) return 'Uma venda registrada precisa da data de fechamento.';
        if (fechamento && fechamento > hoje()) return 'A data de fechamento não pode estar no futuro.';
        if (recebido != null && negociado != null && recebido > negociado) return 'O valor recebido não pode passar do valor negociado.';
        const pct = num(form.querySelector('[name="comissaoBrutaPct"]').value);
        if (pct != null && (pct < 0 || pct > 100)) return 'A comissão bruta em percentual precisa ficar entre 0 e 100.';
        const bruta = num(form.querySelector('[name="comissaoBrutaValor"]').value);
        const liquida = num(form.querySelector('[name="comissaoLiquidaValor"]').value);
        if (bruta != null && liquida != null && liquida > bruta) return 'A comissão líquida não pode ser maior que a bruta.';
        const comissoes = F2.lerLinhas(ov, 'comissoes');
        if (comissoes.some((c) => c.beneficiario === 'parceiro' && !c.parceiroId)) return 'Toda comissão de parceiro precisa dizer qual parceiro.';
        if (comissoes.some((c) => c.recebido && !c.dataRecebimento)) return 'Comissão marcada como recebida precisa da data do recebimento.';
        const envolvidos = F2.lerLinhas(ov, 'parceirosEnvolvidos');
        if (envolvidos.some((p) => !p.parceiroId || !p.papel)) return 'Cada parceiro envolvido precisa de nome e papel.';
        return null;
      },
      aoSalvar: (val, form, ov) => {
        const tipo = ov.querySelector('input[name="tipoComprador"]:checked').value;
        const envolvidos = F2.lerLinhas(ov, 'parceirosEnvolvidos');
        const comissoesBrutas = F2.lerLinhas(ov, 'comissoes');
        const idNegocio = (atual && atual.id) || F2.novoId('WIN', WB.data.wi.negocios);

        const reg = Object.assign({}, atual || {}, {
          id: idNegocio,
          clienteId: tipo === 'cliente' ? val.clienteId : (atual ? atual.clienteId : null),
          leadId: tipo === 'lead' ? val.leadId : (atual ? atual.leadId : null),
          clienteRepresentante: val.clienteRepresentante,
          ativoId: val.ativoId, ativoRepresentante: val.ativoRepresentante,
          responsavel: val.responsavel, situacao: val.situacao,
          semParceiro: envolvidos.length === 0,
          parceiros: envolvidos.map((p) => ({ parceiroId: p.parceiroId, papel: p.papel })),
          valorNegociado: num(val.valorNegociado), vgv: num(val.vgv),
          unidades: num(val.unidades) || 1,
          comissaoBrutaValor: num(val.comissaoBrutaValor), comissaoBrutaPct: num(val.comissaoBrutaPct),
          comissaoLiquidaValor: num(val.comissaoLiquidaValor),
          comissoes: comissoesBrutas.map((c, i) => ({
            id: (atual && atual.comissoes && atual.comissoes[i] && atual.comissoes[i].id) || F2.novoId('WICM', (atual && atual.comissoes) || []),
            beneficiario: c.beneficiario || 'weinvest',
            parceiroId: c.beneficiario === 'parceiro' ? c.parceiroId : null,
            valor: num(c.valor), percentual: num(c.percentual),
            recebido: !!c.recebido, dataRecebimento: c.recebido ? c.dataRecebimento : ''
          })),
          formato: val.formato, contrato: val.contrato,
          valorRecebido: num(val.valorRecebido), dataFechamento: val.dataFechamento,
          observacoes: val.observacoes,
          criadoEm: (atual && atual.criadoEm) || hoje(), atualizadoEm: hoje()
        });

        const efeitos = F2.aplicarNegocio(reg);
        gravar('wi.negocios', reg);
        WB.fecharPopup();
        F2.confirmarNegocio(reg, efeitos, !atual);
      }
    });
  };

  /**
   * Efeitos colaterais de um negócio. Chamado antes de gravar e desenhado para
   * ser IDEMPOTENTE: rodar duas vezes com o mesmo registro não cria um segundo
   * cliente, não duplica a conversão nem repete a carteira.
   */
  F2.aplicarNegocio = function (reg) {
    const efeitos = [];
    if (reg.situacao !== 'vendido') return efeitos;

    // 1. Conversão do lead. Só acontece uma vez: o vínculo `lead.clienteId`
    //    é a trava.
    if (reg.leadId && !reg.clienteId) {
      const lead = F2.lead(reg.leadId);
      if (lead) {
        if (lead.clienteId && F2.cliente(lead.clienteId)) {
          reg.clienteId = lead.clienteId;
          efeitos.push('O lead ' + lead.nome + ' já estava vinculado ao cliente ' + lead.clienteId + '. O negócio usou esse cliente.');
        } else {
          const novo = {
            id: F2.novoId('WIC', WB.data.wi.clientes),
            categoria: 'pf', nome: lead.nome, cpf: '', razaoSocial: '', cnpj: '',
            whatsapp: lead.telefone || '', email: lead.email || '',
            grupoFamiliar: '', vinculos: [], descricaoFamiliares: '',
            responsavel: lead.responsavel || reg.responsavel, dataEntrada: lead.dataEntrada || hoje(),
            comprovacao: { registrado: false, tipo: '', data: '', obs: '' },
            classificacao: '', canalOrigem: lead.canal || '',
            perfil: {
              objetivos: ['Comprar'], regioes: [], ticketMin: null, ticketMax: null,
              categorias: lead.categoria ? [lead.categoria] : [], preferencias: '',
              restricoes: '', perfilInvestimento: ''
            },
            historico: {
              interacoes: [{
                data: hoje(), tipo: 'Conversão',
                texto: 'Convertido de lead (' + lead.id + ') ao registrar o negócio ' + reg.id + '.'
                  + (lead.observacoes ? ' Observações do lead: ' + lead.observacoes : ''),
                autor: WB.data.usuarioAtual
              }],
              proximosPassos: []
            },
            carteira: [], leadId: lead.id, empresa: 'weinvest',
            criadoEm: hoje(), atualizadoEm: hoje()
          };
          WB.data.wi.clientes.unshift(novo);
          F2.salvar('wi.clientes');
          lead.clienteId = novo.id;
          reg.clienteId = novo.id;
          efeitos.push('Lead ' + lead.nome + ' convertido no cliente ' + novo.id + ', com o histórico preservado.');
        }
        if (lead.status !== 'convertido') { lead.status = 'convertido'; efeitos.push('Lead ' + lead.id + ' marcado como convertido.'); }
        F2.salvar('wi.leads');
      }
    }

    // 2. Ativo vendido.
    const ativo = F2.ativo(reg.ativoId);
    if (ativo && ativo.status !== 'vendido') {
      ativo.status = 'vendido';
      F2.salvar('wi.ativos');
      efeitos.push('Ativo "' + ativo.titulo + '" passou para vendido.');
    }

    // 3. Carteira do cliente: o imóvel comprado passa a ser algo que ele
    //    possui. A trava é o par (ativo, origem do negócio).
    const cliente = F2.cliente(reg.clienteId);
    if (cliente && ativo) {
      cliente.carteira = cliente.carteira || [];
      const jaTem = cliente.carteira.some((c) => c.negocioId === reg.id || (c.ativoId && c.ativoId === ativo.id));
      if (!jaTem) {
        cliente.carteira.push({
          id: F2.novoId('CT', cliente.carteira), ativoId: ativo.id, descricao: '',
          status: 'Possui', observacoes: 'Adquirido pela WeInvest no negócio ' + reg.id + '.',
          negocioId: reg.id
        });
        efeitos.push('Ativo incluído na carteira de ' + F2.nomeCliente(cliente) + ' com a origem registrada.');
      }
      cliente.atualizadoEm = hoje();
      F2.salvar('wi.clientes');
    }
    return efeitos;
  };

  /** Confirmação: diz o que mudou e o que não mudou. */
  F2.confirmarNegocio = function (reg, efeitos, novo) {
    const cliente = F2.cliente(reg.clienteId);
    const ativo = F2.ativo(reg.ativoId);
    const com = F2.resumoComissoes(reg);
    WB.abrirPopup({
      tipo: 'Confirmação', titulo: novo ? 'Negócio registrado' : 'Negócio atualizado',
      corpo: `<dl class="dl">
          <dt>Número</dt><dd><span class="mono">${esc(reg.id)}</span></dd>
          <dt>Situação</dt><dd>${esc(F2.rotulo('negocioSituacao', reg.situacao))}</dd>
          <dt>Cliente</dt><dd>${esc(cliente ? F2.nomeCliente(cliente) : 'não vinculado')}</dd>
          <dt>Ativo</dt><dd>${esc(ativo ? ativo.titulo : '—')}</dd>
          <dt>Valor negociado</dt><dd>${F2.moedaOuVazio(reg.valorNegociado)}</dd>
          <dt>VGV</dt><dd>${F2.moedaOuVazio(reg.vgv)}</dd>
          <dt>Comissão bruta</dt><dd>${F2.moedaOuVazio(reg.comissaoBrutaValor)}</dd>
          <dt>Comissão líquida</dt><dd>${reg.comissaoLiquidaValor == null ? '<span class="muted">não informada</span>' : F2.moedaOuVazio(reg.comissaoLiquidaValor)}</dd>
          <dt>Comissão prevista (rateio)</dt><dd>${com.prevista == null ? '<span class="muted">sem rateio</span>' : F2.moedaOuVazio(com.prevista)}</dd>
          <dt>Comissão já recebida</dt><dd>${com.recebida == null ? '<span class="muted">sem rateio</span>' : F2.moedaOuVazio(com.recebida)}</dd>
        </dl>
        ${efeitos.length ? `<div class="rule" style="margin-top:18px"><strong>O que mudou junto.</strong><ul>${efeitos.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''}
        ${com.excedeBruta ? `<div class="rule" style="margin-top:12px;border-left-color:var(--late)"><strong>A soma do rateio passa da comissão bruta.</strong><p style="margin:6px 0 0">Nada foi ajustado: as regras de divisão não estão definidas. Confira os valores.</p></div>` : ''}
        <div class="rule" style="margin-top:12px"><strong>O que não aconteceu.</strong>
          <ul><li>Nenhum pagamento, contrato ou mensagem saiu do WeBrain.</li>
          <li>VGV, valor negociado e comissão continuam campos separados: o sistema não deduz um do outro.</li></ul></div>`,
      rodape: `<span class="grow"></span><button class="btn" data-fechar>Fechar</button>
        <button class="btn btn--primary" data-ir>Abrir o negócio</button>`
    }).querySelector('[data-ir]').addEventListener('click', () => {
      WB.fecharPopup();
      location.hash = '#/wi/negocio/' + reg.id;
    });
    WB.toast(novo ? 'Negócio ' + reg.id + ' registrado.' : 'Negócio ' + reg.id + ' atualizado.');
    if (WB.rerender) WB.rerender();
  };

  /* ============================================ NÓS — ITEM DO MENU */
  F2.abrirItemMenu = function (tipoOuId, talvezId) {
    const atual = F2.item(talvezId || tipoOuId);
    const tipo = atual ? atual.tipo : (tipoOuId === 'bebida' ? 'bebida' : 'prato');
    const v = atual || { tipo };
    const ehPrato = tipo === 'prato';

    const corpo =
      (ehPrato ? '' : `<div class="rule" style="margin-bottom:16px">
        <strong>Formulário de bebida: leitura parcial.</strong>
        <p style="margin:6px 0 0">A foto mostra só a coluna esquerda deste formulário. Os blocos (identificação, ficha técnica, comercial e status) estão legíveis; a lista completa de categorias e os campos exclusivos de bebida são suposição configurável, não transcrição. Campos de prato — porções e tempo de preparo — não foram copiados para cá.</p>
      </div>`) +
      bloco('Identificação', [
        WB.campo({ rotulo: ehPrato ? 'Nome do prato' : 'Nome da bebida', nome: 'nome', obrigatorio: true, valor: v.nome, span2: true }),
        WB.campo({ rotulo: 'Categoria', nome: 'categoria', tipo: 'select', obrigatorio: true, placeholder: 'Selecione', opcoes: F2.opc(ehPrato ? 'pratoCategoria' : 'bebidaCategoria'), valor: v.categoria }),
        ehPrato ? WB.campo({ rotulo: 'Serve quantas pessoas', nome: 'servePessoas', tipo: 'number', min: 1, valor: v.servePessoas }) : '',
        WB.campo({ rotulo: ehPrato ? 'Descrição (o que vem no prato e como é servido)' : 'Descrição', nome: 'descricao', tipo: 'textarea', valor: v.descricao, span2: true }),
        WB.campo({ rotulo: 'Foto (endereço)', nome: 'foto', valor: v.foto, span2: true, placeholder: 'https://', ajuda: 'Referência de imagem. Este protótipo não faz upload.' })
      ].join('')) +
      bloco('Ficha técnica', [
        ehPrato ? WB.campo({ rotulo: 'Tempo médio de preparo (min)', nome: 'tempoPreparo', tipo: 'number', min: 0, valor: v.tempoPreparo }) : '',
        WB.campo({ rotulo: 'Ingredientes', nome: 'ingredientes', tipo: 'textarea', valor: v.ingredientes, span2: true }),
        grupo('Restrições atendidas', 'restricoes', F2.opc('restricoes'), 'checkbox', arr(v.restricoes))
      ].join('')) +
      bloco('Comercial', [
        WB.campo({ rotulo: 'Preço de venda (R$)', nome: 'precoVenda', tipo: 'number', min: 0, passo: '0.01', valor: v.precoVenda }),
        WB.campo({ rotulo: 'Custo estimado (R$)', nome: 'custoEstimado', tipo: 'number', min: 0, passo: '0.01', valor: v.custoEstimado, ajuda: 'Estimativa da ficha técnica — não é custo contábil realizado.' }),
        WB.campo({ rotulo: 'Disponibilidade', nome: 'disponibilidade', tipo: 'select', placeholder: 'Selecione', opcoes: F2.opc('disponibilidade'), valor: v.disponibilidade }),
        grupo('Período servido', 'periodos', F2.opc('periodo'), 'checkbox', arr(v.periodos)),
        `<div class="fld span2"><label>Margem</label><output class="f2calc" data-margem>—</output>
          <span class="fld__help">Margem = preço − custo. Margem % = margem ÷ preço. CMV % = custo ÷ preço. Preço em branco ou zero não vira 0 %: fica sem dado.</span></div>`
      ].join('')) +
      bloco('Status', [
        WB.campo({ rotulo: 'Status', nome: 'status', tipo: 'select', obrigatorio: true, opcoes: F2.opc('itemStatus').filter((o) => o.valor !== 'descontinuado' || (atual && atual.status === 'descontinuado')), valor: v.status || 'ativo', ajuda: atual ? '' : 'Descontinuar é uma ação separada, com confirmação.' }),
        WB.campo({ rotulo: 'Responsável / chef que criou', nome: 'responsavel', tipo: 'select', placeholder: 'Selecione', opcoes: pessoasOpc(), valor: v.responsavel || WB.data.usuarioAtual })
      ].join('')) +
      (atual ? `<div class="rule"><strong>Elogios e reclamações não são digitados.</strong>
        <p style="margin:6px 0 0">Os contadores deste item saem dos registros de atendimento vinculados a ele.</p></div>` : '');

    abrirForm({
      tipo: 'Nós Gastronomia',
      titulo: atual ? ('Editar ' + (ehPrato ? 'prato' : 'bebida')) : (ehPrato ? 'Novo prato' : 'Nova bebida / drink'),
      acao: atual ? 'Salvar alterações' : 'Adicionar ao menu',
      corpo,
      aoMontar: (ov) => {
        const preco = ov.querySelector('[name="precoVenda"]');
        const custo = ov.querySelector('[name="custoEstimado"]');
        const saida = ov.querySelector('[data-margem]');
        const calcular = () => {
          const m = F2.margemItem({ precoVenda: preco.value, custoEstimado: custo.value });
          saida.textContent = m.margem == null
            ? 'sem dado — informe preço e custo'
            : WB.moeda(m.margem) + (m.margemPct == null ? ' · % sem dado (preço zero)' : ' · margem ' + F2.pct(m.margemPct) + ' · CMV ' + F2.pct(m.cmvPct));
        };
        preco.addEventListener('input', calcular);
        custo.addEventListener('input', calcular);
        calcular();
      },
      validar: (form) => {
        const p = num(form.querySelector('[name="precoVenda"]').value);
        const c = num(form.querySelector('[name="custoEstimado"]').value);
        if (p != null && p < 0) return 'O preço de venda não pode ser negativo.';
        if (c != null && c < 0) return 'O custo estimado não pode ser negativo.';
        return null;
      },
      aoSalvar: (val) => {
        const reg = Object.assign({}, atual || {}, {
          id: (atual && atual.id) || F2.novoId('NOSI', WB.data.nos.itens),
          tipo, nome: val.nome.trim(), categoria: val.categoria, descricao: val.descricao, foto: val.foto,
          servePessoas: ehPrato ? num(val.servePessoas) : null,
          tempoPreparo: ehPrato ? num(val.tempoPreparo) : null,
          ingredientes: val.ingredientes, restricoes: arr(val.restricoes),
          precoVenda: num(val.precoVenda), custoEstimado: num(val.custoEstimado),
          disponibilidade: val.disponibilidade, periodos: arr(val.periodos),
          status: val.status, responsavel: val.responsavel,
          criadoEm: (atual && atual.criadoEm) || hoje()
        });
        if (reg.status !== 'descontinuado') { reg.descontinuadoEm = ''; reg.motivoDescontinuacao = ''; }
        gravar('nos.itens', reg);
        fechar(atual ? 'Item atualizado no menu.' : 'Item ' + reg.id + ' adicionado ao menu.');
      }
    });
  };

  /* Excluir item do menu: a foto pede a ação. A recomendação é descontinuar,
     que preserva vínculos e histórico — a exclusão definitiva fica como opção
     separada e explícita. */
  F2.abrirRemoverItem = function (id) {
    const item = F2.item(id);
    if (!item) return WB.toast('Item não encontrado.', 'erro');
    const c = F2.contadoresItem(id);
    const vinculos = c.elogios + c.reclamacoes;
    const ov = WB.abrirPopup({
      tipo: 'Nós Gastronomia', titulo: 'Excluir item do menu',
      corpo: `<p style="font-size:15px;margin:0 0 16px"><strong>${esc(item.nome)}</strong> · ${esc(F2.rotulo('itemTipo', item.tipo))} · ${esc(item.categoria || '—')}</p>
        <div class="rule"><strong>Retirar do cardápio não é o mesmo que apagar.</strong>
          <ul>
            <li><em>Descontinuar</em> tira o item do cardápio, preserva ${vinculos} registro${vinculos === 1 ? '' : 's'} de atendimento vinculado${vinculos === 1 ? '' : 's'} e permite reativar depois.</li>
            <li><em>Excluir definitivamente</em> apaga o cadastro. Os atendimentos vinculados ficam sem item e a ação não pode ser desfeita.</li>
          </ul></div>
        <div class="fgrid fgrid--2" style="margin-top:16px">
          ${WB.campo({ rotulo: 'Motivo (fica registrado)', nome: 'motivo', span2: true, id: 'f2_motivo_remover' })}
        </div>`,
      rodape: `<button class="btn btn--perigo" data-excluir>Excluir definitivamente</button><span class="grow"></span>
        <button class="btn" data-fechar>Cancelar</button>
        <button class="btn btn--primary" data-descontinuar>Descontinuar</button>`
    });
    const motivo = () => (document.getElementById('f2_motivo_remover') || {}).value || '';
    ov.querySelector('[data-descontinuar]').addEventListener('click', () => {
      item.status = 'descontinuado';
      item.descontinuadoEm = hoje();
      item.motivoDescontinuacao = motivo();
      F2.salvar('nos.itens');
      fechar('"' + item.nome + '" saiu do cardápio. O histórico foi preservado.');
    });
    ov.querySelector('[data-excluir]').addEventListener('click', (e) => {
      const b = e.currentTarget;
      if (b.dataset.confirmado !== '1') {
        b.dataset.confirmado = '1';
        b.textContent = 'Confirmar exclusão definitiva';
        return;
      }
      F2.remover('nos.itens', item.id);
      fechar('"' + item.nome + '" foi excluído do cadastro.');
    });
  };

  F2.reativarItem = function (id) {
    const item = F2.item(id);
    if (!item) return;
    item.status = 'ativo';
    item.descontinuadoEm = '';
    item.motivoDescontinuacao = '';
    F2.salvar('nos.itens');
    WB.toast('"' + item.nome + '" voltou ao cardápio.');
    if (WB.rerender) WB.rerender();
  };

  /* ================================== NÓS — RECLAMAÇÃO E ELOGIO */
  function formAtendimento(tipo, atual) {
    const v = atual || { tipo };
    const reclamacao = tipo === 'reclamacao';
    const itensOpc = WB.data.nos.itens.map((i) => ({ valor: i.id, texto: i.nome + ' · ' + F2.rotulo('itemTipo', i.tipo) }));

    return (reclamacao ? '' : `<div class="rule" style="margin-bottom:16px">
        <strong>Campos do elogio: proposta a validar.</strong>
        <p style="margin:6px 0 0">A foto mostra a ação e o título "ELOGIO", mas não detalha os campos. Aqui reaproveitamos cliente, data, canal, descrição, item e funcionário. Gravidade e tratativa, que são da reclamação, ficam de fora de propósito.</p>
      </div>`) +
      bloco('Identificação', [
        WB.campo({ rotulo: 'Cliente', nome: 'clienteNome', obrigatorio: true, valor: v.clienteNome, span2: true, placeholder: 'Nome, mesa ou perfil da avaliação' }),
        WB.campo({ rotulo: 'Data do ocorrido', nome: 'dataOcorrido', tipo: 'date', obrigatorio: true, valor: v.dataOcorrido || hoje() }),
        WB.campo({ rotulo: 'Canal', nome: 'canal', tipo: 'select', obrigatorio: true, placeholder: 'Selecione', opcoes: F2.opc('atendimentoCanal'), valor: v.canal })
      ].join('')) +
      bloco('Conteúdo', [
        reclamacao ? WB.campo({ rotulo: 'Categoria', nome: 'categoria', tipo: 'select', obrigatorio: true, placeholder: 'Selecione', opcoes: F2.opc('reclamacaoCategoria'), valor: v.categoria }) : '',
        reclamacao ? WB.campo({ rotulo: 'Gravidade', nome: 'gravidade', tipo: 'select', obrigatorio: true, placeholder: 'Selecione', opcoes: F2.opc('gravidade'), valor: v.gravidade }) : '',
        WB.campo({ rotulo: reclamacao ? 'Descrição do ocorrido' : 'O que o cliente elogiou', nome: 'descricao', tipo: 'textarea', obrigatorio: true, valor: v.descricao, span2: true }),
        WB.campo({ rotulo: 'Prato / drink relacionado', nome: 'itemId', tipo: 'select', placeholder: 'Nenhum', opcoes: itensOpc, valor: v.itemId }),
        WB.campo({ rotulo: 'Funcionário envolvido', nome: 'funcionarioId', tipo: 'select', placeholder: 'Nenhum', opcoes: pessoasOpc(), valor: v.funcionarioId })
      ].join('')) +
      (reclamacao ? bloco('Tratativa', [
        WB.campo({ rotulo: 'Responsável pela resposta', nome: 'responsavelResposta', tipo: 'select', placeholder: 'Ainda não definido', opcoes: pessoasOpc(), valor: v.responsavelResposta }),
        WB.campo({ rotulo: 'Status', nome: 'status', tipo: 'select', obrigatorio: true, opcoes: F2.opc('reclamacaoStatus'), valor: v.status || 'aberta' }),
        WB.campo({ rotulo: 'Ação tomada', nome: 'acaoTomada', tipo: 'textarea', valor: v.acaoTomada, span2: true, placeholder: 'Desconto, prato novo, pedido de desculpas…' }),
        WB.campo({ rotulo: 'Data de resolução', nome: 'dataResolucao', tipo: 'date', valor: v.dataResolucao })
      ].join('')) : '');
  }

  function salvarAtendimento(tipo, atual, val) {
    const reclamacao = tipo === 'reclamacao';
    const reg = Object.assign({}, atual || {}, {
      id: (atual && atual.id) || F2.novoId('NOSA', WB.data.nos.atendimentos),
      tipo, clienteNome: val.clienteNome.trim(), clienteId: (atual && atual.clienteId) || null,
      dataOcorrido: val.dataOcorrido, canal: val.canal,
      categoria: reclamacao ? val.categoria : '',
      descricao: val.descricao, itemId: val.itemId || '', funcionarioId: val.funcionarioId || '',
      gravidade: reclamacao ? val.gravidade : '',
      responsavelResposta: reclamacao ? (val.responsavelResposta || '') : '',
      acaoTomada: reclamacao ? val.acaoTomada : '',
      status: reclamacao ? val.status : '',
      dataResolucao: reclamacao && val.status === 'resolvida' ? val.dataResolucao : '',
      registradoPor: (atual && atual.registradoPor) || WB.data.usuarioAtual,
      criadoEm: (atual && atual.criadoEm) || hoje()
    });
    gravar('nos.atendimentos', reg);
    return reg;
  }

  function validarAtendimento(tipo, form) {
    const data = form.querySelector('[name="dataOcorrido"]').value;
    if (data > hoje()) return 'A data do ocorrido não pode estar no futuro.';
    if (tipo !== 'reclamacao') return null;
    const status = form.querySelector('[name="status"]').value;
    const resolucao = form.querySelector('[name="dataResolucao"]').value;
    if (status === 'resolvida' && !resolucao) return 'Uma reclamação resolvida precisa da data de resolução.';
    if (status === 'resolvida' && !String(form.querySelector('[name="acaoTomada"]').value).trim()) return 'Diga o que foi feito antes de marcar como resolvida.';
    if (resolucao && resolucao < data) return 'A resolução não pode ser anterior ao ocorrido.';
    if (resolucao && resolucao > hoje()) return 'A data de resolução não pode estar no futuro.';
    if (status !== 'aberta' && !form.querySelector('[name="responsavelResposta"]').value) return 'Indique quem responde antes de sair de "aberta".';
    return null;
  }

  F2.abrirReclamacao = function (id) {
    const atual = F2.atendimento(id);
    abrirForm({
      tipo: 'Nós Gastronomia', titulo: atual ? 'Editar reclamação' : 'Registrar reclamação',
      acao: atual ? 'Salvar alterações' : 'Registrar reclamação',
      corpo: formAtendimento('reclamacao', atual),
      validar: (form) => validarAtendimento('reclamacao', form),
      aoSalvar: (val) => {
        const reg = salvarAtendimento('reclamacao', atual, val);
        fechar(atual ? 'Reclamação atualizada.' : 'Reclamação ' + reg.id + ' registrada.');
      }
    });
  };

  F2.abrirElogio = function (id) {
    const atual = F2.atendimento(id);
    abrirForm({
      tipo: 'Nós Gastronomia', titulo: atual ? 'Editar elogio' : 'Registrar elogio',
      acao: atual ? 'Salvar alterações' : 'Registrar elogio',
      corpo: formAtendimento('elogio', atual),
      validar: (form) => validarAtendimento('elogio', form),
      aoSalvar: (val) => {
        const reg = salvarAtendimento('elogio', atual, val);
        fechar(atual ? 'Elogio atualizado.' : 'Elogio ' + reg.id + ' registrado.');
      }
    });
  };

  /** Avançar a tratativa sem reabrir o formulário inteiro. */
  F2.avancarTratativa = function (id) {
    const r = F2.atendimento(id);
    if (!r || r.tipo !== 'reclamacao') return;
    if (r.status === 'resolvida') return WB.toast('Esta reclamação já está resolvida.', 'erro');
    F2.abrirReclamacao(id);
  };
})();
