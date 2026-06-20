// 効果音（控えめ）。expo-audio で再生。
//  playStart()  … スタート時「トゥルン」
//  playSwipe()  … カード送り「シュッ」
//  playResult() … 結果画面表示時（終わりの合図）
//  playTab()    … 下部タブ切替時（メニュー切替）
//  playFlip()   … カードを表裏ひっくり返す時（両方向）
// 各音は「初回再生時に生成」し、生成に失敗(null)なら次回リトライする（アセット未ロード対策）。
// Expo Go / 未対応環境でも落ちないよう try/catch。
// iOS のマナーモード時は既定で鳴らない（playsInSilentMode を有効化していないため）＝控えめ運用。
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

type Key = 'start' | 'swipe' | 'result' | 'tab' | 'flip';

// require はリテラル文字列で（Metro が静的にバンドル）。音量も併記。
const SOURCES: Record<Key, { src: number; volume: number }> = {
  start: { src: require('../assets/sfx/01start.mp3'), volume: 0.5 },
  swipe: { src: require('../assets/sfx/02card.mp3'), volume: 0.45 },
  result: { src: require('../assets/sfx/03result.mp3'), volume: 0.5 },
  tab: { src: require('../assets/sfx/04tab.mp3'), volume: 0.4 },
  flip: { src: require('../assets/sfx/05flip.mp3'), volume: 0.45 },
};

// 生成済みプレイヤーのキャッシュ。null=前回生成失敗（次回リトライ）、undefined=未生成。
const players: Partial<Record<Key, AudioPlayer | null>> = {};

function fire(key: Key) {
  let p = players[key];
  // 未生成 or 前回失敗 のときは作り直す（その音を実際に鳴らす直前に生成＝アセットが揃ってから）
  if (!p) {
    try {
      const { src, volume } = SOURCES[key];
      p = createAudioPlayer(src);
      if (p) p.volume = volume;
      players[key] = p ?? null;
    } catch (e) {
      if (__DEV__) console.warn(`[sfx] 生成失敗: ${key}`, e);
      players[key] = null;
      return;
    }
  }
  if (!p) return;
  try {
    p.seekTo(0);
    p.play();
  } catch (e) {
    if (__DEV__) console.warn(`[sfx] 再生失敗: ${key}`, e);
  }
}

export const playStart = () => fire('start');
export const playSwipe = () => fire('swipe');
export const playResult = () => fire('result');
export const playTab = () => fire('tab');
export const playFlip = () => fire('flip');
