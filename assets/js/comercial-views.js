/* WeBrain — Comercial: o funil do CRM e as listas de Leads e Clientes.
   ---------------------------------------------------------------------------
   SUBSTITUI `WB.views.crm` e `WB.views.clientes` de `views.js`, e acrescenta
   `WB.views.leads`. Sem este arquivo, a tela única de "Clientes e leads" e o
   CRM em tabela continuam valendo.

   POR QUE O CRM TEM COLUNAS E TAMBÉM UM SELECT
   O usuário pediu arrastar, e arrastar é o gesto certo no computador. Mas
   arrastar não existe no celular nem no teclado — e o portal é usado nos dois.
   Por isso cada cartão traz também um select de etapa, que faz exatamente a
   mesma coisa. É a mesma solução do kanban de demandas do Codex: quem pode
   arrastar arrasta, quem não pode continua trabalhando.

   POR QUE CHEGAR EM "VENDAS" ABRE UM FORMULÁRIO
   Virar cliente exige o que um lead não tem: valor, contrato, documento. Uma
   conversão calada deixaria a lista de Clientes cheia de linhas pela metade.
   Cancelar não grava nada, e o cartão fica onde estava.
   ========================================================================== */
(function () {
  const WB = (window.WB = window.WB || {});
  const C = WB.comercial;
  if (!C) return;
  const esc = WB.esc;
  const V = (WB.views = WB.views || {});

  const texto = (v) => (v == null || v === '' ? '—' : v);
  const empresaNome = (id) => (id === 'grupo' || !id ? 'Grupo We' : WB.empresaNome(id));
  const pessoaNome = (id) => (id ? WB.pessoa(id).nome : '');

  function abasEmpresa(ativa, base) {
    const opcoes = [{ id: 'grupo', nome: 'Grupo We' }]
      .concat((WB.data.empresas || []).map((e) => ({ id: e.id, nome: e.curto || e.nome })));
    const f = opcoes.some((o) => o.id === ativa) ? ativa : 'grupo';
    return {
      f,
      html: `<div class="tabs" role="tablist">${opcoes.map((o) =>
        `<a class="tab" role="tab" href="#${base}/${o.id}" aria-selected="${o.id === f}">${esc(o.nome)}</a>`).join('')}</div>`
    };
  }

  /* ============================================================ CRM / FUNIL */

  function cartao(l) {
    const dias = C.diasParado(l);
    const doGrupo = C.eDoGrupo(l);
    const semDono = doGrupo && !l.responsavel;

    /* O que veio projetado da WeInvest tem funil próprio, lá. Arrastar aqui
       daria a impressão de que este quadro manda naquele registro. */
    const corpo = `
      <div class="crmcard__topo">
        <span class="crmcard__prod">${esc(texto(l.produto))}</span>
        ${dias != null ? `<span class="crmcard__dias" title="Tempo nesta etapa">${dias}d</span>` : ''}
      </div>
      <strong class="crmcard__nome">${esc(l.nome)}</strong>
      <div class="crmcard__meta">
        <span>${esc(texto(l.origem))}</span>
        ${l.telefone && l.telefone !== '—' ? `<span class="mono">${esc(l.telefone)}</span>` : ''}
      </div>
      ${l.trazidoPor ? `<div class="crmcard__trouxe">Trazido por ${esc(pessoaNome(l.trazidoPor))}</div>` : ''}`;

    if (!doGrupo) {
      /* O tracejado e o texto do link já dizem que este registro mora noutro
         lugar; sem alça de arrastar, ninguém tenta movê-lo por aqui. */
      return `<article class="crmcard crmcard--fora" title="Registro da WeInvest — o funil dele fica em #/wi/leads">
        ${corpo}
        <a class="crmcard__link" href="${esc(l.rota || '#/wi/leads')}">Abrir na WeInvest ${WB.icon('seta', 12)}</a>
      </article>`;
    }

    return `<article class="crmcard${semDono ? ' crmcard--semdono' : ''}" draggable="true" data-crm-drag="${esc(l.id)}">
      ${corpo}
      <div class="crmcard__dono">
        ${semDono
          ? `<span class="crmcard__alerta">Sem responsável</span>
             <button class="btn btn--sm" data-acao="crm-assumir" data-id="${esc(l.id)}">Assumir</button>`
          : `<span class="av av--sm" aria-hidden="true">${esc(WB.iniciais(pessoaNome(l.responsavel)))}</span>
             <span class="crmcard__resp">${esc(pessoaNome(l.responsavel))}</span>`}
      </div>
      <label class="crmcard__mover">
        <span class="sr">Etapa de ${esc(l.nome)}</span>
        <select class="inp inp--sm" data-crm-etapa="${esc(l.id)}">
          ${C.funil().map((e) => `<option value="${esc(e)}"${e === l.etapa ? ' selected' : ''}>${esc(e)}</option>`).join('')}
        </select>
      </label>
    </article>`;
  }

  V.crm = function () {
    const mapa = C.porEtapa();
    const funil = C.funil();
    const total = funil.reduce((s, e) => s + mapa[e].length, 0);
    const semDono = C.listar('lead').filter((l) => C.eDoGrupo(l) && !l.responsavel).length;

    return WB.cabecalho({
      titulo: 'CRM', sub: 'O funil comercial do grupo. Arraste o lead para a próxima etapa, ou use a caixa de etapa no cartão.',
      acoes: `<button class="btn btn--primary" data-acao="lead">${WB.icon('mais', 15)} Registrar lead</button>`
    }) +
    `<div class="rule" style="margin-bottom:16px">
      <strong>Integração com CRM externo não está conectada.</strong>
      <p style="margin:6px 0 0">Este funil é do WeBrain: ele mostra os leads cadastrados aqui. Quem chega em <strong>${esc(C.etapaFinal())}</strong> vira cliente e passa para a lista de <a href="#/clientes">Clientes</a>.</p>
    </div>` +
    (semDono ? `<div class="rule rule--warn" style="margin-bottom:16px">
      <strong>${semDono} lead${semDono > 1 ? 's' : ''} sem responsável.</strong>
      <p style="margin:6px 0 0">Foram trazidos por alguém de fora do comercial e esperam quem toque a negociação.</p>
    </div>` : '') +
    `<div class="crmboard" role="list">
      ${funil.map((e, i) => `<section class="crmcol" role="listitem" data-crm-drop="${esc(e)}">
        <header class="crmcol__head">
          <h2>${esc(e)}</h2>
          <span class="crmcol__n">${mapa[e].length}</span>
        </header>
        ${i === funil.length - 1 ? '<p class="crmcol__nota">Chegar aqui converte em cliente.</p>' : ''}
        <div class="crmcol__body">
          ${mapa[e].map(cartao).join('') || '<p class="crmcol__vazio">Nenhum lead</p>'}
        </div>
      </section>`).join('')}
    </div>
    <p class="muted" style="margin-top:14px;font-size:13px">${total} lead${total === 1 ? '' : 's'} no funil.</p>`;
  };

  /* ================================================================ LEADS */
  V.leads = function (empresa) {
    const { f, html } = abasEmpresa(empresa, '/leads');
    const lista = C.listar('lead', f);
    const semDono = lista.filter((l) => C.eDoGrupo(l) && !l.responsavel).length;

    return WB.cabecalho({
      titulo: 'Leads', sub: 'Quem demonstrou interesse e ainda não comprou. O andamento acontece no CRM.',
      acoes: `<a class="btn" href="#/crm">Abrir o funil</a><button class="btn btn--primary" data-acao="lead">${WB.icon('mais', 15)} Registrar lead</button>`
    }) + html +
    (semDono ? `<div class="rule" style="margin-bottom:16px"><strong>${semDono} sem responsável.</strong>
      <p style="margin:6px 0 0">Aparecem destacados no <a href="#/crm">CRM</a>, à espera de quem vá atender.</p></div>` : '') +
    `<section class="card"><div class="card__body card__body--flush">
      ${WB.tabela([
        { titulo: 'Nome', bruto: true, ord: (c) => c.nome, valor: (c) => c.rota ? `<a href="${esc(c.rota)}">${esc(c.nome)}</a>` : esc(c.nome) },
        { titulo: 'Produto', valor: (c) => texto(c.produto) },
        { titulo: 'Origem', valor: (c) => texto(c.origem) },
        { titulo: 'Etapa', valor: (c) => texto(c.etapa) },
        { titulo: 'Empresa', valor: (c) => empresaNome(c.empresa) },
        { titulo: 'Quem trouxe', valor: (c) => c.trazidoPor ? pessoaNome(c.trazidoPor) : '—' },
        { titulo: 'Responsável', bruto: true, ord: (c) => c.responsavel || '',
          valor: (c) => c.responsavel ? esc(pessoaNome(c.responsavel)) : '<span class="chip chip--warn">Sem responsável</span>' },
        { titulo: 'Desde', valor: (c) => WB.fmtDataCurta(c.desde), ord: (c) => c.desde },
        { titulo: 'Contato', bruto: true, ordenavel: false, valor: (c) => `<span class="mono">${esc(c.telefone)}</span>` }
      ], lista, {
        busca: true, buscaTexto: 'Buscar nesta lista…',
        vazioTitulo: 'Nenhum lead nesta operação',
        vazioTexto: 'Registre o primeiro e ele aparece aqui e no funil do CRM.',
        vazioAcao: '<button class="btn btn--primary" data-acao="lead">Registrar lead</button>'
      })}
    </div></section>`;
  };

  /* ============================================================== CLIENTES */
  V.clientes = function (empresa) {
    const { f, html } = abasEmpresa(empresa, '/clientes');
    const lista = C.listar('cliente', f);
    const convertidos = lista.filter((c) => c.convertidoEm).length;

    return WB.cabecalho({
      titulo: 'Clientes', sub: 'Quem já comprou. Lead que chega em ' + C.etapaFinal() + ' entra aqui sozinho.',
      acoes: `<a class="btn" href="#/leads">Ver leads</a><button class="btn btn--primary" data-acao="cliente">${WB.icon('mais', 15)} Registrar cliente</button>`
    }) + html +
    (f === 'weinvest' || f === 'grupo' ? `<div class="rule" style="margin-bottom:16px">
      <strong>Os clientes da WeInvest têm ficha própria.</strong>
      <p style="margin:6px 0 0">Perfil, carteira, histórico e negócios ficam em <a href="#/wi/clientes">Clientes WeInvest</a>. Aqui está a visão do grupo.</p></div>` : '') +
    `<section class="card"><div class="card__body card__body--flush">
      ${WB.tabela([
        { titulo: 'Nome', bruto: true, ord: (c) => c.nome, valor: (c) => c.rota ? `<a href="${esc(c.rota)}">${esc(c.nome)}</a>` : esc(c.nome) },
        { titulo: 'Empresa', valor: (c) => empresaNome(c.empresa) },
        { titulo: 'Produto', valor: (c) => texto(c.produto) },
        { titulo: 'Situação', valor: (c) => texto(c.situacao || c.etapa) },
        // Valor vazio fica no fim da ordenação, não no começo como zero.
        { titulo: 'Valor', num: true, ord: (c) => (c.valor ? Number(c.valor) : ''), valor: (c) => (c.valor ? WB.moeda(c.valor) : '—') },
        { titulo: 'Responsável', valor: (c) => (c.responsavel ? pessoaNome(c.responsavel) : '—') },
        { titulo: 'Cliente desde', valor: (c) => WB.fmtDataCurta(c.convertidoEm || c.desde), ord: (c) => c.convertidoEm || c.desde },
        { titulo: 'Contato', bruto: true, ordenavel: false, valor: (c) => `<span class="mono">${esc(c.telefone)}</span>` }
      ], lista, {
        busca: true, buscaTexto: 'Buscar nesta lista…',
        vazioTitulo: 'Nenhum cliente nesta operação',
        vazioTexto: 'Converta um lead no CRM ou cadastre um cliente direto.',
        vazioAcao: '<button class="btn btn--primary" data-acao="cliente">Registrar cliente</button>'
      })}
    </div></section>` +
    (convertidos ? `<p class="muted" style="margin-top:14px;font-size:13px">${convertidos} ${convertidos === 1 ? 'veio' : 'vieram'} do funil do CRM.</p>` : '');
  };

  /* ============================================================== EVENTOS
     Delegação no documento: a tela é redesenhada inteira a cada mudança, e
     ouvinte por elemento se perderia no redesenho. */
  let arrastando = null;

  function mover(id, etapa) {
    const r = C.moverEtapa(id, etapa);
    if (r === 'conversao') {
      // Chegar na última coluna não grava: abre a conversão.
      WB.abrirConversao(id, () => { if (WB.rerender) WB.rerender(); });
      return;
    }
    if (!r) return;
    WB.toast(r.nome + ' agora está em ' + etapa + '.');
    if (WB.rerender) WB.rerender();
  }

  function ligar() {
    document.addEventListener('change', (e) => {
      const sel = e.target.closest ? e.target.closest('[data-crm-etapa]') : null;
      if (!sel) return;
      mover(sel.dataset.crmEtapa, sel.value);
    });

    document.addEventListener('dragstart', (e) => {
      const card = e.target.closest ? e.target.closest('[data-crm-drag]') : null;
      if (!card) return;
      arrastando = card.dataset.crmDrag;
      card.classList.add('crmcard--arrastando');
      if (e.dataTransfer) {
        e.dataTransfer.setData('text/plain', arrastando);
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    document.addEventListener('dragover', (e) => {
      if (!arrastando) return;
      const col = e.target.closest ? e.target.closest('[data-crm-drop]') : null;
      if (col) { e.preventDefault(); col.classList.add('crmcol--alvo'); }
    });

    document.addEventListener('dragleave', (e) => {
      const col = e.target.closest ? e.target.closest('[data-crm-drop]') : null;
      if (col) col.classList.remove('crmcol--alvo');
    });

    document.addEventListener('drop', (e) => {
      const col = e.target.closest ? e.target.closest('[data-crm-drop]') : null;
      if (!col || !arrastando) return;
      e.preventDefault();
      col.classList.remove('crmcol--alvo');
      const id = arrastando;
      arrastando = null;
      mover(id, col.dataset.crmDrop);
    });

    document.addEventListener('dragend', () => {
      arrastando = null;
      document.querySelectorAll('.crmcard--arrastando').forEach((c) => c.classList.remove('crmcard--arrastando'));
      document.querySelectorAll('.crmcol--alvo').forEach((c) => c.classList.remove('crmcol--alvo'));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar);
  else ligar();
})();
