// 共通UI部品（モノクロ）。prototype/ui.jsx を React Native へ移植。
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, type Colors } from '../theme/theme';
import { Icon } from './Icon';
import type { Folder, Status } from '../store/store';

// パネル（カード/リストの枠）。docs/04: パネル角丸18。
export function panel(c: Colors): ViewStyle {
  return { backgroundColor: c.paper, borderWidth: 1, borderColor: c.line, borderRadius: 18 };
}

export function usePanel(): ViewStyle {
  return panel(useColors());
}

// ── ステータスバッジ（塗り=わかる / 白抜き枠=わからない） ──
export function StatusBadge({ status }: { status: Status }) {
  const c = useColors();
  if (status !== 'known' && status !== 'unknown') return null;
  const known = status === 'known';
  return (
    <View
      style={{
        paddingVertical: 3,
        paddingHorizontal: 7,
        borderRadius: 999,
        backgroundColor: known ? c.ink : 'transparent',
        borderWidth: 1,
        borderColor: c.ink,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: known ? c.paper : c.ink }}>
        {known ? 'わかる' : 'わからない'}
      </Text>
    </View>
  );
}

// ── トグルスイッチ ──
export function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => onChange(!on)}
      style={{
        width: 46,
        height: 28,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: c.ink,
        padding: 2,
        backgroundColor: on ? c.ink : 'transparent',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          backgroundColor: on ? c.paper : c.ink,
          transform: [{ translateX: on ? 18 : 0 }],
        }}
      />
    </Pressable>
  );
}

// ── セグメント（並び順タブ／表示モード） ──
export function SegTabs<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (k: T) => void;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: c.field,
        borderRadius: 10,
        padding: 3,
        gap: 2,
        opacity: disabled ? 0.45 : 1,
        alignSelf: 'flex-start',
      }}
    >
      {options.map((o) => {
        const active = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => !disabled && onChange(o.key)}
            disabled={disabled}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 8,
              backgroundColor: active ? c.paper : 'transparent',
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: active ? c.ink : c.sub }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── チェックチップ（問題の分類/タグ/難易度の複数選択） ──
export function CheckChip({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 9,
        paddingHorizontal: 13,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: c.ink,
        backgroundColor: checked ? c.ink : 'transparent',
      }}
    >
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 5,
          borderWidth: checked ? 1 : 1.5,
          borderColor: checked ? c.paper : c.ink,
          backgroundColor: checked ? c.paper : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && <Icon name="check" size={12} stroke={2.6} color={c.ink} />}
      </View>
      <Text style={{ fontSize: 14.5, fontWeight: '600', color: checked ? c.paper : c.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

// ── 横スクロールの丸チップ（一覧フィルタ用） ──
export function PillChip({
  label,
  on,
  onPress,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 13,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: c.ink,
        backgroundColor: on ? c.ink : 'transparent',
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: on ? c.paper : c.ink }}>{label}</Text>
    </Pressable>
  );
}

