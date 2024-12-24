import Konva from '../../../../../static/konva.js'

export const imageLayer = {
  name: '图片',
  icon: '🖼️',
  group: 'resource',
  defaultConfig: {
    width: 200,
    height: 100,
    src: '/plugins/SACAssetsManager/assets/wechatDonate.jpg'
  },
  render: (config, layerId, stage) => {
    const imageObj = new Image()
    imageObj.src = config.src || '/plugins/SACAssetsManager/assets/wechatDonate.jpg'

    const imageNode = new Konva.Image({
      x: (config.x || 0),
      y: (config.y || 0),
      width: config.width || 200,
      height: config.height || 100,
      image: imageObj,
      draggable: !config.locked,
    })

    imageNode.on('dragend', () => {
      config.x = imageNode.x()
      config.y = imageNode.y()
    })

    imageNode.on('transform', () => {
      config.width = imageNode.width() * imageNode.scaleX()
      config.height = imageNode.height() * imageNode.scaleY()
      imageNode.scaleX(1)
      imageNode.scaleY(1)
    })

    return imageNode
  }
} 