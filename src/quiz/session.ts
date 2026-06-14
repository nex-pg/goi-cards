// 問題セッションの生成ロジック。
// - random=true: 対象プール全体を毎回シャッフルして count 件
// - random=false（並び順）: プールの並びのまま cursor から count 件、次回は続きから
import type { Word } from '../data/words';
import type { CountKey } from '../store/store';
import { shuffle } from '../utils/shuffle';

// リスト/一覧からの起動仕様。pool は「対象の並び順スナップショット（全件）」。
export interface QuizLaunch {
  pool: Word[];
  random: boolean;
  countKey: CountKey;
}

export function drawSession(
  pool: Word[],
  random: boolean,
  count: number,
  cursor: number
): { words: Word[]; nextCursor: number } {
  if (random) {
    return { words: shuffle(pool).slice(0, count), nextCursor: 0 };
  }
  // 並び順: 末尾を超えたら先頭へ戻して継続
  const start = cursor >= pool.length ? 0 : cursor;
  const words = pool.slice(start, start + count);
  return { words, nextCursor: start + words.length };
}