// ── 汎用ボトムシート ──
export function Sheet({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: c.paper, paddingBottom: Math.max(20, insets.bottom) },
            ]}
            onPress={() => {}}
          >
            <View style={[styles.grabber, { backgroundColor: c.line }]} />
            {title && (
              <Text style={[styles.sheetTitle, { color: c.sub }]}>{title}</Text>
            )}
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── 選択肢シート（保存先など） ──
export function ChoiceSheet({
  title,
  note,
  options,
  onPick,
  onClose,
}: {
  title?: string;
  note?: string;
  options: { key: string; label: string }[];
  onPick: (key: string) => void;
  onClose: () => void;
}) {
  const c = useColors();
  return (
    <Sheet onClose={onClose} title={title}>
      {note && <Text style={[styles.note, { color: c.sub }]}>{note}</Text>}
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        {options.map((o) => (
          <Pressable
            key={o.key}
            onPress={() => onPick(o.key)}
            style={{
              paddingVertical: 15,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: c.line,
              backgroundColor: c.field,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: c.ink }}>{o.label}</Text>
          </Pressable>
        ))}
        <Pressable onPress={onClose} style={{ paddingVertical: 15, alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: c.sub }}>キャンセル</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

// ── 確認シート ──
export function ConfirmSheet({
  title,
  message,
  confirmLabel = '削除',
  onConfirm,
  onClose,
}: {
  title?: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const c = useColors();
  return (
    <Sheet onClose={onClose} title={title}>
      {message && (
        <Text
          style={{
            textAlign: 'center',
            fontSize: 13.5,
            color: c.ink,
            paddingHorizontal: 24,
            paddingBottom: 16,
            lineHeight: 22,
          }}
        >
          {message}
        </Text>
      )}
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <Pressable
          onPress={onConfirm}
          style={{ paddingVertical: 15, borderRadius: 14, backgroundColor: c.ink, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: c.paper }}>{confirmLabel}</Text>
        </Pressable>
        <Pressable onPress={onClose} style={{ paddingVertical: 15, alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: c.sub }}>キャンセル</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

// ── 名前入力ダイアログ ──
export function PromptSheet({
  title,
  placeholder,
  initial = '',
  confirmLabel = 'OK',
  maxLength,
  onConfirm,
  onClose,
}: {
  title?: string;
  placeholder?: string;
  initial?: string;
  confirmLabel?: string;
  maxLength?: number;
  onConfirm: (value: string) => void;
  onClose: () => void;
}) {
  const c = useColors();
  const [val, setVal] = useState(initial);
  const ok = () => {
    const v = val.trim();
    if (v) onConfirm(v);
  };
  const enabled = val.trim().length > 0;
  return (
    <Sheet onClose={onClose} title={title}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
        <TextInput
          autoFocus
          value={val}
          onChangeText={(text) => setVal(maxLength ? [...text].slice(0, maxLength).join('') : text)}
          placeholder={placeholder}
          placeholderTextColor={c.sub}
          maxLength={maxLength}
          onSubmitEditing={ok}
          returnKeyType="done"
          style={{
            paddingVertical: 13,
            paddingHorizontal: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.line,
            backgroundColor: c.field,
            color: c.ink,
            fontSize: 16,
            marginBottom: maxLength ? 4 : 10,
          }}
        />
        {maxLength != null && (
          <Text style={{ textAlign: 'right', fontSize: 11, color: c.sub, marginBottom: 10 }}>
            {[...val].length} / {maxLength}
          </Text>
        )}
        <Pressable
          onPress={ok}
          disabled={!enabled}
          style={{
            paddingVertical: 15,
            borderRadius: 14,
            backgroundColor: enabled ? c.ink : c.line,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: enabled ? c.paper : c.sub }}>
            {confirmLabel}
          </Text>
        </Pressable>
        <Pressable onPress={onClose} style={{ paddingVertical: 14, alignItems: 'center', marginTop: 2 }}>
          <Text style={{ fontSize: 15, color: c.sub }}>キャンセル</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

// ── ブックマークフォルダ選択シート ──
export function FolderPickerSheet({
  title = '保存先フォルダ',
  folders,
  isMember,
  onPick,
  onClose,
}: {
  title?: string;
  folders: Folder[];
  isMember?: (folderId: string) => boolean;
  onPick: (folderId: string) => void;
  onClose: () => void;
}) {
  const c = useColors();
  return (
    <Sheet onClose={onClose} title={title}>
      <ScrollView style={{ maxHeight: 320, paddingHorizontal: 16 }}>
        <View style={{ gap: 8 }}>
          {folders.map((f) => {
            const on = isMember ? isMember(f.id) : false;
            return (
              <Pressable
                key={f.id}
                onPress={() => onPick(f.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 14,
                  paddingHorizontal: 15,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: c.line,
                  backgroundColor: c.field,
                }}
              >
                <Icon name="bookmark" size={17} filled={on} color={c.ink} />
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, fontSize: 16, fontWeight: '600', color: c.ink }}
                >
                  {f.name}
                </Text>
                {on && <Icon name="check" size={17} stroke={2.4} color={c.ink} />}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        <Pressable onPress={onClose} style={{ paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: c.sub }}>閉じる</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

// ── 問題数ダイアル ──
export function NumberDial({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: 4,
          backgroundColor: c.field,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: 12,
          paddingVertical: 8,
          paddingHorizontal: 12,
        }}
      >
        <Text
          style={{
            fontSize: 19,
            fontWeight: '700',
            minWidth: 26,
            textAlign: 'right',
            color: disabled ? c.sub : c.ink,
          }}
        >
          {value}
        </Text>
        <Text style={{ fontSize: 12, color: c.sub }}>問</Text>
      </Pressable>
      {open && (
        <DialSheet
          value={value}
          onPick={(v) => {
            onChange(v);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

const ROW = 48;
function DialSheet({
  value,
  onPick,
  onClose,
}: {
  value: number;
  onPick: (v: number) => void;
  onClose: () => void;
}) {
  const c = useColors();
  const ref = useRef<ScrollView>(null);
  const vals = Array.from({ length: 100 }, (_, i) => i + 1);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollTo({ y: (value - 1) * ROW, animated: false }), 0);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <Sheet onClose={onClose} title="問題数">
      <ScrollView
        ref={ref}
        style={{ height: 240 }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW}
        decelerationRate="fast"
      >
        <View style={{ height: 96 }} />
        {vals.map((v) => (
          <Pressable
            key={v}
            onPress={() => onPick(v)}
            style={{ height: ROW, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text
              style={{
                fontSize: v === value ? 30 : 20,
                fontWeight: v === value ? '700' : '400',
                color: v === value ? c.ink : c.sub,
              }}
            >
              {v}
            </Text>
          </Pressable>
        ))}
        <View style={{ height: 96 }} />
      </ScrollView>
    </Sheet>
  );
}

// ── 編集モードのアクション（下部バー） ──
export function EditAction({
  label,
  onPress,
  disabled,
  strong,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  strong?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{ flex: 1, paddingVertical: 10, alignItems: 'center', opacity: disabled ? 0.5 : 1 }}
    >
      <Text
        style={{ fontSize: 14.5, fontWeight: strong ? '700' : '600', color: disabled ? c.sub : c.ink }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function EditBar({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: c.line,
        backgroundColor: c.paper,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: Math.max(10, insets.bottom),
      }}
    >
      {children}
    </View>
  );
}

// ── 空状態 ──
export function EmptyState({ kind }: { kind: string }) {
  const c = useColors();
  const msg: Record<string, string> = {
    bookmark: 'ブックマークした語はまだありません',
    known: '「わかる」に登録した語はまだありません',
    unknown: '「わからない」に登録した語はまだありません',
    history: '出題された語はまだありません',
    browse: '該当する語がありません',
    search: '検索に一致する単語がありません',
  };
  const icon =
    kind === 'bookmark' ? 'bookmark' : kind === 'history' ? 'clock' : kind === 'search' ? 'search' : 'list';
  return (
    <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 }}>
      <Icon name={icon as any} size={40} color={c.line} stroke={1.4} />
      <Text style={{ fontSize: 13.5, marginTop: 14, lineHeight: 22, color: c.sub, textAlign: 'center' }}>
        {msg[kind] || '該当する語がありません'}
      </Text>
    </View>
  );
}

// 画面見出し（h1相当）
export function ScreenTitle({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={style}>
      <Text style={{ fontSize: 30, fontWeight: '800', color: c.ink, marginVertical: 4 }}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.32)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  grabber: { width: 40, height: 5, borderRadius: 999, alignSelf: 'center', marginTop: 8, marginBottom: 4 },
  sheetTitle: { textAlign: 'center', fontSize: 13, fontWeight: '700', paddingVertical: 8, letterSpacing: 1 },
  note: { textAlign: 'center', fontSize: 11.5, paddingHorizontal: 24, paddingBottom: 12, lineHeight: 18 },
});
