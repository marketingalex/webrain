-- WeBrain — esquema inicial (aplicado em 23/09/2026)
-- Projeto Supabase: we-brain (ybfjuhrgmlrjdbsykpcl), org desenvolvimento@weinc.imb.br
--
-- Critérios:
-- * Chave primária em TEXTO, com os mesmos ids que a tela já usa ('u1', 'SOL-…',
--   'd12'…). Ligar o portal vira trocar a origem dos dados, não reescrever telas.
-- * O que a tela filtra ou o que a regra de acesso usa vira coluna. O que é
--   estrutura aninhada e só aparece no detalhe (briefing, marcos, valores de
--   pedido, extras) fica em jsonb.
-- * Toda tabela tem RLS ligado. Sem uma linha em `pessoas` vinculada ao login,
--   a pessoa não vê nada.

-- ============================================================ utilidades
create schema if not exists privado;

create or replace function privado.tocar_atualizado()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

-- ============================================================ cadastro base
create table public.empresas (
  id    text primary key,
  nome  text not null,
  curto text not null,
  serie text
);

create table public.pessoas (
  id            text primary key,
  auth_user_id  uuid unique references auth.users (id) on delete set null,
  email         text not null unique,
  nome          text not null,
  funcao        text,
  empresa       text references public.empresas (id),
  papel         text not null default 'analista'
                check (papel in ('admin', 'diretoria', 'head', 'analista')),
  setor         text,
  pdi              jsonb,   -- { titulo, url, atualizado, autor }
  descritivo_cargo jsonb,   -- mesmo formato
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ------------------------------------------------ quem sou eu (para as regras)
-- security definer: as regras consultam `pessoas` sem cair na própria RLS.
create or replace function privado.eu_id()
returns text language sql stable security definer set search_path = '' as $$
  select p.id from public.pessoas p
  where p.auth_user_id = (select auth.uid()) and p.ativo
$$;

create or replace function privado.eu_papel()
returns text language sql stable security definer set search_path = '' as $$
  select p.papel from public.pessoas p
  where p.auth_user_id = (select auth.uid()) and p.ativo
$$;

create or replace function privado.eu_empresa()
returns text language sql stable security definer set search_path = '' as $$
  select p.empresa from public.pessoas p
  where p.auth_user_id = (select auth.uid()) and p.ativo
$$;

create or replace function privado.eu_setor()
returns text language sql stable security definer set search_path = '' as $$
  select p.setor from public.pessoas p
  where p.auth_user_id = (select auth.uid()) and p.ativo
$$;

create or replace function privado.eu_funcao()
returns text language sql stable security definer set search_path = '' as $$
  select p.funcao from public.pessoas p
  where p.auth_user_id = (select auth.uid()) and p.ativo
$$;

create or replace function privado.eh_membro()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pessoas p
                 where p.auth_user_id = (select auth.uid()) and p.ativo)
$$;

