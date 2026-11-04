# Pulso 90

Pulso 90 é um jogo original de gestão de futebol para web e Android. A experiência combina carreira local, decisões táticas, partidas narradas, mercado e evolução de temporada, com uma identidade visual esportiva premium.

## Estado do projeto

A branch **jornada90-original** contém o projeto Pulso 90. A branch `main` e o projeto Openfoot não fazem parte desta reformulação.

- Tela de abertura cinematográfica, menu de carreira, créditos e preferências.
- Efeitos sonoros sintetizados, com controle para ativar ou desativar.
- Carreira local com nome e apelido do treinador e escolha de clube.
- Oito clubes demonstrativos e elencos gerados para cada nova carreira.
- Liga de turno e returno com 56 partidas por temporada.
- Motor de partidas por minuto, intervalo, comentários, estatísticas, condição física e substituições.
- Suporte de motor para prorrogação e pênaltis em partidas eliminatórias.
- Formações, seis estilos táticos, mercado demonstrativo e evolução de temporada.
- Salvamento automático no dispositivo e exportação do save em JSON.
- A chave de armazenamento da carreira foi preservada para manter compatibilidade com saves locais existentes.

## Desenvolvimento

Requer Node.js 22 ou compatível.

```sh
npm install
npm run dev
npm test
npm run build
```

O resultado web compilado fica em `dist/`. O APK Android deve ser considerado validado somente após execução bem-sucedida do workflow Android e verificação de instalação em dispositivo ou emulador.

## Créditos

Criação e direção do projeto: Victor Luiz. Pulso 90 é uma identidade original desta branch, sem reutilizar código-fonte, imagens ou recursos proprietários de OpenFoot Manager, OpenSWOS ou outro jogo. Clubes e atletas da versão atual são demonstrativos.
