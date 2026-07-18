import { ReactNode, useEffect, useRef, useState } from "react";
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useConsoleStore } from "@/store/useConsoleStore";

type Props = {
  title: string;
  score: number;
  highScore?: number;
  lives?: number | null;
  level?: number;
  speed?: number;
  children: ReactNode;
  onBack?: () => void;
  onStartPause: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  repeatAction?: boolean;
};

const pad = (value: number) => Math.min(99999, value).toString().padStart(5, "0");

export function RetroHandheld({
  title, score, highScore = 0, lives = null, level = 1, speed = 1, children,
  onBack, onStartPause, onUp, onDown, onLeft, onRight, onAction, actionLabel = "ACTION", repeatAction = false,
}: Props) {
  const { width, height } = useWindowDimensions();
  const powered = useConsoleStore((state) => state.powered);
  const soundOn = useConsoleStore((state) => state.soundOn);
  const musicOn = useConsoleStore((state) => state.musicOn);
  const togglePower = useConsoleStore((state) => state.togglePower);
  const toggleSound = useConsoleStore((state) => state.toggleSound);
  const toggleMusic = useConsoleStore((state) => state.toggleMusic);
  const compact = height < 760;
  const deviceWidth = Math.min(width, 430);

  const invoke = (callback?: () => void) => powered && callback?.();

  return (
    <SafeAreaView style={styles.page}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.device, { width: deviceWidth }, compact && styles.deviceCompact]}>
        <View style={[styles.screenFrame, compact && styles.screenFrameCompact]}>
          <View style={styles.brandRow}>
            <Pressable onPress={onBack}><Text style={styles.brand}>BRIK <Text style={styles.dim}>· {title}</Text></Text></Pressable>
            <View style={styles.topScores}><Text style={styles.topScore}>{pad(highScore)}</Text><Text style={styles.topScore}>{pad(score)}</Text></View>
          </View>
          <View style={styles.bezel}>
            <View style={styles.lcd}>
              <View style={styles.playfield}>{powered ? children : null}</View>
              <View style={styles.rail}>
                <Readout label="SCORE" value={pad(score)} />
                <Readout label="HI-SCORE" value={pad(highScore)} />
                {typeof lives === "number" && <Readout label="LIVES" value={"♥ ".repeat(lives).trim() || "–"} />}
                <Readout label="LEVEL" value={level.toString().padStart(2, "0")} />
                <Readout label="SPEED" value={speed.toString().padStart(2, "0")} />
              </View>
              {!powered && <View style={styles.powerOff} />}
            </View>
          </View>
        </View>

        <View style={[styles.controls, compact && styles.controlsCompact]}>
          <View style={styles.dpad}>
            <Round label="▲" style={styles.up} onPress={() => invoke(onUp)} />
            <Round label="◀" style={styles.left} onPress={() => invoke(onLeft)} />
            <Round label="▶" style={styles.right} onPress={() => invoke(onRight)} />
            <Round label="▼" style={styles.down} onPress={() => invoke(onDown)} />
            <Label text="UP" style={styles.upLabel} /><Label text="LEFT" style={styles.leftLabel} />
            <Label text="RIGHT" style={styles.rightLabel} /><Label text="DOWN" style={styles.downLabel} />
          </View>
          <View style={styles.middle}>
            <Pressable style={({ pressed }) => [styles.start, pressed && styles.pressed]} onPress={() => invoke(onStartPause)}>
              <Text style={styles.startText}>START/PAUSE</Text>
            </Pressable>
            <View style={styles.toggles}>
              <Toggle
                label="ON/OFF"
                on={powered}
                onPress={() => {
                  if (onBack) onBack();
                  else togglePower();
                }}
              />
              <Toggle label="SOUND" on={soundOn} onPress={toggleSound} />
              <Toggle label="MUSIC" on={musicOn} onPress={toggleMusic} />
            </View>
          </View>
          <View style={styles.actionWrap}>
            <HoldButton style={styles.action} onHold={() => invoke(onAction)} repeatMs={repeatAction ? 120 : undefined}><View style={styles.actionDot} /></HoldButton>
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return <View style={styles.readout}><Text style={styles.readoutLabel}>{label}</Text><Text style={styles.readoutValue}>{value}</Text></View>;
}
function Round({ label, style, onPress }: { label: string; style: object; onPress: () => void }) {
  return <HoldButton style={[styles.round, style]} onHold={onPress} repeatMs={70}><Text style={styles.roundText}>{label}</Text></HoldButton>;
}
function Label({ text, style }: { text: string; style: object }) { return <Text style={[styles.controlLabel, style]}>{text}</Text>; }
function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress?: () => void }) {
  return <Pressable style={styles.toggle} onPress={onPress}><View style={[styles.led, !on && styles.ledOff]} /><Text style={styles.toggleLabel}>{label}</Text></Pressable>;
}

