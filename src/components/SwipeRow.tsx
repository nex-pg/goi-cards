// 左スワイプで「削除」ボタンを露出 → タップで削除（Undoは呼び出し側）。
// prototype/lists.jsx の SwipeRow を gesture-handler + reanimated で再現。
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useColors } from '../theme/theme';

const DW = 88; // 削除ボタン幅

export function SwipeRow({
  onDelete,
  enabled = true,
  children,
}: {
  onDelete: () => void;
  enabled?: boolean;
  children: React.ReactNode;
}) {
  const c = useColors();
  const tx = useSharedValue(0);
  const startX = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  if (!enabled) return <>{children}</>;

  // 横方向の移動が明確なときだけ作動（縦スクロールと干渉しない）
  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .onStart(() => {
      startX.value = tx.value;
    })
    .onUpdate((e) => {
      let nx = startX.value + e.translationX;
      nx = Math.max(-DW - 16, Math.min(0, nx));
      tx.value = nx;
    })
    .onEnd(() => {
      tx.value = withTiming(tx.value < -DW / 2 ? -DW : 0, { duration: 180 });
    });

  const del = () => {
    tx.value = 0;
    onDelete();
  };

  return (
    <View style={{ overflow: 'hidden' }}>
      <Pressable
        onPress={del}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: DW,
          backgroundColor: c.ink,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: c.paper, fontSize: 14, fontWeight: '700' }}>削除</Text>
      </Pressable>
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ backgroundColor: c.paper }, style]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}
