import { registerRootComponent } from 'expo';
import { useEffect, useRef, useState } from 'react';
import { Platform, StatusBar, View } from 'react-native';
import WebView from 'react-native-webview';

import { authRestored, useAuthStore } from '../../mobile/src/features/auth';
import {
  VoiceMessageRuntime,
  type VoiceRuntimeHandle,
} from '../../mobile/src/features/voice-messages/components/VoiceMessageRuntime';
import { isVoiceRequest } from '../../mobile/src/features/voice-messages/types';
import { buildBridgeScript } from '../../mobile/src/features/webview/utils/inject-bridge';
import { NativeVoiceScenario } from './auto-scenario';
import { NATIVE_WEB_SCENARIO } from './web-scenario';

const host = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';

function VoiceQA() {
  const web = useRef<WebView<object>>(null);
  const voice = useRef<VoiceRuntimeHandle>(null);
  const [ready, setReady] = useState(false);
  const scenario = useRef<NativeVoiceScenario | null>(null);
  useEffect(() => {
    if (ready && process.env.EXPO_PUBLIC_VOICE_QA_AUTORUN === 'true') {
      const run = new NativeVoiceScenario(
        () => voice.current,
        () => web.current?.injectJavaScript(NATIVE_WEB_SCENARIO),
      );
      scenario.current = run;
      const timer = setTimeout(() => run.start(), 1000);
      return () => clearTimeout(timer);
    }
  }, [ready]);
  useEffect(() => {
    void authRestored.then(() => {
      useAuthStore.setState({
        status: 'signed-in',
        tokens: { accessToken: 'fixture-only', expiresAt: Date.now() + 3600_000 },
      });
      setReady(true);
    });
  }, []);
  if (!ready) return null;
  return (
    <View
      style={{
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 58 : StatusBar.currentHeight,
        paddingBottom: 24,
        backgroundColor: '#f3f7f6',
      }}
    >
      <VoiceMessageRuntime
        ref={voice}
        send={(message) => {
          scenario.current?.receive(message);
          web.current?.injectJavaScript(buildBridgeScript(message));
        }}
      />
      <WebView<object>
        ref={web}
        source={{ uri: `http://${host}:5573` }}
        applicationNameForUserAgent="ApAppMobile/1 ApAppTabBar/1"
        mediaPlaybackRequiresUserAction={false}
        onMessage={(event) => {
          try {
            const value: unknown = JSON.parse(event.nativeEvent.data);
            if (isVoiceRequest(value)) voice.current?.handle(value);
          } catch {
            /* Ignore unrelated page messages. */
          }
        }}
      />
    </View>
  );
}
registerRootComponent(VoiceQA);
