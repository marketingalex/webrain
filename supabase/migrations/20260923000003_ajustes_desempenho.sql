-- WeBrain — ajustes apontados pelo verificador de desempenho do Supabase (23/09/2026).
-- Nenhuma regra de acesso muda: só a forma de escrevê-las.

-- 1) Índice em toda chave estrangeira que ainda não tinha.
create index on public.adm_bens (empresa);
create index on public.adm_cnpjs (empresa);
create index on public.adm_colaboradores (empresa);
create index on public.adm_contratos (empresa);
create index on public.adm_fornecedores (empresa);
create index on public.adm_patrocinadores (empresa);
create index on public.atalhos (pessoa);
create index on public.clientes (empresa);
create index on public.demanda_comentarios (autor);
create index on public.listas_extras (criado_por);
create index on public.news (autor);
create index on public.nos_atendimentos (registrado_por);
create index on public.nos_itens (responsavel);
create index on public.pessoas (empresa);
create index on public.projetos (empresa);
create index on public.status_reports (autor);
create index on public.status_reports (sprint);
create index on public.wi_clientes (empresa);

-- 2) "gerir for all" também valia para leitura, somando-se ao "ler": duas regras
--    avaliadas em cada consulta. Troca por uma regra para cada escrita.
do $$
declare
  r record;
begin
  for r in select * from (values
      ('empresas',        $e$privado.tem_papel('admin')$e$),
      ('pessoas',         $e$privado.tem_papel('admin')$e$),
      ('sprints',         $e$privado.tem_papel('admin', 'diretoria')$e$),
      ('projetos',        $e$privado.tem_papel('admin', 'diretoria', 'head')$e$),
      ('status_reports',  $e$privado.tem_papel('admin', 'diretoria', 'head')$e$),
      ('filas_aprovacao', $e$privado.tem_papel('admin')$e$),
      ('cardapio',        $e$privado.tem_papel('admin')$e$),
      ('clientes',        $e$privado.eh_membro()$e$)
    ) as t (tabela, regra)
  loop
    execute format('drop policy gerir on public.%I', r.tabela);
    execute format('create policy inserir on public.%I for insert to authenticated with check (%s)', r.tabela, r.regra);
    execute format('create policy editar on public.%I for update to authenticated using (%s) with check (%s)', r.tabela, r.regra, r.regra);
    execute format('create policy apagar on public.%I for delete to authenticated using (%s)', r.tabela, r.regra);
  end loop;
end $$;

-- atalhos: leitura dos de todos e dos meus; escrita nos meus (os de todos, só admin).
drop policy meus on public.atalhos;
create policy inserir on public.atalhos for insert to authenticated
  with check (pessoa = privado.eu_id() or (pessoa is null and privado.tem_papel('admin')));
create policy editar on public.atalhos for update to authenticated
  using (pessoa = privado.eu_id() or (pessoa is null and privado.tem_papel('admin')))
  with check (pessoa = privado.eu_id() or (pessoa is null and privado.tem_papel('admin')));
create policy apagar on public.atalhos for delete to authenticated
  using (pessoa = privado.eu_id() or (pessoa is null and privado.tem_papel('admin')));

-- wi_ativos: mesma regra de antes, separada por operação.
drop policy gerir on public.wi_ativos;
create policy inserir on public.wi_ativos for insert to authenticated
  with check (privado.tem_papel('admin', 'diretoria') or privado.eu_empresa() = 'weinvest');
create policy editar on public.wi_ativos for update to authenticated
  using ((privado.tem_papel('admin', 'diretoria') or privado.eu_empresa() = 'weinvest')
         and (not confidencial or privado.eu_papel() = any (confidencial_para) or privado.tem_papel('admin')))
  with check (privado.tem_papel('admin', 'diretoria') or privado.eu_empresa() = 'weinvest');
create policy apagar on public.wi_ativos for delete to authenticated
  using ((privado.tem_papel('admin', 'diretoria') or privado.eu_empresa() = 'weinvest')
         and (not confidencial or privado.eu_papel() = any (confidencial_para) or privado.tem_papel('admin')));

-- solicitacoes: "corrigir" (quem pediu, em análise) e "decidir" (quem aprova)
-- viram uma regra só de atualização, com as duas condições.
drop policy corrigir on public.solicitacoes;
drop policy decidir on public.solicitacoes;
create policy atualizar on public.solicitacoes for update to authenticated
  using ((solicitante = privado.eu_id() and status = 'em análise')
         or privado.pode_aprovar(tipo, responsavel, valores))
  with check ((solicitante = privado.eu_id() and status = 'em análise')
         or privado.pode_aprovar(tipo, responsavel, valores));
