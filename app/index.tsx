import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useGameLoop } from "@/hooks/useGameLoop";
import InvadersScreen from "@/app/games/invaders";
import RacingScreen from "@/app/games/racing";
import SnakeScreen from "@/app/games/snake";
import TetrisScreen from "@/app/games/tetris";
import { GameName, useConsoleStore } from "@/store/useConsoleStore";

const FIELD_W = 196;
const FIELD_H = 350;
const PADDLE_W = 44;
const PADDLE_Y = FIELD_H - 24;
const BALL = 7;
const COLS = 7;
const ROWS = 8;
const GAP = 3;
const BRICK_W = (FIELD_W - 16 - GAP * (COLS - 1)) / COLS;
const BRICK_H = 10;

type Brick = { x: number; y: number; alive: boolean };
const GAMES: { id: GameName; label: string }[] = [
  { id: "fighter", label: "FIGHT" },
  { id: "tetris", label: "TETRIS" },
  { id: "brick", label: "BRICK" },
  { id: "snake", label: "SNAKE" },
  { id: "racing", label: "RACE" },
];

function makeBricks(): Brick[] {
  return Array.from({ length: ROWS * COLS }, (_, index) => ({
    x: 8 + (index % COLS) * (BRICK_W + GAP),
    y: 30 + Math.floor(index / COLS) * (BRICK_H + GAP),
    alive: true,
  }));
}

function padScore(value: number) {
  return Math.min(value, 99999).toString().padStart(5, "0");
}

