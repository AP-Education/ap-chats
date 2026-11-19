import type { ConfigContext, ExpoConfig } from 'expo/config';

const updateChannels = ['production', 'preview'] as const;

/**
 * Over-the-air updates come from our own API (docs/adr/0008-app-updates.md). The shell decides
 * when to look for one, so nothing is checked at launch. A build with no API URL, such as a local
 * one, does not take updates; one with no channel asks, but the API never offers it anything.
 */
function updatesConfig(): Pick<ExpoConfig, 'updates' | 'runtimeVersion'> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/u, '');
  const channel = process.env.APP_UPDATES_CHANNEL?.trim();
  if (channel && !updateChannels.includes(channel as (typeof updateChannels)[number]))
    throw new Error(`APP_UPDATES_CHANNEL must be one of: ${updateChannels.join(', ')}`);
  if (!apiUrl) return { updates: { enabled: false } };
  return {
    // Changes whenever native code does, so an update only reaches builds that can run it.
    runtimeVersion: { policy: 'fingerprint' },
    updates: {
      url: `${apiUrl}/api/updates/expo/manifest`,
      checkAutomatically: 'NEVER',
      fallbackToCacheTimeout: 0,
      codeSigningCertificate: './certs/updates-certificate.pem',
      codeSigningMetadata: { keyid: 'main', alg: 'rsa-v1_5-sha256' },
      // Our server sends whole bundles, not diffs.
      enableBsdiffPatchSupport: false,
      ...(channel ? { requestHeaders: { 'expo-channel-name': channel } } : {}),
    },
  };
}

export default function appConfig({ config }: ConfigContext): ExpoConfig {
  // Release builds are the ones that must ring; a local Xcode run sets sandbox explicitly.
  const apnsEnvironment = process.env.EXPO_PUBLIC_APNS_ENVIRONMENT ?? 'production';
  if (apnsEnvironment !== 'sandbox' && apnsEnvironment !== 'production')
    throw new Error('EXPO_PUBLIC_APNS_ENVIRONMENT must be sandbox or production');
  return {
    ...config,
    name: config.name ?? 'AP App',
    slug: config.slug ?? 'ap-app',
    ...updatesConfig(),
    extra: { ...config.extra, apnsEnvironment },
    ios: {
      ...config.ios,
      entitlements: {
        ...config.ios?.entitlements,
        'aps-environment': apnsEnvironment === 'sandbox' ? 'development' : 'production',
      },
    },
  };
}
