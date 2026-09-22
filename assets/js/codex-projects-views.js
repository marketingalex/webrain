/* Telas de Projetos: usam as regras de codex-projects.js e componentes WE. */
(function () {
  'use strict';
  const WB=window.WB, P=WB.pm, E=WB.esc;
  const states=new Map();
  const tabs=[['briefing','Briefing / TAP'],['encerramento','Termo de encerramento'],['escopo','Escopo'],['cronograma','Cronograma'],['tarefas','Tarefas'],['documentos','Documentos'],['decisoes','Decisões'],['riscos','Riscos e incidentes']];
  const controlTabs=[['dashboard','Visão geral'],['reports','Status reports'],['decisoes','Decisões'],['riscos','Riscos e incidentes']];
  const statuses=()=>Object.entries(WB.STATUS_DEMANDA);
  // Rótulos das situações de projeto e dos campos de risco: a tela não mostra código interno ("medio", "concluido").
  const ROTULOS={ativo:'Ativo',concluido:'Concluído',arquivado:'Arquivado',risco:'Risco',incidente:'Incidente',baixa:'Baixa',media:'Média',alta:'Alta',baixo:'Baixo',medio:'Médio',alto:'Alto',aberto:'Aberto',monitorado:'Monitorado',resolvido:'Resolvido'};
  const rotulo=v=>ROTULOS[v]||v||'';
  // Vencida e ainda aberta: mesma regra do contador "Atrasadas" do painel.
  const late=d=>!P.closed(d)&&P.validDate(d.prazo)&&d.prazo<P.iso(new Date());
  const person=id=>WB.pessoa(id).nome;
  const date=v=>P.validDate(v)?WB.fmtDataCurta(v):'Sem data';
  const flag=p=>{const v=WB.prioridade(p.prioridade);return `<span class="pm-flag pm-flag--${E(v.cor)}"><span aria-hidden="true">⚑</span> ${E(v.nome)}</span>`;};
  const option=(items,value)=>items.map(([id,label])=>`<option value="${E(id)}"${String(id)===String(value)?' selected':''}>${E(label)}</option>`).join('');
  const btn=(action,label,id='',extra='')=>`<button class="btn btn--sm" data-pm-action="${action}" data-id="${E(id)}" ${extra}>${label}</button>`;
  const field=(name,label,value='',type='text',required=false)=>`<label class="pm-field">${E(label)}<input class="inp" name="${name}" type="${type}" value="${E(value)}"${required?' required':''}></label>`;
  const text=(name,label,value='',required=false)=>`<label class="pm-field pm-wide">${E(label)}<textarea class="inp" name="${name}" rows="3"${required?' required':''}>${E(value)}</textarea></label>`;
  const select=(name,label,items,value='')=>`<label class="pm-field">${E(label)}<select class="inp" name="${name}">${option(items,value)}</select></label>`;
  const empty=label=>`<p class="pm-empty">${E(label)}</p>`;
  const section=(title,body,actions='')=>`<section class="card pm-section"><div class="card__head"><h2 class="card__title">${E(title)}</h2><div class="card__tools">${actions}</div></div><div class="card__body">${body}</div></section>`;
  const link=(url,label)=>P.safeURL(url)?`<a href="${E(url)}" target="_blank" rel="noopener noreferrer">${E(label)}</a>`:`<span>${E(label)} <small class="muted">(sem link)</small></span>`;
  function table(head,rows) {return rows.length?`<div class="pm-table-scroll" tabindex="0" role="region" aria-label="Registros"><table class="tbl"><thead><tr>${head.map(h=>`<th scope="col">${E(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:empty('Nenhum registro neste recorte.');}
  function state(key) {
    const k=`${WB.data.usuarioAtual}:${P.scope()}:${key}`;
    if(!states.has(k)) states.set(k,{company:P.scope(),project:'',situation:'ativos',query:'',sprint:'',period:'mes',reference:P.iso(new Date())});
    return states.get(k);
  }
  function wrapper(key,body,id='',tab='') {return `<div class="pm-page" data-pm-page="${key}" data-id="${E(id)}" data-tab="${E(tab)}">${body}</div>`;}
  const heading=(title,sub='',actions='')=>`<header class="pm-heading"><div><h1>${E(title)}</h1>${sub?`<p>${E(sub)}</p>`:''}</div><div class="pm-actions">${actions}</div></header>`;
  function filters(s,opts={}) {
    const companies=(WB.data.empresas||[]).filter(e=>P.projects({company:e.id}).length || WB.operacoesVisiveis?.().includes(e.id));
    return `<div class="pm-filters">
      ${opts.search?field('query','Buscar projeto',s.query):''}
      ${opts.fixedCompany?'':select('company','Empresa',[['','Todas as empresas'],...companies.map(e=>[e.id,e.nome])],s.company)}
      ${opts.project?select('project','Projeto',[['','Todos os projetos'],...P.projects({company:s.company}).map(p=>[p.id,p.nome])],s.project):''}
      ${opts.situation?select('situation','Situação',[['ativos','Ativos'],['concluidos','Concluídos'],['arquivados','Arquivados'],['todos','Todos']],s.situation):''}
      ${opts.sprint?select('sprint','Sprint',[['','Todas'],['atual','Sprint atual'],...WB.data.sprints.map(s=>[s.id,s.nome])],s.sprint):''}
      ${opts.period?select('period','Período',[['semana','Semana'],['mes','Mês'],['ano','Ano']],s.period)+field('reference','Data de referência',s.reference,'date'):''}
    </div>`;
  }
  function catalog(archived=false) {
    P.migrate();const key=archived?'arquivados':'catalog',s=state(key);
    if(archived && !s.initialized){s.situation='arquivados';s.initialized=true;}
    const list=P.projects(s);
    const cards=list.map(p=>{
      const ds=P.tasks({project:p.id}), done=ds.filter(P.closed).length, ratio=ds.length?Math.round(done/ds.length*100):0;
      return `<article class="pm-project card"><div class="pm-project-top">${flag(p)}<span class="muted">${E(p.status==='ativo'?'Ativo':p.status==='concluido'?'Concluído':'Arquivado')}</span></div><div class="pm-project-company">${E(WB.empresaNome(p.empresa))}</div><h2>${E(p.nome)}</h2><p>${E(p.resumo||'Sem resumo cadastrado.')}</p><div class="pm-progress"><span>${done} de ${ds.length} demandas concluídas</span><strong>${ratio}%</strong><progress max="100" value="${ratio}" aria-label="Conclusão das demandas de ${E(p.nome)}"></progress></div><dl class="pm-project-meta"><dt>Responsável</dt><dd>${E(person(p.responsavel))}</dd><dt>Entrega</dt><dd>${E(date(p.fim))}</dd></dl><a class="btn btn--primary" href="#/projeto/${encodeURIComponent(p.id)}/briefing">Ver projeto</a></article>`;
    }).join('');
    return wrapper(key,heading('Projetos',`${list.length} projetos neste recorte`,P.canManage()?btn('new-project','Novo projeto'):'')+filters(s,{search:true,situation:true})+`<div class="pm-gallery">${cards||empty('Nenhum projeto encontrado. Ajuste os filtros.')}</div>`);
  }
  const dl=rows=>`<dl class="pm-dl">${rows.map(([k,v])=>`<dt>${E(k)}</dt><dd>${Array.isArray(v)?v.map(x=>E(x)).join('<br>'):E(v||'Não informado')}</dd>`).join('')}</dl>`;
  function projectPage(id,tab='briefing') {
    P.migrate();let p;try{p=P.find(id);}catch(e){return heading('Projeto indisponível')+empty(e.message);}
    if(!tabs.some(([v])=>v===tab))tab='briefing';
    const key='project:'+id+':'+tab,s=state(key);s.project=id;s.company=p.empresa;s.situation='todos';
    const writable=P.active(p), edit=P.canManage()&&writable;
    const navigation=`<nav class="pm-tabs" aria-label="Seções do projeto">${tabs.map(([t,n])=>`<a href="#/projeto/${encodeURIComponent(id)}/${t}"${t===tab?' aria-current="page"':''}>${E(n)}</a>`).join('')}</nav>`;
    let content='';
    if(tab==='briefing') {
      const b=p.briefing||{};
      content=section('Briefing / TAP',dl([['Contexto',b.contexto],['Objetivo',b.objetivo],['Escopo incluso',b.escopoIncluso],['Fora do escopo',b.escopoExcluso],['Premissas',b.premissas],['Restrições',b.restricoes],['Patrocinador',person(b.patrocinador)],['Gerente',person(b.gerente)],['Critério de entrega',b.criterios]]),edit?btn('briefing','Editar briefing',id):'');
    } else if(tab==='encerramento') {
      const term=p.encerramento;
      content=section('Termo de encerramento',term?dl(Object.entries(term).map(([k,v])=>[({data:'Data',resultado:'Resultado',licoes:'Lições aprendidas',pendencias:'Pendências',autor:'Registrado por',aceite:'Aceite',aprovador:'Aprovador',entregas:'Entregas realizadas'})[k]||k,k==='autor'?person(v):v])):empty('O projeto ainda não possui termo de encerramento.'),P.canManage()?(writable?btn('close','Registrar encerramento',id):btn('reopen','Reabrir projeto',id)):'');
      if(!writable)content+=empty('Briefing, documentos, decisões, riscos e demandas foram preservados.');
    } else if(tab==='escopo') {
      const ds=P.tasks({project:id}).filter(d=>['marco','entregavel'].includes(d.tipo));
      content=section('Marcos e entregáveis',taskTable(ds,writable),edit?btn('task','Adicionar marco ou entregável',id):'');
      const legacy=P.milestones(p).filter(m=>m.entregaveis?.length);
      if(legacy.length)content+=section('Entregas previstas no briefing',dl(legacy.map(m=>[m.nome,m.entregaveis])));
    } else if(tab==='cronograma') content=filters(s,{period:true,sprint:true,fixedCompany:true})+timeline(s);
    else if(tab==='tarefas') content=section('Tarefas do projeto',taskTable(P.tasks({project:id}),writable),writable?btn('task','Nova demanda',id):'');
    else content=records(p,tab,edit);
    return wrapper(key,heading(p.nome,`${WB.empresaNome(p.empresa)} · ${date(p.inicio)} a ${date(p.fim)}`,flag(p)+(edit?btn('project','Editar projeto',id):''))+navigation+content,id,tab);
  }
  function taskTable(rows,writable=true) {
    return table(['Demanda / vínculo','Tipo','Responsável','Situação','Prazo'],rows.map(d=>{
      const allowed=writable&&P.active(P.find(d.projeto))&&WB.podeEditarDemanda(d).pode;
      const parent=WB.data.demandas.find(x=>x.id===d.pai);
      return [`${E(d.nome)}${parent?`<small class="pm-parent">↳ ${E(parent.nome)}</small>`:''}${allowed?btn('parent','Vincular',d.id):''}`,E(WB.TIPOS_DEMANDA[d.tipo]?.nome||d.tipo),E(person(d.responsavel)),allowed?`<select class="inp" aria-label="Situação de ${E(d.nome)}" data-pm-task="${E(d.id)}" data-field="status">${option(statuses(),d.status)}</select>`:E(WB.STATUS_DEMANDA[d.status]||d.status),allowed?`<input class="inp" aria-label="Prazo de ${E(d.nome)}" type="date" value="${E(d.prazo)}" data-pm-task="${E(d.id)}" data-field="prazo">`:E(date(d.prazo))];
    }));
  }
  function records(p,type,edit) {
    const entries=p[type]||[];const labels={documentos:'Documentos e atalhos',decisoes:'Log de decisões',riscos:'Riscos e incidentes'};
    const rows=entries.map(r=>{
      const action=edit?btn('record','Editar',p.id,`data-kind="${type}" data-record="${E(r.id)}"`):'';
      if(type==='documentos')return [link(r.link,r.nome),E(r.tipo||'Documento'),E(r.versao||'—'),E(date(r.atualizado)),action];
      if(type==='decisoes')return [E(date(r.data)),E(r.decisao),E(r.porque||''),E(person(r.autor)),E(r.impacto||''),action];
      return [E(rotulo(r.tipo||'risco')),E(r.titulo),E(rotulo(r.probabilidade)),E(rotulo(r.impacto)),E(r.resposta||''),E(person(r.dono)),E(rotulo(r.status)),action];
    });
    return section(labels[type],table(type==='documentos'?['Documento','Tipo','Versão','Atualizado','Ação']:type==='decisoes'?['Data','Decisão','Motivo','Autor','Impacto','Ação']:['Tipo','Registro','Probabilidade','Impacto','Resposta','Responsável','Situação','Ação'],rows),edit?btn('record','Adicionar',p.id,`data-kind="${type}"`):'');
  }
  function timeline(s) {
    const range=P.windowFor(s.period,s.reference), rows=P.tasks(s);
    const days=v=>{const [y,m,d]=v.split('-').map(Number);return Date.UTC(y,m-1,d)/86400000;};
    const start=days(range.de), span=days(range.ate)-start+1;
    const visible=rows.filter(d=>P.validDate(d.prazo)&&d.prazo>=range.de&&(P.validDate(d.inicio)?d.inicio:d.prazo)<=range.ate);
    const bars=visible.map(d=>{
      const a=Math.max(start,days(P.validDate(d.inicio)?d.inicio:d.prazo)), b=Math.min(days(range.ate),days(d.prazo));
      return `<div class="pm-timeline-row"><div><strong>${E(d.nome)}</strong><small>${E(P.find(d.projeto).nome)} · ${E(WB.STATUS_DEMANDA[d.status]||d.status)}${late(d)?' · <span class="pm-late">atrasada</span>':''}</small></div><div class="pm-track"><span class="pm-bar${P.closed(d)?' pm-bar--done':late(d)?' pm-bar--late':''}" style="left:${(a-start)/span*100}%;width:${Math.max(0.5,(b-a+1)/span*100)}%" title="${E(date(d.inicio))} a ${E(date(d.prazo))}"></span></div><time>${E(date(d.prazo))}</time></div>`;
    }).join('');
    return section(`Cronograma · ${date(range.de)} a ${date(range.ate)}`,`<div class="pm-timeline" tabindex="0" role="region" aria-label="Linha do tempo"><div class="pm-timeline-scale"><span>Demanda</span><span>${E(date(range.de))}<span>${E(date(range.ate))}</span></span><span>Prazo</span></div>${bars||empty('Nenhuma demanda neste período.')}</div><p class="muted">${rows.filter(d=>!P.validDate(d.prazo)).length} demandas sem prazo válido ficam fora da linha do tempo.</p>`)+section('Prazos e situações',taskTable(visible));
  }
  function schedule(projectId) {
    P.migrate();const s=state('schedule');if(s.routeProject!==projectId){s.project=projectId||'';s.routeProject=projectId;}
    return wrapper('schedule',heading('Cronograma geral','Prazos compartilhados com o quadro de demandas.')+filters(s,{project:true,period:true,sprint:true,situation:true})+timeline(s));
  }
  function control(tab='dashboard') {
    P.migrate();if(!controlTabs.some(([t])=>t===tab))tab='dashboard';
    const s=state('control');if(!s.initialized){s.situation='todos';s.initialized=true;}
    const ps=P.projects(s),ids=new Set(ps.map(p=>p.id)),ds=P.tasks(s);
    const nav=`<nav class="pm-tabs" aria-label="Painel de controle">${controlTabs.map(([t,n])=>`<a href="#/painel-controle/${t}"${t===tab?' aria-current="page"':''}>${n}</a>`).join('')}</nav>`;
    let body='';
    if(tab==='dashboard')body=`<div class="pm-summary">${[['Projetos',ps.length],['Demandas abertas',ds.filter(d=>!P.closed(d)).length],['Atrasadas',ds.filter(d=>!P.closed(d)&&P.validDate(d.prazo)&&d.prazo<P.iso(new Date())).length],['Riscos abertos',ps.flatMap(p=>p.riscos||[]).filter(r=>r.status==='aberto').length]].map(([label,n])=>`<div class="card"><span>${label}</span><strong>${n}</strong></div>`).join('')}</div>`+section('Projetos no recorte',table(['Projeto','Situação','Responsável','Demandas concluídas'],ps.map(p=>{const tasks=ds.filter(d=>d.projeto===p.id);return [`<a href="#/projeto/${encodeURIComponent(p.id)}">${E(p.nome)}</a>`,E(rotulo(p.status)),E(person(p.responsavel)),`${tasks.filter(P.closed).length} / ${tasks.length}`];})));
    else if(tab==='reports') {
      const sprint=s.sprint==='atual'?WB.data.sprints.find(x=>x.atual)?.id:s.sprint;
      const reports=(WB.data.statusReports||[]).filter(r=>ids.has(r.projeto)&&(!s.sprint||r.sprint===sprint)).sort((a,b)=>b.data.localeCompare(a.data));
      body=section('Status reports registrados',table(['Report','Projeto','Sprint','Data','Autor','Observação'],reports.map(r=>[link(r.link,r.titulo),E(P.find(r.projeto).nome),E(WB.data.sprints.find(s=>s.id===r.sprint)?.nome||'Sem sprint'),E(date(r.data)),E(person(r.autor)),E(r.observacao||'')])),btn('report','Registrar status report'));
    } else {
      const list=ps.flatMap(p=>(p[tab]||[]).map(r=>({...r,projeto:p.nome,projetoId:p.id}))).sort((a,b)=>String(b.data).localeCompare(String(a.data)));
      body=section(tab==='decisoes'?'Decisões de projetos ativos e encerrados':'Riscos e incidentes de projetos ativos e encerrados',table(['Projeto','Data',tab==='decisoes'?'Decisão':'Registro','Responsável',tab==='decisoes'?'Motivo':'Resposta / situação'],list.map(r=>[`<a href="#/projeto/${encodeURIComponent(r.projetoId)}/${tab}">${E(r.projeto)}</a>`,E(date(r.data)),E(r.decisao||r.titulo),E(person(r.autor||r.dono)),E(tab==='decisoes'?r.porque:[r.resposta,rotulo(r.status)].filter(Boolean).join(' · '))])));
    }
    return wrapper('control',heading('Painel de controle')+nav+filters(s,{project:true,situation:true,sprint:tab==='dashboard'||tab==='reports'})+body,'',tab);
  }
  function popup(title,fields,save,choosing=false) {
    const ov=WB.abrirPopup({titulo:title,largo:true,corpo:`<form class="pm-form">${fields}<p class="pm-form-error pm-wide" role="alert"></p><div class="pm-actions pm-wide"><button type="button" class="btn" data-fechar>Cancelar</button><button class="btn btn--primary" type="submit">${choosing?'Continuar':'Salvar'}</button></div></form>`});
    ov.querySelector('form').addEventListener('submit',event=>{
      event.preventDefault();const form=event.target;if(!form.reportValidity())return;
      try{save(Object.fromEntries(new FormData(form)));WB.fecharPopup();if(!choosing){WB.rerender?.();WB.toast('Registro salvo neste navegador.');}}
      catch(error){form.querySelector('[role=alert]').textContent=error.message;}
    });return ov;
  }
  const people=()=>WB.data.pessoas.map(p=>[p.id,p.nome]);
  function taskPopup(projectId) {
    const p=P.find(projectId), role=WB.eu().papel;
    const types=Object.entries(WB.TIPOS_DEMANDA).filter(([,v])=>v.de.includes(role)).map(([id,v])=>[id,v.nome]);
    const ov=popup('Nova demanda',field('nome','Nome','','text',true)+select('tipo','Tipo',types,types[0]?.[0])+select('pai','Item pai',[['','Sem vínculo']])+select('responsavel','Responsável',people(),WB.data.usuarioAtual)+field('inicio','Início','','date')+field('prazo','Prazo','','date',true)+select('prioridade','Prioridade',[['baixa','Baixa'],['media','Média'],['alta','Alta']],'media')+select('sprint','Sprint',[['','Sem sprint'],...WB.data.sprints.map(s=>[s.id,s.nome])],WB.sprintAtual()?.id||'')+text('descricao','Descrição'),v=>P.createTask({...v,projeto:p.id}));
    const kind=ov.querySelector('[name=tipo]'),parent=ov.querySelector('[name=pai]');
    const refresh=()=>{const map={marco:[],entregavel:['marco'],tarefa:['marco','entregavel'],subtarefa:['tarefa']};parent.innerHTML=option([['','Selecione'],...P.tasks({project:projectId}).filter(d=>map[kind.value].includes(d.tipo)).map(d=>[d.id,d.nome])],'');parent.required=['tarefa','subtarefa'].includes(kind.value);};
    kind.addEventListener('change',refresh);refresh();
  }
  function newTask(projectId) {
    if (projectId) return taskPopup(projectId);
    if(!P.projects({situation:'ativos'}).length)return WB.toast('Cadastre um projeto ativo antes de criar demandas.','erro');
    return popup('Escolher projeto',select('projeto','Projeto',P.projects({situation:'ativos'}).map(p=>[p.id,p.nome])),v=>{
      P.find(v.projeto);
      // Wait until the chooser closes before mounting the next modal.
      setTimeout(()=>taskPopup(v.projeto),0);
    },true);
  }
  function action(button) {
    const {pmAction:a,id,kind,record}=button.dataset;
    if(a==='new-project')return WB.abrirProjeto();
    if(a==='task')return taskPopup(id);
    if(a==='parent'){
      const d=WB.data.demandas.find(d=>d.id===id);if(!d)return;
      const compatible=P.tasks({project:d.projeto}).filter(p=>{try{P.validateParent({...d,pai:p.id},id);return true;}catch(_){return false;}});
      return popup('Vincular demanda',select('pai','Item pai',[['','Sem vínculo'],...compatible.map(p=>[p.id,p.nome])],d.pai),v=>P.updateTask([id],{pai:v.pai}));
    }
    if(a==='report')return popup('Registrar status report',select('projeto','Projeto',P.projects().map(p=>[p.id,p.nome]))+field('titulo','Título','','text',true)+select('sprint','Sprint',[['','Sem sprint'],...WB.data.sprints.map(s=>[s.id,s.nome])])+field('data','Data',P.iso(new Date()),'date',true)+field('link','Link do documento','','url')+text('observacao','Resumo / próximos passos'),P.saveReport);
    const p=P.find(id);
    if(a==='project')return popup('Editar projeto',field('nome','Nome',p.nome,'text',true)+select('prioridade','Prioridade',WB.PRIORIDADES.map(v=>[v.id,v.nome]),p.prioridade)+select('responsavel','Responsável',people(),p.responsavel)+field('inicio','Início',p.inicio,'date',true)+field('fim','Entrega',p.fim,'date',true)+text('resumo','Resumo',p.resumo),v=>P.saveProject(id,v));
    if(a==='close')return popup('Encerrar projeto',select('situacao','Situação',[['concluido','Concluído'],['arquivado','Arquivado']])+field('data','Data',P.iso(new Date()),'date',true)+text('resultado','Resultado','',true)+text('licoes','Lições aprendidas')+text('pendencias','Pendências'),v=>P.closeProject(id,{data:v.data,resultado:v.resultado,licoes:v.licoes,pendencias:v.pendencias},v.situacao));
    if(a==='reopen')return popup('Reabrir projeto',empty('O projeto voltará aos ativos. O termo anterior e todo o histórico serão mantidos.'),()=>P.reopen(id));
    if(a==='briefing') {
      const b=p.briefing||{}, fields=[['contexto','Contexto'],['objetivo','Objetivo'],['escopoIncluso','Escopo incluso (um por linha)'],['escopoExcluso','Fora do escopo (um por linha)'],['premissas','Premissas (uma por linha)'],['restricoes','Restrições (uma por linha)'],['criterios','Critério de entrega']];
      return popup('Editar briefing',fields.map(([key,label])=>text(key,label,Array.isArray(b[key])?b[key].join('\n'):b[key]||'')).join('')+select('patrocinador','Patrocinador',[['','Não definido'],...people()],b.patrocinador)+select('gerente','Gerente',[['','Não definido'],...people()],b.gerente),v=>{
        if(!P.canManage()||!P.active(P.find(id)))throw new Error('Edição não permitida.');
        ['escopoIncluso','escopoExcluso','premissas','restricoes'].forEach(k=>{v[k]=v[k].split('\n').map(x=>x.trim()).filter(Boolean);});p.briefing={...b,...v};P.persist();
      });
    }
    if(a==='record') {
      if(!['documentos','decisoes','riscos'].includes(kind))return;
      const r=(p[kind]||[]).find(x=>x.id===record)||{};let fields='';
      if(kind==='documentos')fields=field('nome','Nome',r.nome,'text',true)+select('tipo','Tipo',[['Documento','Documento'],['Planilha','Planilha'],['Atalho','Atalho']],r.tipo)+field('versao','Versão',r.versao)+field('atualizado','Atualizado',r.atualizado||P.iso(new Date()),'date',true)+field('link','Link',P.safeURL(r.link),'url');
      if(kind==='decisoes')fields=field('data','Data',r.data||P.iso(new Date()),'date',true)+text('decisao','Decisão',r.decisao,true)+text('porque','Motivo',r.porque)+select('impacto','Impacto',[['baixo','Baixo'],['medio','Médio'],['alto','Alto']],r.impacto);
      if(kind==='riscos')fields=select('tipo','Tipo',[['risco','Risco'],['incidente','Incidente']],r.tipo)+field('titulo','Título',r.titulo,'text',true)+select('probabilidade','Probabilidade',[['baixa','Baixa'],['media','Média'],['alta','Alta']],r.probabilidade)+select('impacto','Impacto',[['baixo','Baixo'],['medio','Médio'],['alto','Alto']],r.impacto)+select('dono','Responsável',people(),r.dono)+select('status','Situação',[['aberto','Aberto'],['monitorado','Monitorado'],['resolvido','Resolvido']],r.status)+text('resposta','Resposta',r.resposta);
      return popup('Editar '+({documentos:'documento',decisoes:'decisão',riscos:'risco ou incidente'}[kind]),fields,v=>{
        if(!P.canManage()||!P.active(P.find(id)))throw new Error('Edição não permitida.');
        if(v.link&&!P.safeURL(v.link))throw new Error('Use um link HTTP ou HTTPS.');
        if((v.data&&!P.validDate(v.data))||(v.atualizado&&!P.validDate(v.atualizado)))throw new Error('Data inválida.');
        const updated={...r,...v,id:r.id||P.uid(kind),autor:r.autor||WB.data.usuarioAtual,data:v.data||r.data||P.iso(new Date())};
        const index=p[kind].findIndex(x=>x.id===r.id);if(index<0)p[kind].push(updated);else p[kind][index]=updated;P.persist();
      });
    }
  }
  document.addEventListener('click',event=>{const b=event.target.closest('[data-pm-action]');if(!b)return;try{action(b);}catch(error){WB.toast(error.message,'erro');}});
  document.addEventListener('change',event=>{
    const el=event.target,root=el.closest('[data-pm-page]');if(!root)return;
    if(el.dataset.pmTask){try{P.updateTask([el.dataset.pmTask],{[el.dataset.field]:el.value});WB.rerender();}catch(error){WB.toast(error.message,'erro');WB.rerender();}return;}
    if(!el.closest('.pm-filters')||!el.name)return;
    const s=state(root.dataset.pmPage);s[el.name]=el.value;if(el.name==='company')s.project='';WB.rerender();
  });
  WB.views.projetos=()=>catalog();
  WB.views.projetosArquivados=id=>id?projectPage(id,'encerramento'):catalog(true);
  WB.views.projeto=projectPage;WB.views.cronograma=schedule;WB.views.painelControle=control;
  WB.pmViews={catalog,projectPage,schedule,control,taskPopup,newTask};
  WB.abrirDemanda=preset=>newTask(preset?.projeto);
  // Filtros e abas substituem os subitens de projetos na lateral.
  Object.values(WB.operacoes || {}).forEach(op=>{
    const original=op.itens;if(typeof original!=='function')return;
    op.itens=()=>original().map(branch=>{
      if(!/demandas e projetos/i.test(branch.nome || ''))return branch;
      return {...branch,itens:[{rota:'projetos',nome:'Projetos'},{rota:'cronograma',nome:'Cronograma geral'},{rota:'painel-controle/dashboard',nome:'Painel de controle'}]};
    });
  });
})();
