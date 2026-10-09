# Jornada 90 para Android

Esta branch usa **Gandula** como base de jogo: um manager de futebol brasileiro com interface responsiva para celular, temporadas, três divisões, promoção/rebaixamento, Copa do Brasil, finanças, contratos, mercado de transferências, desenvolvimento de jogadores, clubes rivais com IA e partidas simuladas.

- **Base original:** [felipedbene/gandula](https://github.com/felipedbene/gandula)
- **Licença do projeto-base:** MIT. A licença e os créditos originais são preservados.
- **Crédito da personalização Android/marca:** Victor Luiz.
- **Modo de jogo:** offline, carreira e dados locais no navegador/WebView, sem exigir conta nem servidor de jogo.
- **Alterações funcionais:** nenhuma alteração intencional no motor, na simulação ou nos sistemas de carreira. A pipeline só aplica a marca Jornada 90 e inclui os créditos.

## APK Android

O workflow `.github/workflows/build-apk.yml` compila o motor Rust para WebAssembly, executa os testes do projeto, gera o site mobile-first e empacota a aplicação com Capacitor. O APK é disponibilizado como artefato de teste do GitHub Actions.

A implementação original é baixada pelo submódulo `game-source`; use `git clone --recurse-submodules` para obter o código completo. A branch `main` original do Jornada 90 continua preservada.

**Atribuição:** o código-base do simulador é de Felipe De Bene (Gandula), sob MIT. Victor Luiz é responsável pela marca Jornada 90 e pelo empacotamento Android, não pela autoria do motor original. A interface inclui um link para o texto completo da licença MIT.
