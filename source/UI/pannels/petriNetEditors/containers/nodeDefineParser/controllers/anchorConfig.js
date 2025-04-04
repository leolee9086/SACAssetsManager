import { AnchorTypes, Sides } from "../types.js";

/**
 * 锚点视觉配置
 */
const AnchorVisualConfig = {
    // 输入锚点
    [AnchorTypes.INPUT]: {
        floatAble: false,          // 是否可浮动
        sideResetAble: true,       // 是否可重置位置
        foldWhileNoConnect: true,  // 未连接时是否折叠
        showLabel: true,           // 是否显示标签
        autoHide: false,           // 是否自动隐藏
        side: Sides.LEFT,
        theme: {
            backgroundColor: 'var(--b3-theme-background)',
            borderColor: 'var(--b3-theme-primary)',
            dotColor: 'var(--b3-theme-primary)',
            textColor: 'var(--b3-theme-on-surface)',
            hoverBackground: 'var(--b3-theme-primary-light)',
            activeBackground: 'var(--b3-theme-primary)',
            activeTextColor: 'var(--b3-theme-on-primary)'
        },
        icon: null,
        shape: 'circle'
    },

    // 输出锚点
    [AnchorTypes.OUTPUT]: {
        floatAble: false,
        sideResetAble: true,
        foldWhileNoConnect: true,
        showLabel: true,
        autoHide: false,
        side: Sides.RIGHT,
        theme: {
            backgroundColor: 'var(--b3-theme-background)',
            borderColor: 'var(--b3-theme-success)',
            dotColor: 'var(--b3-theme-success)',
            textColor: 'var(--b3-theme-on-surface)',
            hoverBackground: 'var(--b3-theme-success-light)',
            activeBackground: 'var(--b3-theme-success)',
            activeTextColor: 'var(--b3-theme-on-success)'
        },
        icon: null,
        shape: 'circle'
    },

    // 事件锚点
    [AnchorTypes.EVENT]: {
        floatAble: false,
        sideResetAble: true,
        foldWhileNoConnect: false,  // 事件锚点始终显示
        showLabel: true,
        autoHide: false,
        side: Sides.RIGHT,
        theme: {
            backgroundColor: 'var(--b3-theme-background)',
            borderColor: 'var(--b3-theme-warning)',
            dotColor: 'var(--b3-theme-warning)',
            textColor: 'var(--b3-theme-on-surface)',
            hoverBackground: 'var(--b3-theme-warning-light)',
            activeBackground: 'var(--b3-theme-warning)',
            activeTextColor: 'var(--b3-theme-on-warning)'
        },
        icon: '⚡',
        shape: 'pill'
    }
};

/**
 * 锚点布局配置
 */
const AnchorLayoutConfig = {
    offset: 10,
    spacing: 20,
    defaultPosition: 0.5,
    foldedOffset: -8,  // 折叠时的偏移量
    expandDuration: 150,  // 展开动画持续时间(ms)
    shapes: {
        circle: {
            width: 12,
            height: 12,
            borderRadius: '50%'
        },
        pill: {
            width: 'auto',
            height: 24,
            borderRadius: 12,
            padding: '0 12px'
        }
    }
};

/**
 * 获取锚点配置
 */
export function getAnchorConfig(type, customConfig = {}) {
    const baseConfig = AnchorVisualConfig[type] || AnchorVisualConfig[AnchorTypes.OUTPUT];
    return {
        ...baseConfig,
        ...customConfig,
        theme: {
            ...baseConfig.theme,
            ...(customConfig.theme || {})
        }
    };
}

/**
 * 获取锚点样式
 */
export function getAnchorStyle(anchor) {
    const style = {
        '--anchor-position': `${anchor.position * 100}%`,
        '--anchor-background': anchor.visualConfig.theme.backgroundColor,
        '--anchor-border': anchor.visualConfig.theme.borderColor,
        '--anchor-dot': anchor.visualConfig.theme.dotColor,
        '--anchor-text': anchor.visualConfig.theme.textColor,
        '--anchor-hover': anchor.visualConfig.theme.hoverBackground,
        '--anchor-active': anchor.visualConfig.theme.activeBackground,
        '--anchor-active-text': anchor.visualConfig.theme.activeTextColor,
      }
    
      return style
}

/**
 * 获取锚点标签样式
 */
export function getAnchorLabelStyle(anchor, isConnected = false) {
    const config = getAnchorConfig(anchor.type);
    return {
        opacity: config.showLabel ? 1 : 0,
        visibility: config.showLabel ? 'visible' : 'hidden',
        transition: `opacity ${AnchorLayoutConfig.expandDuration}ms ease`
    };
}

export { AnchorVisualConfig, AnchorLayoutConfig };
