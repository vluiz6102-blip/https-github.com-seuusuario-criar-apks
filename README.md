# Jornada 90

**Marca:** Jornada 90  
**Desenvolvimento e personalização:** Victor Luiz  
**Tecnologias:** React, TypeScript, Rust, WebAssembly, Vite, Capacitor 7 e Android.

## Modos e melhorias desta branch

- Carreira de clube real: seleção de clube por competição/pais, tabela, resultados por rodada, elenco e valores de mercado reportados.
- Seleções: 48 seleções e 1.248 jogadores do snapshot de elencos do Mundial de 2026.
- Perfil do treinador: nome e apelido gravados no dispositivo.
- Central de notícias: manchetes externas ligadas às fontes originais, com radar de mercado da base local.
- Áudio: música relaxante em loop sob CC0 e efeitos discretos de interface, com controles de volume e liga/desliga.
- Ícone Android dedicado, identidade visual mobile e crédito das tecnologias.
- Modo clássico anterior continua disponível como alternativa.

## Dados, datas e cobertura

O banco de clubes/jogadores/valores é gerado no build a partir de `dcaribou/transfermarkt-datasets`, declarado CC0. O próprio projeto de dados informa um snapshot até 6 de julho de 2026 e que avaliações de mercado não receberam atualizações regulares após 27 de fevereiro de 2026. Os valores mostrados são **valores reportados no snapshot**, não cotações ao vivo. A GER e os atributos usados na simulação são estimativas calculadas pelo jogo, não classificações oficiais.

O seletor inclui apenas competições em que a fonte fornece clubes suficientes com pelo menos 11 jogadores vinculados; ligas inferiores do Brasil e níveis inferiores da Inglaterra não estão completos nessa fonte e não devem ser interpretados como já implementados. A base de seleções do Mundial 2026 e a base de clubes/jogadores têm coberturas diferentes.

A Central de Notícias busca manchetes por meio de um feed externo e mostra títulos com links para as publicações originais. Se não houver internet, o radar de mercado local continua disponível. A trilha `relax_background1_0.ogg` é de joaquinton / OpenGameArt, CC0.

## Compilação Android

O workflow `.github/workflows/build-apk.yml` testa o motor original e o front-end, gera o APK e publica o artefato temporário no GitHub Actions. A branch original `main` continua preservada.
