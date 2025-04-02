export const 获取基础样式源路径 = () => {
    const baseStyle = document.querySelector('link[href^="base"]');
    if (!baseStyle) {
        console.error('无法找到基础样式链接');
        throw new Error('无法找到基础样式链接');
    }
    return baseStyle.getAttribute('href');
}

export{获取基础样式源路径 as getBaseStyleSource}