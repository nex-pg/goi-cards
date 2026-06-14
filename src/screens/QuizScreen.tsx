// 問題タブ: 設定(フィルタ) → カード(タップでめくる/横スワイプ送り) → 結果。
// prototype/quiz.jsx を React Native + gesture-handler + reanimated に移植。
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CATEGORIES, LEVELS, WORD_BY_ID, type Category, type Level, type Word } from '../data/words';
import { useStore, type CountKey, type StoreApi, type UiState } from '../store/store';
import { useColors, useTheme } from '../theme/theme';
import { shuffle } from '../utils/shuffle';
import { Icon, type IconName } from '../components/Icon';
import {
  CheckChip,
  FolderPickerSheet,
  NumberDial,
  ScreenTitle,
  StatusBadge,
  panel,
} from '../components/ui';
import { WordRow } from '../components/WordRow';

const W = Dimensions.get('window').width;
type TagKey = 'none' | 'unknown' | 'known';
const TAG_LABEL: Record<TagKey, string> = { none: 'タグなし', known: 'わかる', unknown: 'わからない' };

// 現在のフィルタに合致する出題プール（フィルタは store に保存され記憶される）
function quizPool(store: StoreApi, f: UiState['quiz']): Word[] {
  return store.visibleWords
    .filter((w) => f.cats.includes(w.cat))
    .filter((w) => f.levels.includes(w.level))
    .filter((w) => {
      const st = store.getTag(w.id).status;
      if (st === 'none') return f.tags.includes('none');
      if (st === 'known') return f.tags.includes('known');
      if (st === 'unknown') return f.tags.includes('unknown');
      return false;
    });
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: c.sub, letterSpacing: 1.5, marginBottom: 11 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

// ── 設定画面 ──
function QuizConfig({ store, onStart }: { store: StoreApi; onStart: () => void }) {
  const c = useColors();
  const f = store.state.ui.quiz;
  const count = store.state.settings.counts.quiz;
  const setCount = (n: number) => store.setCount('quiz', n);

  const toggleCat = (cat: Category) =>
    store.setQuizFilters({ ...f, cats: f.cats.includes(cat) ? f.cats.filter((x) => x !== cat) : [...f.cats, cat] });
  const toggleTag = (t: TagKey) =>
    store.setQuizFilters({ ...f, tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t] });
  const toggleLevel = (l: Level) =>
    store.setQuizFilters({ ...f, levels: f.levels.includes(l) ? f.levels.filter((x) => x !== l) : [...f.levels, l] });

  const pool = quizPool(store, f);
  const canStart = f.cats.length > 0 && f.tags.length > 0 && f.levels.length > 0 && pool.length > 0;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 }}>
      <ScreenTitle style={{ marginBottom: 18 }}>問題</ScreenTitle>

      <Section label="分類">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
          {CATEGORIES.map((cat) => (
            <CheckChip key={cat} label={cat} checked={f.cats.includes(cat)} onPress={() => toggleCat(cat)} />
          ))}
        </View>
      </Section>

      <Section label="タグ">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
          {(['none', 'unknown', 'known'] as TagKey[]).map((t) => (
            <CheckChip key={t} label={TAG_LABEL[t]} checked={f.tags.includes(t)} onPress={() => toggleTag(t)} />
          ))}
        </View>
      </Section>

      <Section label="難易度">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
          {LEVELS.map((l) => (
            <CheckChip
              key={l.code}
              label={l.label}
              checked={f.levels.includes(l.code)}
              onPress={() => toggleLevel(l.code)}
            />
          ))}
        </View>
      </Section>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 }}>
        <NumberDial value={count} onChange={setCount} />
        <Text style={{ fontSize: 12.5, color: c.sub }}>
          該当 <Text style={{ color: c.ink, fontWeight: '700' }}>{pool.length}</Text> 語
        </Text>
      </View>

      <Pressable
        onPress={() => canStart && onStart()}
        disabled={!canStart}
        style={{
          marginTop: 16,
          paddingVertical: 17,
          borderRadius: 15,
          alignItems: 'center',
          backgroundColor: canStart ? c.ink : c.line,
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: '700', letterSpacing: 2, color: canStart ? c.paper : c.sub }}>
          スタート
        </Text>
      </Pressable>
      {pool.length === 0 && (
        <Text style={{ textAlign: 'center', fontSize: 12.5, color: c.sub, marginTop: 10 }}>
          条件に合う語がありません。分類・タグ・難易度を見直してください。
        </Text>
      )}
    </ScrollView>
  );
}

// ── 3ボタン ──
function ActionBtn({
  label,
  icon,
  active,
  onPress,
  filledIcon,
}: {
  label: string;
  icon: IconName;
  active: boolean;
  onPress: () => void;
  filledIcon?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: c.ink,
        backgroundColor: active ? c.ink : 'transparent',
      }}
    >
      <Icon name={icon} size={21} filled={!!filledIcon && active} color={active ? c.paper : c.ink} />
      <Text style={{ fontSize: 11.5, fontWeight: '600', color: active ? c.paper : c.ink }}>{label}</Text>
    </Pressable>
  );
}

