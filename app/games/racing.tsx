import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useGameLoop } from "@/hooks/useGameLoop";
import { RetroHandheld } from "@/components/RetroHandheld";
import { useConsoleStore } from "@/store/useConsoleStore";

const LANES = 4;
const ROAD_H = 360;
const CAR_W = 30;
const CAR_H = 48;

type Enemy = { lane: number; y: number; speed: number; id: number };

export default function RacingScreen({ onExit }: { onExit?: () => void } = {}) {
  const router = useRouter();
  const highScore = useConsoleStore((state) => state.highScores.racing);
  const recordScore = useConsoleStore((state) => state.recordScore);
  const { width } = useWindowDimensions();
  const roadWidth = Math.min(280, width - 120);
  const laneWidth = roadWidth / LANES;
  const [lane, setLane] = useState(1);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [score, setScore] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const frame = useRef(0);
  const nextId = useRef(0);

  const start = useCallback(() => {
    setLane(1);
    setEnemies([]);
    setScore(0);
    setGameOver(false);
    setPaused(false);
    setPlaying(true);
    frame.current = 0;
  }, []);

  const move = useCallback((amount: number) => {
    if (!playing || paused) return;
    setLane((value) => Math.max(0, Math.min(LANES - 1, value + amount)));
  }, [paused, playing]);

  const tick = useCallback(() => {
    frame.current += 1;
    if (frame.current % Math.max(30, 70 - Math.floor(score / 80)) === 0) {
      setEnemies((value) => [...value, {
        lane: Math.floor(Math.random() * LANES),
        y: -CAR_H,
        speed: 3 + Math.min(4, score / 300),
        id: nextId.current++,
      }]);
    }
    setEnemies((current) => {
      let crashed = false;
      const next = current
        .map((enemy) => ({ ...enemy, y: enemy.y + enemy.speed }))
        .filter((enemy) => {
          if (enemy.y > ROAD_H) {
            setScore((value) => value + 10);
            return false;
          }
          if (enemy.lane === lane && enemy.y + CAR_H > ROAD_H - 70 && enemy.y < ROAD_H - 20) {
            crashed = true;
          }
          return true;
        });
      if (crashed) {
        setGameOver(true);
        setPlaying(false);
      }
      return next;
    });
  }, [lane, score]);

  useGameLoop(tick, playing && !paused && !gameOver, 16);
  useEffect(() => recordScore("racing", score), [recordScore, score]);

  return (
    <RetroHandheld
      title="RACE"
      score={score}
      highScore={highScore}
      level={1 + Math.floor(score / 200)}
      speed={1 + Math.floor(score / 100)}
      onBack={() => onExit ? onExit() : router.back()}
      onStartPause={() => playing ? setPaused((value) => !value) : start()}
      onLeft={() => move(-1)}
      onRight={() => move(1)}
      actionLabel="SHIFT"
      onAction={() => playing ? setPaused((value) => !value) : start()}
    >
          <View style={[styles.road, { width: roadWidth }]}>
            {Array.from({ length: LANES - 1 }, (_, index) => (
              <View key={index} style={[styles.laneLine, { left: laneWidth * (index + 1) }]} />
            ))}
            {Array.from({ length: 7 }, (_, index) => (
              <View key={`dash-${index}`} style={[styles.dash, { top: index * 72 + (frame.current % 72) }]} />
            ))}
            {enemies.map((enemy) => (
              <Car key={enemy.id} left={enemy.lane * laneWidth + (laneWidth - CAR_W) / 2} top={enemy.y} enemy />
            ))}
            <Car left={lane * laneWidth + (laneWidth - CAR_W) / 2} top={ROAD_H - 67} />
            {!playing && (
              <View style={styles.overlay}>
                <Text style={styles.overlayTitle}>{gameOver ? "GAME OVER" : "RACE"}</Text>
                <Text style={styles.overlaySub}>{gameOver ? score.toString().padStart(5, "0") : "PRESS START"}</Text>
              </View>
            )}
            {paused && <View style={styles.overlay}><Text style={styles.overlayTitle}>PAUSE</Text></View>}
          </View>
    </RetroHandheld>
  );
}

function Car({ left, top, enemy }: { left: number; top: number; enemy?: boolean }) {
  return (
    <View style={[styles.car, { left, top }, enemy && styles.enemyCar]}>
      <View style={styles.windshield} />
      <View style={styles.carStripe} />
    </View>
  );
}

const INK = "#253127";
const LCD = "#bcc8ab";

const styles = StyleSheet.create({
  road: { height: ROAD_H, alignSelf: "center", backgroundColor: LCD, borderWidth: 2, borderColor: "#53604f", overflow: "hidden", position: "relative" },
  laneLine: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(37,49,39,0.15)" },
  dash: { position: "absolute", left: "50%", width: 3, height: 28, backgroundColor: "rgba(37,49,39,0.4)" },
  car: { position: "absolute", width: CAR_W, height: CAR_H, backgroundColor: INK, borderRadius: 3, borderWidth: 2, borderColor: INK },
  enemyCar: { backgroundColor: "transparent" }, windshield: { position: "absolute", left: 5, right: 5, top: 8, height: 10, backgroundColor: LCD }, carStripe: { position: "absolute", left: 13, top: 0, bottom: 0, width: 4, backgroundColor: LCD, opacity: 0.35 },
  overlay: { position: "absolute", inset: 0, backgroundColor: "rgba(188,200,171,0.86)", alignItems: "center", justifyContent: "center", gap: 10 }, overlayTitle: { color: INK, fontFamily: "monospace", fontWeight: "900", fontSize: 20, letterSpacing: 2 }, overlaySub: { color: INK, fontFamily: "monospace", fontWeight: "700", fontSize: 10 },
});
