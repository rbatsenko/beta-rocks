const { withXcodeProject } = require("expo/config-plugins");

/**
 * Disable Swift strict concurrency checking to fix Expo SDK 55 + Xcode 16 build errors.
 * Expo modules haven't been fully updated for Swift 6 concurrency yet.
 */
module.exports = function withDisableSwiftConcurrency(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();

    for (const key in configurations) {
      const buildSettings = configurations[key].buildSettings;
      if (buildSettings) {
        buildSettings.SWIFT_STRICT_CONCURRENCY = "minimal";
      }
    }

    return config;
  });
};
