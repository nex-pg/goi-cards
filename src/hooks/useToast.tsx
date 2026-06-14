// Undo対応トースト。prototype/ui.jsx の Toast/useToast を移植。
// ルート（タブの上）に1つだけ重ねて表示する Provider 方式。
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme/theme';

interface ToastData {
  msg: string;
  actionLabel?: string;
  onAction?: () => void;
}

type ShowToast = (msg: string, actionLabel?: string, onAction?: () => void) => void;

const ToastContext = createContext<ShowToast | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colors = useColors();

  const show = useCallback<ShowToast>((msg, actionLabel, onAction) => {
    setToast({ msg, actionLabel, onAction });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), actionLabel ? 5200 : 1700);
  }, []);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  const hasAction = !!toast?.actionLabel;

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <View pointerEvents="box-none" style={styles.wrap}>
          <View
            style={[
              styles.toast,
              { backgroundColor: colors.ink },
              hasAction ? styles.toastWithAction : null,
            ]}
            pointerEvents={hasAction ? 'auto' : 'none'}
          >
            <Text style={[styles.msg, { color: colors.paper }]}>{toast.msg}</Text>
            {hasAction && (
              <Pressable
                onPress={() => {
                  toast.onAction?.();
                  hide();
                }}
                style={[styles.actionBtn, { backgroundColor: colors.paper }]}
              >
                <Text style={[styles.actionLabel, { color: colors.ink }]}>{toast.actionLabel}</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const v = useContext(ToastContext);
  if (!v) throw new Error('useToast must be used within ToastProvider');
  return v;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 96,
    alignItems: 'center',
    zIndex: 300,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 999,
    maxWidth: 360,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  toastWithAction: {
    paddingVertical: 10,
    paddingLeft: 20,
    paddingRight: 12,
  },
  msg: { fontSize: 13.5, fontWeight: '600' },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  actionLabel: { fontSize: 12.5, fontWeight: '800' },
});
