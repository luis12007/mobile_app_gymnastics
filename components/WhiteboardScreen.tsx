import { Canvas, Path as SkiaPath, Skia } from "@shopify/react-native-skia";
import { useRef } from "react";
import { View, StyleSheet, PanResponder, GestureResponderEvent } from "react-native";

export default function FastWhiteboardBase() {
  const path = useRef(Skia.Path.Make());
  let drawingStarted = false;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        path.current.moveTo(locationX, locationY);
        drawingStarted = true;
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        if (!drawingStarted) return;
        const { locationX, locationY } = e.nativeEvent;
        path.current.lineTo(locationX, locationY);
      },
      onPanResponderRelease: () => {
        drawingStarted = false;
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Canvas style={styles.canvas}>
        <SkiaPath path={path.current} color="black" style="stroke" strokeWidth={3} />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  canvas: { flex: 1, backgroundColor: "#f5f5f5" },
});
