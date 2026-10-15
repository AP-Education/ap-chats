const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');

// The incoming call over Android's lock screen (expo-callkit-telecom's IncomingCallActivity) in the
// app's own look and language: app resources override the library's ones of the same name.
module.exports = function withCallScreen(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const source = path.join(config.modRequest.projectRoot, 'plugins/call-screen/res');
      const target = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res');
      fs.cpSync(source, target, { recursive: true });
      return config;
    },
  ]);
};
