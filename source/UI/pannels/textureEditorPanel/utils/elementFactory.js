/**
 * 元素工厂工具 - 创建和管理Konva元素
 */

// 对象池 - 为常用元素类型提供缓存
const getElementPool = () => {
  window._konvaElementPool = window._konvaElementPool || {
    line: [],
    circle: [],
    rect: [],
    text: []
  };
  return window._konvaElementPool;
};

/**
 * 从对象池获取元素
 * @param {string} type 元素类型
 * @returns {Object|null} Konva元素或null
 */
const getFromPool = (type) => {
  const pool = getElementPool()[type];
  return pool && pool.length > 0 ? pool.pop() : null;
};

/**
 * 创建Konva元素的工厂函数
 * @param {Object} element 元素配置对象
 * @returns {Object|null} 创建的Konva元素或null
 */
export const createKonvaElement = (element) => {
  if (!element || !element.type) return null;

  let konvaElement = null;

  // 尝试从对象池获取元素
  konvaElement = getFromPool(element.type);

  if (!konvaElement) {
    // 如果对象池为空，则创建新元素
    switch (element.type) {
      case 'line':
        konvaElement = new Konva.Line({
          id: element.id,
          listening: false // 默认不监听事件，提高性能
        });
        break;
      case 'circle':
        konvaElement = new Konva.Circle({
          x: element.x || 0,
          y: element.y || 0,
          radius: element.radius || 10,
          fill: element.fill || 'blue',
          stroke: element.stroke,
          strokeWidth: element.strokeWidth,
          id: element.id,
          draggable: element.draggable !== false,
          ...element.config
        });
        break;
      case 'rect':
        konvaElement = new Konva.Rect({
          x: element.x || 0,
          y: element.y || 0,
          width: element.width || 20,
          height: element.height || 20,
          fill: element.fill || 'green',
          stroke: element.stroke,
          strokeWidth: element.strokeWidth,
          id: element.id,
          draggable: element.draggable !== false,
          ...element.config
        });
        break;
      case 'text':
        konvaElement = new Konva.Text({
          x: element.x || 0,
          y: element.y || 0,
          text: element.text || '',
          fontSize: element.fontSize || 16,
          fontFamily: element.fontFamily || 'Arial',
          fill: element.fill || 'black',
          id: element.id,
          draggable: element.draggable !== false,
          ...element.config
        });
        break;
      case 'image':
        // 为图片创建特殊处理
        if (element.imageUrl) {
          const imageObj = new Image();
          imageObj.onload = () => {
            konvaElement.image(imageObj);
            // 注意：这里不能直接引用mainLayer，我们需要通过回调处理
            if (element.onImageLoad) {
              element.onImageLoad(konvaElement);
            }
          };
          imageObj.src = element.imageUrl;

          konvaElement = new Konva.Image({
            x: element.x || 0,
            y: element.y || 0,
            width: element.width,
            height: element.height,
            id: element.id,
            draggable: element.draggable !== false,
            ...element.config
          });
        }
        break;
      case 'path':
        konvaElement = new Konva.Path({
          data: element.data || '',
          fill: element.fill,
          stroke: element.stroke || 'black',
          strokeWidth: element.strokeWidth || 1,
          id: element.id,
          draggable: element.draggable !== false,
          ...element.config
        });
        break;
      case 'custom':
        // 支持自定义元素
        if (element.createFunction && typeof element.createFunction === 'function') {
          konvaElement = element.createFunction(Konva, element);
        }
        break;
      default:
        console.warn('不支持的元素类型:', element.type);
    }
  }

  // 更新元素配置
  if (konvaElement) {
    konvaElement.id(element.id);

    switch (element.type) {
      case 'line':
        konvaElement.points(element.points || []);
        konvaElement.stroke(element.stroke || 'black');
        konvaElement.strokeWidth(element.strokeWidth || 2);
        konvaElement.draggable(element.draggable !== false);
        break;
      case 'circle':
        konvaElement.x(element.x || 0);
        konvaElement.y(element.y || 0);
        konvaElement.radius(element.radius || 10);
        konvaElement.fill(element.fill || 'blue');
        konvaElement.stroke(element.stroke);
        konvaElement.strokeWidth(element.strokeWidth);
        konvaElement.draggable(element.draggable !== false);
        break;
      case 'rect':
        konvaElement.x(element.x || 0);
        konvaElement.y(element.y || 0);
        konvaElement.width(element.width || 20);
        konvaElement.height(element.height || 20);
        konvaElement.fill(element.fill || 'green');
        konvaElement.stroke(element.stroke);
        konvaElement.strokeWidth(element.strokeWidth);
        konvaElement.draggable(element.draggable !== false);
        break;
      case 'text':
        konvaElement.text(element.text || '');
        konvaElement.fontSize(element.fontSize || 16);
        konvaElement.fontFamily(element.fontFamily || 'Arial');
        konvaElement.fill(element.fill || 'black');
        konvaElement.draggable(element.draggable !== false);
        break;
      case 'image':
        konvaElement.image(element.image);
        konvaElement.width(element.width);
        konvaElement.height(element.height);
        konvaElement.draggable(element.draggable !== false);
        break;
      case 'path':
        konvaElement.data(element.data || '');
        konvaElement.fill(element.fill);
        konvaElement.stroke(element.stroke || 'black');
        konvaElement.strokeWidth(element.strokeWidth || 1);
        konvaElement.draggable(element.draggable !== false);
        break;
      case 'custom':
        konvaElement.draggable(element.draggable !== false);
        break;
    }
  }

  return konvaElement;
};

/**
 * 为元素添加事件处理
 * @param {Object} konvaElement Konva元素
 * @param {Object} element 元素配置数据
 * @param {Function} onSelect 选择元素的回调函数
 * @param {Function} onPositionUpdate 位置更新的回调函数
 */
export const attachElementEvents = (konvaElement, element, onSelect, onPositionUpdate) => {
  if (!konvaElement || !element.needsEvents) return;
  
  konvaElement.listening(true);
  
  // 添加事件监听
  konvaElement.off('click'); // 先移除旧事件
  konvaElement.on('click', () => {
    if (typeof onSelect === 'function') {
      onSelect(element);
    }
  });

  konvaElement.off('dragend');
  konvaElement.on('dragend', () => {
    if (typeof onPositionUpdate === 'function') {
      onPositionUpdate(element.id, konvaElement);
    }
  });
}; 