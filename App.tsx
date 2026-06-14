import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from './src/store/store';
import { ThemeProvider, useTheme } from './src/theme/theme';
import { ToastProvider } from './src/hooks/useToast';
import { PurchasesProvider } from './src/iap/purchases';
import { Shell } from './src/Shell';

function ThemedStatusBar() {
  const { dark } = useTheme();
  return <StatusBar style={dark ? 'light' : 'dark'} />;
}

export default function App() {
  // 分析の初期化は Shell（store配下）で順序を保証して行う。
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <PurchasesProvider>
            <ThemeProvider>
              <ToastProvider>
                <ThemedStatusBar />
                <Shell />
              </ToastProvider>
            </ThemeProvider>
          </PurchasesProvider>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
