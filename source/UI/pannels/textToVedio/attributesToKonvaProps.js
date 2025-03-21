import { CONFIG } from './defaultConfig.js';

export const attributesToKonvaProps = (attributes, config) => {
    // 获取渲染配置，确保我们使用的是完整的配置
    const renderConfig = CONFIG.rendering;
    
    const props = {
      fill: attributes.color || renderConfig.textColor,
      fontFamily: attributes.fontFamily || (renderConfig.font ? renderConfig.font.split('px ')[1] : 'KaiTi'),
      fontSize: parseInt(attributes.fontSize) || (renderConfig.font ? parseInt(renderConfig.font) : 48),
      fontStyle: '',
      align: attributes.align || 'center',
      verticalAlign: attributes.verticalAlign || 'middle',
      padding: parseInt(attributes.padding) || 0,
      opacity: parseFloat(attributes.opacity) || 1,
      x: 0,
      y: 0,
      offsetX: 0,
      offsetY: 0,
      shadowColor: attributes.shadowColor || undefined,
      shadowBlur: attributes.shadowBlur ? parseInt(attributes.shadowBlur) : undefined,
      shadowOffset: attributes.shadowOffset ? JSON.parse(attributes.shadowOffset) : undefined,
      shadowOpacity: attributes.shadowOpacity ? parseFloat(attributes.shadowOpacity) : undefined,
      strokeWidth: attributes.strokeWidth ? parseInt(attributes.strokeWidth) : 0,
      stroke: attributes.stroke || undefined,
    };
    
    if (attributes.bold) props.fontStyle += 'bold ';
    if (attributes.italic) props.fontStyle += 'italic ';
    props.fontStyle = props.fontStyle.trim() || 'normal';
    
    // 增强位置处理
    // 1. 处理预定义位置
    if (attributes.position && (CONFIG.positions[attributes.position] || attributes.position === 'custom')) {
      if (attributes.position === 'custom') {
        // 自定义位置 - 从x和y属性获取
        props.x = attributes.x ? parseFloat(attributes.x) * config.width : config.width / 2;
        props.y = attributes.y ? parseFloat(attributes.y) * config.height : config.height / 2;
      } else {
        // 预定义位置
        const pos = CONFIG.positions[attributes.position];
        props.x = pos.x * config.width;
        props.y = pos.y * config.height;
      }
    } else {
      // 默认使用中心位置
      const defaultPos = CONFIG.positions.center;
      props.x = defaultPos.x * config.width;
      props.y = defaultPos.y * config.height;
    }
    
    // 2. 处理原点(origin)定义
    if (attributes.origin) {
      let originPos;
      
      // 可以是预定义原点名称或直接是坐标
      if (CONFIG.origins[attributes.origin]) {
        originPos = CONFIG.origins[attributes.origin];
      } else if (attributes.origin.includes(',')) {
        // 解析形如 "0.1,0.2" 的坐标
        const [originX, originY] = attributes.origin.split(',').map(parseFloat);
        originPos = {x: originX, y: originY};
      } else {
        // 默认使用中心原点
        originPos = CONFIG.origins.center;
      }
      
      // 应用原点
      props.x = originPos.x * config.width;
      props.y = originPos.y * config.height;
    }
    
    // 3. 处理偏移量(offset)
    if (attributes.offsetX) {
      const offsetX = parseFloat(attributes.offsetX);
      // 可以是百分比(带%)或像素值
      if (attributes.offsetX.includes('%')) {
        props.x += (offsetX / 100) * config.width;
      } else {
        props.x += offsetX;
      }
    }
    
    if (attributes.offsetY) {
      const offsetY = parseFloat(attributes.offsetY);
      // 可以是百分比(带%)或像素值
      if (attributes.offsetY.includes('%')) {
        props.y += (offsetY / 100) * config.height;
      } else {
        props.y += offsetY;
      }
    }
    
    if (attributes.bgColor) {
      props.fillAfterStrokeEnabled = true;
      props.fillPriority = 'color';
    }
    
    return props;
  };
  
  