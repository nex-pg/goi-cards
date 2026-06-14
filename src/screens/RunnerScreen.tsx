// リストから起動した問題（play → result）。prototype/shell.jsx の RunnerScreen。
// 「次の問題」は結果一覧の使い回しではなく、起動元の対象(pool)から生成する:
//  - ランダム: 対象全体を毎回シャッフル
//  - 並び順: 続き（前回の次）から継続
import React, { useMemo, useState } from 'react';
import type { CountKey, StoreApi } from '../store/store';
import type { Word } from '../data/words';
import { drawSession } from '../quiz/session';
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
  const [mode, setMode] = useState<'play' | 'result'>('play');
  // 初回セッション（マウント時に一度だけ生成）
  const initial = useMemo(
    () => drawSession(pool, random, store.state.settings.counts[countKey], 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [session, setSession] = useState<Word[]>(initial.words);
  const [cursor, setCursor] = useState<number>(initial.nextCursor);

  if (mode === 'play')
    return <QuizPlayer store={store} words={session} onFinish={() => setMode('result')} onExit={onClose} />;
  return (
    <QuizResult
      store={store}
      words={session}
      countKey={countKey}
      onRestart={(count) => {
        const next = drawSession(pool, random, count, cursor);
        setSession(next.words);
        setCursor(next.nextCursor);
        setMode('play');
      }}
      onConfig={onClose}
    />
  );
}
