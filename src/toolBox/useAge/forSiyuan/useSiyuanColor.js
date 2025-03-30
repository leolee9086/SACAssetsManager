/**
 * 思源笔记颜色工具函数
 * 
 * 本模块提供思源笔记颜色相关功能:
 * - 添加颜色操作菜单
 * - 创建颜色菜单项
 * - 生成颜色子菜单
 * 
 * @module useSiyuanColor
 * @version 1.0.0
 */

import { 检查思源环境 } from '../useSiyuan.js';
import { fetchSync } from '../../base/forNetWork/forFetch/fetchSyncTools.js';
import { thumbnail } from '../../../../source/server/endPoints.js';
import { rgbaArrayToHexString } from '../../../../source/utils/color/colorSpace.js';
import { 根据背景色获取黑白前景色 } from '../../../../source/utils/color/processColor.js';
import { 创建颜色选择器面板 } from '../../../../source/utils/color/colorPicker.js';

// 导出别名以保持向后兼容
export const getContrastingColor = 根据背景色获取黑白前景色;
export const createColorPickerPanel = 创建颜色选择器面板;

/**
 * 添加颜色操作菜单
 * 
 * @function 添加颜色操作菜单
 * @param {Object} menu - 思源菜单对象
 * @param {Object} asset - 资源对象
 */
export function 添加颜色操作菜单(menu, asset) {
    检查思源环境();
    
    const colorUrl = thumbnail.getColor(asset.type, asset.path, false);
    try {
        const response = fetchSync(colorUrl);
        if (!response.ok) {
            console.error('获取颜色信息失败:', response.statusText);
            return;
        }
        
        const colorData = response.json();
        if (!colorData || !Array.isArray(colorData)) return;
        
        colorData.forEach(colorInfo => {
            const colorHex = rgbaArrayToHexString(colorInfo.color);
            const fragment = 创建颜色菜单项(colorHex, colorInfo);
            menu.addItem({
                element: fragment,
                submenu: 生成颜色子菜单(colorHex, colorInfo)
            });
        });
    } catch (error) {
        console.error('获取颜色信息失败:', error);
    }
}

export const addColorOperationMenu = 添加颜色操作菜单;

/**
 * 创建颜色菜单项
 * 
 * @function 创建颜色菜单项
 * @param {string} colorHex - 颜色的十六进制值
 * @param {Object} colorInfo - 颜色信息对象
 * @returns {DocumentFragment} 菜单项的DOM片段
 */
export function 创建颜色菜单项(colorHex, colorInfo) {
    检查思源环境();
    
    // 导入DOM构建函数
    const { h, f } = window.siyuan.ws.app.plugins.find(p => p.name === 'SACAssetsManager').data;
    
    return f(
        h('svg', {
            class: 'b3-menu__icon',
            viewBox: '0 0 24 24',
            width: '16',
            height: '16',
            fill: 'currentColor'
        },
        h('svg:use', {
            'xlink:href': '#iconColors'
        })),
        h('div', {
            class: 'b3-menu__label',
            style: {
                backgroundColor: colorHex,
                marginRight: '5px',
                color: 根据背景色获取黑白前景色(colorHex)
            },
        }, `颜色操作: ${colorHex}`)
    );
}

export const createColorMenuItem = 创建颜色菜单项;

/**
 * 生成颜色子菜单
 * 
 * @function 生成颜色子菜单
 * @param {string} colorHex - 颜色的十六进制值
 * @param {Object} colorInfo - 颜色信息对象
 * @returns {Array} 子菜单项数组
 */
export function 生成颜色子菜单(colorHex, colorInfo) {
    检查思源环境();
    
    return [
        {
            label: `复制颜色代码: ${colorHex}`,
            click: () => navigator.clipboard.writeText(colorHex)
        },
        {
            label: `删除此颜色记录`,
            click: () => {
                // 调用删除颜色记录的函数
                // 这里需要实现删除颜色记录的功能，或从原有代码中迁移
                console.log('删除颜色记录功能待实现');
            }
        },
        {
            label: `颜色占比: ${(colorInfo.percent * 100).toFixed(2)}%`,
            disabled: true
        },
        {
            label: `搜索相似颜色资源`,
            click: () => {
                // 调用搜索相似颜色资源的函数
                const eventBus = window.siyuan.ws.app.plugins.find(p => p.name === 'SACAssetsManager').data.eventBus;
                eventBus.emit('打开颜色资源视图', { detail: { data: { color: colorHex } } });
            }
        }
    ];
}

export const generateColorSubmenu = 生成颜色子菜单; 