# VIC Assistência | Aplicativo do cliente

Aplicativo Android da VIC Assistência Técnica, destinado exclusivamente aos clientes.

## Escopo do produto

- Autenticação individual do cliente.
- Consulta das próprias ordens de serviço.
- Acompanhamento do status do conserto.
- Visualização de orçamentos.
- Histórico de atendimentos.
- Contato com a loja.

Não existe painel administrativo ou área do proprietário dentro do aplicativo.

## Estado desta etapa

Esta etapa remove o código, os dados, as telas, os assets e os textos do jogo antigo. Ela também remove a rota e os estilos de administração local e renomeia a identidade Android para VIC Assistência.

**Ainda não há autenticação, integração com banco de dados ou consulta real de ordens de serviço.** Essas funções serão implementadas em etapas separadas, com backend, regras de acesso e testes de isolamento entre clientes.

## Desenvolvimento

Requer Node.js 22 e Java 21 para o build Android.

```sh
npm install
npm run check:clean
npm test
npm run build
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```

O GitHub Actions gera um APK de depuração e publica o artefato para teste. APK de produção assinado, keystore e distribuição são etapas posteriores. A chave de assinatura não deve ser armazenada neste repositório.

## Segurança e privacidade

- Não inserir credenciais privadas, tokens de serviço ou senhas no código.
- O backend deverá autenticar usuários e impor isolamento de dados no servidor.
- A aplicação deverá usar HTTPS e não carregar páginas externas dentro da WebView.
- A política de privacidade e os prazos de retenção serão definidos antes de receber dados reais de clientes.
- Não usar dados pessoais reais em testes ou screenshots.

## Processo de desenvolvimento

Cada etapa deve ocorrer em branch própria e Pull Request. Nenhuma etapa é considerada concluída sem build e checklist de testes documentados.
