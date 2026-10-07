# Jornada 90 Manager - Godot migration foundation

## Target

Godot **4.7.2 stable** como baseline do projeto. Godot 4.8 estava em desenvolvimento no momento desta decisão, então não entra no alvo de lançamento. Para 2D pixel art, **Compatibility** é uma escolha especialmente forte quando o objetivo principal é alcançar a maior variedade de hardware. O renderer **Mobile** fica disponível para aparelhos modernos capazes de Vulkan.

A documentação oficial do Godot descreve Compatibility como o renderer com maior alcance em hardware antigo/baixo e observa que, para jogos 2D, ele costuma ser suficiente. O renderer Mobile é o caminho para dispositivos modernos com Vulkan. O próprio Godot também possui fallback automático para Compatibility quando o renderer baseado em RenderingDevice não pode ser usado.

## Estrutura

- `autoload/HardwareDetector.gd`
  - classifica o aparelho em `high_performance` ou `lite`;
  - 60 Hz de física no perfil principal;
  - 30 Hz no Lite;
  - limita FPS a 120/60;
  - desliga efeitos secundários no Lite;
  - controla a resolução interna do SubViewport sem redimensionar a janela.
- `autoload/AudioManager.gd`
  - pool fixo de vozes;
  - deduplicação por evento e por frame;
  - prioridade/cooldown para impedir o SFX `puf...puf...` em loop.
- `autoload/AssetPreloader.gd`
  - `ResourceLoader.load_threaded_request()`;
  - progresso monitorado entre frames;
  - nunca chama `load_threaded_get()` antes de `LOADED`.
- `autoload/MonetizationManager.gd`
  - Google Play Billing;
  - verificação server-side;
  - acknowledge/consume apenas depois da validação;
  - cache cifrado + entitlement assinada;
  - rewarded-only;
  - bloqueio de rewarded durante `live_match`.
- `rendering/PixelPerfectViewport.gd`
  - viewport lógico;
  - nearest filtering;
  - integer/pixel-safe scaling.

## Observação crítica sobre "2020+"

Não use o ano do aparelho como regra técnica. Em Android, não existe uma API universal confiável que entregue "ano do SoC" para GDScript. O detector deve trabalhar com capacidades: RAM, renderer/driver, CPU e refresh rate.

## Play Billing

O pedido original falava em Billing v6+. Isso não deve ser usado para um lançamento em 2026. A documentação oficial atual informa:

- Billing Library 6: sem suporte para novos apps/updates desde 31/08/2025.
- Billing Library 7: prazo de novos apps/updates até 31/08/2026.
- Billing Library 8: suporte até 31/08/2027.
- Billing Library 9: suporte até 31/08/2028.
- A release atual encontrada na documentação oficial é Billing Library **9.1.0**, portanto o projeto não deve iniciar uma integração nova em Billing 6.

A integração Godot recomendada para Google Play Billing é o plugin first-party **GodotGooglePlayBilling**, compatível com Godot 4.2+, e a documentação atual do plugin registra a API `BillingClient.new()`, sinais assíncronos e `acknowledge_purchase()`/`consume_purchase()`.

## Rewarded Ads

O módulo não expõe banner/interstitial. A integração deve utilizar somente Rewarded Video. Em desenvolvimento, deve usar o ID oficial de teste do Google. O ID de produção entra somente na configuração Release.

## Segurança do offline cache

O arquivo local é cifrado para reduzir exposição casual e a entitlement é validada pela chave pública. A criptografia local **não** é considerada uma fronteira de confiança: a autoridade real continua sendo o servidor.

## Catálogo inicial de produtos

| ID | Categoria | Pay-to-Win |
|---|---|---|
| `j90_season_pass` | Passe de temporada cosmético/conveniência | Não |
| `j90_stadium_pack` | Pacote visual do estádio | Não |
| `j90_manager_customization` | Personalização visual do técnico | Não |
| `j90_save_slot` | Slot adicional de save | Não |

## Tabela de performance

| Recurso | High-Performance | Lite |
|---|---:|---:|
| Física/IA | 60 Hz | 30 Hz |
| FPS máximo | 120 | 60 |
| Alvo de tela | 90/120 quando disponível | 60 |
| Renderer | Mobile Vulkan quando selecionado/suportado | Compatibility ou fallback |
| Viewport lógico | 320×180 | 256×144 |
| Pixel art | Nearest / hard-edge | Nearest / hard-edge |
| Partículas secundárias | Ligadas | Desligadas |
| Sombras dinâmicas | Ligadas quando usadas | Desligadas |
| Pós-processamento | Ligado de forma seletiva | Desligado |
| Efeitos secundários | Ligados | Desligados |
| Escala interna | 100% | 85% |
| Assets | ETC2/ASTC conforme plataforma | ETC2/ASTC de menor resolução/qualidade |
| Objetivo | 60 FPS estáveis, até 120 | 60 FPS estáveis com carga reduzida |

## Política de seleção de renderer

Não altere `rendering_method` em runtime como se fosse um botão de qualidade. Essa decisão pertence ao bootstrap/export. O detector lê o renderer que realmente iniciou.

Recomendação:

1. baseline de produção: `mobile` em Godot 4.7.2;
2. manter uma configuração/export Compatibility para aparelhos sem Vulkan;
3. o `HardwareDetector` lê o renderer efetivamente iniciado e escolhe o perfil de carga;
4. nunca trocar o renderer em runtime;
5. validar em aparelhos reais de baixo/médio/alto nível.

## Migração do núcleo

1. Portar estado/carreira para Resources/Nodes sem depender de UI.
2. Portar IA de partida para `_physics_process()`.
3. Renderizar jogadores/bola em uma cena própria e destruível.
4. Usar `PackedScene` para jogadores, estádio e menus.
5. Usar `ResourceLoader`/`load_threaded_request` para assets pesados.
6. Manter saves e entitlements fora da cena.
7. Substituir callbacks DOM por signals Godot.
8. Testar cold boot, retorno do background, perda de rede, compra pendente e reinstalação.
9. Testar o `AudioManager` com rajadas de eventos e garantir no máximo 12 vozes.
10. Testar o `AssetPreloader` com falha de asset e fila vazia.

## Critérios de lançamento

- nenhum banner/interstitial;
- nenhum grant local sem entitlement assinada;
- compra pendente não gera item;
- acknowledge depois da verificação;
- consumable consumido depois da verificação;
- rewarded bloqueado durante partida;
- troca Manager -> Match destrói a cena anterior;
- retorno do Android background não reinicia a partida;
- Lite não usa partículas/sombras/pós-FX secundários;
- pixel art permanece hard-edge em todas as escalas suportadas.
