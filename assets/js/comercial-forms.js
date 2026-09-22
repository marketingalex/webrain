/* WeBrain — Comercial: cadastro de lead, de cliente e a conversão.
   ---------------------------------------------------------------------------
   Este arquivo SUBSTITUI `WB.abrirLead` e `WB.abrirCliente` de `forms.js`, e
   acrescenta `WB.abrirConversao`. Sem ele, os cadastros antigos continuam
   valendo — por isso ele carrega depois de `forms.js`.

   POR QUE O LEAD ENCOLHEU E O CLIENTE CRESCEU
   Quem registra um lead quase sempre tem só nome e telefone na mão; exigir
   observações e mais campos ali faz a pessoa inventar conteúdo ou desistir.
   Já quem cadastra um cliente do zero está registrando alguém que já comprou —
   aí a informação existe, e faltar CPF ou endereço é que atrapalha depois.
   ========================================================================== */
(function () {
  const WB = (window.WB = window.WB || {});
  const C = WB.comercial;
  if (!C) return; // sem comercial-data.js não há modelo para gravar
  const esc = WB.esc;

  /* Mesma mecânica de envio dos outros formulários do portal. */
  function ligarEnvio(ov, aoEnviar) {
    const form = ov.querySelector('form');
    const btn = ov.querySelector('[data-enviar]');
    if (!form || !btn) return;
    form.addEventListener('submit', (e) => e.preventDefault());
    btn.addEventListener('click', () => {
      if (btn.dataset.enviando === '1') return;
      if (!WB.validar(form)) return;
      const original = btn.innerHTML;
      btn.dataset.enviando = '1';
      btn.setAttribute('aria-disabled', 'true');
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

  function popup(cfg) {
    const ov = WB.abrirPopup({
      tipo: 'Comercial', titulo: cfg.titulo, largo: cfg.largo,
      corpo: `<form novalidate>${cfg.acima || ''}<div class="fgrid fgrid--2">${cfg.campos}</div></form>`,
      rodape: `<span class="grow"></span>
        <button class="btn" data-fechar>Cancelar</button>
        <button class="btn btn--primary" data-enviar>${esc(cfg.acao)}</button>`
    });
    WB.ligarListas(ov);
    ligarEnvio(ov, cfg.aoSalvar);
    return ov;
  }

  /* Só quem trabalha no grupo pode receber um lead. A lista mostra o setor
     para quem não conhece todo mundo pelo nome saber a quem está passando. */
  function opcoesResponsavel() {
    return (WB.data.pessoas || []).map((p) => ({
      valor: p.id, texto: p.nome + (p.setor ? ' — ' + p.setor : '')
    }));
  }

  /* ================================================================== LEAD */
  WB.abrirLead = function () {
    const eu = WB.eu();
    popup({
      titulo: 'Registrar novo lead', acao: 'Registrar lead',
      acima: `<p class="muted" style="margin:0 0 14px">Registrado por <strong>${esc(eu.nome)}</strong>. Seu nome fica guardado como quem trouxe o lead, mesmo que o atendimento seja de outra pessoa.</p>`,
      campos: [
        WB.campo({ rotulo: 'Nome completo', nome: 'nome', obrigatorio: true, span2: true }),
        WB.campo({ rotulo: 'Telefone', nome: 'telefone', obrigatorio: true, placeholder: '(45) 90000-0000' }),
        WB.campoLista({ rotulo: 'Produto de interesse', nome: 'produto', lista: 'comercialProduto', obrigatorio: true }),
        WB.campoLista({ rotulo: 'Origem', nome: 'origem', lista: 'comercialOrigem', obrigatorio: true }),
        WB.campo({
          rotulo: 'Responsável pelo atendimento', nome: 'responsavel', tipo: 'select',
          placeholder: 'Deixar para o comercial assumir', opcoes: opcoesResponsavel(),
          ajuda: 'Opcional. Em branco, o lead entra no CRM esperando alguém assumir.'
        })
      ].join(''),
      aoSalvar: (v) => {
        const produto = WB.valorDeLista('comercialProduto', v, 'produto');
        const origem = WB.valorDeLista('comercialOrigem', v, 'origem');
        const novo = C.gravar({
          id: C.novoId(), nome: v.nome, tipo: 'lead',
          empresa: C.empresaDoProduto(produto),
          produto, origem, valor: 0,
          etapa: C.primeiraEtapa(), etapaDesde: WB.d(0), situacao: '',
          trazidoPor: WB.data.usuarioAtual,
          responsavel: v.responsavel || '',
          desde: WB.d(0), telefone: v.telefone
        });
        WB.fecharPopup();
        WB.toast(novo.responsavel
          ? 'Lead registrado e entregue a ' + WB.pessoa(novo.responsavel).nome + '.'
          : 'Lead registrado no CRM, esperando um responsável do comercial.');
        if (WB.renderSidebar) WB.renderSidebar();
        if (WB.rerender) WB.rerender();
      }
    });
  };

  /* =============================================================== CLIENTE */
  WB.abrirCliente = function () {
    popup({
      titulo: 'Registrar novo cliente', acao: 'Registrar cliente', largo: true,
      acima: `<p class="muted" style="margin:0 0 14px">Para quem já comprou sem ter passado pelo funil. Quem veio de lead entra sozinho, pelo CRM.</p>`,
      campos: [
        WB.campo({ rotulo: 'Nome ou razão social', nome: 'nome', obrigatorio: true, span2: true }),
        WB.campo({ rotulo: 'Telefone', nome: 'telefone', obrigatorio: true, placeholder: '(45) 90000-0000' }),
        WB.campo({ rotulo: 'E-mail', nome: 'email', tipo: 'email' }),
        WB.campoLista({ rotulo: 'Produto contratado', nome: 'produto', lista: 'comercialProduto', obrigatorio: true }),
        WB.campoLista({ rotulo: 'Origem', nome: 'origem', lista: 'comercialOrigem', obrigatorio: true }),
        WB.campo({ rotulo: 'Situação', nome: 'situacao', tipo: 'select', obrigatorio: true, opcoes: C.situacoes() }),
        WB.campo({ rotulo: 'Valor do contrato (R$)', nome: 'valor', tipo: 'number', min: 0, placeholder: '0,00' }),
        WB.campo({ rotulo: 'Responsável pelo atendimento', nome: 'responsavel', tipo: 'select', placeholder: 'Sem responsável definido', opcoes: opcoesResponsavel() }),
        WB.campo({ rotulo: 'CPF ou CNPJ', nome: 'documento', placeholder: '000.000.000-00' }),
        WB.campo({ rotulo: 'Endereço', nome: 'endereco', span2: true }),
        WB.campo({ rotulo: 'Link do contrato', nome: 'contrato', span2: true, placeholder: 'https://…' })
      ].join(''),
      aoSalvar: (v) => {
        const produto = WB.valorDeLista('comercialProduto', v, 'produto');
        C.gravar({
          id: C.novoId(), nome: v.nome, tipo: 'cliente',
          empresa: C.empresaDoProduto(produto),
          produto, origem: WB.valorDeLista('comercialOrigem', v, 'origem'),
          valor: Number(v.valor || 0),
          etapa: '', situacao: v.situacao,
          trazidoPor: WB.data.usuarioAtual,
          responsavel: v.responsavel || '',
          desde: WB.d(0), convertidoEm: '',
          telefone: v.telefone, email: v.email || '',
          documento: v.documento || '', endereco: v.endereco || '',
          contrato: v.contrato || '', contratoId: ''
        });
        WB.fecharPopup();
        WB.toast('Cliente registrado.');
        if (WB.rerender) WB.rerender();
      }
    });
  };

  /* ============================================================= CONVERSÃO
     Chamada quando o lead alcança a última coluna do funil. Pede só o que um
     lead não tem. Cancelar não grava nada — quem chamou devolve o cartão. */
  WB.abrirConversao = function (id, aoCancelar) {
    const lead = C.registro(id);
    if (!lead) return;
    const contratos = C.contratosDisponiveis();

    const ov = WB.abrirPopup({
      tipo: 'Comercial', titulo: 'Converter em cliente', largo: true,
      corpo: `<form novalidate>
        <p class="muted" style="margin:0 0 14px"><strong>${esc(lead.nome)}</strong> chegou em ${esc(C.etapaFinal())}. Ao confirmar, ele sai da lista de Leads e entra na de Clientes.</p>
        <div class="fgrid fgrid--2">
          ${contratos.length ? WB.campo({
            rotulo: 'Contrato no Administrativo', nome: 'contratoId', tipo: 'select', span2: true,
            placeholder: 'Nenhum — vou colar um link',
            opcoes: contratos.map((c) => ({ valor: c.id, texto: c.id + ' · ' + (c.descritivo || c.parte || '') })),
            ajuda: 'Escolhendo um contrato, o valor vem dele — não precisa digitar de novo.'
          }) : ''}
          ${WB.campo({ rotulo: 'Link do contrato', nome: 'contrato', span2: !contratos.length, valor: lead.contrato || '', placeholder: 'https://…' })}
          ${WB.campo({ rotulo: 'Valor do contrato (R$)', nome: 'valor', tipo: 'number', min: 0, valor: lead.valor || '', placeholder: '0,00' })}
          ${WB.campo({ rotulo: 'Situação do cliente', nome: 'situacao', tipo: 'select', obrigatorio: true, opcoes: C.situacoes() })}
          ${WB.campo({ rotulo: 'Responsável pelo atendimento', nome: 'responsavel', tipo: 'select', placeholder: 'Manter como está', opcoes: opcoesResponsavel(), valor: lead.responsavel || '' })}
          ${WB.campo({ rotulo: 'CPF ou CNPJ', nome: 'documento', valor: lead.documento || '' })}
          ${WB.campo({ rotulo: 'E-mail', nome: 'email', tipo: 'email', valor: lead.email || '' })}
          ${WB.campo({ rotulo: 'Endereço', nome: 'endereco', span2: true, valor: lead.endereco || '' })}
        </div>
      </form>`,
      rodape: `<span class="grow"></span>
        <button class="btn" data-fechar>Cancelar</button>
        <button class="btn btn--primary" data-enviar>Converter em cliente</button>`
    });

    /* Escolher um contrato preenche valor e link a partir dele. Campo já
       digitado à mão não é sobrescrito — o que a pessoa escreveu vale mais. */
    const selContrato = ov.querySelector('[name="contratoId"]');
    if (selContrato) {
      selContrato.addEventListener('change', () => {
        const dados = C.dadosDoContrato(selContrato.value);
        if (!dados) return;
        const valor = ov.querySelector('[name="valor"]');
        const link = ov.querySelector('[name="contrato"]');
        if (valor && !valor.value && dados.valor != null) valor.value = dados.valor;
        if (link && !link.value && dados.link) link.value = dados.link;
        WB.toast('Valor e link vieram do contrato ' + selContrato.value + '.');
      });
    }

    /* Fechar sem converter devolve o cartão para onde estava. */
    let convertido = false;
    ov.querySelectorAll('[data-fechar]').forEach((b) =>
      b.addEventListener('click', () => { if (!convertido && aoCancelar) aoCancelar(); }));

    ligarEnvio(ov, (v) => {
      convertido = true;
      C.converter(id, v);
      WB.fecharPopup();
      WB.toast(lead.nome + ' agora é cliente. Saiu de Leads e está em Clientes.');
      if (WB.rerender) WB.rerender();
    });
  };

  /* Assumir um lead sem responsável, em um clique. */
  WB.assumirLead = function (id) {
    const r = C.definirResponsavel(id, WB.data.usuarioAtual);
    if (!r) return;
    WB.toast('Você assumiu o atendimento de ' + r.nome + '.');
    if (WB.rerender) WB.rerender();
  };

  /* Ações no mesmo mapa do portal (app.js). */
  C.acoes = {
    'lead': () => WB.abrirLead(),
    'cliente': () => WB.abrirCliente(),
    'crm-assumir': (el) => WB.assumirLead(el.dataset.id)
  };
})();
