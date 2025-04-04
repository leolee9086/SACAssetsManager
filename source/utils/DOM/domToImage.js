
import {domToImage} from '../base/useDeps/useDomToImage/fromDom-to-image.js'
/**
 * 创建临时DOM容器
 * @param {string} content - HTML内容 
 * @param {Object} styles - 样式配置
 * @returns {HTMLElement} - 返回创建的容器元素
 */
const createTempContainer = (content, styles) => {
  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    visibility: visible;
    pointer-events: none;
    z-index: -1;
  `
  
  container.innerHTML = styles.htmlContent ? content : document.createTextNode(content).textContent
  
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
  
  return container
}

/**
 * 将容器转换为图片
 * @param {HTMLElement} container - DOM容器
 * @returns {Promise<string>} - 返回图片的dataURL
 */
const convertContainerToImage = async (container) => {
  await new Promise(resolve => requestAnimationFrame(resolve))
  
  return await domToImage.toPng(container, {
    bgcolor: 'transparent',
    style: {
      'transform': 'none',
      'transform-origin': '0 0'
    }
  })
}

/**
 * 将DOM元素转换为PNG图片
 * @param {string} content - HTML内容
 * @param {Object} styles - 样式配置
 * @returns {Promise<string>} - 返回图片的dataURL
 */
export const convertDOMToImage = async (content, styles) => {
  const container = createTempContainer(content, styles)
  document.body.appendChild(container)

  try {
    return await convertContainerToImage(container)
  } finally {
    document.body.removeChild(container)
  }
}