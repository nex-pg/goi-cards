// Pro判定の単一の入口（docs/03-pro-and-iap.md）。
//
// 現状: 開発用テストトグル（store.pro）をそのまま返す。
// 本番: ここを RevenueCat の entitlement に差し替える。差し替え後も呼び出し側は
//       useIsPro() だけを見ればよいようにする（出し分けロジックは1箇所に集約）。
//
//   import Purchases from 'react-native-purchases';
//   const isProReal = /* Purchases.getCustomerInfo() の entitlements.active['pro'] */;
//   const devOverride = __DEV__ ? store.state.pro : null; // 開発ビルドのみ
//   return __DEV__ && devOverride != null ? devOverride : isProReal;
//
// テストトグルは __DEV__ のときのみ「その他」タブに表示する（本番ビルドでは隠す）。
import { useStore } from '../store/store';

export function useIsPro(): boolean {
  const store = useStore();
  return store.isPro;
}
