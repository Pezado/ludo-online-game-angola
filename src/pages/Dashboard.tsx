import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Dices, Trophy, Coins, Plus, Users, ShieldAlert, Check, RefreshCw, Send, HelpCircle, X, CheckCircle, Volume2, Timer, MapPin } from 'lucide-react';
import { db } from '../firebase';
import { ref, onValue, set, update, get, remove, push } from 'firebase/database';
import { useRenewStore } from '../store/useStore';
import { LudoMatch, PrivateMessage, User } from '../types';
import confetti from 'canvas-confetti';

// --- BOARD COORDINATE MAPPING (15x15 Ludo layout) ---
interface Coordinate {
  r: number;
  c: number;
}

const TRACK_COORDINATES: Record<number, Coordinate> = {
  0: { r: 6, c: 1 }, 1: { r: 6, c: 2 }, 2: { r: 6, c: 3 }, 3: { r: 6, c: 4 }, 4: { r: 6, c: 5 },
  5: { r: 5, c: 6 }, 6: { r: 4, c: 6 }, 7: { r: 3, c: 6 }, 8: { r: 2, c: 6 }, 9: { r: 1, c: 6 }, 10: { r: 0, c: 6 },
  11: { r: 0, c: 7 },
  12: { r: 0, c: 8 }, 13: { r: 1, c: 8 }, 14: { r: 2, c: 8 }, 15: { r: 3, c: 8 }, 16: { r: 4, c: 8 }, 17: { r: 5, c: 8 },
  18: { r: 6, c: 9 }, 19: { r: 6, c: 10 }, 20: { r: 6, c: 11 }, 21: { r: 6, c: 12 }, 22: { r: 6, c: 13 }, 23: { r: 6, c: 14 },
  24: { r: 7, c: 14 },
  25: { r: 8, c: 14 }, 26: { r: 8, c: 13 }, 27: { r: 8, c: 12 }, 28: { r: 8, c: 11 }, 29: { r: 8, c: 10 }, 30: { r: 8, c: 9 },
  31: { r: 9, c: 8 }, 32: { r: 10, c: 8 }, 33: { r: 11, c: 8 }, 34: { r: 12, c: 8 }, 35: { r: 13, c: 8 }, 36: { r: 14, c: 8 },
  37: { r: 14, c: 7 },
  38: { r: 14, c: 6 }, 39: { r: 13, c: 6 }, 40: { r: 12, c: 6 }, 41: { r: 11, c: 6 }, 42: { r: 10, c: 6 }, 43: { r: 9, c: 6 },
  44: { r: 8, c: 5 }, 45: { r: 8, c: 4 }, 46: { r: 8, c: 3 }, 47: { r: 8, c: 2 }, 48: { r: 8, c: 1 }, 49: { r: 8, c: 0 },
  50: { r: 7, c: 0 }
};

const HOST_HOME_STRETCH: Record<number, Coordinate> = {
  51: { r: 7, c: 1 }, 52: { r: 7, c: 2 }, 53: { r: 7, c: 3 }, 54: { r: 7, c: 4 }, 55: { r: 7, c: 5 }
};

const GUEST_HOME_STRETCH: Record<number, Coordinate> = {
  51: { r: 7, c: 13 }, 52: { r: 7, c: 12 }, 53: { r: 7, c: 11 }, 54: { r: 7, c: 10 }, 55: { r: 7, c: 9 }
};

