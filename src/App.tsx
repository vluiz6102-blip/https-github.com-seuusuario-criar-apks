import { useEffect, useState } from "react";
import {
  ALL_CLUBS,
  SELECTABLE_CLUBS,
  advanceMatch,
  beginMatch,
  calculateTeamStrength,
  createCareer,
  getClub,
  getNextOpponent,
  releasePlayer,
  signPlayer,
  trainPlayer,
  updateTactics
} from "./game";
import type { Career, Formation, PlayStyle, Player } from "./game";

type Screen = "inicio" | "elenco" | "mercado" | "taticas" | "agenda" | "partida";

const SAVE_KEY = "maia-soccer-manager-original-save-v1";
const NAV_ITEMS: { id: Screen; label: string; glyph: string }[] = [
  { id: "inicio", label: "Visão geral", glyph: "⌂" },
  { id: "elenco", label: "Elenco", glyph: "◉" },
  { id: "mercado", label: "Mercado", glyph: "⇄" },
  { id: "taticas", label: "Táticas", glyph: "⌘" },
  { id: "agenda", label: "Agenda", glyph: "▦" },
  { id: "partida", label: "Partida 2D", glyph: "▶" }
];

const PAGE_TITLES: Record<Screen, { title: string; subtitle: string }> = {
  inicio: { title: "Centro de comando", subtitle: "As decisões de hoje constroem a temporada." },
  elenco: { title: "Seu elenco", subtitle: "Desenvolva talentos, mantenha a condição e escolha quem fica." },
  mercado: { title: "Mercado de atletas", subtitle: "Encontre peças para o seu projeto sem estourar o caixa." },
  taticas: { title: "Identidade tática", subtitle: "Sua formação e seu plano de jogo influenciam a partida." },
  agenda: { title: "Temporada", subtitle: "Resultados, próximos compromissos e a corrida por pontos." },
  partida: { title: "Central da partida", subtitle: "Acompanhe o jogo no campo 2D e avance lance a lance." }
};

const FORMATIONS: { id: Formation; label: string; rows: number[]; description: string }[] = [
  { id: "4-3-3", label: "4-3-3", rows: [1, 4, 3, 3], description: "Amplitude e pressão pelos lados." },
  { id: "4-2-3-1", label: "4-2-3-1", rows: [1, 4, 2, 3, 1], description: "Proteção central e criatividade entrelinhas." },
  { id: "3-5-2", label: "3-5-2", rows: [1, 3, 5, 2], description: "Densidade no meio e alas agressivos." }
];

const PLAY_STYLES: { id: PlayStyle; label: string; detail: string }[] = [
  { id: "equilibrado", label: "Equilibrado", detail: "Sem abrir mão da organização." },
  { id: "posse", label: "Posse", detail: "Mais controle e paciência com a bola." },
  { id: "transicao", label: "Transição", detail: "Ataque rápido quando surge espaço." },
  { id: "pressao", label: "Pressão alta", detail: "Mais intensidade para recuperar a bola." }
];

function readSavedCareer(): Career | null {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    return saved ? JSON.parse(saved) as Career : null;
  } catch {
    return null;
  }
}

