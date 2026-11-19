// The runtime version of over-the-air updates is this fingerprint (docs/adr/0008-app-updates.md):
// an update reaches only builds with the same one. Leave out what never changes native code, so
// a version bump or an edit to eas.json does not cut the builds in the stores off from updates.
const { SourceSkips } = require('expo/fingerprint');

/** @type {import('expo/fingerprint').Config} */
module.exports = {
  sourceSkips:
    SourceSkips.ExpoConfigVersions |
    SourceSkips.PackageJsonAndroidAndIosScriptsIfNotContainRun |
    SourceSkips.GitIgnore,
  ignorePaths: ['eas.json'],
};
