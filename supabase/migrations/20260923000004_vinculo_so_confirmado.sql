-- WeBrain — o login só assume o cadastro depois que o e-mail é confirmado (23/09/2026).
-- Antes, o vínculo acontecia na criação da conta: quem se cadastrasse primeiro
-- com o e-mail de uma pessoa já registrada herdaria o acesso dela sem provar
-- que é dona da caixa de e-mail.

create or replace function privado.vincular_pessoa()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is not null
     and (tg_op = 'INSERT' or old.email_confirmed_at is null) then
    update public.pessoas
       set auth_user_id = new.id
     where lower(email) = lower(new.email) and auth_user_id is null;
  end if;
  return new;
end $$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function privado.vincular_pessoa();
create trigger ao_confirmar_email
  after update of email_confirmed_at on auth.users
  for each row execute function privado.vincular_pessoa();
