// 2行1組の単語行（1行目=見出し語/明朝、2行目=意味/小さめ2行まで）。
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useColors, useTheme } from '../theme/theme';
import type { Word } from '../data/words';

export function WordRow({
  word,
  right,
  leading,
  isLast,
  onPress,
  dim,
}: {
  word: Word;
  right?: React.ReactNode;
  leading?: React.ReactNode;
  isLast?: boolean;
  onPress?: () => void;
  dim?: boolean;
}) {
  const c = useColors();
  const { termFontFamily } = useTheme();
  const Container: any = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
        paddingHorizontal: 16,
        backgroundColor: c.paper,
        opacity: dim ? 0.45 : 1,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: c.line,
      }}
    >
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        {/* 1行目: 単語 */}
        <Text numberOfLines={1} style={{ fontFamily: termFontFamily, fontSize: 17, fontWeight: '600', color: c.ink }}>
          {word.term}
        </Text>
        {/* 2行目: 意味 */}
        <Text numberOfLines={2} style={{ fontSize: 14, color: c.text2, marginTop: 3, lineHeight: 20 }}>
          {word.meaning}
        </Text>
        {/* 3行目: 読み（用語はジャンル）。横併記だと見切れるので独立行に。 */}
        {(() => {
          const sub = word.cat === '用語' ? word.sub : word.yomi;
          if (!sub) return null;
          return (
            <Text numberOfLines={1} style={{ fontSize: 12.5, color: c.sub, marginTop: 3 }}>
              （{sub}）
            </Text>
          );
        })()}
      </View>
      {right != null && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>{right}</View>
      )}
    </Container>
  );
}
