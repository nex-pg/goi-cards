// オープンソースライセンス一覧。scripts/gen-licenses.js が生成する licenses.json を表示。
// 行をタップで全文の開閉。
import React, { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useColors } from '../theme/theme';
import { Icon } from '../components/Icon';
import { panel } from '../components/ui';
import licenses from '../assets/licenses.json';

interface LicenseItem {
  name: string;
  version: string;
  license: string;
  author: string | null;
  repository: string | null;
  text: string | null;
}

const DATA = licenses as LicenseItem[];

export function LicensesScreen({ onClose }: { onClose: () => void }) {
  const c = useColors();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Pressable onPress={onClose} hitSlop={8} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: -6 }}>
            <Icon name="chevL" size={22} color={c.ink} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 24, fontWeight: '800', color: c.ink }}>オープンソースライセンス</Text>
        </View>
      </View>
      <FlatList
        data={DATA}
        keyExtractor={(it) => it.name}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        ListHeaderComponent={
          <Text style={{ fontSize: 12, color: c.sub, lineHeight: 19, marginBottom: 12 }}>
            本アプリは以下のオープンソースソフトウェアを利用しています。各ソフトウェアの著作権は各権利者に帰属します。
          </Text>
        }
        renderItem={({ item }) => {
          const isOpen = !!open[item.name];
          return (
            <View style={[panel(c), { overflow: 'hidden', marginBottom: 8 }]}>
              <Pressable
                onPress={() => setOpen((o) => ({ ...o, [item.name]: !o[item.name] }))}
                style={{ paddingHorizontal: 14, paddingVertical: 12 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: c.ink }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: c.sub }}>{item.version}</Text>
                  <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10.5, color: c.text2 }}>{item.license}</Text>
                  </View>
                </View>
                {item.text && (
                  <Text style={{ fontSize: 11, color: c.sub, marginTop: 6 }}>
                    {isOpen ? '▲ 全文を隠す' : '▼ ライセンス全文'}
                  </Text>
                )}
              </Pressable>
              {isOpen && item.text && (
                <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingHorizontal: 14, paddingVertical: 12 }}>
                  <Text style={{ fontSize: 10.5, color: c.text2, lineHeight: 16 }}>{item.text}</Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}
