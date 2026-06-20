// 下部ナビ（常時表示）。prototype/shell.jsx の TabBar を移植。
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../theme/theme';
import { Icon, type IconName } from './Icon';
import { playTab } from '../sfx/sounds';

export type TabKey = 'quiz' | 'bookmark' | 'history' | 'browse' | 'more';

const TABS: { key: TabKey; label: string; icon: IconName }[] = [
  { key: 'quiz', label: '問題', icon: 'quiz' },
  { key: 'bookmark', label: 'ブックマーク', icon: 'bookmark' },
  { key: 'history', label: '履歴', icon: 'clock' },
  { key: 'browse', label: '一覧', icon: 'list' },
  { key: 'more', label: 'その他', icon: 'more' },
];

export function TabBar({ tab, onTab }: { tab: TabKey; onTab: (k: TabKey) => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: c.line,
        backgroundColor: c.paper,
        paddingTop: 6,
        paddingBottom: Math.max(8, insets.bottom),
      }}
    >
      {TABS.map((t) => {
        const active = tab === t.key;
        const color = active ? c.ink : c.sub;
        return (
          <Pressable
            key={t.key}
            onPress={() => {
              playTab(); // メニュー切替音
              onTab(t.key);
            }}
            style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4 }}
          >
            <Icon name={t.icon} size={23} filled={active && t.key === 'bookmark'} stroke={active ? 2 : 1.7} color={color} />
            <Text style={{ fontSize: 9.5, fontWeight: active ? '700' : '500', color }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
