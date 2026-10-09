# Jornada 90

**Marca e personalização:** Victor Luiz

**Tecnologias usadas:** React, TypeScript, Rust, WebAssembly, Vite e Capacitor 7.

## O que já existe

A base de jogo contém simulação de partidas, temporadas, três divisões, promoção e rebaixamento, Copa, finanças, contratos, mercado de transferências, desenvolvimento de jogadores, IA para clubes rivais e salvamento local da carreira. A interface web é responsiva e foi feita para funcionar em telas móveis; o APK é empacotado com Capacitor.

A tela inicial agora permite escolher um dos clubes disponíveis antes de iniciar a carreira. A engine de partidas e a progressão de temporada são testadas na pipeline, antes da aplicação da marca.

## Dados ainda necessários antes de chamar a versão de final

O banco atual do jogo usa 60 clubes fictícios e elencos derivados/ficcionalizados. **Ainda não contém todos os elencos reais do futebol mundial nem um modo completo de carreira com seleções nacionais.** Não vou substituir essa base por dados raspados de jogos comerciais sem uma licença verificável ou misturar jogadores aleatoriamente entre clubes e chamá-los de elencos reais. Esse banco precisa ser uma etapa de integração própria com uma fonte de dados autorizada e cobertura conhecida.

## APK Android

A branch `goal/open-source-replacement` gera o APK por GitHub Actions. Os avisos legais dos componentes open-source permanecem incluídos no pacote (`game-source/LICENSE` e `OPEN_SOURCE_LICENSES.txt`); isso não exige mostrar atribuições de terceiros na tela principal.

A branch `main` original do J90 continua preservada.
