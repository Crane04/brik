import { View, StyleSheet, ViewStyle } from "react-native";
import { THEME } from "@/constants/theme";

interface LCDScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  width: number;
  height: number;
}

export function LCDScreen({ children, style, width, height }: LCDScreenProps) {
  return (
    <View style={[styles.outer, { width: width + 16, height: height + 16 }, style]}>
      <View style={[styles.inner, { width, height }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: "#0f1f0f",
    borderRadius: 8,
    padding: 8,
    borderWidth: 2,
    borderColor: "#0a150a",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  inner: {
    backgroundColor: THEME.screenBg,
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
});
