# Jornada 90 Manager — checklist de lançamento

**Responsável pelo projeto:** Victor Luiz  
**Branch de preparação:** `release/jornada90-vic-launch`  
**Base selecionada:** `feature/phaser4-render-core`

Este checklist é um gate de lançamento. Nenhum item pode ser marcado como aprovado sem log, artefato ou evidência reproduzível anexada.

## 1. Integridade do repositório

- [ ] Fixar Node/npm e gerar/commitar lockfile.
- [ ] Confirmar versões exatas de Phaser, Capacitor e plugins.
- [ ] Remover dependências não utilizadas e código morto comprovado.
- [ ] Executar verificação de sintaxe e análise estática.
- [ ] Confirmar que a branch de release contém todos os módulos necessários.
- [ ] Revisar segredos, chaves e dados pessoais antes da publicação.

## 2. Dados e elencos

- [ ] Gerar `data/rosters.json` a partir de fontes identificadas.
- [ ] Registrar origem, temporada e data de atualização dos dados.
- [ ] Validar clubes, jogadores, IDs únicos e posições.
- [ ] Garantir 11 titulares, goleiro válido e banco sem duplicações.
- [ ] Testar elenco incompleto e impedir preenchimento silencioso com jogadores fictícios.
- [ ] Confirmar funcionamento offline após o pacote ser gerado.

## 3. Partidas e IA

- [ ] Confirmar início e fim de partida.
- [ ] Confirmar duração de seis minutos totais (3 minutos por tempo), se esse for o regulamento final definido.
- [ ] Testar intervalo, acréscimos, prorrogação e pênaltis.
- [ ] Confirmar sincronização entre relógio, simulação e renderização sob baixa taxa de frames.
- [ ] Testar decisões da IA em diferentes placares, minutos, formações, lesões e cartões.
- [ ] Confirmar substituições e validação de escalação.

## 4. Phaser / Chromium

- [ ] Confirmar boot sem erros no console.
- [ ] Confirmar Phaser 4.2.1 carregado e cena inicial pronta.
- [ ] Confirmar WebGL2, WebGL e fallback Canvas quando aplicável.
- [ ] Testar kickoff, pausa, retomada e encerramento.
- [ ] Medir FPS, P95/P99 e long tasks sem truncar o delta bruto.
- [ ] Testar mudança de orientação, background/foreground e perda/restauração de contexto.
- [ ] Testar em Chromium desktop e Android WebView.

## 5. Áudio e direitos

- [ ] Executar `npm run audio:validate` com 10/10 arquivos válidos.
- [ ] Confirmar que os arquivos validados estão no bundle e no APK.
- [ ] Verificar decode e reprodução no Chromium e em aparelho Android com áudio habilitado.
- [ ] Confirmar pausa, retomada, volume, fade e ausência de fontes duplicadas.
- [ ] Confirmar som de torcida em partida e reações a gol.
- [ ] Verificar todas as licenças e atribuições em `CREDITS.md`.
- [ ] Não incluir recurso com licença desconhecida ou incompatível.

## 6. Replay e celebrações

- [ ] Evento de gol inclui autor, equipe, minuto e dados do lance.
- [ ] Replay usa dados reais registrados, não inferência por texto/OVR.
- [ ] Testar gol, defesa, trave e finalização para fora.
- [ ] Confirmar pausa do relógio durante replay e retorno único ao jogo.
- [ ] Confirmar jogador correto na comemoração.

## 7. Salvamento e UX

- [ ] Testar novo jogo, salvar, fechar e reabrir.
- [ ] Testar migração de save entre versões.
- [ ] Tratar storage indisponível/corrompido sem travar.
- [ ] Revisar telas, navegação, acessibilidade, textos e estados vazios.
- [ ] Confirmar que não há botões sem ação ou fluxos impossíveis de concluir.

## 8. APK Android

- [ ] Executar build de release, não apenas debug.
- [ ] Definir applicationId definitivo e mantê-lo nas atualizações.
- [ ] Assinar com chave de release protegida fora do repositório.
- [ ] Executar `zipalign -c -v 4`.
- [ ] Executar `apksigner verify --verbose --print-certs`.
- [ ] Executar `unzip -t` e SHA-256.
- [ ] Inspecionar manifest, permissões, versão e tamanho.
- [ ] Instalar em emulador e aparelho físico.
- [ ] Testar atualização sobre versão anterior e preservar saves.
- [ ] Inspecionar logcat por crash, ANR, OOM e falhas WebView.

## 9. Publicação

- [ ] Anexar logs completos da CI.
- [ ] Anexar APK final e SHA-256.
- [ ] Publicar notas de versão, créditos e licenças.
- [ ] Confirmar política de privacidade se houver coleta/telemetria.
- [ ] Criar tag de versão apenas após todos os gates obrigatórios passarem.

## Estado atual

**PENDENTE — não aprovado para lançamento.**

A branch base declara requisitos de build que precisam ser gerados e verificados: `data/rosters.json`, `assets/j90-content/content-manifest.json`, pacote de áudio e runtime Android. A aprovação depende de executar os testes na mesma revisão de código que será publicada.
