import { default as JSZip } from '../../../../../static/jszip.js'

export const useImageDownloader = () => {
  const addImageToZip = async (ctx, name, zip) => {
    if (!ctx) return
    
    const canvas = document.createElement('canvas')
    canvas.width = ctx.width
    canvas.height = ctx.height
    
    ctx.updatePreview(canvas, {
      width: ctx.width,
      height: ctx.height,
      smoothing: true,
      quality: 'high'
    })
    
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png')
    })
    
    zip.file(`${name}.png`, blob)
  }

  const downloadImages = async (currentCTX, processingSteps, resultCTX) => {
    const zip = new JSZip()
    
    // 添加原始图像
    await addImageToZip(currentCTX, '1_原始图像', zip)
    
    // 添加处理步骤图像
    for (let i = 0; i < processingSteps.length; i++) {
      const step = processingSteps[i]
      if (step.processed && step.ctx) {
        await addImageToZip(step.ctx, `${i + 2}_${step.name}`, zip)
      }
    }
    
    // 添加最终结果
    await addImageToZip(resultCTX, `${processingSteps.length + 2}_最终结果`, zip)
    
    // 生成并下载 zip 文件
    const content = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(content)
    link.download = '图像处理步骤.zip'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const downloadSingleImage = (ctx, name) => {
    if (!ctx) return
    
    const canvas = document.createElement('canvas')
    canvas.width = ctx.width
    canvas.height = ctx.height
    
    ctx.updatePreview(canvas, {
      width: ctx.width,
      height: ctx.height,
      smoothing: true,
      quality: 'high'
    })
    
    const link = document.createElement('a')
    link.download = `${name || '图片'}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return {
    downloadImages,
    downloadSingleImage
  }
} 