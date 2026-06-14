// Proゲート / Pro案内ダイアログ（共通部品）。prototype/shell.jsx の ProInfoDialog 相当。
// 「一覧」用と「ブックマーク複数管理」用で文言だけ差し替える。
import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useColors } from '../theme/theme';
import { Icon } from './Icon';

export function ProInfoDialog({
  title,
  message,
  onUpgrade,
  onClose,
}: {
  title: string;
  message: string;
  onUpgrade: () => void;
  onClose: () => void;
}) {
  const c = useColors();
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.34)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 320,
            backgroundColor: c.paper,
            borderRadius: 22,
            paddingTop: 26,
            paddingHorizontal: 22,
            paddingBottom: 20,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.28,
            shadowRadius: 40,
            shadowOffset: { width: 0, height: 16 },
            elevation: 16,
          }}
        >
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: c.ink,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Icon name="lock" size={26} color={c.ink} />
          </View>
          <Text style={{ fontSize: 19, fontWeight: '800', color: c.ink, marginBottom: 10, textAlign: 'center' }}>
            {title}
          </Text>
          <Text style={{ fontSize: 13, color: c.sub, lineHeight: 22, marginBottom: 20, textAlign: 'center' }}>
            {message}
          </Text>
          <Pressable
            onPress={onUpgrade}
            style={{ width: '100%', paddingVertical: 15, borderRadius: 14, backgroundColor: c.ink, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: c.paper, letterSpacing: 1 }}>
              Proにアップグレード
            </Text>
          </Pressable>
          <Pressable onPress={onClose} style={{ width: '100%', paddingVertical: 13, alignItems: 'center', marginTop: 4 }}>
            <Text style={{ fontSize: 15, color: c.sub }}>閉じる</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// 一覧タブ用のゲート
export function BrowseProGate({ onUpgrade, onClose }: { onUpgrade: () => void; onClose: () => void }) {
  return (
    <ProInfoDialog
      title="一覧は Pro 機能です"
      message="辞書のように全単語を見出順でブラウズし、検索やタグ・分類・難易度で絞り込めます。今後追加される単語もすべて使えます。"
      onUpgrade={onUpgrade}
      onClose={onClose}
    />
  );
}

// ブックマーク複数管理用のダイアログ
export function FolderProGate({ onUpgrade, onClose }: { onUpgrade: () => void; onClose: () => void }) {
  return (
    <ProInfoDialog
      title="ブックマークの複数管理は Pro 機能です"
      message="フォルダを追加して用途別にブックマークを整理できます。Pro を有効にするとご利用いただけます。"
      onUpgrade={onUpgrade}
      onClose={onClose}
    />
  );
}
