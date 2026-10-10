import { useEffect, useRef } from "react";
import type { EnginePlayerData, EngineTeamData, MatchSnapshot } from "./types";

interface BallMatchPitchProps {
  snapshot: MatchSnapshot;
  homeColor: string;
  awayColor: string;
}

interface Point {
  x: number;
  y: number;
}

interface PlacedPlayer extends Point {
  player: EnginePlayerData;
  side: "home" | "away";
  number: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function positionGroup(position: string): number {
  if (position === "Goalkeeper") return 0;
  if (["Defender", "CenterBack", "LeftBack", "RightBack", "LeftWingBack", "RightWingBack"].includes(position)) return 1;
  if (["Forward", "Striker", "RightWinger", "LeftWinger"].includes(position)) return 3;
  return 2;
}

function rowY(group: number, home: boolean): number {
  const homeRows = [0.89, 0.74, 0.55, 0.34];
  return home ? homeRows[group] : 1 - homeRows[group];
}

function positionsForTeam(team: EngineTeamData, side: "home" | "away"): PlacedPlayer[] {
  const ordered = [...team.players]
    .slice(0, 11)
    .sort((a, b) => positionGroup(a.position) - positionGroup(b.position));
  const grouped: EnginePlayerData[][] = [[], [], [], []];

  for (const player of ordered) grouped[positionGroup(player.position)].push(player);

  const output: PlacedPlayer[] = [];
  let number = 1;
  grouped.forEach((players, group) => {
    players.forEach((player, index) => {
      const span = Math.min(0.72, Math.max(0, (players.length - 1) * 0.15));
      const x = players.length === 1 ? 0.5 : 0.5 - span / 2 + (span * index) / (players.length - 1);
      output.push({
        player,
        side,
        number: number++,
        x,
        y: rowY(group, side === "home"),
      });
    });
  });

  // Damaged or custom lineups remain visible rather than breaking the pitch.
  if (output.length < ordered.length) {
    const existing = new Set(output.map((p) => p.player.id));
    ordered.filter((p) => !existing.has(p.id)).forEach((player, index, missing) => {
      output.push({
        player,
        side,
        number: output.length + index + 1,
        x: missing.length === 1 ? 0.5 : 0.18 + (0.64 * index) / (missing.length - 1),
        y: rowY(2, side === "home"),
      });
    });
  }

  return output;
}

function ballZoneY(zone: string): number {
  switch (zone) {
    case "HomeBox":
      return 0.84;
    case "HomeDefense":
      return 0.67;
    case "AwayDefense":
      return 0.33;
    case "AwayBox":
      return 0.16;
    default:
      return 0.5;
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawPitch(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  ctx.clearRect(0, 0, width, height);
  const marginX = Math.max(20, width * 0.075);
  const marginY = Math.max(20, height * 0.035);
  const left = marginX;
  const right = width - marginX;
  const top = marginY;
  const bottom = height - marginY;
  const fieldW = right - left;
  const fieldH = bottom - top;

  const sky = ctx.createLinearGradient(0, top, 0, bottom);
  sky.addColorStop(0, "#123f2a");
  sky.addColorStop(1, "#0b3322");
  roundedRect(ctx, left, top, fieldW, fieldH, 9);
  ctx.fillStyle = sky;
  ctx.fill();

  const stripeCount = 10;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? "rgba(91, 177, 105, 0.12)" : "rgba(4, 32, 19, 0.07)";
    ctx.fillRect(left + 1, top + (fieldH * i) / stripeCount, fieldW - 2, fieldH / stripeCount + 1);
  }

  ctx.strokeStyle = "rgba(241, 250, 240, 0.86)";
  ctx.lineWidth = Math.max(1.2, width * 0.0028);
  ctx.lineJoin = "round";
  ctx.strokeRect(left, top, fieldW, fieldH);
  ctx.beginPath();
  ctx.moveTo(left, top + fieldH / 2);
  ctx.lineTo(right, top + fieldH / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(width / 2, top + fieldH / 2, fieldW * 0.17, fieldW * 0.17, 0, 0, Math.PI * 2);
  ctx.stroke();

  const boxW = fieldW * 0.58;
  const boxH = fieldH * 0.12;
  const goalBoxW = fieldW * 0.3;
  const goalBoxH = fieldH * 0.045;
  ctx.strokeRect(width / 2 - boxW / 2, top, boxW, boxH);
  ctx.strokeRect(width / 2 - boxW / 2, bottom - boxH, boxW, boxH);
  ctx.strokeRect(width / 2 - goalBoxW / 2, top, goalBoxW, goalBoxH);
  ctx.strokeRect(width / 2 - goalBoxW / 2, bottom - goalBoxH, goalBoxW, goalBoxH);

  ctx.beginPath();
  ctx.ellipse(width / 2, top + boxH, fieldW * 0.13, fieldW * 0.08, 0, 0, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(width / 2, bottom - boxH, fieldW * 0.13, fieldW * 0.08, Math.PI, 0, Math.PI);
  ctx.stroke();

  const goalW = fieldW * 0.2;
  ctx.strokeStyle = "rgba(245, 250, 246, 0.72)";
  ctx.lineWidth = Math.max(2, width * 0.005);
  ctx.strokeRect(width / 2 - goalW / 2, top - 2, goalW, 7);
  ctx.strokeRect(width / 2 - goalW / 2, bottom - 5, goalW, 7);

  // Small center spot and soft moving pitch glint, drawn without external assets.
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.arc(width / 2, top + fieldH / 2, Math.max(2, width * 0.006), 0, Math.PI * 2);
  ctx.fill();
  const glintX = left + fieldW * (0.45 + Math.sin(time * 0.00018) * 0.12);
  ctx.fillStyle = "rgba(255,255,255,0.025)";
  ctx.fillRect(glintX, top, fieldW * 0.06, fieldH);
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  point: PlacedPlayer,
  field: { left: number; top: number; width: number; height: number },
  color: string,
  time: number,
) {
  const sway = Math.sin(time * 0.0013 + point.number * 1.7) * 2.2;
  const attackMotion = Math.sin(time * 0.0007 + point.number * 0.8) * 0.008;
  const x = field.left + (point.x + sway / field.width) * field.width;
  const direction = point.side === "home" ? -1 : 1;
  const y = field.top + (point.y + attackMotion * direction) * field.height;
  const radius = clamp(field.width * 0.021, 7, 12);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.38)";
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1.4, radius * 0.18), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export default function BallMatchPitch({ snapshot, homeColor, awayColor }: BallMatchPitchProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapshotRef = useRef(snapshot);
  const colorsRef = useRef({ homeColor, awayColor });

  snapshotRef.current = snapshot;
  colorsRef.current = { homeColor, awayColor };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let frameId = 0;
    let logicalWidth = 0;
    let logicalHeight = 0;
    let ball = { x: 0.5, y: 0.5 };
    let previousTime = 0;

    const render = (time: number) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        frameId = window.requestAnimationFrame(render);
        return;
      }

      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = rect.width;
      const height = rect.height;
      if (width !== logicalWidth || height !== logicalHeight || canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        logicalWidth = width;
        logicalHeight = height;
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      const current = snapshotRef.current;
      const zoneY = ballZoneY(current.ball_zone);
      const targetX = 0.5 + Math.sin(time * 0.00045 + current.current_minute * 0.73) * 0.25;
      const delta = previousTime === 0 ? 1 : clamp((time - previousTime) / 110, 0.04, 1);
      previousTime = time;
      ball.x += (targetX - ball.x) * delta;
      ball.y += (zoneY - ball.y) * delta;

      drawPitch(ctx, width, height, time);

      const marginX = Math.max(20, width * 0.075);
      const marginY = Math.max(20, height * 0.035);
      const field = {
        left: marginX,
        top: marginY,
        width: width - marginX * 2,
        height: height - marginY * 2,
      };
      const home = positionsForTeam(current.home_team, "home");
      const away = positionsForTeam(current.away_team, "away");
      for (const player of home) drawPlayer(ctx, player, field, colorsRef.current.homeColor || "#22c55e", time);
      for (const player of away) drawPlayer(ctx, player, field, colorsRef.current.awayColor || "#f97316", time);

      const bx = field.left + ball.x * field.width;
      const by = field.top + ball.y * field.height;
      const ballRadius = clamp(width * 0.016, 5, 8);
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 7;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(bx, by, ballRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = "#172019";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = "#172019";
      ctx.beginPath();
      ctx.arc(bx, by, ballRadius * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Possession marker glows beside the ball without obscuring the ball itself.
      ctx.fillStyle = current.possession === "Home" ? colorsRef.current.homeColor : colorsRef.current.awayColor;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(bx + ballRadius * 2, by, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      frameId = window.requestAnimationFrame(render);
    };

    frameId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return (
    <section className="flex min-h-[380px] w-full flex-col items-center justify-center gap-3 rounded-xl bg-[#071b12] p-3 sm:p-4">
      <div className="flex w-full max-w-[520px] items-center justify-between gap-3 px-1 text-xs font-bold text-white">
        <span className="min-w-0 truncate">{snapshot.home_team.name}</span>
        <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-1 tracking-widest">2D • AO VIVO</span>
        <span className="min-w-0 truncate text-right">{snapshot.away_team.name}</span>
      </div>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Campo 2D: ${snapshot.home_team.name} contra ${snapshot.away_team.name}, placar ${snapshot.home_score} a ${snapshot.away_score}, minuto ${snapshot.current_minute}`}
        className="h-[min(62vh,620px)] min-h-[340px] w-full max-w-[520px] rounded-lg"
        style={{ touchAction: "pan-y" }}
      />
      <div className="flex w-full max-w-[520px] items-center justify-between gap-3 text-[11px] text-emerald-100/80">
        <span>● {snapshot.home_possession_pct.toFixed(0)}% posse</span>
        <span>{snapshot.current_minute}'</span>
        <span>{snapshot.away_possession_pct.toFixed(0)}% posse ●</span>
      </div>
    </section>
  );
}
