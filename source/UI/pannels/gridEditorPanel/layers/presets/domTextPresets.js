export const domTextPresets= [
    {
      name: '平价标签',
      icon: '🏷️',
      config: {
        text: '#平价!',
        htmlContent: true,
        size: 28,
        color: '#000000',
        cssText: `
          background: #FFE411;
          padding: 4px 12px;
          border-radius: 4px;
          font-weight: bold;
        `
      }
    },
    {
      name: '今日热门',
      icon: '🔥',
      config: {
        text: '今日热门',
        htmlContent: true,
        size: 28,
        color: '#ffffff',
        cssText: `
          background: #FF3B30;
          padding: 4px 12px;
          border-radius: 4px;
          font-weight: bold;
        `
      }
    },
    {
      name: '直播中',
      icon: '📺',
      config: {
        text: '直播中',
        htmlContent: true,
        size: 28,
        color: '#ffffff',
        cssText: `
          background: linear-gradient(90deg, #FF1493, #FF4500);
          padding: 4px 12px;
          border-radius: 4px;
          font-weight: bold;
        `
      }
    },
    {
      name: '霓虹灯效果',
      icon: '✨',
      config: {
        text: '霓虹灯文本',
        htmlContent: true,
        size: 36,
        color: '#fff',
        cssText: `
          text-shadow: 
            0 0 5px #fff,
            0 0 10px #fff,
            0 0 15px #0073e6,
            0 0 20px #0073e6,
            0 0 25px #0073e6;
          font-weight: bold;
        `
      }
    },
    {
      name: '渐变文字',
      icon: '🌈',
      config: {
        text: '渐变文本',
        htmlContent: true,
        size: 42,
        cssText: ``,
        text: `<svg viewBox="0 0 500 100" style="width: 100%; height: 100%;">
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#ff6b6b;" />
              <stop offset="100%" style="stop-color:#4ecdc4;" />
            </linearGradient>
          </defs>
          <text x="50%" y="50%" 
            dominant-baseline="middle" 
            text-anchor="middle"
            fill="url(#gradient)"
            style="font-size: 42px; font-weight: bold;">渐变文本</text>
        </svg>`
      }
    },
    {
      name: '立体文字',
      icon: '🎭',
      config: {
        text: '立体文字',
        htmlContent: true,
        size: 48,
        color: '#2c3e50',
        cssText: `
          text-shadow: 
            1px 1px 1px #919191,
            1px 2px 1px #919191,
            1px 3px 1px #919191,
            1px 4px 1px #919191,
            1px 5px 1px #919191,
            1px 6px 1px #919191;
          font-weight: bold;
        `
      }
    },
    {
      name: '描边文字',
      icon: '✏️',
      config: {
        text: '描边文字',
        htmlContent: true,
        size: 36,
        color: '#ffffff',
        cssText: `
          -webkit-text-stroke: 2px #ff6b6b;
          font-weight: bold;
        `
      }
    },
    {
      name: '毛玻璃效果',
      icon: '🌫️',
      config: {
        text: '毛玻璃文本',
        htmlContent: true,
        size: 32,
        color: 'rgba(255,255,255,0.8)',
        cssText: `
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 10px;
          backdrop-filter: blur(5px);
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `
      }
    },
    {
      name: '知识体系',
      icon: '📚',
      config: {
        text: '知识体系参考',
        htmlContent: true,
        size: 32,
        cssText: ``,
        text: `<svg viewBox="0 0 500 100" style="width: 100%; height: 100%;">
          <defs>
            <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#4285f4;" />
              <stop offset="100%" style="stop-color:#34a853;" />
            </linearGradient>
          </defs>
          <text x="50%" y="50%" 
            dominant-baseline="middle" 
            text-anchor="middle"
            fill="url(#blueGradient)"
            style="font-size: 32px; font-weight: bold;">知识体系参考</text>
        </svg>`
      }
    },
    {
      name: 'WOW效果',
      icon: '💥',
      config: {
        text: 'WOW!',
        htmlContent: true,
        size: 42,
        cssText: ``,
        text: `<svg viewBox="0 0 500 100" style="width: 100%; height: 100%;">
          <defs>
            <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#FF6B6B;" />
              <stop offset="100%" style="stop-color:#FF8E53;" />
            </linearGradient>
          </defs>
          <text x="50%" y="50%" 
            dominant-baseline="middle" 
            text-anchor="middle"
            fill="url(#orangeGradient)"
            style="font-size: 42px; font-weight: bold; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">WOW!</text>
        </svg>`
      }
    },
    {
      name: '反馈提示',
      icon: '❌',
      config: {
        text: '口语写作反馈',
        htmlContent: true,
        size: 32,
        cssText: ``,
        text: `<svg viewBox="0 0 500 100" style="width: 100%; height: 100%;">
          <defs>
            <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#FF4444;" />
              <stop offset="100%" style="stop-color:#FF8888;" />
            </linearGradient>
          </defs>
          <text x="50%" y="50%" 
            dominant-baseline="middle" 
            text-anchor="middle"
            fill="url(#redGradient)"
            style="font-size: 32px; font-weight: bold;">口语写作反馈</text>
        </svg>`
      }
    },
    {
      name: '知识要点',
      icon: '✅',
      config: {
        text: '知识要点',
        htmlContent: true,
        size: 32,
        cssText: ``,
        text: `<svg viewBox="0 0 500 100" style="width: 100%; height: 100%;">
          <defs>
            <linearGradient id="blueBg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#E8F0FE;" />
              <stop offset="100%" style="stop-color:#F8FBFF;" />
            </linearGradient>
          </defs>
          <!-- 背景形状 -->
          <path d="M10,20 H460 a20,20 0 0 1 20,20 v20 a20,20 0 0 1 -20,20 H10 a10,10 0 0 1 -10,-10 v-40 a10,10 0 0 1 10,-10 z" 
            fill="url(#blueBg)" 
            stroke="#4285f4" 
            stroke-width="2"/>
          <!-- 勾选图标 -->
          <path d="M30,50 l15,15 l25,-25" 
            stroke="#4285f4" 
            stroke-width="4" 
            fill="none" 
            stroke-linecap="round"/>
          <text x="90" y="50" 
            dominant-baseline="middle"
            fill="#4285f4"
            style="font-size: 32px; font-weight: bold;">知识要点</text>
        </svg>`
      }
    },
    {
      name: '精彩表现',
      icon: '🌟',
      config: {
        text: 'GREAT!',
        htmlContent: true,
        size: 42,
        cssText: ``,
        text: `<svg viewBox="0 0 500 100" style="width: 100%; height: 100%;">
          <defs>
            <linearGradient id="greatGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#FF6B6B;" />
              <stop offset="100%" style="stop-color:#FF8E53;" />
            </linearGradient>
            <!-- 星星的发光效果 -->
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <!-- 爆炸效果背景 -->
          <path d="M250,10 l20,20 l30,-10 l-10,30 l20,20 l-30,-5 l-15,25 l-15,-25 l-30,5 l20,-20 l-10,-30 l30,10 z" 
            fill="url(#greatGradient)" 
            filter="url(#glow)"/>
          <!-- 主文本 -->
          <text x="250" y="50" 
            dominant-baseline="middle" 
            text-anchor="middle"
            fill="white"
            style="font-size: 42px; font-weight: bold; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">GREAT!</text>
          <!-- 装饰性星星 -->
          <path d="M150,30 l2,2 l3,-1 l-1,3 l2,2 l-3,-1 l-2,2 l-1,-3 l-3,1 l2,-2 l-1,-3 l3,1 z" fill="#FFD700"/>
          <path d="M350,30 l2,2 l3,-1 l-1,3 l2,2 l-3,-1 l-2,2 l-1,-3 l-3,1 l2,-2 l-1,-3 l3,1 z" fill="#FFD700"/>
        </svg>`
      }
    },
    {
      name: '待修改',
      icon: '❌',
      config: {
        text: '需要修改',
        htmlContent: true,
        size: 28,
        cssText: ``,
        text: `<svg viewBox="0 0 500 100" style="width: 100%; height: 100%;">
          <defs>
            <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#FF4444;" />
              <stop offset="100%" style="stop-color:#FF6666;" />
            </linearGradient>
            <filter id="shadow">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#00000033"/>
            </filter>
          </defs>
          <!-- 主背景形状 -->
          <path d="M10,20 
            L470,20 
            Q490,20 490,40 
            L490,60 
            Q490,80 470,80 
            L10,80 
            Q-10,80 -10,60 
            L-10,40 
            Q-10,20 10,20 Z" 
            fill="url(#redGradient)"
            filter="url(#shadow)"/>
          <!-- 警告图标 -->
          <path d="M40,35 L60,65 L20,65 Z" 
            fill="none" 
            stroke="white" 
            stroke-width="2"/>
          <circle cx="40" cy="60" r="2" fill="white"/>
          <line x1="40" y1="45" x2="40" y2="55" 
            stroke="white" 
            stroke-width="2" 
            stroke-linecap="round"/>
          <!-- 文本 -->
          <text x="100" y="50" 
            dominant-baseline="middle"
            fill="white"
            style="font-size: 28px; font-weight: bold;">需要修改</text>
        </svg>`
      }
    }
  ]