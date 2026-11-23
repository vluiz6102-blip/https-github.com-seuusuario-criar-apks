# Créditos e licenças

## Autoria do jogo

**Jornada 90 Manager**  
Criador e desenvolvedor: **Victor Luiz**.

A concepção, identidade e desenvolvimento original do jogo são creditados a Victor Luiz. Este crédito não transfere nem altera as licenças dos componentes e recursos de terceiros.

## Tecnologias utilizadas

Inventário baseado nos arquivos e declarações do repositório:

- Phaser 4.2.1: engine de jogo.
- Capacitor 7.4.3: runtime/empacotamento Android.
- JavaScript, HTML5, Canvas/WebGL e Web Audio API: lógica, interface, renderização e áudio.
- Node.js/npm: scripts de build e validação.
- Python 3 e Pillow: geração de conteúdo visual.
- Gradle e Android SDK: build Android.

As versões devem ser confirmadas pelo lockfile e pelos artefatos finais. Este documento não substitui os avisos de licença distribuídos com cada dependência.

## Recursos de áudio de terceiros

O manifesto de origem é `audio-import/metadata.json`. Os itens abaixo estão declarados nesse manifesto. A presença no manifesto, por si só, não prova que o arquivo-fonte esteja atualmente incluído no APK; isso deve ser confirmado pelo validador de áudio e pela inspeção do artefato.

| Recurso | Autor | Licença declarada | Fonte |
|---|---|---|---|
| Ambient Wind / Real Wind | UnderlinedDesigns | CC0 | https://freesound.org/people/UnderlinedDesigns/sounds/172666/ |
| Leaves Rustling | GautamSujith | CC0 | https://freesound.org/people/GautamSujith/sounds/847378/ |
| Residential neighborhood ambience | MiLeuthner | CC0 | https://freesound.org/people/MiLeuthner/sounds/399025/ |
| Distant church bells, city and birds | Garuda1982 | CC BY 4.0 | https://freesound.org/people/Garuda1982/sounds/570144/ |
| Birds chirping | Bansemer | Pixabay Content License | https://pixabay.com/sound-effects/birds-chirping-75156/ |
| Dog barking in the distance | photos_ | Pixabay Content License | https://pixabay.com/sound-effects/dog-barking-in-the-distance-395349/ |
| Car passing city | soundreality | Pixabay Content License | https://pixabay.com/sound-effects/car-passing-city-364146/ |
| Calming Rain | Liecio | Pixabay Content License | https://pixabay.com/sound-effects/nature-calming-rain-257596/ |
| Rain Sound | soundreality | Pixabay Content License | https://pixabay.com/sound-effects/rain-sound-550289/ |
| Norwegian football match ambience | habbis92 | CC0 | https://freesound.org/s/206003/ |

### Atribuição CC BY 4.0

Áudio: “distant church bells with city and bird noises sound effect”, por **Garuda1982**, obtido no Freesound. Licença declarada: **Creative Commons Attribution 4.0 International (CC BY 4.0)**. O arquivo foi convertido para OGG conforme o manifesto do projeto.

Licença: https://creativecommons.org/licenses/by/4.0/

### Pixabay

Os itens identificados como Pixabay Content License devem ser usados em conformidade com os termos oficiais da plataforma: https://pixabay.com/service/license-summary/

## Dependências de software

As licenças das dependências devem ser verificadas a partir do inventário npm/Gradle da versão de release. Não atribuir a Victor Luiz a autoria de bibliotecas de terceiros.

## Regra para novas mídias

Não adicionar áudio, imagens, fontes, logos, marcas ou dados de terceiros sem registrar:

1. nome do recurso e autor;
2. URL de origem;
3. licença e URL do texto legal;
4. alterações realizadas;
5. hash SHA-256 do arquivo distribuído.

Se a licença não puder ser comprovada, o recurso não deve ser incluído na versão pública.
