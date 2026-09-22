/* WeBrain — fluxo dos pedidos (evento, compra ou pagamento, coffee).
   ---------------------------------------------------------------------------
   Segunda remessa de ajustes do usuário, 22/09/2026. Este arquivo guarda as
   regras; os formulários estão em forms.js e as telas em pedidos-views.js.

   · SITUAÇÕES — três, nesta ordem: em análise → confirmado / em andamento →
     concluído. Todo pedido nasce em análise; editar um pedido devolve para
     análise, porque ele volta para aprovação.
   · FILAS — quem aprova cada tipo. Evento tem responsável escolhido no
     próprio pedido (gastronomia com o Vinícius, marketing com o Alex); compra
     tem uma fila; coffee tem duas, porque "agora" e "agendar" são atendidos
     por pessoas diferentes. Quem está em cada fila é a administração que
     define (tela Solicitações a aprovar → Configurar acesso).
   · NOTIFICAÇÃO — dentro do WeBrain, no sino do cabeçalho. Quem aprova é
     avisado de pedido novo, editado ou apagado; quem pediu é avisado quando a
     situação muda. Não há e-mail: essa integração não existe no protótipo.
   · GRAVAÇÃO — o estado inteiro vai para o armazenamento local e, na leitura,
     o gravado vence. A reidratação antiga (fase2-data.js) só acrescentava
     registro novo: apagar ou editar um pedido de exemplo voltava no F5. */
