/* Prévia de login: validação local, sem autenticação, envio ou persistência. */
(function () {
  'use strict';
  const form=document.getElementById('login-form');
  const email=document.getElementById('email');
  const senha=document.getElementById('senha');
  const perfil=document.getElementById('perfil');
  const status=document.getElementById('form-status');
  const toggle=document.getElementById('toggle-password');
  const dialog=document.getElementById('access-dialog');
  const empresas={weinc:'WeInc',weinvest:'WeInvest',casawe:'CasaWE',nos:'Nós Gastronomia'};

  function error(field,message) {
    field.setAttribute('aria-invalid',message?'true':'false');
    document.getElementById(field.id+'-error').textContent=message;
  }
  function resetStatus() { status.hidden=true;status.textContent=''; }
  form.addEventListener('input',event=>{
    resetStatus();
    if(['email','senha','perfil'].includes(event.target.id)) error(event.target,'');
  });
  form.addEventListener('change',resetStatus);
  toggle.addEventListener('click',()=>{
    const visible=senha.type==='password';
    senha.type=visible?'text':'password';
    toggle.setAttribute('aria-pressed',String(visible));
    toggle.setAttribute('aria-label',visible?'Ocultar senha':'Mostrar senha');
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();resetStatus();email.value=email.value.trim();
    const errors=[
      [perfil,perfil.value?'':'Selecione seu tipo de acesso.'],
      [email,!email.value?'Informe seu e-mail.':email.validity.typeMismatch?'Informe um e-mail válido.':''],
      [senha,senha.value?'':'Informe sua senha.']
    ];
    errors.forEach(([field,message])=>error(field,message));
    const first=errors.find(([,message])=>message);
    if(first){first[0].focus();return;}
    const empresa=empresas[form.querySelector('input[name="empresa"]:checked').value];
    const papel=perfil.options[perfil.selectedIndex].text;
    senha.value='';senha.type='password';
    toggle.setAttribute('aria-pressed','false');toggle.setAttribute('aria-label','Mostrar senha');
    status.textContent=`Prévia de acesso: ${empresa} · ${papel}. O formulário foi validado, mas nenhum login foi realizado. A autenticação ainda será conectada. Nenhum dado foi enviado e a senha foi limpa.`;
    status.hidden=false;status.focus();
  });
  function showInfo(title,description) {
    document.getElementById('dialog-title').textContent=title;
    document.getElementById('dialog-description').textContent=description;
    dialog.showModal();
  }
  document.getElementById('recover').addEventListener('click',()=>showInfo('Recuperar sua senha','A recuperação de senha ainda não está conectada nesta prévia. Nenhum e-mail de recuperação será enviado.'));
  document.getElementById('request-access').addEventListener('click',()=>showInfo('Solicitar acesso','O acesso deverá ser liberado pelo administrador da sua empresa. Nesta prévia, nenhuma solicitação é registrada ou enviada.'));
})();
