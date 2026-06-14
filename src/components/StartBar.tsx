// リストから N 問出題するスタートバー（ランダム/並び順トグル + 問題数）。
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useColors } from '../theme/theme';
import { Icon } from './Icon';
import { NumberDial } from './ui';

export function StartBar({
  count,
  setCount,
  random,
  setRandom,
  onStart,
  disabled,
  n,
}: {
  count: number;
  setCount: (n: number) => void;
  random: boolean;
  setRandom: (fn: (r: boolean) => boolean) => void;
  onStart: () => void;
  disabled?: boolean;
  n: number;
}) {
  const c = useColors();
  const can = !disabled && n > 0;
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 }}>
      <Pressable
        onPress={() => can && onStart()}
        disabled={!can}
        style={{
          flex: 1,
          paddingVertical: 12,
          borderRadius: 12,
          alignItems: 'center',
          backgroundColor: can ? c.ink : c.line,
        }}
      >
        <Text style={{ fontSize: 14.5, fontWeight: '700', letterSpacing: 1, color: can ? c.paper : c.sub }}>
          スタート
        </Text>
      </Pressable>
      <Pressable
        onPress={() => !disabled && setRandom((r) => !r)}
        disabled={disabled}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 11,
          paddingHorizontal: 13,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: c.field,
        }}
      >
        <Icon name={random ? 'shuffle' : 'list'} size={16} color={disabled ? c.sub : c.ink} />
        <Text style={{ fontSize: 13, fontWeight: '600', color: disabled ? c.sub : c.ink }}>
          {random ? 'ランダム' : '並び順'}
        </Text>
      </Pressable>
      <NumberDial value={count} onChange={setCount} disabled={disabled} />
    </View>
  );
}
