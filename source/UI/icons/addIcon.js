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

// 添加到插件
plugin.addIcons(colorIcon);