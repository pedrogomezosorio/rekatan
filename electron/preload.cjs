const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('catanDesktop', {
  isDesktopApp: true,
  platform: process.platform,
  version: '1.0.0',
});

