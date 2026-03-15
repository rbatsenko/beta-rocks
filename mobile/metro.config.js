const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Watch the shared lib directory from the web app
const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, "../src/lib");

config.watchFolders = [sharedRoot];

// Allow importing from outside the mobile directory
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(projectRoot, "../node_modules"),
];

module.exports = config;
