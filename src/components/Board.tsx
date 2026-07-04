import React from 'react';
import { TRACK_COORDINATES, HOST_HOME_STRETCH, GUEST_HOME_STRETCH, HOST_GOAL_CELL, GUEST_GOAL_CELL } from '../game/boardMap';

type PieceOccupant = { player: 'host' | 'guest'; idx: number };

export default function Board({
  hostPieces,
  guestPieces,
  projectedTarget,
  onCellClick,
  highlightedCell,
}: {
  hostPieces: number[];
  guestPieces: number[];
  projectedTarget: number | null;
  highlightedCell?: { r: number; c: number } | null;
  onCellClick?: (r: number, c: number) => void;
}) {
  const getPiecesAtCell = (row: number, col: number) => {
    const occupants: PieceOccupant[] = [];

    // Host pieces
    hostPieces?.forEach((steps, idx) => {
      if (steps >= 0 && steps <= 50) {
        const coord = TRACK_COORDINATES[steps];
        if (coord && coord.r === row && coord.c === col) occupants.push({ player: 'host', idx });
      } else if (steps >= 51 && steps <= 55) {
        const coord = HOST_HOME_STRETCH[steps];
        if (coord && coord.r === row && coord.c === col) occupants.push({ player: 'host', idx });
      } else if (steps === 56) {
        if (HOST_GOAL_CELL.r === row && HOST_GOAL_CELL.c === col) occupants.push({ player: 'host', idx });
      }
    });

    // Guest pieces
    guestPieces?.forEach((steps, idx) => {
      if (steps >= 0 && steps <= 50) {
        const coord = TRACK_COORDINATES[(26 + steps) % 52];
        if (coord && coord.r === row && coord.c === col) occupants.push({ player: 'guest', idx });
      } else if (steps >= 51 && steps <= 55) {
        const coord = GUEST_HOME_STRETCH[steps];
        if (coord && coord.r === row && coord.c === col) occupants.push({ player: 'guest', idx });
      } else if (steps === 56) {
        if (GUEST_GOAL_CELL.r === row && GUEST_GOAL_CELL.c === col) occupants.push({ player: 'guest', idx });
      }
    });

    return occupants;
  };

  const getCellClassName = (r: number, c: number) => {
    if (r < 6 && c < 6) return 'bg-danger/20 border-danger/40';
    if (r > 8 && c > 8) return 'bg-secondary/20 border-secondary/40';
    if (r === 6 && c === 1) return 'bg-danger/60 border-danger';
    if (r === 8 && c === 13) return 'bg-secondary/60 border-secondary';
    if (r === 7 && c >= 1 && c <= 5) return 'bg-danger/40 border-danger/60';
    if (r === 7 && c >= 9 && c <= 13) return 'bg-secondary/40 border-secondary/60';
    if (r === 7 && c === 6) return 'bg-danger/90 border-danger shadow-inner';
    if (r === 7 && c === 8) return 'bg-secondary/90 border-secondary shadow-inner';
    if (r === 7 && c === 7) return 'bg-background border-dashed border-white/20';

    const isTrack = Object.values(TRACK_COORDINATES).some(coord => coord.r === r && coord.c === c);
    return isTrack ? 'bg-white/5 border-white/10' : 'bg-transparent border-transparent';
  };

  // Find coordinates for projectedTarget if present
  const projectedCoord = (() => {
    if (projectedTarget === null) return null;
    if (projectedTarget <= 50) return TRACK_COORDINATES[projectedTarget];
    if (projectedTarget >= 51 && projectedTarget <= 55) return projectedTarget <= 55 ? HOST_HOME_STRETCH[projectedTarget] || GUEST_HOME_STRETCH[projectedTarget] : null;
    if (projectedTarget === 56) return HOST_GOAL_CELL; // caller should interpret role
    return null;
  })();

  return (
    <section className="w-full max-w-[min(94vw,560px)] mx-auto aspect-square glass rounded-3xl p-3 bg-background border-adaptive shadow-2xl relative mb-5">
      <div className="grid grid-cols-15 h-full w-full gap-[2px]">
        {Array.from({ length: 15 }).map((_, r) => (
          <div key={r} className="contents">
            {Array.from({ length: 15 }).map((_, c) => {
              const cellColorClass = getCellClassName(r, c);
              const pieces = getPiecesAtCell(r, c);
              const isProjected = projectedCoord && projectedCoord.r === r && projectedCoord.c === c;

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => onCellClick && onCellClick(r, c)}
                  className={`rounded-[3px] border-[0.5px] border-white/5 transition-all flex items-center justify-center relative overflow-hidden ${cellColorClass} ${isProjected ? 'ring-2 ring-primary bg-primary/40 animate-pulse' : ''}`}
                >
                  {pieces.map((pc, idx) => (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full shadow-lg border border-white flex items-center justify-center font-black text-[6px] absolute transition-transform ${pc.player === 'host' ? 'bg-danger text-white' : 'bg-secondary text-white'}`}
                      style={{ transform: pieces.length > 1 ? `translate(${(idx - (pieces.length - 1) / 2) * 4}px)` : 'none' }}
                    >
                      P{pc.idx + 1}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
