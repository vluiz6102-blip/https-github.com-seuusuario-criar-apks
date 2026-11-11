# Música do Pulso 90

## Como adicionar as faixas locais

Coloque os arquivos de áudio em `public/music/tracks/` (MP3, M4A, AAC, OGG, WAV ou WEBM) e edite `playlist.json` com o caminho de cada arquivo:

```json
{
  "tracks": [
    {
      "title": "Nome da faixa",
      "artist": "Artista",
      "src": "music/tracks/faixa-01.mp3"
    }
  ]
}
```

O caminho em `src` é relativo à pasta `public/`. Não use caminhos do computador, como `C:\\...`, nem URLs temporárias. Os arquivos colocados em `public/music/tracks/` serão incluídos no APK durante a compilação.

O player também reconhece arquivos importados em `assets/audio/` quando os nomes correspondem ao catálogo. Se não houver nenhuma faixa disponível, mostrará que a playlist está vazia em vez de ficar carregando indefinidamente.

Use somente gravações próprias ou licenciadas para uso no jogo.
