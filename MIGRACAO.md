# Jornada 90 Manager · Migração de renderer e runtime

## Regras de execução
Cada fase é executada isoladamente: implementar → testar → medir → registrar → commit. A API pública `window.J90Match2DV3` permanece estável com `start`, `pause`, `resume`, `cycleCamera` e `destroy`. Canvas 2D continua como fallback até o gate final.

## Fase 0 · Baseline

**Estado:** instrumentação implementada; aguardando a medição CI antes de iniciar a Fase 1.

### Instrumentação
- `window.J90Perf` v1.0, desligado por padrão e ativável explicitamente por CDP ou `?j90perf=1`.
- FPS, frame time P50/P95/P99, Long Tasks, DOM total/visível, animações CSS ativas, tamanho dos canvases e DPR.
- Smoke Android confirma `com.jornada90.manager`.
- Coleta `dumpsys gfxinfo` e `dumpsys meminfo` antes/depois.
- Sessão Perfetto padronizada cobrindo abertura → partida → câmeras → troca de tela → background → foreground.
- Contagem objetiva do aviso Chromium `tile memory limits exceeded`.
- Artefato CI `j90-phase0-baseline` com JSON e capturas brutas.

### Baseline numérico
Os valores abaixo serão preenchidos com a execução real desta fase. Nenhum número será estimado.

| Métrica | Baseline |
|---|---:|
| FPS | a medir |
| Frame P50 | a medir |
| Frame P95 | a medir |
| Frame P99 | a medir |
| Long Tasks | a medir |
| DOM total | a medir |
| DOM visível | a medir |
| Animações CSS ativas | a medir |
| DPR | a medir |
| Canvas | a medir |
| Tile memory warnings | a medir |
| Perfetto trace | a medir |
| gfxinfo | a medir |
| meminfo/PSS | a medir |

### Gate F0
- [ ] monitor compila/carrega
- [ ] pacote confirmado como `com.jornada90.manager`
- [ ] fluxo Android via CDP completo
- [ ] gfxinfo coletado
- [ ] meminfo coletado
- [ ] Perfetto capturado
- [ ] tile memory quantificado
- [ ] baseline numérico registrado
- [ ] renderer não alterado

## Fases seguintes
Não iniciar até o Gate F0 estar fechado.
