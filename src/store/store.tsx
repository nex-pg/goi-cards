// ユーザーデータ（端末ローカル）の状態ストア。prototype/vocab-data.jsx の論理を
// TypeScript + MMKV に移植。docs/02-data-model.md の論理モデルを満たす。
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  CATEGORIES,
  LEVELS,
  MAX_BOOKMARKS_PER_FOLDER,
  MAX_FOLDER_NAME,
  MAX_FOLDERS,
  MAX_HISTORY,
  WORD_BY_ID,
  WORDS,
  type Category,
  type Level,
  type Word,
} from '../data/words';
import { readJSON, writeJSON } from './storage';
import { Ev, track } from '../analytics/analytics';

export type Status = 'none' | 'known' | 'unknown';
export type ListKind = 'bookmark' | 'known' | 'unknown' | 'history';
export type Dest = 'known' | 'unknown' | 'bookmark';
export type CountKey = 'quiz' | 'bookmark' | 'known' | 'unknown' | 'history' | 'browse';

// タブごとに記憶する UI 選択状態
export type QuizTagKey = 'none' | 'known' | 'unknown';
export type SortKey = 'kana' | 'reg' | 'custom' | 'recent';
export interface UiState {
  quiz: { cats: Category[]; tags: QuizTagKey[]; levels: Level[] };
  lists: Record<ListKind, { sort: SortKey; random: boolean }>;
  browse: { tags: string[]; cats: string[]; levels: string[]; random: boolean };
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}
export interface TagEntry {
  status: Status;
  statusAt: number;
}
export interface HistoryEntry {
  id: number;
  at: number;
}
export interface TagView {
  status: Status;
  statusAt: number;
  bm: boolean;
  bmAt: number;
}
export interface Snapshot {
  ids: number[];
  tags: Record<number, TagEntry | null>;
  bmAll: Record<number, Record<string, number | null>>;
  history: HistoryEntry[];
}

export interface UserState {
  schemaVersion: number;
  folders: Folder[];
  activeFolderId: string;
  tags: Record<number, TagEntry>;
  bookmarks: Record<string, Record<number, number>>;
  history: HistoryEntry[];
  order: { known: number[]; unknown: number[]; bookmark: Record<string, number[]> };
  settings: { counts: Record<CountKey, number> };
  ui: UiState;
  pro: boolean;
  analyticsOptOut: boolean; // 利用状況の分析送信を停止するか
}

const STORE_KEY = 'goiapp_v1';

const DEFAULT_COUNTS: Record<CountKey, number> = {
  quiz: 10,
  bookmark: 10,
  known: 10,
  unknown: 10,
  history: 10,
  browse: 10,
};

// 各タブの UI 選択の初期値（毎回新しい配列を返す）
function defaultUi(): UiState {
  return {
    quiz: { cats: [...CATEGORIES], tags: ['none', 'unknown'], levels: LEVELS.map((l) => l.code) },
    lists: {
      bookmark: { sort: 'kana', random: true },
      known: { sort: 'kana', random: true },
      unknown: { sort: 'kana', random: true },
      history: { sort: 'recent', random: true },
    },
    browse: { tags: ['all'], cats: ['すべて'], levels: ['すべて'], random: true },
  };
}

// 本番初期状態はクリーン（デモ用のダミータグは入れない）。
function defaultState(): UserState {
  const now = Date.now();
  return {
    schemaVersion: 2,
    folders: [{ id: 'default', name: 'デフォルト', createdAt: now }],
    activeFolderId: 'default',
    tags: {},
    bookmarks: { default: {} },
    history: [],
    order: { known: [], unknown: [], bookmark: { default: [] } },
    settings: { counts: { ...DEFAULT_COUNTS } },
    ui: defaultUi(),
    pro: false,
    analyticsOptOut: false,
  };
}

// 旧データに ui が無い場合に補完（不足キーは初期値で埋める）。
function ensureUi(s: UserState): UserState {
  const d = defaultUi();
  const u: any = (s as any).ui || {};
  s.ui = {
    quiz: { ...d.quiz, ...(u.quiz || {}) },
    lists: {
      bookmark: { ...d.lists.bookmark, ...(u.lists?.bookmark || {}) },
      known: { ...d.lists.known, ...(u.lists?.known || {}) },
      unknown: { ...d.lists.unknown, ...(u.lists?.unknown || {}) },
      history: { ...d.lists.history, ...(u.lists?.history || {}) },
    },
    browse: { ...d.browse, ...(u.browse || {}) },
  };
  return s;
}