// ── プレイ画面（カード） ──
export function QuizPlayer({
  store,
  words,
  onFinish,
  onExit,
}: {
  store: StoreApi;
  words: Word[];
  onFinish: () => void;
  onExit: () => void;
}) {
  const c = useColors();
  const { termFontFamily } = useTheme();
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [folderPick, setFolderPick] = useState(false);
  const tx = useSharedValue(0);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { rotate: `${tx.value * 0.012}deg` }],
  }));

  const word = words[idx];

  useEffect(() => {
    if (word) store.recordHistory(word.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  if (!word) return null;
  const tag = store.getTag(word.id);
  const bmFolders = store.bookmarkFoldersOf(word.id);

  const onBookmark = () => {
    if (store.state.folders.length > 1) {
      setFolderPick(true);
      return;
    }
    store.toggleBookmark(word.id, 'default');
  };

  const commitGo = (dir: number) => {
    const target = idx + dir;
    if (dir > 0 && target >= words.length) {
      onFinish();
      return;
    }
    if (dir < 0 && target < 0) {
      onExit();
      return;
    }
    setRevealed(false);
    setIdx(target);
    tx.value = 0;
  };

  const toggleReveal = () => setRevealed((r) => !r);

  // タップ（前へ/次へボタン）でも移動できるように。スワイプと同じ演出で確定。
  const go = (dir: number) => {
    tx.value = withTiming(dir > 0 ? -W : W, { duration: 180 }, (fin) => {
      if (fin) runOnJS(commitGo)(dir);
    });
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = e.translationX;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > 64 && Math.abs(e.translationX) > Math.abs(e.translationY)) {
        const dir = e.translationX < 0 ? 1 : -1;
        tx.value = withTiming(dir > 0 ? -W : W, { duration: 180 }, (fin) => {
          if (fin) runOnJS(commitGo)(dir);
        });
      } else {
        tx.value = withSpring(0, { damping: 18, stiffness: 200 });
      }
    });
  const tap = Gesture.Tap().maxDistance(10).onEnd(() => {
    runOnJS(toggleReveal)();
  });
  const gesture = Gesture.Race(pan, tap);

  const isTerm = word.cat === '用語';
  const subline = revealed ? (isTerm ? `（${word.sub}）` : word.yomi) : '';

  return (
    <View style={{ flex: 1 }}>
      {/* 進捗 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 6,
        }}
      >
        <Pressable onPress={onExit} style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevL" size={22} color={c.ink} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '700', letterSpacing: 1, color: c.ink }}>
          {idx + 1}
          <Text style={{ color: c.sub, fontWeight: '500' }}> / {words.length}</Text>
        </Text>
        <View style={{ width: 38 }} />
      </View>
      {/* 進捗バー */}
      <View
        style={{
          height: 3,
          backgroundColor: c.line,
          marginHorizontal: 20,
          marginTop: 6,
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <View style={{ height: '100%', backgroundColor: c.ink, width: `${((idx + 1) / words.length) * 100}%` }} />
      </View>

      {/* カード */}
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 }}>
        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[
              panel(c),
              {
                flex: 1,
                borderRadius: 22,
                padding: 22,
                shadowColor: '#000',
                shadowOpacity: 0.04,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              },
              cardStyle,
            ]}
          >
            {/* 見出し語 */}
            <View
              style={{
                flex: revealed ? 0 : 1,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 92,
                paddingTop: revealed ? 8 : 0,
              }}
            >
              <Text
                style={{
                  fontFamily: termFontFamily,
                  fontWeight: '600',
                  textAlign: 'center',
                  lineHeight: word.term.length > 8 ? 38 : 52,
                  color: c.ink,
                  fontSize: word.term.length > 8 ? 30 : 42,
                }}
              >
                {word.term}
              </Text>
            </View>

            {/* 答え */}
            <View
              style={{
                flex: revealed ? 1 : 0,
                justifyContent: 'center',
                borderTopWidth: 1,
                borderTopColor: c.line,
                marginTop: 14,
                paddingTop: 18,
              }}
            >
              {revealed ? (
                <View>
                  <Text style={{ fontSize: 21, lineHeight: 36, color: c.ink, textAlign: 'center', fontWeight: '500' }}>
                    {word.meaning}
                  </Text>
                  <Text style={{ fontSize: 15, color: c.text2, textAlign: 'center', marginTop: 14, letterSpacing: 0.5 }}>
                    {subline}
                  </Text>
                </View>
              ) : (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <Icon name="flip" size={22} color={c.sub} />
                  <Text style={{ fontSize: 13, letterSpacing: 1, color: c.sub }}>タップで答え</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* 前へ/次へ（タップでも移動可。スワイプが苦手な人向け） */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingTop: 2,
          paddingBottom: 2,
        }}
      >
        <Pressable
          onPress={() => go(-1)}
          hitSlop={10}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 8, paddingHorizontal: 8 }}
        >
          <Icon name="chevL" size={18} color={c.sub} />
          <Text style={{ fontSize: 13.5, color: c.sub, fontWeight: '600' }}>前へ</Text>
        </Pressable>
        <Pressable
          onPress={() => go(1)}
          hitSlop={10}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 8, paddingHorizontal: 8 }}
        >
          <Text style={{ fontSize: 13.5, color: c.sub, fontWeight: '600' }}>次へ</Text>
          <Icon name="chevR" size={18} color={c.sub} />
        </Pressable>
      </View>

      {/* 3ボタン */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 16 }}>
        <ActionBtn label="わかる" icon="check" active={tag.status === 'known'} onPress={() => store.setStatus(word.id, 'known')} />
        <ActionBtn
          label="わからない"
          icon="cross"
          active={tag.status === 'unknown'}
          onPress={() => store.setStatus(word.id, 'unknown')}
        />
        <ActionBtn label="ブックマーク" icon="bookmark" active={bmFolders.length > 0} filledIcon onPress={onBookmark} />
      </View>

      {folderPick && (
        <FolderPickerSheet
          title="ブックマーク先フォルダ"
          folders={store.state.folders}
          isMember={(fid) => (store.state.bookmarks[fid] || {})[word.id] != null}
          onPick={(fid) => store.toggleBookmark(word.id, fid)}
          onClose={() => setFolderPick(false)}
        />
      )}
    </View>
  );
}

