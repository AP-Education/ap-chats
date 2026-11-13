import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import { GateScreen } from '../../../components/GateScreen';
import { type ShellPalette, useShellPalette, useThemedStyles } from '../../appearance';
import type { FilePreviewSource } from '../types';

interface FilePreviewProps {
  source: FilePreviewSource;
  onClose: () => void;
}

/** The document has its own WebView; its close control belongs to the native safe area. */
export function FilePreview({ source, onClose }: FilePreviewProps) {
  const { t } = useTranslation('webview');
  const palette = useShellPalette();
  const styles = useThemedStyles(themedStyles);
  const [failed, setFailed] = useState(false);

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.toolbar}>
          <Text accessibilityRole="header" style={styles.title} numberOfLines={1}>
            {t(($) => $.filePreview.title)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(($) => $.filePreview.close)}
            onPress={onClose}
            style={styles.close}
            testID="file-preview-close"
          >
            <Text style={styles.closeLabel}>{t(($) => $.filePreview.close)}</Text>
          </Pressable>
        </View>
        {failed ? (
          <GateScreen
            icon="document-outline"
            title={t(($) => $.filePreview.errorTitle)}
            description={t(($) => $.filePreview.errorDescription)}
            actions={[
              { label: t(($) => $.connectionError.retry), onPress: () => setFailed(false) },
            ]}
          />
        ) : (
          <WebView<object>
            source={source}
            style={styles.document}
            automaticallyAdjustContentInsets={false}
            contentInsetAdjustmentBehavior="never"
            javaScriptEnabled={false}
            startInLoadingState
            onError={() => setFailed(true)}
            onHttpError={() => setFailed(true)}
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator color={palette.primary} />
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const themedStyles = (palette: ShellPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.surface },
    toolbar: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.primaryBg,
    },
    title: { flex: 1, color: palette.text, fontSize: 17, fontWeight: '600' },
    close: { minWidth: 88, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    closeLabel: { color: palette.primary, fontSize: 17, fontWeight: '600' },
    document: { flex: 1, backgroundColor: palette.surface },
    loading: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surface,
    },
  });
