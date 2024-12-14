export const createBrushModeHandlers = (params) => {
  const {
    isBrushMode,
    currentHoverElement,
    appData,
    isRepeat,
    tileSize
  } = params

  const handleMouseMove = (e) => {
    if (!isBrushMode.value) return
    
    if (currentHoverElement.value) {
      currentHoverElement.value.style.background = ''
    }
    
    let element = e.target
    while (element && !element.hasAttribute('data-node-id')) {
      element = element.parentElement
    }
    
    if (element) {
      currentHoverElement.value = element
      element.style.background = `url(${appData.imagePath})`
      element.style.backgroundSize = isRepeat.value ? 
        `${tileSize.value.width}px ${tileSize.value.height}px` : 'contain'
      element.style.backgroundRepeat = isRepeat.value ? 'repeat' : 'no-repeat'
    }
  }

  const handleMouseClick = (e) => {
    if (!isBrushMode.value || !currentHoverElement.value) return
    
    if (e.button === 0) {
      e.preventDefault()
      e.stopPropagation()
      const element = currentHoverElement.value
      element.style.background = `url(${appData.imagePath})`
      element.style.backgroundSize = isRepeat.value ? 
        `${tileSize.value.width}px ${tileSize.value.height}px` : 'contain'
      element.style.backgroundRepeat = isRepeat.value ? 'repeat' : 'no-repeat'
      
      currentHoverElement.value = null
      isBrushMode.value = false
      document.body.style.cursor = 'default'
      removeBrushListeners()
    }
  }

  const handleKeyDown = (e) => {
    if (isBrushMode.value && e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      if (currentHoverElement.value) {
        currentHoverElement.value.style.background = ''
        currentHoverElement.value = null
      }
      isBrushMode.value = false
      document.body.style.cursor = 'default'
      removeBrushListeners()
    }
  }

  const handleContextMenu = (e) => {
    if (isBrushMode.value) {
      e.preventDefault()
      if (currentHoverElement.value) {
        currentHoverElement.value.style.background = ''
        currentHoverElement.value = null
      }
      isBrushMode.value = false
      document.body.style.cursor = 'default'
      removeBrushListeners()
    }
  }

  const addBrushListeners = () => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mousedown', handleMouseClick)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('contextmenu', handleContextMenu, true)
  }

  const removeBrushListeners = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mousedown', handleMouseClick)
    document.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('contextmenu', handleContextMenu, true)
  }

  return {
    addBrushListeners,
    removeBrushListeners
  }
} 