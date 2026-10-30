const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.watchFolders = [
  path.resolve(__dirname, '../../mobile'),
  path.resolve(__dirname, '../../node_modules'),
];
config.resolver.blockList = [/\/(?:key|keys|\.local-work)\//, /\/\.env(?:\.|$)/];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, '../../mobile/node_modules'),
  path.resolve(__dirname, '../../node_modules'),
];
module.exports = config;
