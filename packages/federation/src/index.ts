/**
 * Packages every application must resolve to one instance. Context-bearing libraries
 * (react, the router, antd's theme, the shell SDK) break silently when duplicated.
 */
const SINGLETONS = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  'react-router',
  'react-router-dom',
  'antd',
  'antd-style',
  '@ap/shell-sdk',
];

interface PackageJson {
  dependencies?: Record<string, string>;
}

function packageOf(specifier: string) {
  const [first, second] = specifier.split('/');
  return specifier.startsWith('@') ? `${first}/${second}` : first;
}

/** Shared singletons limited to what the application actually depends on. */
export function sharedSingletons({ dependencies = {} }: PackageJson) {
  return Object.fromEntries(
    SINGLETONS.filter((specifier) => packageOf(specifier) in dependencies).map((specifier) => [
      specifier,
      { singleton: true },
    ]),
  );
}
