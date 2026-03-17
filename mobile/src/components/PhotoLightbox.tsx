/**
 * Full-screen photo lightbox with swipe + pinch-to-zoom
 */

import { useState, useCallback } from "react";
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
  FlatList,
} from "react-native";
import { GestureDetector, Gesture, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

const { width: SW, height: SH } = Dimensions.get("window");

interface PhotoLightboxProps {
  visible: boolean;
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
}

function ZoomableImage({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  const pan = Gesture.Pan()
    .minPointers(2)
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.imageContainer, animatedStyle]}>
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
      </Animated.View>
    </GestureDetector>
  );
}

export function PhotoLightbox({ visible, photos, initialIndex = 0, onClose }: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const onScrollEnd = useCallback((e: any) => {
    setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / SW));
  }, []);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <GestureHandlerRootView style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>

        {photos.length > 1 && (
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {photos.length}
            </Text>
          </View>
        )}

        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: SW, offset: SW * index, index })}
          onMomentumScrollEnd={onScrollEnd}
          renderItem={({ item }) => (
            <View style={{ width: SW, height: SH, justifyContent: "center" }}>
              <ZoomableImage uri={item} />
            </View>
          )}
          keyExtractor={(_, i) => i.toString()}
        />
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 10,
    zIndex: 10,
    padding: 20,
    // hitSlop applied via component prop, not style
  },
  counter: {
    position: "absolute",
    top: 64,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: "center",
  },
  counterText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  imageContainer: {
    width: SW,
    height: SH * 0.7,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: SW,
    height: SH * 0.7,
  },
});
