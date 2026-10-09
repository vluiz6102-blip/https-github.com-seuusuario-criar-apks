# Jornada 90

Esta branch substitui a implementação antiga do J90 por uma base de jogo existente, mantida separadamente em `game-source`:

- **Projeto-base:** [OpenComputerFutbolSimulator](https://github.com/antxiko/OpenComputerFutbolSimulator)
- **Motor:** Godot 4.6.2
- **Sistemas existentes na base:** gestão de clube, temporadas, mercado de transferências, IA de clubes, simulação de partidas, visualização 2D, interface e salvamento de carreira.
- **Licença do código da base:** MIT, preservada no submódulo original.
- **Atribuição:** o autor original e a licença devem permanecer creditados; esta integração não reivindica autoria do código externo.

## Compilar APK Android

A workflow `.github/workflows/build-apk.yml` prepara uma build Android de teste e publica o APK como artifact do GitHub Actions. O APK inicial é de diagnóstico, não uma versão certificada para lançamento.

O repositório upstream deixa claro que os dados de equipes/jogadores incluídos nele são para uso pessoal. Para não redistribuir esse conjunto de dados com direitos de reutilização não confirmados, a workflow substitui os JSON por clubes e atletas fictícios antes da exportação. O motor, as telas e a lógica do jogo são mantidos no código upstream, sem alterações manuais.

## Clonar

Use `git clone --recurse-submodules` para baixar o código externo. A branch `main` original do Jornada 90 foi preservada; esta substituição fica isolada em `goal/open-source-replacement`.
