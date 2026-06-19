// 一覧タブ（辞書ブラウズ + 検索 + タグ/分類/難易度の絞り込み + 編集）。Pro機能。
// prototype/lists.jsx の BrowseScreen を移植。
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CATEGORIES, LEVELS, MAX_BOOKMARKS_PER_FOLDER, PRO_WORD_COUNT, byYomi, type Word } from '../data/words';
import { useStore, type Dest, type Snapshot, type StoreApi } from '../store/store';
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
  PillChip,
  StatusBadge,
  panel,
} from '../components/ui';
import { StartBar } from '../components/StartBar';
import { WordRow } from '../components/WordRow';

const DEST_LABEL: Record<Dest, string> = { known: 'わかる', unknown: 'わからない', bookmark: 'ブックマーク' };
const ALL_TAG = 'all';
const ALL = 'すべて';

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

export function BrowseScreen({ store, onLaunch }: { store: StoreApi; onLaunch: (pool: Word[], random: boolean) => void }) {
  const c = useColors();
  const toast = useToast();
  // フィルタ・ランダム選択は store に保存（記憶される）
  const browse = store.state.ui.browse;
  const count = store.state.settings.counts.browse;
  const setCount = (n: number) => store.setCount('browse', n);
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(true); // タグ/分類/難易度の3行の開閉
  const random = browse.random;
  const setRandom = (fn: (r: boolean) => boolean) => store.setBrowsePref({ random: fn(random) });
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [savePrompt, setSavePrompt] = useState(false);
  const [confirm, setConfirm] = useState<{ message: string; label: string; onConfirm: () => void } | null>(null);
  const [folderPick, setFolderPick] = useState<{ ids: number[]; snap: Snapshot } | null>(null);

  // 「すべて」ロジック: allKey ONで他OFF / 他ONでall OFF / 空ならallへ戻す
  const applyMulti = (current: string[], key: string, allKey: string): string[] => {
    if (key === allKey) return [allKey];
    let n = current.filter((k) => k !== allKey);
    n = n.includes(key) ? n.filter((k) => k !== key) : [...n, key];
    return n.length === 0 ? [allKey] : n;
  };
  const toggleTag = (key: string) => store.setBrowsePref({ tags: applyMulti(browse.tags, key, ALL_TAG) });
  const toggleCat = (key: string) => store.setBrowsePref({ cats: applyMulti(browse.cats, key, ALL) });
  const toggleLevel = (key: string) => store.setBrowsePref({ levels: applyMulti(browse.levels, key, ALL) });

  // フィルタ変更で選択クリア（配列参照は変更時のみ変わるので安全）
  useEffect(() => {
    setSelected(new Set());
  }, [browse.tags, browse.cats, browse.levels]);

  const filtered = useMemo(() => {
    const tags = new Set(browse.tags);
    const cats = new Set(browse.cats);
    const levels = new Set(browse.levels);
    const tagAll = tags.has(ALL_TAG);
    const catAll = cats.has(ALL);
    const levelAll = levels.has(ALL);
    return store.visibleWords
      .filter((w) => catAll || cats.has(w.cat))
      .filter((w) => levelAll || levels.has(w.level))
      .filter((w) => {
        if (tagAll) return true;
        const t = store.getTag(w.id);
        if (tags.has('bookmark') && t.bm) return true;
        if (tags.has('none') && t.status === 'none' && !t.bm) return true;
        if (tags.has('unknown') && t.status === 'unknown') return true;
        if (tags.has('known') && t.status === 'known') return true;
        return false;
      })
      .filter((w) => {
        const q = query.trim();
        return q === '' || w.term.includes(q) || w.yomi.includes(q);
      })
      .sort(byYomi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.state, browse.tags, browse.cats, browse.levels, query]);
  const ids = filtered.map((w) => w.id);

  const launch = () => {
    // 一覧の「対象」= 現在のフィルタ結果（見出順）。抽出は Runner 側で random/並び順に応じて行う。
    if (filtered.length) onLaunch(filtered, random);
  };
  const toggleSel = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const allSelected = ids.length > 0 && selected.size === ids.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(ids));

  // フォルダに実際に追加できる件数（非メンバー＆空き枠でキャップ）
  const addableToFolder = (arr: number[], fid: string) => {
    const folder = store.state.bookmarks[fid] || {};
    const nonMembers = arr.filter((id) => folder[id] == null).length;
    const room = Math.max(0, MAX_BOOKMARKS_PER_FOLDER - Object.keys(folder).length);
    return Math.min(nonMembers, room);
  };
  const saveBookmark = (arr: number[], fid: string, s: Snapshot, fname: string) => {
    const added = addableToFolder(arr, fid);
    if (added === 0) {
      toast(`このフォルダは${MAX_BOOKMARKS_PER_FOLDER}件までです`);
      return;
    }
    store.assignTo(arr, 'bookmark', fid);
    const suffix = added < arr.length ? `（上限${MAX_BOOKMARKS_PER_FOLDER}のため一部）` : '';
    toast(`${added}件を「${fname}」に保存${suffix}`, 'もとに戻す', () => store.restore(s));
    setSelected(new Set());
  };

  const runAssign = (dest: Dest) => {
    const a = [...selected];
    const s = store.buildSnapshot(a);
    if (dest === 'bookmark') {
      if (store.state.folders.length > 1) {
        setFolderPick({ ids: a, snap: s });
        return;
      }
      saveBookmark(a, 'default', s, 'ブックマーク');
      return;
    }
    store.assignTo(a, dest);
    toast(`${a.length}件に「${DEST_LABEL[dest]}」を付与`, 'もとに戻す', () => store.restore(s));
    setSelected(new Set());
  };
  const saveToFolder = (fid: string) => {
    if (!folderPick) return;
    const { ids: fids, snap: s } = folderPick;
    const fname = store.state.folders.find((f) => f.id === fid)?.name || '';
    saveBookmark(fids, fid, s, fname);
    setFolderPick(null);
  };
  const onPickDest = (dest: string) => {
    setSavePrompt(false);
    const n = selected.size;
    if (n >= 50)
      setConfirm({
        message: `選択した ${n}件に「${DEST_LABEL[dest as Dest]}」を付与します。`,
        label: '付与する',
        onConfirm: () => {
          runAssign(dest as Dest);
          setConfirm(null);
        },
      });
    else runAssign(dest as Dest);
  };
  const doRemoveTags = () => {
    const n = selected.size;
    if (!n) return;
    setConfirm({
      message: `選択した ${n}件のタグ（わかる・わからない・ブックマーク）をすべて解除します。単語自体は削除されません。`,
      label: 'タグを解除',
      onConfirm: () => {
        const a = [...selected];
        const s = store.buildSnapshot(a);
        store.removeAllTags(a);
        toast(`${a.length}件のタグを解除しました`, 'もとに戻す', () => store.restore(s));
        setSelected(new Set());
        setConfirm(null);
      },
    });
  };

  const tagChips = [
    { k: ALL_TAG, l: 'すべて' },
    { k: 'none', l: 'タグなし' },
    { k: 'unknown', l: 'わからない' },
    { k: 'known', l: 'わかる' },
    { k: 'bookmark', l: 'ブックマーク' },
  ];
  const catChips = [{ key: ALL, label: 'すべて' }, ...CATEGORIES.map((c2) => ({ key: c2, label: c2 }))];
  const levelChips = [{ key: ALL, label: 'すべて' }, ...LEVELS.map((l) => ({ key: l.code, label: l.label }))];

  const hideRemoveTags = browse.tags.length === 1 && browse.tags[0] === 'none';

  const renderRowRight = (w: Word) => {
    const t = store.getTag(w.id);
    if (editing) {
      return (
        <>
          {t.bm && <Icon name="bookmark" size={15} filled color={c.sub} />}
          <StatusBadge status={t.status} />
        </>
      );
    }
    return (
      <>
        {t.bm && (
          <Pressable
            onPress={() => {
              store.toggleBookmark(w.id);
              toast('ブックマークを解除');
            }}
            hitSlop={6}
            style={{ padding: 6 }}
          >
            <Icon name="bookmark" size={16} filled color={c.ink} />
          </Pressable>
        )}
        {(t.status === 'known' || t.status === 'unknown') && (
          <Pressable
            onPress={() => {
              store.setStatus(w.id, t.status);
              toast(`「${t.status === 'known' ? 'わかる' : 'わからない'}」を解除`);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 4 }}
          >
            <StatusBadge status={t.status} />
            <Icon name="cross" size={12} color={c.sub} />
          </Pressable>
        )}
      </>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: c.ink }}>一覧</Text>
          {/* 検索バー */}
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={{ position: 'absolute', left: 11, zIndex: 1 }}>
              <Icon name="search" size={16} color={c.sub} />
            </View>
            <TextInput
              value={query}
              onChangeText={(t) => setQuery([...t].slice(0, 30).join(''))}
              placeholder="検索"
              placeholderTextColor={c.sub}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              style={{
                paddingVertical: 9,
                paddingLeft: 34,
                paddingRight: 32,
                borderRadius: 11,
                borderWidth: 1,
                borderColor: c.line,
                backgroundColor: c.field,
                color: c.ink,
                fontSize: 14,
              }}
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => setQuery('')}
                hitSlop={8}
                style={{
                  position: 'absolute',
                  right: 7,
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  backgroundColor: c.sub,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="cross" size={11} stroke={2.4} color={c.paper} />
              </Pressable>
            )}
          </View>
          {/* 絞り込み3行の開閉トグル（編集の左） */}
          <Pressable
            onPress={() => setFiltersOpen((v) => !v)}
            hitSlop={8}
            style={{ paddingVertical: 4, paddingHorizontal: 2 }}
          >
            <Icon name={filtersOpen ? 'chevDown' : 'chevR'} size={20} color={c.ink} />
          </Pressable>
          {ids.length > 0 && (
            <Pressable
              onPress={() => {
                setEditing((e) => !e);
                setSelected(new Set());
              }}
              style={{ paddingVertical: 4 }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>{editing ? '完了' : '編集'}</Text>
            </Pressable>
          )}
        </View>

        {/* タグ/分類/難易度の3行（トグルで開閉。スタート行は常時表示） */}
        {filtersOpen && (
          <>
            {/* タグフィルタ */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 10 }}>
              {tagChips.map((ch) => (
                <PillChip key={ch.k} label={ch.l} on={browse.tags.includes(ch.k)} onPress={() => toggleTag(ch.k)} />
              ))}
            </ScrollView>
            {/* 分類フィルタ */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 10 }}>
              {catChips.map((ch) => (
                <PillChip key={ch.key} label={ch.label} on={browse.cats.includes(ch.key)} onPress={() => toggleCat(ch.key)} />
              ))}
            </ScrollView>
            {/* 難易度フィルタ */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 12 }}>
              {levelChips.map((ch) => (
                <PillChip key={ch.key} label={ch.label} on={browse.levels.includes(ch.key)} onPress={() => toggleLevel(ch.key)} />
              ))}
            </ScrollView>
          </>
        )}

        {!editing && <StartBar count={count} setCount={setCount} random={random} setRandom={setRandom} onStart={launch} n={ids.length} />}
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 20 }}>
        <Text style={{ fontSize: 12, color: c.sub, marginBottom: 8, paddingLeft: 2 }}>
          {ids.length} 語 ・ 見出順
          {query.trim() ? `・「${query.trim()}」で検索中` : !editing ? ' ・ 右のタグをタップで解除' : ''}
          {!store.isPro && PRO_WORD_COUNT > 0 ? (
            <Text style={{ color: c.ink, fontWeight: '600' }}> ・ +{PRO_WORD_COUNT}語はPro</Text>
          ) : null}
        </Text>
        {ids.length === 0 ? (
          <EmptyState kind={query.trim() ? 'search' : 'browse'} />
        ) : (
          <View style={[panel(c), { flex: 1, overflow: 'hidden' }]}>
            <FlatList
              data={filtered}
              keyExtractor={(w) => String(w.id)}
              renderItem={({ item, index }) => {
                const sel = selected.has(item.id);
                return (
                  <WordRow
                    word={item}
                    isLast={index === filtered.length - 1}
                    leading={
                      editing ? (
                        <Pressable onPress={() => toggleSel(item.id)} hitSlop={8}>
                          <SelectDot selected={sel} />
                        </Pressable>
                      ) : undefined
                    }
                    right={renderRowRight(item)}
                  />
                );
              }}
            />
          </View>
        )}
      </View>

      {editing && (
        <EditBar>
          <EditAction label={allSelected ? '選択を解除' : '全て選択'} onPress={toggleAll} />
          {!hideRemoveTags && (
            <EditAction label="タグ解除" onPress={doRemoveTags} disabled={selected.size === 0} strong />
          )}
          <EditAction label="保存" onPress={() => selected.size && setSavePrompt(true)} disabled={selected.size === 0} />
        </EditBar>
      )}

      {savePrompt && (
        <ChoiceSheet
          title="付与するタグ"
          note="選択した語にタグを付けます（わかる⇄わからないは排他）"
          options={[
            { key: 'known', label: 'わかる' },
            { key: 'unknown', label: 'わからない' },
            { key: 'bookmark', label: 'ブックマーク' },
          ]}
          onPick={onPickDest}
          onClose={() => setSavePrompt(false)}
        />
      )}
      {confirm && (
        <ConfirmSheet title="確認" message={confirm.message} confirmLabel={confirm.label} onConfirm={confirm.onConfirm} onClose={() => setConfirm(null)} />
      )}
      {folderPick && (
        <FolderPickerSheet
          title="保存先フォルダ"
          folders={store.state.folders}
          isMember={(fid) => folderPick.ids.every((id) => (store.state.bookmarks[fid] || {})[id] != null)}
          onPick={saveToFolder}
          onClose={() => setFolderPick(null)}
        />
      )}
    </View>
  );
}
