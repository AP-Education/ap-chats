import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.expo/**',
      '**/generated/**',
      '**/*.tsbuildinfo',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/**/*.ts', '*.{js,mjs,ts}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.es2023 },
      parserOptions: { experimentalDecorators: true, emitDecoratorMetadata: true },
    },
  },
  {
    // Delivery and devices are meant to leave for their own service: they reach chat data only
    // through NotificationContent and the delivery contract, never by importing it.
    files: ['src/components/notifications/delivery/**/*.ts', 'src/components/devices/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/components/social/*',
                '@/components/communities/*',
                '@/components/calls/*',
                '@/components/workspaces/*',
                '**/notifications/alerts/*',
                '**/notifications/policy*',
                '**/notifications/preferences*',
                '**/notifications/realtime*',
                '../alerts/*',
                '../policy*',
                '../preferences*',
                '../realtime*',
              ],
              message: 'Delivery reads no chat data; ask through NotificationContent instead.',
            },
          ],
          paths: [
            {
              name: '@/database/drizzle/schema',
              importNames: [
                'calls',
                'channelCategories',
                'channelEntries',
                'channelMemberships',
                'channels',
                'chatMessages',
                'chatUploads',
                'directMessages',
                'messageMentions',
                'messagePins',
                'userProfiles',
                'workspaceMembers',
                'workspaces',
              ],
              message: 'Delivery reads no chat tables; ask through NotificationContent instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['web/public/push-sw.js'],
    languageOptions: {
      globals: { ...globals.serviceworker, ...globals.es2023 },
    },
  },
  {
    files: ['web/**/*.{ts,tsx}', 'mobile/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.flat.recommended.rules,
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.es2023 },
    },
  },
  {
    files: ['web/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@ant-design/icons',
              message: 'Use @phosphor-icons/react for web interface icons.',
            },
          ],
        },
      ],
    },
  },
);
