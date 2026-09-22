const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const js=path.join(__dirname,'../assets/js');
function setup(hash='#/home') {
  const memory=new Map(), nodes=new Map();
  function node() { return {innerHTML:'',scrollTop:0,addEventListener(){},querySelectorAll(){return [];},querySelector(){return node();}}; }
  const document={readyState:'loading',addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);}};
  const ctx={window:{matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},document,location:{hash},localStorage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},setTimeout(){}};
  // A lateral passou a ser montada a partir das operações: sem fase2-*.js e
  // operacoes.js, WB.navBase e WB.operacoes não existem e a árvore vem vazia.
  for(const file of ['data.js','ui.js','charts.js','views.js','forms.js','fase2-data.js','fase2-forms.js','fase2-views.js','operacoes.js','app.js']) vm.runInNewContext(fs.readFileSync(path.join(js,file),'utf8'),ctx,{filename:file});
  return {WB:ctx.window.WB,ctx,nodes,sidebar(){ctx.window.WB.renderSidebar();return nodes.get('sidebar').innerHTML;}};
}
function expanded(html,key) {
  return html.includes(`data-nav-branch="${key}" aria-expanded="true"`);
}
test('Scripts da aplicação têm sintaxe válida',()=>{
  for(const name of fs.readdirSync(js).filter(n=>n.endsWith('.js')))new vm.Script(fs.readFileSync(path.join(js,name),'utf8'),{filename:name});
});
test('Lateral segue a hierarquia, preserva módulos e começa com arquivados recolhidos',()=>{
  const s=setup(), html=s.sidebar();
  assert.ok(html.indexOf('data-nav-branch="dashboards"')<html.indexOf('data-nav-branch="trabalho"'));
  for(const branch of ['ativos','arquivados','controle','Recursos','Comercial','Administrativo'])assert.ok(html.includes(`data-nav-branch="${branch}"`));
  assert.equal(expanded(html,'arquivados'),false);
  // A busca saiu da lateral (21/09/2026) e o seletor de operação subiu para o
  // cabeçalho da lateral, sem o rótulo "Operação" escrito ao lado.
  assert.ok(!html.includes('data-sidebar-search'));
  assert.ok(html.includes('sb__head'));
  assert.ok(!html.includes('sb__op__rot'));
  assert.ok(html.includes('data-nav-create'));assert.ok(html.includes('Abrir menu da conta'));
});

test('Cabeçalho reúne atalhos, busca e notificações, nessa ordem',()=>{
  const s=setup();
  s.WB.renderTopbar();
  const html=s.nodes.get('topbar').innerHTML;
  assert.ok(html.includes('data-busca-topo'),'a busca vive no cabeçalho de todas as páginas');
  assert.ok(html.includes('tbsc__add'),'os atalhos têm botão de adicionar');
  assert.ok(html.indexOf('data-busca-topo')<html.indexOf('data-sino'),'a busca fica à esquerda das notificações');
  assert.equal(html.includes('Portal interno'),false);
});
test('Rota profunda abre seus ancestrais e destaca somente o destino selecionado',()=>{
  // Performance por empresa é da visão Grupo We — só admin e diretoria alcançam.
  const s=setup('#/dash/performance/weinvest');
  s.WB.definirOperacao('grupo');
  const html=s.sidebar();
  assert.ok(expanded(html,'grupo-dash'));assert.ok(expanded(html,'grupo-performance'));
  assert.ok(html.includes('href="#/dash/performance/weinvest" aria-current="page"'));
  assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
});
test('Ramo recolhido persiste em atualização e reabre ao navegar para um filho',()=>{
  const s=setup('#/projeto/p1/tarefas');s.sidebar();
  const key='sidebar.ramos.'+s.WB.eu().id;
  s.WB.store.set(key,{trabalho:false,ativos:false});
  assert.equal(expanded(s.sidebar(),'trabalho'),false);
  s.ctx.location.hash='#/projeto/p2/briefing';
  assert.ok(expanded(s.sidebar(),'trabalho'));assert.ok(expanded(s.sidebar(),'ativos'));
});
test('Arquivado individual abre ramo e filtra seu registro',()=>{
  const s=setup('#/projetos-arquivados/pa2');
  const sidebar=s.sidebar();
  assert.ok(expanded(sidebar,'arquivados'));
  assert.equal((sidebar.match(/aria-current="page"/g)||[]).length,1);
  const html=s.WB.views.projetosArquivados('pa2');
  assert.ok(html.includes('Implantação ERP Omie'));assert.ok(!html.includes('Pré-lançamento Bioma'));
  assert.ok(s.WB.views.projetosArquivados('inexistente').includes('não encontrado'));
});
test('Painel administrativo acompanha papel e nomes de projeto são escapados',()=>{
  const s=setup();s.WB.data.projetos[0].nome='<img src=x onerror=alert(1)>';
  const admin=s.WB.data.pessoas.find(p=>p.papel==='admin');s.WB.data.usuarioAtual=admin.id;
  let html=s.sidebar();assert.ok(html.includes('Painel administrativo'));assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));
  s.WB.data.usuarioAtual=s.WB.data.pessoas.find(p=>p.papel!=='admin').id;
  assert.ok(!s.sidebar().includes('Painel administrativo'));
});
test('Performance usa somente a empresa escolhida em ambos os gráficos e na tabela',()=>{
  const {WB}=setup(),charts=[];
  WB.barras=rows=>{charts.push(rows);return '';};
  const html=WB.views.dashPerformance('weinvest');
  assert.equal(charts.length,2);
  for(const rows of charts) {assert.equal(rows.length,1);assert.equal(rows[0].rotulo,WB.empresaNome('weinvest'));}
  const table=html.slice(html.indexOf('Números por equipe'));
  assert.ok(table.includes('WeInvest'));assert.ok(!table.includes('Nós Gastronomia'));
  assert.ok(WB.views.dashPerformance('desconhecida').includes('Empresa não encontrada'));
});
test('Cronograma filtra marcos e os totais de sprint pelo mesmo projeto',()=>{
  const {WB}=setup();let rows;
  WB.views.gantt=value=>{rows=value;return '';};
  WB.data.projetos=[{id:'a',nome:'Projeto A',inicio:'2026-01-01',fim:'2026-12-01',marcos:[{nome:'Marco A',prazo:'2026-10-01'}]},{id:'b',nome:'Projeto B',inicio:'2026-01-01',fim:'2026-12-01',marcos:[{nome:'Marco B',prazo:'2026-10-01'}]}];
  WB.data.sprints=[{id:'s',nome:'Sprint teste',inicio:'2026-09-01',fim:'2026-09-30'}];
  WB.data.demandas=[{projeto:'a',sprint:'s',status:'concluida'},{projeto:'b',sprint:'s',status:'afazer'}];
  const html=WB.views.cronograma('a');
  assert.equal(rows.length,1);assert.equal(rows[0].nome,'Projeto A · Marco A');
  assert.ok(html.includes('1/1'));assert.ok(!html.includes('1/2'));
  assert.ok(WB.views.cronograma('inexistente').includes('Projeto não encontrado'));
});
