// アプリ外殻: タブ切替 / 画面ルーティング / リスト起動の問題 / Proゲート。
// prototype/shell.jsx の Shell を移植。下部タブは常時表示。
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore, type CountKey } from './store/store';
import { useColors } from './theme/theme';
import type { Word } from './data/words';
import { TabBar, type TabKey } from './components/TabBar';
import { BrowseProGate, FolderProGate } from './components/ProGate';
import { QuizScreen } from './screens/QuizScreen';
import { ListScreen } from './screens/ListScreen';
import { BrowseScreen } from './screens/BrowseScreen';
import { FolderListScreen } from './screens/FolderListScreen';
import { MoreScreen } from './screens/MoreScreen';
import { RunnerScreen } from './screens/RunnerScreen';
import { Ev, initAnalytics, setAnalyticsOptOut, setUserPlan, track } from './analytics/analytics';

export function Shell() {
  const store = useStore();
  const c = useColors();
  const [tab, setTab] = useState<TabKey>('quiz');
  const [runner, setRunner] = useState<{ pool: Word[]; random: boolean; countKey: CountKey } | null>(null);
  const [bookmarkView, setBookmarkView] = useState<'list' | 'folders'>('list');
  const [proDialog, setProDialog] = useState(false); // 無料ユーザーがフォルダ追加を踏んだとき
  const [proHighlight, setProHighlight] = useState(false);
  const [quizKey, setQuizKey] = useState(0);
  const pro = store.isPro;

  // pool = 対象の並び順スナップショット（全件）。random は起動元の選択。
  const launch = (pool: Word[], random: boolean) =>
    setRunner({ pool, random, countKey: tab as CountKey });

  const goTab = (k: TabKey) => {
    setRunner(null);
    if (k !== 'more') setProHighlight(false);
    if (k === 'quiz') setQuizKey((x) => x + 1);
    if (k !== 'bookmark') setBookmarkView('list');
    setTab(k);
  };
  const goPro = () => {
    setRunner(null);
    setProDialog(false);
    setTab('more');
    setProHighlight(true);
    setTimeout(() => setProHighlight(false), 2600);
  };
  const openFolders = () => {
    if (!pro) {
      track(Ev.proGateShown, { source: 'folder' });
      setProDialog(true);
      return;
    }
    setBookmarkView('folders');
  };

  // 一覧タブのProゲート表示を計測
  useEffect(() => {
    if (tab === 'browse' && !pro && !runner) {
      track(Ev.proGateShown, { source: 'browse' });
    }
  }, [tab, pro, runner]);

  // 起動時: 分析初期化 → オプトアウト/プランを反映 → 起動イベント（この順で）
  useEffect(() => {
    initAnalytics();
    setAnalyticsOptOut(store.state.analyticsOptOut);
    setUserPlan(store.isPro);
    track(Ev.appOpened);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 分析オプトアウト設定を分析モジュールへ反映
  useEffect(() => {
    setAnalyticsOptOut(store.state.analyticsOptOut);
  }, [store.state.analyticsOptOut]);

  // プラン(Free/Pro)を super property に反映（アクティブユーザーの分解用）
  useEffect(() => {
    setUserPlan(store.isPro);
  }, [store.isPro]);

  // タブ表示（機能の利用/未利用の把握）。初回(quiz)＋切替で送信。
  useEffect(() => {
    track(Ev.tabViewed, { tab });
  }, [tab]);

  let screen: React.ReactNode;
  if (runner) {
    screen = (
      <RunnerScreen
        store={store}
        pool={runner.pool}
        random={runner.random}
        countKey={runner.countKey}
        onClose={() => setRunner(null)}
      />
    );
  } else if (tab === 'quiz') {
    screen = <QuizScreen key={quizKey} />;
  } else if (tab === 'browse') {
    screen = (
      <View style={{ flex: 1 }}>
        <BrowseScreen store={store} onLaunch={launch} />
        {!pro && <BrowseProGate onUpgrade={goPro} onClose={() => goTab('quiz')} />}
      </View>
    );
  } else if (tab === 'bookmark') {
    screen =
      bookmarkView === 'folders' ? (
        <FolderListScreen store={store} onClose={() => setBookmarkView('list')} />
      ) : (
        <ListScreen
          key={'bookmark-' + store.state.activeFolderId}
          store={store}
          listKind="bookmark"
          onLaunch={launch}
          onOpenFolders={openFolders}
        />
      );
  } else if (tab === 'more') {
    screen = <MoreScreen proHighlight={proHighlight} />;
  } else {
    // history
    screen = <ListScreen key={tab} store={store} listKind="history" onLaunch={launch} />;
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1 }}>{screen}</View>
      <TabBar tab={tab} onTab={goTab} />
      {proDialog && (
        <FolderProGate onUpgrade={goPro} onClose={() => setProDialog(false)} />
      )}
    </SafeAreaView>
  );
}
