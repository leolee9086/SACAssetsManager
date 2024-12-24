// source/UI/pannels/gridEditorPanel/gridBrushUtils.js
import { createBrushModeHandlers } from "../../../globalStatus/mode/brush.js"
import { setBlockAttrs } from "../../../fromThirdParty/siyuanKernel/attr.js"

export const createGridBrushHandlers = ({
  isBrushMode,
  currentHoverElement,
  gridSize,
  lineWidth,
  lineColor,
  opacity
}) => {
  // 应用网格样式
  const applyGridStyle = (element) => {
    const currentOpacityHex = Math.round(opacity.value * 255).toString(16)
    element.style.background = `
      linear-gradient(to right, ${lineColor.value}${currentOpacityHex} ${lineWidth.value}px, transparent ${lineWidth.value}px) 0 0 / ${gridSize.value}px ${gridSize.value}px,
      linear-gradient(to bottom, ${lineColor.value}${currentOpacityHex} ${lineWidth.value}px, transparent ${lineWidth.value}px) 0 0 / ${gridSize.value}px ${gridSize.value}px
    `
  }
  
  // 清除网格样式
  const clearGridStyle = (element) => {
    element.style.background = ''
  }
  
  // 保存网格样式到块属性
  const saveGridStyle = async (element) => {
    try {
      const currentOpacityHex = Math.round(opacity.value * 255).toString(16)
      const gridStyle = `
        linear-gradient(to right, ${lineColor.value}${currentOpacityHex} ${lineWidth.value}px, transparent ${lineWidth.value}px) 0 0 / ${gridSize.value}px ${gridSize.value}px,
        linear-gradient(to bottom, ${lineColor.value}${currentOpacityHex} ${lineWidth.value}px, transparent ${lineWidth.value}px) 0 0 / ${gridSize.value}px ${gridSize.value}px
      `
      
      // 设置样式
      element.style.background = gridStyle

      // 获取块ID并保存属性
      const blockId = element.getAttribute('data-node-id')
      if (blockId) {
        await setBlockAttrs(blockId, {
          style: element.style.cssText,
          'custom-grid': JSON.stringify({
            gridSize: gridSize.value,
            lineWidth: lineWidth.value,
            lineColor: lineColor.value,
            opacity: opacity.value
          })
        })
      }
    } catch (err) {
      console.error('保存网格样式时出错:', err)
    }
  }

  return createBrushModeHandlers({
    isBrushMode,
    currentHoverElement,
    onHover: {
      apply: applyGridStyle,
      cleanup: clearGridStyle
    },
    onClick: (element) => {
      applyGridStyle(element)
      saveGridStyle(element)
    },
    cursor: {
      type: 'element',
      value: (() => {
        const cursorWrapper = document.createElement('div')
        cursorWrapper.innerHTML = `
          <div style="display: flex; align-items: center; gap: 4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <use xlink:href="#iconGrid"></use>
            </svg>
            <span style="
              font-size: 12px;
              color: #3182ce;
              background: rgba(255, 255, 255, 0.9);
              padding: 2px 6px;
              border-radius: 4px;
              white-space: nowrap;
              box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            ">设置网格背景</span>
          </div>
        `
        cursorWrapper.style.color = '#3182ce'
        cursorWrapper.style.filter = 'drop-shadow(0 0 2px rgba(0,0,0,0.1))'
        return cursorWrapper
      })(),
      offsetX: 8,
      offsetY: 8
    },
    findTarget: (element) => {
      while (element && !element.hasAttribute('data-node-id')) {
        element = element.parentElement
      }
      return element
    }
  })
}