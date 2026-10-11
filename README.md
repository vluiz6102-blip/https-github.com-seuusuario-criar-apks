# Maia Soccer Manager

**Jogo de gestão de futebol criado para Victor Luiz.**

A branch `maia-original-manager` contém uma implementação independente de manager: interface mobile-first, lógica de carreira, eventos, simulação textual de partidas, diretório próprio de clubes e fichas curadas de atletas. Não usa um motor de jogo de terceiros para renderizar partidas.

## O que há nesta versão

- Quatro clubes reais para iniciar uma carreira: Manchester City, Liverpool, Real Madrid e Palmeiras.
- Diretório mundial v1 com clubes da Europa, América do Sul, América do Norte, Ásia e África, incluindo ligas, estádios, países, cores informativas e rivalidades.
- Fichas de atletas reais selecionados com nome, nacionalidade, posição e atributos numéricos usados pelo jogo.
- Partidas em **cinco minutos de simulação textual**, divididas em cinco avanços. Não há campo 2D, bolinhas, animação do jogo ou canvas na tela de partida.
- Mercado, treinos, evolução de atletas, formações, estilos de jogo, orçamento, temporada, calendário e resultados.
- Notícias da carreira para anúncios de contratação, resultados, clássicos e eventos de patrocínio.
- Diretório editorial separado com notícias factuais e links para as fontes consultadas.
- Salvamento local com validação e fallback visual de erros React para evitar que uma falha da interface produza apenas uma tela vazia.

## Importante sobre a base mundial

Esta é a **base mundial v1, ainda incompleta**. Ela não contém todos os clubes e todos os jogadores do mundo, nem todos os elencos profissionais completos. Quando a carreira precisa completar um elenco sem informação real cadastrada, ela usa jogadores originais identificados dentro do jogo. Técnicos sem confirmação nesta edição ficam indicados como não confirmados, em vez de receberem um nome inventado.

Idade, nota, potencial e valor de mercado numérico dos atletas no jogo são parâmetros de simulação, não estatísticas ou avaliações oficiais. Os nomes dos clubes, estádios, pessoas e os factos noticiosos são informações de referência; as parcerias com marcas e as notícias geradas pela carreira são eventos fictícios do save. Uma proposta a Nike, adidas ou PUMA não é apresentada como patrocínio real confirmado.

As notícias reais incluídas são um recorte editorial datado e ligado às fontes, não um feed ao vivo. Consulte os links no diretório para ler a publicação original.

## Desenvolver e testar

Requisitos: Node.js 24, Rust, Android SDK/NDK e as dependências de construção Tauri 2.

```sh
npm ci
npm run build
npm test
```

No Android, o workflow GitHub Actions executa também uma verificação de inicialização em emulador x86_64, além de gerar e assinar um APK ARM64 para teste em dispositivo. O teste de emulador verifica se o processo continua em foreground por 12 segundos e guarda logcat e captura de tela para investigação se falhar.

O APK de debug é para instalação de teste e não é assinado com uma chave de produção para publicar na Play Store.

## Autoria, fontes e licenças

- **Implementação original do jogo, UI, motor da simulação e conteúdo original:** © 2026 Victor Luiz.
- Os dados factuais curados e links de fontes ficam em `src/data/world-database.ts`; veja também os sites oficiais listados nesse arquivo.
- React, Vite, TypeScript, Tauri e dependências técnicas conservam as próprias licenças. Os avisos técnicos ficam separados da interface em [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Não retire os avisos legais obrigatórios das bibliotecas redistribuídas.
- Não estão incluídos escudos oficiais, uniformes oficiais, fotografia de atletas ou imagens licenciadas de clubes.
