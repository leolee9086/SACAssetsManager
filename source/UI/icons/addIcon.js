import { plugin } from "../../pluginSymbolRegistry.js";

// 定义SVG图标
const colorIcon = `
<symbol id="iconColors" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="rainbow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color: red;" />
      <stop offset="16.6%" style="stop-color: orange;" />
      <stop offset="33.3%" style="stop-color: yellow;" />
      <stop offset="50%" style="stop-color: green;" />
      <stop offset="66.6%" style="stop-color: blue;" />
      <stop offset="83.3%" style="stop-color: indigo;" />
      <stop offset="100%" style="stop-color: violet;" />
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="45" fill="url(#rainbow-gradient)" stroke="none" />
  <circle cx="50" cy="50" r="30" fill="white" stroke="none" />
</symbol>
`;

// 添加到插件
plugin.addIcons(colorIcon);