function ensureCounts(s: UserState): UserState {
  const old = (s.settings || {}) as { counts?: Partial<Record<CountKey, number>> };
  const seed = old.counts || {};
  s.settings = { counts: { ...DEFAULT_COUNTS, ...seed } };
  if (typeof s.pro !== 'boolean') s.pro = false;
  if (typeof s.analyticsOptOut !== 'boolean') s.analyticsOptOut = false;
  if (Array.isArray(s.folders)) {
    s.folders = s.folders.map((f) => (f.id === 'default' ? { ...f, name: 'デフォルト' } : f));
  }
  return s;
}

// 旧スキーマからの移行。将来スキーマ変更時はここにバージョン分岐を足す。
function migrate(s: any): UserState {
  if (!s || typeof s !== 'object') return defaultState();
  if (s.schemaVersion >= 2 && s.bookmarks && s.folders) return s as UserState;
  const now = Date.now();
  const tags: Record<number, TagEntry> = {};
  const bm: Record<number, number> = {};
  Object.entries(s.tags || {}).forEach(([id, t]: [string, any]) => {
    tags[Number(id)] = { status: t.status || 'none', statusAt: t.statusAt || 0 };
    if (t.bm) bm[Number(id)] = t.bmAt || now;
  });
  const oldOrder = s.order && Array.isArray(s.order.bookmark) ? s.order.bookmark : [];
  return {
    schemaVersion: 2,
    folders: [{ id: 'default', name: 'デフォルト', createdAt: now }],
    activeFolderId: 'default',
    tags,
    bookmarks: { default: bm },
    history: s.history || [],
    order: {
      known: (s.order && s.order.known) || [],
      unknown: (s.order && s.order.unknown) || [],
      bookmark: { default: oldOrder },
    },
    settings: s.settings || { counts: { ...DEFAULT_COUNTS } },
    ui: (s as any).ui || defaultUi(),
    pro: !!s.pro,
    analyticsOptOut: !!s.analyticsOptOut,
  };
}

// 読み込んだ状態の構造を最低限つじつま合わせ（壊れた保存データ・孤立参照への防御）。
function normalize(s: UserState): UserState {
  const folders = Array.isArray(s.folders) && s.folders.length ? s.folders : [{ id: 'default', name: 'デフォルト', createdAt: Date.now() }];
  const folderIds = new Set(folders.map((f) => f.id));
  // 全フォルダに bookmarks エントリを保証（無いと toggle/assign が孤立セットを作る）
  const bookmarks = { ...(s.bookmarks || {}) };
  folders.forEach((f) => {
    if (!bookmarks[f.id]) bookmarks[f.id] = {};
  });
  // activeFolderId が存在しなければ default に戻す
  const activeFolderId = folderIds.has(s.activeFolderId) ? s.activeFolderId : 'default';
  return { ...s, folders, bookmarks, activeFolderId };
}

function loadState(): UserState {
  // 移行処理で万一エラーが出てもクラッシュさせない（クラッシュ→再インストール＝本当の消失を防ぐ）。
  // 注意: アップデート間で STORE_KEY / MMKV id を変えると保存が読めなくなる（=消えたように見える）ので絶対に変えない。
  try {
    const raw = readJSON<any>(STORE_KEY);
    if (raw) return normalize(ensureUi(ensureCounts(migrate(raw))));
  } catch (e) {
    if (__DEV__) console.warn('[store] 読み込み/移行に失敗。既定値で起動します', e);
  }
  return defaultState();
}

// 語id が含まれるブックマークフォルダidの一覧
function foldersWith(state: UserState, id: number): string[] {
  return state.folders.map((f) => f.id).filter((fid) => (state.bookmarks[fid] || {})[id] != null);
}

// Undo用スナップショット（対象idのtag / 全フォルダのbm所属 / 履歴該当分）
export function buildSnapshot(state: UserState, ids: number[]): Snapshot {
  const snap: Snapshot = { ids: [...ids], tags: {}, bmAll: {}, history: [] };
  ids.forEach((id) => {
    snap.tags[id] = state.tags[id] || null;
    snap.bmAll[id] = {};
    state.folders.forEach((f) => {
      snap.bmAll[id][f.id] = (state.bookmarks[f.id] || {})[id] != null ? state.bookmarks[f.id][id] : null;
    });
  });
  snap.history = state.history.filter((h) => ids.includes(h.id));
  return snap;
}

