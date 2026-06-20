// リスト系画面（ブックマーク / わかる / わからない / 履歴）。
// 共通の List コンポーネントを listKind で出し分け（prototype/lists.jsx の ListScreen）。
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { MAX_BOOKMARKS_PER_FOLDER, WORD_BY_ID, byYomi, type Word } from '../data/words';
import { useStore, type Dest, type ListKind, type SortKey, type Snapshot, type StoreApi } from '../store/store';
import { useColors } from '../theme/theme';
import { useToast } from '../hooks/useToast';
import { Icon } from '../components/Icon';
import {
  ChoiceSheet,
  ConfirmSheet,
  EditAction,
  EditBar,
  EmptyState,
  FolderPickerSheet,
  SegTabs,
  StatusBadge,
  panel,
} from '../components/ui';
import { StartBar } from '../components/StartBar';
import { SwipeRow } from '../components/SwipeRow';
import { WordRow } from '../components/WordRow';

interface ListMeta {
  title: string;
  kindTag: ListKind;
  noSort?: boolean;
  destOptions: { key: string; label: string }[];
  destNote?: string;
}

const LIST_META: Record<ListKind, ListMeta> = {
  bookmark: {
    title: 'ブックマーク',
    kindTag: 'bookmark',
    destOptions: [
      { key: 'known', label: 'わかる' },
      { key: 'unknown', label: 'わからない' },
      { key: 'bookmark', label: '他のブックマークフォルダに保存' },
    ],
  },
  known: {
    title: 'わかる',
    kindTag: 'known',
    destOptions: [
      { key: 'unknown', label: 'わからない' },
      { key: 'bookmark', label: 'ブックマーク' },
    ],
    destNote: '「わからない」に保存すると「わかる」からは消えます',
  },
  unknown: {
    title: 'わからない',
    kindTag: 'unknown',
    destOptions: [
      { key: 'known', label: 'わかる' },
      { key: 'bookmark', label: 'ブックマーク' },
    ],
    destNote: '「わかる」に保存すると「わからない」からは消えます',
  },
  history: {
    title: '履歴',
    kindTag: 'history',
    noSort: true,
    destOptions: [
      { key: 'known', label: 'わかる' },
      { key: 'unknown', label: 'わからない' },
      { key: 'bookmark', label: 'ブックマーク' },
    ],
  },
};

