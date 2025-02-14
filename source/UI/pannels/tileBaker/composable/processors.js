export const processors = {
    base: {
      name: '基础处理',
      enabled: true,
      expanded: false,
      // 主处理函数 - 结果会传递给下一步
      process: (pixels, params) => {
        // 原有的处理逻辑
        return pixels
      },
      // 变体调整 - 结果不会传递给下一步
      branches: [
        {
          name: '亮度/对比度变体',
          enabled: false,
          values: {
            brightness: 0,
            contrast: 1
          },
          params: [
            {
              key: 'brightness',
              label: '亮度',
              type: 'range',
              min: -1,
              max: 1,
              step: 0.1
            },
            {
              key: 'contrast',
              label: '对比度',
              type: 'range',
              min: 0,
              max: 2,
              step: 0.1
            }
          ],
          // 变体处理函数 - 基于主处理结果生成变体
          process: (mainStepResult, values) => {
            const pixels = mainStepResult.slice() // 复制主处理结果
            // 应用变体特定的处理
            for (let i = 0; i < pixels.length; i += 4) {
              // 应用亮度和对比度调整
              let value = pixels[i] / 255
              value = (value - 0.5) * values.contrast + 0.5 + values.brightness
              value = Math.max(0, Math.min(1, value)) * 255
              pixels[i] = pixels[i + 1] = pixels[i + 2] = value
            }
            return pixels
          }
        },
        {
          name: '锐化变体',
          enabled: false,
          values: {
            amount: 0.5
          },
          params: [
            {
              key: 'amount',
              label: '强度',
              type: 'range',
              min: 0,
              max: 1,
              step: 0.1
            }
          ],
          process: (mainStepResult, values) => {
            const pixels = mainStepResult.slice()
            // 应用锐化效果
            // ... 锐化处理逻辑
            return pixels
          }
        }
      ]
    },
    contrast: {
      name: '对比度调整',
      enabled: true,
      expanded: false,
      process: (pixels, params) => {
        const contrast = params.contrast
        for (let i = 0; i < pixels.length; i += 4) {
          const value = pixels[i] / 255
          const adjusted = 0.5 + (value - 0.5) * contrast
          const final = Math.max(0, Math.min(1, adjusted)) * 255
          pixels[i] = final
          pixels[i + 1] = final
          pixels[i + 2] = final
        }
        return pixels
      }
    },
    heightRange: {
      name: '深度范围映射',
      enabled: true,
      expanded: false,
      process: (pixels, params) => {
        const { heightRangeMin, heightRangeMax } = params
        for (let i = 0; i < pixels.length; i += 4) {
          const value = pixels[i] / 255
          const mapped = heightRangeMin + value * (heightRangeMax - heightRangeMin)
          const final = Math.max(0, Math.min(1, mapped)) * 255
          pixels[i] = final
          pixels[i + 1] = final
          pixels[i + 2] = final
        }
        return pixels
      }
    }
  }
  
  