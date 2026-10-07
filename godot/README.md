# Jornada 90 Manager - alvo Godot

## Estado da migração

O produto atual do repositório continua sendo a versão JS/Capacitor. Este diretório é o novo alvo nativo Godot e não injeta um segundo runtime no APK antigo.

A auditoria encontrou os seguintes sistemas existentes e os usa como origem funcional:
- \`src/j90-match2d-v3.js\`: renderer 2D pixel/top-down.
- \`src/j90-ai2.js\`: IA de partida, funções e estilos de equipe.
- \`src/j90-match-events.js\`: árbitro, impedimento, cartões, lesões e incidentes.
- \`src/j90-manager-stats.js\`: identidade estatística dos estádios.
- \`src/j90-soundscape.js\`: áudio e ambiente.

Não foram encontrados antes da migração arquivos Godot ou classes \`.gd\`, portanto não existe duplicidade entre classes nativas e o runtime nativo anterior.

## Regras de produção

- Orientação exclusivamente retrato.
- Viewport lógico 320x180 com escala inteira.
- Nearest filtering e pixel snap.
- Mobile renderer como alvo Android principal.
- Fallback para GL Compatibility quando o backend de RenderingDevice não estiver disponível.
- 60 Hz para aparelhos capazes; 30 Hz apenas no perfil Lite.
- IA, eventos e áudio não criam loops próprios.
- Um único \`J90MatchSimulation._physics_process()\` é dono do passo fixo da partida.
- O renderer usa \`_process()\` somente para interpolação visual, sem alterar o estado da simulação.
- Carregamento pesado usa \`ResourceLoader.load_threaded_request()\`.
- Cenas da partida são isoladas por \`change_scene_to_file()\`, eliminando menus antigos atrás do campo.
- Ao sair para background, a partida é persistida antes da suspensão e restaurada ao retornar.

## Perfis

| Perfil | Critério | Física | FPS | FX | Renderer |
|---|---|---:|---:|---|---|
| High-Performance | >= 3 GB, >4 cores, Vulkan >= 1.2 | 60 Hz | 60/90/120 | completos | Mobile/Vulkan |
| Lite | < 3 GB, <=4 cores ou fallback Compatibility | 30 Hz | 60 | reduzidos | Compatibility/OpenGL |

A escolha do renderer é feita pelo próprio Godot no boot. O detector não tenta trocar de renderer no meio da execução.

## Monetização

Rewarded Ads estão desativados.

O Café 90 aceita intenção de contribuição entre R$0,01 e R$1.000.000, mas no Google Play os produtos de compra são cadastrados com preço de catálogo. Por isso:
- compras dentro do Play usam tiers fixos;
- quantias arbitrárias usam checkout compatível configurado pelo servidor;
- o uniforme personalizado é anexado ao pedido e só é concedido após verificação;
- recibos são verificados no servidor;
- respostas verificadas ficam cacheadas offline;
- nenhuma compra altera atributos de jogo ou dá vantagem competitiva.

## Gate de lançamento

O CI do Godot deve validar:
1. parsing/carregamento de todas as classes nativas;
2. orientação retrato;
3. viewport pixel-perfect;
4. fallback de renderer;
5. ausência de \`_process/_physics_process\` em IA, eventos, áudio, monetização e streamer;
6. existência da cena de partida e do controlador de troca de cenas.

A build antiga JS/Capacitor permanece separada até a matriz de dispositivos Android validar a substituição.
