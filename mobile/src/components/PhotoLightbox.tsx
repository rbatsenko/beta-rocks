/**
 * Full-screen photo lightbox with swipe between images
 */

import { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface PhotoLightboxProps {
  visible: boolean;
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
}

export function PhotoLightbox({ visible, photos, initialIndex = 0, onClose }: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.container}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>

        {/* Counter */}
        {photos.length > 1 && (
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {photos.length}
            </Text>
          </View>
        )}

        {/* Photo carousel */}
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
          onMomentumScrollEnd={(e) => {
            setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
          }}
          renderItem={({ item }) => (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: item }}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
          )}
          keyExtractor={(_, i) => i.toString()}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
  },
  closeButton: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
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
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
});
