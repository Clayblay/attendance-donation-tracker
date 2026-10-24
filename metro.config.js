// Keep Metro from crawling the Electron folder (it has its own node_modules).
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const desktopDir = new RegExp('^' + escape(path.join(__dirname, 'desktop')) + '[\\\\/].*');

const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  desktopDir,
];

module.exports = config;
