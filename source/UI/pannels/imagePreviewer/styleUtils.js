import { computed } from "../../../../static/vue.esm-browser.js"
export const createStyleComputed = (params) => {
  const {
    appData,
    isRepeat,
    tileSize
  } = params

  const containerStyle = computed(() => ({
    backgroundImage: appData.imagePath ? `url(${appData.imagePath})` : 'none',
    backgroundSize: isRepeat.value ? `${tileSize.value.width}px ${tileSize.value.height}px` : 'contain',
    backgroundRepeat: isRepeat.value ? 'repeat' : 'no-repeat',
    backgroundPosition: 'center',
    backgroundColor: '#f0f0f0'
  }))

  const gridStyle = computed(() => ({
    backgroundSize: '50px 50px',
    opacity: 0.2
  }))

  const tileOverlayStyle = computed(() => ({
    backgroundSize: `${tileSize.value.width}px ${tileSize.value.height}px`,
    opacity: 0.5
  }))

  return {
    containerStyle,
    gridStyle,
    tileOverlayStyle
  }
} 