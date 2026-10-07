# Jornada 90 Manager - Instruções de desenvolvimento

## Objetivo
Manter o Jornada 90 Manager estável, jogável e pronto para evolução, preservando a fonte única do projeto.

## Regras
- Investigue a causa raiz antes de alterar código.
- Faça mudanças pequenas, testáveis e compatíveis com os sistemas existentes.
- Preserve funcionalidades existentes e não esconda falhas desativando testes.
- Execute verificações relevantes após cada alteração.
- Mantenha o build web e o caminho Android funcionais.
- Não adicione fotos de jogadores, áudio protegido ou assets copiados de EA/FIFA.
- Não altere segredos ou credenciais.
- Não faça alterações apenas para transformar uma build vermelha em verde.

## IA de futebol e gameplay
As IAs de gameplay existentes devem continuar responsáveis pelas mecânicas do jogo, incluindo:
- táticas e formações;
- impedimento e linha defensiva;
- posicionamento e movimentação;
- passes, dribles, finalizações e tomada de decisão;
- transições e comportamento de jogadores;
- arbitragem e eventos de partida;
- carreira, elenco, transferências e desenvolvimento.

Esses sistemas fazem parte do jogo e não devem ser confundidos com agentes autônomos de CI.

## Validação mínima
Antes de considerar uma alteração concluída, quando aplicável:
- `npm run quality:scan`
- `npm run build`
- smoke/diagnóstico do navegador
- validação do caminho Android

Nunca declare o projeto pronto sem evidências dos checks executados.
