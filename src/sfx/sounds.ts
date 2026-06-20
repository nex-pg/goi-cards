// 効果音（控えめ）。expo-audio で再生。
//  playStart() … スタート時「トゥルン」
//  playSwipe() … カード送り「シュッ」
// Expo Go / 未対応環境でも落ちないよう遅延初期化＋try/catch。
// iOS のマナーモード時は既定で鳴らない（playsInSilentMode を有効化していないため）＝控えめ運用。
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

let startP: AudioPlayer | null = null;
let swipeP: AudioPlayer | null = null;
let ready = false;

function ensure() {
  if (ready) return;
  ready = true;
  try {
    startP = createAudioPlayer(require('../assets/sfx/start.wav'));
    swipeP = createAudioPlayer(require('../assets/sfx/swipe.wav'));
    if (startP) startP.volume = 0.5;
    if (swipeP) swipeP.volume = 0.45;
  } catch (e) {
    if (__DEV__) console.warn('[sfx] 初期化に失敗', e);
  }
}

function fire(p: AudioPlayer | null) {
  if (!p) return;
  try {
    p.seekTo(0);
    p.play();
  } catch {}
}

export function playStart() {
  ensure();
  fire(startP);
}

export function playSwipe() {
  ensure();
  fire(swipeP);
}
