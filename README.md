# Jornada 90

**Jornada 90** agora usa uma base de simulador de futebol open-source em Godot, com gestão de clube, temporadas, transferências, IA de partidas, banco de dados e visualização 2D.

## Base técnica

- **Projeto-base:** [OpenComputerFutbolSimulator](https://github.com/antxiko/OpenComputerFutbolSimulator), fixado em um commit específico no submódulo `game/`.
- **Motor:** Godot 4.6.2, GDScript e renderer GL Compatibility.
- **Plataforma de entrega deste branch:** APK Android para aparelhos ARM.
- **Dados deste build:** 42 clubes fictícios e 924 jogadores fictícios gerados no processo de compilação. Escudos do projeto original e dados de times/jogadores com restrições próprias não são incluídos no APK.
- **Créditos e licença:** consulte `THIRD_PARTY_NOTICES.md` e `game/LICENSE`.

## Gerar o APK

O workflow **Jornada 90 Android APK** compila este branch no GitHub Actions. Faça push para `goal/open-source-replacement` ou inicie o workflow manualmente pela aba Actions. O artefato inclui `Jornada90.apk` e os avisos de licença.

O APK gerado nesta etapa é uma compilação de validação para instalação direta, ainda não uma certificação de release nem uma publicação na Play Store. O build usa o preset Android do Godot com suporte a Android 7.0/API 24 ou superior, incluindo Android 13–17 em termos de versão mínima declarada; compatibilidade real precisa ser confirmada em aparelhos/emuladores.

## Por que o projeto original não foi apagado

Este é um branch separado de migração. A branch `main` do repositório J90 continua intacta para permitir recuperação imediata caso a nova base não compile ou não funcione como esperado.

## Avisos legais

O código-fonte-base é distribuído sob MIT. A licença do upstream distingue explicitamente código e dados: por isso, os dados de clubes e jogadores e os escudos do upstream são substituídos antes de gerar o APK. O mecanismo de geração usa nomes fictícios, cores e escudos novos. Consulte os avisos de terceiros antes de redistribuir o jogo.
