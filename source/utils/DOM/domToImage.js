import domtoimage from '../../../static/dom-to-image.mjs'

/**
 * 将DOM元素转换为PNG图片
 * @param {string} content - HTML内容
 * @param {Object} styles - 样式配置
 * @returns {Promise<string>} - 返回图片的dataURL
 */
export const convertDOMToImage = async (content, styles) => {
  // 创建临时容器
  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    visibility: visible;
    pointer-events: none;
    z-index: -1;
  `
  
  // 设置内容
  container.innerHTML = styles.htmlContent ? content : document.createTextNode(content).textContent
  
  // 应用样式
  container.style.cssText += `
    font-family: ${styles.fontFamily};
    font-size: ${styles.size}px;
    color: ${styles.color};
    line-height: ${styles.lineHeight};
    letter-spacing: ${styles.letterSpacing}px;
    padding: ${styles.padding}px;
    opacity: ${styles.opacity};
    white-space: nowrap;
    ${styles.cssText}
  `
  
  document.body.appendChild(container)

  try {
    // 等待一帧确保DOM完全渲染
    await new Promise(resolve => requestAnimationFrame(resolve))
    
    // 转换为图片
    const dataUrl = await domtoimage.toPng(container, {
      bgcolor: 'transparent',
      style: {
        'transform': 'none',
        'transform-origin': '0 0'
      }
    })
    
    return dataUrl
  } finally {
    document.body.removeChild(container)
  }
} 