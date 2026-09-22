/* Projetos — regras compartilhadas pelo catálogo, ficha, cronograma e painel. */
(function () {
  'use strict';
  const WB = window.WB;
  const all = () => [...new Map([...(WB.data.projetos || []), ...(WB.data.projetosArquivados || [])].map(p => [p.id, p])).values()];
  const active = p => p && !['concluido', 'arquivado'].includes(p.status);
  const closed = d => WB.demandaFechada ? WB.demandaFechada(d) : ['concluida', 'aprovada'].includes(d.status);
  const fold = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  function validDate(v) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return false;
    const [y,m,d] = v.split('-').map(Number); return iso(new Date(y,m-1,d)) === v;
  }
  const uid = prefix => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  const user = () => (WB.data.pessoas || []).find(p => p.id === WB.data.usuarioAtual);
  const canManage = () => ['admin','diretoria'].includes(user()?.papel);
  function visible(p) {
    if (!user() || !p) return false;
    if (WB.operacoesVisiveis) return WB.operacoesVisiveis().includes('grupo') || WB.operacoesVisiveis().includes(p.empresa);
    return true;
  }
  function scope() { const op = WB.operacaoAtual?.(); return op && op !== 'grupo' ? op : ''; }
  function projects(filters = {}) {
    return all().filter(p => visible(p) && (!filters.company || p.empresa === filters.company) &&
      (!filters.project || p.id === filters.project) &&
      (!filters.situation || filters.situation === 'todos' || (filters.situation === 'ativos' ? active(p) : p.status === (filters.situation === 'concluidos' ? 'concluido' : 'arquivado'))) &&
      fold(`${p.nome} ${p.resumo || ''}`).includes(fold(filters.query)));
  }
  function find(id) { const p = all().find(x => x.id === id); if (!visible(p)) throw new Error('Projeto não disponível para esta conta.'); return p; }
  function writable(id) { const p = find(id); if (!active(p)) throw new Error('Reabra o projeto antes de alterar seus registros.'); return p; }
  function manager() { if (!canManage()) throw new Error('Esta alteração é feita pela administração.'); }
  function persist() {
    WB.store?.set('pm.projetos', { ativos: WB.data.projetos, arquivados: WB.data.projetosArquivados });
    WB.store?.set('demandas', WB.data.demandas);
    WB.store?.set('pm.reports', WB.data.statusReports || []);
  }
  /* Migra marcos legados sem adivinhar correspondências pelo nome. O id do
     vínculo é estável; repetir a inicialização não duplica demanda. */
  function migrate() {
    all().forEach(p => {
      ['marcos','documentos','decisoes','riscos'].forEach(k => { if (!Array.isArray(p[k])) p[k] = []; });
      ['documentos','decisoes','riscos'].forEach(k=>p[k].forEach((r,i)=>{if(!r.id)r.id=`${k}:${p.id}:${i+1}`;}));
      p.marcos.forEach((m,i) => {
        m.id = m.id || 'mc' + (i+1);
        // A semente já contém o marco de abertura do Bioma como dm06.
        // Vínculo explícito por ID; não comparamos títulos editáveis.
        const seedLink=p.id==='p1' && m.id==='mc4' && WB.data.demandas.some(d=>d.id==='dm06'&&d.projeto==='p1'&&d.tipo==='marco') ? 'dm06' : '';
        m.demandaId = m.demandaId || seedLink || `pm:${p.id}:${m.id}`;
        if (!WB.data.demandas.some(d => d.id === m.demandaId)) WB.data.demandas.push({
          id:m.demandaId, nome:m.nome, projeto:p.id, tipo:'marco', responsavel:p.responsavel,
          criador:p.responsavel, inicio:p.inicio, prazo:m.prazo, status:m.status || 'afazer', prioridade:'media', descricao:'', origemMarco:m.id
        });
      });
    });
  }
  function load() {
    const saved = WB.store?.get('pm.projetos', null);
    if (saved && Array.isArray(saved.ativos) && Array.isArray(saved.arquivados)) {
      const records = new Map(all().map(p => [p.id,p]));
      [...saved.ativos,...saved.arquivados].forEach(p => { if(p?.id) records.set(p.id,p); });
      // Mutate the arrays in place: legacy WB.projeto closes over these arrays.
      WB.data.projetos.splice(0,WB.data.projetos.length,...[...records.values()].filter(active));
      WB.data.projetosArquivados.splice(0,WB.data.projetosArquivados.length,...[...records.values()].filter(p=>!active(p)));
    }
    const reports = WB.store?.get('pm.reports', null);
    if (Array.isArray(reports)) WB.data.statusReports = reports;
    const deleted=new Set(WB.store?.get('pm.deletedTasks',[]) || []);
    WB.data.demandas=WB.data.demandas.filter(d=>!deleted.has(d.id));
    migrate();
  }
  function tasks(filters = {}) {
    const ids = new Set(projects(filters).map(p=>p.id));
    const sprint = filters.sprint === 'atual' ? WB.data.sprints.find(s=>s.atual)?.id : filters.sprint;
    return WB.data.demandas.filter(d=>ids.has(d.projeto) && (!filters.sprint || (sprint && d.sprint === sprint)));
  }
  function milestones(p) {
    return (p.marcos || []).map(m => { const d=WB.data.demandas.find(x=>x.id===m.demandaId); return d ? {...m,nome:d.nome,prazo:d.prazo,status:d.status,inicio:d.inicio} : m; });
  }
  function validateParent(candidate, id) {
    const expected = { marco:[], entregavel:['marco'], tarefa:['marco','entregavel'], subtarefa:['tarefa'] };
    if (!Object.hasOwn(expected,candidate.tipo)) throw new Error('Tipo de demanda inválido.');
    if (!candidate.pai) {
      if (['tarefa','subtarefa'].includes(candidate.tipo)) throw new Error('Selecione o item pai desta demanda.');
      return;
    }
    const parent=WB.data.demandas.find(d=>d.id===candidate.pai);
    if(!parent || parent.projeto!==candidate.projeto || !expected[candidate.tipo].includes(parent.tipo)) throw new Error('O item pai deve ser de tipo compatível e do mesmo projeto.');
    const seen=new Set(id?[id]:[]); let item=parent;
    while(item) { if(seen.has(item.id)) throw new Error('O vínculo criaria um ciclo.'); seen.add(item.id); item=WB.data.demandas.find(d=>d.id===item.pai); }
  }
  function updateTask(ids, changes) {
    const keys=Object.keys(changes), permitted=['status','prazo','inicio','nome','descricao','tipo','responsavel','prioridade','pai'];
    if(!keys.length || keys.some(k=>!permitted.includes(k))) throw new Error('Campo não permitido.');
    if('prazo' in changes && changes.prazo!=='' && !validDate(changes.prazo)) throw new Error('Informe um prazo válido.');
    if('inicio' in changes && changes.inicio!=='' && !validDate(changes.inicio)) throw new Error('Informe um início válido.');
    if('nome' in changes && !String(changes.nome||'').trim()) throw new Error('Informe o nome da demanda.');
    if('tipo' in changes && !Object.hasOwn(WB.TIPOS_DEMANDA,changes.tipo)) throw new Error('Tipo inválido.');
    if('status' in changes && !Object.hasOwn(WB.STATUS_DEMANDA,changes.status)) throw new Error('Situação inválida.');
    if('prioridade' in changes && !['baixa','media','alta'].includes(changes.prioridade)) throw new Error('Prioridade inválida.');
    if('responsavel' in changes && !WB.data.pessoas.some(p=>p.id===changes.responsavel)) throw new Error('Responsável inválido.');
    const rows=[...new Set(ids)].map(id=>WB.data.demandas.find(d=>d.id===id));
    if(!rows.length || rows.some(d=>!d)) throw new Error('Demanda não encontrada.');
    rows.forEach(d=>{
      writable(d.projeto);
      const permission=WB.podeEditarDemanda(d,user()); if(!permission.pode) throw new Error(permission.motivo);
      const candidate={...d,...changes};
      if(candidate.prazo && candidate.inicio && candidate.prazo<candidate.inicio) throw new Error('O prazo não pode ser anterior ao início.');
      if('tipo' in changes && !WB.TIPOS_DEMANDA[changes.tipo].de.includes(user()?.papel)) throw new Error('Seu perfil não pode criar este tipo de demanda.');
      if('pai' in changes || 'tipo' in changes) validateParent(candidate,d.id);
      if('tipo' in changes && changes.tipo!==d.tipo) {
        const allowed={marco:[],entregavel:['marco'],tarefa:['marco','entregavel'],subtarefa:['tarefa']};
        if(WB.data.demandas.some(child=>child.pai===d.id && !(allowed[child.tipo]||[]).includes(changes.tipo))) throw new Error('Vincule os subitens a um pai compatível antes de trocar o tipo.');
      }
    });
    rows.forEach(d=>{ Object.assign(d,changes); if('status' in changes) d.concluidaEm=closed(d)?(d.concluidaEm || iso(new Date())):''; });
    all().forEach(p=>(p.marcos||[]).forEach(m=>{const d=rows.find(x=>x.id===m.demandaId);if(d){m.nome=d.nome;m.prazo=d.prazo;m.status=d.status;}}));
    persist();
    rows.forEach(d=>WB.avisarCriador?.(d,'alterou'));
    return true;
  }
  function deleteTask(id) {
    const d=WB.data.demandas.find(d=>d.id===id);if(!d)throw new Error('Demanda não encontrada.');
    writable(d.projeto);const permission=WB.podeEditarDemanda(d,user());if(!permission.pode)throw new Error(permission.motivo);
    const deleted=new Set(WB.store?.get('pm.deletedTasks',[]) || []);deleted.add(id);
    WB.store?.set('pm.deletedTasks',[...deleted]);
    WB.data.demandas=WB.data.demandas.filter(d=>d.id!==id).map(child=>child.pai===id?{...child,pai:''}:child);
    const p=find(d.projeto);p.marcos=p.marcos.filter(m=>m.demandaId!==id);
    persist();WB.avisarCriador?.(d,'apagou');return true;
  }
  function createTask(v) {
    writable(v.projeto);
    const kind=WB.TIPOS_DEMANDA[v.tipo];
    if(!kind || !kind.de.includes(user()?.papel)) throw new Error('Seu perfil não pode criar este tipo de demanda.');
    if(!String(v.nome||'').trim() || !validDate(v.prazo)) throw new Error('Preencha nome e prazo válido.');
    if(v.inicio && (!validDate(v.inicio) || v.inicio>v.prazo)) throw new Error('Revise o início e o prazo.');
    if(!WB.data.pessoas.some(p=>p.id===v.responsavel)) throw new Error('Selecione um responsável.');
    if(v.sprint && !WB.data.sprints.some(s=>s.id===v.sprint)) throw new Error('Sprint inválida.');
    validateParent(v);
    const d={id:uid('dm'),nome:v.nome.trim(),tipo:v.tipo,projeto:v.projeto,pai:v.pai||'',responsavel:v.responsavel,
      inicio:v.inicio||'',prazo:v.prazo,prioridade:['baixa','media','alta'].includes(v.prioridade)?v.prioridade:'media',
      status:'afazer',sprint:v.sprint||'',criador:user().id,descricao:String(v.descricao||'')};
    WB.data.demandas.push(d);persist();return d;
  }
  function saveProject(id, values) {
    manager(); const p=writable(id);
    if(!String(values.nome||'').trim()) throw new Error('Informe o nome do projeto.');
    if(!validDate(values.inicio)||!validDate(values.fim)||values.inicio>values.fim) throw new Error('Revise o período do projeto.');
    if(!['normal','alta','urgente'].includes(values.prioridade)) throw new Error('Prioridade inválida.');
    if(!WB.data.pessoas.some(x=>x.id===values.responsavel)) throw new Error('Responsável inválido.');
    Object.assign(p,{nome:values.nome.trim(),resumo:values.resumo||'',inicio:values.inicio,fim:values.fim,prioridade:values.prioridade,responsavel:values.responsavel});
    persist();return p;
  }
  function closeProject(id, term, situation) {
    manager(); const p=writable(id);
    if(!['concluido','arquivado'].includes(situation)) throw new Error('Situação inválida.');
    if(!validDate(term.data)||!String(term.resultado||'').trim()) throw new Error('Preencha data e resultado do encerramento.');
    if(term.data< p.inicio || term.data>iso(new Date())) throw new Error('A data deve estar entre o início do projeto e hoje.');
    Object.assign(p,{status:situation,encerramento:{...term,autor:user().id},encerrado:term.data,resultado:term.resultado,licoes:term.licoes||''});
    WB.data.projetos.splice(WB.data.projetos.findIndex(x=>x.id===id),1);
    WB.data.projetosArquivados.push(p);persist();return p;
  }
  function reopen(id) {
    manager();const p=find(id);if(active(p))return p;
    p.status='ativo';WB.data.projetosArquivados.splice(WB.data.projetosArquivados.findIndex(x=>x.id===id),1);
    WB.data.projetos.push(p);persist();return p;
  }
  function safeURL(value) { return /^https?:\/\/[^\s]+$/i.test(String(value||'')) ? String(value) : ''; }
  function saveReport(v) {
    const p=find(v.projeto);
    if(!['admin','diretoria','head'].includes(user()?.papel) && p.responsavel!==user()?.id) throw new Error('Somente a gestão ou responsável pelo projeto registra o report.');
    if(!String(v.titulo||'').trim()||!validDate(v.data)) throw new Error('Informe título e data válidos.');
    if(v.link&&!safeURL(v.link)) throw new Error('Use um link completo HTTP ou HTTPS.');
    if(v.sprint&&!WB.data.sprints.some(s=>s.id===v.sprint)) throw new Error('Sprint inválida.');
    const record={id:uid('sr'),titulo:v.titulo.trim(),projeto:p.id,data:v.data,sprint:v.sprint||'',observacao:v.observacao||'',link:v.link||'',autor:user().id};
    (WB.data.statusReports ||= []).unshift(record);persist();return record;
  }
  function windowFor(period, reference) {
    const base=validDate(reference)?reference:iso(new Date()), [y,m,d]=base.split('-').map(Number);
    if(period==='semana') { const start=new Date(y,m-1,d);start.setDate(start.getDate()-(start.getDay()+6)%7);const end=new Date(start);end.setDate(end.getDate()+6);return {de:iso(start),ate:iso(end)}; }
    if(period==='ano')return {de:`${y}-01-01`,ate:`${y}-12-31`};
    return {de:iso(new Date(y,m-1,1)),ate:iso(new Date(y,m,0))};
  }
  WB.pm={all,active,closed,scope,projects,find,tasks,milestones,visible,canManage,validDate,iso,uid,load,migrate,persist,
    validateParent,updateTask,deleteTask,createTask,saveProject,closeProject,reopen,safeURL,saveReport,windowFor};
})();
