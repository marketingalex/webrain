/* WeBrain — solicitações e cadastros em popup.
   Todo pedido registra automaticamente quem solicitou, abre em popup, mostra
   a confirmação final e entra no Histórico de solicitações em análise.

   Segunda remessa (22/09/2026, pedido do usuário):
   · saiu o quadro de regras que abria os três pedidos;
   · a confirmação não mostra mais o número do pedido — o pedido é chamado
     pelo nome — nem o bloco "o que ainda não aconteceu";
   · recursos, alimentação, comunicação, empresa e local aceitam item novo;
   · orçamento e valor são campos em real, formatados enquanto se digita;
   · a lista de participantes é um arquivo, não um texto;
   · o coffee separa "agora" (só o coffee da casa, 15 minutos) de "agendar"
     (premium e jantar), cada um com o seu responsável;
   · editar um pedido pergunta antes de salvar, porque ele volta para análise.
   As regras de fila, situação e notificação estão em pedidos.js. */
(function () {
  const WB = (window.WB = window.WB || {});
  const esc = WB.esc;
  const P = () => WB.pedidos || null;

  /* O número não pode repetir entre recargas: parte do maior número já em uso
     e de um contador guardado, e nunca anda para trás. Ele continua existindo
     como chave interna do pedido — só deixou de ser mostrado. */
  function novoId() {
    const maiorEmUso = (WB.data.solicitacoes || []).reduce((max, s) => {
      const m = /^SOL-(\d+)$/.exec(String(s && s.id || ''));
      return m ? Math.max(max, Number(m[1])) : max;
    }, 300);
    const proximo = Math.max(maiorEmUso, WB.store.get('solicitacoes.seq', 0)) + 1;
    WB.store.set('solicitacoes.seq', proximo);
    return 'SOL-' + String(proximo).padStart(4, '0');
  }
  WB.novoIdSolicitacao = novoId;

  /* ---------------------------------------------------------- duração prevista
     Só existem os horários de início e término. Término igual ou anterior ao
     início é lido como virada do dia — e isso é dito na tela, em vez de ficar
     implícito num número. */
  function duracaoPrevista(inicio, termino) {
    const minutos = (h) => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(String(h || '').trim());
      return m ? Number(m[1]) * 60 + Number(m[2]) : null;
    };
    const a = minutos(inicio), b = minutos(termino);
    if (a == null || b == null) return null;
    let total = b - a;
    const viraODia = total <= 0;
    if (viraODia) total += 24 * 60;
    const h = Math.floor(total / 60), min = total % 60;
    const texto = h && min ? `${h}h${String(min).padStart(2, '0')}`
      : h ? `${h}h`
      : `${min} min`;
    return { minutos: total, texto, viraODia };
  }
  WB.duracaoPrevista = duracaoPrevista;

  const dinheiro = (v) => (P() ? P().formatarMoeda(v) : WB.moeda(v));
  const lista = (v) => [].concat(v == null ? [] : v).filter((x) => String(x).trim()).join(', ');
  const nomePessoa = (id) => (id ? WB.pessoa(id).nome : '');
  const semVazios = (campos) => campos.filter((c) => String(c[1] == null ? '' : c[1]).trim());
  const secao = (titulo, campos) => ({ titulo, campos: semVazios(campos) });

  /* ---------------------------------------------- opções que aceitam item novo
     Caixinhas de seleção com as opções que já existem e um campo "adicionar
     outro" no fim. O item novo entra marcado e, quando a lista é uma das
     listas do portal (`chave`), fica gravado para os próximos pedidos. */
  function grupoAberto(o) {
    const marcados = [].concat(o.marcados || []).map(String);
    const base = o.lista || [];
    const itens = base.concat(marcados.filter((v) => v && base.indexOf(v) < 0));
    const tipo = o.tipo || 'checkbox';
    return `<div class="opts pd-opts"${o.obrigatorio ? ' data-grupo-obrigatorio' : ''} data-grupo-aberto data-nome="${esc(o.nome)}" data-tipo="${tipo}"${o.chave ? ` data-chave="${esc(o.chave)}"` : ''}>
      ${itens.map((v) => `<label class="opt"><input type="${tipo}" name="${esc(o.nome)}" value="${esc(v)}"${marcados.indexOf(String(v)) >= 0 ? ' checked' : ''}>${esc(v)}</label>`).join('')}
      <span class="pd-add"><input class="inp pd-add__inp" type="text" maxlength="80" placeholder="${esc(o.placeholder || 'Adicionar outro')}" aria-label="${esc(o.placeholder || 'Adicionar outra opção')}"><button type="button" class="btn btn--sm" data-add-opcao>${WB.icon('mais', 13)} Adicionar</button></span>
    </div>`;
  }

  /* Lista suspensa com "+ Adicionar novo…" no fim. */
  const NOVO = '__novo__';
  function selectAberto(o) {
    const id = 'f_' + Math.random().toString(36).slice(2, 8);
    const opcoes = (o.opcoes || []).slice();
    if (o.valor && opcoes.indexOf(o.valor) < 0) opcoes.push(o.valor);
    return `<div class="fld ${o.span2 ? 'span2' : ''}" data-select-aberto${o.chave ? ` data-chave="${esc(o.chave)}"` : ''}>
      <label for="${id}">${esc(o.rotulo)}${o.obrigatorio ? ' <span class="fld__req" aria-hidden="true">*</span>' : ''}</label>
      <select class="inp" id="${id}" name="${esc(o.nome)}"${o.obrigatorio ? ' required' : ''}>
        <option value="">${esc(o.placeholder || 'Selecione')}</option>
        ${opcoes.map((v) => `<option value="${esc(v)}"${o.valor === v ? ' selected' : ''}>${esc(v)}</option>`).join('')}
        <option value="${NOVO}">+ Adicionar novo…</option>
      </select>
      <span class="pd-add" hidden><input class="inp pd-add__inp" type="text" maxlength="80" placeholder="${esc(o.novoPlaceholder || 'Nome do novo item')}" aria-label="${esc(o.novoPlaceholder || 'Nome do novo item')}"><button type="button" class="btn btn--sm" data-add-select>Adicionar</button></span>
      ${o.ajuda ? `<span class="fld__help">${esc(o.ajuda)}</span>` : ''}
    </div>`;
  }

  function ligarAbertos(ov) {
    const gravar = (chave, v) => (chave && P() ? P().adicionarOpcao(chave, v) : v);
    ov.addEventListener('click', (e) => {
      const b = e.target.closest('[data-add-opcao]');
      if (b) {
        const g = b.closest('[data-grupo-aberto]');
        const inp = g.querySelector('.pd-add__inp');
        const v = gravar(g.dataset.chave, inp.value.replace(/\s+/g, ' ').trim());
        if (!v) { inp.focus(); return; }
        const existente = Array.prototype.find.call(g.querySelectorAll('input[name]'), (i) => i.value.toLowerCase() === v.toLowerCase());
        if (existente) existente.checked = true;
        else {
          const l = document.createElement('label');
          l.className = 'opt';
          l.innerHTML = `<input type="${g.dataset.tipo}" name="${esc(g.dataset.nome)}" value="${esc(v)}" checked>${esc(v)}`;
          g.insertBefore(l, b.closest('.pd-add'));
        }
        g.removeAttribute('aria-invalid');
        inp.value = '';
        return;
      }
      const s = e.target.closest('[data-add-select]');
      if (s) {
        const f = s.closest('[data-select-aberto]');
        const inp = f.querySelector('.pd-add__inp');
        const sel = f.querySelector('select');
        const v = gravar(f.dataset.chave, inp.value.replace(/\s+/g, ' ').trim());
        if (!v) { inp.focus(); return; }
        if (!Array.prototype.some.call(sel.options, (op) => op.value === v)) {
          const op = document.createElement('option');
          op.value = v; op.textContent = v;
          sel.insertBefore(op, sel.querySelector(`option[value="${NOVO}"]`));
        }
        sel.value = v;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        f.querySelector('.pd-add').hidden = true;
        inp.value = '';
        sel.focus();
      }
    });
    ov.addEventListener('change', (e) => {
      const sel = e.target.closest('[data-select-aberto] select');
      if (!sel || sel.value !== NOVO) return;
      sel.value = '';
      const add = sel.closest('[data-select-aberto]').querySelector('.pd-add');
      add.hidden = false;
      add.querySelector('input').focus();
    });
    // Enter no campo de item novo adiciona, em vez de tentar enviar o pedido.
    ov.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !e.target.classList || !e.target.classList.contains('pd-add__inp')) return;
      e.preventDefault();
      const b = e.target.parentElement.querySelector('button');
      if (b) b.click();
    });
  }

  /* Campo em real. O valor gravado é número; a tela mostra "R$ 1.234,56". */
  function campoMoeda(o) {
    const id = 'f_' + Math.random().toString(36).slice(2, 8);
    return `<div class="fld ${o.span2 ? 'span2' : ''}">
      <label for="${id}">${esc(o.rotulo)}${o.obrigatorio ? ' <span class="fld__req" aria-hidden="true">*</span>' : ''}</label>
      <input class="inp pd-moeda" id="${id}" name="${esc(o.nome)}" type="text" inputmode="numeric" autocomplete="off" placeholder="R$ 0,00" data-moeda value="${esc(o.valor == null ? '' : o.valor)}"${o.obrigatorio ? ' required' : ''}>
      ${o.ajuda ? `<span class="fld__help">${esc(o.ajuda)}</span>` : ''}
    </div>`;
  }
  const ligarMoedas = (ov) => ov.querySelectorAll('[data-moeda]').forEach((i) => P() && P().ligarMoeda(i));

  /* Preenche o formulário com um pedido já gravado, para editar. */
  function preencher(form, valores) {
    if (!valores) return;
    form.querySelectorAll('[name]').forEach((el) => {
      if (!(el.name in valores) || el.type === 'file') return;
      const v = valores[el.name];
      if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = [].concat(v).map(String).indexOf(el.value) >= 0;
      } else if (el.tagName === 'SELECT') {
        if (v && !Array.prototype.some.call(el.options, (op) => op.value === String(v))) {
          const op = document.createElement('option');
          op.value = v; op.textContent = v;
          el.insertBefore(op, el.querySelector(`option[value="${NOVO}"]`));
        }
        el.value = v == null ? '' : v;
      } else {
        el.value = v == null ? '' : v;
      }
    });
  }

  /* ---------------------------------------------------------- confirmação
     Pedido novo: grava em análise e mostra o que foi enviado e para quem.
     Pedido editado: pergunta antes, porque salvar devolve para análise. */
  function concluir(dados, edicao) {
    const p = P();
    if (!p) {
      // Sem o módulo de pedidos (testes antigos), grava do jeito simples.
      const reg = Object.assign({ id: novoId(), solicitante: WB.data.usuarioAtual, data: WB.d(0), status: 'em análise' }, dados);
      WB.data.solicitacoes.unshift(reg);
      WB.store.push('solicitacoes', reg);
      return Promise.resolve(true);
    }
    if (edicao) {
      return WB.confirmarAcao({
        titulo: 'Atualizar esta solicitação?',
        texto: 'Você realmente quer atualizar esta solicitação? Ao salvar, a situação volta para "Em análise" e o pedido vai de novo para aprovação.',
        confirmar: 'Salvar e reenviar'
      }).then((ok) => {
        if (!ok) return false;
        const s = p.atualizar(edicao.id, dados);
        if (!s) { WB.toast('Só quem fez o pedido pode editá-lo.', 'erro'); return false; }
        WB.fecharPopup();
        WB.toast('Solicitação atualizada. Ela voltou para análise.');
        if (WB.rerender) WB.rerender();
        if (WB.renderSidebar) WB.renderSidebar();
        return true;
      });
    }
    const reg = p.registrar(dados);
    if (WB.rerender) WB.rerender();
    if (WB.renderSidebar) WB.renderSidebar();
    const quem = p.aprovadores(reg).map(nomePessoa).filter(Boolean);
    WB.abrirPopup({
      tipo: 'Confirmação',
      titulo: 'Solicitação enviada',
      largo: true,
      corpo: `
        <div class="pd-ok">
          <div class="pd-ok__t">${esc(reg.titulo)}</div>
          ${p.selo(reg.status, true)}
        </div>
        <p class="muted" style="margin:10px 0 18px">Solicitado por ${esc(WB.eu().nome)} em ${esc(WB.fmtDataCurta(reg.data))}${quem.length ? ` · vai para aprovação de <strong>${esc(quem.join(', '))}</strong>` : ''}.</p>
        ${WB.pedidosDetalheSecoes ? WB.pedidosDetalheSecoes(reg) : ''}`,
      rodape: `<span class="grow"></span>
        <button class="btn" data-fechar>Fechar</button>
        <button class="btn btn--primary" data-ir>Ver no histórico</button>`
    }).querySelector('[data-ir]').addEventListener('click', () => {
      WB.fecharPopup();
      location.hash = '#/solicitacoes/' + reg.tipo;
    });
    WB.toast('Solicitação enviada para análise.');
    return Promise.resolve(true);
  }

  /* --------------------------------------------------- envio com trava dupla
     `aoEnviar` pode devolver promessa (arquivo sendo lido, confirmação
     aberta). `false` quer dizer "desistiu": o botão volta, sem aviso de erro. */
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
      const textoOriginal = btn.innerHTML;
      btn.innerHTML = '<i class="btn__spin"></i>Enviando…';
      const voltar = () => {
        btn.dataset.enviando = '';
        btn.removeAttribute('aria-disabled');
        btn.innerHTML = textoOriginal;
      };
      // O preenchimento nunca é descartado: só fechamos depois de dar certo.
      setTimeout(() => {
        Promise.resolve()
          .then(() => aoEnviar(WB.lerForm(form)))
          .then((r) => { if (r === false) voltar(); })
          .catch(() => {
            voltar();
            WB.toast('Não foi possível registrar. Seus dados continuam preenchidos — tente enviar de novo.', 'erro');
          });
      }, 320);
    });
  }

  const rodapeEnvio = (edicao) => `<span class="grow"></span>
    <button class="btn" data-fechar>Cancelar</button>
    <button class="btn btn--primary" data-enviar>${edicao ? 'Salvar alterações' : 'Enviar solicitação'}</button>`;

  /* =========================================================== SOLICITAR COMPRA */
  WB.abrirCompra = function (preset) {
    const edicao = preset && preset.editar ? preset.editar : null;
    const val = (edicao && edicao.valores) || {};
    const podeAnexar = WB.pode('comprovante');

    const corpo = `<form novalidate>
      <fieldset class="fset">
        <legend class="fset__legend"><span class="fset__n">1</span> Origem da despesa</legend>
        <div class="fgrid fgrid--2">
          ${selectAberto({ rotulo: 'Para qual empresa ou empreendimento é a despesa?', nome: 'empresa', obrigatorio: true, chave: 'empresasPedido', opcoes: WB.data.opcoes.empresasPedido, span2: true, novoPlaceholder: 'Nome da empresa ou do empreendimento' })}
        </div>
        <div class="fld" style="margin-top:16px">
          <label>Qual o motivo da compra? <span class="fld__req">*</span></label>
          <div class="opts" data-grupo-obrigatorio>${WB.opcoes('motivo', WB.data.opcoes.motivoCompra).replace(/^<div class="opts">|<\/div>$/g, '')}</div>
        </div>
        <div style="margin-top:16px">
          ${WB.campo({ rotulo: 'Descreva o que será comprado', nome: 'descricao', tipo: 'textarea', obrigatorio: true, placeholder: 'O que é, para que serve e por que agora.' })}
        </div>
      </fieldset>

      <fieldset class="fset">
        <legend class="fset__legend"><span class="fset__n">2</span> Dados da compra</legend>
        <div class="fgrid fgrid--2">
          ${campoMoeda({ rotulo: 'Valor total', nome: 'valor', obrigatorio: true })}
          ${WB.campo({ rotulo: 'Quantidade de parcelas', nome: 'parcelas', tipo: 'number', obrigatorio: true, min: 1, valor: '1' })}
          ${WB.campo({ rotulo: 'Data de vencimento', nome: 'vencimento', tipo: 'date', obrigatorio: true })}
          ${WB.campo({ rotulo: 'CNPJ ou CPF do fornecedor', nome: 'documento', placeholder: '00.000.000/0000-00', ajuda: 'Opcional.' })}
          ${WB.campo({ rotulo: 'Chave PIX', nome: 'pix', placeholder: 'Chave para pagamento', ajuda: 'Deixe em branco se o pagamento for por boleto.', span2: true })}
        </div>
      </fieldset>

      <fieldset class="fset">
        <legend class="fset__legend"><span class="fset__n">3</span> Comprovantes</legend>
        ${podeAnexar
          ? `<div class="fld">
               <label>Anexar documentos</label>
               <div class="opts">${WB.data.opcoes.anexosCompra.map((a) =>
                 `<label class="opt"><input type="checkbox" name="anexos" value="${esc(a)}">${esc(a)}</label>`).join('')}</div>
               <span class="fld__help">Marque o que você vai anexar. O envio de arquivo entra quando o armazenamento estiver conectado.</span>
             </div>`
          : `<div class="rule">
               <strong>Anexo restrito.</strong>
               <p style="margin:6px 0 0">Nota fiscal, cupom fiscal e boleto são anexados por administradores e heads. Envie o pedido normalmente — quem aprovar vai solicitar o documento se precisar.</p>
             </div>`}
      </fieldset>
    </form>`;

    const ov = WB.abrirPopup({
      tipo: edicao ? 'Editar solicitação' : 'Solicitação',
      titulo: 'Solicitar compra ou pagamento',
      largo: true,
      corpo,
      rodape: rodapeEnvio(edicao)
    });
    // Pedido antigo guardava "pagamento"; o campo agora é o vencimento.
    if (val.pagamento && !val.vencimento) val.vencimento = val.pagamento;
    preencher(ov.querySelector('form'), val);
    ligarAbertos(ov);
    ligarMoedas(ov);

    ligarEnvio(ov, (v) => {
      const valor = P() ? P().lerMoeda(v.valor) : Number(v.valor || 0);
      if (!(valor > 0)) { WB.toast('Informe o valor total da compra.', 'erro'); return false; }
      const anexos = [].concat(v.anexos || []).filter(Boolean);
      const valores = Object.assign({}, v, { valor, anexos });
      const parcelas = Number(v.parcelas || 1);
      return concluir({
        tipo: 'compra',
        titulo: 'Compra — ' + (v.descricao || '').slice(0, 60),
        resumo: `${dinheiro(valor)} ${parcelas > 1 ? `em ${parcelas}x` : 'à vista'} · ${v.empresa}`,
        valores,
        campos: [
          ['Empresa / empreendimento', v.empresa], ['Motivo', v.motivo], ['Descrição', v.descricao],
          ['Valor', dinheiro(valor)], ['Parcelas', parcelas + 'x'], ['Data de vencimento', WB.fmtDataCurta(v.vencimento)],
          ['Fornecedor', v.documento], ['Chave PIX', v.pix], ['Comprovantes marcados', anexos.join(', ')]
        ],
        secoes: secoesCompra(valores)
      }, edicao);
    });
  };

  function secoesCompra(v) {
    const parcelas = Number(v.parcelas || 1);
    return [
      secao('Origem da despesa', [['Empresa ou empreendimento', v.empresa], ['Motivo', v.motivo], ['O que será comprado', v.descricao]]),
      secao('Dados da compra', [
        ['Valor total', v.valor ? dinheiro(P() ? P().lerMoeda(v.valor) : v.valor) : ''],
        ['Parcelas', parcelas > 1 ? parcelas + 'x' : 'À vista'],
        ['Data de vencimento', (v.vencimento || v.pagamento) ? WB.fmtDataCurta(v.vencimento || v.pagamento) : ''],
        ['CNPJ ou CPF do fornecedor', v.documento], ['Chave PIX', v.pix]
      ]),
      secao('Comprovantes', [['Documentos marcados', lista(v.anexos)]])
    ].filter((s) => s.campos.length);
  }
  WB.secoesCompra = secoesCompra;

  /* ============================================================ SOLICITAR COFFE
     "Agora" e "agendar" são dois atendimentos, com responsáveis diferentes.
     · Agora: só o coffee da casa, que está sempre pronto — 15 minutos.
     · Agendar: coffee da casa, premium ou jantar.
     Coffee é pedido item por item, com a quantidade de cada um: quem atende
     recebe pronto o que tem de preparar. Jantar é servido igual para todos;
     o pedido diz as restrições e quais bebidas servir. */
  const QTD = 'qtd::';
  WB.abrirCoffe = function (preset) {
    const edicao = preset && preset.editar ? preset.editar : null;
    const val = Object.assign({}, (edicao && edicao.valores) || {});
    if (val.itens && typeof val.itens === 'object') Object.keys(val.itens).forEach((k) => { val[QTD + k] = val.itens[k]; });
    const p = P();

    const corpo = `<form novalidate>
      <fieldset class="fset">
        <legend class="fset__legend">Quando</legend>
        <div class="opts" data-grupo-obrigatorio data-quando>
          <label class="opt"><input type="radio" name="quando" value="imediato" checked>Agora</label>
          <label class="opt"><input type="radio" name="quando" value="agendar">Agendar</label>
        </div>
        <p class="fld__help" data-quem style="margin:10px 0 0"></p>
        <div class="fgrid fgrid--2" data-agendamento hidden style="margin-top:14px">
          ${WB.campo({ rotulo: 'Dia', nome: 'dia', tipo: 'date' })}
          ${WB.campo({ rotulo: 'Horário', nome: 'hora', tipo: 'time' })}
        </div>
      </fieldset>

      <fieldset class="fset">
        <legend class="fset__legend">Onde e para quantos</legend>
        <div class="fgrid fgrid--2">
          ${selectAberto({ rotulo: 'Local', nome: 'local', obrigatorio: true, chave: 'locais', placeholder: 'Selecione a sala', opcoes: WB.data.opcoes.locais, novoPlaceholder: 'Nome do local' })}
          ${WB.campo({ rotulo: 'Nº de participantes', nome: 'participantes', tipo: 'number', obrigatorio: true, min: 1, valor: '4' })}
        </div>
      </fieldset>

      <fieldset class="fset">
        <legend class="fset__legend">Cardápio</legend>
        <div class="stack" data-grupo-obrigatorio data-cardapios style="gap:8px"></div>
        <div data-menu style="margin-top:16px"></div>
      </fieldset>

      <fieldset class="fset" data-completo hidden>
        <legend class="fset__legend">Contexto</legend>
        <div class="fgrid fgrid--2">
          ${WB.campo({ rotulo: 'Qual a ocasião?', nome: 'ocasiao', tipo: 'select', placeholder: 'Selecione', opcoes: WB.data.opcoes.ocasiaoCoffe })}
          ${WB.campo({ rotulo: 'Responsável pelo pedido', nome: 'responsavel', tipo: 'select', opcoes: WB.data.pessoas.map((x) => ({ valor: x.nome, texto: x.nome + ' · ' + x.funcao })), valor: WB.eu().nome })}
        </div>
      </fieldset>
    </form>`;

    const ov = WB.abrirPopup({
      tipo: edicao ? 'Editar solicitação' : 'Solicitação',
      titulo: 'Solicitar coffee',
      largo: true,
      corpo,
      rodape: rodapeEnvio(edicao)
    });
    const form = ov.querySelector('form');
    const caixaCardapios = ov.querySelector('[data-cardapios]');
    const caixaMenu = ov.querySelector('[data-menu]');
    const completo = ov.querySelector('[data-completo]');
    const agenda = ov.querySelector('[data-agendamento]');
    const quem = ov.querySelector('[data-quem]');
    const agendado = () => (form.querySelector('[name="quando"]:checked') || {}).value === 'agendar';
    const opcoesDoMomento = () => (p ? p.cardapioPara(agendado() ? 'agendar' : 'agora') : []);

    function desenharCardapios(escolhido) {
      const ops = opcoesDoMomento();
      caixaCardapios.innerHTML = (agendado() ? '' : '<p class="fld__help" style="margin:0 0 4px">Para agora, só o que fica sempre pronto na casa — leva 15 minutos para preparar.</p>') +
        ops.map((c) => `<label class="menu-card">
          <input type="radio" name="cardapio" value="${esc(c.id)}"${c.id === escolhido ? ' checked' : ''}>
          <span><span class="menu-card__n">${esc(c.nome)}${c.preparo ? ` <span class="pd-tag">${esc(c.preparo)} min</span>` : ''}</span><span class="menu-card__d">${esc(c.descricao || '')}</span></span>
        </label>`).join('');
      if (ops.length === 1 && !escolhido) caixaCardapios.querySelector('input').checked = true;
    }

    function desenharMenu() {
      const marcado = form.querySelector('[name="cardapio"]:checked');
      const c = marcado && p ? p.opcaoCardapio(marcado.value) : null;
      if (!c) { caixaMenu.innerHTML = ''; return; }
      if (c.modo === 'pessoas') {
        caixaMenu.innerHTML = `<div class="pd-menu">
          <p class="pd-menu__nota">${WB.icon('info', 14)} O jantar é servido igual para todos os participantes. Informe só o que foge disso.</p>
          ${WB.campo({ rotulo: 'Restrições alimentares', nome: 'restricoes', tipo: 'textarea', placeholder: 'Ex.: 1 vegetariano, 2 sem glúten, 1 alérgico a camarão.' })}
          <div class="fld" style="margin-top:14px">
            <label>Bebidas que serão servidas <span class="fld__req">*</span></label>
            ${grupoAberto({ nome: 'bebidas', lista: c.bebidas || [], obrigatorio: true, placeholder: 'Outra bebida' })}
          </div>
        </div>`;
      } else {
        caixaMenu.innerHTML = `<div class="pd-menu">
          <p class="pd-menu__nota">${WB.icon('info', 14)} Diga quantos de cada item. Quem atende recebe a lista pronta para preparar.</p>
          ${(c.grupos || []).map((g) => `<div class="pd-menu__grupo">
            <div class="pd-menu__g">${esc(g.nome)}</div>
            ${(g.itens || []).map((it) => `<label class="pd-qtd"><span>${esc(it)}</span>
              <span class="pd-qtd__ctl"><button type="button" class="btn btn--sm btn--icon" data-qtd="-1" aria-label="Menos ${esc(it)}">−</button><input class="inp" type="number" min="0" max="999" step="1" name="${esc(QTD + it)}" value="0" aria-label="Quantidade de ${esc(it)}"><button type="button" class="btn btn--sm btn--icon" data-qtd="1" aria-label="Mais ${esc(it)}">+</button></span>
            </label>`).join('')}
          </div>`).join('')}
          ${WB.campo({ rotulo: 'Observações', nome: 'obsItens', tipo: 'textarea', linhas: 2, placeholder: 'Ex.: um café sem açúcar, chá de camomila.' })}
        </div>`;
      }
    }

    function sincronizarQuando() {
      const ag = agendado();
      completo.hidden = !ag;
      agenda.hidden = !ag;
      agenda.querySelectorAll('input').forEach((i) => { if (ag) i.setAttribute('required', ''); else { i.removeAttribute('required'); i.removeAttribute('aria-invalid'); } });
      const fila = ag ? 'coffe-agendado' : 'coffe-agora';
      const nomes = p ? p.responsaveisDaFila(fila).map(nomePessoa) : [];
      quem.innerHTML = nomes.length ? `${WB.icon('pessoa', 13)} Quem atende ${ag ? 'o coffee agendado' : 'o coffee para agora'}: <strong>${esc(nomes.join(', '))}</strong>` : '';
      const atual = (form.querySelector('[name="cardapio"]:checked') || {}).value;
      desenharCardapios(opcoesDoMomento().some((c) => c.id === atual) ? atual : '');
      desenharMenu();
    }

    ov.querySelectorAll('[data-quando] input').forEach((r) => r.addEventListener('change', sincronizarQuando));
    caixaCardapios.addEventListener('change', desenharMenu);
    caixaMenu.addEventListener('click', (e) => {
      const b = e.target.closest('[data-qtd]');
      if (!b) return;
      const i = b.parentElement.querySelector('input');
      i.value = Math.max(0, Math.min(999, (Number(i.value) || 0) + Number(b.dataset.qtd)));
    });

    // Na edição, o cardápio e o menu dependem do "quando": monto nessa ordem.
    if (val.quando) form.querySelectorAll('[name="quando"]').forEach((r) => { r.checked = r.value === val.quando; });
    sincronizarQuando();
    if (val.cardapio) { desenharCardapios(val.cardapio); desenharMenu(); }
    preencher(form, val);
    ligarAbertos(ov);

    ligarEnvio(ov, (v) => {
      const c = p ? p.opcaoCardapio(v.cardapio) : null;
      const itens = {};
      Object.keys(v).forEach((k) => {
        if (k.indexOf(QTD) === 0 && Number(v[k]) > 0) itens[k.slice(QTD.length)] = Number(v[k]);
      });
      if (c && c.modo !== 'pessoas' && !Object.keys(itens).length) {
        WB.toast('Diga a quantidade de pelo menos um item do cardápio.', 'erro');
        return false;
      }
      const valores = { quando: v.quando, dia: v.dia, hora: v.hora, local: v.local, participantes: v.participantes, cardapio: v.cardapio,
        itens, obsItens: v.obsItens, restricoes: v.restricoes, bebidas: [].concat(v.bebidas || []), ocasiao: v.ocasiao, responsavel: v.responsavel };
      const quando = v.quando === 'agendar' ? `${WB.fmtDataCurta(v.dia)} às ${v.hora || '—'}` : 'Agora';
      return concluir({
        tipo: 'coffe',
        titulo: 'Coffee — ' + (v.quando === 'agendar' ? (v.ocasiao || quando) : 'agora') + ' · ' + v.local,
        resumo: `${quando} · ${v.local} · ${v.participantes} pessoas · ${c ? c.nome : v.cardapio}`,
        valores,
        campos: [['Quando', quando], ['Local', v.local], ['Participantes', v.participantes], ['Cardápio', c ? c.nome : v.cardapio]],
        secoes: secoesCoffe(valores)
      }, edicao);
    });
  };

  function secoesCoffe(v) {
    const p = P();
    const c = p ? p.opcaoCardapio(v.cardapio) : null;
    const agendado = v.quando === 'agendar';
    const atende = p ? p.responsaveisDaFila(agendado ? 'coffe-agendado' : 'coffe-agora').map(nomePessoa).join(', ') : '';
    const itens = v.itens && typeof v.itens === 'object' ? Object.keys(v.itens).map((k) => `${v.itens[k]}× ${k}`).join(' · ') : '';
    return [
      secao('Quando e onde', [
        ['Quando', agendado ? `Agendado · ${WB.fmtDataCurta(v.dia)} às ${v.hora || '—'}` : 'Agora (pronto em 15 minutos)'],
        ['Local', v.local], ['Participantes', v.participantes], ['Quem atende', atende]
      ]),
      secao('Cardápio', [
        ['Opção', c ? c.nome : v.cardapio], ['Itens e quantidades', itens], ['Observações', v.obsItens],
        ['Restrições alimentares', v.restricoes], ['Bebidas', lista(v.bebidas)]
      ]),
      secao('Contexto', [['Ocasião', v.ocasiao], ['Responsável pelo pedido', v.responsavel]])
    ].filter((s) => s.campos.length);
  }
  WB.secoesCoffe = secoesCoffe;

  /* =========================================================== SOLICITAR EVENTO
     Briefing em sete blocos. Etapas navegáveis, sem perder o preenchimento ao
     voltar — os blocos ficam no mesmo formulário. */
  const BLOCOS = [
    { id: 1, nome: 'Identificação' },
    { id: 2, nome: 'Objetivo e descrição' },
    { id: 3, nome: 'Público e participantes' },
    { id: 4, nome: 'Orçamento e recursos' },
    { id: 5, nome: 'Gastronomia' },
    { id: 6, nome: 'Marketing' },
    { id: 7, nome: 'Demais informações' }
  ];
  const ACEITA_LISTA = '.pdf,.xls,.xlsx,.csv,.doc,.docx,.txt,.ods,.odt,image/*';

  /* Quem pode ser o responsável pelo evento: a fila de eventos. */
  function opcoesResponsavelEvento() {
    const ids = P() ? P().responsaveisDaFila('evento') : WB.data.pessoas.map((x) => x.id);
    return ids.map((id) => { const x = WB.pessoa(id); return { valor: id, texto: x.nome + (x.setor ? ' · ' + x.setor : '') }; });
  }

  WB.abrirEvento = function (preset) {
    const edicao = preset && preset.editar ? preset.editar : null;
    const val = (edicao && edicao.valores) || {};
    const o = WB.data.opcoes;
    const arquivoAtual = val.lista && typeof val.lista === 'object' ? val.lista : null;

    const bloco = (n, html) => `<fieldset class="fset" data-bloco="${n}"${n > 1 ? ' hidden' : ''}>
      <legend class="fset__legend"><span class="fset__n">${n}</span> ${esc(BLOCOS[n - 1].nome)}</legend>${html}</fieldset>`;

    const corpo = `<form novalidate>
      ${bloco(1, `<div class="fgrid fgrid--2">
        ${WB.campo({ rotulo: 'Nome do evento', nome: 'nome', obrigatorio: true, span2: true, placeholder: 'Como o evento será chamado' })}
        ${WB.campo({ rotulo: 'Descrição', nome: 'descricaoCurta', tipo: 'textarea', span2: true, placeholder: 'Uma frase que explica o evento para quem não participou da conversa.' })}
        ${WB.campo({ rotulo: 'Responsável pelo pedido', nome: 'responsavel', tipo: 'select', obrigatorio: true, opcoes: WB.data.pessoas.map((x) => ({ valor: x.nome, texto: x.nome + ' · ' + x.funcao })), valor: WB.eu().nome })}
        ${WB.campo({ rotulo: 'Responsável pelo evento', nome: 'responsavelEvento', tipo: 'select', obrigatorio: true, placeholder: 'Quem aprova e conduz', opcoes: opcoesResponsavelEvento(), ajuda: 'Com gastronomia, o Vinícius; de marketing, o Alex. É quem recebe o pedido para aprovar.' })}
        ${WB.campo({ rotulo: 'Data do evento', nome: 'data', tipo: 'date', obrigatorio: true, span2: true })}
        ${WB.campo({ rotulo: 'Início', nome: 'inicio', tipo: 'time', obrigatorio: true })}
        ${WB.campo({ rotulo: 'Término', nome: 'termino', tipo: 'time', obrigatorio: true })}
        <p class="span2 fld__help" data-duracao aria-live="polite" style="margin:-6px 0 0">Preencha início e término para ver a duração prevista.</p>
      </div>`)}

      ${bloco(2, `<div class="fld">
          <label>Tipo de evento <span class="fld__req">*</span></label>
          <div class="opts" data-grupo-obrigatorio>${o.tipoEvento.map((t) =>
            `<label class="opt"><input type="radio" name="tipo" value="${esc(t)}">${esc(t)}</label>`).join('')}</div>
        </div>
        <div class="fgrid" style="margin-top:16px">
          ${WB.campo({ rotulo: 'Objetivo do evento', nome: 'objetivo', tipo: 'textarea', obrigatorio: true, placeholder: 'Por que este evento existe e qual resultado se espera dele.' })}
          ${WB.campo({ rotulo: 'Como o evento vai acontecer', nome: 'dinamica', tipo: 'textarea', placeholder: 'Dinâmica, roteiro e momentos principais.' })}
        </div>`)}

      ${bloco(3, `<div class="fgrid fgrid--2">
        ${WB.campo({ rotulo: 'Nº de participantes', nome: 'participantes', tipo: 'number', obrigatorio: true, min: 1 })}
        ${WB.campo({ rotulo: 'Pessoas sentadas', nome: 'sentadas', tipo: 'number', min: 0, ajuda: 'Quantos lugares precisam existir.' })}
        ${WB.campo({ rotulo: 'Perfil do público', nome: 'perfil', tipo: 'textarea', span2: true, placeholder: 'Quem são: clientes, parceiros, imprensa, equipe.' })}
        <div class="fld span2">
          <label for="ev-lista">Lista de participantes</label>
          <input class="inp pd-file" id="ev-lista" type="file" name="listaArquivo" accept="${ACEITA_LISTA}">
          <span class="fld__help">${arquivoAtual ? `Arquivo atual: <strong>${esc(arquivoAtual.nome)}</strong>. Envie outro só se quiser trocar.` : 'Planilha, PDF ou documento com a lista. Até 700 KB fica guardado aqui; acima disso, só o nome.'}</span>
        </div>
      </div>`)}

      ${bloco(4, `<div class="fgrid fgrid--2">
          ${campoMoeda({ rotulo: 'Orçamento estipulado', nome: 'orcamento' })}
        </div>
        <div class="fld" style="margin-top:16px">
          <label>Recursos disponíveis no dia</label>
          ${grupoAberto({ nome: 'recursos', lista: o.recursosEvento, marcados: val.recursos, chave: 'recursosEvento', placeholder: 'Outro recurso' })}
        </div>`)}

      ${bloco(5, `<div class="fld">
          <label>Formato de alimentação <span class="fld__req">*</span></label>
          ${grupoAberto({ nome: 'alimentacao', tipo: 'radio', lista: o.formatoAlimentacao, marcados: val.alimentacao, chave: 'formatoAlimentacao', obrigatorio: true, placeholder: 'Outro formato' })}
        </div>
        <div class="fgrid" style="margin-top:16px">
          ${WB.campo({ rotulo: 'Cardápio desejado', nome: 'cardapio', tipo: 'textarea', placeholder: 'Pratos, bebidas e drinks de preferência.' })}
          ${WB.campo({ rotulo: 'Restrições alimentares e observações', nome: 'restricoes', tipo: 'textarea', placeholder: 'Alergias, intolerâncias, preferências.' })}
        </div>`)}

      ${bloco(6, `<div class="fld">
          <label>Necessidade de comunicação</label>
          ${grupoAberto({ nome: 'comunicacao', lista: o.comunicacao, marcados: val.comunicacao, chave: 'comunicacao', placeholder: 'Outra necessidade' })}
        </div>
        <div class="fgrid" style="margin-top:16px">
          ${WB.campo({ rotulo: 'Mensagem-chave e posicionamento', nome: 'mensagem', tipo: 'textarea', placeholder: 'O que este evento precisa comunicar sobre a marca.' })}
          ${WB.campo({ rotulo: 'Observações de divulgação', nome: 'divulgacao', tipo: 'textarea' })}
        </div>`)}

      ${bloco(7, `${WB.campo({ rotulo: 'Outras informações', nome: 'outras', tipo: 'textarea', linhas: 4, placeholder: 'Qualquer coisa que quem for executar precisa saber.' })}`)}
    </form>`;

    const ov = WB.abrirPopup({
      tipo: edicao ? 'Editar solicitação' : 'Solicitação',
      titulo: 'Solicitar evento',
      largo: true,
      acima: `<div class="steps" role="tablist" aria-label="Blocos do pedido">
          ${BLOCOS.map((b) => `<button type="button" class="step" data-passo="${b.id}"${b.id === 1 ? ' aria-current="step"' : ''}>
            <span class="step__n">${b.id}</span>${esc(b.nome)}</button>`).join('')}
        </div>`,
      corpo,
      rodape: `<button class="btn" data-voltar hidden>Voltar</button>
        <span class="grow"></span>
        <button class="btn" data-fechar>Cancelar</button>
        <button class="btn btn--primary" data-avancar>Avançar</button>
        <button class="btn btn--primary" data-enviar hidden>${edicao ? 'Salvar alterações' : 'Enviar solicitação'}</button>`
    });
    const form = ov.querySelector('form');
    preencher(form, Object.assign({}, val, { lista: undefined }));
    ligarAbertos(ov);
    ligarMoedas(ov);

    let passo = 1;
    const btnVoltar = ov.querySelector('[data-voltar]');
    const btnAvancar = ov.querySelector('[data-avancar]');
    const btnEnviar = ov.querySelector('[data-enviar]');

    function mostrar(n) {
      passo = n;
      ov.querySelectorAll('[data-bloco]').forEach((b) => { b.hidden = Number(b.dataset.bloco) !== n; });
      ov.querySelectorAll('[data-passo]').forEach((s) => {
        const i = Number(s.dataset.passo);
        s.classList.toggle('step--done', i < n);
        if (i === n) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
      });
      btnVoltar.hidden = n === 1;
      // Na edição, salvar vale de qualquer bloco: ninguém precisa andar os sete.
      btnAvancar.hidden = n === BLOCOS.length;
      btnEnviar.hidden = !edicao && n !== BLOCOS.length;
      ov.querySelector('.pop__body').scrollTop = 0;
    }

    mostrar(1); // acerta a visibilidade dos botões antes da primeira interação

    // Duração prevista: calculada de verdade e atualizada enquanto se digita.
    const saidaDuracao = ov.querySelector('[data-duracao]');
    function mostrarDuracao() {
      const d = duracaoPrevista(ov.querySelector('[name="inicio"]').value, ov.querySelector('[name="termino"]').value);
      saidaDuracao.textContent = !d ? 'Preencha início e término para ver a duração prevista.'
        : d.viraODia ? `Duração prevista: ${d.texto} — termina no dia seguinte.`
        : `Duração prevista: ${d.texto}.`;
    }
    ov.querySelectorAll('[name="inicio"], [name="termino"]').forEach((c) => c.addEventListener('input', mostrarDuracao));
    mostrarDuracao();

    // Faltou campo obrigatório num bloco fechado? Abrir o bloco antes do aviso,
    // senão o foco vai para um campo que a pessoa não consegue ver.
    btnEnviar.addEventListener('click', () => {
      const vazio = Array.prototype.filter.call(ov.querySelectorAll('form [required]'), (el) => !String(el.value || '').trim())[0];
      const semEscolha = Array.prototype.filter.call(ov.querySelectorAll('[data-grupo-obrigatorio]'), (g) => !g.querySelector('input:checked'))[0];
      const alvo = vazio || semEscolha;
      const bloco = alvo && alvo.closest('[data-bloco]');
      if (bloco && Number(bloco.dataset.bloco) !== passo) mostrar(Number(bloco.dataset.bloco));
    }, true);

    // Navegar entre blocos nunca apaga nada: tudo vive no mesmo formulário.
    btnAvancar.addEventListener('click', () => mostrar(Math.min(passo + 1, BLOCOS.length)));
    btnVoltar.addEventListener('click', () => mostrar(Math.max(passo - 1, 1)));
    ov.querySelectorAll('[data-passo]').forEach((s) => s.addEventListener('click', () => mostrar(Number(s.dataset.passo))));

    ligarEnvio(ov, (v) => {
      const campoArquivo = form.querySelector('[name="listaArquivo"]');
      const arquivo = campoArquivo && campoArquivo.files && campoArquivo.files[0];
      const ler = arquivo && P() ? P().lerArquivo(arquivo) : Promise.resolve(arquivoAtual);
      return ler.then((listaArq) => {
        const valores = Object.assign({}, v, {
          listaArquivo: undefined,
          lista: listaArq || null,
          orcamento: P() ? P().lerMoeda(v.orcamento) : v.orcamento,
          recursos: [].concat(v.recursos || []),
          comunicacao: [].concat(v.comunicacao || [])
        });
        if (arquivo && listaArq && !listaArq.guardado) WB.toast('A lista é maior que 700 KB: ficou registrado só o nome do arquivo.', 'erro');
        return concluir({
          tipo: 'evento',
          titulo: v.nome,
          responsavel: v.responsavelEvento,
          resumo: `${WB.fmtDataCurta(v.data)} · ${v.participantes} participantes · ${v.alimentacao}`,
          valores,
          campos: camposEvento(valores),
          secoes: secoesEvento(valores)
        }, edicao);
      });
    });
  };

  const textoLista = (l) => (l && typeof l === 'object') ? `${l.nome}${l.tamanho ? ' · ' + (P() ? P().tamanhoTexto(l.tamanho) : '') : ''}` : (l || '');
  function horarioEvento(v) {
    const d = duracaoPrevista(v.inicio, v.termino);
    return (v.inicio && v.termino)
      ? `${v.inicio} às ${v.termino}${d ? ` · ${d.texto}${d.viraODia ? ' (termina no dia seguinte)' : ''}` : ''}`
      : '';
  }

  /* Sete blocos são preenchidos; sete blocos são gravados. Nada do briefing
     pode morrer no envio — quem executa lê exatamente o que foi escrito.
     Campos opcionais em branco simplesmente não entram na lista. */
  function camposEvento(v) {
    return semVazios([
      ['Evento', v.nome],
      ['Descrição curta', v.descricaoCurta],
      ['Data', WB.fmtDataCurta(v.data)],
      ['Horário', horarioEvento(v)],
      ['Tipo', v.tipo],
      ['Objetivo', v.objetivo],
      ['Como vai acontecer', v.dinamica],
      ['Participantes', v.participantes + (v.sentadas ? ` · ${v.sentadas} sentados` : '')],
      ['Perfil do público', v.perfil],
      ['Lista de participantes', textoLista(v.lista)],
      ['Orçamento', Number(v.orcamento) ? dinheiro(v.orcamento) : ''],
      ['Recursos', lista(v.recursos)],
      ['Alimentação', v.alimentacao],
      ['Cardápio desejado', v.cardapio],
      ['Restrições alimentares', v.restricoes],
      ['Comunicação', lista(v.comunicacao)],
      ['Mensagem-chave', v.mensagem],
      ['Divulgação', v.divulgacao],
      ['Outras informações', v.outras],
      ['Responsável pelo pedido', v.responsavel],
      ['Responsável pelo evento', nomePessoa(v.responsavelEvento)]
    ]);
  }
  WB.camposEvento = camposEvento;

  /* Os mesmos campos, separados pelos sete blocos do pedido — é assim que o
     detalhe mostra o evento. */
  function secoesEvento(v) {
    return [
      secao('Identificação', [['Nome do evento', v.nome], ['Descrição', v.descricaoCurta], ['Responsável pelo pedido', v.responsavel],
        ['Responsável pelo evento', nomePessoa(v.responsavelEvento)], ['Data do evento', v.data ? WB.fmtDataCurta(v.data) : ''], ['Horário', horarioEvento(v)]]),
      secao('Objetivo e descrição', [['Tipo de evento', v.tipo], ['Objetivo', v.objetivo], ['Como vai acontecer', v.dinamica]]),
      secao('Público e participantes', [['Nº de participantes', v.participantes], ['Pessoas sentadas', v.sentadas], ['Perfil do público', v.perfil], ['Lista de participantes', textoLista(v.lista)]]),
      secao('Orçamento e recursos', [['Orçamento estipulado', Number(v.orcamento) ? dinheiro(v.orcamento) : ''], ['Recursos', lista(v.recursos)]]),
      secao('Gastronomia', [['Formato de alimentação', v.alimentacao], ['Cardápio desejado', v.cardapio], ['Restrições e observações', v.restricoes]]),
      secao('Marketing', [['Necessidade de comunicação', lista(v.comunicacao)], ['Mensagem-chave', v.mensagem], ['Divulgação', v.divulgacao]]),
      secao('Demais informações', [['Outras informações', v.outras]])
    ].filter((s) => s.campos.length);
  }
  WB.secoesEvento = secoesEvento;

  /* Detalhe de qualquer pedido, por seção. Pedido gravado antes desta rodada
     não tem `secoes`: monto a partir dos valores, ou caio na lista plana. */
  WB.secoesDoPedido = function (s) {
    if (!s) return [];
    if (s.valores && Object.keys(s.valores).length) {
      if (s.tipo === 'evento') return secoesEvento(s.valores);
      if (s.tipo === 'compra') return secoesCompra(s.valores);
      if (s.tipo === 'coffe') return secoesCoffe(s.valores);
    }
    if (Array.isArray(s.secoes) && s.secoes.length) return s.secoes;
    if (Array.isArray(s.campos) && s.campos.length) return [secao('Pedido', s.campos)];
    return [secao('Pedido', [['Resumo', s.resumo]])];
  };

  /* ============================================================ NOVA DEMANDA */
  WB.abrirDemanda = function (preset) {
    const p = preset || {};
    const corpo = `<form novalidate>
      <div class="fgrid fgrid--2">
        ${WB.campo({ rotulo: 'Projeto', nome: 'projeto', tipo: 'select', obrigatorio: true, placeholder: 'Selecione o projeto', valor: p.projeto, opcoes: WB.data.projetos.map((x) => ({ valor: x.id, texto: x.nome })) })}
        ${WB.campo({ rotulo: 'Nome da demanda', nome: 'nome', obrigatorio: true, placeholder: 'O que precisa ser feito' })}
      </div>

      <div class="fld" style="margin-top:16px">
        <label>Tipo <span class="fld__req">*</span></label>
        <div class="stack" data-grupo-obrigatorio style="gap:8px">
          ${WB.data.opcoes.tipoDemanda.map((t) => `<label class="menu-card">
            <input type="radio" name="tipo" value="${esc(t.id)}"${p.tipo === t.id ? ' checked' : ''}>
            <span><span class="menu-card__n">${esc(t.nome)}</span><span class="menu-card__d">${esc(t.ajuda)}</span></span>
          </label>`).join('')}
        </div>
      </div>

      <div style="margin-top:16px">
        ${WB.campo({ rotulo: 'Descrição, orientações e referências', nome: 'descricao', tipo: 'textarea', linhas: 4, placeholder: 'Contexto, o que já existe, links de referência e o que caracteriza pronto.' })}
      </div>

      <div class="fgrid fgrid--3" style="margin-top:16px">
        ${WB.campo({ rotulo: 'Responsável', nome: 'responsavel', tipo: 'select', obrigatorio: true, placeholder: 'Selecione', opcoes: WB.data.pessoas.map((x) => ({ valor: x.id, texto: x.nome })) })}
        ${WB.campo({ rotulo: 'Prazo', nome: 'prazo', tipo: 'date', obrigatorio: true })}
        ${WB.campo({ rotulo: 'Prioridade', nome: 'prioridade', tipo: 'select', obrigatorio: true, opcoes: [{ valor: 'alta', texto: 'Alta' }, { valor: 'media', texto: 'Média' }, { valor: 'baixa', texto: 'Baixa' }], valor: 'media' })}
      </div>

      <div class="fld" style="margin-top:16px">
        <label>Adicionar ao pedido</label>
        <div class="opts">
          <label class="opt"><input type="checkbox" name="extras" value="PDI">Vincular ao PDI</label>
          <label class="opt"><input type="checkbox" name="extras" value="Descritivo de cargo">Vincular ao descritivo de cargo</label>
        </div>
        <span class="fld__help">Usado quando a demanda também vale como desenvolvimento da pessoa.</span>
      </div>
    </form>`;

    const ov = WB.abrirPopup({
      tipo: 'Demanda',
      titulo: 'Adicionar demanda',
      largo: true,
      corpo,
      rodape: `<span class="grow"></span>
        <button class="btn" data-fechar>Cancelar</button>
        <button class="btn btn--primary" data-enviar>Criar demanda</button>`
    });

    ligarEnvio(ov, (v) => {
      const nova = {
        id: 'dm' + Date.now().toString(36),
        nome: v.nome,
        projeto: v.projeto,
        tipo: v.tipo,
        responsavel: v.responsavel,
        prazo: v.prazo,
        prioridade: v.prioridade,
        status: 'afazer',
        sprint: (WB.sprintAtual() || {}).id,
        descricao: v.descricao,
        extras: [].concat(v.extras || [])
      };
      WB.data.demandas.unshift(nova);
      WB.store.push('demandas', nova);
      WB.fecharPopup();
      WB.toast('Demanda criada e atribuída a ' + WB.pessoa(v.responsavel).nome + '.');
      if (WB.rerender) WB.rerender();
    });
  };

  /* ================================================== LEAD, CLIENTE, PROJETO */
  function cadastroSimples(cfg) {
    const ov = WB.abrirPopup({
      tipo: cfg.tipo,
      titulo: cfg.titulo,
      corpo: `<form novalidate><div class="fgrid fgrid--2">${cfg.campos.map(WB.campo).join('')}</div></form>`,
      rodape: `<span class="grow"></span>
        <button class="btn" data-fechar>Cancelar</button>
        <button class="btn btn--primary" data-enviar>${esc(cfg.acao)}</button>`
    });
    ligarEnvio(ov, (v) => { cfg.aoSalvar(v); WB.fecharPopup(); });
  }

  WB.abrirLead = function () {
    cadastroSimples({
      tipo: 'Comercial', titulo: 'Registrar novo lead', acao: 'Registrar lead',
      campos: [
        { rotulo: 'Nome', nome: 'nome', obrigatorio: true },
        { rotulo: 'Telefone', nome: 'telefone', obrigatorio: true, placeholder: '(45) 90000-0000' },
        { rotulo: 'Produto de interesse', nome: 'produto', tipo: 'select', obrigatorio: true, placeholder: 'Selecione', opcoes: ['Bioma', 'Vicente by We', 'WeInvest', 'Nós Gastronomia', 'CasaWE'] },
        { rotulo: 'Origem', nome: 'origem', tipo: 'select', obrigatorio: true, placeholder: 'Selecione', opcoes: ['Meta Ads', 'Corretor parceiro', 'Indicação', 'Portal imobiliário', 'Prospecção ativa', 'Outro'] },
        { rotulo: 'Observações', nome: 'obs', tipo: 'textarea', span2: true }
      ],
      aoSalvar: (v) => {
        const novo = { id: 'c' + Date.now().toString(36), nome: v.nome, tipo: 'lead', empresa: 'weinc', produto: v.produto, origem: v.origem, valor: 0, etapa: 'Qualificação', responsavel: WB.data.usuarioAtual, desde: WB.d(0), telefone: v.telefone };
        WB.data.clientes.unshift(novo);
        WB.store.push('clientes', novo);
        WB.toast('Lead registrado e atribuído a você.');
        if (WB.rerender) WB.rerender();
      }
    });
  };

  WB.abrirCliente = function () {
    cadastroSimples({
      tipo: 'Comercial', titulo: 'Registrar novo cliente', acao: 'Registrar cliente',
      campos: [
        { rotulo: 'Nome ou razão social', nome: 'nome', obrigatorio: true },
        { rotulo: 'Telefone', nome: 'telefone', obrigatorio: true },
        { rotulo: 'Empresa do grupo', nome: 'empresa', tipo: 'select', obrigatorio: true, placeholder: 'Selecione', opcoes: WB.data.empresas.map((e) => ({ valor: e.id, texto: e.nome })) },
        { rotulo: 'Produto contratado', nome: 'produto', obrigatorio: true },
        { rotulo: 'Valor do contrato (R$)', nome: 'valor', tipo: 'number', min: 0 },
        { rotulo: 'Etapa', nome: 'etapa', tipo: 'select', opcoes: ['Contrato assinado', 'Ativo', 'Recorrente'], obrigatorio: true }
      ],
      aoSalvar: (v) => {
        const novo = { id: 'c' + Date.now().toString(36), nome: v.nome, tipo: 'cliente', empresa: v.empresa, produto: v.produto, origem: 'Cadastro direto', valor: Number(v.valor || 0), etapa: v.etapa, responsavel: WB.data.usuarioAtual, desde: WB.d(0), telefone: v.telefone };
        WB.data.clientes.unshift(novo);
        WB.store.push('clientes', novo);
        WB.toast('Cliente registrado.');
        if (WB.rerender) WB.rerender();
      }
    });
  };

  WB.abrirProjeto = function () {
    cadastroSimples({
      tipo: 'Projeto', titulo: 'Novo projeto', acao: 'Criar projeto',
      campos: [
        { rotulo: 'Nome do projeto', nome: 'nome', obrigatorio: true, span2: true },
        { rotulo: 'Empresa', nome: 'empresa', tipo: 'select', obrigatorio: true, placeholder: 'Selecione', opcoes: WB.data.empresas.map((e) => ({ valor: e.id, texto: e.nome })) },
        { rotulo: 'Responsável', nome: 'responsavel', tipo: 'select', obrigatorio: true, placeholder: 'Selecione', opcoes: WB.data.pessoas.map((p) => ({ valor: p.id, texto: p.nome })) },
        { rotulo: 'Início', nome: 'inicio', tipo: 'date', obrigatorio: true },
        { rotulo: 'Término previsto', nome: 'fim', tipo: 'date', obrigatorio: true },
        { rotulo: 'Resumo', nome: 'resumo', tipo: 'textarea', span2: true, obrigatorio: true, placeholder: 'Em uma frase: o que este projeto entrega.' }
      ],
      aoSalvar: (v) => {
        const novo = {
          id: 'p' + Date.now().toString(36), nome: v.nome, empresa: v.empresa, empreendimento: '—',
          status: 'ativo', responsavel: v.responsavel, inicio: v.inicio, fim: v.fim, progresso: 0,
          resumo: v.resumo,
          briefing: { contexto: '', objetivo: '', escopoIncluso: [], escopoExcluso: [], premissas: [], restricoes: [], patrocinador: v.responsavel, gerente: v.responsavel, criterios: '' },
          marcos: [], documentos: [], decisoes: [], riscos: []
        };
        WB.data.projetos.unshift(novo);
        WB.store.push('projetos', novo);
        WB.toast('Projeto criado. Comece pelo briefing.');
        location.hash = '#/projeto/' + novo.id;
      }
    });
  };

  WB.abrirAtalho = function () {
    cadastroSimples({
      tipo: 'Atalho', titulo: 'Adicionar atalho', acao: 'Adicionar',
      campos: [
        { rotulo: 'Nome', nome: 'nome', obrigatorio: true, placeholder: 'Como você chama isso' },
        { rotulo: 'Endereço', nome: 'url', obrigatorio: true, placeholder: 'https://' }
      ],
      aoSalvar: (v) => {
        WB.data.atalhos.push({ nome: v.nome, url: v.url, icone: 'link' });
        WB.store.set('atalhos', WB.data.atalhos);
        WB.toast('Atalho adicionado.');
        if (WB.rerender) WB.rerender();
      }
    });
  };

  /* ============================================== PDI e descritivo de cargo
     Configuração individual, feita por quem administra (22/09/2026). Os dois
     registros aparecem como atalho na aba de indicadores da pessoa — é
     material de consulta dela, não documento do portal, por isso o portal
     guarda o endereço e não o arquivo.

     Apagar é deixar o endereço em branco: some o atalho, sem caixa de
     confirmação para uma coisa que se refaz colando o link de novo. */
  WB.abrirDesenvolvimento = function (pessoaId) {
    if (!WB.pode('desenvolvimento')) { WB.toast('Só a administração configura PDI e descritivo de cargo.', 'erro'); return; }
    const alvo = WB.pessoa(pessoaId || WB.data.usuarioAtual);
    if (!alvo.id) { WB.toast('Pessoa não encontrada.', 'erro'); return; }
    const pdi = alvo.pdi || {}, cargo = alvo.descritivoCargo || {};
    const rotulo = (p) => p.nome + ' — ' + p.funcao;

    const ov = WB.abrirPopup({
      tipo: 'Desenvolvimento',
      titulo: 'PDI e descritivo de cargo',
      corpo: `<form novalidate>
        <p class="muted" style="margin:0 0 14px">Escolha a pessoa e informe onde cada documento está. O portal guarda o endereço; o arquivo continua onde já mora.</p>
        <div class="fgrid fgrid--2">
          ${WB.campo({ rotulo: 'Pessoa', nome: 'pessoa', tipo: 'select', obrigatorio: true, span2: true, opcoes: WB.data.pessoas.map(rotulo), valor: rotulo(alvo) })}
          ${WB.campo({ rotulo: 'Título do PDI', nome: 'pdiTitulo', valor: pdi.titulo || '', placeholder: 'PDI 2026' })}
          ${WB.campo({ rotulo: 'Endereço do PDI', nome: 'pdiUrl', valor: pdi.url || '', placeholder: 'https://  (em branco remove o atalho)' })}
          ${WB.campo({ rotulo: 'Título do descritivo', nome: 'cargoTitulo', valor: cargo.titulo || '', placeholder: 'Descritivo — Analista Comercial' })}
          ${WB.campo({ rotulo: 'Endereço do descritivo', nome: 'cargoUrl', valor: cargo.url || '', placeholder: 'https://  (em branco remove o atalho)' })}
        </div>
      </form>`,
      rodape: `<span class="grow"></span>
        <button class="btn" data-fechar>Cancelar</button>
        <button class="btn btn--primary" data-enviar>Salvar configuração</button>`
    });

    ligarEnvio(ov, (v) => {
      const escolhida = WB.data.pessoas.find((p) => rotulo(p) === v.pessoa) || alvo;
      /* Endereço que não começa com http(s) viraria um atalho que não abre —
         ou, pior, um `javascript:` clicável. O portal recusa e mantém o
         formulário preenchido, em vez de guardar um link quebrado. */
      const limpar = (url) => String(url || '').trim();
      const aceito = (url) => !url || /^https?:\/\//i.test(url);
      const pdiUrl = limpar(v.pdiUrl), cargoUrl = limpar(v.cargoUrl);
      if (!aceito(pdiUrl) || !aceito(cargoUrl)) {
        WB.toast('O endereço precisa começar com http:// ou https://', 'erro');
        return false;
      }
      const hoje = WB.d(0);
      WB.desenvolvimento.salvar(escolhida.id, {
        pdi: pdiUrl ? { titulo: limpar(v.pdiTitulo) || 'PDI', url: pdiUrl, atualizado: hoje, autor: WB.data.usuarioAtual } : null,
        descritivoCargo: cargoUrl ? { titulo: limpar(v.cargoTitulo) || 'Descritivo do cargo', url: cargoUrl, atualizado: hoje, autor: WB.data.usuarioAtual } : null
      });
      if (escolhida.id !== WB.data.usuarioAtual) {
        WB.notificar(escolhida.id, WB.eu().nome + ' atualizou seu PDI e descritivo de cargo.', '#/indicadores');
      }
      WB.toast('Configuração salva para ' + escolhida.nome + '.');
      WB.fecharPopup();
      if (WB.rerender) WB.rerender();
    });
  };
  /* ==================================================================== NEWS
     Admin e heads publicam (22/09/2026). Quem publica escolhe para quem a
     news aparece: o grupo inteiro ou só quem tem acesso a uma empresa. Data e
     autor entram sozinhos. A imagem é enviada do computador, reduzida para
     caber no armazenamento local. Fixar no topo e apagar news de outra pessoa
     é só da administração; quem publicou pode apagar a própria. */
  WB.publicosNews = () => [{ valor: 'Todos', texto: 'Todo o Grupo We' }]
    .concat(WB.data.empresas.map((e) => ({ valor: e.id, texto: 'Só ' + e.nome })));
  WB.publicoNewsTexto = (publico) => {
    if (!publico || publico === 'Todos') return 'Todo o Grupo We';
    const e = WB.data.empresas.find((x) => x.id === publico);
    return e ? e.nome : publico;
  };
  const salvarNews = () => WB.store.set('home.news', WB.data.news);

  WB.abrirNews = function () {
    if (!WB.pode('news')) {
      WB.toast('Publicar news é permitido a administradores e heads.', 'erro');
      return;
    }
    const eu = WB.eu();
    const podeFixar = WB.pode('destaque');
    const ov = WB.abrirPopup({
      tipo: 'News We',
      titulo: 'Publicar news',
      largo: true,
      corpo: `<form novalidate>
        <p class="pd-auto">${WB.icon('pessoa', 14)} Publicado por <strong>${esc(eu.nome)}</strong> · ${esc(WB.fmtDataLonga(WB.d(0)))}</p>
        <div class="fgrid fgrid--2">
          ${WB.campo({ rotulo: 'Título', nome: 'titulo', obrigatorio: true, span2: true })}
          ${WB.campo({ rotulo: 'Descritivo', nome: 'corpo', tipo: 'textarea', obrigatorio: true, span2: true, linhas: 5, placeholder: 'Escreva direto: o que mudou e o que a pessoa precisa fazer.' })}
          ${WB.campo({ rotulo: 'Para quem vai aparecer', nome: 'publico', tipo: 'select', obrigatorio: true, opcoes: WB.publicosNews(), valor: 'Todos', ajuda: 'Escolhendo uma empresa, só quem tem acesso a ela vê a news.' })}
          ${podeFixar ? WB.campo({ rotulo: 'Fixar no topo', nome: 'fixado', tipo: 'select', opcoes: [{ valor: 'nao', texto: 'Não' }, { valor: 'sim', texto: 'Sim' }] }) : '<span></span>'}
          <div class="fld span2">
            <label for="news-img">Imagem</label>
            <input class="inp pd-file" id="news-img" type="file" name="imagem" accept="image/*">
            <span class="fld__help">Opcional. Sem imagem, a galeria desenha uma capa com a cor da news.</span>
            <img data-previa alt="" hidden class="pd-previa">
          </div>
        </div>
      </form>`,
      rodape: `<span class="grow"></span>
        <button class="btn" data-fechar>Cancelar</button>
        <button class="btn btn--primary" data-enviar>Publicar</button>`
    });
    const campoImg = ov.querySelector('[name="imagem"]');
    const previa = ov.querySelector('[data-previa]');
    let capa = '';
    campoImg.addEventListener('change', () => {
      const f = campoImg.files && campoImg.files[0];
      if (!f) { capa = ''; previa.hidden = true; return; }
      WB.pedidos.lerImagem(f, 960).then((url) => {
        capa = url;
        previa.hidden = !url;
        if (url) previa.src = url;
        else WB.toast('Não foi possível ler esta imagem.', 'erro');
      });
    });
    ligarEnvio(ov, (v) => {
      // `publicadoEm` guarda a hora: a data sozinha não permite contar 24h
      // para marcar a news como nova.
      const novo = { id: 'n' + Date.now().toString(36), titulo: v.titulo, corpo: v.corpo, autor: WB.data.usuarioAtual, data: WB.d(0), publicadoEm: new Date().toISOString(), fixado: podeFixar && v.fixado === 'sim', publico: v.publico || 'Todos', capa };
      WB.data.news.unshift(novo);
      salvarNews();
      WB.fecharPopup();
      WB.toast('News publicada para ' + WB.publicoNewsTexto(novo.publico) + '.');
      if (WB.rerender) WB.rerender();
    });
  };

  WB.podeApagarNews = (n) => !!n && (WB.pode('gerirNews') || (WB.pode('news') && n.autor === WB.data.usuarioAtual));

  WB.apagarNews = function (n) {
    if (!WB.podeApagarNews(n)) return WB.toast('Só a administração ou quem publicou pode apagar esta news.', 'erro');
    WB.confirmarAcao({ titulo: 'Apagar esta news?', texto: `"${n.titulo}" sai do Início de todo mundo que a vê. Não dá para desfazer.`, confirmar: 'Apagar', perigo: true })
      .then((ok) => {
        if (!ok) return;
        const i = WB.data.news.findIndex((x) => x.id === n.id);
        if (i >= 0) WB.data.news.splice(i, 1);
        salvarNews();
        WB.toast('News apagada.');
        if (WB.rerender) WB.rerender();
      });
  };

  WB.fixarNews = function (n) {
    if (!n || !WB.pode('destaque')) return WB.toast('Só a administração fixa news no topo.', 'erro');
    const alvo = WB.data.news.find((x) => x.id === n.id);
    if (!alvo) return;
    alvo.fixado = !alvo.fixado;
    salvarNews();
    WB.toast(alvo.fixado ? 'News fixada no topo.' : 'News desafixada.');
    if (WB.rerender) WB.rerender();
  };

  /* ============================================ POLÍTICAS EM DESTAQUE NO INÍCIO
     A administração escolhe o que fica fixado. O atalho "Ver todas" continua
     levando para a tela completa. */
  WB.politicasDestaque = function () {
    const docs = (WB.data.governanca && WB.data.governanca.documentos) || [];
    const escolhidas = WB.data.politicasDestaque;
    if (Array.isArray(escolhidas)) return escolhidas.map((nome) => docs.find((d) => d.nome === nome)).filter(Boolean);
    return docs.filter((d) => d.categoria === 'Políticas').slice(0, 6);
  };

  WB.editarPoliticasDestaque = function () {
    if (!WB.pode('destaque')) return WB.toast('Só a administração escolhe as políticas em destaque.', 'erro');
    const docs = (WB.data.governanca && WB.data.governanca.documentos) || [];
    const atuais = WB.politicasDestaque().map((d) => d.nome);
    const categorias = docs.reduce((m, d) => { (m[d.categoria] = m[d.categoria] || []).push(d); return m; }, {});
    const ov = WB.abrirPopup({
      tipo: 'Início',
      titulo: 'Políticas em destaque',
      largo: true,
      corpo: `<form novalidate>
        <p class="muted" style="margin:0 0 14px">Marque o que aparece fixado no Início, na ordem da lista. Desmarque para tirar.</p>
        ${Object.keys(categorias).map((cat) => `<div class="fld" style="margin-bottom:14px">
          <label>${esc(cat)}</label>
          <div class="opts">${categorias[cat].map((d) => `<label class="opt"><input type="checkbox" name="doc" value="${esc(d.nome)}"${atuais.indexOf(d.nome) >= 0 ? ' checked' : ''}>${esc(d.nome)}</label>`).join('')}</div>
        </div>`).join('')}
      </form>`,
      rodape: `<span class="grow"></span>
        <button class="btn" data-fechar>Cancelar</button>
        <button class="btn btn--primary" data-enviar>Salvar destaque</button>`
    });
    ligarEnvio(ov, (v) => {
      const marcadas = [].concat(v.doc || []);
      // Quem já estava fica na posição; o que entrou vai para o fim.
      const ordem = atuais.filter((n) => marcadas.indexOf(n) >= 0).concat(marcadas.filter((n) => atuais.indexOf(n) < 0));
      WB.data.politicasDestaque = ordem;
      WB.store.set('home.politicas', ordem);
      WB.fecharPopup();
      WB.toast(ordem.length ? 'Destaque atualizado.' : 'Nenhuma política em destaque no Início.');
      if (WB.rerender) WB.rerender();
    });
  };

  /* ================================================================ LER AVISO
     Ler um comunicado e publicar um comunicado são coisas diferentes: quem
     clica em "Ler comunicado" na home quer o texto, não o formulário de
     publicação — e a maioria das pessoas nem pode publicar. */
  WB.lerAviso = function (aviso) {
    if (!aviso) return WB.toast('Aviso não encontrado.', 'erro');
    const autor = WB.pessoa(aviso.autor);
    WB.abrirPopup({
      tipo: aviso.fixado ? 'Aviso fixado' : 'Comunicado',
      titulo: aviso.titulo || 'Aviso',
      corpo: `
        ${/^(https?:\/\/|data:image\/|assets\/|\.{0,2}\/)/i.test(String(aviso.capa || ''))
          ? `<img src="${esc(aviso.capa)}" alt="" style="width:100%;max-height:260px;object-fit:cover;border-radius:10px;margin:0 0 16px">` : ''}
        <p class="muted" style="margin:0 0 16px">${esc(WB.fmtDataLonga(aviso.data))} · ${esc(autor.nome)}${autor.funcao ? ' · ' + esc(autor.funcao) : ''}</p>
        <p style="font-size:15px; line-height:1.6; white-space:pre-wrap; margin:0">${esc(aviso.corpo || '')}</p>
        <dl class="dl" style="margin-top:20px">
          <dt>Para quem</dt><dd>${esc(WB.publicoNewsTexto(aviso.publico))}</dd>
          <dt>Publicado em</dt><dd>${esc(WB.fmtDataCurta(aviso.data))}</dd>
        </dl>`,
      rodape: `<span class="grow"></span><button class="btn btn--primary" data-fechar>Fechar</button>`
    });
  };
})();