export default function BrickGame() {
  const { width, height } = useWindowDimensions();
  const compact = height < 760;
  const deviceWidth = Math.min(width, 430);
  const gameScale = Math.min(1, (deviceWidth - 145) / FIELD_W);

  const powered = useConsoleStore((state) => state.powered);
  const soundOn = useConsoleStore((state) => state.soundOn);
  const musicOn = useConsoleStore((state) => state.musicOn);
  const selectedGame = useConsoleStore((state) => state.selectedGame);
  const activeGame = useConsoleStore((state) => state.activeGame);
  const highScore = useConsoleStore((state) => state.highScores.brick);
  const selectGameInStore = useConsoleStore((state) => state.selectGame);
  const openGame = useConsoleStore((state) => state.openGame);
  const closeGame = useConsoleStore((state) => state.closeGame);
  const togglePower = useConsoleStore((state) => state.togglePower);
  const toggleSound = useConsoleStore((state) => state.toggleSound);
  const toggleMusic = useConsoleStore((state) => state.toggleMusic);
  const recordScore = useConsoleStore((state) => state.recordScore);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paddle, setPaddle] = useState(FIELD_W / 2 - PADDLE_W / 2);
  const [ball, setBall] = useState({ x: FIELD_W / 2, y: PADDLE_Y - 12 });
  const [velocity, setVelocity] = useState({ x: 2.1, y: -2.8 });
  const [bricks, setBricks] = useState(makeBricks);

  const paddleRef = useRef(paddle);
  const velocityRef = useRef(velocity);
  paddleRef.current = paddle;
  velocityRef.current = velocity;

  const resetBall = useCallback(() => {
    setPlaying(false);
    setBall({ x: FIELD_W / 2, y: PADDLE_Y - 12 });
    const nextVelocity = { x: 2.1, y: -2.8 };
    velocityRef.current = nextVelocity;
    setVelocity(nextVelocity);
  }, []);

  const startNewGame = useCallback(() => {
    setScore(0);
    setLives(3);
    setLevel(1);
    setBricks(makeBricks());
    setPaddle(FIELD_W / 2 - PADDLE_W / 2);
    setBall({ x: FIELD_W / 2, y: PADDLE_Y - 12 });
    const nextVelocity = { x: 2.1, y: -2.8 };
    velocityRef.current = nextVelocity;
    setVelocity(nextVelocity);
    setGameOver(false);
    setPaused(false);
    setPlaying(true);
  }, []);

  const launchOrPause = useCallback(() => {
    if (!powered) return;
    if (!playing && !gameOver && selectedGame !== "brick") {
      openGame(selectedGame);
      return;
    }
    if (gameOver) {
      startNewGame();
      return;
    }
    if (!playing) {
      setPlaying(true);
      setPaused(false);
      return;
    }
    setPaused((value) => !value);
  }, [gameOver, openGame, playing, powered, selectedGame, startNewGame]);

  const selectGame = useCallback(
    (direction: number) => {
      if (!powered || playing) return;
      const index = GAMES.findIndex((game) => game.id === selectedGame);
      const next = GAMES[(index + direction + GAMES.length) % GAMES.length];
      selectGameInStore(next.id);
      setGameOver(false);
    },
    [playing, powered, selectGameInStore, selectedGame],
  );

  const move = useCallback(
    (amount: number) => {
      if (!powered) return;
      setPaddle((value) =>
        Math.max(0, Math.min(FIELD_W - PADDLE_W, value + amount)),
      );
      if (!playing) {
        setBall((value) => ({
          ...value,
          x: Math.max(BALL, Math.min(FIELD_W - BALL, value.x + amount)),
        }));
      }
    },
    [playing, powered],
  );

  const tick = useCallback(() => {
    setBall((current) => {
      let { x: vx, y: vy } = velocityRef.current;
      let x = current.x + vx;
      let y = current.y + vy;

      if (x <= BALL || x >= FIELD_W - BALL) {
        vx *= -1;
        x = Math.max(BALL, Math.min(FIELD_W - BALL, x));
      }
      if (y <= BALL) {
        vy = Math.abs(vy);
        y = BALL;
      }

      const paddleX = paddleRef.current;
      if (
        vy > 0 &&
        y + BALL >= PADDLE_Y &&
        y - BALL <= PADDLE_Y + 7 &&
        x >= paddleX - BALL &&
        x <= paddleX + PADDLE_W + BALL
      ) {
        const hit = (x - (paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
        vx = Math.max(-3.8, Math.min(3.8, hit * 3.8));
        vy = -Math.abs(vy);
        y = PADDLE_Y - BALL;
      }

      let hitBrick = false;
      setBricks((currentBricks) => {
        const next = currentBricks.map((brick) => {
          if (
            hitBrick ||
            !brick.alive ||
            x + BALL < brick.x ||
            x - BALL > brick.x + BRICK_W ||
            y + BALL < brick.y ||
            y - BALL > brick.y + BRICK_H
          ) {
            return brick;
          }
          hitBrick = true;
          return { ...brick, alive: false };
        });
        if (hitBrick) {
          vy *= -1;
          setScore((value) => {
            const nextScore = value + 10;
            recordScore("brick", nextScore);
            return nextScore;
          });
        }
        if (next.every((brick) => !brick.alive)) {
          setLevel((value) => value + 1);
          return makeBricks();
        }
        return next;
      });

      if (y > FIELD_H + BALL) {
        setLives((value) => {
          if (value <= 1) {
            setGameOver(true);
            setPlaying(false);
            return 0;
          }
          return value - 1;
        });
        resetBall();
        return { x: FIELD_W / 2, y: PADDLE_Y - 12 };
      }

      const nextVelocity = { x: vx, y: vy };
      velocityRef.current = nextVelocity;
      setVelocity(nextVelocity);
      return { x, y };
    });
  }, [recordScore, resetBall]);

  useGameLoop(tick, powered && playing && !paused && !gameOver, 16);

  const visibleLives = useMemo(() => "♥ ".repeat(lives).trim(), [lives]);

  if (activeGame === "fighter")
    return <InvadersScreen onExit={closeGame} />;
  if (activeGame === "tetris")
    return <TetrisScreen onExit={closeGame} />;
  if (activeGame === "snake")
    return <SnakeScreen onExit={closeGame} />;
  if (activeGame === "racing")
    return <RacingScreen onExit={closeGame} />;

  return (
    <SafeAreaView style={styles.page}>
      <StatusBar barStyle="light-content" />
      <View
        style={[
          styles.device,
          { width: deviceWidth },
          compact && styles.deviceCompact,
        ]}
      >
        <SpeakerHoles side="left" />
        <SpeakerHoles side="right" />

        <View
          style={[styles.screenFrame, compact && styles.screenFrameCompact]}
        >
          <View style={styles.brandRow}>
            <Text style={styles.brand}>
              BRIK <Text style={styles.brandDim}>CLASSIC 9999 IN 1</Text>
            </Text>
            <View style={styles.topScores}>
              <Text style={styles.topScore}>{padScore(highScore)}</Text>
              <Text style={styles.topScore}>{padScore(score)}</Text>
            </View>
          </View>

          <View style={styles.screenBezel}>
            <View style={styles.lcd}>
              <View
                style={[
                  styles.playfield,
                  { width: FIELD_W * gameScale, height: FIELD_H * gameScale },
                ]}
              >
                <View
                  style={[
                    styles.gameLayer,
                    {
                      width: FIELD_W,
                      height: FIELD_H,
                      transform: [{ scale: gameScale }],
                    },
                  ]}
                >
                  {powered &&
                    bricks.map((brick, index) =>
                      brick.alive ? (
                        <View
                          key={index}
                          style={[
                            styles.brick,
                            { left: brick.x, top: brick.y },
                          ]}
                        />
                      ) : null,
                    )}
                  {powered && (
                    <View
                      style={[
                        styles.ball,
                        { left: ball.x - BALL, top: ball.y - BALL },
                      ]}
                    />
                  )}
                  {powered && (
                    <View
                      style={[styles.paddle, { left: paddle, top: PADDLE_Y }]}
                    />
                  )}
                  {powered && !playing && !gameOver && (
                    <View style={styles.message}>
                      <Text style={styles.messageSub}>SELECT GAME</Text>
                      <Text style={styles.messageTitle}>
                        {GAMES.find((game) => game.id === selectedGame)?.label}
                      </Text>
                      <View style={styles.gamePicker}>
                        {GAMES.map((game) => (
                          <View
                            key={game.id}
                            style={[
                              styles.gamePip,
                              game.id === selectedGame && styles.gamePipActive,
                            ]}
                          />
                        ))}
                      </View>
                      <Text style={styles.messageSub}>
                        ◀ ▶ CHOOSE · START PLAY
                      </Text>
                    </View>
                  )}
                  {powered && paused && (
                    <View style={styles.message}>
                      <Text style={styles.messageTitle}>PAUSE</Text>
                    </View>
                  )}
                  {powered && gameOver && (
                    <View style={styles.message}>
                      <Text style={styles.messageTitle}>GAME OVER</Text>
                      <Text style={styles.messageSub}>{padScore(score)}</Text>
                      <Text style={styles.messageSub}>PRESS START</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.scoreRail}>
                <Readout label="SCORE" value={padScore(score)} />
                <Readout label="HI-SCORE" value={padScore(highScore)} />
                <Readout label="LIVES" value={visibleLives || "–"} />
                <Readout
                  label="LEVEL"
                  value={level.toString().padStart(2, "0")}
                />
                <Readout
                  label="SPEED"
                  value={Math.min(level, 9).toString().padStart(2, "0")}
                />
              </View>
              {!powered && <View style={styles.powerOff} />}
            </View>
          </View>
        </View>

        <View style={[styles.controls, compact && styles.controlsCompact]}>
          <View style={styles.dpad}>
            <RoundButton
              label="▲"
              style={styles.up}
              onPress={() => selectGame(-1)}
            />
            <RoundButton
              label="◀"
              style={styles.left}
              onPress={() => (playing ? move(-15) : selectGame(-1))}
            />
            <RoundButton
              label="▶"
              style={styles.right}
              onPress={() => (playing ? move(15) : selectGame(1))}
            />
            <RoundButton
              label="▼"
              style={styles.down}
              onPress={() => launchOrPause()}
            />
            <Text style={[styles.controlLabel, styles.upLabel]}>UP</Text>
            <Text style={[styles.controlLabel, styles.leftLabel]}>LEFT</Text>
            <Text style={[styles.controlLabel, styles.rightLabel]}>RIGHT</Text>
            <Text style={[styles.controlLabel, styles.downLabel]}>DOWN</Text>
          </View>

          <View style={styles.middleControls}>
            <Pressable
              style={({ pressed }) => [
                styles.startButton,
                pressed && styles.pressed,
              ]}
              onPress={launchOrPause}
            >
              <Text style={styles.startText}>START/PAUSE</Text>
            </Pressable>
            <View style={styles.toggles}>
              <Toggle
                label="ON/OFF"
                onPress={() => {
                  togglePower();
                  setPlaying(false);
                }}
                on={powered}
              />
              <Toggle label="SOUND" on={soundOn} onPress={toggleSound} />
              <Toggle label="MUSIC" on={musicOn} onPress={toggleMusic} />
            </View>
          </View>

          <View style={styles.actionWrap}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.pressed,
              ]}
              onPress={launchOrPause}
            >
              <View style={styles.actionDot} />
            </Pressable>
            <Text style={styles.actionLabel}>LAUNCH</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readout}>
      <Text style={styles.readoutLabel}>{label}</Text>
      <Text style={styles.readoutValue}>{value}</Text>
    </View>
  );
}

