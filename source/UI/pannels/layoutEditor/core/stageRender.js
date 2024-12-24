import { createArtboardLayers } from "./artboardManager.js"
import { renderLayers } from "./layerRenderer.js"
/**
 * 组合渲染画板和内容图层
 * @param {Object} stage Konva.Stage实例
 * @param {Array} artboards 画板数组
 * @param {Object} mainLayer 主图层引用
 * @param {boolean} isArtboardMode 是否处于画板模式
 * @param {Array} contentLayers 内容图层数组
 * @param {Map} layerRegistry 图层注册表
 * @param {Function} handleShapeClick 图形点击处理函数
 */
export const renderStageContent = async (
    stage,
    artboards,
    mainLayer,
    isArtboardMode,
    contentLayers,
    layerRegistry,
    handleShapeClick
) => {
    if (!stage) return

    // 先创建画板图层
    await createArtboardLayers(
        stage,
        artboards,
        mainLayer,
        isArtboardMode
    )

    // 然后渲染内容图层，确保正确的层级关系
    await renderLayers(
        contentLayers,
        mainLayer.value,
        layerRegistry,
        stage,
        handleShapeClick,
        artboards,
        isArtboardMode
    )
}