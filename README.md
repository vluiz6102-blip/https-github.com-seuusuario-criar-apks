# Maia Soccer Manager

**Jogo original de gestão de futebol. Criado para Victor Luiz.**

Maia Soccer Manager é um manager autoral, offline-first e pensado primeiro para celular. A interface, o motor de jogo, as regras, os clubes fictícios, os jogadores fictícios e a identidade visual desta branch foram escritos especificamente para este projeto. Não usamos escudos, uniformes, fotos, elencos reais, bancos de dados de terceiros nem código de jogos de terceiros no conteúdo do jogo.

## O que já dá para jogar

- Começar uma carreira com quatro clubes fictícios e identidade própria.
- Gerir um elenco, treinar atletas e liberar jogadores.
- Contratar jogadores fictícios com orçamento limitado.
- Escolher formação e estilo de jogo, com efeitos na simulação.
- Acompanhar partidas em uma visão de campo 2D, avançando em blocos de 15 minutos.
- Disputar uma temporada de dez rodadas, acompanhar resultados, pontos, gols e finanças.
- Manter a carreira no armazenamento local do dispositivo, sem conta ou conexão obrigatória.

## Rodar localmente

Requisitos: Node.js 24, Rust e os pré-requisitos do Tauri 2 para a plataforma.

```sh
npm ci
npm run dev
npm run build
npm test
```

Para Android, com o Android SDK e NDK instalados:

```sh
npm run tauri -- android init --config src-tauri/tauri.mobile.conf.json
npm run tauri -- android build --apk --target aarch64 --config src-tauri/tauri.mobile.conf.json
```

O workflow **Maia Original Manager** valida o frontend e gera um APK de debug assinado para teste por sideload. Esse APK não é um pacote assinado para publicação na Play Store.

## Autoria e componentes técnicos

- **Jogo, interface, regras e dados fictícios:** © 2026 Victor Luiz. Todos os direitos reservados.
- **Ferramentas de construção e runtime:** React, Vite, TypeScript, Tauri e suas dependências mantêm as próprias licenças. Os avisos legais ficam separados da interface de jogo em THIRD_PARTY_NOTICES.md.
- Não há tela de créditos de conteúdo de jogos de terceiros porque o conteúdo do jogo desta branch é original. Os avisos de licenças das ferramentas técnicas não são removidos.

Esta branch é um projeto autoral independente em seu estado atual. A existência de código histórico em outras branches do repositório não significa que esses arquivos estejam incluídos nesta árvore de trabalho.
