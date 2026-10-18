const fs = require('node:fs');
const path = require('node:path');
const { withFinalizedMod } = require('expo/config-plugins');

// iOS lists the share extension under its own display name, which expo-share-intent ties to the
// extension's Xcode target name; the app's name there would clash with the app's own target.
module.exports = function withShareExtensionName(config) {
  return withFinalizedMod(config, [
    'ios',
    (config) => {
      const plist = path.join(
        config.modRequest.platformProjectRoot,
        'ShareExtension',
        'ShareExtension-Info.plist',
      );
      const source = fs.readFileSync(plist, 'utf8');
      const named = source.replace(
        /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/,
        `$1${config.name}$2`,
      );
      fs.writeFileSync(plist, named);
      return config;
    },
  ]);
};
