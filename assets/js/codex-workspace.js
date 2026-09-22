/* WeBrain · Demandas, Projetos e Solicitações. Arquivo sob responsabilidade Codex.
   ---------------------------------------------------------------------------
   Ajustado em 21/09/2026 a pedido do usuário (registro em
   ALINHAMENTO_CLAUDE_CODEX.md): título sem eyebrow nem subtítulo; os quatro
   números do Início vieram para cá; busca e filtros numa caixa só, com
   agrupar e ordem ao lado; visão de calendário por prazo; o botão "Minhas
   demandas" saiu porque a tela já é a das minhas demandas; e o histórico de
   solicitações ganhou edição, com os botões de abrir pedido mais discretos. */
(function () {
  'use strict';
  const WB = window.WB = window.WB || {};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const statuses = WB.STATUS_DEMANDA || { afazer:'A fazer', andamento:'Em andamento', revisao:'Em revisão', concluida:'Concluída' };
  const isClosed = d => WB.demandaFechada ? WB.demandaFechada(d) : ['concluida','aprovada'].includes(d.status);
  const priorities = { baixa:'Baixa', media:'Média', alta:'Alta' };
  const types = { marco:'Marco', entregavel:'Entregável', tarefa:'Tarefa', subtarefa:'Subtarefa' };
  const requestTypes = { evento:'Evento', compra:'Compra ou pagamento', coffe:'Coffee' };
  /* Colunas da tabela que a pessoa liga e desliga. O nome da demanda não entra
     na lista: sem ele a linha não identifica coisa nenhuma. "Início" começa
     desligada — a maioria das demandas só tem prazo. */
  const COLUNAS = [['responsavel','Responsável'],['status','Situação'],['prioridade','Prioridade'],['inicio','Início'],['prazo','Prazo'],['tipo','Tipo']];
  const COLUNAS_PADRAO = Object.fromEntries(COLUNAS.map(([id])=>[id, id!=='inicio']));
  const keyDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
    const [y,m,d] = value.split('-').map(Number); return keyDate(new Date(y,m-1,d)) === value;
  }
  const dateText = value => validDate(value) ? `${value.slice(8)}/${value.slice(5,7)}/${value.slice(0,4)}` : 'Sem data';
  const shiftDate = (iso, days) => { const [y,m,d]=iso.split('-').map(Number); const dt=new Date(y,m-1,d); dt.setDate(dt.getDate()+days); return keyDate(dt); };
  /* Preferência de tela, guardada pela aplicação. O módulo também roda sozinho
     (testes, preview): sem `WB.store` o padrão vale e nada quebra. */
  const pref = (chave, padrao) => { try { return WB.store ? WB.store.get(chave, padrao) : padrao; } catch (e) { return padrao; } };
  const gravarPref = (chave, valor) => { try { if (WB.store) WB.store.set(chave, valor); } catch (e) { /* segue sem guardar */ } };
  /* Período pelo PRAZO, com três regras ditas na tela:
     · o que está aberto olha para a frente (hoje, ou os próximos sete dias);
     · o que já foi concluído olha para trás — "concluí esta semana" é passado.
       O portal não guarda data de conclusão, então o prazo é o que há: a tela
       diz isso em vez de fingir precisão;
     · atrasada e não concluída entra em qualquer período (é o trabalho de
       hoje, mesmo com prazo de ontem), e demanda sem prazo válido também —
       ela não pertence a período nenhum, e escondê-la sumiria com trabalho. */
  const PERIODOS = [['hoje','Hoje'],['semana','Semana'],['mes','Mês'],['intervalo','Escolher'],['tudo','Tudo']];
  function noPeriodo(task, periodo, today, de, ate) {
    if (!periodo || periodo === 'tudo') return true;
    if (!validDate(task.prazo)) return true;
    /* Intervalo escolhido é literal: quem digitou as duas datas quer aquelas
       datas, inclusive o que já fechou e o que está atrasado dentro delas. */
    if (periodo === 'intervalo') {
      if (!validDate(de) && !validDate(ate)) return true;
      return task.prazo >= (validDate(de) ? de : '0000-01-01') && task.prazo <= (validDate(ate) ? ate : '9999-12-31');
    }
    const dias = periodo === 'hoje' ? 0 : periodo === 'mes' ? 29 : 6;
    if (isClosed(task)) return task.prazo <= today && task.prazo >= shiftDate(today, -dias);
    if (task.prazo < today) return true;
    return task.prazo <= shiftDate(today, dias);
  }
  const copy = data => ({ ...data, demandas:(data.demandas || []).map(d=>({...d})), projetos:(data.projetos || []).map(p=>({...p})), solicitacoes:(data.solicitacoes || []).map(s=>({...s})) });
  function filterTasks(data, state, today) {
    if (!(data.pessoas || []).some(p=>p.id === data.usuarioAtual)) return [];
    const projects = new Map((data.projetos || []).map(p=>[p.id,p.nome]));
    return (data.demandas || []).filter(d => (!state.mine || d.responsavel === data.usuarioAtual) &&
      (!state.project || d.projeto === state.project) && (!state.person || d.responsavel === state.person) &&
      (!state.company || (data.projetos || []).some(p=>p.id===d.projeto && p.empresa===state.company)) &&
      (!state.sprint || d.sprint === (state.sprint==='atual'?(data.sprints||[]).find(s=>s.atual)?.id:state.sprint)) &&
      (!state.status || d.status === state.status) && (!state.late || (!isClosed(d) && validDate(d.prazo) && d.prazo < today)) &&
      noPeriodo(d, state.periodo, today, state.de, state.ate) &&
      fold(`${d.nome} ${projects.get(d.projeto) || ''}`).includes(fold(state.query))).sort((a,b)=> state.sort === 'date' ? (validDate(a.prazo)?a.prazo:'9999').localeCompare(validDate(b.prazo)?b.prazo:'9999') : 0);
  }
  // Ancestors provide context for matching subitems; cycles and dangling parents cannot hide records.
  function outline(all, matches, expanded, searching) {
    const byId = new Map(all.map(d=>[d.id,d]));
    const visible = new Set(matches.map(d=>d.id));
    const matched = new Set(visible);
    for (const item of matches) {
      let current = item; const seen = new Set([item.id]);
      while (current.pai && byId.has(current.pai) && !seen.has(current.pai)) {
        const parent = byId.get(current.pai); if(parent.projeto !== item.projeto) break;
        seen.add(parent.id); visible.add(parent.id); current = parent;
      }
    }
    const rows = [], visited = new Set();
    function walk(item, depth) {
      if (visited.has(item.id) || !visible.has(item.id)) return;
      visited.add(item.id);
      const children = all.filter(d=>d.pai===item.id && d.projeto===item.projeto && visible.has(d.id));
      rows.push({ item, depth, context:!matched.has(item.id), children:children.length });
      if (searching || expanded.has(item.id)) children.forEach(d=>walk(d,Math.min(depth+1,6)));
      else { const mark = d => { if(visited.has(d.id)) return; visited.add(d.id); all.filter(c=>c.pai===d.id && c.projeto===d.projeto).forEach(mark); }; children.forEach(mark); }
    }
    all.filter(d=>visible.has(d.id) && (!visible.has(d.pai) || byId.get(d.pai)?.projeto !== d.projeto)).forEach(d=>walk(d,0));
    all.filter(d=>visible.has(d.id) && !visited.has(d.id)).forEach(d=>walk(d,0));
    return rows;
  }
  async function commit(data, ids, changes, writer) {
    if (typeof writer !== 'function') throw new Error('A gravação ainda não está conectada.');
    const keys = Object.keys(changes);
    if (!keys.length || keys.some(k=>!['status','responsavel','prioridade','prazo','inicio','nome','descricao','tipo'].includes(k))) throw new Error('Campo não permitido.');
    if ('tipo' in changes && !Object.hasOwn(types, changes.tipo)) throw new Error('Escolha um tipo válido.');
    if ('nome' in changes && !String(changes.nome).trim()) throw new Error('A demanda precisa de um nome.');
    if ('inicio' in changes && changes.inicio !== '' && !validDate(changes.inicio)) throw new Error('Informe uma data válida.');
    if ('status' in changes && !Object.hasOwn(statuses, changes.status)) throw new Error('Escolha uma situação válida.');
    if ('prioridade' in changes && !Object.hasOwn(priorities, changes.prioridade)) throw new Error('Escolha uma prioridade válida.');
    if ('prazo' in changes && changes.prazo !== '' && !validDate(changes.prazo)) throw new Error('Informe uma data válida.');
    if ('responsavel' in changes && !(data.pessoas || []).some(p=>p.id===changes.responsavel)) throw new Error('Escolha um responsável válido.');
    const unique = [...new Set(ids)];
    if (!unique.length || unique.some(id=>!data.demandas.some(d=>d.id===id))) throw new Error('A demanda não está mais disponível.');
    for (const id of unique) {
      const atual = data.demandas.find(d=>d.id===id);
      const ini = 'inicio' in changes ? changes.inicio : atual.inicio;
      const fim = 'prazo' in changes ? changes.prazo : atual.prazo;
      if (validDate(ini) && validDate(fim) && ini > fim) throw new Error('O início não pode ser depois do prazo.');
    }
    const result = await writer({ ids:unique, changes:{...changes} });
    if(result === false) throw new Error('A alteração não foi confirmada. Tente novamente.');
    data.demandas = data.demandas.map(d=>unique.includes(d.id)?{...d,...changes}:d);
    return data;
  }
  function mount(root, options = {}) {
    let settings = { page:'demandas', demo:true, ...options };
    let data = copy(settings.data || WB.data || {});
    /* `mine` nasce ligado e não tem mais botão: a tela é "Minhas demandas", o
       recorte já está feito pela navegação. O filtro por pessoa saiu junto —
       ele contradizia o recorte. `filtros` abre a caixa única de filtros e
       `mes` é o mês da visão de calendário. */
    /* `view` e `periodo` são preferência, não filtro: o formato escolhido e o
       recorte de tempo voltam na próxima visita, inclusive depois do F5. */
    const state = { query:'', mine:true, project:'', person:'', status:'', company:'', sprint:'', late:false, sort:'', group:'project', view:pref('demandas.view','table'), requestType:options.requestType || '', filtros:false, mes:'', periodo:pref('demandas.periodo','semana'), de:'', ate:'', colunas:{...COLUNAS_PADRAO, ...pref('demandas.colunas',{})}, colunasAbertas:false };
    const expanded = new Set(), collapsed = new Set(), selected = new Set();
    let busy = false, dead = false, notice = '', failed = false, currentRows = [], dragId = null, aberta = null;
    const shell = document.createElement('div'); shell.className='we-workspace';
    const content = document.createElement('div'); shell.appendChild(content);
    const dialog = document.createElement('dialog'); dialog.className='ww-drawer'; dialog.setAttribute('aria-labelledby','ww-dialog-title'); shell.appendChild(dialog);
    root.appendChild(shell);
    const currentUser = () => (data.pessoas || []).find(p=>p.id===data.usuarioAtual);
    const canEdit = () => !!currentUser() && typeof settings.onUpdate === 'function';
    const today = () => keyDate(settings.now || new Date());
    const person = id => (data.pessoas || []).find(p=>p.id===id)?.nome || 'Sem responsável';
    const project = id => data.projetos.find(p=>p.id===id)?.nome || 'Sem projeto';
    const initials = name => name.split(/\s+/).slice(0,2).map(s=>s[0]).join('');
    const disabled = condition => condition?' disabled':'';
    const optionList = (list, value) => list.map(([id,label])=>`<option value="${esc(id)}"${id===value?' selected':''}>${esc(label)}</option>`).join('');
    const badge = (text, tone='') => `<span class="ww-badge ${tone?'ww-tone-'+esc(tone):''}">${esc(text)}</span>`;
    const empty = (title,text) => `<div class="ww-empty"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
    /* Seleção: caixinha sem rótulo ao lado do nome, igual nos três formatos.
       A barra "Selecionar resultados" saiu — ela dizia em palavras o que a
       caixinha da linha já faz. */
    const checkbox = (d, context) => `<input class="ww-check" type="checkbox" aria-label="Selecionar ${esc(d.nome)}" data-select="${esc(d.id)}"${selected.has(d.id)?' checked':''}${disabled(context||busy)}>`;
    const guardarColunas = () => gravarPref('demandas.colunas', state.colunas);
    function field(d, name, context=false) {
      const lock = !canEdit() || busy || context || (settings.permissao && !settings.permissao(d).pode);
      if(name==='prazo' || name==='inicio') return `<input class="ww-date ${name==='prazo' && !isClosed(d) && validDate(d.prazo) && d.prazo<today()?'ww-late':''}" type="date" aria-label="${name==='prazo'?'Prazo':'Início'} de ${esc(d.nome)}" data-edit="${name}" data-id="${esc(d.id)}" value="${validDate(d[name])?d[name]:''}"${disabled(lock)}>`;
      const list = name==='status'?Object.entries(statuses):name==='prioridade'?Object.entries(priorities):name==='tipo'?Object.entries(types):(data.pessoas || []).map(p=>[p.id,p.nome]);
      const tone = name==='status' && statuses[d.status] ? ` ww-status-${d.status}` : '';
      return `<select class="ww-cell-select${tone}" aria-label="${name==='status'?'Situação':name==='prioridade'?'Prioridade':name==='tipo'?'Tipo':'Responsável'} de ${esc(d.nome)}" data-edit="${name}" data-id="${esc(d.id)}"${disabled(lock)}>${!list.some(([id])=>id===d[name])?'<option value="">Selecionar</option>':''}${optionList(list,d[name])}</select>`;
    }
    /* Título e nada mais nas telas da base comum: o "WORKSPACE / WE" e a frase
       de apoio repetiam em toda página o que a navegação já diz. O subtítulo
       continua disponível para as telas que ainda precisam explicar-se. */
    function header(title,subtitle) {
      return `${settings.demo?'<div class="ww-demo">Demonstração <span>Alterações apenas nesta sessão · dados ilustrativos</span></div>':''}<header class="ww-heading"><div><h1>${title}</h1>${subtitle?`<p>${subtitle}</p>`:''}</div>${settings.page==='demandas'?`<button class="ww-btn ww-primary" data-new${disabled(!currentUser() || !settings.onCreate || busy)}>+ Nova demanda</button>`:''}</header><div class="ww-notice ${failed?'ww-error':''}" role="status" aria-live="polite">${esc(busy?'Salvando alteração…':notice)}</div>`;
    }
    /* Um lugar só para procurar e filtrar: busca à esquerda, o botão de filtros
       ao lado abrindo a caixa com projeto, situação e atrasadas, e agrupar e
       ordem na mesma linha. Antes eram seis controles soltos disputando espaço. */
    function toolbar() {
      const ativos = [state.project, state.status, state.company, state.sprint, state.late?'1':''].filter(Boolean).length;
      return `<div class="ww-filterbox">
        <div class="ww-filterbox-row">
          <label class="ww-search"><span class="ww-sr">Buscar nas minhas demandas</span><input type="search" data-filter="query" value="${esc(state.query)}" placeholder="Buscar demanda ou projeto"></label>
          <button class="ww-btn" data-filtros aria-expanded="${state.filtros}">Filtros${ativos?` <span class="ww-count">${ativos}</span>`:''}</button>
          <label class="ww-filter">Agrupar<select data-filter="group"${disabled(state.view!=='table')}>${optionList([['project','Projeto'],['status','Situação']],state.group)}</select></label>
          <label class="ww-filter">Ordem<select data-filter="sort">${optionList([['','Original'],['date','Prazo']],state.sort)}</select></label>
        </div>
        ${state.filtros?`<div class="ww-filterpanel">
          <label class="ww-filter">Empresa<select data-filter="company">${optionList([['','Todas'],...(data.empresas||[]).map(p=>[p.id,p.nome])],state.company)}</select></label>
          <label class="ww-filter">Sprint<select data-filter="sprint">${optionList([['','Todas'],['atual','Sprint atual'],...(data.sprints||[]).map(p=>[p.id,p.nome])],state.sprint)}</select></label>
          <label class="ww-filter">Projeto<select data-filter="project">${optionList([['','Todos os projetos'],...data.projetos.map(p=>[p.id,p.nome])],state.project)}</select></label>
          <label class="ww-filter">Situação<select data-filter="status">${optionList([['','Todas'],...Object.entries(statuses)],state.status)}</select></label>
          <button class="ww-btn" data-late aria-pressed="${state.late}">Só atrasadas</button>
          <button class="ww-btn ww-quiet" data-clear>Limpar filtros</button>
        </div>`:''}
      </div>`;
    }
    /* Escolher colunas: só faz sentido na tabela, e o que for escolhido fica
       guardado junto com o formato de tela. */
    function colunasBotao() {
      if (state.view!=='table') return '';
      const ligadas = COLUNAS.filter(([id])=>state.colunas[id]).length;
      return `<div class="ww-cols"><button class="ww-btn ww-quiet" data-colunas aria-expanded="${state.colunasAbertas}">Colunas${ligadas<COLUNAS.length?` <span class="ww-cols-count">${ligadas}/${COLUNAS.length}</span>`:''}</button>${state.colunasAbertas?`<div class="ww-cols-panel">${COLUNAS.map(([id,rotulo])=>`<label><input type="checkbox" data-coluna="${id}"${state.colunas[id]?' checked':''}> ${esc(rotulo)}</label>`).join('')}</div>`:''}</div>`;
    }
    function table(tasks) {
      const grouping = state.group==='status'?Object.keys(statuses):[...new Set(tasks.map(d=>d.projeto))];
      const filtering = !!(state.query || state.person || state.status || state.mine || state.late);
      return grouping.map((group,index)=> {
        const members = tasks.filter(d=>state.group==='status'?d.status===group:d.projeto===group);
        if(!members.length) return '';
        const rows = state.group==='project'?outline(data.demandas.filter(d=>d.projeto===group).sort((a,b)=>state.sort==='date'?String(a.prazo||'9999').localeCompare(String(b.prazo||'9999')):0),members,expanded,filtering):members.map(item=>({item,depth:0,children:0,context:false}));
        const closed = collapsed.has(group); const label=state.group==='status'?statuses[group]:project(group);
        const visiveis = COLUNAS.filter(([id])=>state.colunas[id]);
        return `<section class="ww-group ww-group-${index%4}"><button class="ww-group-title" data-group="${esc(group)}" aria-expanded="${!closed}"><span aria-hidden="true">${closed?'▸':'▾'}</span><h2>${esc(label)}</h2><span>${members.length} itens</span></button>${closed?'':`<div class="ww-table-scroll" role="region" aria-label="Quadro ${esc(label)}" tabindex="0"><table><caption class="ww-sr">Demandas de ${esc(label)}</caption><thead><tr><th class="ww-name-col" scope="col">Demanda</th>${visiveis.map(([,rotulo])=>`<th scope="col">${esc(rotulo)}</th>`).join('')}</tr></thead><tbody>${rows.map(({item:d,depth,children,context})=>`<tr class="${selected.has(d.id)?'ww-selected ':''}${context?'ww-context-row':''}"><th scope="row"><div class="ww-name" style="--depth:${depth}">${checkbox(d,context)}${children?`<button class="ww-expand" data-expand="${esc(d.id)}" aria-label="Subitens de ${esc(d.nome)}" aria-expanded="${filtering||expanded.has(d.id)}">${filtering||expanded.has(d.id)?'▾':'▸'}</button>`:'<span class="ww-expand-placeholder"></span>'}<button class="ww-item-name" data-detail="${esc(d.id)}">${esc(d.nome)}</button>${context?'<span class="ww-context-label">Contexto</span>':''}</div></th>${visiveis.map(([id])=>id==='tipo'?`<td>${badge(types[d.tipo]||d.tipo||'Tarefa')}</td>`:`<td>${field(d,id,context)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="ww-group-footer"><span>${members.filter(d=>isClosed(d)).length} de ${members.length} concluídos</span><progress aria-label="Conclusão de ${esc(label)}" max="${members.length}" value="${members.filter(d=>isClosed(d)).length}"></progress></div>`}</section>`;
      }).join('') || empty('Nenhuma demanda encontrada','Altere os filtros ou crie uma demanda para começar.');
    }
    function kanban(tasks) {
      return `<div class="ww-kanban">${Object.entries(statuses).map(([status,label])=>`<section class="ww-kanban-column" data-drop="${status}" aria-label="${label}"><h2><span class="ww-dot ww-status-${status}"></span>${label}<small>${tasks.filter(d=>d.status===status).length}</small></h2>${tasks.filter(d=>d.status===status).map(d=>`<article class="ww-card${selected.has(d.id)?' ww-selected':''}" draggable="${canEdit()&&!busy}" data-drag="${esc(d.id)}"><div class="ww-card-head">${checkbox(d,false)}<span class="ww-card-project">${esc(project(d.projeto))}</span></div><button data-detail="${esc(d.id)}" class="ww-card-title">${esc(d.nome)}</button>${d.pai?`<span class="ww-subitem-label">${esc(types[data.demandas.find(x=>x.id===d.pai)?.tipo]||'Entregável')}: ${esc(data.demandas.find(x=>x.id===d.pai)?.nome||'vínculo fora deste recorte')}</span>`:''}<div class="ww-card-meta">${badge(types[d.tipo]||'Tarefa')}${badge(priorities[d.prioridade]||'Sem prioridade')}</div><div class="ww-card-bottom"><span class="ww-avatar" title="${esc(person(d.responsavel))}">${esc(initials(person(d.responsavel)))}</span><span>${esc(person(d.responsavel))}</span><time class="${!isClosed(d)&&validDate(d.prazo)&&d.prazo<today()?'ww-late':''}">${dateText(d.prazo)}</time></div>${field(d,'status')}</article>`).join('') || '<p class="ww-column-empty">Nenhuma demanda</p>'}</section>`).join('')}</div>`;
    }
    /* Os quatro números vieram do Início: eles falam das demandas da pessoa,
       então o lugar deles é a tela de demandas. São sempre do usuário da
       sessão — não acompanham os filtros, senão deixariam de ser um retrato. */
    /* Ícone de cada indicador. Estado nunca sai só na cor: cada card leva
       ícone, rótulo e número juntos — relógio para o que está aberto,
       calendário para o dia, triângulo para o atraso, check para o concluído. */
    const ICONES = {
      aberto: '<circle cx="10" cy="10" r="7.2"/><path d="M10 5.8v4.4l2.9 1.8"/>',
      hoje: '<rect x="3" y="4.5" width="14" height="13" rx="2"/><path d="M3 8.5h14M7 2.5v3.2M13 2.5v3.2"/>',
      atraso: '<path d="M10 3.2l7.4 13.3H2.6z"/><path d="M10 8v3.6M10 14.1v.01"/>',
      feito: '<circle cx="10" cy="10" r="7.2"/><path d="M6.5 10.3l2.6 2.5 4.6-5"/>'
    };
    const icone = nome => `<svg class="ww-metric-ic" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ''}</svg>`;

    /* Os quatro números seguem o período escolhido, como a lista abaixo. O que
       eles NÃO seguem são os filtros de busca e projeto: eles são o resumo do
       seu trabalho no período, não a contagem do resultado da busca — essa já
       aparece ao lado do formato. */
    function metrics() {
      const hoje=today();
      const todas=data.demandas.filter(d=>d.responsavel===data.usuarioAtual);
      const mine=todas.filter(d=>noPeriodo(d,state.periodo,hoje));
      const open=mine.filter(d=>!isClosed(d));
      const atrasadas=open.filter(d=>validDate(d.prazo)&&d.prazo<hoje);
      const historico=todas.length-todas.filter(d=>!isClosed(d)).length;
      const cards=[
        { chave:'aberto', rotulo:'Em aberto', valor:open.length, nota:`${open.length-atrasadas.length} em dia` },
        { chave:'hoje', rotulo:'Para hoje', valor:open.filter(d=>d.prazo===hoje).length, nota:'vencem hoje' },
        { chave:'atraso', rotulo:'Precisam de atenção', valor:atrasadas.length, nota:'em atraso', alerta:true },
        /* O número segue o período; o histórico inteiro fica embaixo, para
           "0 concluídas" não parecer defeito quando é só o recorte. */
        { chave:'feito', rotulo:'Concluídas', valor:mine.length-open.length, nota:`${historico} no histórico` }
      ];
      const periodo=(PERIODOS.find(([id])=>id===state.periodo) || PERIODOS[1])[1];
      return `<div class="ww-metricbar">
        <div class="ww-seg" role="group" aria-label="Período das minhas demandas">${PERIODOS.map(([id,rotulo])=>`<button data-periodo="${id}" aria-pressed="${state.periodo===id}">${esc(rotulo)}</button>`).join('')}</div>${state.periodo==='intervalo'?`<span class="ww-range"><label class="ww-sr" for="ww-de">Data inicial</label><input id="ww-de" class="ww-date" type="date" data-filter="de" value="${esc(state.de)}"><span aria-hidden="true">→</span><label class="ww-sr" for="ww-ate">Data final</label><input id="ww-ate" class="ww-date" type="date" data-filter="ate" value="${esc(state.ate)}"></span>`:''}
        <p class="ww-metricnote">O período recorta pelo prazo, aqui e na lista: aberto olha para a frente, concluído olha para trás. Atrasada e demanda sem prazo aparecem em qualquer período.</p>
      </div>
      <section class="ww-metrics" aria-label="Resumo das minhas demandas · ${esc(periodo)}">${cards.map(c=>`<article class="ww-metric ww-metric--${c.chave}${c.alerta&&c.valor?' ww-metric--alert':''}">
        <span class="ww-metric-top">${icone(c.chave)}<span>${esc(c.rotulo)}</span></span>
        <strong>${c.valor}</strong><small>${esc(c.nota)}</small></article>`).join('')}</section>`;
    }
    /* Calendário do mês pelo prazo. Só entra o que tem data válida: uma demanda
       sem prazo não pertence a dia nenhum, e inventar um dia para ela seria
       afirmar um compromisso que ninguém assumiu — ela fica avisada no rodapé. */
    function calendario(tasks) {
      const base=state.mes && /^\d{4}-\d{2}$/.test(state.mes) ? state.mes : today().slice(0,7);
      const [ano,mes]=base.split('-').map(Number);
      const primeiro=new Date(ano,mes-1,1);
      const inicio=new Date(primeiro); inicio.setDate(1-((primeiro.getDay()+6)%7));
      const noMes=new Date(ano,mes,0).getDate();
      const semanas=Math.ceil((((primeiro.getDay()+6)%7)+noMes)/7);
      const comPrazo=tasks.filter(d=>validDate(d.prazo));
      const semPrazo=tasks.length-comPrazo.length;
      const anterior=new Date(ano,mes-2,1), proximo=new Date(ano,mes,1);
      const ym=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const nome=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(primeiro);
      const celulas=Array.from({length:semanas*7},(_,i)=>{ const d=new Date(inicio); d.setDate(inicio.getDate()+i); return d; });
      return `<section class="ww-cal" aria-label="Demandas por prazo em ${esc(nome)}">
        <div class="ww-cal-bar">
          <button class="ww-btn" data-mes="${ym(anterior)}" aria-label="Mês anterior">‹</button>
          <strong>${esc(nome)}</strong>
          <button class="ww-btn" data-mes="${ym(proximo)}" aria-label="Próximo mês">›</button>
          <button class="ww-btn ww-quiet" data-mes="${today().slice(0,7)}">Hoje</button>
        </div>
        <div class="ww-cal-week">${['seg','ter','qua','qui','sex','sáb','dom'].map(d=>`<span>${d}</span>`).join('')}</div>
        <div class="ww-cal-grid">${celulas.map(d=>{
          const chave=keyDate(d);
          const doDia=comPrazo.filter(t=>t.prazo===chave);
          return `<div class="ww-cal-cell${d.getMonth()===mes-1?'':' ww-cal-cell--fora'}${chave===today()?' ww-cal-cell--hoje':''}">
            <span class="ww-cal-num">${d.getDate()}</span>
            ${doDia.slice(0,3).map(t=>`<div class="ww-cal-item">${checkbox(t,false)}<button class="ww-cal-task ww-cal-task--${esc(t.status)}" data-detail="${esc(t.id)}" title="${esc(t.nome)} · ${esc(project(t.projeto))} · ${esc(statuses[t.status]||t.status)}">${esc(t.nome)}</button></div>`).join('')}
            ${doDia.length>3?`<span class="ww-cal-more">+${doDia.length-3}</span>`:''}
          </div>`;
        }).join('')}</div>
        ${semPrazo?`<p class="ww-cal-note">${semPrazo} ${semPrazo===1?'demanda sem prazo não aparece':'demandas sem prazo não aparecem'} no calendário — elas estão na tabela e no kanban.</p>`:''}
      </section>`;
    }
    function board() {
      const tasks=filterTasks(data,state,today()); currentRows=tasks;
      for (const id of selected) if(!tasks.some(d=>d.id===id)) selected.delete(id);
      const vistas=[['table','Tabela'],['kanban','Kanban'],['calendar','Calendário']];
      return header('Demandas')+metrics()+`<div class="ww-viewbar"><div role="group" aria-label="Visualização">${vistas.map(([id,rotulo])=>`<button data-view="${id}" aria-pressed="${state.view===id}">${rotulo}</button>`).join('')}</div>${colunasBotao()}<span>${tasks.length} demandas · o formato escolhido fica guardado</span></div>`+toolbar()+`${selected.size?`<div class="ww-batch"><strong>${selected.size} selecionados</strong><label><span class="ww-sr">Nova situação dos selecionados</span><select data-batch${disabled(!canEdit()||busy)}><option value="">Alterar situação…</option>${optionList(Object.entries(statuses),'')}</select></label><button class="ww-btn" data-unselect${disabled(busy)}>Limpar seleção</button></div>`:''}${!canEdit()?'<p class="ww-readonly">Modo de consulta · edição aguardando conexão com a aplicação.</p>':''}`+(state.view==='kanban'?kanban(tasks):state.view==='calendar'?calendario(tasks):table(tasks));
    }
    function projectsPage() {
      const projects=data.projetos.filter(p=>fold(`${p.nome} ${p.resumo}`).includes(fold(state.query)));
      return header('Projetos','Uma visão do que está em movimento na WE.')+`<div class="ww-toolbar"><label class="ww-search"><span class="ww-sr">Buscar projetos</span><input type="search" data-filter="query" placeholder="Buscar projeto" value="${esc(state.query)}"></label></div><div class="ww-projects">${projects.map(p=> {
        const tasks=data.demandas.filter(d=>d.projeto===p.id), done=tasks.filter(d=>isClosed(d)).length;
        const ratio=tasks.length?Math.round(done/tasks.length*100):0;
        return `<article class="ww-project"><div class="ww-project-top">${badge(p.status==='ativo'?'Em andamento':p.status)}<span>${esc(p.empreendimento || 'Grupo We')}</span></div><h2>${esc(p.nome)}</h2><p>${esc(p.resumo || 'Sem resumo cadastrado.')}</p><div class="ww-project-progress"><span>Demandas concluídas</span><strong>${ratio}%</strong></div><progress max="100" value="${ratio}" aria-label="Demandas concluídas de ${esc(p.nome)}"></progress><div class="ww-project-stats"><span>${tasks.length} demandas</span><span>${tasks.filter(d=>!isClosed(d)&&validDate(d.prazo)&&d.prazo<today()).length} atrasadas</span></div><div class="ww-project-owner"><span class="ww-avatar">${esc(initials(person(p.responsavel)))}</span><span>${esc(person(p.responsavel))}</span></div><div class="ww-project-actions"><button class="ww-btn" data-project-detail="${esc(p.id)}">Ver projeto</button><button class="ww-btn ww-primary" data-project-board="${esc(p.id)}">Abrir demandas ↗</button></div></article>`;
      }).join('') || empty('Nenhum projeto encontrado','Tente buscar pelo nome ou pelo resumo do projeto.')}</div>`;
    }
    /* Os três botões de abrir pedido continuam, mas discretos: o destaque
       deles é o Início. Aqui o que importa é o histórico — e cada linha do
       histórico agora pode ser editada por quem a abriu. */
    function requestsPage() {
      const requests=data.solicitacoes.filter(s=>s.solicitante===data.usuarioAtual && (!state.requestType||s.tipo===state.requestType) && fold(`${s.id} ${s.titulo} ${s.status}`).includes(fold(state.query))).sort((a,b)=>String(b.data).localeCompare(String(a.data)));
      const podeEditar=!!currentUser() && typeof settings.onEditRequest==='function';
      return header('Minhas solicitações')+`<div class="ww-request-actions ww-request-actions--slim">${Object.entries(requestTypes).map(([type,label])=>`<button class="ww-btn ww-slim" data-request="${type}"${disabled(!settings.onRequest)}>+ ${esc(label)}</button>`).join('')}</div><div class="ww-filterbox"><div class="ww-filterbox-row"><label class="ww-search"><span class="ww-sr">Buscar minhas solicitações</span><input type="search" data-filter="query" value="${esc(state.query)}" placeholder="Buscar pedido, número ou situação"></label><label class="ww-filter">Tipo<select data-filter="requestType">${optionList([['','Todos'],...Object.entries(requestTypes)],state.requestType)}</select></label></div></div><h2 class="ww-subtitle">Histórico</h2><div class="ww-request-list">${requests.map(s=>`<div class="ww-request-row"><button class="ww-request-open" data-request-detail="${esc(s.id)}"><span class="ww-request-number">${esc(s.id)}<small>${dateText(s.data)}</small></span><span class="ww-request-body"><strong>${esc(s.titulo)}</strong><span>${esc(s.resumo)}</span></span>${badge(s.status)}<span aria-hidden="true">↗</span></button>${podeEditar?`<button class="ww-btn ww-slim" data-request-edit="${esc(s.id)}"${disabled(busy)}>Editar</button>`:''}</div>`).join('')||empty('Nenhuma solicitação neste filtro','Seus pedidos aparecem aqui após o registro.')}</div>`;
    }
    function render(focus) {
      /* Comentário e anexo mudam o painel, não a lista: redesenhar o corpo do
         painel aberto evita fechar e reabrir a ficha a cada mensagem. */
      if(aberta && dialog.open) { const d=data.demandas.find(x=>x.id===aberta); if(d) detail(aberta, true); else aberta=null; }
      if(dead) return;
      content.innerHTML=currentUser()?(settings.page==='projetos'?projectsPage():settings.page==='solicitacoes'?requestsPage():board()):header('Seu workspace','Entre para acessar o trabalho da equipe.')+empty('Sessão não identificada','Conecte uma sessão autorizada para carregar os dados.');
      content.setAttribute('aria-busy',String(busy));
      if(focus) { const el=content.querySelector(focus); if(el) el.focus(); }
    }
    function showDialog(title,body) {
      dialog.innerHTML=`<header><form method="dialog"><button class="ww-icon-btn" aria-label="Fechar painel">×</button></form><h2 id="ww-dialog-title">${esc(title)}</h2></header><div class="ww-drawer-body">${body}</div>`;
      if(!dialog.open) dialog.showModal();
    }
    /* A ficha da demanda. A primeira pergunta de quem abre é "de onde isto
       veio?", então projeto e entregável abrem o painel, em destaque e
       clicáveis. Depois o período (início → prazo), a descrição, os subitens,
       as referências e a conversa. Editar e apagar aparecem só para quem pode
       — e, quando não pode, o painel diz o motivo em vez de sumir com tudo.

       `aberta` guarda a demanda em foco para o painel se redesenhar sozinho
       depois de um comentário ou de um anexo, sem fechar e reabrir. */
    function detail(id, manter) {
      const d=data.demandas.find(item=>item.id===id); if(!d) { aberta=null; return; }
      aberta=id;
      const pai=d.pai?data.demandas.find(x=>x.id===d.pai):null;
      const children=data.demandas.filter(item=>item.pai===id);
      const regra=settings.permissao?settings.permissao(d):{pode:true,motivo:''};
      const podeMexer=canEdit() && regra.pode;
      const comentarios=(d.comentarios||[]).slice().sort((a,b)=>String(a.data).localeCompare(String(b.data)));
      const anexos=d.anexos||[];
      const periodoTexto=validDate(d.inicio)&&validDate(d.prazo)?`${dateText(d.inicio)} → ${dateText(d.prazo)}`:dateText(d.prazo);
      const corpo=`
        <div class="ww-detail-path">
          <span class="ww-detail-chip ww-detail-chip--projeto">${esc(project(d.projeto))}</span>
          <span aria-hidden="true">›</span>
          ${pai?`<button class="ww-detail-chip ww-detail-chip--pai" data-detail="${esc(pai.id)}">${esc(types[pai.tipo]||'Entregável')}: ${esc(pai.nome)}</button>`
               :`<span class="ww-detail-chip">${esc(types[d.tipo]||'Demanda')} do projeto</span>`}
        </div>
        <div class="ww-detail-grid">
          <div><span>Responsável</span><strong>${esc(person(d.responsavel))}</strong></div>
          <div><span>Situação</span><span class="ww-badge ww-status-${esc(d.status)}">${esc(statuses[d.status]||d.status)}</span></div>
          <div><span>Prioridade</span><strong>${esc(priorities[d.prioridade]||'Não definida')}</strong></div>
          <div><span>Período</span><strong class="${!isClosed(d)&&validDate(d.prazo)&&d.prazo<today()?'ww-late':''}">${esc(periodoTexto)}</strong></div>
          <div><span>Tipo</span><strong>${esc(types[d.tipo]||'Tarefa')}</strong></div>
          <div><span>Aberta por</span><strong>${esc(person(d.criador||d.responsavel))}</strong></div>
        </div>
        ${podeMexer?`<div class="ww-detail-actions"><button class="ww-btn" data-editar="${esc(d.id)}">Editar demanda</button>${settings.onDelete?`<button class="ww-btn ww-danger" data-apagar="${esc(d.id)}">Apagar</button>`:''}</div>`
          :`<p class="ww-readonly">${esc(regra.motivo||'Modo de consulta · edição aguardando conexão com a aplicação.')}</p>`}
        <h3>Descrição</h3>
        <p class="ww-description">${esc(d.descricao || 'Sem descrição registrada.')}</p>
        <h3>Subitens (${children.length})</h3>
        ${children.map(c=>`<button class="ww-child" data-detail="${esc(c.id)}">${esc(c.nome)} <span class="ww-badge ww-status-${esc(c.status)}">${esc(statuses[c.status]||c.status)}</span></button>`).join('') || '<p class="ww-muted">Nenhum subitem cadastrado.</p>'}
        <h3>Referências (${anexos.length})</h3>
        <ul class="ww-files">${anexos.map(a=>`<li><span class="ww-file-name">${esc(a.nome)}</span><span class="ww-muted">${esc([tamanhoArquivo(a.tamanho),person(a.autor),dateText(String(a.data||'').slice(0,10))].filter(Boolean).join(' · '))}</span></li>`).join('') || '<li class="ww-muted">Nenhuma referência anexada.</li>'}</ul>
        ${settings.onAttach?`<label class="ww-file-add"><input type="file" data-anexo="${esc(d.id)}"${disabled(busy)}><span class="ww-sr">Anexar referência</span></label><p class="ww-integration-note">Sem servidor de arquivos, o portal guarda o nome e o tamanho como referência — o arquivo em si não é enviado.</p>`:''}
        <h3>Conversa da demanda (${comentarios.length})</h3>
        <div class="ww-chat">${comentarios.map(c=>`<article class="ww-chat-msg${c.autor===data.usuarioAtual?' ww-chat-msg--minha':''}"><header><span class="ww-avatar">${esc(initials(person(c.autor)))}</span><strong>${esc(person(c.autor))}</strong><time>${esc(quando(c.data))}</time></header><p>${esc(c.texto)}</p></article>`).join('') || '<p class="ww-muted">Ninguém comentou ainda. O que for escrito aqui fica no histórico da demanda.</p>'}</div>
        ${settings.onComment?`<form class="ww-chat-form" data-chat-form data-id="${esc(d.id)}"><label class="ww-sr" for="ww-chat">Escrever na demanda</label><textarea id="ww-chat" name="texto" rows="2" maxlength="1000" placeholder="Atualizar a demanda ou falar com quem participa…"${disabled(busy)}></textarea><button class="ww-btn ww-primary" type="submit"${disabled(busy)}>Enviar</button></form>`:'<p class="ww-integration-note">A conversa da demanda é ligada pela aplicação.</p>'}`;
      if (manter) { const corpoAtual=dialog.querySelector('.ww-drawer-body'); if(corpoAtual) { corpoAtual.innerHTML=corpo; return; } }
      showDialog(d.nome, corpo);
    }
    const tamanhoArquivo = bytes => !bytes ? '' : bytes > 1048576 ? (bytes/1048576).toFixed(1)+' MB' : Math.max(1,Math.round(bytes/1024))+' KB';
    /* Comentário guarda a hora; o resto da base guarda só o dia. */
    function quando(valor) {
      const texto=String(valor||'');
      if (/^\d{4}-\d{2}-\d{2}T/.test(texto)) {
        const t=new Date(texto);
        if(!isNaN(t.getTime())) return `${dateText(keyDate(t))} · ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
      }
      return dateText(texto.slice(0,10));
    }
    /* Editar a demanda inteira. O tipo só entra na lista se a pessoa puder
       criar aquele tipo: promover a própria tarefa a entregável seria pular a
       regra de quem define o cronograma. */
    function editarDialog(id) {
      const d=data.demandas.find(x=>x.id===id); if(!d || !canEdit() || busy) return;
      if(settings.permissao && !settings.permissao(d).pode) return;
      const regras=WB.TIPOS_DEMANDA||{};
      const meu=currentUser()||{};
      const tipos=Object.entries(types).filter(([tid])=>tid===d.tipo || !regras[tid] || !regras[tid].de || regras[tid].de.includes(meu.papel));
      showDialog('Editar demanda',`<form data-demanda-form data-id="${esc(d.id)}"><label class="ww-form-field">Nome<input name="nome" value="${esc(d.nome)}" required maxlength="200" autofocus></label><div class="ww-form-grid"><label class="ww-form-field">Responsável<select name="responsavel">${optionList((data.pessoas||[]).map(p=>[p.id,p.nome]),d.responsavel)}</select></label><label class="ww-form-field">Situação<select name="status">${optionList(Object.entries(statuses),d.status)}</select></label></div><div class="ww-form-grid"><label class="ww-form-field">Tipo<select name="tipo">${optionList(tipos,d.tipo)}</select></label><label class="ww-form-field">Prioridade<select name="prioridade">${optionList(Object.entries(priorities),d.prioridade)}</select></label></div><div class="ww-form-grid"><label class="ww-form-field">Início<input name="inicio" type="date" value="${validDate(d.inicio)?d.inicio:''}"></label><label class="ww-form-field">Prazo<input name="prazo" type="date" value="${validDate(d.prazo)?d.prazo:''}"></label></div><label class="ww-form-field">Descrição<textarea name="descricao" rows="4">${esc(d.descricao||'')}</textarea></label><p class="ww-form-error" role="alert"></p><button class="ww-btn ww-primary" type="submit">Salvar demanda</button></form>`);
    }
    async function salvarDemanda(event) {
      const form=event.target.closest('[data-demanda-form]'); if(!form) return; event.preventDefault();
      if(busy || !form.reportValidity()) return;
      const v=Object.fromEntries(new FormData(form));
      const changes={ nome:String(v.nome||'').trim(), responsavel:v.responsavel, status:v.status, tipo:v.tipo, prioridade:v.prioridade, inicio:v.inicio, prazo:v.prazo, descricao:String(v.descricao||'').trim() };
      const button=form.querySelector('[type=submit]'); button.disabled=true; button.textContent='Salvando…';
      busy=true; notice=''; failed=false;
      try {
        await commit(data,[form.dataset.id],changes,settings.onUpdate);
        notice=settings.demo?'Demanda atualizada nesta demonstração.':'Demanda atualizada.';
        busy=false; dialog.close(); aberta=null; render();
      } catch(error) {
        busy=false; button.disabled=false; button.textContent='Salvar demanda';
        form.querySelector('.ww-form-error').textContent=error.message || 'Não foi possível salvar.';
      }
    }
    /* Apagar avisa quem abriu a demanda — e o painel diz isso antes, não
       depois. Quem apaga a própria demanda não recebe aviso de si mesma. */
    function apagarDialog(id) {
      const d=data.demandas.find(x=>x.id===id); if(!d || typeof settings.onDelete!=='function') return;
      if(settings.permissao && !settings.permissao(d).pode) return;
      const dono=d.criador||d.responsavel;
      const avisa=dono && dono!==data.usuarioAtual;
      const filhos=data.demandas.filter(x=>x.pai===id).length;
      showDialog('Apagar demanda',`<form data-apagar-form data-id="${esc(d.id)}"><p class="ww-description">Apagar <strong>${esc(d.nome)}</strong>? Isto não tem desfazer.</p>${filhos?`<p class="ww-readonly">Esta demanda tem ${filhos} ${filhos===1?'subitem, que fica sem vínculo':'subitens, que ficam sem vínculo'} — eles não são apagados junto.</p>`:''}<p class="ww-description">${avisa?`${esc(person(dono))} abriu esta demanda e será avisada de que ela foi apagada.`:'Você abriu esta demanda — ninguém precisa ser avisado.'}</p><p class="ww-form-error" role="alert"></p><div class="ww-detail-actions"><button class="ww-btn ww-danger" type="submit">Apagar demanda</button></div></form>`);
    }
    async function apagar(event) {
      const form=event.target.closest('[data-apagar-form]'); if(!form) return; event.preventDefault();
      if(busy) return; const id=form.dataset.id;
      const button=form.querySelector('[type=submit]'); button.disabled=true; button.textContent='Apagando…';
      busy=true; notice=''; failed=false;
      try {
        const ok=await settings.onDelete(id);
        if(ok===false) throw new Error('A exclusão não foi confirmada. Tente novamente.');
        data.demandas=data.demandas.filter(d=>d.id!==id).map(d=>d.pai===id?{...d,pai:undefined}:d);
        selected.delete(id);
        notice=settings.demo?'Demanda apagada nesta demonstração.':'Demanda apagada.';
        busy=false; dialog.close(); aberta=null; render();
      } catch(error) {
        busy=false; button.disabled=false; button.textContent='Apagar demanda'; failed=true;
        form.querySelector('.ww-form-error').textContent=error.message || 'Não foi possível apagar.';
      }
    }
    async function comentar(event) {
      const form=event.target.closest('[data-chat-form]'); if(!form) return; event.preventDefault();
      const campo=form.querySelector('textarea');
      const texto=String(campo && campo.value || '').trim();
      if(!texto || busy || typeof settings.onComment!=='function') return;
      busy=true; render();
      try {
        const registro=await settings.onComment(form.dataset.id, texto);
        const alvo=data.demandas.find(x=>x.id===form.dataset.id);
        if(alvo) alvo.comentarios=[...(alvo.comentarios||[]), registro || { id:'c'+Date.now().toString(36), autor:data.usuarioAtual, texto, data:new Date().toISOString() }];
        notice='';
      } catch(error) { notice=error.message || 'Não foi possível enviar.'; failed=true; }
      finally { busy=false; render(); }
    }
    async function anexar(input) {
      const arquivo=input.files && input.files[0];
      if(!arquivo || busy || typeof settings.onAttach!=='function') return;
      busy=true; render();
      try {
        const registro=await settings.onAttach(input.dataset.anexo, { nome:arquivo.name, tamanho:arquivo.size });
        const alvo=data.demandas.find(x=>x.id===input.dataset.anexo);
        if(alvo) alvo.anexos=[...(alvo.anexos||[]), registro || { id:'a'+Date.now().toString(36), nome:arquivo.name, tamanho:arquivo.size, autor:data.usuarioAtual, data:new Date().toISOString() }];
        notice='Referência anexada.';
      } catch(error) { notice=error.message || 'Não foi possível anexar.'; failed=true; }
      finally { busy=false; render(); }
    }
    async function save(ids,changes) {
      if(busy || dead) return; busy=true; notice=''; failed=false; render();
      try { await commit(data,ids,changes,settings.onUpdate); notice=settings.demo?'Alteração aplicada nesta demonstração.':'Alteração salva.'; }
      catch(error) { notice=error.message || 'Não foi possível salvar. Tente novamente.'; failed=true; }
      finally { busy=false; render(); }
    }
    function createDialog() {
      if(!settings.onCreate || busy) return;
      if (WB.pmViews && WB.pm) { WB.pmViews.newTask(state.project); return; }
      showDialog('Nova demanda',`<form data-create-form><label class="ww-form-field">Nome da demanda<input name="nome" required maxlength="200" autofocus></label><label class="ww-form-field">Projeto<select name="projeto" required><option value="">Selecione</option>${optionList(data.projetos.map(p=>[p.id,p.nome]),state.project)}</select></label><label class="ww-form-field">Responsável<select name="responsavel" required>${optionList((data.pessoas||[]).map(p=>[p.id,p.nome]),data.usuarioAtual)}</select></label><div class="ww-form-grid"><label class="ww-form-field">Tipo<select name="tipo">${optionList(Object.entries(types),'tarefa')}</select></label><label class="ww-form-field">Prioridade<select name="prioridade">${optionList(Object.entries(priorities),'media')}</select></label></div><label class="ww-form-field">Prazo<input name="prazo" type="date" required></label><label class="ww-form-field">Descrição<textarea name="descricao" rows="4"></textarea></label><p class="ww-form-error" role="alert"></p><button class="ww-btn ww-primary" type="submit">Criar demanda</button></form>`);
    }
    function parentOptions(form) {
      const kind=form.elements.tipo.value, projectId=form.elements.projeto.value;
      const allowed={marco:[],entregavel:['marco'],tarefa:['marco','entregavel'],subtarefa:['tarefa']};
      let select=form.elements.pai;
      if(!select) {
        form.querySelector('.ww-form-error').insertAdjacentHTML('beforebegin','<label class="ww-form-field">Item pai<select name="pai"></select></label>');
        select=form.elements.pai;
      }
      select.innerHTML=optionList([['','Sem vínculo'],...data.demandas.filter(d=>d.projeto===projectId && (allowed[kind]||[]).includes(d.tipo)).map(d=>[d.id,d.nome])],select.value);
      select.required=['tarefa','subtarefa'].includes(kind);
    }
    async function create(event) {
      const form=event.target.closest('[data-create-form]'); if(!form) return; event.preventDefault();
      if(busy || !form.reportValidity()) return;
      const candidate=Object.fromEntries(new FormData(form)); candidate.nome=candidate.nome.trim(); candidate.status='afazer';
      if(!candidate.nome) { form.elements.nome.setCustomValidity('Informe o nome da demanda.'); form.elements.nome.reportValidity(); return; }
      if(['tarefa','subtarefa'].includes(candidate.tipo) && !candidate.pai) { form.querySelector('.ww-form-error').textContent='Selecione um item pai para criar esta demanda.'; return; }
      if(candidate.pai) {
        const parent=data.demandas.find(d=>d.id===candidate.pai);
        const allowed={marco:[],entregavel:['marco'],tarefa:['marco','entregavel'],subtarefa:['tarefa']};
        if(!parent || parent.projeto!==candidate.projeto || !(allowed[candidate.tipo]||[]).includes(parent.tipo)) { form.querySelector('.ww-form-error').textContent='O item pai precisa ser do mesmo projeto e de tipo compatível.'; return; }
      }
      busy=true; const button=form.querySelector('[type=submit]'); button.disabled=true; button.textContent='Criando…';
      try {
        const item=await settings.onCreate(candidate);
        if(!item?.id || data.demandas.some(d=>d.id===item.id)) throw new Error('A aplicação não devolveu uma demanda nova válida.');
        data.demandas.push({...candidate,...item}); dialog.close(); notice=settings.demo?'Demanda criada nesta demonstração.':'Demanda criada.'; failed=false;
        state.query=''; state.status=''; state.late=false; state.project=candidate.projeto;
      } catch(error) { form.querySelector('.ww-form-error').textContent=error.message || 'Não foi possível criar. Tente novamente.'; }
      finally { busy=false; button.disabled=false; button.textContent='Criar demanda'; render(); }
    }
    /* Editar uma solicitação já aberta. Só título e resumo: número, data e
       situação vêm do fluxo de aprovação, que não é desta tela — deixar
       editá-los daria a impressão de que o pedido muda de estado sozinho. */
    function editDialog(id) {
      const s=data.solicitacoes.find(x=>x.id===id && x.solicitante===data.usuarioAtual);
      if(!s || typeof settings.onEditRequest!=='function' || busy) return;
      showDialog('Editar solicitação',`<form data-edit-form data-id="${esc(s.id)}"><p class="ww-drawer-context">${esc(s.id)} · ${dateText(s.data)} · ${esc(s.status)}</p><label class="ww-form-field">Pedido<input name="titulo" value="${esc(s.titulo)}" required maxlength="200" autofocus></label><label class="ww-form-field">Resumo<textarea name="resumo" rows="4">${esc(s.resumo||'')}</textarea></label><p class="ww-form-error" role="alert"></p><p class="ww-integration-note">Número, data de abertura e situação seguem o fluxo de aprovação e não mudam por aqui.</p><button class="ww-btn ww-primary" type="submit">Salvar alterações</button></form>`);
    }
    async function editar(event) {
      const form=event.target.closest('[data-edit-form]'); if(!form) return; event.preventDefault();
      if(busy || !form.reportValidity()) return;
      const valores=Object.fromEntries(new FormData(form));
      const titulo=String(valores.titulo||'').trim(), resumo=String(valores.resumo||'').trim();
      if(!titulo) { form.elements.titulo.setCustomValidity('Informe o pedido.'); form.elements.titulo.reportValidity(); return; }
      busy=true; const button=form.querySelector('[type=submit]'); button.disabled=true; button.textContent='Salvando…';
      try {
        const ok=await settings.onEditRequest(form.dataset.id,{titulo,resumo});
        if(ok===false) throw new Error('A alteração não foi confirmada. Tente novamente.');
        data.solicitacoes=data.solicitacoes.map(s=>s.id===form.dataset.id?{...s,titulo,resumo}:s);
        dialog.close(); notice=settings.demo?'Solicitação atualizada nesta demonstração.':'Solicitação atualizada.'; failed=false;
      } catch(error) { form.querySelector('.ww-form-error').textContent=error.message || 'Não foi possível salvar. Tente novamente.'; }
      finally { busy=false; button.disabled=false; button.textContent='Salvar alterações'; render(); }
    }
    // Um só ouvinte de submit para os dois formulários do painel.
    function enviar(event) {
      if(event.target.closest('[data-edit-form]')) return editar(event);
      if(event.target.closest('[data-demanda-form]')) return salvarDemanda(event);
      if(event.target.closest('[data-apagar-form]')) return apagar(event);
      if(event.target.closest('[data-chat-form]')) return comentar(event);
      return create(event);
    }
    function click(event) {
      const b=event.target.closest('button'); if(!b || b.disabled) return;
      if(b.dataset.detail) { detail(b.dataset.detail); return; }
      if(b.dataset.editar) { editarDialog(b.dataset.editar); return; }
      if(b.dataset.apagar) { apagarDialog(b.dataset.apagar); return; }
      if(b.hasAttribute('data-new')) { createDialog(); const form=dialog.querySelector('[data-create-form]'); if(form) parentOptions(form); return; }
      if(b.dataset.projectDetail && settings.onOpenProject) { settings.onOpenProject(b.dataset.projectDetail); return; }
      if(b.dataset.projectDetail) { const p=data.projetos.find(p=>p.id===b.dataset.projectDetail); showDialog(p.nome,`<p class="ww-description">${esc(p.resumo)}</p><h3>Objetivo</h3><p class="ww-description">${esc(p.briefing?.objetivo || 'Não informado')}</p><h3>Marcos</h3>${(p.marcos||[]).map(m=>`<div class="ww-milestone"><strong>${esc(m.nome)}</strong><span>${dateText(m.prazo)}</span>${badge(statuses[m.status]||m.status)}</div>`).join('')||'<p>Sem marcos cadastrados.</p>'}`); return; }
      if(b.dataset.requestDetail) { const s=data.solicitacoes.find(s=>s.id===b.dataset.requestDetail && s.solicitante===data.usuarioAtual); if(s) showDialog(s.titulo,`${badge(s.status)}<p class="ww-drawer-context">${esc(s.id)} · ${dateText(s.data)}</p><p class="ww-description">${esc(s.resumo)}</p><p>Solicitante: ${esc(person(s.solicitante))}</p><dl class="ww-request-fields">${(Array.isArray(s.campos)?s.campos:Object.entries(s.campos||{})).map(c=>`<dt>${esc(c[0])}</dt><dd>${esc(c[1])}</dd>`).join('')}</dl>`); return; }
      if(b.dataset.requestEdit) { editDialog(b.dataset.requestEdit); return; }
      if(b.dataset.request) { settings.onRequest?.(b.dataset.request); return; }
      if(b.dataset.projectBoard) { settings.page='demandas'; state.query=''; state.project=b.dataset.projectBoard; state.status=''; state.late=false; settings.onPageChange?.('demandas'); }
      else if(b.dataset.view) { state.view=b.dataset.view; gravarPref('demandas.view',state.view); }
      else if(b.dataset.periodo) { state.periodo=b.dataset.periodo; if(state.periodo!=='intervalo'){state.de='';state.ate='';} gravarPref('demandas.periodo',state.periodo); selected.clear(); }
      else if(b.hasAttribute('data-colunas')) state.colunasAbertas=!state.colunasAbertas;
      else if(b.dataset.mes) state.mes=b.dataset.mes;
      else if(b.hasAttribute('data-filtros')) state.filtros=!state.filtros;
      else if(b.hasAttribute('data-late')) state.late=!state.late;
      else if(b.hasAttribute('data-clear')) Object.assign(state,{query:'',project:'',status:'',company:'',sprint:'',late:false,de:'',ate:''});
      else if(b.hasAttribute('data-unselect')) selected.clear();
      else if(b.dataset.group) { collapsed.has(b.dataset.group)?collapsed.delete(b.dataset.group):collapsed.add(b.dataset.group); }
      else if(b.dataset.expand) { expanded.has(b.dataset.expand)?expanded.delete(b.dataset.expand):expanded.add(b.dataset.expand); }
      else return;
      render();
    }
    function change(event) {
      const el=event.target;
      if(['tipo','projeto'].includes(el.name)) { const form=el.closest('[data-create-form]'); if(form){parentOptions(form);return;} }
      if(el.dataset.anexo) { anexar(el); return; }
      if(el.dataset.edit) { save([el.dataset.id],{[el.dataset.edit]:el.value}); return; }
      if(el.hasAttribute('data-batch') && el.value) { save([...selected],{status:el.value}); return; }
      if(el.dataset.filter && el.type!=='search') state[el.dataset.filter]=el.value;
      else if(el.dataset.select) el.checked?selected.add(el.dataset.select):selected.delete(el.dataset.select);
      else if(el.dataset.coluna) { state.colunas[el.dataset.coluna]=el.checked; guardarColunas(); }
      else return;
      render();
    }
    function input(event) {
      const el=event.target;
      if(el.name==='nome') el.setCustomValidity('');
      if(el.type!=='search' || !el.dataset.filter) return;
      const cursor=el.selectionStart; state[el.dataset.filter]=el.value; render(`[data-filter="${el.dataset.filter}"]`);
      try { content.querySelector(`[data-filter="${el.dataset.filter}"]`).setSelectionRange(cursor,cursor); } catch(_) {}
    }
    function dragstart(event) { const card=event.target.closest('[data-drag]'); if(!card || !canEdit() || busy) {event.preventDefault();return;} dragId=card.dataset.drag; event.dataTransfer.setData('text/plain',dragId); event.dataTransfer.effectAllowed='move'; }
    function dragover(event) { if(event.target.closest('[data-drop]') && dragId && canEdit() && !busy) event.preventDefault(); }
    function drop(event) { const column=event.target.closest('[data-drop]'); if(column && dragId && canEdit() && !busy) {event.preventDefault(); save([dragId],{status:column.dataset.drop});} dragId=null; }
    const handlers={click,change,input,submit:enviar,dragstart,dragover,drop,dragend:()=>{dragId=null;}};
    Object.entries(handlers).forEach(([name,fn])=>shell.addEventListener(name,fn)); render();
    return { update(next={}) {
      if(next.data) {
        if(dialog.open) dialog.close();
        dialog.innerHTML='';
        if(next.data.usuarioAtual !== data.usuarioAtual) {
          selected.clear(); expanded.clear(); collapsed.clear(); notice='';
          Object.assign(state,{query:'',project:'',status:'',company:'',sprint:'',late:false,requestType:'',filtros:false,mes:''});
        }
        data=copy(next.data);
      }
      if ('requestType' in next) state.requestType=next.requestType || '';
      settings={...settings,...next}; render();
    }, destroy() {dead=true;if(dialog.open) dialog.close();Object.entries(handlers).forEach(([name,fn])=>shell.removeEventListener(name,fn));shell.remove();} };
  }
  WB.workspace={mount,filterTasks,outline,commit,validDate};
})();