(function () {
  const WB = (window.WB = window.WB || {});
  const esc = (v) => (WB.esc ? WB.esc(v) : String(v == null ? '' : v));
  const P = (WB.pedidos = WB.pedidos || {});

  /* ------------------------------------------------------------ situações */
  P.STATUS = [
    { id: 'em análise', nome: 'Em análise', cor: 'analise' },
    { id: 'confirmado', nome: 'Confirmado · em andamento', cor: 'confirmado' },
    { id: 'concluído', nome: 'Concluído', cor: 'concluido' }
  ];
  /* Pedidos gravados antes desta rodada usavam outros nomes. */
  const LEGADO = {
    confirmada: 'confirmado', aprovada: 'confirmado', 'em andamento': 'confirmado', 'em planejamento': 'confirmado',
    paga: 'concluído', atendida: 'concluído', concluida: 'concluído', concluido: 'concluído', 'concluída': 'concluído'
  };
  P.normalizarStatus = (s) => {
    const k = String(s || '').toLowerCase();
    if (P.STATUS.some((x) => x.id === k)) return k;
    return LEGADO[k] || 'em análise';
  };
  P.status = (id) => P.STATUS.find((x) => x.id === P.normalizarStatus(id));
  /* Selo grande de situação: cor, ponto e palavra — nunca só a cor. */
  P.selo = (id, grande) => {
    const s = P.status(id);
    return `<span class="pd-status pd-status--${s.cor}${grande ? ' pd-status--lg' : ''}"><i aria-hidden="true"></i>${esc(s.nome)}</span>`;
  };

  /* ---------------------------------------------------------------- tipos */
  P.TIPOS = {
    evento: { nome: 'Eventos', singular: 'Evento', acao: 'Solicitar evento' },
    compra: { nome: 'Compra ou pagamento', singular: 'Compra ou pagamento', acao: 'Solicitar compra ou pagamento' },
    coffe: { nome: 'Coffee', singular: 'Coffee', acao: 'Solicitar coffee' }
  };
  P.tipoValido = (t) => Object.prototype.hasOwnProperty.call(P.TIPOS, t);

  /* ---------------------------------------------------------------- filas */
  P.FILAS = [
    { id: 'evento', tipo: 'evento', nome: 'Eventos', ajuda: 'Quem pode ser escolhido como responsável pelo evento. Cada pedido vai só para o responsável escolhido.' },
    { id: 'compra', tipo: 'compra', nome: 'Compra ou pagamento', ajuda: 'Quem recebe e aprova os pedidos de compra ou pagamento.' },
    { id: 'coffe-agora', tipo: 'coffe', nome: 'Coffee · agora', ajuda: 'Quem atende o coffee pedido para agora (pronto em 15 minutos).' },
    { id: 'coffe-agendado', tipo: 'coffe', nome: 'Coffee · agendado', ajuda: 'Quem atende o coffee agendado — premium e jantar.' }
  ];
  const CONFIG_PADRAO = {
    evento: ['u1', 'u9'],
    compra: ['u8'],
    'coffe-agora': ['u8'],
    'coffe-agendado': ['u9']
  };
  const CHAVE_CONFIG = 'pedidos.responsaveis';
  let config = null;
  function lerConfig() {
    if (config) return config;
    const salvo = WB.store ? WB.store.get(CHAVE_CONFIG, null) : null;
    config = {};
    Object.keys(CONFIG_PADRAO).forEach((k) => {
      config[k] = salvo && Array.isArray(salvo[k]) ? salvo[k].slice() : CONFIG_PADRAO[k].slice();
    });
    return config;
  }
  P.responsaveisDaFila = (fila) => (lerConfig()[fila] || []).filter((id) => pessoaExiste(id));
  P.definirResponsaveis = function (fila, ids) {
    if (!WB.pode || !WB.pode('configurarAprovacao')) return false;
    lerConfig()[fila] = (ids || []).filter(pessoaExiste);
    if (WB.store) WB.store.set(CHAVE_CONFIG, config);
    return true;
  };
  const pessoaExiste = (id) => (WB.data.pessoas || []).some((p) => p.id === id);

  /** Em qual fila o pedido cai. */
  P.filaDe = function (s) {
    if (!s) return null;
    if (s.tipo === 'coffe') return (s.valores && s.valores.quando === 'agendar') ? 'coffe-agendado' : 'coffe-agora';
    return s.tipo;
  };
  /** Quem aprova este pedido. Evento com responsável escolhido vai só para ele. */
  P.aprovadores = function (s) {
    if (!s) return [];
    if (s.tipo === 'evento' && s.responsavel && pessoaExiste(s.responsavel)) return [s.responsavel];
    return P.responsaveisDaFila(P.filaDe(s));
  };
  const ehAdmin = (uid) => (WB.pessoa ? WB.pessoa(uid).papel : '') === 'admin';
  P.podeAprovar = (s, uid) => ehAdmin(uid) || P.aprovadores(s).indexOf(uid) >= 0;
  /** Filas que esta pessoa enxerga na tela de aprovação. Admin vê todas. */
  P.filasDe = (uid) => ehAdmin(uid) ? P.FILAS.map((f) => f.id)
    : P.FILAS.filter((f) => P.responsaveisDaFila(f.id).indexOf(uid) >= 0).map((f) => f.id);
  P.temAprovacao = (uid) => P.filasDe(uid).length > 0;
  /** Pedidos que chegam para esta pessoa aprovar, de um tipo ou de todos. */
  P.paraAprovar = (uid, tipo) => (WB.data.solicitacoes || [])
    .filter((s) => (!tipo || s.tipo === tipo) && P.podeAprovar(s, uid));
  P.pendentesDe = (uid) => P.paraAprovar(uid).filter((s) => P.normalizarStatus(s.status) === 'em análise').length;

  /* -------------------------------------------------- listas que crescem
     Recursos, formato de alimentação, comunicação, empresas do pedido de
     compra, locais do coffee e bebidas do jantar: o formulário mostra o que
     já existe e aceita item novo. O acréscimo fica gravado e aparece para os
     próximos pedidos. */
  const CHAVE_OPCOES = 'pedidos.opcoes';
  P.LISTAS = ['recursosEvento', 'formatoAlimentacao', 'comunicacao', 'empresasPedido', 'locais'];
  P.adicionarOpcao = function (lista, valor) {
    const v = String(valor || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!v || P.LISTAS.indexOf(lista) < 0) return '';
    const atual = WB.data.opcoes[lista] || (WB.data.opcoes[lista] = []);
    const igual = atual.find((x) => String(x).toLowerCase() === v.toLowerCase());
    if (igual) return igual;
    atual.push(v);
    const salvo = (WB.store && WB.store.get(CHAVE_OPCOES, {})) || {};
    salvo[lista] = (Array.isArray(salvo[lista]) ? salvo[lista] : []).concat([v]);
    if (WB.store) WB.store.set(CHAVE_OPCOES, salvo);
    return v;
  };

  /* -------------------------------------------------------------- cardápio
     Três categorias: o coffee da casa (sempre disponível, pedido para agora,
     pronto em 15 minutos), o coffee premium (duas opções) e o jantar (duas
     opções), os dois últimos só agendados. Coffee é escolhido item por item,
     com quantidade; jantar é servido igual para todos, com restrições e as
     bebidas escolhidas no pedido. A administração edita tudo isto. */
  const CARDAPIO_PADRAO = [
    { id: 'casa', categoria: 'Coffee da casa', nome: 'Coffee da casa', descricao: 'Sempre disponível na casa, para qualquer reunião.', quando: ['agora', 'agendar'], modo: 'itens', preparo: 15,
      grupos: [
        { nome: 'Bebidas', itens: ['Café', 'Café com leite', 'Chá', 'Água', 'Água com gás'] },
        { nome: 'Acompanhamentos', itens: ['Biscoito amanteigado'] }
      ] },
    { id: 'premium1', categoria: 'Coffee Premium', nome: 'Coffee Premium — opção 1', descricao: 'Bebidas quentes e frias, salgados e doces.', quando: ['agendar'], modo: 'itens',
      grupos: [
        { nome: 'Bebidas', itens: ['Café', 'Cappuccino', 'Chá', 'Suco natural', 'Água'] },
        { nome: 'Salgados', itens: ['Pão de queijo', 'Mini sanduíche'] },
        { nome: 'Doces', itens: ['Bolo do dia', 'Salada de frutas'] }
      ] },
    { id: 'premium2', categoria: 'Coffee Premium', nome: 'Coffee Premium — opção 2', descricao: 'Bebidas, salgados assados, bolo e tábua de frios.', quando: ['agendar'], modo: 'itens',
      grupos: [
        { nome: 'Bebidas', itens: ['Café', 'Cappuccino', 'Chá', 'Suco natural', 'Água'] },
        { nome: 'Salgados', itens: ['Salgado assado', 'Tábua de frios (porção)'] },
        { nome: 'Doces', itens: ['Bolo', 'Brigadeiro'] }
      ] },
    { id: 'jantar1', categoria: 'Jantar', nome: 'Jantar — opção 1', descricao: 'Entrada, prato principal com guarnição e sobremesa.', quando: ['agendar'], modo: 'pessoas',
      bebidas: ['Água', 'Refrigerante', 'Suco natural', 'Vinho tinto', 'Vinho branco', 'Espumante', 'Cerveja'] },
    { id: 'jantar2', categoria: 'Jantar', nome: 'Jantar — opção 2', descricao: 'Coquetel volante com seis tipos de canapé e sobremesa.', quando: ['agendar'], modo: 'pessoas',
      bebidas: ['Água', 'Refrigerante', 'Suco natural', 'Vinho tinto', 'Vinho branco', 'Espumante', 'Cerveja', 'Drinks'] }
  ];
  const CHAVE_CARDAPIO = 'pedidos.cardapio';
  let cardapio = null;
  const copia = (x) => JSON.parse(JSON.stringify(x));
  P.cardapio = function () {
    if (cardapio) return cardapio;
    const salvo = WB.store ? WB.store.get(CHAVE_CARDAPIO, null) : null;
    cardapio = Array.isArray(salvo) && salvo.length ? salvo : copia(CARDAPIO_PADRAO);
    return cardapio;
  };
  P.opcaoCardapio = (id) => P.cardapio().find((c) => c.id === id) || null;
  /** "agora" só aceita o que está sempre pronto na casa. */
  P.cardapioPara = (quando) => P.cardapio().filter((c) => (c.quando || []).indexOf(quando === 'agendar' ? 'agendar' : 'agora') >= 0);
  P.salvarCardapio = function (lista) {
    if (!WB.pode || !WB.pode('configurarAprovacao')) return false;
    cardapio = copia(lista);
    if (WB.store) WB.store.set(CHAVE_CARDAPIO, cardapio);
    return true;
  };
  P.cardapioPadrao = () => copia(CARDAPIO_PADRAO);

  /* ---------------------------------------------------------- notificações */
  const CHAVE_NOTIF = 'pedidos.notificacoes';
  /* Um aviso por pessoa, no mesmo formato que `WB.minhasNotificacoes`
     (data.js) lê: o campo `pessoa` diz de quem é. Quem fez a ação não é
     avisado da própria ação. */
  P.notificar = function (para, texto, rota) {
    const ids = [].concat(para || []).filter((id, i, a) => id && id !== WB.data.usuarioAtual && a.indexOf(id) === i);
    if (!ids.length) return;
    const salvas = (WB.store && WB.store.get(CHAVE_NOTIF, [])) || [];
    ids.forEach((pessoa) => {
      const n = { id: 'np' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), texto, data: WB.d(0), lida: false, rota: rota || '#/solicitacoes', pessoa, origem: 'pedidos' };
      WB.data.notificacoes.unshift(n);
      salvas.unshift(n);
    });
    if (WB.store) WB.store.set(CHAVE_NOTIF, salvas.slice(0, 200));
    if (WB.renderTopbar) WB.renderTopbar();
  };
  P.notificacoesDe = (uid) => (WB.minhasNotificacoes ? WB.minhasNotificacoes(uid)
    : (WB.data.notificacoes || []).filter((n) => !n.pessoa || n.pessoa === uid));

  /* ----------------------------------------------------------- gravação */
  const CHAVE_SOL = 'pedidos.solicitacoes';
  P.salvar = function () {
    if (WB.store) WB.store.set(CHAVE_SOL, WB.data.solicitacoes);
  };
  function substituir(alvo, novos) {
    alvo.splice(0, alvo.length);
    novos.forEach((x) => alvo.push(x));
  }
  /** Chamado no boot, depois da reidratação da Fase 2. */
  P.carregar = function () {
    if (!WB.store) return;
    const sol = WB.store.get(CHAVE_SOL, null);
    if (Array.isArray(sol)) substituir(WB.data.solicitacoes, sol.filter((s) => s && s.id));
    WB.data.solicitacoes.forEach((s) => { s.status = P.normalizarStatus(s.status); });

    const opcoes = WB.store.get(CHAVE_OPCOES, null);
    if (opcoes && typeof opcoes === 'object') {
      P.LISTAS.forEach((l) => (opcoes[l] || []).forEach((v) => {
        const atual = WB.data.opcoes[l] || (WB.data.opcoes[l] = []);
        if (atual.indexOf(v) < 0) atual.push(v);
      }));
    }
    const notif = WB.store.get(CHAVE_NOTIF, null);
    if (Array.isArray(notif)) {
      const vistos = {};
      WB.data.notificacoes.forEach((n) => { vistos[n.id] = true; });
      notif.slice().reverse().forEach((n) => { if (n && n.id && !vistos[n.id]) WB.data.notificacoes.unshift(n); });
    }
    const news = WB.store.get('home.news', null);
    if (Array.isArray(news)) substituir(WB.data.news, news.filter((n) => n && n.id));
    const pol = WB.store.get('home.politicas', null);
    if (Array.isArray(pol)) WB.data.politicasDestaque = pol;
    config = null; cardapio = null;
  };

  /* ---------------------------------------------------------- operações */
  P.novoId = () => (WB.novoIdSolicitacao ? WB.novoIdSolicitacao() : 'SOL-' + Date.now());
  P.achar = (id) => (WB.data.solicitacoes || []).find((s) => s.id === id) || null;
  const nomeCurto = (s) => s.titulo || P.TIPOS[s.tipo].singular;

  P.registrar = function (dados) {
    const reg = {
      id: P.novoId(),
      tipo: dados.tipo,
      titulo: dados.titulo,
      solicitante: WB.data.usuarioAtual,
      data: WB.d(0),
      criadoEm: new Date().toISOString(),
      status: 'em análise',
      resumo: dados.resumo || '',
      responsavel: dados.responsavel || '',
      campos: dados.campos || [],
      secoes: dados.secoes || [],
      valores: dados.valores || {},
      historico: [{ em: new Date().toISOString(), por: WB.data.usuarioAtual, acao: 'Pedido enviado' }]
    };
    WB.data.solicitacoes.unshift(reg);
    P.salvar();
    P.notificar(P.aprovadores(reg), `${WB.eu().nome} enviou uma solicitação para aprovar: ${nomeCurto(reg)}.`, '#/aprovacoes/' + reg.tipo);
    return reg;
  };

  /** Editar devolve para análise: o pedido volta para aprovação. */
  P.atualizar = function (id, dados) {
    const s = P.achar(id);
    if (!s || s.solicitante !== WB.data.usuarioAtual) return null;
    const antes = P.aprovadores(s);
    ['titulo', 'resumo', 'campos', 'secoes', 'valores'].forEach((k) => { if (dados[k] !== undefined) s[k] = dados[k]; });
    if (dados.responsavel !== undefined) s.responsavel = dados.responsavel;
    s.status = 'em análise';
    s.editadoEm = new Date().toISOString();
    (s.historico = s.historico || []).push({ em: s.editadoEm, por: WB.data.usuarioAtual, acao: 'Pedido editado — voltou para análise' });
    P.salvar();
    const depois = P.aprovadores(s);
    P.notificar(antes.concat(depois.filter((x) => antes.indexOf(x) < 0)), `${WB.eu().nome} alterou a solicitação ${nomeCurto(s)} — ela voltou para análise.`, '#/aprovacoes/' + s.tipo);
    return s;
  };

  /** Apagar some para quem pediu e para quem aprova. */
  P.apagar = function (id) {
    const i = WB.data.solicitacoes.findIndex((s) => s.id === id);
    if (i < 0) return false;
    const s = WB.data.solicitacoes[i];
    const eu = WB.data.usuarioAtual;
    if (s.solicitante !== eu && !ehAdmin(eu)) return false;
    WB.data.solicitacoes.splice(i, 1);
    P.salvar();
    P.notificar(P.aprovadores(s).concat(s.solicitante), `${WB.eu().nome} apagou a solicitação ${nomeCurto(s)}.`, '#/solicitacoes');
    return true;
  };

  P.mudarStatus = function (id, status) {
    const s = P.achar(id);
    const eu = WB.data.usuarioAtual;
    if (!s || !P.podeAprovar(s, eu)) return null;
    const novo = P.normalizarStatus(status);
    if (novo === P.normalizarStatus(s.status)) return s;
    s.status = novo;
    (s.historico = s.historico || []).push({ em: new Date().toISOString(), por: eu, acao: 'Situação: ' + P.status(novo).nome });
    P.salvar();
    P.notificar(s.solicitante, `Sua solicitação ${nomeCurto(s)} está agora: ${P.status(novo).nome}.`, '#/solicitacoes/' + s.tipo);
    return s;
  };

  /* ------------------------------------------------------------ dinheiro
     Campo em real que se formata enquanto se digita: "R$ 1.234,56". Os
     dígitos são centavos, como numa maquininha — não há vírgula para errar. */
  P.formatarMoeda = function (valor) {
    const n = Number(valor);
    if (!isFinite(n)) return '';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  P.lerMoeda = function (texto) {
    if (typeof texto === 'number') return texto;
    const s = String(texto || '').trim();
    if (!s) return 0;
    if (/^\d+(\.\d+)?$/.test(s)) return Number(s); // valor já numérico, gravado antes
    const digitos = s.replace(/\D/g, '');
    return digitos ? Number(digitos) / 100 : 0;
  };
  P.ligarMoeda = function (input) {
    if (!input || input.dataset.moeda === '1') return;
    input.dataset.moeda = '1';
    const aplicar = () => {
      const digitos = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 13);
      input.value = digitos ? P.formatarMoeda(Number(digitos) / 100) : '';
    };
    if (input.value && /^\d+(\.\d+)?$/.test(input.value)) input.value = P.formatarMoeda(Number(input.value));
    input.addEventListener('input', aplicar);
  };

  /* ------------------------------------------------------------ arquivos
     O protótipo não tem servidor: o arquivo fica no próprio navegador. Acima
     do limite só o nome é guardado, e a tela diz isso. */
  P.LIMITE_ARQUIVO = 700 * 1024;
  P.lerArquivo = function (file) {
    return new Promise((ok) => {
      if (!file || !file.name) return ok(null);
      const base = { nome: file.name, tamanho: file.size, tipo: file.type || '' };
      if (file.size > P.LIMITE_ARQUIVO || typeof FileReader === 'undefined') return ok(Object.assign(base, { guardado: false }));
      const r = new FileReader();
      r.onload = () => ok(Object.assign(base, { guardado: true, dados: r.result }));
      r.onerror = () => ok(Object.assign(base, { guardado: false }));
      r.readAsDataURL(file);
    });
  };
  /** Imagem de capa reduzida para caber no armazenamento local. */
  P.lerImagem = function (file, lado) {
    return new Promise((ok) => {
      if (!file || !/^image\//.test(file.type || '') || typeof FileReader === 'undefined') return ok('');
      const r = new FileReader();
      r.onerror = () => ok('');
      r.onload = () => {
        const img = new Image();
        img.onerror = () => ok('');
        img.onload = () => {
          const max = lado || 960;
          const k = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          try { ok(c.toDataURL('image/jpeg', 0.82)); } catch (e) { ok(''); }
        };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  };
  P.tamanhoTexto = (b) => b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

  /* --------------------------------------------------------- confirmação
     Pergunta por cima do popup aberto, sem fechá-lo: o formulário que está
     sendo editado continua ali se a pessoa desistir. */
  WB.confirmarAcao = function (o) {
    return new Promise((resolver) => {
      const raiz = document.getElementById('modal-root') || document.body;
      const anterior = document.activeElement;
      const ov = document.createElement('div');
      ov.className = 'ov pd-confirm';
      ov.innerHTML = `<div class="pop pd-confirm__box" role="alertdialog" aria-modal="true" aria-labelledby="pd-confirm-t" aria-describedby="pd-confirm-d">
        <div class="pop__head"><span class="pop__title" id="pd-confirm-t">${esc(o.titulo)}</span></div>
        <div class="pop__body"><p id="pd-confirm-d" style="margin:0;font-size:14px;line-height:1.55">${esc(o.texto)}</p></div>
        <div class="pop__foot"><span class="grow"></span>
          <button class="btn" data-nao>${esc(o.cancelar || 'Cancelar')}</button>
          <button class="btn ${o.perigo ? 'btn--danger' : 'btn--primary'}" data-sim>${esc(o.confirmar || 'Confirmar')}</button>
        </div></div>`;
      raiz.appendChild(ov);
      const fim = (v) => { ov.remove(); if (anterior && anterior.focus) anterior.focus(); resolver(v); };
      ov.querySelector('[data-nao]').addEventListener('click', () => fim(false));
      ov.querySelector('[data-sim]').addEventListener('click', () => fim(true));
      ov.addEventListener('mousedown', (e) => { if (e.target === ov) fim(false); });
      ov.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.stopPropagation(); fim(false); }
        if (e.key === 'Tab') {
          const b = ov.querySelectorAll('button');
          if (e.shiftKey && document.activeElement === b[0]) { e.preventDefault(); b[b.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === b[b.length - 1]) { e.preventDefault(); b[0].focus(); }
        }
      });
      ov.querySelector('[data-sim]').focus();
    });
  };
})();
