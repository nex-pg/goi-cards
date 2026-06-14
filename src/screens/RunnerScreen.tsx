// リストから起動した問題（play → result）。prototype/shell.jsx の RunnerScreen。
// 「次の問題」は起動元の対象(pool)から生成する:
//  - ランダム: 出題済みを除外して抽出。続けて押すと対象が減り、出し切ったらリセット。
//  - 並び順: 続き（前回の次）から継続。
// このコンポーネントがマウントされている間だけ used/cursor を積み上げる。
// onClose（別タブ・問題画面に戻る）で破棄され、次回起動時はリフレッシュされる。
import React, { useEffect, useRef, useState } from 'react';
import type { CountKey, StoreApi } from '../store/store';
import type { Word } from '../data/words';
import { drawRandomExcluding, drawSequential } from '../quiz/session';
import { Ev, track } from '../analytics/analytics';
import { QuizPlayer, QuizResult } from './QuizScreen';

export function RunnerScreen({
  store,
  pool,
  random,
  countKey,
  onClose,
}: {
  store: StoreApi;
  pool: Word[];
  random: boolean;
  countKey: CountKey;
  onClose: () => void;
}) {
  const usedRef = useRef<Set<number>>(new Set());
  const cursorRef = useRef(0);

  const make = (count: number): Word[] => {
    if (random) return drawRandomExcluding(pool, count, usedRef.current);
    const r = drawSequential(pool, count, cursorRef.current);
    cursorRef.current = r.nextCursor;
    return r.words;
  };

  const [mode, setMode] = useState<'play' | 'result'>('play');
  const [session, setSession] = useState<Word[]>(() => make(store.state.settings.counts[countKey]));

  useEffect(() => {
    track(Ev.quizStarted, { source: countKey, mode: random ? 'random' : 'order' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (mode === 'play')
    return <QuizPlayer store={store} words={session} onFinish={() => setMode('result')} onExit={onClose} />;
  return (
    <QuizResult
      store={store}
      words={session}
      countKey={countKey}
      onRestart={(count) => {
        setSession(make(count));
        setMode('play');
      }}
      onConfig={onClose}
    />
  );
}