const HOST_GOAL_CELL = { r: 7, c: 6 };
const GUEST_GOAL_CELL = { r: 7, c: 8 };

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, setUser, setCurrentMatch } = useRenewStore();
  const [activeMode, setActiveMode] = useState<'normal' | 'profissional'>('normal');

  // Welcome Pop-up
  const [showWelcome, setShowWelcome] = useState(false);

  // Matchmaking lists
  const [availableMatches, setAvailableMatches] = useState<LudoMatch[]>([]);
  const [activeUsersCount, setActiveUsersCount] = useState(0);

  // Active match structures
  const [myMatch, setMyMatch] = useState<LudoMatch | null>(null);

  // Sync match with global store to control bottom nav locks
  useEffect(() => {
    setCurrentMatch(myMatch);
    return () => {
      setCurrentMatch(null);
    };
  }, [myMatch, setCurrentMatch]);

  // Form states
  const [creatingChallenge, setCreatingChallenge] = useState(false);
  const [betAmountInput, setBetAmountInput] = useState('500');

  // Selected piece & die projection inside gameplay
  const [selectedDieIndex, setSelectedDieIndex] = useState<number | null>(null);
  const [selectedPieceIndex, setSelectedPieceIndex] = useState<number | null>(null);
  const [projectedTarget, setProjectedTarget] = useState<number | null>(null);

  // Chat inputs
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Show Rules Modal
  const [showRules, setShowRules] = useState(false);

  // Turn Timer Countdown
  const [timeLeft, setTimeLeft] = useState(10);

  const [hostData, setHostData] = useState<any | null>(null);
  const [guestData, setGuestData] = useState<any | null>(null);

  // Sync host and guest real-time info
  useEffect(() => {
    if (!myMatch) {
      setHostData(null);
      setGuestData(null);
      return;
    }
    
    let unsubHost = () => {};
    let unsubGuest = () => {};

    if (myMatch.hostUsername) {
      const hostRef = ref(db, `ludo/usuarios/${myMatch.hostUsername}`);
      unsubHost = onValue(hostRef, (snap) => {
        if (snap.exists()) {
          setHostData(snap.val());
        }
      });
    }

    if (myMatch.guestUsername) {
      const guestRef = ref(db, `ludo/usuarios/${myMatch.guestUsername}`);
      unsubGuest = onValue(guestRef, (snap) => {
        if (snap.exists()) {
          setGuestData(snap.val());
        }
      });
    }

    return () => {
      unsubHost();
      unsubGuest();
    };
  }, [myMatch?.hostUsername, myMatch?.guestUsername]);

  // Trigger Welcome Popup
  useEffect(() => {
    if (localStorage.getItem('ludo_show_welcome') === 'true') {
      setShowWelcome(true);
      localStorage.removeItem('ludo_show_welcome');
    }
  }, []);

  // Sync active players count
  useEffect(() => {
    const usersRef = ref(db, 'ludo/usuarios');
    const unsubUsers = onValue(usersRef, (snapshot) => {
      let activeCount = 0;
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          if (child.val().active) {
            activeCount++;
          }
        });
      }
      setActiveUsersCount(activeCount || 1);
    });
    return () => unsubUsers();
  }, []);

  // Sync matchmaking list and active match involving current user
  useEffect(() => {
    if (!user) return;
    const matchesRef = ref(db, 'ludo/partidas');
    
    const unsubMatches = onValue(matchesRef, (snapshot) => {
      const matches: LudoMatch[] = [];
      let activeMatchFound: LudoMatch | null = null;

      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const match = child.val() as LudoMatch;
          match.id = child.key!;
          
          if (match.hostUsername === user.id || match.guestUsername === user.id) {
            activeMatchFound = match;
          } else if (match.status === 'waiting') {
            matches.push(match);
          }
        });
      }

      setAvailableMatches(matches);
      setMyMatch(activeMatchFound);
    });

    return () => unsubMatches();
  }, [user?.id]);

  // Handle Game Timer (10 seconds turn limit)
  useEffect(() => {
    if (!myMatch || myMatch.status !== 'playing' || !user) return;

    const isMyTurn = (myMatch.turn === 'host' && myMatch.hostUsername === user.id) ||
                     (myMatch.turn === 'guest' && myMatch.guestUsername === user.id);

    if (!isMyTurn) {
      setTimeLeft(10);
      return;
    }

    const elapsed = Math.floor((Date.now() - myMatch.turnStartedAt) / 1000);
    const rem = Math.max(0, 10 - elapsed);
    setTimeLeft(rem);

    const interval = setInterval(() => {
      const elapsedNow = Math.floor((Date.now() - myMatch.turnStartedAt) / 1000);
      const remaining = Math.max(0, 10 - elapsedNow);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        handleAutoMove();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [myMatch?.turn, myMatch?.turnStartedAt, user?.id]);

  // Automated Computer bot opponent play
  useEffect(() => {
    if (!myMatch || myMatch.status !== 'playing' || !user) return;
    if (myMatch.guestUsername !== 'Computador' || myMatch.turn !== 'guest') return;
    
    // Only the host client executes the computer bot move to avoid double-play or desyncs!
    const isHost = myMatch.hostUsername === user.id;
    if (!isHost) return;

    // Wait 1.5 seconds for a realistic thinking feel
    const timer = setTimeout(async () => {
      try {
        const matchRef = ref(db, `ludo/partidas/${myMatch.id}`);
        
        // 1. If dice not rolled, roll dice!
        if (!myMatch.dice) {
          const d1 = Math.floor(1 + Math.random() * 6);
          const d2 = myMatch.rerollDieOnly ? 0 : Math.floor(1 + Math.random() * 6);
          const diceResult = d2 === 0 ? [d1] : [d1, d2];
          
          const diceUsedArray = diceResult.map(() => false);
          const isDouble = diceResult.length === 2 && diceResult[0] === diceResult[1];
          let newRolledDoubleCount = myMatch.rolledDoubleCount || 0;
          if (isDouble) {
            newRolledDoubleCount += 1;
          }

          await update(matchRef, {
            dice: diceResult,
            diceUsed: diceUsedArray,
            rolledDoubleCount: newRolledDoubleCount,
            turnStartedAt: Date.now()
          });
          return;
        }

        // 2. We have rolled dice. Check if there are unused dice
        const availableDiceIndices = (myMatch.diceUsed || [])
          .map((used, idx) => !used ? idx : -1)
          .filter(idx => idx !== -1);

        if (availableDiceIndices.length === 0) {
          // No unused dice, switch turn
          // Angola turn repeating logic:
          const rolledSingle6 = Array.isArray(myMatch.dice) && myMatch.dice.includes(6) && myMatch.dice.length === 1;
          const rolledDouble = Array.isArray(myMatch.dice) && myMatch.dice.length === 2 && myMatch.dice[0] === myMatch.dice[1];

          let nextTurn = 'guest';
          let newRerollDieOnly = false;

          if (rolledSingle6) {
            nextTurn = 'guest';
            newRerollDieOnly = true;
          } else if (rolledDouble) {
            nextTurn = 'guest';
            newRerollDieOnly = false;
          } else {
            nextTurn = 'host';
            newRerollDieOnly = false;
          }

          await update(matchRef, {
            dice: null,
            turn: nextTurn,
            rerollDieOnly: newRerollDieOnly,
            turnStartedAt: Date.now()
          });
          return;
        }

        // 3. Evaluate best possible moves across all available unused dice and bot pieces
        interface BotMove {
          dieIdx: number;
          pieceIdx: number;
          target: number;
          score: number;
        }

        const possibleMoves: BotMove[] = [];

        // For absolute board coordinates:
        // Guest starting tile is absolute index 26
        const myAbsTile = (steps: number) => (26 + steps) % 52;
        const oppAbsTile = (steps: number) => steps; // Host is 0..51 directly

        for (const dIdx of availableDiceIndices) {
          const dieValue = myMatch.dice[dIdx];

          for (let pIdx = 0; pIdx < 4; pIdx++) {
            const curPos = myMatch.pieces.guest[pIdx];
            let target = -1;

            if (curPos === -1) {
              if (dieValue === 6) {
                target = 0; // enter
              }
            } else {
              target = curPos + dieValue;
            }

            if (target !== -1 && target <= 56) {
              // Calculate heuristic score for this move
              let score = 10; // base score

              // A. Capture Opponent Piece (High value!)
              if (target >= 0 && target <= 50) {
                const absMyTile = myAbsTile(target);
                const isCapturing = myMatch.pieces.host.some((hostPos: number) => {
                  return hostPos >= 0 && hostPos <= 50 && oppAbsTile(hostPos) === absMyTile;
                });
                if (isCapturing) {
                  score += 1000;
                }
              }

              // B. Reach Goal (Very high value!)
              if (target === 56) {
                score += 500;
              }

              // C. Escape from base (Good progression)
              if (curPos === -1 && dieValue === 6) {
                score += 200;
              }

              // D. Enter home stretch (Moving closer to goal)
              if (curPos < 51 && target >= 51) {
                score += 50;
              }

              // E. Progression on board
              score += curPos; // prioritize moving pieces that are already further along

              possibleMoves.push({ dieIdx: dIdx, pieceIdx: pIdx, target, score });
            }
          }
        }

        // Sort moves by score desc
        possibleMoves.sort((a, b) => b.score - a.score);

        if (possibleMoves.length > 0) {
          // Pick the best move
          const bestMove = possibleMoves[0];
          const dieValue = Array.isArray(myMatch.dice) ? myMatch.dice[bestMove.dieIdx] : 0;

          const updatedPieces = [...(myMatch.pieces?.guest || [-1, -1, -1, -1])];
          const hostPieces = [...(myMatch.pieces?.host || [-1, -1, -1, -1])];
          let passedPenaltiesUpdate = { ...myMatch.passedPenalties };

          const oldPos = updatedPieces[bestMove.pieceIdx];

          // Move the piece
          let secondaryMoved = false;
          if (oldPos === -1 && dieValue === 6) {
            // Entry
            const hasPenalty = myMatch.passedPenalties.guest;
            if (hasPenalty) {
              updatedPieces[bestMove.pieceIdx] = 0;
              passedPenaltiesUpdate.guest = false;
            } else {
              updatedPieces[bestMove.pieceIdx] = 0;
              // Enters 2 pieces if possible
              const anotherBaseIdx = updatedPieces.findIndex((p, idx) => p === -1 && idx !== bestMove.pieceIdx);
              if (anotherBaseIdx !== -1) {
                updatedPieces[anotherBaseIdx] = 0;
              }
            }
          } else {
            updatedPieces[bestMove.pieceIdx] = bestMove.target;
          }

          // Special automatic secondary move for traditional Angola double rules
          if (oldPos === -1 && dieValue === 6 && Array.isArray(myMatch.dice) && myMatch.dice.length === 2) {
            const otherDieIdx = bestMove.dieIdx === 0 ? 1 : 0;
            if (myMatch.diceUsed && !myMatch.diceUsed[otherDieIdx]) {
              const otherDieVal = myMatch.dice[otherDieIdx];
              const secondEnteredIdx = updatedPieces.findIndex((p, idx) => p === 0 && idx !== bestMove.pieceIdx);
              if (secondEnteredIdx !== -1) {
                updatedPieces[secondEnteredIdx] = otherDieVal;
                secondaryMoved = true;
              }
            }
          }

          // Handle captures for primary piece
          const newPos = updatedPieces[bestMove.pieceIdx];
          if (newPos >= 0 && newPos <= 50) {
            const absMyTile = myAbsTile(newPos);
            hostPieces.forEach((hostPos, hostIdx) => {
              if (hostPos >= 0 && hostPos <= 50 && oppAbsTile(hostPos) === absMyTile) {
                hostPieces[hostIdx] = -1;
                passedPenaltiesUpdate.host = true;
              }
            });
          }

          // Handle captures for secondary piece
          if (secondaryMoved) {
            const secondEnteredIdx = updatedPieces.findIndex((p, idx) => p > 0 && idx !== bestMove.pieceIdx);
            if (secondEnteredIdx !== -1) {
              const secondPos = updatedPieces[secondEnteredIdx];
              const absSecondTile = myAbsTile(secondPos);
              hostPieces.forEach((hostPos, hostIdx) => {
                if (hostPos >= 0 && hostPos <= 50 && oppAbsTile(hostPos) === absSecondTile) {
                  hostPieces[hostIdx] = -1;
                  passedPenaltiesUpdate.host = true;
                }
              });
            }
          }

          // Mark used dice
          const updatedDiceUsed = [...(myMatch.diceUsed || [false, false])];
          updatedDiceUsed[bestMove.dieIdx] = true;
          if (secondaryMoved) {
            updatedDiceUsed[0] = true;
            updatedDiceUsed[1] = true;
          }

          // Check Win Condition for Computer
          const isWinner = updatedPieces.every(p => p === 56);

          const updates: any = {};
          updates[`ludo/partidas/${myMatch.id}/pieces/guest`] = updatedPieces;
          updates[`ludo/partidas/${myMatch.id}/pieces/host`] = hostPieces;
          updates[`ludo/partidas/${myMatch.id}/passedPenalties`] = passedPenaltiesUpdate;
          updates[`ludo/partidas/${myMatch.id}/diceUsed`] = updatedDiceUsed;

          if (isWinner) {
            updates[`ludo/partidas/${myMatch.id}/status`] = 'finished';
            updates[`ludo/partidas/${myMatch.id}/winner`] = 'Computador';

            // Computer wins: Update host losses statistic
            const hostRef = ref(db, `ludo/usuarios/${myMatch.hostUsername}`);
            const hostSnap = await get(hostRef);
            if (hostSnap.exists()) {
              const hData = hostSnap.val();
              updates[`ludo/usuarios/${myMatch.hostUsername}/losses`] = (hData.losses || 0) + 1;
              updates[`ludo/usuarios/${myMatch.hostUsername}/totalGames`] = (hData.totalGames || 0) + 1;
            }

            const winActId = `act_bot_win_${Date.now()}`;
            updates[`ludo/usuarios/${myMatch.hostUsername}/atividades/${winActId}`] = {
              id: winActId,
              type: 'partida_derrota',
              description: `Perdeu partida de LUDO contra o Computador.`,
              timestamp: new Date().toISOString()
            };
          } else {
            // Check if all dice used up
            const allUsed = updatedDiceUsed.every(u => u === true);
            if (allUsed) {
              // Angola turn repeating logic:
              const rolledSingle6 = Array.isArray(myMatch.dice) && myMatch.dice.includes(6) && myMatch.dice.length === 1;
              const rolledDouble = Array.isArray(myMatch.dice) && myMatch.dice.length === 2 && myMatch.dice[0] === myMatch.dice[1];

              let nextTurn = 'guest';
              let newRerollDieOnly = false;

              if (rolledSingle6) {
                nextTurn = 'guest';
                newRerollDieOnly = true;
              } else if (rolledDouble) {
                nextTurn = 'guest';
                newRerollDieOnly = false;
              } else {
                nextTurn = 'host';
                newRerollDieOnly = false;
              }

              updates[`ludo/partidas/${myMatch.id}/dice`] = null;
              updates[`ludo/partidas/${myMatch.id}/turn`] = nextTurn;
              updates[`ludo/partidas/${myMatch.id}/rerollDieOnly`] = newRerollDieOnly;
              updates[`ludo/partidas/${myMatch.id}/turnStartedAt`] = Date.now();
            }
          }

          await update(ref(db), updates);
        } else {
          // No valid moves with remaining dice, switch turn to host!
          await update(matchRef, {
            dice: null,
            turn: 'host',
            diceUsed: [true, true],
            turnStartedAt: Date.now()
          });
        }
      } catch (err) {
        console.error('Computer move error:', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [myMatch?.turn, myMatch?.dice, myMatch?.diceUsed, user?.id]);

  // Scroll match chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [myMatch?.chat]);

  // Trigger confetti on win
  useEffect(() => {
    if (myMatch && myMatch.status === 'finished' && myMatch.winner === user?.id) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [myMatch?.status, myMatch?.winner]);

  // Handle mode selection (normal vs professional)
  const handleModeSwitch = (mode: 'normal' | 'profissional') => {
    setActiveMode(mode);
  };

  // Create Betting Challenge P2P or vs Computer
  const handleCreateChallenge = async (vsBot: boolean = false) => {
    if (!user) return;
    const betVal = activeMode === 'normal' ? 0 : Number(betAmountInput);

    if (activeMode === 'profissional' && betVal > user.saldoProfissional) {
      alert('Saldo insuficiente para criar esta aposta profissional!');
      return;
    }

    try {
      const matchId = `match_${user.id}_${Date.now()}`;
      const newMatch: LudoMatch = {
        id: matchId,
        hostUsername: user.id,
        guestUsername: vsBot ? 'Computador' : null,
        hostPhone: user.phone,
        guestPhone: vsBot ? '900000000' : null,
        hostProvince: user.province,
        guestProvince: vsBot ? 'Luanda' : null,
        status: vsBot ? 'playing' : 'waiting',
        mode: activeMode,
        betAmount: betVal,
        hostConfirmed: vsBot ? true : false,
        guestConfirmed: vsBot ? true : false,
        pieces: {
          host: [-1, -1, -1, -1],
          guest: [-1, -1, -1, -1]
        },
        passedPenalties: {
          host: false,
          guest: false
        },
        turn: 'host',
        dice: null,
        diceUsed: [false, false],
        rolledDoubleCount: 0,
        rerollDieOnly: false,
        turnStartedAt: Date.now(),
        winner: null,
        createdAt: new Date().toISOString()
      };

      await set(ref(db, `ludo/partidas/${matchId}`), newMatch);

      // Log Activity
      const actId = `act_${Date.now()}`;
      await set(ref(db, `ludo/usuarios/${user.id}/atividades/${actId}`), {
        id: actId,
        type: 'partida_criada',
        description: vsBot 
          ? `Iniciou partida contra o Computador.` 
          : `Criou desafio de LUDO ${activeMode === 'normal' ? 'Grátis' : `${betVal} Kz`}.`,
        timestamp: new Date().toISOString()
      });

      setCreatingChallenge(false);
    } catch (e) {
      console.error('Error creating challenge:', e);
    }
  };

  // Accept a Challenge P2P
  const handleAcceptChallenge = async (match: LudoMatch) => {
    if (!user) return;

    if (match.hostUsername === user.id) {
      alert('Não podes aceitar o teu próprio desafio!');
      return;
    }

    if (match.mode === 'profissional' && match.betAmount > user.saldoProfissional) {
      alert('Saldo insuficiente para aceitar esta aposta profissional!');
      return;
    }

    try {
      // Update match with guest info, move to 'confirming' P2P stage
      const updates: any = {};
      updates[`ludo/partidas/${match.id}/guestUsername`] = user.id;
      updates[`ludo/partidas/${match.id}/guestPhone`] = user.phone;
      updates[`ludo/partidas/${match.id}/guestProvince`] = user.province;
      updates[`ludo/partidas/${match.id}/status`] = 'confirming';

      await update(ref(db), updates);
    } catch (e) {
      console.error('Error accepting challenge:', e);
    }
  };

  // Cancel own waiting challenge
  const handleCancelChallenge = async (matchId: string) => {
    try {
      await remove(ref(db, `ludo/partidas/${matchId}`));
    } catch (e) {
      console.error('Error cancelling challenge:', e);
    }
  };

  // Confirm terms P2P in Lista de Espera card
  const handleConfirmMatchTerms = async () => {
    if (!myMatch || !user) return;

    const isHost = myMatch.hostUsername === user.id;
    const path = `ludo/partidas/${myMatch.id}/${isHost ? 'hostConfirmed' : 'guestConfirmed'}`;

    try {
      await set(ref(db, path), true);

      // Check if both confirmed
      const matchRef = ref(db, `ludo/partidas/${myMatch.id}`);
      const snap = await get(matchRef);
      if (snap.exists()) {
        const latest = snap.val() as LudoMatch;
        if (latest.hostConfirmed && latest.guestConfirmed) {
          // Deduct bets from balances in professional mode
          if (latest.mode === 'profissional' && latest.betAmount > 0) {
            // Deduct from host
            const hostRef = ref(db, `ludo/usuarios/${latest.hostUsername}`);
            const hostSnap = await get(hostRef);
            if (hostSnap.exists()) {
              const hData = hostSnap.val();
              await update(hostRef, { saldoProfissional: (hData.saldoProfissional || 0) - latest.betAmount });
            }

            // Deduct from guest
            const guestRef = ref(db, `ludo/usuarios/${latest.guestUsername}`);
            const guestSnap = await get(guestRef);
            if (guestSnap.exists()) {
              const gData = guestSnap.val();
              await update(guestRef, { saldoProfissional: (gData.saldoProfissional || 0) - latest.betAmount });
            }
          }

          // Move match state to playing and set turn started timestamp
          await update(matchRef, {
            status: 'playing',
            turnStartedAt: Date.now()
          });
        }
      }
    } catch (e) {
      console.error('Confirmation error:', e);
    }
  };

  // Leave / Abort during P2P confirmation stage
  const handleCancelConfirmation = async () => {
    if (!myMatch) return;
    try {
      // Return match to lobby by removing guest and resetting confirmations
      await update(ref(db, `ludo/partidas/${myMatch.id}`), {
        guestUsername: null,
        guestPhone: null,
        guestProvince: null,
        status: 'waiting',
        hostConfirmed: false,
        guestConfirmed: false
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Send Private Message inside match P2P card
  const handleSendMatchMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myMatch || !chatInput.trim() || !user) return;

    try {
      const msgRef = push(ref(db, `ludo/partidas/${myMatch.id}/chat`));
      await set(msgRef, {
        sender: user.id,
        text: chatInput.trim(),
        timestamp: new Date().toISOString()
      });
      setChatInput('');
    } catch (e) {
      console.error(e);
    }
  };

  // --- LUDO GAME ENGINE OPERATIONS ---

  // Roll dice
  const handleRollDice = async () => {
    if (!myMatch || !user) return;

    const isHost = myMatch.hostUsername === user.id;
    const myRole = isHost ? 'host' : 'guest';

    if (myMatch.turn !== myRole || myMatch.dice) return;

    // Generate dice: 1 die if rerollDieOnly is active, else 2 dice
    const d1 = Math.floor(1 + Math.random() * 6);
    const d2 = myMatch.rerollDieOnly ? 0 : Math.floor(1 + Math.random() * 6);
    const diceResult = d2 === 0 ? [d1] : [d1, d2];

    const diceUsedArray = diceResult.map(() => false);

    // traditional Angola pairing rules: check if equal
    const isDouble = diceResult.length === 2 && diceResult[0] === diceResult[1];
    let newRolledDoubleCount = myMatch.rolledDoubleCount;
    if (isDouble) {
      newRolledDoubleCount += 1;
    }

    try {
      await update(ref(db, `ludo/partidas/${myMatch.id}`), {
        dice: diceResult,
        diceUsed: diceUsedArray,
        rolledDoubleCount: newRolledDoubleCount,
        turnStartedAt: Date.now()
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Select a die value and a piece to project path
  const handleSelectDie = (val: number, idx: number) => {
    if (!myMatch || !myMatch.diceUsed || myMatch.diceUsed[idx]) return;
    setSelectedDieIndex(idx);
    setProjectedTarget(null);
    setSelectedPieceIndex(null);
  };

  const handleSelectPiece = (pieceIdx: number) => {
    if (!myMatch || !user || selectedDieIndex === null) return;

    const isHost = myMatch.hostUsername === user.id;
    const myRole = isHost ? 'host' : 'guest';
    const curPos = myMatch.pieces?.[myRole]?.[pieceIdx] ?? -1;
    const dieValue = Array.isArray(myMatch.dice) ? myMatch.dice[selectedDieIndex] : 0;

    let target = -1;

    // Entry rule from base (-1)
    if (curPos === -1) {
      if (dieValue === 6) {
        // Enters. If captured penalty is active: only 1 piece enters. Otherwise: 2 pieces enter at 0!
        target = 0;
      }
    } else {
      // standard move on track/home stretch
      target = curPos + dieValue;
    }

    if (target > 56) {
      // Exceeds goal, cannot move
      setProjectedTarget(null);
      setSelectedPieceIndex(null);
      return;
    }

    setSelectedPieceIndex(pieceIdx);
    setProjectedTarget(target);
  };

  // Confirm and commit the move
  const handleConfirmMove = async () => {
    if (!myMatch || !user || selectedPieceIndex === null || selectedDieIndex === null || projectedTarget === null) return;

    const isHost = myMatch.hostUsername === user.id;
    const myRole = isHost ? 'host' : 'guest';
    const oppRole = isHost ? 'guest' : 'host';
    const dieValue = Array.isArray(myMatch.dice) ? myMatch.dice[selectedDieIndex] : 0;

    try {
      const updatedPieces = [...(myMatch.pieces?.[myRole] || [-1, -1, -1, -1])];
      const opponentPieces = [...(myMatch.pieces?.[oppRole] || [-1, -1, -1, -1])];
      let passedPenaltiesUpdate = { ...myMatch.passedPenalties };

      const oldPos = updatedPieces[selectedPieceIndex];

      // Execute move
      if (oldPos === -1 && dieValue === 6) {
        // Enters!
        const hasPenalty = myMatch.passedPenalties[myRole];
        if (hasPenalty) {
          // Penalty entry: only 1 enters (sets pos = 0)
          updatedPieces[selectedPieceIndex] = 0;
          // Clear penalty
          passedPenaltiesUpdate[myRole] = false;
        } else {
          // Standard entry: enters 2 pieces at once!
          updatedPieces[selectedPieceIndex] = 0;
          // Find another piece in base and move it to 0 as well
          const anotherBaseIdx = updatedPieces.findIndex((p, idx) => p === -1 && idx !== selectedPieceIndex);
          if (anotherBaseIdx !== -1) {
            updatedPieces[anotherBaseIdx] = 0;
          }
        }
      } else {
        // Standard track move
        updatedPieces[selectedPieceIndex] = projectedTarget;
      }

      // Traditional Angola rules special moves:
      // "se vier 12 (6-6), uma fica na ficha e outra se jogará automaticamente na casa 6"
      // "se vier por ex: 6-2, uma na ficha e outra se jogará automaticamente na casa 2"
      let secondaryMoved = false;
      if (oldPos === -1 && dieValue === 6 && Array.isArray(myMatch.dice) && myMatch.dice.length === 2) {
        const otherDieVal = myMatch.dice[selectedDieIndex === 0 ? 1 : 0];
        // Automatic movement of second entered piece by the other die's value!
        const secondEnteredIdx = updatedPieces.findIndex((p, idx) => p === 0 && idx !== selectedPieceIndex);
        if (secondEnteredIdx !== -1) {
          updatedPieces[secondEnteredIdx] = otherDieVal;
          secondaryMoved = true;
        }
      }

      // Check Capture (Absolute Board Index matching)
      // Player absolute position is stepsTraveled (for Host) or (26 + stepsTraveled)%52 (for Guest)
      const myAbsTile = (steps: number) => isHost ? steps : (26 + steps) % 52;
      const oppAbsTile = (steps: number) => !isHost ? steps : (26 + steps) % 52;

      // Check if newly moved piece landed on opponent's pieces (tiles 0..50)
      const newPos = updatedPieces[selectedPieceIndex];
      if (newPos >= 0 && newPos <= 50) {
        const absMyTile = myAbsTile(newPos);
        opponentPieces.forEach((oppPos, oppIdx) => {
          if (oppPos >= 0 && oppPos <= 50 && oppAbsTile(oppPos) === absMyTile) {
            // Captured! Send back to base
            opponentPieces[oppIdx] = -1;
            passedPenaltiesUpdate[oppRole] = true; // Suffer entry penalty!
          }
        });
      }

      // If secondary piece moved, check capture for it too
      if (secondaryMoved) {
        const secondEnteredIdx = updatedPieces.findIndex((p, idx) => p > 0 && idx !== selectedPieceIndex);
        if (secondEnteredIdx !== -1) {
          const secondPos = updatedPieces[secondEnteredIdx];
          const absSecondTile = myAbsTile(secondPos);
          opponentPieces.forEach((oppPos, oppIdx) => {
            if (oppPos >= 0 && oppPos <= 50 && oppAbsTile(oppPos) === absSecondTile) {
              opponentPieces[oppIdx] = -1;
              passedPenaltiesUpdate[oppRole] = true;
            }
          });
        }
      }

      // Mark the selected die value as used
      const updatedDiceUsed = [...(myMatch.diceUsed || [false, false])];
      updatedDiceUsed[selectedPieceIndex] = true; // Wait, match indices
      updatedDiceUsed[selectedDieIndex] = true;
      if (secondaryMoved) {
        // Both dice used up
        updatedDiceUsed[0] = true;
        updatedDiceUsed[1] = true;
      }

      // Check if all pieces of this role reached goal (56)
      const isWinner = updatedPieces.every(p => p === 56);

      const matchRef = ref(db, `ludo/partidas/${myMatch.id}`);
      const updates: any = {};

      updates[`ludo/partidas/${myMatch.id}/pieces/${myRole}`] = updatedPieces;
      updates[`ludo/partidas/${myMatch.id}/pieces/${oppRole}`] = opponentPieces;
      updates[`ludo/partidas/${myMatch.id}/passedPenalties`] = passedPenaltiesUpdate;
      updates[`ludo/partidas/${myMatch.id}/diceUsed`] = updatedDiceUsed;

      if (isWinner) {
        // Game Finished!
        updates[`ludo/partidas/${myMatch.id}/status`] = 'finished';
        updates[`ludo/partidas/${myMatch.id}/winner`] = user.id;

        // Credit payouts for professional modes
        if (myMatch.mode === 'profissional' && myMatch.betAmount > 0) {
          const prize = myMatch.betAmount * 2;
          const winnerRef = ref(db, `ludo/usuarios/${user.id}`);
          const wSnap = await get(winnerRef);
          if (wSnap.exists()) {
            const wData = wSnap.val();
            updates[`ludo/usuarios/${user.id}/saldoProfissional`] = (wData.saldoProfissional || 0) + prize;
          }
        }

        // Update statistics for winner
        updates[`ludo/usuarios/${user.id}/wins`] = (user.wins || 0) + 1;
        updates[`ludo/usuarios/${user.id}/totalGames`] = (user.totalGames || 0) + 1;

        // Update statistics for loser
        const loserUsername = isHost ? myMatch.guestUsername! : myMatch.hostUsername;
        const loserRef = ref(db, `ludo/usuarios/${loserUsername}`);
        const lSnap = await get(loserRef);
        if (lSnap.exists()) {
          const lData = lSnap.val();
          updates[`ludo/usuarios/${loserUsername}/losses`] = (lData.losses || 0) + 1;
          updates[`ludo/usuarios/${loserUsername}/totalGames`] = (lData.totalGames || 0) + 1;
        }

        // Log logs
        const winActId = `act_win_${Date.now()}`;
        updates[`ludo/usuarios/${user.id}/atividades/${winActId}`] = {
          id: winActId,
          type: 'partida_vitoria',
          description: `Venceu partida de LUDO contra ${loserUsername}.`,
          timestamp: new Date().toISOString()
        };

        const loseActId = `act_lose_${Date.now()}`;
        updates[`ludo/usuarios/${loserUsername}/atividades/${loseActId}`] = {
          id: loseActId,
          type: 'partida_derrota',
          description: `Perdeu partida de LUDO contra ${user.id}.`,
          timestamp: new Date().toISOString()
        };
      } else {
        // Check if all dice used
        const allUsed = updatedDiceUsed.every(u => u === true);
        if (allUsed) {
          // Angola turn repeating privilege:
          // Did they roll a double or 6?
          const rolledSingle6 = Array.isArray(myMatch.dice) && myMatch.dice.includes(6) && myMatch.dice.length === 1; // single 6 reroll
          const rolledDouble = Array.isArray(myMatch.dice) && myMatch.dice.length === 2 && myMatch.dice[0] === myMatch.dice[1];

          let nextTurn = myRole;
          let newRerollDieOnly = false;

          if (rolledSingle6) {
            nextTurn = myRole; // repeat
            newRerollDieOnly = true; // rolls only 1 die next roll!
          } else if (rolledDouble) {
            nextTurn = myRole; // repeat
            newRerollDieOnly = false;
          } else {
            nextTurn = oppRole; // turn changes!
            newRerollDieOnly = false;
          }

          updates[`ludo/partidas/${myMatch.id}/dice`] = null;
          updates[`ludo/partidas/${myMatch.id}/turn`] = nextTurn;
          updates[`ludo/partidas/${myMatch.id}/rerollDieOnly`] = newRerollDieOnly;
          updates[`ludo/partidas/${myMatch.id}/turnStartedAt`] = Date.now();
        }
      }

      await update(ref(db), updates);

      // Reset selection state
      setSelectedDieIndex(null);
      setSelectedPieceIndex(null);
      setProjectedTarget(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Automated/Random play on 10s timer timeout
  const handleAutoMove = async () => {
    if (!myMatch || !user) return;
    const isHost = myMatch.hostUsername === user.id;
    const myRole = isHost ? 'host' : 'guest';
    const oppRole = isHost ? 'guest' : 'host';

    try {
      const matchRef = ref(db, `ludo/partidas/${myMatch.id}`);
      
      // If dice hasn't been rolled, roll dice automatically
      if (!myMatch.dice) {
        const d1 = Math.floor(1 + Math.random() * 6);
        const d2 = myMatch.rerollDieOnly ? 0 : Math.floor(1 + Math.random() * 6);
        const diceResult = d2 === 0 ? [d1] : [d1, d2];
        await update(matchRef, {
          dice: diceResult,
          diceUsed: diceResult.map(() => false),
          turnStartedAt: Date.now()
        });
        return;
      }

      // If dice rolled but not moved: make a random valid move
      let moved = false;
      const availableDiceIndices = (myMatch.diceUsed || []).map((used, idx) => !used ? idx : -1).filter(idx => idx !== -1);
      
      if (availableDiceIndices.length > 0) {
        const dieIdx = availableDiceIndices[0];
        const dieValue = Array.isArray(myMatch.dice) ? myMatch.dice[dieIdx] : 0;

        // Find any playable piece
        for (let pIdx = 0; pIdx < 4; pIdx++) {
          const curPos = myMatch.pieces?.[myRole]?.[pIdx] ?? -1;
          let target = -1;
          if (curPos === -1 && dieValue === 6) {
            target = 0;
          } else if (curPos !== -1) {
            target = curPos + dieValue;
          }

          if (target !== -1 && target <= 56) {
            // Found a valid piece move, execute it!
            const updatedPieces = [...(myMatch.pieces?.[myRole] || [-1, -1, -1, -1])];
            const opponentPieces = [...(myMatch.pieces?.[oppRole] || [-1, -1, -1, -1])];

            if (curPos === -1 && dieValue === 6) {
              const hasPenalty = myMatch.passedPenalties?.[myRole];
              updatedPieces[pIdx] = 0;
              if (!hasPenalty) {
                const otherBase = updatedPieces.findIndex((p, idx) => p === -1 && idx !== pIdx);
                if (otherBase !== -1) updatedPieces[otherBase] = 0;
              }
            } else {
              updatedPieces[pIdx] = target;
            }

            const updatedDiceUsed = [...(myMatch.diceUsed || [false, false])];
            updatedDiceUsed[dieIdx] = true;

            const updates: any = {};
            updates[`ludo/partidas/${myMatch.id}/pieces/${myRole}`] = updatedPieces;
            updates[`ludo/partidas/${myMatch.id}/diceUsed`] = updatedDiceUsed;

            const allUsed = updatedDiceUsed.every(u => u === true);
            if (allUsed) {
              updates[`ludo/partidas/${myMatch.id}/dice`] = null;
              updates[`ludo/partidas/${myMatch.id}/turn`] = oppRole;
              updates[`ludo/partidas/${myMatch.id}/turnStartedAt`] = Date.now();
            }

            await update(ref(db), updates);
            moved = true;
            break;
          }
        }
      }

      if (!moved) {
        // No playable move, pass turn to opponent
        await update(matchRef, {
          dice: null,
          turn: oppRole,
          diceUsed: [true, true],
          turnStartedAt: Date.now()
        });
      }

      setSelectedDieIndex(null);
      setSelectedPieceIndex(null);
      setProjectedTarget(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Complete / Finish game and return to lobby
  const handleExitFinishedGame = async () => {
    if (!myMatch) return;
    try {
      await remove(ref(db, `ludo/partidas/${myMatch.id}`));
      setMyMatch(null);
    } catch (e) {
      console.error(e);
    }
  };

  // --- RENDERING SUB-COMPONENTS ---

  // Check absolute tile occupancies to draw pieces on cells
  const getPiecesAtCell = (row: number, col: number) => {
    if (!myMatch || !myMatch.pieces) return [];
    const occupants: { player: 'host' | 'guest'; idx: number }[] = [];

    const myAbsTile = (steps: number) => steps;
    const oppAbsTile = (steps: number) => (26 + steps) % 52;

    const hostPieces = myMatch.pieces.host || [];
    const guestPieces = myMatch.pieces.guest || [];

    // Check host track pieces
    hostPieces.forEach((steps, idx) => {
      if (steps >= 0 && steps <= 50) {
        const coord = TRACK_COORDINATES[steps];
        if (coord && coord.r === row && coord.c === col) {
          occupants.push({ player: 'host', idx });
        }
      } else if (steps >= 51 && steps <= 55) {
        // Home stretch
        const coord = HOST_HOME_STRETCH[steps];
        if (coord && coord.r === row && coord.c === col) {
          occupants.push({ player: 'host', idx });
        }
      } else if (steps === 56) {
        // Goal
        if (HOST_GOAL_CELL.r === row && HOST_GOAL_CELL.c === col) {
          occupants.push({ player: 'host', idx });
        }
      }
    });

    // Check guest track pieces
    guestPieces.forEach((steps, idx) => {
      if (steps >= 0 && steps <= 50) {
        const coord = TRACK_COORDINATES[(26 + steps) % 52];
        if (coord && coord.r === row && coord.c === col) {
          occupants.push({ player: 'guest', idx });
        }
      } else if (steps >= 51 && steps <= 55) {
        const coord = GUEST_HOME_STRETCH[steps];
        if (coord && coord.r === row && coord.c === col) {
          occupants.push({ player: 'guest', idx });
        }
      } else if (steps === 56) {
        if (GUEST_GOAL_CELL.r === row && GUEST_GOAL_CELL.c === col) {
          occupants.push({ player: 'guest', idx });
        }
      }
    });

    return occupants;
  };

  // Board Cell Color Picker
  const getCellClassName = (r: number, c: number) => {
    // Yards
    if (r < 6 && c < 6) return 'bg-danger/20 border-danger/40'; // Host yard
    if (r > 8 && c > 8) return 'bg-secondary/20 border-secondary/40'; // Guest yard
    
    // Starters and Special tiles
    if (r === 6 && c === 1) return 'bg-danger/60 border-danger'; // Host entry spot
    if (r === 8 && c === 13) return 'bg-secondary/60 border-secondary'; // Guest entry spot

    // Home Stretches
    if (r === 7 && c >= 1 && c <= 5) return 'bg-danger/40 border-danger/60';
    if (r === 7 && c >= 9 && c <= 13) return 'bg-secondary/40 border-secondary/60';

    // Center Goals
    if (r === 7 && c === 6) return 'bg-danger/90 border-danger shadow-inner';
    if (r === 7 && c === 8) return 'bg-secondary/90 border-secondary shadow-inner';
    if (r === 7 && c === 7) return 'bg-background border-dashed border-white/20';

    // Track path checks
    const isTrack = Object.values(TRACK_COORDINATES).some(coord => coord.r === r && coord.c === c);
    return isTrack ? 'bg-white/5 border-white/10' : 'bg-transparent border-transparent';
  };

  return (
    <div className="pb-24 min-h-screen text-foreground">
      {/* 1. WELCOME POP-UP */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              className="glass p-6 rounded-3xl border-primary/20 max-w-sm text-center bg-background/90 relative"
            >
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                <Trophy size={36} />
              </div>
              <h3 className="text-md font-black uppercase text-primary tracking-widest mb-2">Bem-vindo, {user?.username}!</h3>
              <p className="text-xs leading-relaxed font-semibold opacity-75 mb-6">
                Entraste na maior arena P2P de LUDO em Angola. Jogas com as regras tradicionais e ganhas saldo real. Lembra-te de manter uma conduta ética nas apostas.
              </p>
              <button
                onClick={async () => {
                  setShowWelcome(false);
                  if (user) {
                    await update(ref(db, `ludo/usuarios/${user.id}`), { active: true });
                  }
                }}
                className="w-full h-12 bg-primary text-background font-black text-xs uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-transform"
              >
                Entrar na Arena
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. RULES MODAL */}
      <AnimatePresence>
        {showRules && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              className="glass p-5 rounded-3xl border-adaptive max-w-sm bg-background/95 max-h-[80vh] overflow-y-auto scrollbar-hide"
            >
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-adaptive">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary">Regras do LUDO Angola</h3>
                <button onClick={() => setShowRules(false)} className="opacity-55 hover:opacity-100">
                  <X size={16} />
                </button>
              </div>
              <div className="text-[10px] leading-relaxed font-semibold space-y-4 text-left">
                <p>
                  <strong className="text-primary uppercase">1. Entrada a dobrar (Casal):</strong> Tirar um <span className="text-primary font-bold">6</span> num único dado permite entrar duas peças de uma só vez na casa de partida (Tile 0).
                </p>
                <p>
                  <strong className="text-primary uppercase">2. Rerolls:</strong> Tirar um <span className="text-primary font-bold">6</span> simples dá o privilégio de girar de novo, mas apenas <strong className="text-primary">1 único dado</strong>. Se sair par igual (1-1, 2-2, 3-3, 4-4, 5-5, 6-6), faz a jogada e gira <strong className="text-primary">os 2 dados de novo</strong>.
                </p>
                <p>
                  <strong className="text-primary uppercase">3. Autoplay de Entrada:</strong> Se rolar <strong className="text-primary">12 (6-6)</strong>, entra as 2 peças: uma fica na casa de entrada e a outra avança automaticamente 6 casas. Se rolar <strong className="text-primary">6-2</strong>, entra ambas: uma fica na entrada e a outra avança 2 casas.
                </p>
                <p>
                  <strong className="text-primary uppercase">4. Penalização por Captura ("Passado"):</strong> Se o teu oponente saltar ou capturar as tuas peças antes de entrares no jogo, ficas penalizado. Na tua próxima entrada com <span className="text-primary font-bold">6</span>, entra apenas <strong className="text-primary">1 única peça</strong> (em vez de duas), a menos que tires 6-6.
                </p>
                <p>
                  <strong className="text-primary uppercase">5. Escolha de Movimentos:</strong> Toca no dado correspondente ao valor que queres gastar e depois na peça. Verás a projeção do alvo. Clique em <strong className="text-primary">"Confirmar"</strong> para efetuar.
                </p>
                <p>
                  <strong className="text-primary uppercase">6. Turno Rápido:</strong> Tens apenas <strong className="text-primary font-bold">10 segundos</strong> para concluir a jogada. Caso o tempo expire, as tuas peças jogar-se-ão automaticamente de forma aleatória.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- PAGE SECTIONS --- */}

      {/* LOBBY / DESK VIEW (When no active match is running) */}
      {!myMatch && (
        <div className="px-4 pt-4">
          {/* Top Info Bar */}
          <section className="flex justify-between items-center mb-6">
            <div>
              <p className="text-[10px] opacity-50 uppercase font-black tracking-widest">Lobby LUDO Angola</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 bg-success rounded-full animate-ping" />
                <p className="text-[10px] font-black text-success uppercase tracking-wider">{activeUsersCount} Ativos Agora</p>
              </div>
            </div>
            <button
              onClick={() => setShowRules(true)}
              className="glass px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-1 hover:bg-primary/10 transition-colors"
            >
              <HelpCircle size={12} /> Regras
            </button>
          </section>

          {/* Mode Alternator Selector */}
          <section className="bg-white/5 p-1 rounded-2xl grid grid-cols-2 gap-2 mb-6 border border-white/5">
            <button
              onClick={() => handleModeSwitch('normal')}
              className={`py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeMode === 'normal' ? 'bg-primary text-background shadow-md shadow-primary/25' : 'opacity-60 hover:opacity-100'
              }`}
            >
              Modo Treino (Normal)
            </button>
            <button
              onClick={() => handleModeSwitch('profissional')}
              className={`py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeMode === 'profissional' ? 'bg-primary text-background shadow-md shadow-primary/25' : 'opacity-60 hover:opacity-100'
              }`}
            >
              Modo Apostas (Pro)
            </button>
          </section>

          {/* Wallet Balance Display */}
          <section className="mb-6">
            {activeMode === 'normal' ? (
              <div className="glass p-5 rounded-3xl bg-secondary/5 border-secondary/20 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <p className="text-[9px] font-bold opacity-45 uppercase tracking-widest">Modo Treino (Livre)</p>
                  <p className="text-sm font-black text-white mt-1">
                    Treino Livre & Ilimitado (Sem Dinheiro)
                  </p>
                  <p className="text-[8px] opacity-40 font-bold uppercase mt-0.5">Arena de simulação tradicional angolana</p>
                </div>
              </div>
            ) : (
              <div className="glass p-5 rounded-3xl bg-primary/5 border-primary/20 flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-bold opacity-45 uppercase tracking-widest">Meu Saldo de Apostas</p>
                  <p className="text-2xl font-black text-white mt-1">
                    {(user?.saldoProfissional || 0).toLocaleString()} Kz
                  </p>
                </div>
                <button
                  onClick={() => navigate('/deposit')}
                  className="bg-primary text-background px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-1 active:scale-95 transition-transform"
                >
                  <Plus size={14} /> Carregar
                </button>
              </div>
            )}
          </section>

          {/* Matches List */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest opacity-40">Desafios Disponíveis</h3>
              <button
                onClick={() => setCreatingChallenge(true)}
                className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1 active:scale-95 transition-transform"
              >
                <Plus size={14} /> Novo Desafio
              </button>
            </div>

            {creatingChallenge && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-5 rounded-3xl border-primary/30 bg-primary/5 space-y-4"
              >
                <div className="flex justify-between items-center pb-2 border-b border-adaptive">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Propor Novo Desafio</h4>
                  <button onClick={() => setCreatingChallenge(false)}>
                    <X size={16} />
                  </button>
                </div>

                {activeMode === 'profissional' ? (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <label className="text-[9px] font-bold opacity-45 uppercase tracking-widest block ml-1">Valor do Desafio / Aposta (Kz)</label>
                      <div className="grid grid-cols-4 gap-2">
                        {['500', '1000', '2500', '5000'].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setBetAmountInput(val)}
                            className={`py-2 border rounded-xl text-xs font-bold tracking-wider ${
                              betAmountInput === val ? 'bg-primary text-background border-primary' : 'border-white/10 hover:border-primary/50'
                            }`}
                          >
                            {val} Kz
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleCreateChallenge(false)}
                      className="w-full h-12 bg-primary text-background rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                      Confirmar e Listar <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[9px] font-bold opacity-60 leading-relaxed uppercase tracking-wider">
                      Escolha como deseja treinar de forma 100% gratuita na maior mesa tradicional de Angola:
                    </p>

                    <div className="space-y-3">
                      {/* Option 1: VS Bot */}
                      <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between gap-3">
                        <div className="text-left">
                          <span className="text-[8px] font-black uppercase text-primary tracking-widest block mb-0.5">Treino Individual</span>
                          <h5 className="text-[11px] font-black text-white uppercase tracking-wider">Jogar vs Computador</h5>
                          <p className="text-[8px] opacity-65 font-bold leading-relaxed mt-1">
                            Bot inteligente com regras tradicionais angolanas. Sem esperas.
                          </p>
                        </div>
                        <button
                          onClick={() => handleCreateChallenge(true)}
                          className="bg-primary text-background px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest shrink-0 active:scale-95 transition-transform"
                        >
                          Iniciar
                        </button>
                      </div>

                      {/* Option 2: Multiplayer */}
                      <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between gap-3">
                        <div className="text-left">
                          <span className="text-[8px] font-black uppercase opacity-50 tracking-widest block mb-0.5">Desafio Coletivo</span>
                          <h5 className="text-[11px] font-black text-white uppercase tracking-wider">Mesa Multiplayer</h5>
                          <p className="text-[8px] opacity-65 font-bold leading-relaxed mt-1">
                            Publique na arena e aguarde outro jogador entrar (mínimo de 2 jogadores).
                          </p>
                        </div>
                        <button
                          onClick={() => handleCreateChallenge(false)}
                          className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest shrink-0 active:scale-95 transition-transform"
                        >
                          Criar Sala
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {availableMatches.filter(m => m.mode === activeMode).length > 0 ? (
              <div className="space-y-3.5">
                {availableMatches
                  .filter(m => m.mode === activeMode)
                  .map((match) => (
                    <div key={match.id} className="glass p-4 rounded-3xl border-adaptive flex justify-between items-center bg-white/5 relative overflow-hidden">
                      {/* Decorative background visual depending on mode */}
                      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
                      
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/20 border border-primary/30 text-primary font-black uppercase rounded-2xl flex items-center justify-center">
                          {match.hostUsername.substring(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black uppercase tracking-wider text-white">{match.hostUsername}</span>
                            <span className="text-[8px] px-1.5 py-0.5 bg-white/15 rounded-full font-bold opacity-60 flex items-center gap-0.5">
                              <MapPin size={7} /> {match.hostProvince}
                            </span>
                          </div>
                          <p className="text-[9px] opacity-45 font-bold mt-1 uppercase">
                            {match.mode === 'normal' ? 'Jogo de Treino' : `Aposta de ${match.betAmount.toLocaleString()} Kz`}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAcceptChallenge(match)}
                        className="bg-primary text-background px-4 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-primary/80 transition-colors active:scale-95"
                      >
                        Aceitar Desafio
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="glass p-10 rounded-3xl text-center border-adaptive flex flex-col items-center justify-center">
                <Users size={36} className="text-primary mb-3 opacity-40" />
                <p className="text-xs font-black uppercase tracking-widest opacity-40">Sem desafios ativos</p>
                <p className="text-[9px] font-bold opacity-30 mt-1 max-w-[240px] leading-relaxed mx-auto">
                  Crie o seu próprio desafio e aguarde que outro jogador angolano aceite o seu convite na plataforma.
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* MATCH WAITING (STAGE: Waiting for Opponent to join) - FIXED BLACK SCREEN BUG */}
      {myMatch && myMatch.status === 'waiting' && (
        <div className="px-4 pt-16 pb-24 min-h-screen text-foreground flex flex-col justify-between items-center text-center">
          <div className="space-y-6 w-full max-w-sm mx-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 rounded-full scale-150 animate-pulse opacity-40" />
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center text-primary mx-auto shadow-xl relative z-10">
                <RefreshCw size={40} className="animate-spin text-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black uppercase tracking-widest text-primary">Aguardando Oponente</h1>
              <p className="text-[10px] opacity-50 uppercase font-black tracking-widest">Desafio Publicado na Mesa Angola</p>
            </div>

            <div className="glass p-5 rounded-3xl border-primary/20 bg-primary/5">
              <span className="text-[8px] font-black uppercase tracking-widest text-primary block mb-1">Detalhes do Desafio</span>
              <p className="text-xl font-black text-white">
                {myMatch.mode === 'normal' ? 'Modo Treino (Livre/Grátis)' : `${myMatch.betAmount.toLocaleString()} Kz`}
              </p>
              <div className="mt-3 border-t border-white/5 pt-3 text-[10px] opacity-75 font-semibold space-y-1">
                <p>Criador: <span className="font-bold text-white uppercase">{myMatch.hostUsername}</span></p>
                <p>Província: <span className="font-bold text-white">{myMatch.hostProvince}</span></p>
              </div>
            </div>

            <p className="text-[9px] opacity-60 leading-relaxed font-semibold">
              O seu desafio está listado no lobby principal. Assim que outro jogador aceitar, a partida avançará para a confirmação de termos de mesa.
            </p>
          </div>

          <button
            onClick={() => handleCancelChallenge(myMatch.id)}
            className="w-full max-w-xs h-14 bg-danger text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-danger/20 active:scale-95 transition-transform"
          >
            <X size={14} /> Cancelar Desafio e Voltar
          </button>
        </div>
      )}

      {/* MATCH CONFIRMATION (STAGE: P2P waiting list) */}
      {myMatch && myMatch.status === 'confirming' && (
        <div className="px-4 pt-6 pb-24 min-h-screen text-foreground flex flex-col justify-between">
          <div>
            <header className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-md font-black uppercase tracking-widest text-primary">Confirmação P2P</h1>
                <p className="text-[10px] opacity-50 uppercase font-bold tracking-wider">Acordo de Mesa Angola</p>
              </div>
              <button 
                onClick={handleCancelConfirmation}
                className="w-8 h-8 bg-danger/10 hover:bg-danger/20 text-danger rounded-full flex items-center justify-center transition-colors"
                title="Sair do Desafio"
              >
                <X size={16} />
              </button>
            </header>

            {/* Terms and stakes card */}
            <div className="glass p-5 rounded-3xl border-primary/20 bg-primary/5 text-center mb-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-secondary" />
              <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">Mesa de Apostas de Ludo</p>
              <h2 className="text-2xl font-black text-white">
                {myMatch.mode === 'normal' ? 'Jogo Livre (Sem Dinheiro)' : `${myMatch.betAmount.toLocaleString()} Kz`}
              </h2>
              <div className="grid grid-cols-2 gap-4 mt-4 border-t border-white/5 pt-4">
                <div className="text-left">
                  <span className="text-[7px] opacity-40 font-black uppercase tracking-widest block">Anfitrião</span>
                  <span className="text-xs font-black text-white block truncate uppercase">{myMatch.hostUsername}</span>
                  <span className="text-[8px] font-bold opacity-60 block mt-0.5">{myMatch.hostProvince}</span>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full mt-1.5 inline-block ${
                    myMatch.hostConfirmed ? 'bg-success/10 text-success' : 'bg-white/10 text-white/50 animate-pulse'
                  }`}>
                    {myMatch.hostConfirmed ? 'Confirmou ✓' : 'Aguardando...'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[7px] opacity-40 font-black uppercase tracking-widest block">Convidado</span>
                  <span className="text-xs font-black text-white block truncate uppercase">{myMatch.guestUsername}</span>
                  <span className="text-[8px] font-bold opacity-60 block mt-0.5">{myMatch.guestProvince}</span>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full mt-1.5 inline-block ${
                    myMatch.guestConfirmed ? 'bg-success/10 text-success' : 'bg-white/10 text-white/50 animate-pulse'
                  }`}>
                    {myMatch.guestConfirmed ? 'Confirmou ✓' : 'Aguardando...'}
                  </span>
                </div>
              </div>
            </div>

            {/* Safe Private chat for host & guest to talk */}
            <div className="glass rounded-3xl border-adaptive p-4 flex flex-col h-64 bg-background/50">
              <p className="text-[8px] font-black uppercase text-secondary tracking-widest border-b border-adaptive pb-2 mb-3">🛡️ Chat Seguro de Mesa</p>
              
              <div className="flex-1 overflow-y-auto space-y-3.5 scrollbar-hide pr-1">
                {myMatch.chat ? (
                  Object.keys(myMatch.chat).map((key) => {
                    const msg = myMatch.chat![key];
                    return (
                      <div key={key} className={`flex flex-col ${msg.sender === user?.id ? 'items-end pl-8' : 'items-start pr-8'}`}>
                        <div className={`p-2.5 rounded-2xl text-[10px] font-semibold leading-relaxed ${
                          msg.sender === user?.id ? 'bg-primary text-background rounded-tr-none' : 'bg-white/10 text-white rounded-tl-none'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[8px] font-bold opacity-30 text-center py-10 uppercase tracking-widest">Saúda o teu oponente! Concordem com os termos.</p>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMatchMessage} className="mt-3 flex gap-2">
                <input
                  required
                  type="text"
                  placeholder="Escrever para o adversário..."
                  className="flex-1 h-10 glass rounded-xl px-3 text-[10px] font-bold outline-none focus:border-primary"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button type="submit" className="w-10 h-10 bg-primary text-background rounded-xl flex items-center justify-center">
                  <Send size={12} />
                </button>
              </form>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={handleConfirmMatchTerms}
              disabled={(user?.id === myMatch.hostUsername && myMatch.hostConfirmed) || (user?.id === myMatch.guestUsername && myMatch.guestConfirmed)}
              className="w-full h-16 bg-primary text-background rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-transform disabled:opacity-40"
            >
              <CheckCircle size={16} /> Confirmar Termos & Iniciar
            </button>
            <p className="text-[8px] font-bold opacity-45 uppercase text-center mt-3 tracking-wider leading-relaxed">
              Ao confirmar, aceita que o valor de aposta será retido. O vencedor receberá a totalidade da mesa deduzida de taxas administrativas de 0%.
            </p>
          </div>
        </div>
      )}

      {/* 3. ACTIVE LUDO GAME PLAY SCREEN */}
      {myMatch && myMatch.status === 'playing' && (
        <div className="px-2 sm:px-4 pt-4 pb-24 min-h-screen text-foreground relative flex flex-col items-center">
          
          {/* Header Controls */}
          <header className="flex justify-between items-center mb-4 pb-3 border-b border-adaptive w-full max-w-[min(94vw,560px)] mx-auto">
            <div>
              <p className="text-[8px] opacity-50 uppercase font-black tracking-widest">Partida de Ludo Ativa</p>
              <h2 className="text-xs font-black text-primary uppercase mt-0.5">
                {myMatch.mode === 'normal' ? 'Arena de Treino' : `Aposta de ${myMatch.betAmount.toLocaleString()} Kz`}
              </h2>
            </div>

            {/* Back Button Secured/Blocked to avoid fraud */}
            <div className="flex items-center gap-1.5 bg-danger/10 border border-danger/20 text-danger px-3 py-1.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider shrink-0" title="Voltar desativado durante a partida para evitar fraudes">
              <ShieldAlert size={12} className="text-danger" /> Voltar Bloqueado (Em Jogo)
            </div>

            {/* Turn countdown indicator */}
            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 animate-pulse shrink-0">
              <Timer className="text-primary animate-spin" size={10} />
              <span className="text-[9px] font-black text-primary">{timeLeft}s</span>
            </div>
          </header>

          {/* Active Opponents HUD showing names and real-time balances */}
          <section className="grid grid-cols-2 gap-3 mb-4 w-full max-w-[min(94vw,560px)] mx-auto">
            {/* Host (Player 1) */}
            <div className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
              myMatch.turn === 'host' ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(255,200,0,0.05)]' : 'border-white/5 bg-white/5'
            }`}>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-danger rounded-full ring-2 ring-danger/30 shrink-0" />
                <span className="text-[10px] font-black text-white truncate uppercase">{myMatch.hostUsername}</span>
                {myMatch.turn === 'host' && (
                  <span className="text-[7px] font-black text-primary uppercase bg-primary/20 px-1.5 py-0.5 rounded-full ml-auto animate-pulse">Sua Vez</span>
                )}
              </div>
              <div className="mt-2 border-t border-white/5 pt-1.5 flex justify-between items-center text-[10px]">
                <span className="opacity-55 font-bold uppercase text-[8px]">Saldo:</span>
                <span className="font-black text-white">
                  {myMatch.mode === 'normal' ? 'Treino Livre' : `${(hostData?.saldoProfissional || 0).toLocaleString()} Kz`}
                </span>
              </div>
            </div>

            {/* Guest (Player 2) */}
            <div className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
              myMatch.turn === 'guest' ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(255,200,0,0.05)]' : 'border-white/5 bg-white/5'
            }`}>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-secondary rounded-full ring-2 ring-secondary/30 shrink-0" />
                <span className="text-[10px] font-black text-white truncate uppercase">{myMatch.guestUsername || 'Convidado'}</span>
                {myMatch.turn === 'guest' && (
                  <span className="text-[7px] font-black text-primary uppercase bg-primary/20 px-1.5 py-0.5 rounded-full ml-auto animate-pulse">Sua Vez</span>
                )}
              </div>
              <div className="mt-2 border-t border-white/5 pt-1.5 flex justify-between items-center text-[10px]">
                <span className="opacity-55 font-bold uppercase text-[8px]">Saldo:</span>
                <span className="font-black text-white">
                  {myMatch.mode === 'normal' ? 'Treino Livre' : `${(guestData?.saldoProfissional || 0).toLocaleString()} Kz`}
                </span>
              </div>
            </div>
          </section>

          {/* THE 15x15 LUDO BOARD GRID - VERY LARGE AND RESPONSIVE */}
          <section className="w-full max-w-[min(94vw,560px)] mx-auto aspect-square glass rounded-3xl p-3 bg-background border-adaptive shadow-2xl relative mb-5">
            <div className="grid grid-cols-15 h-full w-full gap-[2px]">
              {Array.from({ length: 15 }).map((_, r) => (
                <div key={r} className="contents">
                  {Array.from({ length: 15 }).map((_, c) => {
                    const cellColorClass = getCellClassName(r, c);
                    const pieces = getPiecesAtCell(r, c);

                    // Highlight projected targets
                    let isProjectedHighlight = false;
                    if (projectedTarget !== null && selectedPieceIndex !== null && user) {
                      const isHost = myMatch.hostUsername === user.id;
                      const myRole = isHost ? 'host' : 'guest';
                      if (myMatch.turn === myRole) {
                        const cellCoord = isHost 
                          ? (projectedTarget <= 50 ? TRACK_COORDINATES[projectedTarget] : (projectedTarget === 56 ? HOST_GOAL_CELL : HOST_HOME_STRETCH[projectedTarget]))
                          : (projectedTarget <= 50 ? TRACK_COORDINATES[(26 + projectedTarget) % 52] : (projectedTarget === 56 ? GUEST_GOAL_CELL : GUEST_HOME_STRETCH[projectedTarget]));

                        if (cellCoord && cellCoord.r === r && cellCoord.c === c) {
                          isProjectedHighlight = true;
                        }
                      }
                    }

                    return (
                      <div
                        key={`${r}-${c}`}
                        className={`rounded-[3px] border-[0.5px] border-white/5 transition-all flex items-center justify-center relative overflow-hidden ${cellColorClass} ${
                          isProjectedHighlight ? 'ring-2 ring-primary bg-primary/40 animate-pulse' : ''
                        }`}
                      >
                        {/* Render pieces inside cell */}
                        {pieces.map((pc, idx) => (
                          <div
                            key={idx}
                            className={`w-3.5 h-3.5 rounded-full shadow-lg border border-white flex items-center justify-center font-black text-[6px] absolute transition-transform ${
                              pc.player === 'host' ? 'bg-danger text-white' : 'bg-secondary text-white'
                            }`}
                            style={{
                              transform: pieces.length > 1 ? `translate(${(idx - (pieces.length - 1) / 2) * 4}px)` : 'none'
                            }}
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

          {/* ACTIVE PLAY PIECES HUD & ACTIONS PANEL */}
          {user && (
            <section className="glass p-4 rounded-3xl border-adaptive bg-white/5 w-full max-w-[min(94vw,560px)] mx-auto">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-3 text-center">Painel de Comandos e Distribuição</p>
              
              {/* Roll section */}
              {!myMatch.dice ? (
                <div className="flex flex-col items-center py-3">
                  <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-3">É a tua vez! Rola os dados.</p>
                  <button
                    onClick={handleRollDice}
                    disabled={myMatch.turn !== (myMatch.hostUsername === user.id ? 'host' : 'guest')}
                    className="h-16 w-36 bg-primary text-background font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-40 animate-bounce"
                  >
                    <Dices size={22} /> Lançar Dados
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Dice output display */}
                  <div className="flex justify-center gap-3">
                    {Array.isArray(myMatch.dice) && myMatch.dice.map((val, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectDie(val, idx)}
                        disabled={!myMatch.diceUsed || myMatch.diceUsed[idx]}
                        className={`w-14 h-14 rounded-2xl font-black text-lg flex items-center justify-center shadow-lg border transition-all ${
                          (myMatch.diceUsed && myMatch.diceUsed[idx]) ? 'bg-white/5 border-white/5 text-white/20' :
                          selectedDieIndex === idx ? 'bg-primary border-primary text-background ring-2 ring-primary/40' :
                          'bg-white/10 border-white/20 text-white hover:border-primary'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>

                  {/* Playable Piece selection row */}
                  {selectedDieIndex !== null && (
                    <div className="space-y-3">
                      <p className="text-[9px] font-black uppercase text-center text-primary">Selecione uma peça para ver a projeção:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {(myMatch.pieces?.[myMatch.hostUsername === user.id ? 'host' : 'guest'] || []).map((pos, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectPiece(idx)}
                            className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-wider flex flex-col items-center gap-1 ${
                              selectedPieceIndex === idx ? 'bg-secondary text-white border-secondary' : 'border-white/15 bg-white/5'
                            }`}
                          >
                            <span>Peça {idx + 1}</span>
                            <span className="text-[7px] opacity-40 font-bold block">
                              {pos === -1 ? 'Base' : pos === 56 ? 'Meta' : `Tile ${pos}`}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confirm movement trigger */}
                  {projectedTarget !== null && (
                    <button
                      onClick={handleConfirmMove}
                      className="w-full h-12 bg-primary text-background rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-95 transition-transform"
                    >
                      Confirmar Jogada <Check size={14} />
                    </button>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* 4. FINISHED GAME SCREEN VIEW */}
      {myMatch && myMatch.status === 'finished' && (
        <div className="px-4 pt-16 pb-24 min-h-screen text-foreground flex flex-col justify-between items-center text-center">
          <div className="space-y-6">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center text-primary mx-auto shadow-xl">
              <Trophy size={48} className="animate-pulse" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black uppercase tracking-widest text-primary">Terminado!</h1>
              <p className="text-xs opacity-50 uppercase font-black tracking-widest">Resultados Finais</p>
            </div>

            <div className="glass p-6 rounded-3xl border-primary/15 bg-primary/5 max-w-sm mx-auto">
              {myMatch.winner === user?.id ? (
                <div>
                  <p className="text-md font-black text-success uppercase tracking-widest">🏆 Vitória!</p>
                  <p className="text-[10px] leading-relaxed font-semibold opacity-75 mt-2">
                    Parabéns, {user?.username}! Dominou a corrida de dados tradicional e garantiu o prémio da mesa.
                  </p>
                  {myMatch.mode === 'profissional' && (
                    <p className="text-xl font-black text-success mt-4">
                      +{(myMatch.betAmount * 2).toLocaleString()} Kz Creditados
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-md font-black text-danger uppercase tracking-widest">💥 Derrota</p>
                  <p className="text-[10px] leading-relaxed font-semibold opacity-75 mt-2">
                    Não foi desta vez! O oponente {myMatch.winner} conseguiu levar todas as peças à casa final primeiro.
                  </p>
                  {myMatch.mode === 'profissional' && (
                    <p className="text-md font-black text-danger mt-4">
                      -{(myMatch.betAmount).toLocaleString()} Kz Perdidos
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleExitFinishedGame}
            className="w-full max-w-xs h-16 bg-primary text-background rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-95 transition-transform"
          >
            Voltar ao Lobby principal
          </button>
        </div>
      )}
    </div>
  );
}
