import { plugin } from "../../pluginSymbolRegistry.js";

// 定义SVG图标
const colorIcon = `
<symbol id="iconColors" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="rainbow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color: #FF4444;" />
      <stop offset="20%" style="stop-color: #FFAA00;" />
      <stop offset="40%" style="stop-color: #44FF44;" />
      <stop offset="60%" style="stop-color: #4444FF;" />
      <stop offset="80%" style="stop-color: #AA44FF;" />
      <stop offset="100%" style="stop-color: #FF4444;" />
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="42" fill="url(#rainbow-gradient)" stroke="none" />
  <circle cx="50" cy="50" r="32" fill="currentcolor" stroke="none" />
</symbol>
`;

// 添加图层管理相关图标
const layerIcons = `
<symbol id="iconAddLayer" viewBox="0 0 24 24">
  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
</symbol>

<symbol id="iconAddGroup" viewBox="0 0 24 24">
  <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 8h-2v2h-2v-2h-2v-2h2v-2h2v2h2v2z"/>
</symbol>

<symbol id="iconExpand" viewBox="0 0 24 24">
  <path d="M7 10l5 5 5-5H7z"/>
</symbol>

<symbol id="iconCollapse" viewBox="0 0 24 24">
  <path d="M10 17l5-5-5-5v10z"/>
</symbol>

<symbol id="iconVisible" viewBox="0 0 24 24">
  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
</symbol>

<symbol id="iconHidden" viewBox="0 0 24 24">
  <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
</symbol>

<symbol id="iconAddChild" viewBox="0 0 24 24">
  <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
</symbol>

<symbol id="iconDelete" viewBox="0 0 24 24">
  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
</symbol>

<symbol id="iconPanel" viewBox="0 0 24 24">
  <rect x="2" y="2" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" rx="2"/>
  <rect x="2" y="2" width="20" height="6" fill="currentColor" opacity="0.2" rx="2"/>
  <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" stroke-width="2"/>
  <line x1="6" y1="16" x2="14" y2="16" stroke="currentColor" stroke-width="2"/>
</symbol>
`;

// 添加面板操作相关图标
const canvasIcons = `
<symbol id="iconReset" viewBox="0 0 24 24">
  <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-8 3.58-8 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
</symbol>

<symbol id="iconExport" viewBox="0 0 24 24">
  <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
</symbol>

<symbol id="iconZoomIn" viewBox="0 0 24 24">
  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  <path d="M12 10h-2v-2H9v2H7v1h2v2h1v-2h2z"/>
</symbol>

<symbol id="iconZoomOut" viewBox="0 0 24 24">
  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  <path d="M7 9h5v1H7z"/>
</symbol>

<symbol id="iconLine" viewBox="0 0 24 24">
  <path d="M19 13H5v-2h14v2z"/>
</symbol>

<symbol id="iconFullscreen" viewBox="0 0 24 24">
  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
</symbol>

<symbol id="iconFullscreenExit" viewBox="0 0 24 24">
  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
</symbol>
`;

// 添加到插件
plugin.addIcons(colorIcon);
plugin.addIcons(layerIcons);
plugin.addIcons(canvasIcons);