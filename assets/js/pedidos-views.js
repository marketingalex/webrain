/* WeBrain — telas dos pedidos (22/09/2026, pedido do usuário).
   ---------------------------------------------------------------------------
   · HISTÓRICO DE SOLICITAÇÕES (#/solicitacoes/:tipo) — era "Minhas
     solicitações". Uma aba por tipo (eventos, compra ou pagamento, coffee),
     situação em destaque, lixeira em cada linha. Clicar abre o pedido
     inteiro, separado por categoria; editar é lá dentro, e pergunta antes de
     salvar porque o pedido volta para análise.
   · SOLICITAÇÕES A APROVAR (#/aprovacoes/:tipo) — só aparece para quem está
     numa fila de aprovação, e para a administração. As mesmas abas; em cada
     pedido, quem aprova muda a situação. A administração tem, em cada aba, o
     botão de configurar quem tem acesso — e, no coffee, o cardápio.
   As regras moram em pedidos.js; os formulários, em forms.js. */
(function () {
  const WB = (window.WB = window.WB || {});
  const esc = WB.esc;
  const P = WB.pedidos;
  const V = (WB.views = WB.views || {});
  const ABAS = ['evento', 'compra', 'coffe'];
  const abaValida = (t) => (ABAS.indexOf(t) >= 0 ? t : 'evento');
  const nome = (id) => WB.pessoa(id).nome;

  /* --------------------------------------------------------- blocos comuns */
  WB.pedidosDetalheSecoes = function (s) {
    const secoes = WB.secoesDoPedido ? WB.secoesDoPedido(s) : [];
    const lista = s.valores && s.valores.lista && typeof s.valores.lista === 'object' ? s.valores.lista : null;
    return `<div class="pd-secoes">${secoes.map((sec) => `<section class="pd-secao">
      <h3 class="pd-secao__t">${esc(sec.titulo)}</h3>
      <dl class="dl pd-dl">${sec.campos.map((c) => {
        const baixar = lista && lista.dados && c[0] === 'Lista de participantes'
          ? ` <a class="pd-link" href="${esc(lista.dados)}" download="${esc(lista.nome)}">baixar</a>` : '';
        return `<dt>${esc(c[0])}</dt><dd>${esc(c[1])}${baixar}</dd>`;
      }).join('')}</dl>
    </section>`).join('')}</div>`;
  };

  function abasPedidos(base, ativa, contar) {
    return `<div class="tabs pd-tabs" role="tablist">${ABAS.map((t) => {
      const n = contar(t);
      return `<a class="tab" role="tab" href="#/${base}/${t}" aria-selected="${t === ativa}">${esc(P.TIPOS[t].nome)}${n ? `<span class="pd-tabs__n">${n}</span>` : ''}</a>`;
    }).join('')}</div>`;
  }

  const quemAtende = (s) => P.aprovadores(s).map(nome).join(', ') || 'sem responsável definido';
  const quandoCoffe = (s) => {
    if (s.tipo !== 'coffe') return '';
    const ag = s.valores && s.valores.quando === 'agendar';
    return `<span class="pd-tag pd-tag--${ag ? 'agendado' : 'agora'}">${ag ? 'Agendado' : 'Agora'}</span>`;
  };

  /* ========================================================= HISTÓRICO */
  /* Períodos do histórico: a pergunta que o usuário fez foi "o que eu
     solicitei hoje, o que eu solicitei na semana passada". A janela vem de
     `WB.janelaPeriodo`, a mesma das demandas e dos indicadores. */
  const PERIODOS_PEDIDO = [['hoje', 'Hoje'], ['semana', 'Semana'], ['mes', 'Mês'], ['ano', 'Ano'], ['geral', 'Tudo']];

  function barraPeriodo(atual, contar) {
    return `<div class="indbar" role="group" aria-label="Período das solicitações">
      ${PERIODOS_PEDIDO.map(([id, rotulo]) => `<button class="indbar__btn" data-periodo-pedido="${id}" aria-pressed="${atual === id}">${rotulo}${contar(id) ? ` <span class="pd-conta">${contar(id)}</span>` : ''}</button>`).join('')}
    </div>`;
  }

  V.solicitacoes = function (tipo) {
    const aba = abaValida(tipo);
    const eu = WB.data.usuarioAtual;
    const guardado = WB.store.get('solicitacoes.periodo', 'geral');
    const periodo = PERIODOS_PEDIDO.some(([id]) => id === guardado) ? guardado : 'geral';
    const faixa = WB.janelaPeriodo(periodo, WB.d(0));
    const minhas = WB.data.solicitacoes.filter((s) => s.solicitante === eu);
    const daAba = minhas.filter((s) => s.tipo === aba && WB.noPeriodoData(s.data, faixa));

    const linhas = daAba.map((s) => `<li class="pd-row">
      <button class="pd-row__main" data-pedido-abrir="${esc(s.id)}">
        <span class="pd-row__status">${P.selo(s.status, true)}</span>
        <span class="pd-row__body">
          <strong>${esc(s.titulo)} ${quandoCoffe(s)}</strong>
          <span>${esc(s.resumo || '')}</span>
          <small>Enviado em ${esc(WB.fmtDataCurta(s.data))} · aprovação: ${esc(quemAtende(s))}</small>
        </span>
        <span class="pd-row__ver" aria-hidden="true">Ver pedido ${WB.icon('seta', 13)}</span>
      </button>
      <button class="btn btn--ghost btn--icon pd-row__lixo" data-pedido-apagar="${esc(s.id)}" aria-label="Apagar a solicitação ${esc(s.titulo)}" title="Apagar">${iconeLixo()}</button>
    </li>`).join('');

    return WB.cabecalho({
      titulo: 'Histórico de solicitações',
      sub: 'Os pedidos que você enviou, separados por tipo, com a situação de cada um.',
      acoes: `<button class="btn btn--primary" data-acao="${aba}">${WB.icon('mais', 14)} ${esc(P.TIPOS[aba].acao)}</button>`
    }) + abasPedidos('solicitacoes', aba, (t) => minhas.filter((s) => s.tipo === t).length) +
      barraPeriodo(periodo, (id) => minhas.filter((s) => s.tipo === aba && WB.noPeriodoData(s.data, WB.janelaPeriodo(id, WB.d(0)))).length) +
      legendaStatus() +
      (daAba.length ? `<ul class="pd-list">${linhas}</ul>`
        : WB.vazio('Nenhuma solicitação de ' + P.TIPOS[aba].nome.toLowerCase() + (periodo === 'geral' ? '' : ' neste período'),
          periodo === 'geral' ? 'Os pedidos aparecem aqui assim que forem enviados.' : 'Troque o período para ver os pedidos mais antigos.',
          `<button class="btn btn--primary" data-acao="${aba}">${esc(P.TIPOS[aba].acao)}</button>`));
  };

  function legendaStatus() {
    return `<div class="pd-legenda" aria-label="Situações possíveis">${P.STATUS.map((s, i) => `${i ? '<span class="pd-legenda__seta" aria-hidden="true">→</span>' : ''}${P.selo(s.id)}`).join('')}</div>`;
  }

  /* ====================================================== A APROVAR */
  V.aprovacoes = function (tipo) {
    const aba = abaValida(tipo);
    const eu = WB.data.usuarioAtual;
    if (!P.temAprovacao(eu)) {
      return WB.cabecalho({ titulo: 'Solicitações a aprovar' }) +
        WB.vazio('Você não aprova solicitações', 'Quem aprova cada tipo de pedido é definido pela administração.');
    }
    const admin = WB.pode('configurarAprovacao');
    const todos = P.paraAprovar(eu);
    const daAba = todos.filter((s) => s.tipo === aba)
      .sort((a, b) => ordemStatus(a) - ordemStatus(b) || String(b.data).localeCompare(String(a.data)));
    const filasDaAba = P.FILAS.filter((f) => f.tipo === aba);

    const linha = (s) => `<li class="pd-row pd-row--aprovar">
      <button class="pd-row__main" data-pedido-abrir="${esc(s.id)}">
        <span class="pd-row__status">${P.selo(s.status, true)}</span>
        <span class="pd-row__body">
          <strong>${esc(s.titulo)} ${quandoCoffe(s)}</strong>
          <span>${esc(s.resumo || '')}</span>
          <small>${esc(nome(s.solicitante))} · enviado em ${esc(WB.fmtDataCurta(s.data))}${s.tipo === 'evento' ? ' · responsável: ' + esc(quemAtende(s)) : ''}</small>
        </span>
      </button>
      <label class="pd-row__acao"><span class="sr">Situação de ${esc(s.titulo)}</span>
        <select class="inp" data-pedido-status="${esc(s.id)}">${P.STATUS.map((st) => `<option value="${esc(st.id)}"${st.id === P.normalizarStatus(s.status) ? ' selected' : ''}>${esc(st.nome)}</option>`).join('')}</select>
      </label>
    </li>`;

    const responsaveis = filasDaAba.map((f) => `<span class="pd-fila"><strong>${esc(f.nome)}:</strong> ${esc(P.responsaveisDaFila(f.id).map(nome).join(', ') || 'ninguém definido')}</span>`).join('');

    return WB.cabecalho({
      titulo: 'Solicitações a aprovar',
      sub: 'Os pedidos que chegam para você. Mude a situação aqui; quem pediu é avisado no WeBrain.',
      acoes: admin ? `${aba === 'coffe' ? `<button class="btn" data-editar-cardapio>${WB.icon('cafe', 14)} Cardápio do coffee</button>` : ''}
        <button class="btn" data-config-aprovacao="${esc(aba)}">${WB.icon('engrenagem', 14)} Configurar acesso</button>` : ''
    }) + abasPedidos('aprovacoes', aba, (t) => todos.filter((s) => s.tipo === t && P.normalizarStatus(s.status) === 'em análise').length) +
      `<div class="pd-filas">${responsaveis}</div>` +
      (daAba.length ? `<ul class="pd-list">${daAba.map(linha).join('')}</ul>`
        : WB.vazio('Nada para aprovar em ' + P.TIPOS[aba].nome.toLowerCase(), 'Quando alguém enviar um pedido deste tipo para você, ele aparece aqui e no sino de notificações.'));
  };
  const ordemStatus = (s) => P.STATUS.findIndex((x) => x.id === P.normalizarStatus(s.status));

  /* ========================================================= DETALHE */
  WB.abrirDetalhePedido = function (id) {
    const s = P.achar(id);
    if (!s) return WB.toast('Esta solicitação não existe mais.', 'erro');
    const eu = WB.data.usuarioAtual;
    const dono = s.solicitante === eu;
    const aprova = P.podeAprovar(s, eu);
    const historico = (s.historico || []).slice().reverse();
    const ov = WB.abrirPopup({
      tipo: P.TIPOS[s.tipo] ? P.TIPOS[s.tipo].singular : 'Solicitação',
      titulo: s.titulo,
      largo: true,
      corpo: `
        <div class="pd-ok">${P.selo(s.status, true)} ${quandoCoffe(s)}</div>
        <p class="muted" style="margin:10px 0 18px">Solicitado por <strong>${esc(nome(s.solicitante))}</strong> em ${esc(WB.fmtDataCurta(s.data))} · aprovação: <strong>${esc(quemAtende(s))}</strong>${s.editadoEm ? ' · editado depois do envio' : ''}</p>
        ${aprova ? `<div class="pd-aprovar">
          <span>Situação do pedido</span>
          <div class="pd-aprovar__bts" role="group" aria-label="Mudar situação">${P.STATUS.map((st) => `<button class="btn btn--sm" data-mudar-status="${esc(st.id)}" aria-pressed="${st.id === P.normalizarStatus(s.status)}">${esc(st.nome)}</button>`).join('')}</div>
        </div>` : ''}
        ${WB.pedidosDetalheSecoes(s)}
        ${historico.length ? `<details class="pd-hist"><summary>Histórico do pedido</summary><ul>${historico.map((h) => `<li><span>${esc(new Date(h.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }))}</span> ${esc(h.acao)} · ${esc(nome(h.por))}</li>`).join('')}</ul></details>` : ''}`,
      rodape: `${dono || WB.pode('configurarAprovacao') ? `<button class="btn btn--danger" data-apagar>${iconeLixo()} Apagar</button>` : ''}
        <span class="grow"></span>
        <button class="btn" data-fechar>Fechar</button>
        ${dono ? '<button class="btn btn--primary" data-editar>Editar solicitação</button>' : ''}`
    });
    const editar = ov.querySelector('[data-editar]');
    if (editar) editar.addEventListener('click', () => {
      const abrir = { evento: WB.abrirEvento, compra: WB.abrirCompra, coffe: WB.abrirCoffe }[s.tipo];
      if (abrir) abrir({ editar: s });
    });
    const apagar = ov.querySelector('[data-apagar]');
    if (apagar) apagar.addEventListener('click', () => WB.apagarPedido(s.id));
    ov.querySelectorAll('[data-mudar-status]').forEach((b) => b.addEventListener('click', () => {
      if (P.mudarStatus(s.id, b.dataset.mudarStatus)) {
        WB.toast('Situação: ' + P.status(b.dataset.mudarStatus).nome + '. Quem pediu foi avisado.');
        depoisDeMudar();
        WB.abrirDetalhePedido(s.id);
      }
    }));
  };

  WB.apagarPedido = function (id) {
    const s = P.achar(id);
    if (!s) return;
    WB.confirmarAcao({
      titulo: 'Apagar esta solicitação?',
      texto: `Você realmente quer apagar "${s.titulo}"? Isso apaga também para o responsável pela aprovação. Não dá para desfazer.`,
      confirmar: 'Apagar solicitação',
      perigo: true
    }).then((ok) => {
      if (!ok) return;
      if (!P.apagar(id)) return WB.toast('Só quem fez o pedido pode apagá-lo.', 'erro');
      WB.fecharPopup();
      WB.toast('Solicitação apagada.');
      depoisDeMudar();
    });
  };

  function depoisDeMudar() {
    if (WB.rerender) WB.rerender();
    else if (WB.renderSidebar) WB.renderSidebar();
  }

  /* ================================================ CONFIGURAR ACESSO */
  WB.configurarAprovacao = function (tipo) {
    if (!WB.pode('configurarAprovacao')) return WB.toast('Só a administração define quem aprova.', 'erro');
    const filas = P.FILAS.filter((f) => f.tipo === tipo);
    const pessoas = WB.data.pessoas;
    const ov = WB.abrirPopup({
      tipo: 'Configurar acesso',
      titulo: 'Quem aprova · ' + P.TIPOS[tipo].nome,
      largo: true,
      corpo: `<form novalidate>${filas.map((f) => `<fieldset class="fset">
        <legend class="fset__legend">${esc(f.nome)}</legend>
        <p class="fld__help" style="margin:0 0 10px">${esc(f.ajuda)}</p>
        <div class="opts">${pessoas.map((x) => `<label class="opt"><input type="checkbox" name="${esc(f.id)}" value="${esc(x.id)}"${P.responsaveisDaFila(f.id).indexOf(x.id) >= 0 ? ' checked' : ''}>${esc(x.nome)}<span class="muted" style="margin-left:4px;font-size:12px">· ${esc(x.setor || x.funcao)}</span></label>`).join('')}</div>
      </fieldset>`).join('')}
      <p class="fld__help">A administração sempre enxerga todas as solicitações a aprovar. Quem entra numa fila passa a ver a aba e a ser notificado dos pedidos novos.</p>
      </form>`,
      rodape: `<span class="grow"></span><button class="btn" data-fechar>Cancelar</button><button class="btn btn--primary" data-salvar>Salvar acesso</button>`
    });
    ov.querySelector('[data-salvar]').addEventListener('click', () => {
      const form = ov.querySelector('form');
      const v = WB.lerForm(form);
      const vazia = filas.find((f) => ![].concat(v[f.id] || []).length);
      if (vazia) return WB.toast(`Escolha ao menos uma pessoa para "${vazia.nome}".`, 'erro');
      filas.forEach((f) => P.definirResponsaveis(f.id, [].concat(v[f.id] || [])));
      WB.fecharPopup();
      WB.toast('Acesso de aprovação atualizado.');
      depoisDeMudar();
    });
  };

  /* ================================================ CARDÁPIO DO COFFEE
     Cada opção: nome, descrição, quando pode ser pedida e o que tem nela —
     itens por grupo (coffee) ou bebidas (jantar). Um item por linha. */
  WB.editarCardapio = function () {
    if (!WB.pode('configurarAprovacao')) return WB.toast('Só a administração edita o cardápio.', 'erro');
    let lista = JSON.parse(JSON.stringify(P.cardapio()));
    const linhas = (arr) => (arr || []).join('\n');
    const bloco = (c, i) => `<fieldset class="fset pd-card-ed" data-i="${i}">
      <legend class="fset__legend">${esc(c.categoria || 'Opção')} <button type="button" class="btn btn--ghost btn--sm pd-card-ed__rm" data-rm="${i}">${iconeLixo()} Tirar</button></legend>
      <div class="fgrid fgrid--2">
        ${WB.campo({ rotulo: 'Nome da opção', nome: 'nome', valor: c.nome, obrigatorio: true })}
        ${WB.campo({ rotulo: 'Categoria', nome: 'categoria', valor: c.categoria || '' })}
        ${WB.campo({ rotulo: 'Descrição', nome: 'descricao', valor: c.descricao || '', span2: true })}
      </div>
      <div class="fld" style="margin-top:12px"><label>Pode ser pedida</label><div class="opts">
        <label class="opt"><input type="checkbox" name="agora"${(c.quando || []).indexOf('agora') >= 0 ? ' checked' : ''}>Agora</label>
        <label class="opt"><input type="checkbox" name="agendar"${(c.quando || []).indexOf('agendar') >= 0 ? ' checked' : ''}>Agendada</label>
      </div></div>
      <div class="fld" style="margin-top:12px"><label>Como é pedida</label><div class="opts">
        <label class="opt"><input type="radio" name="modo-${i}" value="itens"${c.modo !== 'pessoas' ? ' checked' : ''}>Item por item, com quantidade</label>
        <label class="opt"><input type="radio" name="modo-${i}" value="pessoas"${c.modo === 'pessoas' ? ' checked' : ''}>Igual para todos (jantar)</label>
      </div></div>
      <div class="fgrid fgrid--3" style="margin-top:12px" data-itens>
        ${[0, 1, 2].map((g) => { const gr = (c.grupos || [])[g] || { nome: ['Bebidas', 'Salgados', 'Doces'][g], itens: [] }; return `<div class="fld"><input class="inp" name="grupo${g}" value="${esc(gr.nome)}" aria-label="Nome do grupo ${g + 1}" style="margin-bottom:6px"><textarea class="inp" name="itens${g}" rows="5" aria-label="Itens do grupo ${g + 1}, um por linha">${esc(linhas(gr.itens))}</textarea></div>`; }).join('')}
      </div>
      <div class="fld" style="margin-top:12px" data-bebidas>
        <label>Bebidas que podem ser escolhidas (uma por linha)</label>
        <textarea class="inp" name="bebidas" rows="4">${esc(linhas(c.bebidas))}</textarea>
      </div>
    </fieldset>`;
    const ov = WB.abrirPopup({
      tipo: 'Coffee',
      titulo: 'Cardápio do coffee',
      largo: true,
      corpo: `<div data-lista></div><button type="button" class="btn" data-nova>${WB.icon('mais', 14)} Nova opção</button>
        <p class="fld__help" style="margin-top:12px">"Agora" deve ter só o que fica sempre pronto na casa. Itens: um por linha.</p>`,
      rodape: `<button class="btn btn--ghost" data-padrao>Voltar ao cardápio padrão</button><span class="grow"></span><button class="btn" data-fechar>Cancelar</button><button class="btn btn--primary" data-salvar>Salvar cardápio</button>`
    });
    const caixa = ov.querySelector('[data-lista]');
    const ler = () => Array.prototype.map.call(caixa.querySelectorAll('.pd-card-ed'), (fs, i) => {
      const q = (n) => fs.querySelector(`[name="${n}"]`);
      const itens = (t) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean);
      const modo = (fs.querySelector('input[type="radio"]:checked') || {}).value || 'itens';
      const antigo = lista[Number(fs.dataset.i)] || {};
      return {
        id: antigo.id || 'op' + Date.now().toString(36) + i,
        categoria: q('categoria').value.trim(), nome: q('nome').value.trim(), descricao: q('descricao').value.trim(),
        quando: [q('agora').checked ? 'agora' : '', q('agendar').checked ? 'agendar' : ''].filter(Boolean),
        modo, preparo: antigo.preparo,
        grupos: modo === 'itens' ? [0, 1, 2].map((g) => ({ nome: q('grupo' + g).value.trim(), itens: itens(q('itens' + g).value) })).filter((g) => g.nome && g.itens.length) : undefined,
        bebidas: modo === 'pessoas' ? itens(q('bebidas').value) : undefined
      };
    });
    const desenhar = () => {
      caixa.innerHTML = lista.map(bloco).join('');
      caixa.querySelectorAll('.pd-card-ed').forEach((fs) => {
        const sync = () => {
          const pessoas = (fs.querySelector('input[type="radio"]:checked') || {}).value === 'pessoas';
          fs.querySelector('[data-itens]').hidden = pessoas;
          fs.querySelector('[data-bebidas]').hidden = !pessoas;
        };
        fs.addEventListener('change', sync);
        sync();
      });
    };
    desenhar();
    ov.addEventListener('click', (e) => {
      const rm = e.target.closest('[data-rm]');
      if (rm) { lista = ler(); lista.splice(Number(rm.dataset.rm), 1); desenhar(); return; }
      if (e.target.closest('[data-nova]')) { lista = ler(); lista.push({ categoria: 'Coffee Premium', nome: 'Nova opção', quando: ['agendar'], modo: 'itens', grupos: [] }); desenhar(); return; }
      if (e.target.closest('[data-padrao]')) { lista = P.cardapioPadrao(); desenhar(); WB.toast('Cardápio padrão carregado. Salve para aplicar.'); return; }
      if (e.target.closest('[data-salvar]')) {
        const novo = ler();
        const ruim = novo.find((c) => !c.nome || !c.quando.length || (c.modo === 'itens' ? !(c.grupos || []).length : !(c.bebidas || []).length));
        if (ruim) return WB.toast(`Revise "${ruim.nome || 'opção sem nome'}": precisa de nome, de quando pode ser pedida e de itens.`, 'erro');
        if (!novo.some((c) => c.quando.indexOf('agora') >= 0)) return WB.toast('Deixe ao menos uma opção disponível para "agora".', 'erro');
        P.salvarCardapio(novo);
        WB.fecharPopup();
        WB.toast('Cardápio do coffee atualizado.');
      }
    });
  };

  function iconeLixo() {
    return '<svg class="ic" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5h11M6.5 4.5V3h3v1.5M4 4.5l.7 9h6.6l.7-9M6.8 7v4.5M9.2 7v4.5"/></svg>';
  }

  /* ---------------------------------------------------- eventos das telas
     Um ouvinte só, no documento: as telas são redesenhadas a cada rota e o
     detalhe abre num popup, fora do conteúdo. */
  document.addEventListener('click', (e) => {
    const abrir = e.target.closest('[data-pedido-abrir]');
    if (abrir) return WB.abrirDetalhePedido(abrir.dataset.pedidoAbrir);
    const apagar = e.target.closest('[data-pedido-apagar]');
    if (apagar) return WB.apagarPedido(apagar.dataset.pedidoApagar);
    const cfg = e.target.closest('[data-config-aprovacao]');
    if (cfg) return WB.configurarAprovacao(cfg.dataset.configAprovacao);
    if (e.target.closest('[data-editar-cardapio]')) return WB.editarCardapio();
  });
  document.addEventListener('change', (e) => {
    const sel = e.target.closest && e.target.closest('[data-pedido-status]');
    if (!sel) return;
    if (P.mudarStatus(sel.dataset.pedidoStatus, sel.value)) {
      WB.toast('Situação: ' + P.status(sel.value).nome + '. Quem pediu foi avisado.');
      depoisDeMudar();
    }
  });
})();
