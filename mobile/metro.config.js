const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('db')) {
	config.resolver.assetExts.push('db');
}

// Allow Metro to treat wasm binaries as assets so expo-sqlite can load wa-sqlite.wasm on web.
if (!config.resolver.assetExts.includes('wasm')) {
	config.resolver.assetExts.push('wasm');
}

module.exports = withNativeWind(config, { input: "./global.css" });
