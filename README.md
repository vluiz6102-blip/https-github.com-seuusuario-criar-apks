# Jornada 90

Jornada 90 é um jogo original de gestão de futebol, criado para uma experiência mobile leve. O foco é uma carreira com decisões relevantes, partidas narradas por texto e interface rápida. A branch **jornada90-original** é uma base de código nova e não reutiliza código-fonte, imagens, arquivos internos ou recursos de OpenFoot Manager, OpenSWOS ou outro jogo.

## Estado atual

Esta é a primeira base jogável de desenvolvimento, não uma versão final nem um APK publicado.

- Carreira local com nome e apelido do treinador e escolha de clube.
- Oito clubes demonstrativos com elencos gerados para cada nova carreira.
- Liga de turno e returno com 56 partidas por temporada e classificação calculada a partir dos resultados.
- Motor de partidas por minuto, com primeiro tempo, intervalo em 45', segundo tempo, comentários, estatísticas, condição física e substituições.
- Suporte de motor para prorrogação e pênaltis em partidas eliminatórias.
- Formações, seis estilos táticos, mercado demonstrativo e evolução de temporada.
- Salvamento automático no dispositivo e exportação do save em JSON.
- Interface responsiva, sem renderização 2D de campo.

## Desenvolvimento

Requer Node.js 22 ou compatível.

```sh
npm install
npm run dev
npm test
npm run build
```

O resultado web compilado fica em `dist/`. A configuração Capacitor está preparada para o empacotamento Android, mas um APK só deve ser considerado entregue depois que o fluxo Android e os testes forem executados com sucesso.

## Princípios

1. Regras previsíveis e motor independente da interface.
2. Prioridade para desempenho e estabilidade em Android, sem dependência de WebGL ou Canvas de partida.
3. Dados demonstrativos identificados como fictícios. Bases reais de clubes e elencos serão adicionadas após validar origem, atualização e permissões.
4. Testes automáticos antes das entregas para evitar regressões no cronômetro, intervalo, placar e classificação.

## Créditos

Projeto original: Victor Luiz. Nome, identidade visual e código desta branch foram criados para o Jornada 90.