export interface StoreApi {
  state: UserState;
  getTag: (id: number) => TagView;
  isPro: boolean;
  wordVisible: (id: number) => boolean;
  visibleWords: Word[];
  setStatus: (id: number, status: Status) => void;
  toggleBookmark: (id: number, folderId?: string) => void;
  assignTo: (ids: number[], dest: Dest, folderId?: string) => void;
  removeFrom: (ids: number[], listKind: ListKind, folderId?: string) => void;
  saveCustomOrder: (listKind: ListKind, ids: number[], folderId?: string) => void;
  removeAllTags: (ids: number[]) => void;
  restore: (snap: Snapshot) => void;
  buildSnapshot: (ids: number[]) => Snapshot;
  createFolder: (name: string) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  deleteFolders: (ids: string[]) => void;
  reorderFolders: (orderedIds: string[]) => void;
  setActiveFolder: (id: string) => void;
  bookmarkFoldersOf: (id: number) => string[];
  bookmarkCount: (folderId?: string) => number;
  recordHistory: (id: number) => void;
  setCount: (key: CountKey, n: number) => void;
  setPro: (v: boolean) => void;
  setEntitlement: (v: boolean) => void;
  setAnalyticsOptOut: (v: boolean) => void;
  setQuizFilters: (f: UiState['quiz']) => void;
  setListPref: (kind: ListKind, pref: Partial<UiState['lists'][ListKind]>) => void;
  setBrowsePref: (pref: Partial<UiState['browse']>) => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UserState>(loadState);
  // RevenueCat の entitlement(pro)。永続化しない（毎起動 RevenueCat が真実の源）。
  const [entitlementPro, setEntitlementPro] = useState(false);

  useEffect(() => {
    writeJSON(STORE_KEY, state);
  }, [state]);

  const getTag = useCallback(
    (id: number): TagView => {
      const t = state.tags[id] || ({} as Partial<TagEntry>);
      const at = (state.bookmarks[state.activeFolderId] || {})[id];
      return { status: t.status || 'none', statusAt: t.statusAt || 0, bm: at != null, bmAt: at || 0 };
    },
    [state]
  );

  const setStatus = useCallback((id: number, status: Status) => {
    setState((s) => {
      const cur = s.tags[id] || { status: 'none' as Status, statusAt: 0 };
      const next: Status = cur.status === status ? 'none' : status;
      track(Ev.tagSet, { status: next });
      return {
        ...s,
        tags: { ...s.tags, [id]: { status: next, statusAt: next === 'none' ? 0 : Date.now() } },
      };
    });
  }, []);

  const toggleBookmark = useCallback((id: number, folderId?: string) => {
    setState((s) => {
      const fid = folderId || s.activeFolderId;
      const folder = { ...(s.bookmarks[fid] || {}) };
      if (folder[id] != null) {
        delete folder[id];
        track(Ev.bookmarkToggled, { added: false });
      } else {
        // 上限（1フォルダ200件）に達していたら追加しない
        if (Object.keys(folder).length >= MAX_BOOKMARKS_PER_FOLDER) return s;
        folder[id] = Date.now();
        track(Ev.bookmarkToggled, { added: true });
      }
      return { ...s, bookmarks: { ...s.bookmarks, [fid]: folder } };
    });
  }, []);

  const assignTo = useCallback((ids: number[], dest: Dest, folderId?: string) => {
    setState((s) => {
      if (dest === 'bookmark') {
        const fid = folderId || s.activeFolderId;
        const folder = { ...(s.bookmarks[fid] || {}) };
        // 空き枠（200 - 現在件数）の分だけ追加。超過分は無視。
        let room = MAX_BOOKMARKS_PER_FOLDER - Object.keys(folder).length;
        ids.forEach((id) => {
          if (folder[id] == null && room > 0) {
            folder[id] = Date.now();
            room--;
          }
        });
        return { ...s, bookmarks: { ...s.bookmarks, [fid]: folder } };
      }
      const tags = { ...s.tags };
      ids.forEach((id) => {
        if (dest === 'known') tags[id] = { status: 'known', statusAt: Date.now() };
        if (dest === 'unknown') tags[id] = { status: 'unknown', statusAt: Date.now() };
      });
      return { ...s, tags };
    });
  }, []);

