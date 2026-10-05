# Jornada 90 - áudio ambiental

O motor de paisagem sonora usa **gravações reais** carregadas de `assets/audio/` e nunca sintetiza pássaros, cães, chuva, carros ou torcida com osciladores.

## Estrutura esperada

```
assets/audio/
├── wind/
│   ├── wind-soft-01.mp3
│   └── wind-soft-02.mp3
├── trees/
│   ├── leaves-soft-01.mp3
│   ├── leaves-soft-02.mp3
│   ├── trees-medium-01.mp3
│   └── branches-wind-01.mp3
├── neighborhood/
│   └── neighborhood-bed-01.mp3
├── stadium/
│   └── stadium-distant-01.mp3
├── birdsBed/
│   ├── birds-distant-01.mp3
│   └── birds-distant-02.mp3
├── insects/
│   └── insects-evening-01.mp3
├── rain/
│   ├── light-rain-bed-01.mp3
│   ├── heavy-rain-bed-01.mp3
│   ├── rain-leaves-01.mp3
│   └── drops-01.mp3
├── dog/
│   ├── dog-distant-01.mp3
│   ├── dog-distant-02.mp3
│   └── dog-distant-03.mp3
├── birdEvents/
│   ├── bird-call-01.mp3
│   ├── bird-call-02.mp3
│   └── bird-call-03.mp3
├── car/
│   ├── car-pass-01.mp3
│   └── car-pass-02.mp3
├── bus/
│   └── bus-distant-01.mp3
├── horn/
│   └── horn-distant-01.mp3
├── branch/
│   └── branch-crack-01.mp3
├── gust/
│   └── wind-gust-01.mp3
├── traffic/
│   └── traffic-distant-01.mp3
├── vendor/
│   └── vendor-distant-01.mp3
├── chant/
│   └── chant-distant-01.mp3
├── drum/
│   └── drum-distant-01.mp3
├── stadiumEvents/
│   ├── gate-metal-01.mp3
│   └── ball-kick-distant-01.mp3
└── thunder/
    └── thunder-distant-01.mp3
```

## Estado atual do repositório

Nenhum arquivo de áudio real está presente em `assets/` neste momento. O diretório contém apenas o ícone do aplicativo.

Por isso o build gera um manifesto vazio e o motor entra em fallback silencioso, sem tentar criar sons artificiais e sem repetir requisições para arquivos ausentes.

## Assets recomendados

Priorize gravações naturais longas para as camadas contínuas, preferencialmente 30 s ou mais, com início/fim compatíveis para loop ou com pontos de crossfade. Eventos podem ser curtos.

Para cada arquivo adicionado, o build detecta automaticamente a extensão `.mp3`, `.ogg`, `.wav` ou `.m4a` e gera o manifesto usado pelo APK.

