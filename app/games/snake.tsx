import { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { RetroHandheld } from "@/components/RetroHandheld";
import { useGameLoop } from "@/hooks/useGameLoop";
import { useConsoleStore } from "@/store/useConsoleStore";

const COLS = 16;
const ROWS = 24;
const CELL = 14;
const LCD_INK = "#253127";
const LCD_GHOST = "rgba(37,49,39,0.08)";

type Point = { x: number; y: number };
type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";

function rand(max: number) { return Math.floor(Math.random() * max); }
function randomFood(snake: Point[]): Point {
  let p: Point;
  do { p = { x: rand(COLS), y: rand(ROWS) }; }
  while (snake.some(s => s.x === p.x && s.y === p.y));
  return p;
}

const INIT_SNAKE = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];

export default function SnakeScreen({ onExit }: { onExit?: () => void } = {}) {
  const router = useRouter();
  const highScore = useConsoleStore((state) => state.highScores.snake);
  const recordScore = useConsoleStore((state) => state.recordScore);
  const [snake, setSnake] = useState<Point[]>(INIT_SNAKE);
  const [food, setFood] = useState<Point>({ x: 12, y: 8 });
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const dirRef = useRef<Dir>("RIGHT");

  function setDirection(d: Dir) {
    const opposites: Record<Dir, Dir> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
    if (opposites[d] !== dirRef.current) {
      dirRef.current = d;
    }
  }

  const tick = useCallback(() => {
    setSnake(s => {
      const head = s[0];
      const d = dirRef.current;
      const next: Point = {
        x: d === "LEFT" ? head.x - 1 : d === "RIGHT" ? head.x + 1 : head.x,
        y: d === "UP" ? head.y - 1 : d === "DOWN" ? head.y + 1 : head.y,
      };

      if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS || s.some(p => p.x === next.x && p.y === next.y)) {
        setGameOver(true);
        return s;
      }

      let newSnake: Point[] = [next, ...s.slice(0, -1)];
      setFood(f => {
        if (next.x === f.x && next.y === f.y) {
          newSnake = [next, ...s];
          setScore(sc => sc + 10);
          return randomFood([next, ...s]);
        }
        return f;
      });

      return newSnake;
    });
  }, []);

  useGameLoop(tick, !paused && !gameOver, 150);
  useEffect(() => recordScore("snake", score), [recordScore, score]);

  function restart() {
    setSnake(INIT_SNAKE);
    setFood({ x: 12, y: 8 });
    dirRef.current = "RIGHT";
    setScore(0);
    setGameOver(false);
    setPaused(false);
  }

  const snakeSet = new Set(snake.map(p => `${p.x},${p.y}`));

  return (
    <RetroHandheld
      title="SNAKE" score={score} highScore={highScore} level={1 + Math.floor(score / 100)} speed={1 + Math.floor(score / 50)}
      onBack={() => onExit ? onExit() : router.back()}
      onStartPause={() => gameOver ? restart() : setPaused((value) => !value)}
      onUp={() => setDirection("UP")} onDown={() => setDirection("DOWN")}
      onLeft={() => setDirection("LEFT")} onRight={() => setDirection("RIGHT")}
      onAction={() => setPaused((value) => !value)} actionLabel="PAUSE"
    >
      <View style={styles.field}>
        {Array(ROWS).fill(null).map((_, r) =>
          Array(COLS).fill(null).map((_, c) => {
            const key = `${c},${r}`;
            const isSnake = snakeSet.has(key);
            const isHead = snake[0].x === c && snake[0].y === r;
            const isFood = food.x === c && food.y === r;
            return (
              <View
                key={key}
                style={[
                  styles.cell,
                  {
                    left: c * CELL,
                    top: r * CELL,
                    width: CELL - 1,
                    height: CELL - 1,
                    backgroundColor: isHead || isSnake ? LCD_INK : isFood ? "transparent" : LCD_GHOST,
                    opacity: isHead ? 1 : isSnake ? 0.76 : 1,
                    borderRadius: isHead ? 2 : 0,
                    borderWidth: isFood ? 2 : 0.5,
                    borderColor: isFood ? LCD_INK : "rgba(37,49,39,0.13)",
                  },
                ]}
              />
            );
          })
        )}
        {gameOver && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>GAME OVER</Text>
            <Text style={styles.overlayScore}>Score: {score}</Text>
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
  cell: { position: "absolute" },
  overlay: { position: "absolute", inset: 0, backgroundColor: "rgba(188,200,171,0.86)", alignItems: "center", justifyContent: "center", gap: 12 },
  overlayText: { color: "#253127", fontFamily: "monospace", fontSize: 20, fontWeight: "900", letterSpacing: 2 },
  overlayScore: { color: "#253127", fontFamily: "monospace", fontSize: 14 },
  restartBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#253127", marginTop: 4 },
  restartText: { color: "#253127", fontFamily: "monospace", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
});
