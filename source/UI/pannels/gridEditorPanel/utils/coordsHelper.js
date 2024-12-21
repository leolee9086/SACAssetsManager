import { getArtboardPosition } from './artboardPosition.js'

export const coordsHelper = {
  // 舞台坐标转换为画板坐标
  stageToArtboard(stage, stageX, stageY) {
    if (!stage) return { x: 0, y: 0 }

    const artboardPos = getArtboardPosition(stage.width(), stage.height())
    
    return {
      x: (stageX - stage.x() - artboardPos.x) / stage.scaleX(),
      y: (stageY - stage.y() - artboardPos.y) / stage.scaleY()
    }
  },

  // 画板坐标转换为舞台坐标
  artboardToStage(stage, artboardX, artboardY) {
    if (!stage) return { x: 0, y: 0 }

    const artboardPos = getArtboardPosition(stage.width(), stage.height())
    
    return {
      x: artboardX * stage.scaleX() + stage.x() + artboardPos.x,
      y: artboardY * stage.scaleY() + stage.y() + artboardPos.y
    }
  }
} 