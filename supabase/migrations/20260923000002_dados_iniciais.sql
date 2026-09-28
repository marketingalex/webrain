-- WeBrain — dados iniciais: empresas do grupo e o primeiro admin.
-- As demais pessoas são convidadas depois, pela tela ou por aqui.
insert into public.empresas (id, nome, curto, serie) values
  ('weinc',    'We Incorporadora', 'We Inc',   's1'),
  ('weinvest', 'WeInvest',         'WeInvest', 's2'),
  ('nos',      'Nós Gastronomia',  'Nós',      's3'),
  ('casawe',   'CasaWE',           'CasaWE',   's4')
on conflict (id) do nothing;

insert into public.pessoas (id, email, nome, funcao, empresa, papel, setor) values
  ('u1', 'marketing@weinc.imb.br', 'Alex Souza', 'Head de Marketing', 'weinc', 'admin', 'Marketing')
on conflict (id) do nothing;
