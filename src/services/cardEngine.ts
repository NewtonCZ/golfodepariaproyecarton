import { MatrixCard, WinningPatternResult, CommercialConfig } from '../types';

/**
 * Generates 16 UNIQUE random ficha IDs between 1 and 70 for a 4x4 matrix
 */
export function generateRandomMatrix(): number[] {
  const pool = Array.from({ length: 70 }, (_, i) => i + 1);
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 16);
}

/**
 * Creates a unique card code (e.g., LF-7492)
 */
export function generateCardCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `LF-${num}`;
}

/**
 * Evaluates a single 4x4 matrix card against an array of drawn Ficha IDs.
 */
export function evaluateCardMatrix(
  matrix: number[],
  drawnFichas: number[],
  cardPriceVes: number,
  config: CommercialConfig,
  isRoundFinished: boolean = false
): {
  matchedIndices: number[];
  matchedCount: number;
  aciertos: number;
  winningPatterns: WinningPatternResult[];
  totalPrizeVes: number;
  status: 'active' | 'winner' | 'loss';
  isWinner: boolean;
  is_winner: boolean;
} {
  const drawnSet = new Set(drawnFichas);
  const matchedIndices: number[] = [];

  // Safe effective card price fallback
  const effectivePrice =
    typeof cardPriceVes === 'number' && cardPriceVes > 0
      ? cardPriceVes
      : config.singleCardPriceVes || config.precio_carton_base_ves || 25;

  // Check which indices in the 4x4 matrix are matched
  for (let i = 0; i < 16; i++) {
    if (drawnSet.has(matrix[i])) {
      matchedIndices.push(i);
    }
  }

  const matchedSet = new Set(matchedIndices);
  const winningPatterns: WinningPatternResult[] = [];

  // Helper to check if all indices in a pattern are matched
  const checkPattern = (indices: number[]): boolean => {
    return indices.every((idx) => matchedSet.has(idx));
  };

  // 1. Check Tabla Llena (Premio Mayor: All 16 matched)
  if (matchedIndices.length === 16) {
    const mult = config.prizeMultipliers?.fullCard || 50;
    winningPatterns.push({
      type: 'full_card',
      label: '¡Tabla Llena (Premio Mayor)!',
      multiplier: mult,
      prizeVes: effectivePrice * mult,
      matchedIndices: Array.from({ length: 16 }, (_, i) => i),
    });
  }

  // 2. Check Cuatro Esquinas (Indices: 0, 3, 12, 15)
  const fourCornersIndices = [0, 3, 12, 15];
  if (checkPattern(fourCornersIndices)) {
    const mult = config.prizeMultipliers?.fourCorners || 8;
    winningPatterns.push({
      type: 'four_corners',
      label: '¡Cuatro Esquinas!',
      multiplier: mult,
      prizeVes: effectivePrice * mult,
      matchedIndices: fourCornersIndices,
    });
  }

  // 3. Check Cuadro Central (2x2 Box: Indices 5, 6, 9, 10)
  const centerBoxIndices = [5, 6, 9, 10];
  if (checkPattern(centerBoxIndices)) {
    const mult = config.prizeMultipliers?.box || (config.prizeMultipliers as any)?.cuadro || (config.prizeMultipliers as any)?.centerBox || 6;
    winningPatterns.push({
      type: 'box',
      label: '¡Cuadro Central (2x2)!',
      multiplier: mult,
      prizeVes: effectivePrice * mult,
      matchedIndices: centerBoxIndices,
    });
  }

  // 4. Check Líneas Horizontales (Rows 1 to 4)
  const rowPatterns = [
    { row: 1, indices: [0, 1, 2, 3] },
    { row: 2, indices: [4, 5, 6, 7] },
    { row: 3, indices: [8, 9, 10, 11] },
    { row: 4, indices: [12, 13, 14, 15] },
  ];

  rowPatterns.forEach(({ row, indices }) => {
    if (checkPattern(indices)) {
      const mult = config.prizeMultipliers?.lineHorizontal || 3;
      winningPatterns.push({
        type: 'line_horizontal',
        label: `Línea Horizontal (Fila ${row})`,
        multiplier: mult,
        prizeVes: effectivePrice * mult,
        matchedIndices: indices,
      });
    }
  });

  // 5. Check Líneas Verticales (Cols 1 to 4)
  const colPatterns = [
    { col: 1, indices: [0, 4, 8, 12] },
    { col: 2, indices: [1, 5, 9, 13] },
    { col: 3, indices: [2, 6, 10, 14] },
    { col: 4, indices: [3, 7, 11, 15] },
  ];

  colPatterns.forEach(({ col, indices }) => {
    if (checkPattern(indices)) {
      const mult = config.prizeMultipliers?.lineVertical || 3;
      winningPatterns.push({
        type: 'line_vertical',
        label: `Línea Vertical (Columna ${col})`,
        multiplier: mult,
        prizeVes: effectivePrice * mult,
        matchedIndices: indices,
      });
    }
  });

  // 6. Check Líneas Diagonales (Principal ↘ y Secundaria ↙)
  const diagPrincipal = [0, 5, 10, 15];
  if (checkPattern(diagPrincipal)) {
    const mult = config.prizeMultipliers?.lineDiagonal || 4;
    winningPatterns.push({
      type: 'line_diagonal',
      label: 'Diagonal Principal (↘)',
      multiplier: mult,
      prizeVes: effectivePrice * mult,
      matchedIndices: diagPrincipal,
    });
  }

  const diagSecundaria = [3, 6, 9, 12];
  if (checkPattern(diagSecundaria)) {
    const mult = config.prizeMultipliers?.lineDiagonal || 4;
    winningPatterns.push({
      type: 'line_diagonal',
      label: 'Diagonal Inversa (↙)',
      multiplier: mult,
      prizeVes: effectivePrice * mult,
      matchedIndices: diagSecundaria,
    });
  }

  // Calculate total prize
  const totalPrizeVes = winningPatterns.reduce((sum, p) => sum + p.prizeVes, 0);
  const isWinner = winningPatterns.length > 0;
  const status: 'active' | 'winner' | 'loss' = isWinner
    ? 'winner'
    : isRoundFinished || drawnFichas.length >= 20
    ? 'loss'
    : 'active';

  return {
    matchedIndices,
    matchedCount: matchedIndices.length,
    aciertos: matchedIndices.length,
    winningPatterns,
    totalPrizeVes,
    status,
    isWinner,
    is_winner: isWinner,
  };
}

