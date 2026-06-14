// 問題セッションの生成ロジック。
// - ランダム: 出題済み(used)を除外して count 件。全部出し切ったら used をリセットして再開。
// - 並び順: プールの並びのまま cursor から count 件、次回は続きから（末尾で先頭へ）。
//
// 「次の問題スタート」を連続で押す間だけ used / cursor を積み上げる。
// 別タブ・設定画面に戻る＝呼び出し側のコンポーネントが再マウント/破棄され、状態がリセットされる。
import type { Word } from '../data/words';
import { shuffle } from '../utils/shuffle';

// ランダム: used に無い語から抽出。候補が尽きたら used をクリアして全体から。
export function drawRandomExcluding(pool: Word[], count: number, used: Set<number>): Word[] {
  let candidates = pool.filter((w) => !used.has(w.id));
  if (candidates.length === 0) {
    used.clear();
    candidates = pool;
  }
  const picked = shuffle(candidates).slice(0, count);
  picked.forEach((w) => used.add(w.id));
  return picked;
}

// 並び順: cursor から count 件。末尾を超えたら先頭へ戻して継続。
export function drawSequential(
  pool: Word[],
  count: number,
  cursor: number
): { words: Word[]; nextCursor: number } {
  const start = cursor >= pool.length ? 0 : cursor;
  const words = pool.slice(start, start + count);
  return { words, nextCursor: start + words.length };
}
