/**
 * 颜色选择器面板工具
 * 
 * 提供创建颜色选择器面板的功能
 * 
 * @module colorPicker
 * @version 1.0.0
 */

/**
 * 创建颜色选择器面板
 * 
 * @function 创建颜色选择器面板
 * @param {Function} onSelect - 颜色选择回调函数
 * @returns {HTMLElement} 颜色选择器面板元素
 */
export function 创建颜色选择器面板(onSelect) {
    const colorPanel = document.createElement('div');
    colorPanel.className = 'sac-color-picker-panel';
    colorPanel.style.cssText = 'display: flex; flex-wrap: wrap; gap: 5px; padding: 10px;';
    
    // 预设颜色列表
    const presetColors = [
        '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', 
        '#00FFFF', '#0000FF', '#8B00FF', '#FF00FF',
        '#000000', '#404040', '#808080', '#C0C0C0', 
        '#FFFFFF', '#800000', '#808000', '#008000',
        '#800080', '#008080', '#000080', '#4B0082'
    ];
    
    // 添加预设颜色
    presetColors.forEach(color => {
        const colorSwatch = document.createElement('div');
        colorSwatch.className = 'sac-color-swatch';
        colorSwatch.style.cssText = `
            width: 20px; 
            height: 20px; 
            background-color: ${color}; 
            cursor: pointer;
            border-radius: 3px;
            border: 1px solid #ccc;
        `;
        colorSwatch.setAttribute('data-color', color);
        colorSwatch.addEventListener('click', () => {
            if (typeof onSelect === 'function') {
                onSelect(color);
            }
        });
        colorPanel.appendChild(colorSwatch);
    });
    
    // 添加自定义颜色输入
    const customColorInput = document.createElement('input');
    customColorInput.type = 'color';
    customColorInput.style.cssText = 'margin-top: 10px; width: 100%;';
    customColorInput.addEventListener('change', (e) => {
        if (typeof onSelect === 'function') {
            onSelect(e.target.value);
        }
    });
    colorPanel.appendChild(customColorInput);
    
    return colorPanel;
}

/**
 * 创建简单的颜色选择器按钮
 * 
 * @function 创建颜色选择按钮
 * @param {string} initialColor - 初始颜色值
 * @param {Function} onChange - 颜色变化回调函数
 * @returns {HTMLElement} 颜色选择按钮元素
 */
export function 创建颜色选择按钮(initialColor = '#000000', onChange) {
    const button = document.createElement('button');
    button.className = 'sac-color-button';
    button.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 4px;
        border: 1px solid #ccc;
        background-color: ${initialColor};
        cursor: pointer;
        padding: 0;
    `;
    
    button.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = initialColor;
        
        input.addEventListener('change', (e) => {
            const newColor = e.target.value;
            button.style.backgroundColor = newColor;
            if (typeof onChange === 'function') {
                onChange(newColor);
            }
        });
        
        input.click();
    });
    
    return button;
} 