function compactMoney(amount: number): string {
  if (amount >= 1_000_000) {
    return "R$ " + (amount / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mi";
  }
  if (amount >= 1_000) return "R$ " + Math.round(amount / 1_000).toLocaleString("pt-BR") + " mil";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(amount);
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();
}

function ratingLabel(value: number): string {
  if (value >= 80) return "Destaque";
  if (value >= 72) return "Titular";
  if (value >= 65) return "Rotação";
  return "Promessa";
}

function makeLeagueRows(career: Career) {
  return ALL_CLUBS.map((club, index) => ({
    id: club.id,
    name: club.name,
    points: club.id === career.clubId ? career.points : Math.max(0, ((career.round * (index + 3) + index * 7) % 13) + 2),
    isUser: club.id === career.clubId
  })).sort((a, b) => b.points - a.points).slice(0, 5);
}

function StartCareer(props: {
  selectedClubId: string;
  managerName: string;
  onSelectClub: (id: string) => void;
  onManagerName: (name: string) => void;
  onStart: () => void;
}) {
  return (
    <div className="start-shell">
      <header className="start-topbar">
        <div className="brand-lockup">
          <div className="brand-token">M<span>.</span></div>
          <div><b>MAIA</b><span>SOCCER MANAGER</span></div>
        </div>
        <span className="tiny-status"><i /> UM JOGO ORIGINAL</span>
      </header>
      <div className="start-layout">
        <section className="start-story">
          <p className="eyebrow">GESTÃO DE FUTEBOL · TEMPORADA 2026</p>
          <h1>Seu clube.<br /><em>Sua história.</em></h1>
          <p className="start-copy">Monte o projeto, desenvolva jogadores, negocie no mercado e prove que as melhores decisões acontecem antes de a bola rolar.</p>
          <div className="feature-line"><span>01</span><div><b>Construa um elenco</b><small>Contrate, treine e escolha quem entra em campo.</small></div></div>
          <div className="feature-line"><span>02</span><div><b>Comande do seu jeito</b><small>Tática, estilo de jogo e decisões financeiras contam.</small></div></div>
          <div className="feature-line"><span>03</span><div><b>Jogue a partida</b><small>Um campo 2D original, com relógio e eventos da partida.</small></div></div>
          <div className="start-signature">CRIADO POR <strong>VICTOR LUIZ</strong><span> · SEM INTERNET OBRIGATÓRIA</span></div>
        </section>
        <section className="start-panel">
          <div className="panel-heading"><span className="panel-step">01 / 02</span><p className="eyebrow">NOVA CARREIRA</p><h2>Assuma o comando.</h2><p>Escolha uma identidade para começar.</p></div>
          <label className="field-label" htmlFor="manager-name">Nome do treinador</label>
          <input id="manager-name" className="manager-input" value={props.managerName} maxLength={24} onChange={(event) => props.onManagerName(event.target.value)} placeholder="Seu nome" />
          <div className="club-choice-heading"><span className="field-label">Escolha seu clube</span><span>4 PROJETOS</span></div>
          <div className="club-choice-grid">
            {SELECTABLE_CLUBS.map((club) => (
              <button key={club.id} type="button" className={"club-choice" + (props.selectedClubId === club.id ? " selected" : "")} onClick={() => props.onSelectClub(club.id)} aria-pressed={props.selectedClubId === club.id}>
                <span className="choice-topline"><span className="choice-seal" style={{ background: club.primary }}>{club.shortName.slice(0, 2)}</span><span className="choice-check">{props.selectedClubId === club.id ? "✓" : "+"}</span></span>
                <b>{club.name}</b><small>{club.city}</small><span className="choice-budget">{compactMoney(club.budget)}</span>
              </button>
            ))}
          </div>
          <button type="button" className="button-primary start-button" onClick={props.onStart}>Começar carreira <span>↗</span></button>
          <p className="privacy-note">A carreira fica salva neste dispositivo. Clubes e atletas são fictícios.</p>
        </section>
      </div>
    </div>
  );
}

function App() {
  const [career, setCareer] = useState<Career | null>(readSavedCareer);
  const [screen, setScreen] = useState<Screen>("inicio");
  const [selectedClubId, setSelectedClubId] = useState(SELECTABLE_CLUBS[0].id);
  const [managerName, setManagerName] = useState("Victor");
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      if (career) localStorage.setItem(SAVE_KEY, JSON.stringify(career));
      else localStorage.removeItem(SAVE_KEY);
    } catch {
      // The career still works for this session when browser storage is unavailable.
    }
  }, [career]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const startCareer = () => {
    const next = createCareer(selectedClubId, managerName);
    setCareer(next);
    setScreen("inicio");
  };

  if (!career) {
    return <StartCareer selectedClubId={selectedClubId} managerName={managerName} onSelectClub={setSelectedClubId} onManagerName={setManagerName} onStart={startCareer} />;
  }

  const club = getClub(career.clubId);
  const page = PAGE_TITLES[screen];
  const teamStrength = Math.round(calculateTeamStrength(career.squad));
  const nextOpponent = getNextOpponent(career.clubId, career.round);
  const leagueRows = makeLeagueRows(career);

  const openMatch = () => {
    if (!career.match) setCareer(beginMatch(career));
    setScreen("partida");
  };

  const beginNextFixture = () => {
    setCareer(beginMatch(career));
    setScreen("partida");
  };

  const train = (player: Player) => {
    if (career.trainingCredits <= 0) {
      notify("Treinos da semana esgotados. Jogue a próxima rodada para recuperar um crédito.");
      return;
    }
    if (player.rating >= player.potential) {
      notify(player.name + " já atingiu o potencial atual.");
      return;
    }
    setCareer(trainPlayer(career, player.id));
    notify(player.name + " evoluiu no treino.");
  };

  const release = (player: Player) => {
    if (career.squad.length <= 12) {
      notify("Mantenha pelo menos 12 atletas no elenco.");
      return;
    }
    if (!window.confirm("Liberar " + player.name + "? O clube recebe 62% do valor estimado.")) return;
    setCareer(releasePlayer(career, player.id));
    notify(player.name + " foi liberado do elenco.");
  };

  const sign = (player: Player) => {
    if (career.budget < player.value) {
      notify("Orçamento insuficiente para contratar " + player.name + ".");
      return;
    }
    if (career.squad.length >= 24) {
      notify("Elenco cheio. Libere alguém antes de contratar.");
      return;
    }
    setCareer(signPlayer(career, player.id));
    notify(player.name + " chegou ao clube.");
  };

  const advance = () => {
    if (!career.match || career.match.finished) return;
    const next = advanceMatch(career);
    setCareer(next);
    if (next.match?.finished) notify("Fim de jogo. O resultado entrou na temporada.");
  };

  const renderDashboard = () => (
    <>
      <section className="welcome-row">
        <div><p className="eyebrow">SEU PROJETO, SUAS REGRAS</p><h2>Vamos trabalhar, {career.managerName}.</h2><p>Uma boa temporada começa com decisões inteligentes.</p></div>
        <button type="button" className="button-primary" onClick={openMatch}>Central da partida <span>↗</span></button>
      </section>
      <section className="dashboard-hero">
        <div className="dashboard-hero-top"><span className="hero-tag"><i /> TEMPORADA {career.season}</span><span className="hero-round">RODADA {career.round} <b>/ 10</b></span></div>
        <div className="club-hero-content">
          <div className="club-emblem-large" style={{ background: club.primary, color: "#0c1719" }}>{club.shortName.slice(0, 2)}</div>
          <div className="club-hero-title"><p className="eyebrow">CLUBE ATUAL · {club.city.toUpperCase()}</p><h3>{club.name}</h3><p>{club.motto}</p></div>
          <div className="club-budget"><span>ORÇAMENTO DISPONÍVEL</span><strong>{compactMoney(career.budget)}</strong><small>Caixa do clube</small></div>
        </div>
        <div className="hero-bottom-strip"><span>ESTÁDIO <b>{club.stadium}</b></span><span>FORÇA DO ELENCO <b>{teamStrength}/100</b></span><span>ATLETAS <b>{career.squad.length}</b></span></div>
      </section>
      <section className="metric-grid">
        <article className="metric-card"><span>PONTOS</span><strong>{career.points}</strong><small>{career.played} jogos disputados</small><div className="metric-mark">✳</div></article>
        <article className="metric-card"><span>FORMA</span><strong>{career.wins}<i>V</i> {career.draws}<i>E</i> {career.losses}<i>D</i></strong><small>Vitórias · Empates · Derrotas</small><div className="metric-mark">↗</div></article>
        <article className="metric-card"><span>GOLS</span><strong>{career.goalsFor}<small className="goal-separator"> / </small>{career.goalsAgainst}</strong><small>Marcados / sofridos</small><div className="metric-mark">◎</div></article>
        <article className="metric-card"><span>TRANSFERÊNCIAS</span><strong>{career.transfersMade}</strong><small>Contratações na carreira</small><div className="metric-mark">⇄</div></article>
      </section>
      <section className="dashboard-columns">
        <article className="surface-card next-match-card">
          <div className="section-title-row"><div><p className="eyebrow">PRÓXIMO DESAFIO</p><h3>Dia de jogo</h3></div><span className="status-pill">RODADA {career.round}</span></div>
          {career.match && career.match.finished ? <div className="last-result-note"><span className="result-dot">{career.match.homeGoals + ":" + career.match.awayGoals}</span><div><b>Último jogo finalizado</b><small>Abra a central para ver o relatório ou prepare a próxima rodada.</small></div></div> : null}
          <div className="match-preview">
            <div className="match-team"><div className="club-emblem" style={{ background: club.primary, color: "#0c1719" }}>{club.shortName.slice(0, 2)}</div><b>{club.name}</b><small>{career.round % 2 === 1 ? "MANDANTE" : "VISITANTE"}</small></div>
            <div className="match-center"><span>VS</span><small>90 MIN</small><div className="match-center-line" /></div>
            <div className="match-team"><div className="club-emblem opponent-emblem" style={{ borderColor: nextOpponent.primary, color: nextOpponent.primary }}>{nextOpponent.shortName.slice(0, 2)}</div><b>{nextOpponent.name}</b><small>{career.round % 2 === 1 ? "VISITANTE" : "MANDANTE"}</small></div>
          </div>
          <div className="match-card-footer"><span><i className="live-dot" /> {career.match && !career.match.finished ? "PARTIDA EM ANDAMENTO" : "PREPARAÇÃO ABERTA"}</span><button type="button" className="button-secondary" onClick={openMatch}>Abrir jogo <span>→</span></button></div>
        </article>
        <article className="surface-card standings-card">
          <div className="section-title-row"><div><p className="eyebrow">LIGA NACIONAL</p><h3>Classificação</h3></div><span className="standing-caption">P</span></div>
          <div className="standings-list">{leagueRows.map((row, index) => <div key={row.id} className={"standing-row" + (row.isUser ? " my-standing" : "")}><span className="standing-pos">{String(index + 1).padStart(2, "0")}</span><span className="standing-team-mark" style={{ background: getClub(row.id).primary }} /><span className="standing-name">{row.name}</span><b>{row.points}</b></div>)}</div>
          <p className="micro-note">A classificação dos outros clubes é simulada localmente.</p>
        </article>
      </section>
      <section className="bottom-grid">
        <article className="surface-card momentum-card"><div className="section-title-row"><div><p className="eyebrow">PLANO DA SEMANA</p><h3>Foco do treinador</h3></div><span className="panel-icon">↗</span></div><div className="focus-row"><span className="focus-number">01</span><div><b>Desenvolvimento individual</b><p>Você tem <strong>{career.trainingCredits}</strong> créditos de treino disponíveis para elevar o potencial do elenco.</p></div><button type="button" className="text-action" onClick={() => setScreen("elenco")}>Abrir elenco ↗</button></div><div className="focus-row"><span className="focus-number">02</span><div><b>Planejamento tático</b><p>Seu plano atual é <strong>{PLAY_STYLES.find((style) => style.id === career.style)?.label}</strong> no <strong>{career.formation}</strong>.</p></div><button type="button" className="text-action" onClick={() => setScreen("taticas")}>Editar plano ↗</button></div></article>
        <article className="surface-card news-card"><div className="section-title-row"><div><p className="eyebrow">BASTIDORES</p><h3>Notas do clube</h3></div><span className="news-count">03</span></div><div className="news-item"><span className="news-time">DIRETORIA</span><p>O orçamento está em <strong>{compactMoney(career.budget)}</strong>. Cada contratação precisa fazer sentido para o projeto.</p></div><div className="news-item"><span className="news-time">COMISSÃO TÉCNICA</span><p>O elenco tem força média de <strong>{teamStrength}</strong>. Treino individual pode mudar o equilíbrio.</p></div><div className="news-item"><span className="news-time">CENTRAL DE DADOS</span><p>Esta carreira funciona offline e usa atletas e clubes fictícios criados para o jogo.</p></div></article>
      </section>
    </>
  );

  const renderSquad = () => (
    <>
      <section className="page-summary-row"><div className="summary-stat"><strong>{career.squad.length}</strong><span>ATLETAS</span></div><div className="summary-stat"><strong>{teamStrength}</strong><span>FORÇA MÉDIA</span></div><div className="summary-stat"><strong>{career.trainingCredits}</strong><span>TREINOS</span></div><div className="summary-actions"><button type="button" className="button-secondary" onClick={() => setScreen("taticas")}>Ver tática ↗</button></div></section>
      <section className="surface-card squad-surface"><div className="section-title-row"><div><p className="eyebrow">GRUPO PRINCIPAL</p><h3>Atletas do clube</h3></div><span className="status-pill">ELENCO ATIVO</span></div><div className="squad-column-labels"><span>JOGADOR</span><span>FUNÇÃO</span><span>NOTA</span><span>CONDIÇÃO</span><span>AÇÕES</span></div><div className="squad-list">
        {career.squad.slice().sort((a, b) => b.rating - a.rating).map((player, index) => <article className="player-row" key={player.id}>
          <span className="player-number">{String(index + 1).padStart(2, "0")}</span><span className="player-avatar" style={{ borderColor: player.rating >= 72 ? club.primary : "#294047" }}>{initials(player.name)}</span><div className="player-identity"><b>{player.name}</b><small>{player.age} anos · POT {player.potential} · {ratingLabel(player.rating)}</small></div><span className="position-chip">{player.position}</span><span className={"rating-chip" + (player.rating >= 72 ? " rating-strong" : "")}>{player.rating}</span><div className="condition-cell"><div className="condition-track"><span style={{ width: player.condition + "%" }} /></div><small>{player.condition}%</small></div><div className="player-actions"><button type="button" className="mini-action" onClick={() => train(player)} disabled={career.trainingCredits <= 0 || player.rating >= player.potential}>Treinar +1</button><button type="button" className="mini-action muted-action" onClick={() => release(player)}>Liberar</button></div>
        </article>)}
      </div><div className="surface-footer"><span>Manter pelo menos 12 atletas protege a rotação.</span><span>Valor estimado e atributos são simulados.</span></div></section>
    </>
  );

  const renderMarket = () => (
    <>
      <section className="market-budget-banner"><div><p className="eyebrow">CAIXA PARA NEGOCIAÇÕES</p><strong>{compactMoney(career.budget)}</strong><small>As taxas saem do caixa no momento da contratação.</small></div><div className="budget-gauge"><span style={{ width: Math.min(100, Math.max(5, career.budget / getClub(career.clubId).budget * 100)) + "%" }} /></div><button type="button" className="button-secondary" onClick={() => setScreen("elenco")}>Meu elenco ↗</button></section>
      <div className="section-title-row market-heading"><div><p className="eyebrow">OLHEIRO DIGITAL</p><h3>Oportunidades disponíveis</h3></div><span className="status-pill">{career.market.length} ATLETAS</span></div>
      {career.market.length === 0 ? <section className="surface-card empty-state"><div className="empty-mark">✓</div><h3>Mercado observado.</h3><p>Você contratou todas as oportunidades desta lista. Continue a carreira para abrir novas opções futuramente.</p></section> : <section className="market-grid">
        {career.market.map((player) => <article className="market-card" key={player.id}><div className="market-card-top"><span className="player-avatar market-avatar">{initials(player.name)}</span><span className="scout-grade">{player.rating >= 70 ? "ALVO A" : player.potential >= 80 ? "JOVEM" : "OPÇÃO"}</span></div><h3>{player.name}</h3><p>{player.position} <span>·</span> {player.age} anos</p><div className="market-rating-row"><div><span>NOTA</span><strong>{player.rating}</strong></div><div><span>POTENCIAL</span><strong>{player.potential}</strong></div><div><span>CONDIÇÃO</span><strong>{player.condition}%</strong></div></div><div className="market-fee"><span>VALOR ESTIMADO</span><strong>{compactMoney(player.value)}</strong></div><button type="button" className="button-primary market-sign-button" onClick={() => sign(player)} disabled={career.budget < player.value || career.squad.length >= 24}>{career.budget < player.value ? "Fora do orçamento" : "Contratar atleta"} <span>＋</span></button></article>)}
      </section>}
      <p className="micro-note market-note">Todos os atletas desta lista são personagens fictícios criados para o jogo.</p>
    </>
  );

  const renderTactics = () => {
    const selectedFormation = FORMATIONS.find((item) => item.id === career.formation) ?? FORMATIONS[0];
    return (
      <>
        <section className="tactics-overview"><div><p className="eyebrow">IDENTIDADE DA EQUIPE</p><h3>{career.formation} <span>·</span> {PLAY_STYLES.find((item) => item.id === career.style)?.label}</h3><p>Altere o desenho e o comportamento. O motor de partida considera seu estilo ao calcular a força de ataque.</p></div><div className="tactic-rating"><strong>{teamStrength}</strong><span>FORÇA BASE</span></div></section>
        <section className="tactics-layout"><article className="surface-card formation-panel"><div className="section-title-row"><div><p className="eyebrow">DESENHO DE CAMPO</p><h3>Formação</h3></div><span className="status-pill">11 EM CAMPO</span></div><div className="tactical-pitch"><div className="pitch-halfway" /><div className="pitch-circle" /><div className="pitch-box pitch-box-top" /><div className="pitch-box pitch-box-bottom" /><div className="tactical-lines">{selectedFormation.rows.map((count, rowIndex) => <div className="tactical-line" key={selectedFormation.id + "-" + String(rowIndex)}>{Array.from({ length: count }, (_, playerIndex) => <span className={"tactical-player" + (rowIndex === 0 ? " tactical-keeper" : "")} key={selectedFormation.id + "-" + String(rowIndex) + "-" + String(playerIndex)}>{rowIndex === 0 ? "G" : rowIndex === selectedFormation.rows.length - 1 ? "A" : "•"}</span>)}</div>)}</div><span className="pitch-stamp">MAIA TACTICAL LAB</span></div><div className="formation-options">{FORMATIONS.map((item) => <button type="button" key={item.id} className={"formation-option" + (career.formation === item.id ? " active" : "")} onClick={() => setCareer(updateTactics(career, item.id, career.style))}><strong>{item.label}</strong><small>{item.description}</small>{career.formation === item.id ? <span className="option-check">✓</span> : null}</button>)}</div></article>
          <article className="surface-card style-panel"><div className="section-title-row"><div><p className="eyebrow">COMPORTAMENTO</p><h3>Estilo de jogo</h3></div><span className="panel-icon">↗</span></div><div className="style-options">{PLAY_STYLES.map((item, index) => <button type="button" key={item.id} className={"style-option" + (career.style === item.id ? " active" : "")} onClick={() => setCareer(updateTactics(career, career.formation, item.id))}><span className="style-index">0{index + 1}</span><span className="style-copy"><b>{item.label}</b><small>{item.detail}</small></span><span className="style-radio">{career.style === item.id ? "●" : "○"}</span></button>)}</div><div className="tactic-tip"><span>IDEIA DO TREINADOR</span><p>Pressão alta dá um pequeno impulso ofensivo, mas a estratégia precisa combinar com a condição do elenco.</p></div><button type="button" className="button-primary full-width" onClick={() => { notify("Plano salvo para a próxima partida."); setScreen("partida"); }}>Aplicar e preparar jogo <span>↗</span></button></article>
        </section>
      </>
    );
  };

  const renderAgenda = () => (
    <>
      <section className="season-banner"><div><p className="eyebrow">LINHA DO TEMPO</p><h3>Temporada {career.season}</h3><p>Você está na rodada {career.round} de 10. Cada partida altera pontos, forma do elenco e orçamento.</p></div><div className="season-count"><strong>{career.played}<span>/10</span></strong><small>PARTIDAS</small></div></section>
      <section className="surface-card schedule-card"><div className="section-title-row"><div><p className="eyebrow">RESULTADOS E PRÓXIMOS JOGOS</p><h3>Calendário do clube</h3></div><button type="button" className="button-secondary" onClick={openMatch}>Central do jogo ↗</button></div>
        {career.history.length > 0 ? <div className="schedule-group"><p className="schedule-group-label">JOGOS FINALIZADOS</p>{career.history.map((game) => <div className="fixture-row" key={String(game.season) + "-" + String(game.round)}><span className="fixture-round">R{String(game.round).padStart(2, "0")}</span><div className="fixture-opponent"><b>{game.isHome ? club.name : game.opponentName}</b><small>{game.isHome ? "Casa" : "Fora"} · Temporada {game.season}</small></div><strong className="fixture-score">{game.homeGoals} <span>:</span> {game.awayGoals}</strong><span className={"fixture-result result-" + game.result.toLowerCase()}>{game.result === "V" ? "VITÓRIA" : game.result === "E" ? "EMPATE" : "DERROTA"}</span></div>)}</div> : <div className="empty-schedule"><span className="empty-mark">01</span><div><b>Sua história começa agora.</b><p>O primeiro resultado aparecerá aqui quando você terminar uma partida.</p></div></div>}
        <div className="schedule-group upcoming-group"><p className="schedule-group-label">PRÓXIMOS COMPROMISSOS</p>{Array.from({ length: 5 }, (_, index) => { const round = career.round + index; const opponent = getNextOpponent(career.clubId, round); return <div className="fixture-row upcoming-fixture" key={"upcoming-" + String(round)}><span className="fixture-round">R{String(((round - 1) % 10) + 1).padStart(2, "0")}</span><div className="fixture-opponent"><b>{opponent.name}</b><small>{round % 2 === 1 ? "Casa" : "Fora"} · Rodada futura</small></div><span className="fixture-pending">A JOGAR</span><button type="button" className="icon-action" onClick={openMatch} aria-label="Abrir central da partida">↗</button></div>; })}</div>
      </section>
    </>
  );

  const renderMatch = () => {
    const match = career.match;
    if (!match) {
      return <section className="match-start-panel"><div className="match-start-copy"><p className="eyebrow">DIA DE JOGO · RODADA {career.round}</p><h3>O campo está esperando.</h3><p>Confira o plano tático, prepare o elenco e inicie uma partida simulada em tempo real por etapas de 15 minutos.</p><button type="button" className="button-primary" onClick={() => setCareer(beginMatch(career))}>Apito inicial <span>▶</span></button></div><div className="pre-match-mini-pitch"><div className="mini-pitch-circle" /><div className="mini-pitch-line" /><div className="mini-player a one" /><div className="mini-player a two" /><div className="mini-player a three" /><div className="mini-player b four" /><div className="mini-player b five" /><div className="mini-ball" /></div></section>;
    }
    const userGoals = match.isHome ? match.homeGoals : match.awayGoals;
    const opponentGoals = match.isHome ? match.awayGoals : match.homeGoals;
    return (
      <>
        <section className="live-score-card"><div className="live-score-top"><span className="hero-tag"><i /> {match.finished ? "PARTIDA ENCERRADA" : "SIMULAÇÃO AO VIVO"}</span><span className="hero-round">RODADA {String(match.round).padStart(2, "0")}</span></div><div className="live-score-main"><div className="live-team"><span className="club-emblem" style={{ background: (match.isHome ? club.primary : getClub(match.opponentId).primary), color: "#0c1719" }}>{match.isHome ? club.shortName.slice(0, 2) : getClub(match.opponentId).shortName.slice(0, 2)}</span><b>{match.homeName}</b><small>{match.isHome ? "SEU CLUBE · CASA" : "ADVERSÁRIO · CASA"}</small></div><div className="live-score-number"><span>{match.homeGoals}</span><i>:</i><span>{match.awayGoals}</span><small>{match.finished ? "90:00 · FINAL" : String(match.minute).padStart(2, "0") + ":00"}</small></div><div className="live-team"><span className="club-emblem opponent-emblem" style={{ borderColor: (match.isHome ? getClub(match.opponentId).primary : club.primary), color: match.isHome ? getClub(match.opponentId).primary : club.primary }}>{match.isHome ? getClub(match.opponentId).shortName.slice(0, 2) : club.shortName.slice(0, 2)}</span><b>{match.awayName}</b><small>{match.isHome ? "ADVERSÁRIO · FORA" : "SEU CLUBE · FORA"}</small></div></div><div className="match-progress"><span style={{ width: match.minute + "%" }} /></div></section>
        <section className="match-live-layout"><article className="surface-card pitch-card"><div className="section-title-row"><div><p className="eyebrow">VISÃO TÁTICA</p><h3>Campo 2D</h3></div><span className="status-pill">{career.formation}</span></div><div className="match-pitch"><div className="match-pitch-centerline" /><div className="match-pitch-circle" /><div className="match-box match-box-top" /><div className="match-box match-box-bottom" /><div className="match-goal match-goal-top" /><div className="match-goal match-goal-bottom" />{[{x:18,y:22},{x:39,y:16},{x:61,y:20},{x:81,y:17},{x:28,y:39},{x:50,y:33},{x:73,y:40},{x:19,y:63},{x:42,y:68},{x:62,y:61},{x:83,y:70}].map((point, index) => <span key={"my-" + String(index)} className="match-player-dot match-player-home" style={{ left: point.x + "%", top: point.y + "%" }}>{index + 1}</span>)}{[{x:22,y:78},{x:42,y:83},{x:65,y:80},{x:78,y:64},{x:32,y:54},{x:55,y:55},{x:78,y:48},{x:15,y:43},{x:37,y:27},{x:65,y:30},{x:85,y:29}].map((point, index) => <span key={"op-" + String(index)} className="match-player-dot match-player-away" style={{ left: point.x + "%", top: point.y + "%" }}>{index + 1}</span>)}<span className="match-ball" style={{ left: (match.minute % 2 === 0 ? 45 : 56) + "%", top: (match.minute % 3 === 0 ? 47 : 54) + "%" }} /></div><div className="pitch-legend"><span><i className="legend-home" /> {club.name}</span><span><i className="legend-away" /> {match.opponentName}</span><span><i className="legend-ball" /> Bola</span></div></article>
          <article className="surface-card match-events-card"><div className="section-title-row"><div><p className="eyebrow">RELATO DA PARTIDA</p><h3>O que acontece</h3></div><span className="event-count">{match.events.length} eventos</span></div><div className="event-feed">{[...match.events].reverse().map((event, index) => <div className={"event-item" + (event.includes("GOL!") ? " goal-event" : "")} key={event + "-" + String(index)}><span className="event-time">{event.slice(0, event.indexOf(" ") + 1)}</span><p>{event.slice(event.indexOf(" ") + 1)}</p></div>)}</div><div className="match-control-area">{match.finished ? <><div className="fulltime-message"><b>{userGoals > opponentGoals ? "Vitória importante." : userGoals === opponentGoals ? "Tudo igual no apito final." : "A resposta vem no próximo jogo."}</b><small>Resultado contabilizado. O próximo compromisso já está no calendário.</small></div><button type="button" className="button-primary full-width" onClick={beginNextFixture}>Começar próxima rodada <span>↗</span></button></> : <button type="button" className="button-primary full-width" onClick={advance}>Avançar 15 minutos <span>▶</span></button>}</div></article>
        </section>
      </>
    );
  };

  const content = screen === "inicio" ? renderDashboard()
    : screen === "elenco" ? renderSquad()
    : screen === "mercado" ? renderMarket()
    : screen === "taticas" ? renderTactics()
    : screen === "agenda" ? renderAgenda()
    : renderMatch();

  return (
    <div className="app-shell">
      <header className="topbar"><div className="brand-lockup"><div className="brand-token">M<span>.</span></div><div><b>MAIA</b><span>SOCCER MANAGER</span></div></div><div className="topbar-divider" /><div className="current-club-header"><span className="header-club-mark" style={{ background: club.primary }}>{club.shortName.slice(0, 2)}</span><div><b>{club.name}</b><small>{club.city} · Temporada {career.season}</small></div></div><div className="topbar-spacer" /><span className="tiny-status local-status"><i /> SALVO LOCALMENTE</span><button type="button" className="exit-button" onClick={() => { if (window.confirm("Encerrar esta carreira neste dispositivo?")) { setCareer(null); setScreen("inicio"); } }}>Sair</button></header>
      <div className="app-layout">
        <aside className="desktop-sidebar"><div className="sidebar-block"><p className="eyebrow">CENTRAL DE GESTÃO</p><nav className="side-nav">{NAV_ITEMS.map((item) => <button type="button" key={item.id} className={"nav-item" + (screen === item.id ? " active" : "")} onClick={() => setScreen(item.id)}><span className="nav-glyph">{item.glyph}</span><span>{item.label}</span>{screen === item.id ? <i /> : null}</button>)}</nav></div><div className="sidebar-club-card"><p className="eyebrow">SEU CLUBE</p><div className="sidebar-club-identity"><span className="club-emblem sidebar-emblem" style={{ background: club.primary, color: "#0c1719" }}>{club.shortName.slice(0, 2)}</span><div><b>{club.name}</b><small>{club.stadium}</small></div></div><div className="sidebar-budget"><span>ORÇAMENTO</span><b>{compactMoney(career.budget)}</b></div><div className="sidebar-budget"><span>FORÇA ATUAL</span><b>{teamStrength} / 100</b></div></div><div className="sidebar-footer"><span className="sidebar-dot" /><span>MAIA ORIGINAL ENGINE</span><small>© 2026 Victor Luiz</small></div></aside>
        <main className="content-area"><div className="page-toolbar"><div><p className="eyebrow">PAINEL DO CLUBE <span>/</span> {page.title.toUpperCase()}</p><h1>{page.title}</h1><p>{page.subtitle}</p></div><div className="round-stamp"><span>RODADA</span><strong>{String(career.round).padStart(2, "0")}<small>/10</small></strong></div></div><div className="page-content">{content}</div></main>
      </div>
      <nav className="mobile-nav">{NAV_ITEMS.map((item) => <button type="button" key={item.id} className={"mobile-nav-item" + (screen === item.id ? " active" : "")} onClick={() => setScreen(item.id)}><span>{item.glyph}</span><small>{item.label === "Visão geral" ? "Início" : item.label === "Partida 2D" ? "Jogo" : item.label}</small></button>)}</nav>
      {toast ? <div className="toast-message" role="status"><span>✓</span>{toast}</div> : null}
    </div>
  );
}

export default App;