// ── 結果画面 ──
export function QuizResult({
  store,
  words,
  onRestart,
  onConfig,
  countKey = 'quiz',
}: {
  store: StoreApi;
  words: Word[];
  onRestart: (count: number) => void;
  onConfig: () => void;
  countKey?: CountKey;
}) {
  const c = useColors();
  const count = store.state.settings.counts[countKey];
  const setCount = (n: number) => store.setCount(countKey, n);
  const knownN = words.filter((w) => store.getTag(w.id).status === 'known').length;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <ScreenTitle style={{ marginBottom: 14 }}>結果</ScreenTitle>
        <View
          style={[
            panel(c),
            { paddingVertical: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: 14 },
          ]}
        >
          <Text style={{ fontSize: 15, color: c.sub }}>全</Text>
          <Text style={{ fontSize: 30, fontWeight: '800', color: c.ink }}>{words.length}</Text>
          <Text style={{ fontSize: 15, color: c.sub, marginRight: 12 }}>問中</Text>
          <Text style={{ fontSize: 30, fontWeight: '800', color: c.ink }}>{knownN}</Text>
          <Text style={{ fontSize: 15, color: c.sub }}>問わかる</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <Pressable
            onPress={() => onRestart(count)}
            style={{ flex: 1, paddingVertical: 15, borderRadius: 14, backgroundColor: c.ink, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 15.5, fontWeight: '700', color: c.paper }}>次の問題スタート</Text>
          </Pressable>
          <NumberDial value={count} onChange={setCount} />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={[panel(c), { overflow: 'hidden' }]}>
          {words.map((w, i) => (
            <WordRow key={w.id} word={w} isLast={i === words.length - 1} right={<StatusBadge status={store.getTag(w.id).status} />} />
          ))}
        </View>
        <Pressable onPress={onConfig} style={{ marginTop: 16, alignSelf: 'center' }}>
          <Text style={{ color: c.sub, fontSize: 13.5, textDecorationLine: 'underline' }}>問題設定にもどる</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ── 親 ──
export function QuizScreen() {
  const store = useStore();
  const [mode, setMode] = useState<'config' | 'play' | 'result'>('config');
  const [session, setSession] = useState<Word[]>([]);

  // 設定したフィルタ（store保存）から毎回あたらしくランダム抽出する。
  // 「次の問題」も結果一覧の使い回しではなく、フィルタを起点に再生成する。
  const draw = () => {
    const pool = quizPool(store, store.state.ui.quiz);
    const count = store.state.settings.counts.quiz;
    return shuffle(pool).slice(0, count);
  };
  const startFresh = () => {
    setSession(draw());
    setMode('play');
  };

  if (mode === 'play')
    return (
      <QuizPlayer
        store={store}
        words={session}
        onFinish={() => setMode('result')}
        onExit={() => setMode('config')}
      />
    );
  if (mode === 'result')
    return (
      <QuizResult
        store={store}
        words={session}
        onRestart={() => startFresh()}
        onConfig={() => setMode('config')}
      />
    );
  return <QuizConfig store={store} onStart={() => startFresh()} />;
}
