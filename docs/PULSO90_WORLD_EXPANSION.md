# PULSO 90 — expansão do universo mundial

## Direção do produto

PULSO 90 será um simulador de gestão de futebol em 2D, offline-first e com carreiras de longo prazo. A profundidade fica no motor e nos dados; a interface deve continuar clara para quem só quer escolher um clube, montar o time em poucos toques e avançar os dias enquanto ouve música em outro aplicativo.

Princípios:
- **2D, sem motor 3D** nesta etapa. Campo tático em SVG/CSS, gráficos 2D e animações leves.
- **Modo direto**: poucas decisões por tela, escalação recomendada, delegação e avanço rápido.
- **Modo completo**: controles de elenco, tática, mercado, finanças, equipe técnica e relatórios.
- **Mundo conectado**: ligas, copas, seleções, clubes, treinadores, jogadores e patrocinadores compartilham o mesmo calendário.
- **Carreira íntegra**: resultados, tabelas e notícias derivados do estado salvo, nunca de texto aleatório.
- **Offline-first**: dados essenciais disponíveis no aparelho, sem depender de um servidor para continuar a carreira.

## Mundo de competições

O modelo de dados deve separar país, confederação, região, clube, competição, temporada, divisão, regulamento, calendário e vaga de classificação. Não se deve codificar a regra de uma competição dentro da tela ou do motor de partidas.

Tipos de competição:
- Liga com turno/returno ou fase de grupos.
- Copa eliminatória, ida e volta, grupos + mata-mata e supercopa.
- Competições continentais e mundiais.
- Competições de seleções e eliminatórias.
- Copas regionais, estaduais, municipais, universitárias e de várzea.

A hierarquia de divisões precisa suportar promoção, rebaixamento, playoffs, vagas continentais e regras excepcionais. Toda competição deve declarar seu regulamento, quantidade de participantes, calendário e regras de desempate.

### Prioridade Brasil

1. Pirâmide nacional com Série A, B, C e D.
2. Copa nacional e torneios regionais que concedem vagas.
3. Campeonatos estaduais, incluindo as divisões inferiores que existirem para cada federação.
4. Estrutura adicional de ligas municipais, regionais e de várzea para permitir começar em clubes muito pequenos.
5. Fluxo de promoção/rebaixamento conectado: um clube pode subir da estrutura regional até a Série D e, daí, chegar à Série A.

Quando não houver dado público e licenciado suficiente para uma divisão de base, o jogo poderá gerar uma divisão fictícia e identificá-la como conteúdo criado pelo jogo. Não apresentar uma liga inventada como campeonato oficial.

### Expansão mundial

Cada país terá um pacote de dados próprio, com suas principais ligas, divisões inferiores disponíveis, copas nacionais e caminho de acesso às competições continentais. Pacotes poderão ser ativados por país/região para controlar memória e tempo de simulação.

A expressão “todos os campeonatos que existem” é uma meta de cobertura, não uma promessa de catálogo completo e imutável: há milhares de competições locais, mudanças anuais, torneios temporários e ligas sem dados públicos consistentes. O sistema deve permitir adicionar competições sem mudar o motor.

## Clubes, nomes e identidade

- Clubes, jogadores, jornalistas, emissoras e patrocinadores do universo padrão devem usar identidade textual e visual original.
- Nomes estilizados ou levemente alterados podem ser usados como ficção, mas trocar letras não garante, por si só, ausência de risco jurídico. Não copiar escudos, uniformes, mascotes, fontes, slogans ou marcas de terceiros.
- Dados e nomes reais só entram quando a fonte, a licença e o uso pretendido forem verificados. Conteúdo editável/modificável pela comunidade pode ser separado do pacote oficial.

## Carreira de treinador e mercado de trabalho

A tela de início da carreira deve permitir:
- Criar treinador com nome, idade, nacionalidade, perfil e experiência.
- Escolher um treinador do universo de jogo, dos iniciantes de divisões inferiores a nomes lendários apresentados em versão ficcional/licenciada.
- Criar carreira como ex-jogador aposentado. A posição, trajetória, reputação e títulos influenciam os primeiros atributos e oportunidades.
- Receber propostas de clubes que realmente estejam procurando treinador.

