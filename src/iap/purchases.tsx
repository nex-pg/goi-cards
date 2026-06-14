// 課金（RevenueCat + StoreKit）。docs/03。
// - entitlement "pro" を購読し、store.setEntitlement() に反映（出し分けの真実の源）。
// - 開発用テストトグル(store.pro)は別途残す（__DEV__ のみ有効。store.isPro 側で合成）。
// - APIキー(EXPO_PUBLIC_RC_IOS_KEY)が無い／ネイティブ未ロード（Expo Go）なら no-op。
//   → その場合 available=false。購入UIは出さず、開発トグルでテスト可能。
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { useStore } from '../store/store';
import { Ev, track } from '../analytics/analytics';

const ENTITLEMENT_ID = 'pro';
const API_KEY =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_RC_IOS_KEY
    : process.env.EXPO_PUBLIC_RC_ANDROID_KEY;

// ネイティブモジュールの遅延ロード（Expo Go では落ちるので握りつぶす）
let Purchases: any = null;
try {
  Purchases = require('react-native-purchases').default;
} catch {
  Purchases = null;
}

type PurchaseResult = 'ok' | 'cancelled' | 'unavailable' | 'error';

interface PurchasesValue {
  available: boolean; // 課金が使える環境か（SDK+APIキーあり）
  priceString: string | null; // 例: "¥300"
  purchasePro: () => Promise<PurchaseResult>;
  restore: () => Promise<{ restored: boolean }>;
}

const PurchasesContext = createContext<PurchasesValue | null>(null);

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const available = !!Purchases && !!API_KEY;
  const [pkg, setPkg] = useState<any>(null);
  const [priceString, setPriceString] = useState<string | null>(null);

  useEffect(() => {
    if (!available) return;
    let sub: any;
    try {
      Purchases.configure({ apiKey: API_KEY });
      const update = (info: any) => {
        store.setEntitlement(!!info?.entitlements?.active?.[ENTITLEMENT_ID]);
      };
      Purchases.getCustomerInfo().then(update).catch(() => {});
      sub = Purchases.addCustomerInfoUpdateListener(update);
      Purchases.getOfferings()
        .then((offerings: any) => {
          const p = offerings?.current?.availablePackages?.[0] ?? null;
          setPkg(p);
          setPriceString(p?.product?.priceString ?? null);
        })
        .catch(() => {});
    } catch (e) {
      if (__DEV__) console.warn('[iap] 初期化に失敗', e);
    }
    return () => {
      try {
        sub?.remove?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available]);

  const purchasePro = async (): Promise<PurchaseResult> => {
    if (!available || !pkg) return 'unavailable';
    track(Ev.proPurchaseStarted);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]) {
        store.setEntitlement(true);
        track(Ev.proPurchased);
        return 'ok';
      }
      return 'error';
    } catch (e: any) {
      if (e?.userCancelled) return 'cancelled';
      if (__DEV__) console.warn('[iap] 購入失敗', e);
      return 'error';
    }
  };

  const restore = async (): Promise<{ restored: boolean }> => {
    track(Ev.restoreClicked);
    if (!available) return { restored: false };
    try {
      const info = await Purchases.restorePurchases();
      const restored = !!info?.entitlements?.active?.[ENTITLEMENT_ID];
      store.setEntitlement(restored);
      return { restored };
    } catch (e) {
      if (__DEV__) console.warn('[iap] 復元失敗', e);
      return { restored: false };
    }
  };

  const value = useMemo<PurchasesValue>(
    () => ({ available, priceString, purchasePro, restore }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [available, priceString, pkg]
  );

  return <PurchasesContext.Provider value={value}>{children}</PurchasesContext.Provider>;
}

export function usePurchases(): PurchasesValue {
  const v = useContext(PurchasesContext);
  if (!v) throw new Error('usePurchases must be used within PurchasesProvider');
  return v;
}
