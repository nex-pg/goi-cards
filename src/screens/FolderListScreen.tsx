// ブックマークフォルダ一覧ページ（Pro機能: 複数管理）。prototype/lists.jsx の FolderListScreen。
// デフォルトは先頭固定（改名・削除・並べ替え不可）。最大100・名前30字。
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { MAX_FOLDERS, MAX_FOLDER_NAME } from '../data/words';
import { useStore, type Folder, type StoreApi } from '../store/store';
import { useColors } from '../theme/theme';
import { useToast } from '../hooks/useToast';
import { Icon } from '../components/Icon';
import { ConfirmSheet, EditAction, EditBar, PromptSheet, panel } from '../components/ui';

function SelectDot({ selected, disabled }: { selected: boolean; disabled?: boolean }) {
  const c = useColors();
  return (
    <View
      style={{
        width: 21,
        height: 21,
        borderRadius: 999,
        opacity: disabled ? 0.3 : 1,
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

export function FolderListScreen({ store, onClose }: { store: StoreApi; onClose: () => void }) {
  const c = useColors();
  const toast = useToast();
  const folders = store.state.folders;
  const active = store.state.activeFolderId;
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [draft, setDraft] = useState<string[] | null>(null); // 非デフォルトの並び
  const [addPrompt, setAddPrompt] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [maxAlert, setMaxAlert] = useState(false);

  const onlyDefault = folders.length <= 1;
  const atMax = folders.length >= MAX_FOLDERS;
  const byId = useMemo(() => Object.fromEntries(folders.map((f) => [f.id, f])), [folders]);

  const defaultFolder = folders.find((f) => f.id === 'default')!;
  const nonDefaultIds = (editing && draft ? draft : folders.filter((f) => f.id !== 'default').map((f) => f.id)).filter(
    (id) => byId[id]
  );
  const nonDefaultFolders = nonDefaultIds.map((id) => byId[id]) as Folder[];

  const enterEdit = () => {
    setEditing(true);
    setDraft(folders.filter((f) => f.id !== 'default').map((f) => f.id));
    setSelected(new Set());
  };
  const exitEdit = () => {
    if (draft) store.reorderFolders(['default', ...draft]);
    setEditing(false);
    setDraft(null);
    setSelected(new Set());
  };
  const toggleSel = (id: string) => {
    if (id === 'default') return;
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const confirmDelete = () => {
    const arr = [...selected];
    store.deleteFolders(arr);
    toast(`${arr.length}件のフォルダを削除`);
    setSelected(new Set());
    setDraft((d) => (d ? d.filter((id) => !arr.includes(id)) : d));
    setConfirmDel(false);
  };
  const pickFolder = (id: string) => {
    if (editing) return;
    store.setActiveFolder(id);
    onClose();
  };
  const openAdd = () => {
    if (atMax) {
      setMaxAlert(true);
      return;
    }
    setAddPrompt(true);
  };

  const renderRow = (
    f: Folder,
    opts: { isLast: boolean; drag?: () => void; isActive?: boolean }
  ) => {
    const isDefault = f.id === 'default';
    const isActiveFolder = f.id === active;
    const sel = selected.has(f.id);
    return (
      <View style={{ borderBottomWidth: opts.isLast ? 0 : 1, borderBottomColor: c.line, backgroundColor: c.paper }}>
        <Pressable
          onPress={() => pickFolder(f.id)}
          disabled={editing}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 16 }}
        >
          {editing && (
            <Pressable onPress={() => toggleSel(f.id)} disabled={isDefault} hitSlop={8}>
              <SelectDot selected={sel} disabled={isDefault} />
            </Pressable>
          )}
          <Icon name="bookmark" size={18} filled={isActiveFolder} color={c.ink} />
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, fontWeight: '600', color: c.ink }}>
            {f.name}
            {isDefault && <Text style={{ fontSize: 11, color: c.sub, fontWeight: '500' }}>　固定</Text>}
          </Text>
          {/* 件数（名前が長くても見えるよう flexShrink:0 で固定） */}
          <Text style={{ flexShrink: 0, fontSize: 12.5, fontWeight: '600', color: c.sub }}>
            {store.bookmarkCount(f.id)} 語
          </Text>
          {editing ? (
            !isDefault && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Pressable onPress={() => setRenameId(f.id)} hitSlop={6} style={{ width: 34, alignItems: 'center' }}>
                  <Icon name="pencil" size={18} color={c.ink} />
                </Pressable>
                {opts.drag && (
                  <Pressable onPressIn={opts.drag} disabled={opts.isActive} hitSlop={6}>
                    <Icon name="drag" size={20} color={c.sub} />
                  </Pressable>
                )}
              </View>
            )
          ) : (
            isActiveFolder && <Icon name="check" size={20} stroke={2.4} color={c.ink} />
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Pressable onPress={onClose} hitSlop={8} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: -6 }}>
            <Icon name="chevL" size={22} color={c.ink} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 30, fontWeight: '800', color: c.ink }}>フォルダ</Text>
          {!editing && (
            <Pressable onPress={openAdd} style={{ paddingHorizontal: 4, paddingVertical: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>追加</Text>
            </Pressable>
          )}
          <Pressable
            onPress={editing ? exitEdit : enterEdit}
            disabled={onlyDefault && !editing}
            style={{ paddingHorizontal: 4, paddingVertical: 4, opacity: onlyDefault && !editing ? 0.45 : 1 }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>{editing ? '完了' : '編集'}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={[panel(c), { overflow: 'hidden' }]}>
          {/* デフォルト（先頭固定） */}
          {renderRow(defaultFolder, { isLast: nonDefaultFolders.length === 0 })}
          {/* 非デフォルト */}
          {editing ? (
            <DraggableFlatList
              data={nonDefaultFolders}
              keyExtractor={(f) => f.id}
              scrollEnabled={false}
              onDragEnd={({ data }) => setDraft(data.map((f) => f.id))}
              renderItem={({ item, drag, isActive, getIndex }) => {
                const i = getIndex() ?? 0;
                return (
                  <ScaleDecorator>{renderRow(item, { isLast: i === nonDefaultFolders.length - 1, drag, isActive })}</ScaleDecorator>
                );
              }}
            />
          ) : (
            nonDefaultFolders.map((f, i) => (
              <View key={f.id}>{renderRow(f, { isLast: i === nonDefaultFolders.length - 1 })}</View>
            ))
          )}
        </View>
        <Text style={{ fontSize: 11.5, color: c.sub, lineHeight: 19, paddingTop: 12, paddingHorizontal: 4 }}>
          フォルダを選ぶと、その中身のブックマークが表示されます。「デフォルト」は常に先頭で削除・並べ替えできません。
        </Text>
      </ScrollView>

      {editing && (
        <EditBar>
          <EditAction label="削除" onPress={() => selected.size && setConfirmDel(true)} disabled={selected.size === 0} strong />
        </EditBar>
      )}

      {addPrompt && (
        <PromptSheet
          title="新しいフォルダ"
          placeholder="フォルダ名"
          confirmLabel="追加"
          maxLength={MAX_FOLDER_NAME}
          onConfirm={(name) => {
            store.createFolder(name);
            setAddPrompt(false);
          }}
          onClose={() => setAddPrompt(false)}
        />
      )}
      {renameId && (
        <PromptSheet
          title="フォルダ名を変更"
          placeholder="フォルダ名"
          confirmLabel="保存"
          maxLength={MAX_FOLDER_NAME}
          initial={byId[renameId]?.name || ''}
          onConfirm={(name) => {
            store.renameFolder(renameId, name);
            setRenameId(null);
          }}
          onClose={() => setRenameId(null)}
        />
      )}
      {maxAlert && (
        <ConfirmSheet
          title="上限に達しました"
          message={`ブックマークフォルダは最大 ${MAX_FOLDERS} 個までです。`}
          confirmLabel="OK"
          onConfirm={() => setMaxAlert(false)}
          onClose={() => setMaxAlert(false)}
        />
      )}
      {confirmDel && (
        <ConfirmSheet
          title="フォルダを削除"
          message={`選択した ${selected.size}件のフォルダを削除します。中のブックマーク登録も消えます（単語自体は残ります）。`}
          onConfirm={confirmDelete}
          onClose={() => setConfirmDel(false)}
        />
      )}
    </View>
  );
}
