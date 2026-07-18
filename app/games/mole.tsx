import { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { Stack } from "expo-router";
import { LCDScreen } from "@/components/LCDScreen";
import { THEME } from "@/constants/theme";

const { width } = Dimensions.get("window");
const W = width - 48;
const GRID = 3;
const MOLE_SIZE = (W - 32) / GRID;
const GAME_TIME = 30;

export default function MoleScreen() {
  const [moles, setMoles] = useState<boolean[]>(Array(GRID * GRID).fill(false));
  const [hit, setHit] = useState<boolean[]>(Array(GRID * GRID).fill(false));
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { setPlaying(false); setGameOver(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (!playing) return;
    const speed = Math.max(400, 900 - score * 10);
    const interval = setInterval(() => {
      setMoles(m => {
        const next = Array(GRID * GRID).fill(false);
        const count = Math.min(1 + Math.floor(score / 50), 3);
        const indices = [...Array(GRID * GRID).keys()].sort(() => Math.random() - 0.5).slice(0, count);
        indices.forEach(i => { next[i] = true; });
        return next;
      });
    }, speed);
    return () => clearInterval(interval);
  }, [playing, score]);

  function whack(i: number) {
    if (!playing || !moles[i] || hit[i]) return;
    setScore(s => s + 10);
    setHit(h => { const n = [...h]; n[i] = true; return n; });
    setMoles(m => { const n = [...m]; n[i] = false; return n; });
    setTimeout(() => {
      setHit(h => { const n = [...h]; n[i] = false; return n; });
    }, 200);
  }

  function start() {
    setMoles(Array(GRID * GRID).fill(false));
    setHit(Array(GRID * GRID).fill(false));
    setScore(0);
    setTimeLeft(GAME_TIME);
    setGameOver(false);
    setPlaying(true);
  }

  const timerColor = timeLeft <= 10 ? THEME.danger : timeLeft <= 20 ? THEME.shellAccent : THEME.pixelOn;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "WHACK-A-MOLE" }} />

      <View style={styles.header}>
        <Text style={styles.score}>SCORE: {score}</Text>
        <Text style={[styles.timer, { color: timerColor }]}>⏱ {timeLeft}s</Text>
      </View>

      <LCDScreen width={W} height={W + 20}>
        <View style={styles.grid}>
          {moles.map((active, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.hole, { width: MOLE_SIZE - 8, height: MOLE_SIZE - 8 }]}
              onPress={() => whack(i)}
              activeOpacity={0.7}
            >
              <View style={[styles.holeInner, hit[i] && styles.holeHit]}>
                {active ? (
                  <Text style={styles.mole}>🦔</Text>
                ) : (
                  <View style={styles.emptyHole} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {!playing && !gameOver && (
          <View style={styles.overlay}>
            <Text style={styles.title}>WHACK-A-MOLE</Text>
            <Text style={styles.subtitle}>Tap the moles before they hide!</Text>
            <TouchableOpacity style={styles.startBtn} onPress={start}>
              <Text style={styles.startText}>START</Text>
            </TouchableOpacity>
          </View>
        )}

        {gameOver && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>TIME UP!</Text>
            <Text style={styles.overlayScore}>Score: {score}</Text>
            {score >= 200 && <Text style={styles.rank}>🏆 MOLE MASTER</Text>}
            {score >= 100 && score < 200 && <Text style={styles.rank}>⭐ GOOD WHACKER</Text>}
            {score < 100 && <Text style={styles.rank}>🥉 KEEP TRYING</Text>}
            <TouchableOpacity style={styles.startBtn} onPress={start}>
              <Text style={styles.startText}>PLAY AGAIN</Text>
            </TouchableOpacity>
          </View>
        )}
      </LCDScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.shellBg, alignItems: "center", padding: 16, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", width: W },
  score: { color: THEME.shellAccent, fontWeight: "700", letterSpacing: 1, fontSize: 16 },
  timer: { fontWeight: "700", letterSpacing: 1, fontSize: 16 },
  grid: { flex: 1, flexDirection: "row", flexWrap: "wrap", padding: 8, gap: 8, alignContent: "center", justifyContent: "center" },
  hole: { alignItems: "center", justifyContent: "center" },
  holeInner: { width: "100%", height: "100%", backgroundColor: "#0f1f0f", borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#1a3a1a" },
  holeHit: { backgroundColor: THEME.shellAccent + "33", borderColor: THEME.shellAccent },
  mole: { fontSize: 44 },
  emptyHole: { width: 40, height: 16, backgroundColor: "#0a150a", borderRadius: 20 },
  overlay: { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.9)", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 4 },
  title: { color: THEME.shellAccent, fontSize: 22, fontWeight: "900", letterSpacing: 3 },
  subtitle: { color: THEME.shellMuted, fontSize: 13, textAlign: "center", paddingHorizontal: 24 },
  overlayText: { color: THEME.pixelOn, fontSize: 22, fontWeight: "900", letterSpacing: 4 },
  overlayScore: { color: THEME.shellText, fontSize: 18, fontWeight: "700" },
  rank: { color: THEME.shellAccent, fontSize: 15, fontWeight: "700" },
  startBtn: { backgroundColor: THEME.shellAccent, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  startText: { color: "#000", fontWeight: "700", letterSpacing: 2, fontSize: 14 },
});
