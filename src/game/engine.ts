import { LudoMatch } from '../types';

type Move = { dieIdx: number; pieceIdx: number; target: number; score: number };

export function rollDice(rerollDieOnly: boolean) {
  const d1 = Math.floor(1 + Math.random() * 6);
  const d2 = rerollDieOnly ? 0 : Math.floor(1 + Math.random() * 6);
  const dice = d2 === 0 ? [d1] : [d1, d2];
  const diceUsed = dice.map(() => false);
  return { dice, diceUsed };
}

function absIndexForRole(role: 'host' | 'guest', steps: number) {
  if (steps < 0) return -1;
  if (role === 'host') return steps; // 0..51 etc
  return (26 + steps) % 52;
}

export function getAvailableDiceIndices(match: LudoMatch) {
  if (!match || !match.diceUsed) return [];
  return match.diceUsed.map((used, idx) => (!used ? idx : -1)).filter((i) => i !== -1);
}

export function getValidMoves(match: LudoMatch, role: 'host' | 'guest'): Move[] {
  const moves: Move[] = [];
  if (!match || !match.dice) return moves;
  const dice = match.dice as number[];
  const diceUsed = match.diceUsed || dice.map(() => false);
  const availableDice = diceUsed.map((used, idx) => (!used ? idx : -1)).filter((i) => i !== -1);

  const myPieces = match.pieces?.[role] || [-1, -1, -1, -1];
  const oppPieces = match.pieces?.[role === 'host' ? 'guest' : 'host'] || [-1, -1, -1, -1];

  for (const dIdx of availableDice) {
    const dieValue = dice[dIdx];
    for (let pIdx = 0; pIdx < 4; pIdx++) {
      const curPos = myPieces[pIdx];
      let target = -1;
      if (curPos === -1) {
        if (dieValue === 6) target = 0;
      } else {
        target = curPos + dieValue;
      }
      if (target === -1 || target > 56) continue;

      // heuristic
      let score = 0;
      // capture
      if (target >= 0 && target <= 50) {
        const abs = absIndexForRole(role, target);
        const isCapture = oppPieces.some((op) => op >= 0 && op <= 50 && absIndexForRole(role === 'host' ? 'guest' : 'host', op) === abs);
        if (isCapture) score += 1000;
      }
      if (target === 56) score += 500;
      if (curPos === -1 && dieValue === 6) score += 200;
      if (curPos < 51 && target >= 51) score += 50;
      score += (curPos === -1 ? 0 : curPos);

      moves.push({ dieIdx: dIdx, pieceIdx: pIdx, target, score });
    }
  }

  moves.sort((a, b) => b.score - a.score);
  return moves;
}

// Return updates relative to the match root (no path prefix)
export function bestMoveUpdates(match: LudoMatch, role: 'host' | 'guest') {
  const moves = getValidMoves(match, role);
  if (moves.length === 0) return null;
  const best = moves[0];
  const dice = match.dice as number[];
  const dieVal = dice[best.dieIdx];

  const myPieces = [...(match.pieces?.[role] || [-1, -1, -1, -1])];
  const oppPieces = [...(match.pieces?.[role === 'host' ? 'guest' : 'host'] || [-1, -1, -1, -1])];
  const passed = { ...(match.passedPenalties || { host: false, guest: false }) };
  const updatedDiceUsed = [...(match.diceUsed || (dice.map(() => false)))];

  const oldPos = myPieces[best.pieceIdx];
  let secondaryMoved = false;

  if (oldPos === -1 && dieVal === 6) {
    const hasPenalty = match.passedPenalties?.[role];
    myPieces[best.pieceIdx] = 0;
    if (!hasPenalty) {
      const other = myPieces.findIndex((p, idx) => p === -1 && idx !== best.pieceIdx);
      if (other !== -1) myPieces[other] = 0;
    } else {
      passed[role] = false;
    }
  } else {
    myPieces[best.pieceIdx] = best.target;
  }

  // Handle automatic second move for entering
  if (oldPos === -1 && dieVal === 6 && Array.isArray(dice) && dice.length === 2) {
    const otherIdx = best.dieIdx === 0 ? 1 : 0;
    if (!updatedDiceUsed[otherIdx]) {
      const otherDieVal = dice[otherIdx];
      const secondIdx = myPieces.findIndex((p, idx) => p === 0 && idx !== best.pieceIdx);
      if (secondIdx !== -1) {
        myPieces[secondIdx] = otherDieVal;
        secondaryMoved = true;
      }
    }
  }

  // captures
  const checkCapture = (pos: number) => {
    if (pos < 0 || pos > 50) return;
    const abs = absIndexForRole(role, pos);
    oppPieces.forEach((opPos, opIdx) => {
      if (opPos >= 0 && opPos <= 50) {
        const oppAbs = absIndexForRole(role === 'host' ? 'guest' : 'host', opPos);
        if (oppAbs === abs) {
          oppPieces[opIdx] = -1;
          passed[role === 'host' ? 'guest' : 'host'] = true; // opponent suffers penalty
        }
      }
    });
  };

  // primary
  const newPos = myPieces[best.pieceIdx];
  if (newPos >= 0 && newPos <= 50) checkCapture(newPos);
  if (secondaryMoved) {
    const secondIdx = myPieces.findIndex((p, idx) => p > 0 && idx !== best.pieceIdx);
    if (secondIdx !== -1) checkCapture(myPieces[secondIdx]);
  }

  updatedDiceUsed[best.dieIdx] = true;
  if (secondaryMoved) {
    updatedDiceUsed[0] = true;
    updatedDiceUsed[1] = true;
  }

  const isWinner = myPieces.every((p) => p === 56);

  const updates: Record<string, any> = {};
  updates[`pieces/${role}`] = myPieces;
  updates[`pieces/${role === 'host' ? 'guest' : 'host'}`] = oppPieces;
  updates[`passedPenalties`] = passed;
  updates[`diceUsed`] = updatedDiceUsed;

  if (isWinner) {
    updates['status'] = 'finished';
    updates['winner'] = role === 'guest' && match.guestUsername === 'Computador' ? 'Computador' : (role === 'host' ? match.hostUsername : match.guestUsername);
  }

  // If all dice used then clear and set next turn according to Angola rules
  const allUsed = updatedDiceUsed.every((u) => u === true);
  if (allUsed && !isWinner) {
    const rolledSingle6 = Array.isArray(dice) && dice.includes(6) && dice.length === 1;
    const rolledDouble = Array.isArray(dice) && dice.length === 2 && dice[0] === dice[1];

    let nextTurn: 'host' | 'guest' = role === 'host' ? 'host' : 'guest';
    let newReroll = false;
    if (rolledSingle6) {
      nextTurn = role; newReroll = true;
    } else if (rolledDouble) {
      nextTurn = role; newReroll = false;
    } else {
      nextTurn = role === 'host' ? 'guest' : 'host';
      newReroll = false;
    }

    updates['dice'] = null;
    updates['turn'] = nextTurn;
    updates['rerollDieOnly'] = newReroll;
    updates['turnStartedAt'] = Date.now();
  }

  return { updates, isWinner };
}

