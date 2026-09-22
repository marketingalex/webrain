/* WeBrain — utilitários de interface: DOM, formatação, popups, toasts, storage */
(function () {
  const WB = (window.WB = window.WB || {});

  /* --------------------------------------------------------------- escape */
  const esc = (v) =>
    String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  WB.esc = esc;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  WB.$ = $; WB.$$ = $$;

  /* --------------------------------------------------------- armazenamento
     localStorage pode falhar (janela anônima, dados bloqueados). Nunca deixar
     a tela quebrar por causa disso.                                         */
  const KEY = 'webrain.v1';
  let memoria = {};
  let pendentes = {};
  let avisoStorage = null;
  function avisarStorage() {
    if (avisoStorage || !document.body) return;
    avisoStorage = document.createElement('div');
    avisoStorage.className = 'storage-warning';
    avisoStorage.setAttribute('role', 'alert');
    avisoStorage.textContent = 'Não foi possível salvar neste navegador. Alterações ficam apenas nesta sessão e podem ser perdidas ao fechar ou recarregar. ';
    const tentar = document.createElement('button');
    tentar.className = 'btn';
    tentar.textContent = 'Tentar salvar novamente';
    tentar.addEventListener('click', () => gravarStore());
    avisoStorage.appendChild(tentar);
    document.body.prepend(avisoStorage);
  }
  function lerStore() {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Armazenamento inválido');
      memoria = Object.assign({}, parsed, pendentes);
    } catch (e) { avisarStorage(); }
    return memoria;
  }
  function gravarStore() {
    try {
      // Não sobrescrever dados que não conseguimos ler.
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Armazenamento inválido');
      memoria = Object.assign({}, parsed, pendentes);
      localStorage.setItem(KEY, JSON.stringify(memoria));
      pendentes = {};
      if (avisoStorage) avisoStorage.remove();
      avisoStorage = null;
      return true;
    } catch (e) { avisarStorage(); return false; }
  }
  WB.store = {
    get(k, fallback) {
      const s = lerStore();
      return k in s ? s[k] : fallback;
    },
    set(k, v) { const s = lerStore(); s[k] = v; pendentes[k] = v; return gravarStore(); },
    push(k, v) { const s = lerStore(); const arr = Array.isArray(s[k]) ? s[k].slice() : []; arr.unshift(v); WB.store.set(k, arr); return arr; }
  };

  // Escape incompleto digitado na URL continua sendo texto.
  WB.routeSegments = value => String(value || '').replace(/^#\/?/, '').split('/').filter(Boolean).map(part => {
    try { return decodeURIComponent(part); } catch (e) { return part; }
  });

  /* ================================================ LISTAS ACRESCENTÁVEIS
     Lista fechada, porém acrescentável: o formulário mostra as opções
     conhecidas mais "Outro (digitar)", e o valor digitado passa a valer para os
     próximos cadastros. Nasceu no Administrativo e subiu para cá quando o
     comercial precisou do mesmo comportamento em produto e origem — o assunto
     é do portal, não de um módulo. Quem tem listas as registra com
     `WB.registrarListas`; o que o usuário acrescentar fica no armazenamento e
     entra DEPOIS da base, sem sobrescrevê-la. */
  const LISTAS_BASE = {};
  WB.registrarListas = function (mapa) {
    Object.keys(mapa || {}).forEach((k) => { LISTAS_BASE[k] = (mapa[k] || []).slice(); });
  };
  WB.listasBase = () => LISTAS_BASE;

  WB.lista = function (nome) {
    const base = (LISTAS_BASE[nome] || []).slice();
    const extras = WB.store.get('listas.extras', {})[nome];
    if (!Array.isArray(extras)) return base;
    extras.forEach((v) => { if (v && base.indexOf(v) < 0) base.push(v); });
    return base;
  };

  /** Registra um valor novo numa lista. Devolve o valor já normalizado. */
  WB.acrescentarOpcao = function (nome, valor) {
    const v = String(valor == null ? '' : valor).trim();
    if (!v) return '';
    if (WB.lista(nome).indexOf(v) >= 0) return v;
    const guardadas = WB.store.get('listas.extras', {});
    guardadas[nome] = (guardadas[nome] || []).concat([v]);
    WB.store.set('listas.extras', guardadas);
    return v;
  };

  /** Campo de lista acrescentável: select com as opções conhecidas mais
      "+ Outro (digitar)", que revela um campo de texto. O valor digitado é
      resolvido no envio por `WB.valorDeLista`. */
  WB.campoLista = function (c) {
    const id = 'f_' + c.nome + '_' + Math.random().toString(36).slice(2, 7);
    const opcoes = WB.lista(c.lista);
    const conhecido = !c.valor || opcoes.indexOf(c.valor) >= 0;
    const maiuscula = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '');
    return `<div class="fld ${c.span2 ? 'span2' : ''}">
      <label for="${id}">${WB.esc(c.rotulo)}${c.obrigatorio ? ' <span class="fld__req" aria-hidden="true">*</span>' : ''}</label>
      <select class="inp" id="${id}" name="${WB.esc(c.nome)}" data-lista="${WB.esc(c.lista)}"${c.obrigatorio ? ' required' : ''}>
        <option value="">Selecione</option>
        ${opcoes.map((v) => `<option value="${WB.esc(v)}"${v === c.valor ? ' selected' : ''}>${WB.esc(maiuscula(v))}</option>`).join('')}
        <option value="__novo"${conhecido ? '' : ' selected'}>+ Outro (digitar)</option>
      </select>
      <input class="inp admnovo" name="${WB.esc(c.nome)}__novo" type="text" placeholder="Digite o novo valor"
        value="${WB.esc(conhecido ? '' : c.valor)}"${conhecido ? ' hidden' : ''}>
      ${c.ajuda ? `<span class="fld__help">${WB.esc(c.ajuda)}</span>` : ''}
    </div>`;
  };

  /** Mostra o campo de texto quando "Outro (digitar)" é escolhido. */
  WB.ligarListas = function (raiz) {
    raiz.querySelectorAll('[data-lista], [data-adm-lista]').forEach((sel) => {
      const novo = sel.parentElement.querySelector('.admnovo');
      if (!novo || sel.dataset.listaLigada) return;
      sel.dataset.listaLigada = '1';
      sel.addEventListener('change', () => {
        const aberto = sel.value === '__novo';
        novo.hidden = !aberto;
        if (aberto && sel.hasAttribute('required')) novo.setAttribute('required', '');
        else novo.removeAttribute('required');
        if (aberto) novo.focus();
      });
    });
  };

  /** Resolve o valor lido de um campo de lista: "__novo" vira o que foi
      digitado, já registrado na lista para os próximos cadastros. */
  WB.valorDeLista = function (lista, valores, nome) {
    let v = valores[nome];
    if (Array.isArray(v)) v = v[0];
    if (v === '__novo') return WB.acrescentarOpcao(lista, valores[nome + '__novo']);
    return v == null ? '' : v;
  };

  /* ------------------------------------------------------------ formatação */
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MESES_L = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const DIAS_C = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

  function toDate(iso) {
    if (iso instanceof Date) return iso;
    if (!iso || iso === '—') return null;
    const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
    return new Date(a, m - 1, d);
  }
  WB.toDate = toDate;

  WB.fmtData = (iso) => {
    const x = toDate(iso);
    return x ? `${String(x.getDate()).padStart(2, '0')} ${MESES[x.getMonth()]}` : '—';
  };
  WB.fmtDataLonga = (iso) => {
    const x = toDate(iso);
    return x ? `${DIAS[x.getDay()]}, ${x.getDate()} de ${MESES_L[x.getMonth()]}` : '—';
  };
  WB.fmtDataCurta = (iso) => {
    const x = toDate(iso);
    return x ? `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}` : '—';
  };
  WB.diaSemana = (iso) => { const x = toDate(iso); return x ? DIAS_C[x.getDay()] : ''; };

  WB.dias = (iso) => {
    const x = toDate(iso);
    if (!x) return null;
    return Math.round((x - WB.hoje) / 86400000);
  };

  /** "hoje", "amanhã", "3 dias atrás" — prazo em linguagem de gente. */
  WB.prazoTexto = (iso) => {
    const n = WB.dias(iso);
    if (n === null) return '—';
    if (n === 0) return 'hoje';
    if (n === 1) return 'amanhã';
    if (n === -1) return 'ontem';
    if (n < 0) return `${Math.abs(n)} dias atrás`;
    return `em ${n} dias`;
  };

  WB.moeda = (v) => {
    if (v == null || v === '') return '—';
    return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };
  WB.milhar = (v) => Number(v || 0).toLocaleString('pt-BR');

  WB.iniciais = (nome) =>
    String(nome || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  /* --------------------------------------------------------------- ícones */
  const ICONS = {
    busca: '<circle cx="7" cy="7" r="5"/><path d="M11 11l4 4"/>',
    sino: '<path d="M8 2a4.5 4.5 0 0 0-4.5 4.5c0 3.5-1.5 4.5-1.5 4.5h12s-1.5-1-1.5-4.5A4.5 4.5 0 0 0 8 2z"/><path d="M6.5 13.5a1.6 1.6 0 0 0 3 0"/>',
    mais: '<path d="M8 3v10M3 8h10"/>',
    seta: '<path d="M4 8h8M8.5 4.5L12 8l-3.5 3.5"/>',
    baixo: '<path d="M4 6l4 4 4-4"/>',
    check: '<path d="M3 8.5l3.5 3.5L13 5"/>',
    x: '<path d="M4 4l8 8M12 4l-8 8"/>',
    menu: '<path d="M2.5 4h11M2.5 8h11M2.5 12h11"/>',
    calendario: '<rect x="2.5" y="3.5" width="11" height="10" rx="1.5"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3"/>',
    doc: '<path d="M4 2h5l3 3v9H4z"/><path d="M9 2v3h3"/>',
    pasta: '<path d="M2 4.5h4l1.2 1.5H14v7H2z"/>',
    link: '<path d="M6.5 9.5l3-3"/><path d="M7 4.5l1.2-1.2a2.5 2.5 0 0 1 3.5 3.5L10.5 8"/><path d="M9 11.5l-1.2 1.2a2.5 2.5 0 0 1-3.5-3.5L5.5 8"/>',
    filtro: '<path d="M2.5 4h11l-4.2 5v4l-2.6-1.4V9z"/>',
    grid: '<rect x="2.5" y="2.5" width="4.5" height="4.5"/><rect x="9" y="2.5" width="4.5" height="4.5"/><rect x="2.5" y="9" width="4.5" height="4.5"/><rect x="9" y="9" width="4.5" height="4.5"/>',
    lista: '<path d="M5.5 4.5h8M5.5 8h8M5.5 11.5h8M2.5 4.5h.01M2.5 8h.01M2.5 11.5h.01"/>',
    alerta: '<path d="M8 2.5l6 10.5H2z"/><path d="M8 6.5v3M8 11.2v.01"/>',
    cafe: '<path d="M2.5 5.5h9v4a3 3 0 0 1-3 3h-3a3 3 0 0 1-3-3z"/><path d="M11.5 6.5h1.2a1.6 1.6 0 0 1 0 3.2h-1.2"/><path d="M5 2.2v1.6M8 2v1.8"/>',
    carrinho: '<circle cx="6" cy="13" r="1"/><circle cx="12" cy="13" r="1"/><path d="M1.5 2.5h2l1.8 8h7.2l1.5-5.5H4.3"/>',
    estrela: '<path d="M8 2l1.8 3.8 4.2.6-3 2.9.7 4.1L8 11.5 4.3 13.4l.7-4.1-3-2.9 4.2-.6z"/>',
    pessoa: '<circle cx="8" cy="5.5" r="2.6"/><path d="M2.8 13.5a5.2 5.2 0 0 1 10.4 0"/>',
    sair: '<path d="M6 2.5H3.5v11H6"/><path d="M9 5l3 3-3 3M12 8H6"/>',
    lua: '<path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z"/>',
    engrenagem: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.8v1.6M8 12.6v1.6M14.2 8h-1.6M3.4 8H1.8M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1M12.4 12.4l-1.1-1.1M4.7 4.7L3.6 3.6"/>',
    grafico: '<path d="M2.5 13.5v-4M6.2 13.5V5M9.8 13.5V8.5M13.5 13.5v-11"/>',
    raio: '<path d="M9 1.5L3.5 9H8l-1 5.5L12.5 7H8z"/>',
    info: '<circle cx="8" cy="8" r="6.2"/><path d="M8 7.3v4M8 4.9v.01"/>',
    bandeira: '<path d="M4 14V2.5"/><path d="M4 3.2h8l-1.8 2.6L12 8.4H4z"/>',
    planilha: '<rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><path d="M2.5 6.5h11M6.5 6.5v7"/>',
    imagem: '<rect x="2.5" y="3" width="11" height="10" rx="1.5"/><circle cx="6" cy="6.5" r="1"/><path d="M3 11.5l3.2-3 2.3 2 2-1.6 2.5 2.6"/>',
    video: '<rect x="2" y="4" width="8.5" height="8" rx="1.5"/><path d="M10.5 8.4l3.5 2.3v-5.4L10.5 7.6z"/>',
    apresentacao: '<path d="M2.5 2.5h11v8h-11z"/><path d="M8 10.5v3M5.5 13.5h5"/>'
  };
  WB.icon = (nome, size) => {
    const s = size || 16;
    return `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[nome] || ''}</svg>`;
  };

  /* ---------------------------------------------------------------- chips */
  const STATUS_MAP = {
    /* As seis situações da demanda, na mesma ordem de `WB.STATUS_DEMANDA`.
       "Para revisar" tem cor de alerta: é trabalho que voltou. */
    afazer: { t: 'A fazer', c: 'idle' },
    andamento: { t: 'Em andamento', c: 'warn' },
    aprovacao: { t: 'Em aprovação', c: 'info' },
    revisao: { t: 'Para revisar', c: 'late' },
    aprovada: { t: 'Aprovada', c: 'ok' },
    concluida: { t: 'Concluída', c: 'ok' },
    ativo: { t: 'Ativo', c: 'ok' },
    concluido: { t: 'Concluído', c: 'info' },
    arquivado: { t: 'Arquivado', c: 'idle' },
    inativo: { t: 'Inativo', c: 'idle' },
    aberto: { t: 'Aberto', c: 'late' },
    monitorado: { t: 'Monitorado', c: 'warn' },
    resolvido: { t: 'Resolvido', c: 'ok' },
    vigente: { t: 'Vigente', c: 'ok' },
    vencido: { t: 'Vencido', c: 'late' },
    'em assinatura': { t: 'Em assinatura', c: 'warn' },
    conectado: { t: 'Conectado', c: 'ok' },
    parcial: { t: 'Parcial', c: 'warn' },
    pendente: { t: 'Pendente', c: 'late' },
    confirmada: { t: 'Confirmada', c: 'ok' },
    aprovada: { t: 'Aprovada', c: 'ok' },
    atendida: { t: 'Atendida', c: 'ok' },
    paga: { t: 'Paga', c: 'ok' },
    'em análise': { t: 'Em análise', c: 'warn' },
    negociação: { t: 'Em negociação', c: 'warn' },
    confirmado: { t: 'Confirmado', c: 'ok' },
    piloto: { t: 'Piloto', c: 'info' }
  };
  const CHIP_ICON = { ok: 'check', warn: 'alerta', late: 'alerta', info: 'info' };
  /** Estado nunca é comunicado só pela cor: sempre rótulo + ícone ou ponto. */
  WB.chip = (texto, cor) => {
    const ic = CHIP_ICON[cor];
    return `<span class="chip chip--${cor || 'idle'}">${ic ? WB.icon(ic, 13) : '<i class="chip__dot"></i>'}${esc(texto)}</span>`;
  };
  WB.chipStatus = (status) => {
    const m = STATUS_MAP[status] || { t: status || '—', c: 'idle' };
    return WB.chip(m.t, m.c);
  };

  /** Bandeira de prioridade do projeto: cor + bandeira + palavra, sempre as
      três coisas juntas. Cor sozinha não comunica para quem não a distingue. */
  WB.bandeira = (prioridade) => {
    const p = WB.prioridade ? WB.prioridade(prioridade) : { nome: 'Normal', cor: 'idle', id: 'normal' };
    return `<span class="flag flag--${esc(p.id)}" title="Prioridade ${esc(p.nome)}">
      ${WB.icon('bandeira', 13)}<span>${esc(p.nome)}</span></span>`;
  };

  /** Estado de prazo de uma demanda: atrasada / hoje / em dia. */
  WB.chipPrazo = (demanda) => {
    if (demanda.status === 'concluida') return WB.chip('Concluída', 'ok');
    const n = WB.dias(demanda.prazo);
    if (n < 0) return WB.chip(`Atrasada · ${Math.abs(n)}d`, 'late');
    if (n === 0) return WB.chip('Vence hoje', 'warn');
    return WB.chip(WB.prazoTexto(demanda.prazo), 'idle');
  };

  const TIPO_ABREV = { marco: 'M', entregavel: 'E', tarefa: 'T', subtarefa: 'S' };
  const TIPO_NOME = { marco: 'Marco', entregavel: 'Entregável', tarefa: 'Tarefa', subtarefa: 'Subtarefa' };
  WB.tipoMark = (tipo) =>
    `<span class="tmark tmark--${tipo}" title="${esc(TIPO_NOME[tipo] || tipo)}">${TIPO_ABREV[tipo] || '?'}</span>`;
  WB.tipoNome = (tipo) => TIPO_NOME[tipo] || tipo;

  WB.avatar = (pessoaId, cls) => {
    const p = WB.pessoa(pessoaId);
    return `<span class="av ${cls || ''}" title="${esc(p.nome)}">${esc(WB.iniciais(p.nome))}</span>`;
  };

  /* --------------------------------------------------------------- popups */
  let popAberto = null;
  let ultimoFoco = null;

  /**
   * Abre um popup. `render` recebe o objeto de controle e devolve HTML.
   * Retorna o elemento raiz para que o chamador ligue seus eventos.
   */
  WB.abrirPopup = function (opcoes) {
    WB.fecharPopup();
    ultimoFoco = document.activeElement;

    const ov = document.createElement('div');
    ov.className = 'ov';
    ov.innerHTML = `
      <div class="pop ${opcoes.largo ? 'pop--wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(opcoes.titulo)}">
        <div class="pop__head">
          ${opcoes.tipo ? `<span class="pop__kind">${esc(opcoes.tipo)}</span>` : ''}
          <span class="pop__title">${esc(opcoes.titulo)}</span>
          <div style="margin-left:auto"></div>
          <button class="btn btn--ghost btn--icon" data-fechar aria-label="Fechar">${WB.icon('x')}</button>
        </div>
        ${opcoes.acima || ''}
        <div class="pop__body">${opcoes.corpo || ''}</div>
        ${opcoes.rodape ? `<div class="pop__foot">${opcoes.rodape}</div>` : ''}
      </div>`;

    document.getElementById('modal-root').appendChild(ov);
    popAberto = ov;
    WB.ligarTabelas(ov);

    ov.addEventListener('mousedown', (e) => { if (e.target === ov) WB.fecharPopup(); });
    ov.querySelectorAll('[data-fechar]').forEach((b) => b.addEventListener('click', () => WB.fecharPopup()));

    // O foco entra no primeiro campo de fato preenchível, não num passo do topo.
    const corpo = ov.querySelector('.pop__body');
    const focavel = (corpo && Array.from(corpo.querySelectorAll('input:not([type="hidden"]):not([data-tbl-busca]):not([disabled]), select:not([disabled]), textarea:not([disabled])')).find(el => el.offsetParent !== null)) ||
      Array.from(ov.querySelectorAll('button:not([data-fechar]):not([disabled])')).find(el => el.offsetParent !== null) ||
      ov.querySelector('[data-fechar]');
    if (focavel) focavel.focus();

    ov.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); WB.fecharPopup(); return; }
      if (e.key !== 'Tab') return;
      const its = Array.from(ov.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter((el) => el.offsetParent !== null);
      if (!its.length) return;
      const primeiro = its[0], ultimo = its[its.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    });

    document.body.style.overflow = 'hidden';
    return ov;
  };

  WB.fecharPopup = function () {
    if (!popAberto) return;
    popAberto.remove();
    popAberto = null;
    document.body.style.overflow = '';
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  };

  /* --------------------------------------------------------------- toasts */
  WB.toast = function (texto, variante) {
    const root = document.getElementById('toast-root');
    const t = document.createElement('div');
    t.className = 'toast' + (variante === 'erro' ? ' toast--erro' : '');
    t.setAttribute('role', variante === 'erro' ? 'alert' : 'status');
    t.innerHTML = `${WB.icon(variante === 'erro' ? 'alerta' : 'check', 16)}<div>${esc(texto)}</div>`;
    root.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .2s'; }, 4200);
    setTimeout(() => t.remove(), 4500);
  };

  /* ------------------------------------------------------------- popovers */
  let pvAberto = null;
  WB.togglePopover = function (host, html) {
    if (pvAberto && pvAberto.host === host) { WB.fecharPopover(); return; }
    WB.fecharPopover();
    const pv = document.createElement('div');
    pv.className = 'pv';
    pv.innerHTML = html;
    host.classList.add('hasPv');
    host.appendChild(pv);
    pvAberto = { host, pv };
    setTimeout(() => document.addEventListener('mousedown', fechaFora), 0);
    return pv;
  };
  function fechaFora(e) {
    if (pvAberto && !pvAberto.host.contains(e.target)) WB.fecharPopover();
  }
  WB.fecharPopover = function () {
    if (!pvAberto) return;
    pvAberto.pv.remove();
    pvAberto = null;
    document.removeEventListener('mousedown', fechaFora);
  };

  /* -------------------------------------------------------------- helpers */
  WB.vazio = function (titulo, texto, acaoHtml) {
    return `<div class="empty">
      <div class="empty__t">${esc(titulo)}</div>
      <div>${esc(texto || '')}</div>
      ${acaoHtml ? `<div class="empty__a">${acaoHtml}</div>` : ''}
    </div>`;
  };

  /* ------------------------------------------------------------- tabelas */
  /* Busca e ordenação acontecem sobre o DOM já renderizado. A tela não é
     reconstruída, então o texto digitado não se perde e o foco não salta. */
  const semAcento = (v) => String(v == null ? '' : v)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  /* Uma coluna pode trazer texto, dinheiro, percentual ou data no formato
     brasileiro. Sem isso, "10/09" viria antes de "2/09" e R$ 1.200 antes de
     R$ 900. Quem quiser controle total passa `ord` na coluna. */
  function chaveOrdem(td) {
    const bruto = td.dataset.ord != null ? td.dataset.ord : td.textContent;
    const t = String(bruto).trim();
    // Célula sem dado não é "zero" nem "menor": fica no fim, nas duas direções.
    if (!t || t === '—' || t === '-' || t === 'não informado') return { vazio: true };
    const data = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (data) {
      const ano = data[3] ? (data[3].length === 2 ? '20' + data[3] : data[3]) : '0000';
      return { n: Number(ano + data[2].padStart(2, '0') + data[1].padStart(2, '0')) };
    }
    const n = t.replace(/[R$\s.%]/g, '').replace(',', '.');
    if (n && /^-?\d+(\.\d+)?$/.test(n)) return { n: Number(n) };
    return { t: semAcento(t) };
  }

  function ordenarTabela(tab, indice, desc) {
    const tbody = tab.tBodies[0];
    const linhas = [].slice.call(tbody.rows);
    const chaves = linhas.map((tr) => chaveOrdem(tr.cells[indice]));
    const preenchidas = chaves.filter((k) => !k.vazio);
    const numerica = preenchidas.length > 0 && preenchidas.every((k) => 'n' in k);
    linhas
      .map((tr, i) => ({ tr, k: chaves[i], i }))
      .sort((a, b) => {
        if (a.k.vazio || b.k.vazio) return a.k.vazio && b.k.vazio ? a.i - b.i : (a.k.vazio ? 1 : -1);
        const r = numerica
          ? a.k.n - b.k.n
          : String('t' in a.k ? a.k.t : a.k.n).localeCompare(String('t' in b.k ? b.k.t : b.k.n), 'pt-BR');
        return (desc ? -r : r) || a.i - b.i; // empate mantém a ordem de origem
      })
      .forEach((x) => tbody.appendChild(x.tr));
  }

  WB.ligarTabelas = function (root) {
    root.querySelectorAll('[data-tabela]').forEach((box) => {
      const tab = box.querySelector('table.tbl');
      if (!tab || !tab.tBodies[0] || box.dataset.ligada) return;
      box.dataset.ligada = '1';

      const linhas = [].slice.call(tab.tBodies[0].rows);
      const total = linhas.length;
      const conta = box.querySelector('[data-tbl-conta]');
      const semResultado = box.querySelector('[data-tbl-vazio]');
      const busca = box.querySelector('[data-tbl-busca]');
      linhas.forEach((tr) => { tr.dataset.busca = semAcento(tr.textContent); });

      function aplicar() {
        const termo = semAcento(busca ? busca.value.trim() : '');
        let vistas = 0;
        linhas.forEach((tr) => {
          const bate = !termo || tr.dataset.busca.indexOf(termo) >= 0;
          tr.hidden = !bate;
          if (bate) vistas++;
        });
        if (semResultado) semResultado.hidden = vistas > 0;
        if (conta) {
          conta.textContent = termo
            ? vistas + ' de ' + total + (total === 1 ? ' registro' : ' registros')
            : total + (total === 1 ? ' registro' : ' registros');
        }
      }

      if (busca) busca.addEventListener('input', aplicar);

      let coluna = -1, desc = false;
      box.querySelectorAll('[data-ordenar]').forEach((b) => {
        b.addEventListener('click', () => {
          const i = Number(b.dataset.ordenar);
          desc = i === coluna ? !desc : false;
          coluna = i;
          ordenarTabela(tab, i, desc);
          tab.querySelectorAll('th[aria-sort]').forEach((th) => th.setAttribute('aria-sort', 'none'));
          b.parentElement.setAttribute('aria-sort', desc ? 'descending' : 'ascending');
        });
      });
    });
  };

  WB.campo = function (o) {
    const id = o.id || 'f_' + Math.random().toString(36).slice(2, 8);
    const req = o.obrigatorio ? ' <span class="fld__req" aria-hidden="true">*</span>' : '';
    let ctrl;
    if (o.tipo === 'select') {
      ctrl = `<select class="inp" id="${id}" name="${esc(o.nome || id)}"${o.obrigatorio ? ' required' : ''}>
        ${o.placeholder ? `<option value="">${esc(o.placeholder)}</option>` : ''}
        ${(o.opcoes || []).map((op) => {
          const v = typeof op === 'string' ? op : op.valor;
          const t = typeof op === 'string' ? op : op.texto;
          return `<option value="${esc(v)}"${o.valor === v ? ' selected' : ''}>${esc(t)}</option>`;
        }).join('')}
      </select>`;
    } else if (o.tipo === 'textarea') {
      ctrl = `<textarea class="inp" id="${id}" name="${esc(o.nome || id)}" placeholder="${esc(o.placeholder || '')}"${o.obrigatorio ? ' required' : ''} rows="${o.linhas || 3}">${esc(o.valor || '')}</textarea>`;
    } else {
      ctrl = `<input class="inp" id="${id}" name="${esc(o.nome || id)}" type="${o.tipo || 'text'}" placeholder="${esc(o.placeholder || '')}" value="${esc(o.valor || '')}"${o.obrigatorio ? ' required' : ''}${o.min != null ? ` min="${o.min}"` : ''}${o.passo ? ` step="${o.passo}"` : ''}>`;
    }
    return `<div class="fld ${o.span2 ? 'span2' : ''}">
      <label for="${id}">${esc(o.rotulo)}${req}</label>
      ${ctrl}
      ${o.ajuda ? `<span class="fld__help">${esc(o.ajuda)}</span>` : ''}
    </div>`;
  };

  WB.opcoes = function (nome, lista, tipo, marcados) {
    const t = tipo || 'radio';
    const sel = marcados || [];
    return `<div class="opts">${lista.map((op, i) => {
      const v = typeof op === 'string' ? op : op.valor;
      const txt = typeof op === 'string' ? op : op.texto;
      const ck = sel.indexOf(v) >= 0 ? ' checked' : '';
      return `<label class="opt"><input type="${t}" name="${esc(nome)}" value="${esc(v)}"${ck}>${esc(txt)}</label>`;
    }).join('')}</div>`;
  };

  /** Lê um formulário em objeto simples. Checkboxes viram array. */
  WB.lerForm = function (form) {
    const out = {};
    new FormData(form).forEach((v, k) => {
      if (k in out) { out[k] = [].concat(out[k], v); } else { out[k] = v; }
    });
    form.querySelectorAll('input[type="checkbox"]').forEach((c) => {
      if (!(c.name in out)) out[c.name] = [];
      else if (!Array.isArray(out[c.name])) out[c.name] = [out[c.name]];
    });
    return out;
  };

  /** Valida os campos obrigatórios e marca visualmente o primeiro problema. */
  WB.validar = function (form) {
    let ok = true, primeiro = null;
    form.querySelectorAll('[required]').forEach((el) => {
      const vazio = !String(el.value || '').trim();
      el.setAttribute('aria-invalid', vazio ? 'true' : 'false');
      if (vazio && ok) { ok = false; primeiro = el; }
    });
    form.querySelectorAll('[data-grupo-obrigatorio]').forEach((g) => {
      const marcado = g.querySelector('input:checked');
      if (!marcado) { ok = false; primeiro = primeiro || g.querySelector('input'); g.setAttribute('aria-invalid', 'true'); }
      else g.removeAttribute('aria-invalid');
    });
    if (!ok) {
      if (primeiro) primeiro.focus();
      WB.toast('Revise os campos marcados antes de enviar.', 'erro');
    }
    return ok;
  };

  /* ==================================================== GALERIA DO NEWS WE
     O Início mostra os três comunicados mais recentes do perfil. Isto é o
     histórico inteiro, aberto pelo atalho "Ver todas" do próprio painel — sem
     rota e sem item na lateral, porque foi pedido como atalho da tela inicial
     e nada mais (usuário, 22/09/2026).

     A capa é a mesma regra do painel: com imagem, mostra a imagem; sem, desenha
     uma a partir do id, sempre a mesma cor para o mesmo aviso — assim o cartão
     de um comunicado não muda de cara a cada abertura. */
  function corDoAviso(id) {
    let h = 0;
    String(id || '').split('').forEach((ch) => { h = (h * 31 + ch.charCodeAt(0)) % 360; });
    return ['hsl(' + h + ' 42% 38%)', 'hsl(' + ((h + 40) % 360) + ' 46% 28%)'];
  }

  WB.abrirGaleriaNews = function () {
    const eu = WB.eu ? WB.eu() : null;
    const todas = (WB.data.news || [])
      .filter((n) => !eu || n.publico === 'Todos' || n.publico === eu.setor || n.publico === eu.funcao)
      .sort((a, b) => Number(!!b.fixado) - Number(!!a.fixado) || String(b.data).localeCompare(String(a.data)));
    const agora = new Date();

    if (!todas.length) {
      WB.abrirPopup({
        tipo: 'News We', titulo: 'Histórico de comunicados',
        corpo: WB.vazio ? WB.vazio('Nenhuma news para você', 'Os comunicados do seu perfil aparecem aqui.') : '<p>Nada por aqui.</p>',
        rodape: '<span class="grow"></span><button class="btn" data-fechar>Fechar</button>'
      });
      return;
    }

    const ov = WB.abrirPopup({
      tipo: 'News We', titulo: 'Histórico de comunicados', largo: true,
      corpo: `<p class="muted" style="margin:0 0 14px">${todas.length} comunicado${todas.length === 1 ? '' : 's'} visíveis para o seu perfil, do mais recente para o mais antigo.</p>
        <div class="newsgal">${todas.map((n, i) => {
          const novo = typeof WB.avisoNovo === 'function' && WB.avisoNovo(n, agora).novo;
          const [c1, c2] = corDoAviso(n.id);
          return `<button type="button" class="newsgal__item" data-news-item="${i}">
            <span class="newsgal__capa" style="--c1:${c1};--c2:${c2}">${n.capa ? `<img src="${esc(n.capa)}" alt="">` : WB.icon('doc', 26)}</span>
            <span>
              <span class="newsgal__meta">
                <span class="chip chip--idle">${n.fixado ? 'Fixado' : 'Comunicado'}</span>
                ${novo ? '<span class="chip chip--ok">Novo</span>' : ''}
                <span>${esc(WB.fmtDataCurta(n.data))}</span>
              </span>
              <h3>${esc(n.titulo)}</h3>
              <p>${esc(n.corpo)}</p>
            </span>
          </button>`;
        }).join('')}</div>`,
      rodape: '<span class="grow"></span><button class="btn" data-fechar>Fechar</button>'
    });

    /* Abrir o comunicado troca o conteúdo do popup — por isso a leitura vem
       depois de fechar este, e não empilhada em cima dele. */
    ov.querySelectorAll('[data-news-item]').forEach((b) =>
      b.addEventListener('click', () => {
        const aviso = todas[Number(b.dataset.newsItem)];
        WB.fecharPopup();
        if (typeof WB.lerAviso === 'function') WB.lerAviso(aviso);
      }));
  };
})();