Cada projeto de clube terá identidade própria: lutar contra rebaixamento, buscar acesso, revelar jovens, voltar à elite, conquistar títulos, sanear dívidas, reconstruir elenco ou dominar uma região. A vaga deve considerar reputação, experiência, filosofia, salário, duração do contrato e exigência da diretoria.

Jogadores envelhecem, perdem atributos em ritmos coerentes, podem se aposentar e, quando elegíveis, entrar no conjunto de treinadores fictícios. Aposentadoria e conversão para técnico precisam ser registradas no histórico da carreira.

## Gestão, patrocinadores e torcida

- Dificuldade: Fácil, Médio, Difícil e Quase impossível. A dificuldade afeta orçamento, exigência da diretoria, mercado, evolução e comportamento da IA, não apenas a força dos adversários.
- Modo Investidores: opção separada de sandbox que injeta capital ilimitado. Deve ser visível na carreira e não alterar o equilíbrio das carreiras normais.
- Patrocinadores: categorias e propostas de empresas grandes, regionais e startups fictícias. Interesse calculado por reputação, divisão, torcida, audiência, desempenho, mercado e adequação de setor.
- Torcida: humor calculado por resultados, rivalidades, promessas, contratações, estilo de jogo, preço dos ingressos e saúde do clube. Elogios, críticas e protestos precisam apontar o motivo real.
- Delegação: o usuário pode delegar escalação, treino, contratações e coletivas e apenas acompanhar a evolução do clube.

## Jornal esportivo e integridade das notícias

A notícia será consequência de um evento estruturado do motor.

Fluxo obrigatório:
1. O motor conclui um evento com identificador único e fatos tipados: placar, competição, jogador, clube, valor, duração de lesão, decisão da diretoria etc.
2. O evento é persistido no histórico da carreira antes de virar notícia.
3. O sistema editorial escolhe os veículos cuja cobertura e editoria combinam com aquele evento.
4. Cada veículo usa modelos de texto determinísticos, com ângulos diferentes, mas todos partem dos mesmos fatos.
5. Cada matéria guarda o ID do evento, o veículo, a categoria e o nível de confirmação.
6. Uma chave evento + veículo impede duplicação. Matérias antigas preservam o retrato dos fatos daquela data.

Regras de precisão:
- Resultado só é publicado depois de a partida ser encerrada e aplicada à competição.
- Transferência só é “confirmada” quando a negociação for concluída. Interesse e rumor são rótulos distintos e só aparecem após um evento de sondagem/interesse.
- Lesão informa somente gravidade e prazo que existam no estado do jogador.
- Demissão, contratação de técnico, aposentadoria, proposta de patrocínio, protesto e convocação precisam de eventos próprios.
- Opinião/editorial pode interpretar fatos, mas não pode criar fatos novos.
- Não gerar notícia se o mundo estiver pausado. “24 horas” significa fluxo contínuo dentro do calendário simulado, com horários e edições, não inventar acontecimentos enquanto a carreira está parada.

O jornal terá capa, últimas notícias, mercado, partidas, bastidores, torcida, base e seleções. Vários veículos fictícios terão identidade editorial, cobertura local/nacional/global e poderão publicar várias matérias ao longo da mesma temporada.

## Interface 2D e tecnologia

Base atual: TypeScript + Vite + Capacitor. Ela deve ser evoluída sem trocar de stack por moda.

- SVG/CSS para campo tático, escalação e cartões; Canvas 2D apenas onde animação ou gráficos justificarem.
- IndexedDB para saves e base mundial versionada. O save atual está em localStorage e é pequeno; a expansão mundial exige migração compatível para armazenamento estruturado.
- Pacotes de dados por região, carregados sob demanda, com cache offline e metadados de origem/licença.
- Web Worker para cálculos de temporadas e simulação de ligas fora da thread da interface.
- Vitest para regras de regulamentos, calendário, promoção/rebaixamento, aposentadoria, finanças e geração de notícias.
- Efeitos sonoros separados do áudio de outros aplicativos. Sem música obrigatória dentro do jogo; Spotify deve continuar tocando em segundo plano.

Evitar bibliotecas 3D, pacotes enormes de UI e dependências sem função clara. O tamanho do APK pode crescer de forma justificada com dados e recursos, mas tamanho não é uma meta de qualidade.

