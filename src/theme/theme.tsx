// デザイントークン（完全モノクロ）と Theme Provider。docs/04 §6 準拠。
// 色相は使わない。ステータスは塗り/白抜き/アイコンで区別する。
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { readJSON, writeJSON } from '../store/storage';
import { useStore } from '../store/store';

export interface Colors {
  ink: string; // 文字
  paper: string; // 面
  bg: string; // 背景
  sub: string; // 補助文字（ラベル等。薄め）
  text2: string; // 二次テキスト（意味・ふりがな等。subより濃く読みやすい）
  line: string; // 罫線
  field: string; // 入力/チップ地
}

export const LIGHT: Colors = {
  ink: '#1a1a18',
  paper: '#ffffff',
  bg: '#f1f0ec',
  sub: '#8c8c86',
  text2: '#57564f',
  line: '#e6e5e0',
  field: '#f0efea',
};

export const DARK: Colors = {
  ink: '#f4f3ef',
  paper: '#1e1e1c',
  bg: '#121211',
  sub: '#b4b4ac',
  text2: '#c8c7c0',
  line: '#34332f',
  field: '#26251f',
};

export type ThemeMode = 'light' | 'dark';
export type TermFont = '明朝' | 'ゴシック';

// 見出し書体。本番は expo-font で Noto Serif JP / Noto Sans JP を同梱する想定。
// フォント未同梱でも動くよう、プラットフォーム標準の serif / sans を使う。
export const TERM_FONT_SERIF = 'serif';
export const TERM_FONT_SANS = 'System';

interface ThemeValue {
  mode: ThemeMode;
  dark: boolean;
  colors: Colors;
  termFont: TermFont;
  termFontFamily: string;
  setMode: (m: ThemeMode) => void;
  setTermFont: (f: TermFont) => void;
}

const PREFS_KEY = 'goiapp_prefs_v1';

interface Prefs {
  mode: ThemeMode;
  termFont: TermFont;
}

function loadPrefs(): Prefs {
  const saved = readJSON<Partial<Prefs>>(PREFS_KEY);
  // 既定はライトモード。ダークは Pro 機能（下記 useTheme で出し分け）。
  return {
    mode: saved?.mode ?? 'light',
    termFont: saved?.termFont ?? '明朝',
  };
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);

  const persist = useCallback((next: Prefs) => {
    setPrefs(next);
    writeJSON(PREFS_KEY, next);
  }, []);

  const setMode = useCallback((mode: ThemeMode) => persist({ ...prefsRef.current, mode }), [persist]);
  const setTermFont = useCallback(
    (termFont: TermFont) => persist({ ...prefsRef.current, termFont }),
    [persist]
  );

  // 最新 prefs を callback から参照するための ref
  const prefsRef = React.useRef(prefs);
  prefsRef.current = prefs;

  // ダークは Pro 機能。非Proでは設定が dark でも実効はライトに固定。
  const isPro = useStore().isPro;

  const value = useMemo<ThemeValue>(() => {
    const dark = isPro && prefs.mode === 'dark';
    return {
      mode: prefs.mode,
      dark,
      colors: dark ? DARK : LIGHT,
      termFont: prefs.termFont,
      termFontFamily: prefs.termFont === 'ゴシック' ? TERM_FONT_SANS : TERM_FONT_SERIF,
      setMode,
      setTermFont,
    };
  }, [prefs, isPro, setMode, setTermFont]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const v = useContext(ThemeContext);
  if (!v) throw new Error('useTheme must be used within ThemeProvider');
  return v;
}

export function useColors(): Colors {
  return useTheme().colors;
}
