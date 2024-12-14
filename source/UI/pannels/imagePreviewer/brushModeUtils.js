import { createBrushModeHandlers } from "../../../globalStatus/mode/brush.js"
import { setBlockAttrs } from "../../../fromThirdParty/siyuanKernel/attr.js"
// 创建通用块元素笔刷构造器
export const createBlockBrushHandlers = ({
  isBrushMode,
  currentHoverElement,
  // 样式处理函数
  applyStyle,    // 应用样式
  clearStyle,    // 清除样式
  saveStyle,     // 保存样式
  // 自定义光标配置
  cursorConfig
}) => {
  return createBrushModeHandlers({
    isBrushMode,
    currentHoverElement,
    onHover: {
      apply: applyStyle,
      cleanup: clearStyle
    },
    onClick: (element) => {
      applyStyle(element)
      saveStyle(element)
    },
    cursor: cursorConfig,
    // 查找目标块元素
    findTarget: (element) => {
      while (element && !element.hasAttribute('data-node-id')) {
        element = element.parentElement
      }
      return element
    }
  })
}

// 使用示例 - 创建图片背景笔刷
export const createImageBrushHandlers = ({
  isBrushMode,
  currentHoverElement,
  imagePath,
  isRepeat,
  tileSize
}) => {
  // hover时仅应用临时样式
  const applyImageStyle = (element) => {
    const currentImagePath = imagePath.value
    const currentIsRepeat = isRepeat.value
    const currentTileSize = tileSize.value

    if (!currentImagePath) return

    // 仅设置临时的样式预览
    element.style.backgroundImage = `url(${currentImagePath})`
    element.style.backgroundSize = currentIsRepeat ? 
      `${currentTileSize.width}px ${currentTileSize.height}px` : 'contain'
    element.style.backgroundRepeat = currentIsRepeat ? 'repeat' : 'no-repeat'
    element.style.backgroundPosition = 'center'
  }
  
  // 清除临时样式
  const clearImageStyle = (element) => {
    // 仅清除临时设置的样式
    element.style.backgroundImage = ''
    element.style.backgroundSize = ''
    element.style.backgroundRepeat = ''
    element.style.backgroundPosition = ''
  }
  
  // 点击时才保存样式到块属性
  const saveImageStyle = async (element) => {
    try {
      const currentImagePath = imagePath.value
      const currentIsRepeat = isRepeat.value 
      const currentTileSize = tileSize.value
  
      if (!currentImagePath) return
      
      // 设置样式
      element.style.backgroundImage = `url(${currentImagePath})`
      element.style.backgroundSize = currentIsRepeat ? 
        `${currentTileSize.width}px ${currentTileSize.height}px` : 'contain'
      element.style.backgroundRepeat = currentIsRepeat ? 'repeat' : 'no-repeat'
      element.style.backgroundPosition = 'center'

      // 获取块ID并保存属性
      const blockId = element.getAttribute('data-node-id')
      if (blockId) {
        await setBlockAttrs(blockId, {
          style: element.style.cssText
        })
      }
    } catch (err) {
      console.error('保存图片样式时出错:', err)
    }
  }

  return createBlockBrushHandlers({
    isBrushMode,
    currentHoverElement,
    applyStyle: applyImageStyle,
    clearStyle: clearImageStyle, 
    saveStyle: saveImageStyle,
    cursorConfig: {
      type: 'element',
      value: (() => {
        const cursorWrapper = document.createElement('div');
        cursorWrapper.innerHTML = `
          <div style="display: flex; align-items: center; gap: 4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <use xlink:href="#iconImage"></use>
            </svg>
            <span style="
              font-size: 12px;
              color: #3182ce;
              background: rgba(255, 255, 255, 0.9);
              padding: 2px 6px;
              border-radius: 4px;
              white-space: nowrap;
              box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            ">设置块背景</span>
          </div>
        `;
        cursorWrapper.style.color = '#3182ce';
        cursorWrapper.style.filter = 'drop-shadow(0 0 2px rgba(0,0,0,0.1))';
        return cursorWrapper;
      })(),
      offsetX: 8,
      offsetY: 8
    }
  })
}
  