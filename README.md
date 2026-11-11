# Pulso 90

Pulso 90 é um jogo original de gestão de futebol para web e Android. A experiência combina carreira local, decisões táticas, partidas narradas, mercado e evolução de temporada, com uma identidade visual esportiva premium.

## Estado do projeto

A branch **jornada90-original** contém o projeto Pulso 90. A branch `main` e o projeto Openfoot não fazem parte desta reformulação.

- Tela de abertura cinematográfica, menu de carreira, créditos e preferências.
- Efeitos sonoros e trilha instrumental original gerada localmente, com controles independentes.
- Carreira local com nome e apelido do treinador e escolha de clube.
- Nomes de clubes brasileiros revisados e elenco publicado do Azuriz FC (33 atletas); outros elencos ainda usam dados de simulação até receber fontes oficiais.
- Liga de turno e returno com 56 partidas por temporada.
- Motor de partidas por minuto, intervalo, comentários, estatísticas, condição física e substituições.
- Suporte de motor para prorrogação e pênaltis em partidas eliminatórias.
- Formações, seis estilos táticos, titulares com banco visível e troca direta de jogadores da mesma posição.
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

Criação e direção do projeto: Victor Luiz. Pulso 90 é uma identidade original desta branch, sem reutilizar código-fonte, imagens ou recursos proprietários de OpenFoot Manager, OpenSWOS ou outro jogo. Os nomes do elenco do Azuriz foram consultados na página oficial do clube; seus atributos numéricos continuam sendo estimativas do simulador. A pasta public/music aceita somente faixas próprias ou licenciadas.

## Música própria e faixas licenciadas

A trilha instrumental padrão é gerada pelo próprio jogo. Para adicionar música externa, coloque apenas arquivos autorizados em `public/music/tracks/` e liste-os em `public/music/playlist.json`, com caminhos iniciados por `/music/tracks/`. Não inclua gravações comerciais sem autorização expressa dos titulares dos direitos.

## Dados de elenco

Os 20 elencos da Série A foram transcritos das páginas de elenco do Transfermarkt identificadas como temporada 2026, consultadas em 11/11/2026. O elenco do Azuriz foi transcrito da página oficial do clube. Idade, atributos, potencial, salários e valores usados pelo simulador continuam sendo estimativas próprias, não valores oficiais.
