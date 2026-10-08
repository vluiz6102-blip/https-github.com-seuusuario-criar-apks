# Jornada 90 Manager · Migração de renderer e runtime

## Regras de execução
Cada fase é executada isoladamente: implementar → testar → medir → registrar → commit. A API pública `window.J90Match2DV3` permanece estável com `start`, `pause`, `resume`, `cycleCamera` e `destroy`. Canvas 2D continua como fallback até o gate final.

## Fase 0 · Baseline

**Estado:** instrumentação implementada; primeira tentativa falhou no Android Emulator e foi corrigida antes da nova medição.

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

### Tentativa 1 · 2026-10-08
A primeira execução confirmou o pacote `com.jornada90.manager`, mas o smoke parou porque `_j90v3Frames` não chegou a 8 em 15 s. A segunda execução confirmou uma causa anterior no fluxo: o canvas ainda não havia sido criado dentro da janela padrão, porque a inicialização da partida aguarda o carregamento assíncrono do pacote de animação. O `dumpsys gfxinfo` registrou 9/9 frames janky na janela observada e o logcat apresentou 5 avisos `tile memory limits exceeded`. O Perfetto ficou com 0 bytes nas tentativas anteriores e, portanto, ainda não é evidência de baseline.

**Decisão:** manter o gate funcional, adicionar diagnóstico de timeout, habilitar `J90Perf` durante o smoke Android, ampliar a criação do canvas para 45 s, ampliar o timeout externo para 240 s, capturar Perfetto com `perfetto --background` e PID explícito e usar um perfil 1080-class no emulador. A validação de performance final continua obrigatoriamente no aparelho físico de referência. O aviso de tile memory segue sendo contabilizado e não é ocultado.

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