  const removeFrom = useCallback((ids: number[], listKind: ListKind, folderId?: string) => {
    setState((s) => {
      if (listKind === 'bookmark') {
        const fid = folderId || s.activeFolderId;
        const folder = { ...(s.bookmarks[fid] || {}) };
        ids.forEach((id) => {
          delete folder[id];
        });
        const bo = { ...(s.order.bookmark || {}) };
        if (bo[fid]) bo[fid] = bo[fid].filter((id) => !ids.includes(id));
        return { ...s, bookmarks: { ...s.bookmarks, [fid]: folder }, order: { ...s.order, bookmark: bo } };
      }
      const tags = { ...s.tags };
      let history = s.history;
      ids.forEach((id) => {
        const cur = tags[id];
        if (!cur) return;
        if (listKind === 'known' && cur.status === 'known') tags[id] = { status: 'none', statusAt: 0 };
        if (listKind === 'unknown' && cur.status === 'unknown') tags[id] = { status: 'none', statusAt: 0 };
      });
      if (listKind === 'history') history = s.history.filter((h) => !ids.includes(h.id));
      const order = { ...s.order };
      if (listKind === 'known') order.known = order.known.filter((id) => !ids.includes(id));
      if (listKind === 'unknown') order.unknown = order.unknown.filter((id) => !ids.includes(id));
      return { ...s, tags, history, order };
    });
  }, []);

  const saveCustomOrder = useCallback((listKind: ListKind, ids: number[], folderId?: string) => {
    setState((s) => {
      if (listKind === 'bookmark') {
        const fid = folderId || s.activeFolderId;
        return { ...s, order: { ...s.order, bookmark: { ...(s.order.bookmark || {}), [fid]: ids } } };
      }
      if (listKind === 'known') return { ...s, order: { ...s.order, known: ids } };
      if (listKind === 'unknown') return { ...s, order: { ...s.order, unknown: ids } };
      return s;
    });
  }, []);

  const removeAllTags = useCallback((ids: number[]) => {
    setState((s) => {
      const tags = { ...s.tags };
      ids.forEach((id) => {
        if (tags[id]) tags[id] = { status: 'none', statusAt: 0 };
      });
      const fid = s.activeFolderId;
      const folder = { ...(s.bookmarks[fid] || {}) };
      ids.forEach((id) => {
        delete folder[id];
      });
      return { ...s, tags, bookmarks: { ...s.bookmarks, [fid]: folder } };
    });
  }, []);

  const restore = useCallback((snap: Snapshot) => {
    setState((s) => {
      const tags = { ...s.tags };
      const bookmarks = { ...s.bookmarks };
      (snap.ids || []).forEach((id) => {
        if (snap.tags[id] == null) delete tags[id];
        else tags[id] = snap.tags[id]!;
        const per = snap.bmAll ? snap.bmAll[id] : null;
        if (per) {
          Object.keys(per).forEach((fid) => {
            const folder = { ...(bookmarks[fid] || {}) };
            if (per[fid] == null) delete folder[id];
            else folder[id] = per[fid]!;
            bookmarks[fid] = folder;
          });
        }
      });
      let history = s.history;
      if (snap.history && snap.history.length) {
        const hids = new Set(snap.history.map((h) => h.id));
        history = [...s.history.filter((h) => !hids.has(h.id)), ...snap.history].sort((a, b) => a.at - b.at);
      }
      return { ...s, tags, bookmarks, history };
    });
  }, []);

  // ── ブックマークフォルダ管理（Pro機能） ──
  const createFolder = useCallback(
    (name: string): string => {
      // 上限到達時は作成しない（未作成のidを返さない・分析も過剰計上しない）
      if (state.folders.length >= MAX_FOLDERS) return '';
      const id = 'f' + Date.now();
      setState((s) => {
        if (s.folders.length >= MAX_FOLDERS) return s; // 念のための二重チェック
        const nm = (name || '新しいフォルダ').slice(0, MAX_FOLDER_NAME);
        return {
          ...s,
          folders: [...s.folders, { id, name: nm, createdAt: Date.now() }],
          bookmarks: { ...s.bookmarks, [id]: {} },
        };
      });
      track(Ev.folderCreated);
      return id;
    },
    [state]
  );

  const renameFolder = useCallback((id: string, name: string) => {
    setState((s) => ({
      ...s,
      folders: s.folders.map((f) =>
        f.id === id ? { ...f, name: (name || f.name).slice(0, MAX_FOLDER_NAME) } : f
      ),
    }));
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setState((s) => {
      if (id === 'default' || s.folders.length <= 1) return s;
      const bookmarks = { ...s.bookmarks };
      delete bookmarks[id];
      const bo = { ...(s.order.bookmark || {}) };
      delete bo[id];
      return {
        ...s,
        folders: s.folders.filter((f) => f.id !== id),
        bookmarks,
        order: { ...s.order, bookmark: bo },
        activeFolderId: s.activeFolderId === id ? 'default' : s.activeFolderId,
      };
    });
  }, []);

