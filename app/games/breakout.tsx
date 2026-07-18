import { useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, PanResponder } from "react-native";
import { Stack } from "expo-router";
import { LCDScreen } from "@/components/LCDScreen";
import { GameControls, ActionButton } from "@/components/GameButton";
import { useGameLoop } from "@/hooks/useGameLoop";
import { THEME } from "@/constants/theme";

const { width } = Dimensions.get("window");
const W = width - 48;
const H = 380;
const PADDLE_W = 64;
const PADDLE_H = 10;
const BALL_R = 7;
const BRICK_COLS = 8;
const BRICK_ROWS = 5;
const BRICK_W = (W - 16) / BRICK_COLS - 4;
const BRICK_H = 16;
const BRICK_COLORS = ["#f06060", "#f0a030", THEME.shellAccent, "#60c060", "#60a0f0"];

function initBricks() {
  return Array(BRICK_ROWS).fill(null).map((_, r) =>
    Array(BRICK_COLS).fill(null).map((_, c) => ({
      x: 8 + c * (BRICK_W + 4),
      y: 30 + r * (BRICK_H + 6),
      alive: true,
      color: BRICK_COLORS[r],
    }))
  );
}

export default function BreakoutScreen() {
  const [paddle, setPaddle] = useState(W / 2 - PADDLE_W / 2);
  const [ball, setBall] = useState({ x: W / 2, y: H - 80 });
  const [vel, setVel] = useState({ x: 3, y: -4 });
  const [bricks, setBricks] = useState(initBricks());
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [launched, setLaunched] = useState(false);

  const paddleRef = useRef(paddle);
  paddleRef.current = paddle;
  const ballRef = useRef(ball);
  ballRef.current = ball;
  const velRef = useRef(vel);
  velRef.current = vel;

  const tick = useCallback(() => {
    if (!launched) return;

    setBall(b => {
      const vx = velRef.current.x;
      const vy = velRef.current.y;
      let nx = b.x + vx;
      let ny = b.y + vy;
      let nvx = vx;
      let nvy = vy;

      if (nx < BALL_R || nx > W - BALL_R) nvx = -nvx;
      if (ny < BALL_R) nvy = -nvy;

      const px = paddleRef.current;
      if (ny > H - 50 - BALL_R && ny < H - 50 + PADDLE_H && nx > px && nx < px + PADDLE_W) {
        nvy = -Math.abs(nvy);
        const hit = (nx - px) / PADDLE_W - 0.5;
        nvx = hit * 7;
      }

      if (ny > H) {
        setLives(l => {
          if (l <= 1) { setGameOver(true); return 0; }
          return l - 1;
        });
        setLaunched(false);
        velRef.current = { x: 3, y: -4 };
        setVel({ x: 3, y: -4 });
        return { x: W / 2, y: H - 80 };
      }

      setBricks(bs => {
        const newBs = bs.map(row => row.map(brick => {
          if (!brick.alive) return brick;
          if (nx > brick.x && nx < brick.x + BRICK_W && ny > brick.y && ny < brick.y + BRICK_H) {
            nvy = -nvy;
            setScore(s => s + 10);
            return { ...brick, alive: false };
          }
          return brick;
        }));
        if (newBs.every(row => row.every(b => !b.alive))) setWon(true);
        return newBs;
      });

      velRef.current = { x: nvx, y: nvy };
      setVel({ x: nvx, y: nvy });
      return { x: nx, y: ny };
    });
  }, [launched]);

  useGameLoop(tick, !paused && !gameOver && !won, 16);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gs) => {
      setPaddle(p => Math.max(0, Math.min(W - PADDLE_W, p + gs.dx)));
    },
    onPanResponderRelease: () => {
      if (!launched) setLaunched(true);
    },
  });

  function moveLeft() { setPaddle(p => Math.max(0, p - 20)); }
  function moveRight() { setPaddle(p => Math.min(W - PADDLE_W, p + 20)); }

  function restart() {
    setPaddle(W / 2 - PADDLE_W / 2);
    setBall({ x: W / 2, y: H - 80 });
    setVel({ x: 3, y: -4 });
    velRef.current = { x: 3, y: -4 };
    setBricks(initBricks());
    setScore(0);
    setLives(3);
    setGameOver(false);
    setWon(false);
    setLaunched(false);
    setPaused(false);
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "BREAKOUT" }} />

      <View style={styles.header}>
        <Text style={styles.score}>SCORE: {score}</Text>
        <Text style={styles.lives}>{"● ".repeat(lives)}</Text>
      </View>

      <View {...panResponder.panHandlers}>
        <LCDScreen width={W} height={H}>
          {bricks.map((row, r) =>
            row.map((brick, c) =>
              brick.alive ? (
                <View
                  key={`${r}-${c}`}
                  style={[styles.brick, { left: brick.x, top: brick.y, width: BRICK_W, height: BRICK_H, backgroundColor: brick.color }]}
                />
              ) : null
            )
          )}
          <View style={[styles.ball, { left: ball.x - BALL_R, top: ball.y - BALL_R }]} />
          <View style={[styles.paddle, { left: paddle, top: H - 50, width: PADDLE_W }]} />
          {!launched && (
            <Text style={styles.hint}>TAP TO LAUNCH</Text>
          )}
          {(gameOver || won) && (
            <View style={styles.overlay}>
              <Text style={styles.overlayText}>{won ? "YOU WIN!" : "GAME OVER"}</Text>
              <Text style={styles.overlayScore}>Score: {score}</Text>
              <TouchableOpacity style={styles.restartBtn} onPress={restart}>
                <Text style={styles.restartText}>PLAY AGAIN</Text>
              </TouchableOpacity>
            </View>
          )}
        </LCDScreen>
      </View>

      <GameControls onPause={() => setPaused(p => !p)} onRestart={restart} paused={paused} />
      <View style={styles.controls}>
        <ActionButton label="◀" onPress={moveLeft} size={56} />
        {!launched && <ActionButton label="LAUNCH" onPress={() => setLaunched(true)} color={THEME.pixelOn} size={72} />}
        <ActionButton label="▶" onPress={moveRight} size={56} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.shellBg, alignItems: "center", padding: 16, gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", width: W },
  score: { color: THEME.shellAccent, fontWeight: "700", letterSpacing: 1 },
  lives: { color: THEME.pixelOn, letterSpacing: 2 },
  brick: { position: "absolute", borderRadius: 3, opacity: 0.9 },
  ball: { position: "absolute", width: BALL_R * 2, height: BALL_R * 2, borderRadius: BALL_R, backgroundColor: THEME.pixelOn },
  paddle: { position: "absolute", height: PADDLE_H, backgroundColor: THEME.shellAccent, borderRadius: 5 },
  hint: { position: "absolute", bottom: 70, width: "100%", textAlign: "center", color: THEME.pixelOn, fontSize: 12, letterSpacing: 2, opacity: 0.7 },
  controls: { flexDirection: "row", gap: 24, alignItems: "center" },
  overlay: { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", gap: 12 },
  overlayText: { color: "#253127", fontFamily: "monospace", fontSize: 20, fontWeight: "900", letterSpacing: 2 },
  overlayScore: { color: "#253127", fontFamily: "monospace", fontSize: 10 },
  restartBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#253127", marginTop: 4 },
  restartText: { color: "#253127", fontFamily: "monospace", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
});
