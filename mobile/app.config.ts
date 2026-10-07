import type { ConfigContext, ExpoConfig } from 'expo/config';

export default function appConfig({ config }: ConfigContext): ExpoConfig {
  const apnsEnvironment = process.env.EXPO_PUBLIC_APNS_ENVIRONMENT ?? 'sandbox';
  if (apnsEnvironment !== 'sandbox' && apnsEnvironment !== 'production')
    throw new Error('EXPO_PUBLIC_APNS_ENVIRONMENT must be sandbox or production');
  return {
    ...config,
    name: config.name ?? 'AP App',
    slug: config.slug ?? 'ap-connect',
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