create or replace function privado.tem_papel(variadic papeis text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(privado.eu_papel() = any (papeis), false)
$$;

-- Primeiro login: vincula o usuário do Auth à pessoa cadastrada com o mesmo e-mail.
-- Quem não está em `pessoas` entra no Auth mas não enxerga nada.
create or replace function privado.vincular_pessoa()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.pessoas
     set auth_user_id = new.id
   where lower(email) = lower(new.email) and auth_user_id is null;
  return new;
end $$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function privado.vincular_pessoa();

grant usage on schema privado to authenticated;

-- ============================================================ trabalho
create table public.sprints (
  id     text primary key,
  nome   text not null,
  inicio date not null,
  fim    date not null,
  atual  boolean not null default false,
  check (fim >= inicio)
);

create table public.projetos (
  id             text primary key,
  nome           text not null,
  empresa        text references public.empresas (id),
  empreendimento text,
  status         text not null default 'ativo',   -- ativo | pausado | concluido | arquivado …
  prioridade     text,
  responsavel    text references public.pessoas (id),
  inicio         date,
  fim            date,
  encerrado      date,
  progresso      integer not null default 0 check (progresso between 0 and 100),
  resumo         text,
  resultado      text,
  licoes         text,
  briefing       jsonb not null default '{}',
  marcos         jsonb not null default '[]',
  documentos     jsonb not null default '[]',
  decisoes       jsonb not null default '[]',
  riscos         jsonb not null default '[]',
  encerramento   jsonb,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create table public.demandas (
  id            text primary key,
  nome          text not null,
  tipo          text not null default 'tarefa'
                check (tipo in ('marco', 'entregavel', 'tarefa', 'subtarefa')),
  pai           text references public.demandas (id) on delete set null,
  projeto       text references public.projetos (id) on delete set null,
  sprint        text references public.sprints (id) on delete set null,
  responsavel   text references public.pessoas (id),
  criador       text references public.pessoas (id),
  inicio        date,
  prazo         date,
  prioridade    text,
  status        text not null default 'afazer'
                check (status in ('afazer', 'andamento', 'aprovacao', 'revisao', 'aprovada', 'concluida')),
  descricao     text,
  origem_marco  text,
  concluida_em  date,
  anexos        jsonb not null default '[]',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Comentário em tabela própria: comentar não exige poder editar a demanda.
create table public.demanda_comentarios (
  id        text primary key default gen_random_uuid()::text,
  demanda   text not null references public.demandas (id) on delete cascade,
  autor     text not null references public.pessoas (id),
  texto     text not null,
  criado_em timestamptz not null default now()
);

create table public.status_reports (
  id         text primary key,
  sprint     text references public.sprints (id),
  projeto    text references public.projetos (id) on delete cascade,
  titulo     text not null,
  link       text,
  data       date,
  autor      text references public.pessoas (id),
  observacao text
);

-- Espelha WB.podeEditarDemanda (data.js): marco/entregável só admin e diretoria;
-- tarefa/subtarefa: admin, diretoria e head em qualquer uma; analista nas que
-- criou ou das quais é responsável.
create or replace function privado.pode_editar_demanda(p_tipo text, p_responsavel text, p_criador text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when privado.eu_papel() is null then false
    when p_tipo in ('marco', 'entregavel') then privado.eu_papel() in ('admin', 'diretoria')
    when privado.eu_papel() in ('admin', 'diretoria', 'head') then true
    else privado.eu_id() in (p_responsavel, p_criador)
  end
$$;

-- ============================================================ pedidos e avisos
create table public.solicitacoes (
  id          text primary key,
  tipo        text not null check (tipo in ('evento', 'compra', 'coffe')),
  titulo      text,
  solicitante text not null references public.pessoas (id),
  responsavel text references public.pessoas (id),
  data        date not null default current_date,
  status      text not null default 'em análise'
              check (status in ('em análise', 'confirmado', 'concluído')),
  resumo      text,
  campos      jsonb not null default '[]',
  secoes      jsonb not null default '[]',
  valores     jsonb not null default '{}',
  historico   jsonb not null default '[]',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Quem aprova cada fila (antes: 'pedidos.responsaveis' no localStorage).
create table public.filas_aprovacao (
  fila   text not null check (fila in ('evento', 'compra', 'coffe-agora', 'coffe-agendado')),
  pessoa text not null references public.pessoas (id) on delete cascade,
  primary key (fila, pessoa)
);

create table public.cardapio (
  id        text primary key,
  categoria text not null,
  nome      text not null,
  descricao text,
  quando    text[] not null default '{agendar}',
  modo      text not null default 'itens' check (modo in ('itens', 'pessoas')),
  preparo   integer,
  grupos    jsonb not null default '[]',
  bebidas   text[] not null default '{}',
  ordem     integer not null default 0
);

-- Espelha P.podeAprovar (pedidos.js).
create or replace function privado.pode_aprovar(p_tipo text, p_responsavel text, p_valores jsonb)
returns boolean language sql stable security definer set search_path = '' as $$
  select privado.eu_papel() = 'admin'
      or (p_tipo = 'evento' and p_responsavel is not null and p_responsavel = privado.eu_id())
      or exists (
           select 1 from public.filas_aprovacao f
           where f.pessoa = privado.eu_id()
             and f.fila = case
                   when p_tipo = 'coffe' and p_valores ->> 'quando' = 'agendar' then 'coffe-agendado'
                   when p_tipo = 'coffe' then 'coffe-agora'
                   else p_tipo end
             and not (p_tipo = 'evento' and p_responsavel is not null))
$$;

create table public.notificacoes (
  id        text primary key default gen_random_uuid()::text,
  pessoa    text not null references public.pessoas (id) on delete cascade,
  texto     text not null,
  rota      text,
  origem    text,
  lida      boolean not null default false,
  data      date not null default current_date,
  criado_em timestamptz not null default now()
);

create table public.news (
  id           text primary key,
  titulo       text not null,
  corpo        text,
  autor        text references public.pessoas (id),
  data         date not null default current_date,
  publicado_em timestamptz not null default now(),
  fixado       boolean not null default false,
  publico      text not null default 'Todos'   -- 'Todos', um setor ou uma função exata
);

-- Listas acrescentáveis (listas.extras, adm.listas, pedidos.opcoes): só o que
-- o usuário ACRESCENTOU. A base continua no código.
create table public.listas_extras (
  lista     text not null,
  valor     text not null,
  criado_por text references public.pessoas (id),
  criado_em timestamptz not null default now(),
  primary key (lista, valor)
);

-- Preferências de tela por pessoa (tema, filtros, modo de visão…).
create table public.preferencias (
  pessoa text not null references public.pessoas (id) on delete cascade,
  chave  text not null,
  valor  jsonb,
  primary key (pessoa, chave)
);

create table public.atalhos (
  id     text primary key default gen_random_uuid()::text,
  pessoa text references public.pessoas (id) on delete cascade,  -- null = de todos
  nome   text not null,
  url    text not null,
  icone  text,
  ordem  integer not null default 0
);

-- ============================================================ comercial (Fase 1)
create table public.clientes (
  id           text primary key,
  nome         text not null,
  tipo         text,
  empresa      text references public.empresas (id),
  produto      text,
  origem       text,
  valor        numeric(14, 2),
  etapa        text,
  situacao     text,
  responsavel  text references public.pessoas (id),
  trazido_por  text,
  desde        date,
  telefone     text,
  email        text,
  documento    text,
  endereco     text,
  contrato     text,
  contrato_id  text,
  convertido_em date,
  obs          text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ============================================================ administrativo
-- Cadastros do módulo ADM. `extras` guarda as colunas criadas pelo usuário.
create table public.adm_colaboradores (
  id text primary key, nome text not null, cargo text, empresa text references public.empresas (id),
  setor text, contratacao text, admissao date, desligamento date, status text,
  telefone text, email text, endereco text, cpf text, cnpj text, razao_social text, pix text,
  link text, observacoes text, extras jsonb not null default '{}',
  atualizado_em timestamptz not null default now()
);
create table public.adm_fornecedores (
  id text primary key, nome text not null, classe text, categoria text, cnpj text,
  contato_nome text, contato_telefone text, empresa text references public.empresas (id),
  endereco text, status text, link text, observacoes text, extras jsonb not null default '{}',
  atualizado_em timestamptz not null default now()
);
create table public.adm_patrocinadores (
  id text primary key, nome text not null, projeto text, cota text, valor numeric(14, 2),
  contato_nome text, contato_telefone text, empresa text references public.empresas (id),
  status text, link text, observacoes text, extras jsonb not null default '{}',
  atualizado_em timestamptz not null default now()
);
create table public.adm_bens (
  id text primary key, descricao text not null, patrimonio text, empresa text references public.empresas (id),
  aquisicao date, venda date, valor_pago numeric(14, 2), valor_vendido numeric(14, 2),
  status text, local text, estado text, link text, observacoes text, extras jsonb not null default '{}',
  atualizado_em timestamptz not null default now()
);
create table public.adm_cnpjs (
  id text primary key, razao text not null, fantasia text, cnpj text, empresa text references public.empresas (id),
  regime text, abertura date, endereco text, situacao text, link text, observacoes text,
  extras jsonb not null default '{}',
  atualizado_em timestamptz not null default now()
);
create table public.adm_contratos (
  id text primary key, categoria text, vinculo text, descritivo text not null, parte text,
  empresa text references public.empresas (id), valor numeric(14, 2), inicio date, fim date,
  status text, reajuste text, link text, observacoes text, extras jsonb not null default '{}',
  atualizado_em timestamptz not null default now()
);

-- ============================================================ Fase 2 — WeInvest
create table public.wi_parceiros (
  id text primary key, categoria_pessoa text, nome text not null, cpf text, razao_social text, cnpj text,
  status text, categoria text, tipos text[] not null default '{}', mercados text[] not null default '{}',
  especialidades text[] not null default '{}', whatsapp text, email text, desde date, observacoes text,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create table public.wi_leads (
  id text primary key, nome text not null, telefone text, email text, canal text, categoria text,
  data_entrada date, status text, responsavel text references public.pessoas (id), observacoes text,
  cliente_id text,   -- FK adicionada depois de wi_clientes
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create table public.wi_clientes (
  id text primary key, categoria text, nome text not null, cpf text, razao_social text, cnpj text,
  whatsapp text, email text, grupo_familiar text, vinculos jsonb not null default '[]',
  descricao_familiares text, responsavel text references public.pessoas (id), data_entrada date,
  comprovacao jsonb not null default '{}', classificacao text, canal_origem text,
  perfil jsonb not null default '{}', historico jsonb not null default '{}',
  carteira jsonb not null default '[]',   -- carteira preexistente: NÃO é compra pela WeInvest
  lead_id text references public.wi_leads (id) on delete set null,
  empresa text references public.empresas (id),
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
alter table public.wi_leads
  add constraint wi_leads_cliente_fk foreign key (cliente_id) references public.wi_clientes (id) on delete set null;

create table public.wi_ativos (
  id text primary key, titulo text not null, status text, categoria text, tipo text,
  endereco text, municipio text, estado text, coordenadas text,
  preco_total numeric(16, 2), preco_m2 numeric(14, 2), area numeric(14, 2), quartos integer, vagas integer,
  particularidades text, proprietarios jsonb not null default '[]', origem text,
  parceiro_id text references public.wi_parceiros (id) on delete set null,
  comissao_percentual numeric(6, 3), comissao_condicao text,
  exclusividade boolean not null default false, exclusividade_prazo date,
  confidencial boolean not null default false, confidencial_para text[] not null default '{}',
  documentos jsonb not null default '[]', midia jsonb not null default '[]', observacoes text,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
-- VGV, valor negociado, recebido, comissão bruta e líquida: grandezas independentes.
create table public.wi_negocios (
  id text primary key,
  cliente_id text references public.wi_clientes (id), cliente_representante text,
  ativo_id text references public.wi_ativos (id), ativo_representante text,
  responsavel text references public.pessoas (id),
  sem_parceiro boolean not null default false, parceiros jsonb not null default '[]',
  situacao text, valor_negociado numeric(16, 2), vgv numeric(16, 2), unidades integer,
  comissao_bruta_valor numeric(16, 2), comissao_bruta_pct numeric(6, 3), comissao_liquida_valor numeric(16, 2),
  comissoes jsonb not null default '[]', formato text, contrato text, valor_recebido numeric(16, 2),
  data_fechamento date, lead_id text references public.wi_leads (id) on delete set null, observacoes text,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);

-- ============================================================ Fase 2 — Nós Gastronomia
create table public.nos_itens (
  id text primary key, tipo text, nome text not null, categoria text, descricao text, foto text,
  serve_pessoas integer, tempo_preparo integer, ingredientes text, restricoes text[] not null default '{}',
  preco_venda numeric(12, 2), custo_estimado numeric(12, 2), disponibilidade text,
  periodos text[] not null default '{}', status text, responsavel text references public.pessoas (id),
  descontinuado_em date, motivo_descontinuacao text,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create table public.nos_atendimentos (
  id text primary key, tipo text, cliente_nome text, cliente_id text, data_ocorrido date, canal text,
  categoria text, descricao text, item_id text references public.nos_itens (id) on delete set null,
  funcionario_id text, gravidade text, responsavel_resposta text, acao_tomada text, status text,
  data_resolucao date, registrado_por text references public.pessoas (id),
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);

-- ============================================================ índices
create index on public.pessoas (auth_user_id);
create index on public.demandas (projeto);
create index on public.demandas (sprint);
create index on public.demandas (responsavel);
create index on public.demandas (criador);
create index on public.demandas (pai);
create index on public.demanda_comentarios (demanda);
create index on public.status_reports (projeto);
create index on public.projetos (responsavel);
create index on public.solicitacoes (solicitante);
create index on public.solicitacoes (responsavel);
create index on public.solicitacoes (tipo, status);
create index on public.filas_aprovacao (pessoa);
create index on public.notificacoes (pessoa, lida);
create index on public.clientes (responsavel);
create index on public.wi_leads (responsavel);
create index on public.wi_leads (cliente_id);
create index on public.wi_clientes (responsavel);
create index on public.wi_clientes (lead_id);
create index on public.wi_ativos (parceiro_id);
create index on public.wi_negocios (cliente_id);
create index on public.wi_negocios (ativo_id);
create index on public.wi_negocios (lead_id);
create index on public.wi_negocios (responsavel);
create index on public.nos_atendimentos (item_id);

-- ============================================================ atualizado_em automático
do $$
declare t text;
begin
  foreach t in array array['pessoas', 'projetos', 'demandas', 'solicitacoes', 'clientes',
    'adm_colaboradores', 'adm_fornecedores', 'adm_patrocinadores', 'adm_bens', 'adm_cnpjs', 'adm_contratos',
    'wi_parceiros', 'wi_leads', 'wi_clientes', 'wi_ativos', 'wi_negocios', 'nos_itens', 'nos_atendimentos']
  loop
    execute format('create trigger tocar before update on public.%I for each row execute function privado.tocar_atualizado()', t);
  end loop;
end $$;

-- ============================================================ RLS
do $$
declare t text;
begin
  foreach t in array array['empresas', 'pessoas', 'sprints', 'projetos', 'demandas', 'demanda_comentarios',
    'status_reports', 'solicitacoes', 'filas_aprovacao', 'cardapio', 'notificacoes', 'news', 'listas_extras',
    'preferencias', 'atalhos', 'clientes',
    'adm_colaboradores', 'adm_fornecedores', 'adm_patrocinadores', 'adm_bens', 'adm_cnpjs', 'adm_contratos',
    'wi_parceiros', 'wi_leads', 'wi_clientes', 'wi_ativos', 'wi_negocios', 'nos_itens', 'nos_atendimentos']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---- leitura geral para membros; escrita pela administração
create policy ler on public.empresas for select to authenticated using (privado.eh_membro());
create policy gerir on public.empresas for all to authenticated
  using (privado.tem_papel('admin')) with check (privado.tem_papel('admin'));

create policy ler on public.pessoas for select to authenticated using (privado.eh_membro());
create policy gerir on public.pessoas for all to authenticated
  using (privado.tem_papel('admin')) with check (privado.tem_papel('admin'));

create policy ler on public.sprints for select to authenticated using (privado.eh_membro());
create policy gerir on public.sprints for all to authenticated
  using (privado.tem_papel('admin', 'diretoria')) with check (privado.tem_papel('admin', 'diretoria'));

create policy ler on public.projetos for select to authenticated using (privado.eh_membro());
create policy gerir on public.projetos for all to authenticated
  using (privado.tem_papel('admin', 'diretoria', 'head')) with check (privado.tem_papel('admin', 'diretoria', 'head'));

create policy ler on public.status_reports for select to authenticated using (privado.eh_membro());
create policy gerir on public.status_reports for all to authenticated
  using (privado.tem_papel('admin', 'diretoria', 'head')) with check (privado.tem_papel('admin', 'diretoria', 'head'));

-- ---- demandas
create policy ler on public.demandas for select to authenticated using (privado.eh_membro());
create policy criar on public.demandas for insert to authenticated
  with check (criador = privado.eu_id() and privado.pode_editar_demanda(tipo, responsavel, criador));
create policy editar on public.demandas for update to authenticated
  using (privado.pode_editar_demanda(tipo, responsavel, criador))
  with check (privado.pode_editar_demanda(tipo, responsavel, criador));
create policy apagar on public.demandas for delete to authenticated
  using (privado.pode_editar_demanda(tipo, responsavel, criador));

create policy ler on public.demanda_comentarios for select to authenticated using (privado.eh_membro());
create policy comentar on public.demanda_comentarios for insert to authenticated
  with check (autor = privado.eu_id());
create policy apagar on public.demanda_comentarios for delete to authenticated
  using (autor = privado.eu_id() or privado.tem_papel('admin'));

-- ---- pedidos: quem pediu, quem aprova e o admin
create policy ler on public.solicitacoes for select to authenticated
  using (solicitante = privado.eu_id() or privado.pode_aprovar(tipo, responsavel, valores));
create policy pedir on public.solicitacoes for insert to authenticated
  with check (solicitante = privado.eu_id() and status = 'em análise');
-- Quem pediu só mexe enquanto está em análise, e não muda a situação: aprovar
-- é de quem aprova. Sem isso, o solicitante se aprovaria sozinho.
create policy corrigir on public.solicitacoes for update to authenticated
  using (solicitante = privado.eu_id() and status = 'em análise')
  with check (solicitante = privado.eu_id() and status = 'em análise');
create policy decidir on public.solicitacoes for update to authenticated
  using (privado.pode_aprovar(tipo, responsavel, valores))
  with check (privado.pode_aprovar(tipo, responsavel, valores));

create policy ler on public.filas_aprovacao for select to authenticated using (privado.eh_membro());
create policy gerir on public.filas_aprovacao for all to authenticated
  using (privado.tem_papel('admin')) with check (privado.tem_papel('admin'));

create policy ler on public.cardapio for select to authenticated using (privado.eh_membro());
create policy gerir on public.cardapio for all to authenticated
  using (privado.tem_papel('admin')) with check (privado.tem_papel('admin'));

-- ---- avisos: cada um lê os seus; qualquer membro avisa outro
create policy ler on public.notificacoes for select to authenticated using (pessoa = privado.eu_id());
create policy avisar on public.notificacoes for insert to authenticated with check (privado.eh_membro());
create policy marcar on public.notificacoes for update to authenticated
  using (pessoa = privado.eu_id()) with check (pessoa = privado.eu_id());
create policy apagar on public.notificacoes for delete to authenticated using (pessoa = privado.eu_id());

-- ---- news: público 'Todos', o meu setor ou a minha função exata
create policy ler on public.news for select to authenticated
  using (privado.eh_membro() and (publico = 'Todos' or publico = privado.eu_setor()
         or publico = privado.eu_funcao() or autor = privado.eu_id() or privado.tem_papel('admin')));
create policy publicar on public.news for insert to authenticated
  with check (autor = privado.eu_id() and privado.tem_papel('admin', 'head'));
create policy editar on public.news for update to authenticated
  using (autor = privado.eu_id() or privado.tem_papel('admin'))
  with check (autor = privado.eu_id() or privado.tem_papel('admin'));
create policy apagar on public.news for delete to authenticated
  using (autor = privado.eu_id() or privado.tem_papel('admin'));

-- ---- listas, preferências, atalhos
create policy ler on public.listas_extras for select to authenticated using (privado.eh_membro());
create policy acrescentar on public.listas_extras for insert to authenticated
  with check (privado.eh_membro() and criado_por = privado.eu_id());
create policy gerir on public.listas_extras for delete to authenticated using (privado.tem_papel('admin'));

create policy minhas on public.preferencias for all to authenticated
  using (pessoa = privado.eu_id()) with check (pessoa = privado.eu_id());

create policy ler on public.atalhos for select to authenticated
  using (privado.eh_membro() and (pessoa is null or pessoa = privado.eu_id()));
create policy meus on public.atalhos for all to authenticated
  using (pessoa = privado.eu_id() or (pessoa is null and privado.tem_papel('admin')))
  with check (pessoa = privado.eu_id() or (pessoa is null and privado.tem_papel('admin')));

-- ---- comercial
create policy ler on public.clientes for select to authenticated using (privado.eh_membro());
create policy gerir on public.clientes for all to authenticated
  using (privado.eh_membro()) with check (privado.eh_membro());

-- ---- administrativo: admin, diretoria e o setor Administrativo (decidido
--      com o usuário em 23/09/2026).
do $$
declare t text;
begin
  foreach t in array array['adm_colaboradores', 'adm_fornecedores', 'adm_patrocinadores', 'adm_bens', 'adm_cnpjs', 'adm_contratos']
  loop
    execute format($f$create policy acesso on public.%I for all to authenticated
      using (privado.tem_papel('admin', 'diretoria') or privado.eu_setor() = 'Administrativo')
      with check (privado.tem_papel('admin', 'diretoria') or privado.eu_setor() = 'Administrativo')$f$, t);
  end loop;
end $$;

-- ---- WeInvest: admin, diretoria e quem é da WeInvest. Ativo confidencial só
--      para os papéis listados em confidencial_para.
do $$
declare t text;
begin
  foreach t in array array['wi_parceiros', 'wi_leads', 'wi_clientes', 'wi_negocios']
  loop
    execute format($f$create policy acesso on public.%I for all to authenticated
      using (privado.tem_papel('admin', 'diretoria') or privado.eu_empresa() = 'weinvest')
      with check (privado.tem_papel('admin', 'diretoria') or privado.eu_empresa() = 'weinvest')$f$, t);
  end loop;
end $$;
create policy ler on public.wi_ativos for select to authenticated
  using ((privado.tem_papel('admin', 'diretoria') or privado.eu_empresa() = 'weinvest')
         and (not confidencial or privado.eu_papel() = any (confidencial_para) or privado.tem_papel('admin')));
create policy gerir on public.wi_ativos for all to authenticated
  using ((privado.tem_papel('admin', 'diretoria') or privado.eu_empresa() = 'weinvest')
         and (not confidencial or privado.eu_papel() = any (confidencial_para) or privado.tem_papel('admin')))
  with check (privado.tem_papel('admin', 'diretoria') or privado.eu_empresa() = 'weinvest');

-- ---- Nós: admin, diretoria e quem é da Nós
do $$
declare t text;
begin
  foreach t in array array['nos_itens', 'nos_atendimentos']
  loop
    execute format($f$create policy acesso on public.%I for all to authenticated
      using (privado.tem_papel('admin', 'diretoria') or privado.eu_empresa() = 'nos')
      with check (privado.tem_papel('admin', 'diretoria') or privado.eu_empresa() = 'nos')$f$, t);
  end loop;
end $$;
