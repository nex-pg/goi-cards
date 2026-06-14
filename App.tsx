import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from './src/store/store';
import { ThemeProvider, useTheme } from './src/theme/theme';
import { ToastProvider } from './src/hooks/useToast';
import { Shell } from './src/Shell';

function ThemedStatusBar() {
  const { dark } = useTheme();
  return <StatusBar style={dark ? 'light' : 'dark'} />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <ThemeProvider>
            <ToastProvider>
              <ThemedStatusBar />
              <Shell />
            </ToastProvider>
          </ThemeProvider>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
