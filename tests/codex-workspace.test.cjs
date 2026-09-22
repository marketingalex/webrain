const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function element() {
  return { innerHTML:'', children:[], listeners:{}, open:false,
    appendChild(child) { this.children.push(child); }, setAttribute() {},
    addEventListener(name, fn) { this.listeners[name] = fn; },
    removeEventListener(name) { delete this.listeners[name]; },
    querySelector() { return null; }, showModal() { this.open=true; },
    close() { this.open=false; }, remove() { this.removed=true; }
  };
}
const context = { window:{}, document:{ createElement:element } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/js/codex-workspace.js'),'utf8'),context);
const workspace=context.window.WB.workspace;
const fixture=()=>({usuarioAtual:'me',pessoas:[{id:'me',nome:'Alex'},{id:'other',nome:'Equipe'}],
  projetos:[{id:'p',nome:'Comunicação'}],solicitacoes:[
    {id:'own',solicitante:'me',titulo:'Meu pedido',data:'2026-09-17'},
    {id:'private',solicitante:'other',titulo:'Pedido de outra pessoa',data:'2026-09-17'}],
  demandas:[
    {id:'parent',nome:'Marco',projeto:'p',responsavel:'other',status:'afazer',prazo:'2026-09-20'},
    {id:'child',nome:'Revisão',projeto:'p',pai:'parent',responsavel:'me',status:'andamento',prazo:'2026-09-16'},
    {id:'done',nome:'Concluída',projeto:'p',responsavel:'me',status:'concluida',prazo:'2026-09-10'},
    {id:'invalid',nome:'Sem data válida',projeto:'p',responsavel:'me',status:'afazer',prazo:'2026-02-30'}]});
const ids=rows=>Array.from(rows,r=>r.id);

test('Demanda aprovada não volta a ser contada como atrasada',()=>{
  const data=fixture();data.demandas[1].status='aprovada';
  assert.deepEqual(ids(workspace.filterTasks(data,{mine:true,late:true},'2026-09-17')),[]);
});

test('Filtro de sprint combina com empresa sem ampliar o recorte pessoal',()=>{
  const data=fixture();data.projetos[0].empresa='weinc';data.sprints=[{id:'s1',atual:true}];data.demandas[1].sprint='s1';
  assert.deepEqual(ids(workspace.filterTasks(data,{mine:true,sprint:'atual',company:'weinc'},'2026-09-17')),['child']);
  assert.deepEqual(ids(workspace.filterTasks(data,{mine:true,sprint:'atual',company:'nos'},'2026-09-17')),[]);
});

test('Detalhe de pedido mostra campos completos escapados e aceita tipo inicial',()=>{
  const data=fixture();data.solicitacoes[0].tipo='evento';data.solicitacoes[0].campos=[['Público','<b>Equipe</b>'],['Restrições','Sem lactose']];
  const root=element();workspace.mount(root,{data,page:'solicitacoes',requestType:'evento'});
  const shell=root.children[0];assert.match(shell.children[0].innerHTML,/value="evento" selected/);
  const button={disabled:false,dataset:{requestDetail:'own'},hasAttribute:()=>false};shell.listeners.click({target:{closest:()=>button}});
  assert.match(shell.children[1].innerHTML,/Restrições/);assert.match(shell.children[1].innerHTML,/&lt;b&gt;Equipe/);assert.doesNotMatch(shell.children[1].innerHTML,/<b>Equipe/);
});

test('Ver projeto entrega o ID para a ficha completa quando integrado',()=>{
  const root=element();let opened;workspace.mount(root,{data:fixture(),page:'projetos',onOpenProject:id=>opened=id});
  const button={disabled:false,dataset:{projectDetail:'p'},hasAttribute:()=>false};root.children[0].listeners.click({target:{closest:()=>button}});assert.equal(opened,'p');
});
test('Filtros combinam pessoa, projeto, busca sem acento e atraso',()=>{
  assert.deepEqual(ids(workspace.filterTasks(fixture(),{mine:true,project:'p',query:'revisao',late:true},'2026-09-17')),['child']);
  assert.deepEqual(ids(workspace.filterTasks(fixture(),{late:true},'2026-09-17')),['child']);
  assert.deepEqual(ids(workspace.filterTasks(fixture(),{query:'comunicacao',sort:'date'},'2026-09-17')),['done','child','parent','invalid']);
});
test('Datas inválidas são rejeitadas, inclusive ano não bissexto',()=>{
  assert.equal(workspace.validDate('2026-02-29'),false);
  assert.equal(workspace.validDate('2024-02-29'),true);
  assert.equal(workspace.validDate('2026-13-01'),false);
});
test('Sem sessão, filtros não retornam registros',()=>{
  assert.equal(workspace.filterTasks({...fixture(),usuarioAtual:null},{},'2026-09-17').length,0);
});
test('Hierarquia recolhe filhos e expande ancestrais durante busca',()=>{
  const all=fixture().demandas;
  assert.deepEqual(Array.from(workspace.outline(all,all,new Set(),false),r=>r.item.id),['parent','done','invalid']);
  const rows=workspace.outline(all,[all[1]],new Set(),true);
  assert.deepEqual(Array.from(rows,r=>[r.item.id,r.depth,r.context]),[['parent',0,true],['child',1,false]]);
});
test('Ciclos, pais ausentes e pais em outro projeto não ocultam registros',()=>{
  const all=[{id:'a',pai:'b',projeto:'p'},{id:'b',pai:'a',projeto:'p'},{id:'c',pai:'missing',projeto:'p'},{id:'d',pai:'a',projeto:'q'}];
  const rows=workspace.outline(all,all,new Set(),true);
  assert.deepEqual(Array.from(rows,r=>r.item.id).sort(),['a','b','c','d']);
});
test('Gravação em lote aguarda confirmação e elimina IDs duplicados',async()=>{
  const data=fixture(); let confirm; let payload;
  const pending=workspace.commit(data,['parent','child','child'],{status:'revisao'},value=>{
    payload=value; return new Promise(resolve=>{confirm=resolve;});
  });
  assert.equal(data.demandas[0].status,'afazer');
  assert.deepEqual(Array.from(payload.ids),['parent','child']);
  confirm(); await pending;
  assert.equal(data.demandas[0].status,'revisao'); assert.equal(data.demandas[1].status,'revisao');
  assert.equal(data.demandas[2].status,'concluida');
});
test('Falha ou recusa de gravação preserva todos os dados',async()=>{
  for(const writer of [async()=>{throw new Error('offline');},async()=>false]) {
    const data=fixture(), before=JSON.stringify(data);
    await assert.rejects(workspace.commit(data,['parent','child'],{status:'concluida'},writer));
    assert.equal(JSON.stringify(data),before);
  }
});
test('Campos, enums, IDs e responsáveis inválidos não chegam ao callback',async()=>{
  let calls=0; const writer=async()=>{calls++;};
  // `nome` passou a ser editável pela ficha (22/09): o inválido agora é o nome
  // em branco e o campo que não existe.
  for(const changes of [{nome:'   '},{desconhecido:'X'},{status:'constructor'},{prioridade:'toString'},{prazo:'2026-02-30'},{responsavel:'unknown'},{}])
    await assert.rejects(workspace.commit(fixture(),['parent'],changes,writer));
  await assert.rejects(workspace.commit(fixture(),['missing'],{status:'afazer'},writer));
  await assert.rejects(workspace.commit(fixture(),[],{status:'afazer'},writer));
  assert.equal(calls,0);
});
test('Renderização escapa conteúdo e mantém filtros entre tabela e Kanban',()=>{
  const root=element(),data=fixture(); data.demandas[1].nome='<img src=x>';
  const mounted=workspace.mount(root,{data}); const shell=root.children[0],content=shell.children[0];
  // O recorte "minhas demandas" não tem mais botão: é o estado inicial da tela.
  assert.ok(content.innerHTML.includes('&lt;img src=x&gt;'));
  assert.ok(!content.innerHTML.includes('<img src=x>'));
  assert.ok(!content.innerHTML.includes('data-mine'));
  const button={disabled:false,dataset:{},hasAttribute:name=>name==='data-filtros'};
  shell.listeners.click({target:{closest:()=>button}});
  assert.ok(content.innerHTML.includes('ww-filterpanel'));
  button.dataset={view:'kanban'};button.hasAttribute=()=>false;
  shell.listeners.click({target:{closest:()=>button}});
  assert.ok(content.innerHTML.includes('ww-kanban'));
  assert.ok(content.innerHTML.includes('&lt;img src=x&gt;'));
  mounted.destroy();assert.equal(shell.removed,true);assert.equal(Object.keys(shell.listeners).length,0);
});
test('Solicitações mostram somente pedidos da sessão; atualização fecha detalhes',()=>{
  const root=element(),data=fixture(), mounted=workspace.mount(root,{data,page:'solicitacoes'});
  const shell=root.children[0],content=shell.children[0],dialog=shell.children[1];
  assert.ok(content.innerHTML.includes('Meu pedido'));
  assert.ok(!content.innerHTML.includes('Pedido de outra pessoa'));
  dialog.open=true;dialog.innerHTML='Detalhe anterior';
  mounted.update({data:{...data,usuarioAtual:null}});
  assert.equal(dialog.open,false);assert.equal(dialog.innerHTML,'');
  assert.ok(!content.innerHTML.includes('Meu pedido'));
  assert.ok(content.innerHTML.includes('Sessão não identificada'));
  mounted.destroy();
});
