# Jornada 90 Fusion Pack

## Objetivo
Unificar boas ideias de projetos de futebol 2D/manager em uma implementação original dentro do Jornada 90 Manager, sem copiar código, arte ou identidade visual de terceiros.

## Referências pesquisadas

- TouchLines: partidas 2D em tempo real com decisões de jogadores e impacto de pressão/linha defensiva. O projeto é AGPL-3.0, então foi usado apenas como referência funcional.
- soccer-js: motor 2D isométrico com IA, regras, peças paradas, determinismo por seed e execução headless. O projeto usa MIT, mas a integração deste repositório é uma implementação própria.
- FM-with-c: manager web em JavaScript com telas de partida, táticas, transferências, treino, notícias e carreira. A licença declarada não é uma licença OSS padrão, portanto somente ideias de produto foram usadas.
- Touchline / football-manager: referência para abordagem mobile-first, engine determinístico, saves locais e testes de engine.

## O que entrou no Jornada 90

src/j90-fusion.js adiciona um Match Center leve sobre o renderer 2D existente:

- presets rápidos de Controle, Pressão, Transição e Bloco;
- integração com J90TACT já existente;
- troca de câmera usando o controle já existente;
- placar, posse, finalizações, finalizações no alvo, passes, dribles e pressão;
- painel de análise;
- atualização somente por segundo de simulação, evitando churn de DOM a cada frame;
- nenhum Canvas adicional;
- nenhum requestAnimationFrame próprio;
- nenhum setInterval próprio.

A regra é preservar um único loop visual e o único canvas da partida.

## Qualidade

O pipeline agora valida a sintaxe do novo runtime, inclui o arquivo no build e o smoke test abre o painel, verifica o contrato global e aplica um preset tático em uma partida real.