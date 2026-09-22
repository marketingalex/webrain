const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const dir=path.join(__dirname,'../assets/js');
function portal(memory=new Map()) {
  const document={addEventListener(){},querySelectorAll(){return[];},querySelector(){return null;}};
  const c={window:{},document,localStorage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},console,setTimeout};
  for(const file of ['data.js','ui.js','charts.js','views.js','operacoes.js','codex-projects.js','codex-projects-views.js']) vm.runInNewContext(fs.readFileSync(path.join(dir,file),'utf8'),c,{filename:file});
  const W=c.window.WB;W.data.usuarioAtual=W.data.pessoas.find(p=>p.papel==='admin').id;
  W.definirOperacao('grupo');W.pm.load();return W;
}
test('Migração de marcos é idempotente e usa vínculo explícito por projeto',()=>{
  const W=portal();const count=W.data.demandas.length;W.pm.migrate();W.pm.migrate();assert.equal(W.data.demandas.length,count);
  const p=W.pm.all()[0],m=p.marcos[0],d=W.data.demandas.find(d=>d.id===m.demandaId);
  assert.equal(d.projeto,p.id);assert.equal(d.tipo,'marco');assert.equal(d.nome,m.nome);
  assert.equal(W.pm.find('p1').marcos.find(m=>m.id==='mc4').demandaId,'dm06');
});
test('Prazo editado no cronograma aparece na demanda e no marco após recarga',()=>{
  const mem=new Map(),W=portal(mem),p=W.pm.all()[0],m=p.marcos[0];
  W.pm.updateTask([m.demandaId],{prazo:'2028-01-10',status:'aprovada'});
  assert.equal(W.pm.milestones(p)[0].prazo,'2028-01-10');assert.equal(W.pm.closed(W.data.demandas.find(d=>d.id===m.demandaId)),true);
  // Host rehydrates demandas first, as app.js does via fase2.
  const next=portal(mem);const saved=next.store.get('demandas',[]);next.data.demandas=saved;next.pm.load();
  assert.equal(next.pm.milestones(next.pm.find(p.id))[0].prazo,'2028-01-10');
});
test('Lote inválido não altera nenhuma demanda e respeita permissões',()=>{
  const W=portal(),d=W.data.demandas[0],before=JSON.stringify(W.data.demandas);
  assert.throws(()=>W.pm.updateTask([d.id,'missing'],{status:'concluida'}));assert.equal(JSON.stringify(W.data.demandas),before);
  W.data.usuarioAtual=W.data.pessoas.find(p=>p.papel==='analista').id;
  const m=W.data.demandas.find(d=>d.tipo==='marco');assert.throws(()=>W.pm.updateTask([m.id],{prazo:'2028-01-10'}));assert.equal(JSON.stringify(W.data.demandas),before);
});
test('Campos da ficha e datas usam a mesma validação na integração',()=>{
  const W=portal(),d=W.data.demandas.find(d=>d.tipo==='tarefa');
  W.pm.updateTask([d.id],{nome:'Nome atualizado',descricao:'Orientação',inicio:'2026-01-01',prazo:'2027-01-01'});
  assert.equal(d.nome,'Nome atualizado');assert.throws(()=>W.pm.updateTask([d.id],{inicio:'2028-01-01'}));
  assert.throws(()=>W.pm.updateTask([d.id],{nome:' '}));
});
test('Excluir marco preserva filhos e não o recria ao recarregar a semente',()=>{
  const mem=new Map(),W=portal(mem),p=W.data.projetos[0],m=p.marcos[0];
  const child=W.pm.createTask({nome:'Entrega filha',tipo:'entregavel',projeto:p.id,pai:m.demandaId,responsavel:W.data.usuarioAtual,prazo:'2028-01-01'});
  W.pm.deleteTask(m.demandaId);assert.ok(W.data.demandas.some(d=>d.id===child.id));assert.equal(W.data.demandas.find(d=>d.id===child.id).pai,'');
  const next=portal(mem);assert.equal(next.data.demandas.some(d=>d.id===m.demandaId),false);assert.equal(next.pm.find(p.id).marcos.some(x=>x.id===m.id),false);
});
test('Hierarquia permite a cadeia e recusa pai de outro projeto ou ciclo',()=>{
  const W=portal(),P=W.pm,p=P.projects({situation:'ativos'})[0];
  const make=(tipo,pai)=>P.createTask({projeto:p.id,nome:tipo,tipo,pai,responsavel:W.data.usuarioAtual,prazo:'2028-01-10'});
  const m=make('marco'),e=make('entregavel',m.id),t=make('tarefa',e.id),s=make('subtarefa',t.id);
  assert.equal(s.pai,t.id);assert.throws(()=>make('subtarefa',e.id));assert.throws(()=>make('tarefa'));
  assert.throws(()=>P.validateParent({...s,projeto:'outro'}));assert.throws(()=>P.validateParent({...t,pai:t.id},t.id));
});
test('Encerramento preserva ficha completa e não duplica projetos na recarga',()=>{
  const mem=new Map(),W=portal(mem),p=W.pm.projects({situation:'ativos'})[0],decisions=p.decisoes.length;
  W.pm.closeProject(p.id,{data:W.d(0),resultado:'Entregue',licoes:'Registro de aprendizado'},'concluido');
  assert.equal(W.pm.find(p.id).decisoes.length,decisions);assert.equal(W.data.projetos.some(x=>x.id===p.id),false);
  const next=portal(mem);next.pm.load();assert.equal(next.pm.all().filter(x=>x.id===p.id).length,1);
  assert.equal(next.pm.find(p.id).status,'concluido');assert.match(next.pmViews.projectPage(p.id,'encerramento'),/Registro de aprendizado/);
  next.pm.reopen(p.id);assert.equal(next.pm.find(p.id).encerramento.resultado,'Entregue');
});
test('Filtros combinam empresa, situação e busca; conta vê apenas sua operação',()=>{
  const W=portal();assert.ok(W.pm.projects({company:'weinc',situation:'ativos'}).every(p=>p.empresa==='weinc'&&W.pm.active(p)));
  assert.equal(W.pm.projects({query:'NUNCA_EXISTE'}).length,0);
  const u=W.data.pessoas.find(p=>p.papel==='analista');W.data.usuarioAtual=u.id;
  assert.ok(W.pm.projects().every(p=>p.empresa===u.empresa));assert.throws(()=>W.pm.find(W.pm.all().find(p=>p.empresa!==u.empresa).id));
});
test('Status report manual grava texto/link e rejeita URL executável',()=>{
  const mem=new Map(),W=portal(mem),p=W.pm.projects()[0];
  assert.throws(()=>W.pm.saveReport({projeto:p.id,titulo:'X',data:W.d(0),link:'javascript:alert(1)'}));
  const r=W.pm.saveReport({projeto:p.id,titulo:'Reunião',data:W.d(0),link:'https://example.com/report',observacao:'Aguardando entrega',sprint:W.data.sprints[0].id});
  const next=portal(mem);assert.equal(next.data.statusReports.find(x=>x.id===r.id).observacao,'Aguardando entrega');
  assert.match(next.pmViews.control('reports'),/Reunião/);
});
test('Janelas semana, mês e ano respeitam calendário local e ano bissexto',()=>{
  const P=portal().pm;
  assert.equal(P.windowFor('semana','2026-09-22').de,'2026-09-21');
  assert.equal(P.windowFor('mes','2024-02-10').ate,'2024-02-29');
  assert.equal(P.windowFor('ano','2026-09-22').ate,'2026-12-31');
  assert.equal(P.validDate('2026-02-30'),false);
});
test('Todas as abas montam sem undefined e escapam conteúdo armazenado',()=>{
  const W=portal(),p=W.pm.projects()[0];p.nome='<img src=x>';p.briefing.contexto='<script>boom</script>';
  for(const tab of ['briefing','encerramento','escopo','cronograma','tarefas','documentos','decisoes','riscos']) {
    const html=W.pmViews.projectPage(p.id,tab);assert.doesNotMatch(html,/<script>|<img src=x>|undefined|NaN/);assert.match(html,/&lt;img/);
  }
  for(const tab of ['dashboard','reports','decisoes','riscos'])assert.doesNotMatch(W.pmViews.control(tab),/undefined|NaN/);
});
test('Galeria oferece uma única ação por projeto e arquivados abrem a ficha',()=>{
  const W=portal(),html=W.pmViews.catalog(),n=W.pm.projects({situation:'ativos'}).length;
  assert.equal((html.match(/>Ver projeto</g)||[]).length,n);assert.doesNotMatch(html,/Abrir demandas/);
  assert.match(W.pmViews.catalog(true),/Ver projeto/);
});
test('Histórico de decisões inclui projetos encerrados',()=>{
  const W=portal(),p=W.pm.projects({situation:'ativos'})[0];p.decisoes.push({id:'check',data:W.d(0),decisao:'Preservar esta decisão',autor:W.data.usuarioAtual});
  W.pm.closeProject(p.id,{data:W.d(0),resultado:'Feito'},'arquivado');assert.match(W.pmViews.control('decisoes'),/Preservar esta decisão/);
});
test('A ordem real do index liga as rotas novas sem substituir o histórico de pedidos',()=>{
  const document={readyState:'loading',addEventListener(){},querySelectorAll(){return[];},querySelector(){return null;}};
  const mem=new Map(),ctx={window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}};}},document,
    location:{hash:'#/projetos'},localStorage:{getItem:k=>mem.get(k),setItem:(k,v)=>mem.set(k,v)},console,setTimeout};
  const index=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  for(const match of index.matchAll(/<script src="assets\/js\/([^"]+)"/g))vm.runInNewContext(fs.readFileSync(path.join(dir,match[1]),'utf8'),ctx,{filename:match[1]});
  const W=ctx.window.WB;W.data.usuarioAtual=W.data.pessoas.find(p=>p.papel==='admin').id;W.definirOperacao('grupo');
  W.fase2.carregar();W.pm.load();
  assert.match(W.rotas.projetos([]),/pm-gallery/);
  assert.match(W.rotas.projeto([W.data.projetos[0].id,'encerramento']),/Termo de encerramento/);
  assert.match(W.rotas.cronograma([]),/pm-timeline/);
  assert.match(W.rotas['painel-controle'](['reports']),/Registrar status report/);
  assert.match(W.rotas.solicitacoes(['coffe']),/Histórico de solicitações/);
});