function SpeakerHoles({ side }: { side: "left" | "right" }) {
  return (
    <View
      style={[
        styles.speaker,
        side === "left" ? styles.speakerLeft : styles.speakerRight,
      ]}
    >
      {Array.from({ length: 14 }, (_, index) => (
        <View key={index} style={styles.speakerHole} />
      ))}
    </View>
  );
}

function RoundButton({
  label,
  style,
  onPress,
}: {
  label: string;
  style: object;
  onPress: () => void;
}) {
  return (
    <RepeatPressable
      style={[styles.roundButton, style]}
      onHold={onPress}
      repeatMs={70}
    >
      <Text style={styles.roundButtonText}>{label}</Text>
    </RepeatPressable>
  );
}

function RepeatPressable({
  children,
  style,
  onHold,
  repeatMs,
}: {
  children: ReactNode;
  style: object | object[];
  onHold: () => void;
  repeatMs: number;
}) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  return (
    <Pressable
      style={({ pressed }) => [style, pressed && styles.pressed]}
      onPressIn={() => {
        stop();
        onHold();
        timer.current = setInterval(onHold, repeatMs);
      }}
      onPressOut={stop}
    >
      {children}
    </Pressable>
  );
}

function Toggle({
  label,
  onPress,
  on,
}: {
  label: string;
  onPress?: () => void;
  on: boolean;
}) {
  return (
    <Pressable style={styles.toggle} onPress={onPress}>
      <View style={[styles.led, !on && styles.ledOff]} />
      <Text style={styles.toggleLabel}>{label}</Text>
    </Pressable>
  );
}

