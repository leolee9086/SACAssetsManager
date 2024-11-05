// 添加箭头绘制函数 
export const drawArrow = (ctx, point, side) => {
    const arrowSize = 8;
    ctx.beginPath();
  
    // 根据锚点方向调整箭头方向
    switch (side) {
      case 'left':
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(point.x + arrowSize, point.y - arrowSize);
        ctx.lineTo(point.x + arrowSize, point.y + arrowSize);
        break;
      case 'right':
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(point.x - arrowSize, point.y - arrowSize);
        ctx.lineTo(point.x - arrowSize, point.y + arrowSize);
        break;
      case 'top':
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(point.x - arrowSize, point.y + arrowSize);
        ctx.lineTo(point.x + arrowSize, point.y + arrowSize);
        break;
      case 'bottom':
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(point.x - arrowSize, point.y - arrowSize);
        ctx.lineTo(point.x + arrowSize, point.y - arrowSize);
        break;
    }
  
    ctx.closePath();
    ctx.fillStyle = '#67C23A';
    ctx.fill();
  };
  
  