  const deleteFolders = useCallback((ids: string[]) => {
    setState((s) => {
      const del = ids.filter((id) => id !== 'default');
      if (!del.length) return s;
      const bookmarks = { ...s.bookmarks };
      const bo = { ...(s.order.bookmark || {}) };
      del.forEach((id) => {
        delete bookmarks[id];
        delete bo[id];
      });
      const folders = s.folders.filter((f) => !del.includes(f.id));
      const activeFolderId = del.includes(s.activeFolderId) ? 'default' : s.activeFolderId;
      return { ...s, folders, bookmarks, order: { ...s.order, bookmark: bo }, activeFolderId };
    });
  }, []);

  // デフォルトは先頭固定で並べ替え
  const reorderFolders = useCallback((orderedIds: string[]) => {
    setState((s) => {
      const rest = orderedIds.filter((id) => id !== 'default');
      const byId = Object.fromEntries(s.folders.map((f) => [f.id, f]));
      const next = ['default', ...rest].map((id) => byId[id]).filter(Boolean) as Folder[];
      s.folders.forEach((f) => {
        if (!next.includes(f)) next.push(f);
      });
      return { ...s, folders: next };
    });
  }, []);

  const setActiveFolder = useCallback((id: string) => {
    setState((s) => ({ ...s, activeFolderId: id }));
  }, []);

  const bookmarkFoldersOf = useCallback((id: number) => foldersWith(state, id), [state]);
  const bookmarkCount = useCallback(
    (folderId?: string) => Object.keys(state.bookmarks[folderId || state.activeFolderId] || {}).length,
    [state]
  );

  const recordHistory = useCallback((id: number) => {
    setState((s) => {
      const history = [...s.history.filter((h) => h.id !== id), { id, at: Date.now() }];
      // 最新 MAX_HISTORY 件のみ保持（末尾が新しい）
      const trimmed = history.length > MAX_HISTORY ? history.slice(history.length - MAX_HISTORY) : history;
      return { ...s, history: trimmed };
    });
  }, []);

  const setCount = useCallback((key: CountKey, n: number) => {
    setState((s) => ({ ...s, settings: { ...s.settings, counts: { ...s.settings.counts, [key]: n } } }));
  }, []);

  const setPro = useCallback((v: boolean) => setState((s) => ({ ...s, pro: !!v })), []);
  // IAP 層（RevenueCat）から entitlement を反映する。
  const setEntitlement = useCallback((v: boolean) => setEntitlementPro(!!v), []);
  const setAnalyticsOptOut = useCallback(
    (v: boolean) => setState((s) => ({ ...s, analyticsOptOut: !!v })),
    []
  );

  // ── タブごとの UI 選択状態（フィルタ/ソート/ランダム）の保存 ──
  const setQuizFilters = useCallback((f: UiState['quiz']) => {
    setState((s) => ({ ...s, ui: { ...s.ui, quiz: f } }));
  }, []);
  const setListPref = useCallback(
    (kind: ListKind, pref: Partial<UiState['lists'][ListKind]>) => {
      setState((s) => ({
        ...s,
        ui: { ...s.ui, lists: { ...s.ui.lists, [kind]: { ...s.ui.lists[kind], ...pref } } },
      }));
    },
    []
  );
  const setBrowsePref = useCallback((pref: Partial<UiState['browse']>) => {
    setState((s) => ({ ...s, ui: { ...s.ui, browse: { ...s.ui.browse, ...pref } } }));
  }, []);

  // free/pro 出し分け（docs/02 §3）。無料は plan==='free' のみ。
  // 本番は RevenueCat の entitlement が真実。開発ビルドではテストトグル(state.pro)でも ON にできる。
  const isPro = entitlementPro || (__DEV__ && !!state.pro);
  const wordVisible = useCallback(
    (id: number) => {
      const w = WORD_BY_ID.get(id);
      if (!w) return false;
      return isPro || w.plan !== 'pro';
    },
    [isPro]
  );
  const visibleWords = useMemo(() => (isPro ? WORDS : WORDS.filter((w) => w.plan !== 'pro')), [isPro]);

  const value: StoreApi = {
    state,
    getTag,
    isPro,
    wordVisible,
    visibleWords,
    setStatus,
    toggleBookmark,
    assignTo,
    removeFrom,
    saveCustomOrder,
    removeAllTags,
    restore,
    buildSnapshot: (ids: number[]) => buildSnapshot(state, ids),
    createFolder,
    renameFolder,
    deleteFolder,
    deleteFolders,
    reorderFolders,
    setActiveFolder,
    bookmarkFoldersOf,
    bookmarkCount,
    recordHistory,
    setCount,
    setPro,
    setEntitlement,
    setAnalyticsOptOut,
    setQuizFilters,
    setListPref,
    setBrowsePref,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useStore must be used within StoreProvider');
  return v;
}

export function fmtDate(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