const LCD = "#bcc8ab";
const INK = "#253127";
const BLUE = "#0d69bd";
const YELLOW = "#f3d636";

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: BLUE, alignItems: "center" },
  device: {
    flex: 1,
    backgroundColor: BLUE,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 15,
    paddingTop: 18,
    shadowColor: "#000",
    shadowOpacity: 0.8,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 18,
  },
  deviceCompact: { paddingTop: 8 },
  speaker: {
    position: "absolute",
    top: 24,
    width: 15,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
    opacity: 0.5,
    zIndex: 4,
  },
  speakerLeft: { left: 6 },
  speakerRight: { right: 6 },
  speakerHole: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#053b70",
  },
  screenFrame: {
    height: "65%",
    minHeight: 475,
    backgroundColor: "#10283d",
    borderRadius: 18,
    padding: 10,
    shadowColor: "#00101d",
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  screenFrameCompact: { minHeight: 425, height: "64%" },
  brandRow: {
    height: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  brand: {
    color: "#f3f6ec",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  brandDim: { color: "#8ca7bd", fontSize: 7 },
  topScores: { flexDirection: "row", gap: 14 },
  topScore: {
    color: "#84caff",
    fontFamily: "monospace",
    fontSize: 10,
    letterSpacing: 1,
  },
  screenBezel: {
    flex: 1,
    backgroundColor: "#85917a",
    borderRadius: 13,
    padding: 9,
    borderWidth: 2,
    borderColor: "#687461",
  },
  lcd: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: LCD,
    borderRadius: 8,
    padding: 8,
    gap: 7,
    overflow: "hidden",
  },
  playfield: {
    alignSelf: "center",
    backgroundColor: "rgba(70,85,68,0.12)",
    borderWidth: 2,
    borderColor: "rgba(37,49,39,0.45)",
    overflow: "hidden",
  },
  gameLayer: {
    position: "absolute",
    left: 0,
    top: 0,
    transformOrigin: "top left",
  },
  brick: {
    position: "absolute",
    width: BRICK_W,
    height: BRICK_H,
    backgroundColor: INK,
    borderWidth: 1,
    borderColor: "#87947e",
  },
  ball: {
    position: "absolute",
    width: BALL * 2,
    height: BALL * 2,
    backgroundColor: INK,
  },
  paddle: {
    position: "absolute",
    width: PADDLE_W,
    height: 7,
    backgroundColor: INK,
  },
  message: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(188,200,171,0.86)",
    gap: 8,
  },
  messageTitle: {
    color: INK,
    fontFamily: "monospace",
    fontWeight: "900",
    fontSize: 20,
    letterSpacing: 2,
  },
  messageSub: {
    color: INK,
    fontFamily: "monospace",
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 1,
  },
  gamePicker: { flexDirection: "row", gap: 5 },
  gamePip: {
    width: 15,
    height: 6,
    borderWidth: 1,
    borderColor: INK,
    opacity: 0.35,
  },
  gamePipActive: { backgroundColor: INK, opacity: 1 },
  scoreRail: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(37,49,39,0.25)",
    paddingLeft: 8,
    paddingTop: 4,
    gap: 13,
  },
  readout: { gap: 1 },
  readoutLabel: {
    color: INK,
    fontFamily: "monospace",
    fontSize: 8,
    fontWeight: "700",
  },
  readoutValue: {
    color: INK,
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "900",
  },
  powerOff: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,28,22,0.74)",
  },
  controls: {
    flex: 1,
    minHeight: 230,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingTop: 14,
  },
  controlsCompact: { minHeight: 190, paddingTop: 4 },
  dpad: { width: 140, height: 180, position: "relative" },
  roundButton: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: YELLOW,
    borderWidth: 2,
    borderColor: "#d1b91d",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00335e",
    shadowOpacity: 0.7,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  roundButtonText: { color: "#34310a", fontSize: 15, fontWeight: "900" },
  up: { left: 46, top: 0 },
  left: { left: 0, top: 52 },
  right: { right: 0, top: 52 },
  down: { left: 46, top: 104 },
  controlLabel: {
    position: "absolute",
    color: "white",
    fontSize: 8,
    fontWeight: "800",
    textShadowColor: "#00325e",
    textShadowRadius: 2,
  },
  upLabel: { top: 48, left: 62 },
  leftLabel: { top: 101, left: 10 },
  rightLabel: { top: 101, right: 5 },
  downLabel: { top: 154, left: 57 },
  middleControls: { width: 102, alignItems: "center", gap: 17, paddingTop: 45 },
  startButton: {
    backgroundColor: YELLOW,
    borderWidth: 2,
    borderColor: "#c2aa17",
    borderRadius: 18,
    paddingHorizontal: 12,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-2deg" }],
    elevation: 5,
  },
  startText: { color: "#2a290d", fontWeight: "900", fontSize: 9 },
  toggles: { flexDirection: "row", gap: 7 },
  toggle: { alignItems: "center", gap: 4 },
  led: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#43dd72",
    borderWidth: 1,
    borderColor: "#18a346",
    elevation: 3,
  },
  ledOff: { backgroundColor: "#174f35", borderColor: "#123c2b" },
  toggleLabel: { color: "white", fontSize: 6, fontWeight: "800" },
  actionWrap: { width: 90, alignItems: "center", gap: 8 },
  actionButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: YELLOW,
    borderWidth: 3,
    borderColor: "#c7ad13",
    alignItems: "center",
    justifyContent: "center",
    elevation: 7,
  },
  actionDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#484509",
    borderWidth: 1,
    borderColor: "#716d0b",
  },
  actionLabel: { color: "white", fontSize: 9, fontWeight: "800" },
  pressed: { opacity: 0.75, transform: [{ translateY: 2 }] },
});