function HoldButton({ children, style, onHold, repeatMs }: { children: ReactNode; style: object | object[]; onHold: () => void; repeatMs?: number }) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pressed, setPressed] = useState(false);
  const stopTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  const release = () => {
    stopTimer();
    setPressed(false);
  };
  const press = () => {
    stopTimer();
    setPressed(true);
    onHold();
    if (repeatMs) timer.current = setInterval(onHold, repeatMs);
  };
  useEffect(() => stopTimer, []);
  return (
    <View
      accessible
      accessibilityRole="button"
      style={[style, pressed && styles.pressed]}
      onTouchStart={press}
      onTouchEnd={release}
      onTouchCancel={release}
    >
      {children}
    </View>
  );
}

const INK = "#253127";
const YELLOW = "#f3d636";
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0d69bd", alignItems: "center" },
  device: { flex: 1, backgroundColor: "#0d69bd", padding: 15, paddingTop: 18, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  deviceCompact: { paddingTop: 8 },
  screenFrame: { height: "65%", minHeight: 475, backgroundColor: "#10283d", borderRadius: 18, padding: 10, elevation: 10 },
  screenFrameCompact: { minHeight: 425, height: "64%" },
  brandRow: { height: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  brand: { color: "#f3f6ec", fontSize: 10, fontWeight: "800", letterSpacing: 1 }, dim: { color: "#8ca7bd", fontSize: 8 },
  topScores: { flexDirection: "row", gap: 14 }, topScore: { color: "#84caff", fontFamily: "monospace", fontSize: 10 },
  bezel: { flex: 1, backgroundColor: "#85917a", borderRadius: 13, padding: 9, borderWidth: 2, borderColor: "#687461" },
  lcd: { flex: 1, flexDirection: "row", backgroundColor: "#bcc8ab", borderRadius: 8, padding: 8, gap: 7, overflow: "hidden" },
  playfield: { flex: 1, backgroundColor: "rgba(70,85,68,0.12)", borderWidth: 2, borderColor: "rgba(37,49,39,0.45)", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  rail: { width: 68, borderLeftWidth: 1, borderLeftColor: "rgba(37,49,39,0.25)", paddingLeft: 7, paddingTop: 4, gap: 13 },
  readout: { gap: 1 }, readoutLabel: { color: INK, fontFamily: "monospace", fontSize: 7, fontWeight: "700" }, readoutValue: { color: INK, fontFamily: "monospace", fontSize: 10, fontWeight: "900" },
  powerOff: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(20,28,22,0.74)" },
  controls: { flex: 1, minHeight: 230, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, paddingTop: 14 },
  controlsCompact: { minHeight: 190, paddingTop: 4 }, dpad: { width: 140, height: 180, position: "relative" },
  round: { position: "absolute", width: 48, height: 48, borderRadius: 24, backgroundColor: YELLOW, borderWidth: 2, borderColor: "#d1b91d", alignItems: "center", justifyContent: "center", elevation: 6 },
  roundText: { color: "#34310a", fontSize: 15, fontWeight: "900" }, up: { left: 46, top: 0 }, left: { left: 0, top: 52 }, right: { right: 0, top: 52 }, down: { left: 46, top: 104 },
  controlLabel: { position: "absolute", color: "white", fontSize: 8, fontWeight: "800" }, upLabel: { top: 48, left: 62 }, leftLabel: { top: 101, left: 10 }, rightLabel: { top: 101, right: 5 }, downLabel: { top: 154, left: 57 },
  middle: { width: 102, alignItems: "center", gap: 17, paddingTop: 45 }, start: { backgroundColor: YELLOW, borderWidth: 2, borderColor: "#c2aa17", borderRadius: 18, paddingHorizontal: 12, height: 32, alignItems: "center", justifyContent: "center", elevation: 5 }, startText: { color: "#2a290d", fontWeight: "900", fontSize: 9 },
  toggles: { flexDirection: "row", gap: 7 }, toggle: { alignItems: "center", gap: 4 }, led: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#43dd72", borderWidth: 1, borderColor: "#18a346" }, ledOff: { backgroundColor: "#174f35", borderColor: "#123c2b" }, toggleLabel: { color: "white", fontSize: 6, fontWeight: "800" },
  actionWrap: { width: 90, alignItems: "center", gap: 8 }, action: { width: 76, height: 76, borderRadius: 38, backgroundColor: YELLOW, borderWidth: 3, borderColor: "#c7ad13", alignItems: "center", justifyContent: "center", elevation: 7 }, actionDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#484509" }, actionLabel: { color: "white", fontSize: 9, fontWeight: "800" }, pressed: { opacity: 0.75 },
});
