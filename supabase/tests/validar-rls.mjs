// Valida a migration e as regras de acesso num Postgres descartável (PGlite).
// Uso: npm i @electric-sql/pglite, junte as migrations de esquema (sem a de dados iniciais,
// que colide com os dados de teste) num arquivo e rode: node supabase/tests/validar-rls.mjs <arquivo.sql>
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const db = new PGlite();
const sql = fs.readFileSync(process.argv[2], 'utf8');
await db.exec(`
create role authenticated nologin; create role anon nologin;
create schema auth;
create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true),'')::uuid $$;
grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
`);
await db.exec(sql);
await db.exec(`grant usage on schema public to authenticated; grant all on all tables in schema public to authenticated;`);
console.log('migration OK');
const U = n => '00000000-0000-0000-0000-' + String(n).padStart(12,'0');
await db.exec(`
insert into empresas values ('weinc','We Incorporadora','We Inc','s1'),('weinvest','WeInvest','WeInvest','s2'),('nos','Nós','Nós','s3');
insert into pessoas (id,email,nome,papel,empresa,setor,funcao) values
 ('u1','a@x','Admin','admin','weinc','Marketing','Head de Marketing'),
 ('u4','h@x','Head','head','weinc','Comercial','Head Comercial'),
 ('u5','m@x','Analista','analista','weinc','Comercial','Analista Comercial'),
 ('u7','b@x','Bruno','analista','weinvest','Financeiro','Analista Financeiro'),
 ('u8','l@x','Leticia','analista','weinc','Administrativo','Assistente'),
 ('x1','c@fora','Parceiro','parceiro','weinvest','Comercial','Corretor'),
 ('x2','ci@x','Corretor interno','corretor','weinvest','Comercial','Corretor');
insert into auth.users values ('${U(1)}','A@x',now()),('${U(4)}','h@x',now()),('${U(5)}','m@x',now()),('${U(7)}','b@x',now()),('${U(8)}','l@x',now()),('${U(9)}','estranho@x',now()),('00000000-0000-0000-0000-000000000030','c@fora',now()),('00000000-0000-0000-0000-000000000031','ci@x',now());
insert into filas_aprovacao values ('compra','u8');
insert into demandas (id,nome,tipo,responsavel,criador) values ('m1','Marco','marco','u4','u1'),('t1','Tarefa do Rafael','tarefa','u4','u4');
insert into wi_ativos (id,titulo,confidencial,confidencial_para) values ('a1','Público',false,'{}'),('a2','Secreto',true,'{admin,diretoria,head}');
insert into news (id,titulo,autor,publico) values ('n1','todos','u1','Todos'),('n2','comercial','u4','Comercial');
`);
await db.exec("insert into pessoas (id,email,nome,papel) values ('u20','novo@x','Novo','analista')");
await db.exec("insert into auth.users values ('00000000-0000-0000-0000-000000000020','novo@x',null)");
console.log('antes de confirmar:', (await db.query("select auth_user_id is not null v from pessoas where id='u20'")).rows[0].v);
await db.exec("update auth.users set email_confirmed_at=now() where email='novo@x'");
console.log('depois de confirmar:', (await db.query("select auth_user_id is not null v from pessoas where id='u20'")).rows[0].v);
const vinc = await db.query(`select id, auth_user_id is not null v from pessoas order by id`);
console.log('vínculo por e-mail:', vinc.rows.map(r=>r.id+'='+r.v).join(' '));
async function como(n, q) {
  await db.exec(`reset role; select set_config('app.uid','${U(n)}',false); set role authenticated;`);
  try { const r = await db.query(q); return r.affectedRows !== undefined && !r.rows.length ? 'ok('+r.affectedRows+')' : JSON.stringify(r.rows); }
  catch (e) { return 'NEGADO: ' + e.message.slice(0,70); }
}
const X = 30;
const casos = [
 ['parceiro vê pessoas', X, `select count(*)::int n from pessoas`],
 ['parceiro vê demandas', X, `select count(*)::int n from demandas`],
 ['parceiro vê news', X, `select count(*)::int n from news`],
 ['parceiro (empresa weinvest) vê ativos', X, `select count(*)::int n from wi_ativos`],
 ['parceiro vê leads', X, `select count(*)::int n from wi_leads`],
 ['parceiro cria tarefa', X, `insert into demandas (id,nome,tipo,criador,responsavel) values ('xx','t','tarefa','x1','x1')`],
 ['parceiro pede compra', X, `insert into solicitacoes (id,tipo,titulo,solicitante) values ('SX','compra','x','x1')`],
 ['parceiro comenta', X, `insert into demanda_comentarios (demanda,autor,texto) values ('t1','x1','oi')`],
 ['parceiro grava bem ADM', X, `insert into adm_bens (id,descricao) values ('bx','x')`],
 ['parceiro se promove', X, `update pessoas set papel='admin' where id='x1'`],
 ['parceiro lê os próprios avisos', X, `select count(*)::int n from notificacoes`],
 ['corretor vê pessoas', 31, `select count(*)::int n from pessoas`],
 ['corretor vê demandas', 31, `select count(*)::int n from demandas`],
 ['corretor vê news', 31, `select count(*)::int n from news`],
 ['corretor (empresa weinvest) vê ativos', 31, `select count(*)::int n from wi_ativos`],
 ['corretor vê leads', 31, `select count(*)::int n from wi_leads`],
 ['corretor cria tarefa', 31, `insert into demandas (id,nome,tipo,criador,responsavel) values ('xy','t','tarefa','x2','x2')`],
 ['corretor pede compra', 31, `insert into solicitacoes (id,tipo,titulo,solicitante) values ('SY','compra','x','x2')`],
 ['corretor comenta', 31, `insert into demanda_comentarios (demanda,autor,texto) values ('t1','x2','oi')`],
 ['corretor grava bem ADM', 31, `insert into adm_bens (id,descricao) values ('by','x')`],
 ['corretor se promove', 31, `update pessoas set papel='admin' where id='x2'`],
 ['corretor lê os próprios avisos', 31, `select count(*)::int n from notificacoes`],
 ['estranho vê pessoas', 9, `select count(*)::int n from pessoas`],
 ['analista vê pessoas', 5, `select count(*)::int n from pessoas`],
 ['analista cria marco', 5, `insert into demandas (id,nome,tipo,criador) values ('x1','m','marco','u5')`],
 ['analista cria tarefa própria', 5, `insert into demandas (id,nome,tipo,criador,responsavel) values ('x2','t','tarefa','u5','u5')`],
 ['analista edita tarefa alheia', 5, `update demandas set nome='z' where id='t1'`],
 ['head edita tarefa alheia', 4, `update demandas set nome='z' where id='t1'`],
 ['head edita marco', 4, `update demandas set nome='z' where id='m1'`],
 ['admin edita marco', 1, `update demandas set nome='z' where id='m1'`],
 ['analista comenta tarefa alheia', 5, `insert into demanda_comentarios (demanda,autor,texto) values ('t1','u5','oi')`],
 ['analista pede compra', 5, `insert into solicitacoes (id,tipo,titulo,solicitante) values ('S1','compra','papel','u5')`],
 ['aprovadora (u8) vê pedido', 8, `select id from solicitacoes`],
 ['head (u4) vê pedido alheio', 4, `select id from solicitacoes`],
 ['solicitante corrige título', 5, `update solicitacoes set titulo='papel A4' where id='S1'`],
 ['solicitante se aprova', 5, `update solicitacoes set status='confirmado' where id='S1'`],
 ['aprovadora aprova', 8, `update solicitacoes set status='confirmado' where id='S1'`],
 ['solicitante mexe após aprovado', 5, `update solicitacoes set titulo='x' where id='S1'`],
 ['analista (u5) lê news', 5, `select id from news order by id`],
 ['Bruno (weinvest) lê news', 7, `select id from news order by id`],
 ['analista weinc vê ativos', 5, `select id from wi_ativos`],
 ['Bruno weinvest vê ativos', 7, `select id from wi_ativos order by id`],
 ['head weinc vê ativos', 4, `select id from wi_ativos order by id`],
 ['Leticia (Adm) grava bem', 8, `insert into adm_bens (id,descricao) values ('b1','notebook')`],
 ['analista comercial vê bens', 5, `select count(*)::int n from adm_bens`],
 ['avisar outra pessoa', 5, `insert into notificacoes (pessoa,texto) values ('u4','oi')`],
 ['u5 lê avisos do u4', 5, `select count(*)::int n from notificacoes`],
 ['u4 lê os seus', 4, `select count(*)::int n from notificacoes`],
];
for (const [nome, u, q] of casos) console.log(nome.padEnd(32), await como(u, q));