## Fontes abertas avaliadas

- [OpenFootball/leagues](https://github.com/openfootball/leagues): índice global de competições e divisões, dedicado a CC0. Útil para catálogo inicial, sujeito a conferência de cobertura e temporada.
- [OpenFootball/football.json](https://github.com/openfootball/football.json): fixtures e resultados em JSON, CC0; cobre várias ligas importantes, mas não todo o futebol.
- [OpenFootball/south-america](https://github.com/openfootball/south-america): dados sul-americanos em formato texto, CC0. A pasta brasileira consultada inclui temporadas recentes de Série A/B e Copa do Brasil, não uma pirâmide nacional completa.
- [OpenFootball/worldcup.json](https://github.com/openfootball/worldcup.json): competições de seleções, CC0.
- [ZOXEXIVO/open-football](https://github.com/ZOXEXIVO/open-football): referência de arquitetura de simulador mundial em Rust e banco separado; licença Apache-2.0. Usar como referência, não copiar código sem decisão técnica específica.
- [nicolasLepy/TheManager](https://github.com/nicolasLepy/TheManager): referência MIT para hierarquia de torneios e promoção/rebaixamento; projeto em C#.
- [OpenFootManager](https://github.com/openfootmanager/openfootmanager): tem recursos interessantes de jornal e gestão, mas usa GPL-3.0. Não incorporar código ao PULSO 90 sem uma decisão explícita de licenciamento.
- [BrazilianFootball/Data](https://github.com/BrazilianFootball/Data): licença do repositório identificada como MIT, mas é um projeto de scraping; a licença do código não deve ser presumida como autorização irrestrita para redistribuir todos os dados extraídos.

Antes de importar qualquer pacote, registrar URL, licença, atribuição exigida, período coberto, data de atualização e transformações feitas. Não fazer scraping que viole termos de uso.

## Ordem de implementação

1. Base editorial por eventos, com jornal dentro do jogo e testes de consistência.
2. Modelo mundial versionado e migração de saves para IndexedDB.
3. Brasil: Série A-D, copa nacional, estaduais e divisões regionais/várzea.
4. Motor genérico de calendário, regulamentos, promoções e rebaixamentos.
5. Seleções, continentes e pacotes de países.
6. Carreira de treinador, vagas de emprego e ex-jogadores aposentados.
7. Patrocínios, investidores, diretoria e torcida.
8. Modo direto/delegado e modo completo, com dificuldade configurável.

Cada fase precisa de testes e build Android antes da próxima expansão de dados.

## Base de conteúdo construída para a primeira versão mundial

A base original atual contém:
- 211 associações nacionais filiadas à FIFA, cada uma com duas divisões nacionais no universo P90.
- 27 estruturas estaduais brasileiras, cada uma com divisão principal, acesso, liga de várzea e copa estadual. Cada associação também possui uma Copa Nacional P90 fictícia quando não há uma competição nacional específica no catálogo.
- 4 divisões nacionais brasileiras (Série A, B, C e D).
- 506 divisões, 4.944 clubes originais, 765 competições catalogadas e 211 seleções.
- Simulação diária escalonada das ligas globais: cada dia de carreira atualiza metade das divisões, mantendo resultados e tabelas persistidos no save. As manchetes globais são criadas a partir dos placares calculados.

A lista das 211 associações segue a relação pública da FIFA em https://inside.fifa.com/associations; as divisões e copas genéricas acrescentadas aos países sem pacote específico são conteúdo fictício P90, e as forças são parâmetros de equilíbrio, não o ranking oficial da FIFA.

Esses números descrevem o universo original atualmente implementado, não uma alegação de que todas as competições oficiais reais do planeta já estejam incluídas. A arquitetura permite acrescentar países, divisões, copas e calendários sem reescrever o motor.


A Copa Nacional do Brasil reúne os 80 clubes das Séries A, B, C e D e os 27 campeões estaduais, totalizando 107 participantes.


Quando a carreira começa em uma divisão estadual abaixo dos campeões, o clube escolhido ganha uma vaga adicional na Copa Nacional do Brasil, sem retirar nenhum dos 27 campeões estaduais.
