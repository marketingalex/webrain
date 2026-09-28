const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function setup(){
  const nodes=new Map();
  function get(id){
    if(!nodes.has(id))nodes.set(id,{id,value:'',type:id==='senha'?'password':'text',textContent:'',hidden:true,attrs:{},events:{},validity:{typeMismatch:false},options:[{text:'Gestor'}],selectedIndex:0,
      setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.events[k]=fn;},focus(){this.focused=true;},showModal(){this.open=true;},querySelector(){return {value:'weinvest'};}});
    return nodes.get(id);
  }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/js/login.js'),'utf8'),{document:{getElementById:get}});
  return {get,submit(){get('login-form').events.submit({preventDefault(){}});}};
}
test('Login exige somente e-mail e senha e foca o primeiro campo inválido',()=>{
  const {get,submit}=setup();submit();
  assert.equal(get('email').attrs['aria-invalid'],'true');assert.equal(get('email').focused,true);
  get('email').value='invalido';get('email').validity.typeMismatch=true;get('senha').value='exemplo';submit();
  assert.equal(get('email-error').textContent,'Informe um e-mail válido.');
  assert.equal(get('form-status').hidden,true);
});
test('Prévia validada não autentica nem envia dados e limpa a senha',()=>{
  // Sem fetch/storage disponíveis: um uso acidental dessas APIs falharia aqui.
  const {get,submit}=setup();get('email').value=' teste@exemplo.com ';get('senha').value='segredo';
  get('toggle-password').events.click();assert.equal(get('senha').type,'text');
  submit();assert.equal(get('email').value,'teste@exemplo.com');assert.equal(get('senha').value,'');assert.equal(get('senha').type,'password');
  assert.match(get('form-status').textContent,/nenhum login foi realizado/);
  assert.equal(get('form-status').hidden,false);assert.equal(get('toggle-password').attrs['aria-pressed'],'false');
});
test('Recuperação e solicitação de acesso explicam o estado da prévia',()=>{
  const {get}=setup();get('recover').events.click();assert.equal(get('access-dialog').open,true);assert.match(get('dialog-description').textContent,/Nenhum e-mail/);
  get('request-access').events.click();assert.match(get('dialog-description').textContent,/nenhuma solicitação/);
});
