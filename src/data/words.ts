// 単語マスター（読み取り専用・アプリ同梱）。docs/02-data-model.md 準拠。
// ここは不変データ。State には入れず、モジュールスコープの定数 + Map で持つ。
import raw from '../assets/words.combined.json';

export type Category = '二字熟語' | '四字熟語' | '慣用句' | 'ことわざ' | '用語';
export type Level = '易' | '普' | '難';
export type Plan = 'free' | 'pro';
export type Sub = 'ビジネス' | '日常' | null;

export interface Word {
  id: number;
  term: string;
  yomi: string;
  meaning: string;
  cat: Category;
  sub: Sub;
  level: Level;
  plan: Plan;
}

export const CATEGORIES: Category[] = ['二字熟語', '四字熟語', '慣用句', 'ことわざ', '用語'];

// 難易度: code(内部) ↔ label(表示)。易=学生 / 普=大人 / 難=普段使わない
export const LEVELS: { code: Level; label: string }[] = [
  { code: '易', label: '易しい' },
  { code: '普', label: '普通' },
  { code: '難', label: '難しい' },
];

// ブックマークフォルダの上限・名前長（全角文字数）
export const MAX_FOLDERS = 100;
export const MAX_FOLDER_NAME = 30;
// 1フォルダが保持できるブックマーク件数の上限
export const MAX_BOOKMARKS_PER_FOLDER = 200;
// 履歴の保持件数（最新N件）
export const MAX_HISTORY = 200;

export const WORDS: Word[] = (raw as { words: Word[] }).words;

export const WORD_BY_ID: Map<number, Word> = new Map(WORDS.map((w) => [w.id, w]));

// pro限定語の総数（無料ユーザーへの「+◯語はPro」表示などに使う）
export const PRO_WORD_COUNT = WORDS.filter((w) => w.plan === 'pro').length;

// 見出し順（yomi 昇順）。yomi はひらがなのため符号位置順＝五十音順で正しく並ぶ。
export function byYomi(a: Word, b: Word): number {
  return a.yomi < b.yomi ? -1 : a.yomi > b.yomi ? 1 : 0;
}
