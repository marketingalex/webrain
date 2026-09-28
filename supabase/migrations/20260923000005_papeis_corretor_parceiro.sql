-- WeBrain — níveis de acesso e papéis 'corretor' e 'parceiro' (23/09/2026).
-- Níveis definidos pelo usuário, e como ficam no banco (coluna pessoas.papel):
--   Administrador -> admin
--   Gestor        -> diretoria | head   (na tela é 'Gestor'; as regras continuam
--                                        distinguindo os dois, como antes)
--   Equipe        -> analista
--   Corretor      -> corretor           (corretor interno da We)
--   Parceiro      -> parceiro           (corretor de fora)
-- Corretor e parceiro só vão acessar a WeInvest, e só o necessário, a definir.
-- Até essa definição eles entram e NÃO VEEM NADA: cada acesso será liberado de
-- propósito, em regra própria, nunca por herdar as regras da equipe interna.

alter table public.pessoas drop constraint pessoas_papel_check;
alter table public.pessoas add constraint pessoas_papel_check
  check (papel in ('admin', 'diretoria', 'head', 'analista', 'corretor', 'parceiro'));

-- "Membro" passa a significar equipe interna: toda leitura geral (pessoas,
-- projetos, demandas, clientes, news…) já depende disto.
create or replace function privado.eh_membro()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pessoas p
                 where p.auth_user_id = (select auth.uid()) and p.ativo
                   and p.papel not in ('corretor', 'parceiro'))
$$;

-- Empresa, setor e função não valem para corretor/parceiro: sem isto, um corretor com
-- empresa 'weinvest' herdaria o acesso completo da equipe WeInvest.
create or replace function privado.eu_empresa()
returns text language sql stable security definer set search_path = '' as $$
  select p.empresa from public.pessoas p
  where p.auth_user_id = (select auth.uid()) and p.ativo and p.papel not in ('corretor', 'parceiro')
$$;

create or replace function privado.eu_setor()
returns text language sql stable security definer set search_path = '' as $$
  select p.setor from public.pessoas p
  where p.auth_user_id = (select auth.uid()) and p.ativo and p.papel not in ('corretor', 'parceiro')
$$;

create or replace function privado.eu_funcao()
returns text language sql stable security definer set search_path = '' as $$
  select p.funcao from public.pessoas p
  where p.auth_user_id = (select auth.uid()) and p.ativo and p.papel not in ('corretor', 'parceiro')
$$;

-- Corretor e parceiro não criam nem editam demanda.
create or replace function privado.pode_editar_demanda(p_tipo text, p_responsavel text, p_criador text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when privado.eu_papel() is null or privado.eu_papel() in ('corretor', 'parceiro') then false
    when p_tipo in ('marco', 'entregavel') then privado.eu_papel() in ('admin', 'diretoria')
    when privado.eu_papel() in ('admin', 'diretoria', 'head') then true
    else privado.eu_id() in (p_responsavel, p_criador)
  end
$$;

-- Corretor e parceiro não abrem pedido interno (compra, evento, coffee) nem comentam demanda.
drop policy pedir on public.solicitacoes;
create policy pedir on public.solicitacoes for insert to authenticated
  with check (privado.eh_membro() and solicitante = privado.eu_id() and status = 'em análise');

drop policy comentar on public.demanda_comentarios;
create policy comentar on public.demanda_comentarios for insert to authenticated
  with check (privado.eh_membro() and autor = privado.eu_id());
