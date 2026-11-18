# VIC Assistência: backend Supabase

Esta etapa prepara o modelo de dados e as políticas. Ela não conecta o aplicativo e não cria telas.

## Modelo

- `service_orders`: ordem, equipamento, defeito informado, status e recebimento.
- `service_order_events`: histórico de atualizações. Eventos internos usam `is_customer_visible = false`.
- `quotes`: orçamento vinculado à ordem e ao cliente.
- `quote_items`: itens e quantidades do orçamento.

Todas as tabelas usam `customer_id` ligado a `auth.users.id`, têm RLS habilitado e concedem ao papel `authenticated` somente SELECT. Não existem políticas de escrita para clientes. Chaves estrangeiras compostas impedem associar eventos/orçamentos/itens a uma ordem de outro cliente.

A loja administra os registros pelo Supabase Dashboard. O aplicativo de cliente não terá permissões para criar, alterar ou apagar ordens, eventos ou orçamentos.

## Preparação do projeto

1. Crie um projeto Supabase em sua conta e mantenha o acesso administrativo protegido por MFA.
2. No SQL Editor, execute a migration em `supabase/migrations/` (ou aplique-a com Supabase CLI após vincular o projeto).
3. Em Authentication > Providers, habilite Email.
4. Desabilite cadastro público. Cadastre/convidar clientes pelo painel. O fluxo do app deverá chamar `signInWithOtp({ email, options: { shouldCreateUser: false } })`, evitando criar contas a partir do app.
5. Configure URLs de redirecionamento permitidas para o app/site. Configure SMTP próprio antes de produção; limites e entrega do e-mail dependem do provedor.
6. Use link mágico ou código OTP conforme o template de e-mail escolhido. Não implemente senha própria nem armazene senha.
7. Configure as variáveis de build somente depois de o repositório estar privado: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. A chave anon é pública e pode estar no cliente; nunca use `service_role` no app, workflow, código ou repositório. Não comite arquivos `.env`.
8. A CSP do app deverá permitir `connect-src` somente ao domínio HTTPS do projeto Supabase e aos endpoints estritamente necessários. Não use HTTP nem conteúdo misto.

## Teste de isolamento

O arquivo `supabase/tests/database/rls_customer_isolation.test.sql` cria dois usuários fictícios e dados separados, executa as consultas como `authenticated` com o JWT subject de cada usuário e verifica que:
- A enxerga apenas a própria ordem, histórico público, orçamento e itens.
- B enxerga apenas os próprios registros.
- A não enxerga a ordem de B, e B não enxerga a ordem de A.
- Histórico marcado como interno não aparece para o cliente.

Execute em uma instância local Supabase com CLI e pgTAP, por exemplo: `supabase test db`. Faça também um teste no projeto de homologação com dois usuários de e-mail controlados pela loja, consultando as tabelas com cada sessão real. Não use dados de clientes reais para testes.

## Limites desta etapa

- A migration e os testes são artefatos versionados, não significam que foram aplicados em um projeto hospedado.
- Nenhum usuário real de teste foi criado nesta etapa.
- A integração do SDK, persistência segura de sessão no Android, deep links de magic link, limitação de tentativas, logs e política de privacidade ainda precisam ser implementados e testados.
- Acesso administrativo ao Dashboard depende da conta Supabase e de MFA; não compartilhe credenciais administrativas.