function SelectDot({ selected }: { selected: boolean }) {
  const c = useColors();
  return (
    <View
      style={{
        width: 21,
        height: 21,
        borderRadius: 999,
        borderWidth: selected ? 1 : 1.5,
        borderColor: selected ? c.ink : c.line,
        backgroundColor: selected ? c.ink : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {selected && <Icon name="check" size={13} stroke={2.6} color={c.paper} />}
    </View>
  );
}

export function ListScreen({
  store,
  listKind,
  onLaunch,
  onOpenFolders,
}: {
  store: StoreApi;
  listKind: ListKind;
  onLaunch: (pool: Word[], random: boolean) => void;
  onOpenFolders?: () => void;
}) {
  const c = useColors();
  const toast = useToast();
  const meta = LIST_META[listKind];
  // ソート順・ランダム選択はタブごとに store へ保存（記憶される）
  const sort = store.state.ui.lists[listKind].sort;
  const setSort = (s: SortKey) => store.setListPref(listKind, { sort: s });
  const random = store.state.ui.lists[listKind].random;
  const setRandom = (fn: (r: boolean) => boolean) => store.setListPref(listKind, { random: fn(random) });
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [draft, setDraft] = useState<number[] | null>(null);
  const count = store.state.settings.counts[listKind];
  const setCount = (n: number) => store.setCount(listKind, n);
  const [savePrompt, setSavePrompt] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [folderPick, setFolderPick] = useState<{ ids: number[]; snap: Snapshot } | null>(null);
  const [pickNotice, setPickNotice] = useState(''); // フォルダピッカー内の通知（Modalの裏に隠れるトーストの代替）

  // ソース語の id 配列
  const baseIds = useMemo(() => {
    if (listKind === 'history') {
      return [...store.state.history]
        .sort((a, b) => b.at - a.at)
        .map((h) => h.id)
        .filter((id) => WORD_BY_ID.has(id) && store.wordVisible(id));
    }
    let arr: Word[];
    if (listKind === 'bookmark') arr = store.visibleWords.filter((w) => store.getTag(w.id).bm);
    else if (listKind === 'known') arr = store.visibleWords.filter((w) => store.getTag(w.id).status === 'known');
    else arr = store.visibleWords.filter((w) => store.getTag(w.id).status === 'unknown');
    return arr.map((w) => w.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.state, listKind]);

  // 並び替え適用
  const tsOf = (id: number) => (listKind === 'bookmark' ? store.getTag(id).bmAt : store.getTag(id).statusAt);
  const orderedIds = useMemo(() => {
    if (listKind === 'history') {
      if (sort === 'kana') return [...baseIds].sort((a, b) => byYomi(WORD_BY_ID.get(a)!, WORD_BY_ID.get(b)!));
      return baseIds; // recent
    }
    if (sort === 'kana') return [...baseIds].sort((a, b) => byYomi(WORD_BY_ID.get(a)!, WORD_BY_ID.get(b)!));
    if (sort === 'reg') return [...baseIds].sort((a, b) => tsOf(b) - tsOf(a));
    // custom
    const saved =
      (listKind === 'bookmark'
        ? (store.state.order.bookmark || {})[store.state.activeFolderId]
        : listKind === 'known'
        ? store.state.order.known
        : store.state.order.unknown) || [];
    const inSaved = saved.filter((id) => baseIds.includes(id));
    const rest = baseIds.filter((id) => !inSaved.includes(id));
    return [...inSaved, ...rest];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseIds, sort, store.state.order]);

  const displayIds = editing && draft ? draft : orderedIds;
  const displayWords = displayIds.map((id) => WORD_BY_ID.get(id)).filter(Boolean) as Word[];

  const enterEdit = () => {
    setEditing(true);
    setDraft(orderedIds);
    setSelected(new Set());
  };
  const exitEdit = () => {
    if (draft && !meta.noSort) {
      store.saveCustomOrder(meta.kindTag, draft);
      setSort('custom');
    }
    setEditing(false);
    setDraft(null);
    setSelected(new Set());
  };
  const toggleSel = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const allSelected = displayIds.length > 0 && selected.size === displayIds.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(displayIds));

  const deleteIds = (ids: number[]) => {
    if (!ids.length) return;
    store.removeFrom(ids, meta.kindTag);
    setDraft((d) => (d ? d.filter((id) => !ids.includes(id)) : d));
    toast(`${ids.length}件を削除しました`);
  };
  const confirmDelete = () => {
    deleteIds([...selected]);
    setSelected(new Set());
    setConfirmDel(false);
  };
  const saveBookmark = (ids: number[], fid: string, snap: Snapshot, fname: string) => {
    const folder = store.state.bookmarks[fid] || {};
    const nonMembers = ids.filter((id) => folder[id] == null).length; // まだ入っていない件数
    const room = Math.max(0, MAX_BOOKMARKS_PER_FOLDER - Object.keys(folder).length);
    const added = Math.min(nonMembers, room);
    if (added === 0) {
      toast(nonMembers === 0 ? `すでに「${fname}」に保存済みです` : `このフォルダは${MAX_BOOKMARKS_PER_FOLDER}件までです`);
      return;
    }
    store.assignTo(ids, 'bookmark', fid);
    // 「一部のみ」は“上限で切れた時だけ”表示（既に保存済みの分は除外して判定）
    const suffix = added < nonMembers ? `（上限${MAX_BOOKMARKS_PER_FOLDER}のため一部）` : '';
    toast(`${added}件を「${fname}」に保存${suffix}`);
    setSelected(new Set());
  };
  const doSave = (dest: string) => {
    const ids = [...selected];
    const snap = store.buildSnapshot(ids);
    setSavePrompt(false);
    if (dest === 'bookmark') {
      if (store.state.folders.length > 1) {
        setFolderPick({ ids, snap });
        return;
      }
      saveBookmark(ids, 'default', snap, 'ブックマーク');
      return;
    }
    store.assignTo(ids, dest as Dest);
    const label = dest === 'known' ? 'わかる' : 'わからない';
    toast(`${ids.length}件を「${label}」に保存`);
    setSelected(new Set());
  };
  // 複数フォルダ対応: タップでそのフォルダへ追加/解除をトグル（シートは閉じない）。
  // - 選択中の全アイテムがそのフォルダに入っていれば → まとめて解除
  // - そうでなければ → 非メンバーを空き枠まで追加
  const toggleFolder = (fid: string) => {
    if (!folderPick) return;
    const ids = folderPick.ids;
    const folder = store.state.bookmarks[fid] || {};
    const fname = store.state.folders.find((f) => f.id === fid)?.name || '';
    const allIn = ids.every((id) => folder[id] != null);
    if (allIn) {
      store.removeFrom(ids, 'bookmark', fid); // 解除
      setPickNotice('');
      return;
    }
    const nonMembers = ids.filter((id) => folder[id] == null).length;
    const room = Math.max(0, MAX_BOOKMARKS_PER_FOLDER - Object.keys(folder).length);
    if (nonMembers > room) {
      // 全部入れると上限(200)を超える → 部分保存せず、シート内に即時通知（タップしたフォルダの直下）
      setPickNotice(`「${fname}」は${MAX_BOOKMARKS_PER_FOLDER}件まで。選択分が入りきりません`);
      return;
    }
    store.assignTo(ids, 'bookmark', fid); // 追加（全件入る）
    setPickNotice('');
  };

  const launch = () => {
    // 対象の並び順スナップショット（全件）を渡す。抽出は Runner 側で random/並び順に応じて行う。
    if (displayWords.length) onLaunch(displayWords, random);
  };

  const onTapStatus =
    listKind === 'bookmark' || listKind === 'history'
      ? (id: number, st: 'known' | 'unknown') => {
          store.setStatus(id, st);
          toast(`「${st === 'known' ? 'わかる' : 'わからない'}」を解除`);
        }
      : null;

  const sortOpts: { key: SortKey; label: string }[] =
    listKind === 'history'
      ? [
          { key: 'recent', label: '出題順' },
          { key: 'kana', label: '見出順' },
        ]
      : [
          { key: 'kana', label: '見出順' },
          { key: 'reg', label: '登録順' },
          { key: 'custom', label: 'カスタム' },
        ];

  const activeFolderName = store.state.folders.find((f) => f.id === store.state.activeFolderId)?.name || 'デフォルト';

  // 行右側（非編集）: ステータスバッジ（bookmark/history はタップで解除）
  const renderRight = (id: number) => {
    const st = store.getTag(id).status;
    if (st !== 'known' && st !== 'unknown') return null;
    if (!onTapStatus) return <StatusBadge status={st} />;
    return (
      <Pressable
        onPress={() => onTapStatus(id, st)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 4 }}
      >
        <StatusBadge status={st} />
        <Icon name="cross" size={12} color={c.sub} />
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* ヘッダ */}
      <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: c.ink, marginVertical: 4 }}>{meta.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {listKind === 'bookmark' && !editing && (
              <Pressable
                onPress={onOpenFolders}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}
              >
                <Icon name="bookmark" size={15} filled color={c.ink} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>フォルダ</Text>
              </Pressable>
            )}
            {baseIds.length > 0 && (
              <Pressable onPress={editing ? exitEdit : enterEdit} style={{ paddingVertical: 4 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>{editing ? '完了' : '編集'}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {!meta.noSort && (
          <View style={{ marginBottom: 12 }}>
            <SegTabs value={sort} options={sortOpts} onChange={setSort} disabled={editing} />
          </View>
        )}
        <StartBar count={count} setCount={setCount} random={random} setRandom={setRandom} onStart={launch} disabled={editing} n={displayIds.length} />
        {listKind === 'bookmark' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 10 }}>
            <Icon name="bookmark" size={14} filled color={c.sub} />
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 12.5, fontWeight: '600', color: c.sub }}>
              {activeFolderName}
            </Text>
            {/* 件数（名前が長くても見えるよう flexShrink:0 で固定） */}
            <Text style={{ flexShrink: 0, fontSize: 12.5, fontWeight: '600', color: c.sub }}>・ {displayIds.length} 語</Text>
          </View>
        )}
      </View>

      {/* リスト本体 */}
      <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 20 }}>
        {displayIds.length === 0 ? (
          <EmptyState kind={listKind} />
        ) : (
          <View style={[panel(c), { flex: 1, overflow: 'hidden' }]}>
            {editing && !meta.noSort ? (
              // 編集モード（並べ替え可）: D&D + 選択
              <DraggableFlatList
                data={displayWords}
                keyExtractor={(w) => String(w.id)}
                onDragEnd={({ data }) => setDraft(data.map((w) => w.id))}
                renderItem={({ item, drag, isActive, getIndex }) => {
                  const i = getIndex() ?? 0;
                  const sel = selected.has(item.id);
                  return (
                    <ScaleDecorator>
                      <WordRow
                        word={item}
                        isLast={i === displayWords.length - 1}
                        leading={
                          <Pressable onPress={() => toggleSel(item.id)} hitSlop={8}>
                            <SelectDot selected={sel} />
                          </Pressable>
                        }
                        right={
                          <Pressable onPressIn={drag} disabled={isActive} hitSlop={8}>
                            <Icon name="drag" size={20} color={c.sub} />
                          </Pressable>
                        }
                      />
                    </ScaleDecorator>
                  );
                }}
              />
            ) : (
              // 通常 / 編集モード（履歴=並べ替え不可）
              <FlatList
                data={displayWords}
                keyExtractor={(w) => String(w.id)}
                renderItem={({ item, index }) => {
                  const isLast = index === displayWords.length - 1;
                  if (editing) {
                    const sel = selected.has(item.id);
                    return (
                      <WordRow
                        word={item}
                        isLast={isLast}
                        leading={
                          <Pressable onPress={() => toggleSel(item.id)} hitSlop={8}>
                            <SelectDot selected={sel} />
                          </Pressable>
                        }
                        right={<StatusBadge status={store.getTag(item.id).status} />}
                      />
                    );
                  }
                  return (
                    <SwipeRow onDelete={() => deleteIds([item.id])}>
                      <WordRow word={item} isLast={isLast} right={renderRight(item.id)} />
                    </SwipeRow>
                  );
                }}
              />
            )}
          </View>
        )}
      </View>

      {/* 編集バー */}
      {editing && (
        <EditBar>
          <EditAction label={allSelected ? '選択を解除' : '全て選択'} onPress={toggleAll} />
          <EditAction label="削除" onPress={() => selected.size && setConfirmDel(true)} disabled={selected.size === 0} strong />
          <EditAction label="保存" onPress={() => selected.size && setSavePrompt(true)} disabled={selected.size === 0} />
        </EditBar>
      )}

      {savePrompt && (
        <ChoiceSheet title="保存先" note={meta.destNote} options={meta.destOptions} onPick={doSave} onClose={() => setSavePrompt(false)} />
      )}
      {folderPick && (
        <FolderPickerSheet
          title="保存先フォルダ（タップで追加/解除・複数可）"
          folders={store.state.folders}
          isMember={(fid) => folderPick.ids.every((id) => (store.state.bookmarks[fid] || {})[id] != null)}
          onPick={toggleFolder}
          notice={pickNotice}
          onClose={() => {
            setFolderPick(null);
            setSelected(new Set());
            setPickNotice('');
          }}
        />
      )}
      {confirmDel && (
        <ConfirmSheet
          title="削除"
          message={`選択した ${selected.size}件をこのリストから削除します。`}
          onConfirm={confirmDelete}
          onClose={() => setConfirmDel(false)}
        />
      )}
    </View>
  );
}
