# Jornada 90 Manager

**Jornada 90 Manager** é um jogo de gerenciamento e carreira de futebol. Esta branch de preparação para lançamento usa como base oficial `feature/phaser4-render-core`.

## Autoria

- **Criador e desenvolvedor:** Victor Luiz.

O crédito de autoria do jogo é de Victor Luiz. Bibliotecas, ferramentas, dados, áudio e demais recursos de terceiros permanecem atribuídos aos respectivos autores e licenciadores, conforme [CREDITS.md](CREDITS.md).

## Tecnologias identificadas no projeto

- **Phaser 4.2.1**: engine gráfica/runtime de jogo.
- **Capacitor 7.4.3**: empacotamento da aplicação web para Android.
- **JavaScript e HTML5**: interface e lógica principal atualmente presentes em `index.html` e nos módulos de runtime.
- **WebGL / WebGL2**: detecção de capacidade gráfica e seleção de perfil de renderização.
- **Web Audio API**: reprodução e mixagem de áudio no navegador/WebView.
- **Node.js**: scripts de build, importação/validação de áudio e qualidade.
- **Python 3 + Pillow**: geração do pacote de conteúdo visual.
- **Gradle / Android SDK**: compilação do aplicativo Android.

As versões acima refletem declarações encontradas nos arquivos do projeto. O inventário deverá ser atualizado quando o lockfile e a cadeia Android forem consolidados.

## Desenvolvimento

Requisitos observados nos scripts:

- Node.js compatível com as dependências do projeto.
- npm.
- Python 3 e Pillow para gerar o pacote visual.
- FFmpeg e FFprobe para converter e validar áudio importado.
- Android SDK/Gradle para gerar APK.

Instalação inicial:

```bash
npm install
```

Sincronização de elencos (usa fontes externas):

```bash
npm run data:rosters
```

Geração do pacote de conteúdo (pode consumir bastante espaço e tempo):

```bash
python3 -m pip install Pillow
npm run content:build
```

Validação e build:

```bash
npm run audio:validate
npm run quality:scan
npm run build
npx cap sync android
```

O build web exige `data/rosters.json` e `assets/j90-content/content-manifest.json`. O script de conteúdo gera recursos de grande porte; verifique o espaço disponível antes de executá-lo.

## Estado de lançamento

Esta branch é uma linha de preparação, não uma declaração de release. Consulte [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md). Nenhuma versão deve ser anunciada como pronta sem logs verdes do build, testes em Chromium, instalação Android, validação do APK e verificação de licenças.

## Segurança e distribuição

- Não commitar keystores, senhas, tokens ou arquivos de assinatura privados.
- APK de debug não equivale a APK de produção.
- APK de release deve ser assinado com chave protegida e processo de atualização documentado.
- Dados de elencos e assets externos precisam ter origem, data e licença documentadas.