/**
 * Evaluates an entire collection of cards against drawn figures
 */
export function evaluateAllCards(
  cards: MatrixCard[],
  drawnFichas: number[],
  config: CommercialConfig,
  isRoundFinished: boolean = false
): {
  updatedCards: MatrixCard[];
  totalWinnersCount: number;
  totalPrizesPaidVes: number;
} {
  let totalWinnersCount = 0;
  let totalPrizesPaidVes = 0;

  const updatedCards = cards.map((card) => {
    const evaluation = evaluateCardMatrix(card.matrix, drawnFichas, card.priceVes, config, isRoundFinished);

    if (evaluation.isWinner) {
      totalWinnersCount++;
      totalPrizesPaidVes += evaluation.totalPrizeVes;
    }

    return {
      ...card,
      matchedCount: evaluation.matchedCount,
      aciertos: evaluation.aciertos,
      winningPatterns: evaluation.winningPatterns,
      totalPrizeVes: evaluation.totalPrizeVes,
      status: evaluation.status,
      isWinner: evaluation.isWinner,
      is_winner: evaluation.isWinner,
      isPlayed: isRoundFinished || card.isPlayed,
      roundStatus: isRoundFinished ? ('finished' as const) : card.roundStatus,
    };
  });

  return {
    updatedCards,
    totalWinnersCount,
    totalPrizesPaidVes,
  };
}
