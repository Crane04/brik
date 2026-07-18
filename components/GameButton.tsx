import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { THEME } from "@/constants/theme";

interface DPadProps {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
}

export function DPad({ onUp, onDown, onLeft, onRight }: DPadProps) {
  return (
    <View style={styles.dpad}>
      <View style={styles.dpadRow}>
        <DPadBtn label="▲" onPress={onUp} />
      </View>
      <View style={styles.dpadMiddle}>
        <DPadBtn label="◀" onPress={onLeft} />
        <View style={styles.dpadCenter} />
        <DPadBtn label="▶" onPress={onRight} />
      </View>
      <View style={styles.dpadRow}>
        <DPadBtn label="▼" onPress={onDown} />
      </View>
    </View>
  );
}

function DPadBtn({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={styles.dpadBtn}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Text style={styles.dpadLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  color?: string;
  size?: number;
}

export function ActionButton({ label, onPress, color = THEME.shellAccent, size = 52 }: ActionButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { width: size, height: size, borderRadius: size / 2, borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

interface GameControlsProps {
  onPause: () => void;
  onRestart: () => void;
  paused: boolean;
}

export function GameControls({ onPause, onRestart, paused }: GameControlsProps) {
  return (
    <View style={styles.controls}>
      <TouchableOpacity style={styles.smallBtn} onPress={onRestart}>
        <Text style={styles.smallBtnText}>RESET</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.smallBtn, styles.smallBtnAccent]} onPress={onPause}>
        <Text style={[styles.smallBtnText, { color: THEME.shellAccent }]}>
          {paused ? "PLAY" : "PAUSE"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  dpad: {
    alignItems: "center",
    gap: 2,
  },
  dpadRow: {
    alignItems: "center",
  },
  dpadMiddle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  dpadCenter: {
    width: 44,
    height: 44,
    backgroundColor: THEME.shellBorder,
    borderRadius: 4,
  },
  dpadBtn: {
    width: 44,
    height: 44,
    backgroundColor: THEME.shellBorder,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  dpadLabel: {
    color: THEME.shellText,
    fontSize: 16,
    fontWeight: "600",
  },
  actionBtn: {
    backgroundColor: "transparent",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  controls: {
    flexDirection: "row",
    gap: 12,
  },
  smallBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: THEME.shellBorder,
    borderRadius: 20,
  },
  smallBtnAccent: {
    borderWidth: 1,
    borderColor: THEME.shellAccent,
  },
  smallBtnText: {
    color: THEME.shellMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
