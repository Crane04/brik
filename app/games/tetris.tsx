import { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { RetroHandheld } from "@/components/RetroHandheld";
import { useGameLoop } from "@/hooks/useGameLoop";
import { useConsoleStore } from "@/store/useConsoleStore";

const COLS = 10;
const ROWS = 20;
const CELL = 17;

type Grid = (string | null)[][];
type Piece = { shape: number[][]; color: string; x: number; y: number };
const LCD_INK = "#253127";
const LCD_GHOST = "rgba(37,49,39,0.09)";

const PIECES = [
  { shape: [[1,1,1,1]], color: LCD_INK },
  { shape: [[1,1],[1,1]], color: LCD_INK },
  { shape: [[0,1,0],[1,1,1]], color: LCD_INK },
  { shape: [[1,0],[1,0],[1,1]], color: LCD_INK },
  { shape: [[0,1],[0,1],[1,1]], color: LCD_INK },
  { shape: [[0,1,1],[1,1,0]], color: LCD_INK },
  { shape: [[1,1,0],[0,1,1]], color: LCD_INK },
];

function emptyGrid(): Grid {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
}

function randomPiece(): Piece {
  const p = PIECES[Math.floor(Math.random() * PIECES.length)];
  return { ...p, x: Math.floor(COLS / 2) - 1, y: 0 };
}

function rotate(shape: number[][]): number[][] {
  return shape[0].map((_, i) => shape.map(row => row[i]).reverse());
}

function collides(grid: Grid, piece: Piece, dx = 0, dy = 0, shape = piece.shape): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = piece.x + c + dx;
      const ny = piece.y + r + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && grid[ny][nx]) return true;
    }
  }
  return false;
}

function place(grid: Grid, piece: Piece): Grid {
  const g = grid.map(r => [...r]);
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) {
        const ny = piece.y + r;
        if (ny >= 0) g[ny][piece.x + c] = piece.color;
      }
    }
  }
  return g;
}

function clearLines(grid: Grid): { grid: Grid; cleared: number } {
  const newGrid = grid.filter(row => row.some(c => !c));
  const cleared = ROWS - newGrid.length;
  const empty = Array(cleared).fill(null).map(() => Array(COLS).fill(null));
  return { grid: [...empty, ...newGrid], cleared };
}

export default function TetrisScreen({ onExit }: { onExit?: () => void } = {}) {
  const router = useRouter();
  const highScore = useConsoleStore((state) => state.highScores.tetris);
  const recordScore = useConsoleStore((state) => state.recordScore);
  const [grid, setGrid] = useState<Grid>(emptyGrid());
  const [piece, setPiece] = useState<Piece>(randomPiece());
  const [next, setNext] = useState<Piece>(randomPiece());
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const level = Math.min(Math.floor(lines / 10), 9);
  const speed = [800, 700, 600, 500, 400, 300, 200, 150, 100, 80][level];

  const tick = useCallback(() => {
    if (!collides(grid, piece, 0, 1)) {
      setPiece((current) => ({ ...current, y: current.y + 1 }));
      return;
    }

    const locked = place(grid, piece);
    const { grid: cleared, cleared: count } = clearLines(locked);
    if (count > 0) {
      setScore((value) => value + [0, 100, 300, 500, 800][count] * (level + 1));
      setLines((value) => value + count);
    }
    if (collides(cleared, next)) {
      setGrid(cleared);
      setGameOver(true);
      return;
    }
    setGrid(cleared);
    setPiece(next);
    setNext(randomPiece());
  }, [grid, level, next, piece]);

  useGameLoop(tick, !paused && !gameOver, speed);
  useEffect(() => recordScore("tetris", score), [recordScore, score]);

  function moveLeft() { if (!collides(grid, piece, -1, 0)) setPiece(p => ({ ...p, x: p.x - 1 })); }
  function moveRight() { if (!collides(grid, piece, 1, 0)) setPiece(p => ({ ...p, x: p.x + 1 })); }
  function moveDown() { tick(); }
  function rotateP() {
    const r = rotate(piece.shape);
    if (!collides(grid, piece, 0, 0, r)) setPiece(p => ({ ...p, shape: r }));
  }
  function hardDrop() {
    let dy = 0;
    while (!collides(grid, piece, 0, dy + 1)) dy++;
    const dropped = { ...piece, y: piece.y + dy };
    const locked = place(grid, dropped);
    const { grid: cleared, cleared: count } = clearLines(locked);
    if (count > 0) {
      setScore((value) => value + [0, 100, 300, 500, 800][count] * (level + 1));
      setLines((value) => value + count);
    }
    if (collides(cleared, next)) {
      setGrid(cleared);
      setGameOver(true);
      return;
    }
    setGrid(cleared);
    setPiece(next);
    setNext(randomPiece());
  }

  function restart() {
    setGrid(emptyGrid());
    setPiece(randomPiece());
    setNext(randomPiece());
    setScore(0);
    setLines(0);
    setGameOver(false);
    setPaused(false);
  }

  const displayGrid = place(grid, piece);

  return (
    <RetroHandheld
      title="TETRIS" score={score} highScore={highScore} level={level + 1} speed={level + 1}
      onBack={() => onExit ? onExit() : router.back()}
      onStartPause={() => gameOver ? restart() : setPaused((value) => !value)}
      onLeft={moveLeft} onRight={moveRight} onDown={moveDown} onUp={rotateP}
      onAction={moveDown} actionLabel="ACTION" repeatAction
    >
      <View style={styles.field}>
        {displayGrid.map((row, r) =>
          row.map((cell, c) => (
            <View
              key={`${r}-${c}`}
              style={[
                styles.cell,
                {
                  left: c * CELL,
                  top: r * CELL,
                  width: CELL - 1,
                  height: CELL - 1,
                  backgroundColor: cell ?? LCD_GHOST,
                  opacity: 1,
                },
              ]}
            />
          ))
        )}
        {gameOver && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>GAME OVER</Text>
            <TouchableOpacity style={styles.restartBtn} onPress={restart}>
              <Text style={styles.restartText}>PLAY AGAIN</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </RetroHandheld>
  );
}

const styles = StyleSheet.create({
  field: { width: COLS * CELL, height: ROWS * CELL, position: "relative", borderWidth: 2, borderColor: "rgba(37,49,39,0.45)", overflow: "hidden" },
  cell: { position: "absolute", borderRadius: 1, borderWidth: 0.5, borderColor: "rgba(37,49,39,0.18)" },
  overlay: { position: "absolute", inset: 0, backgroundColor: "rgba(188,200,171,0.86)", alignItems: "center", justifyContent: "center", gap: 16 },
  overlayText: { color: "#253127", fontSize: 20, fontFamily: "monospace", fontWeight: "900", letterSpacing: 2 },
  restartBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#253127" },
  restartText: { color: "#253127", fontFamily: "monospace", fontWeight: "700", letterSpacing: 1, fontSize: 10 },
});
