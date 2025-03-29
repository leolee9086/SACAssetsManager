import { ref } from '../../../../../static/vue.esm-browser.js'
import { CanvasProcessor } from '../../../../../src/toolBox/base/useBrowser/useCanvas/canvasProcessor.js'
import { getRectangularUnit } from '../../../../utils/image/textures/pattern/recUnit.js'
import { createPattern } from '../patterns.js'

export function usePatternDownload() {
  const showUnitOptions = ref(false)
  const unitRepeat = ref(1)
  const targetWidth = ref(1000)
  
  const currentRenderer = ref(null)
  const currentSymmetryType = ref('')
  const currentBasis1 = ref(null)
  const currentBasis2 = ref(null)
  const currentGetPatternConfig = ref(null)

  const updateState = (renderer, symmetryType, basis1, basis2, getPatternConfig) => {
    currentRenderer.value = renderer
    currentSymmetryType.value = symmetryType
    currentBasis1.value = basis1
    currentBasis2.value = basis2
    currentGetPatternConfig.value = getPatternConfig
  }

  const downloadImage = async () => {
    if (!currentRenderer.value) return;

    const processor = new CanvasProcessor(currentRenderer.value.canvas);
    await processor.download('pattern.png', {
      type: 'image/png',
      quality: 1
    });

    processor.dispose();
  };

  const downloadUnit = () => {
    showUnitOptions.value = true
  }

  const confirmUnitDownload = async () => {
    if (!currentRenderer.value) return;
    
    const wallpaperGroup = currentSymmetryType.value.toLowerCase();
    const rectUnit = getRectangularUnit(currentBasis1.value, currentBasis2.value, wallpaperGroup);
    if (!rectUnit) return;

    const unitCanvas = document.createElement('canvas');
    const ctx = unitCanvas.getContext('2d');
    
    const scale = targetWidth.value / (rectUnit.width * unitRepeat.value);
    const singleUnitWidth = rectUnit.width * scale;
    const singleUnitHeight = rectUnit.height * scale;
    
    unitCanvas.width = singleUnitWidth;
    unitCanvas.height = singleUnitHeight;

    const pattern = await createPattern(currentGetPatternConfig.value());

    pattern.render(ctx, {
      width: singleUnitWidth * 3,
      height: singleUnitHeight * 3,
      x: singleUnitWidth * 1.5,
      y: singleUnitHeight * 1.5,
    });

    const outputCanvas = document.createElement('canvas');
    const outputCtx = outputCanvas.getContext('2d');
    outputCanvas.width = singleUnitWidth * unitRepeat.value;
    outputCanvas.height = singleUnitHeight * unitRepeat.value;

    for (let i = 0; i < unitRepeat.value; i++) {
      for (let j = 0; j < unitRepeat.value; j++) {
        outputCtx.drawImage(
          unitCanvas,
          i * singleUnitWidth,
          j * singleUnitHeight,
          singleUnitWidth,
          singleUnitHeight
        );
      }
    }

    const processor = new CanvasProcessor(outputCanvas);
    await processor.download('pattern_unit.png', {
      type: 'image/png',
      quality: 1
    });

    processor.dispose();
    showUnitOptions.value = false;
  }

  return {
    showUnitOptions,
    unitRepeat,
    targetWidth,
    downloadImage,
    downloadUnit,
    confirmUnitDownload,
    updateState
  }
} 