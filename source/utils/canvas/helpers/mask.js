const initCanvas = (size) => {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = size;
  tempCanvas.height = size;
  const ctx = tempCanvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.translate(size / 2, size / 2);
  return ctx;
};
  
export const createShapeMask = (
  shape,
  size,
  forClipping = false,
  nodeStrokeWidth,
  nodeStrokeColor,
  nodeTransform
) => {
  const ctx = initCanvas(size);
  const scaledStrokeWidth = nodeStrokeWidth / nodeTransform.scale;
  drawShape(ctx, shape, size, scaledStrokeWidth);
  applyStyle(ctx, forClipping, nodeStrokeWidth, nodeStrokeColor, scaledStrokeWidth);
  return ctx.canvas;
};
  
const drawShape = (ctx, shape, size, scaledStrokeWidth) => {
  ctx.beginPath();
  switch (typeof shape === 'object' ? shape.type : shape) {
    case 'circle':
      drawCircle(ctx, size, scaledStrokeWidth);
      break;
    case 'square':
      drawSquare(ctx, size, scaledStrokeWidth);
      break;
    case 'rectangle':
      drawRectangle(ctx, size, scaledStrokeWidth);
      break;
    case 'hexagon':
      drawHexagon(ctx, size, scaledStrokeWidth);
      break;
    case 'triangle':
      drawTriangle(ctx, size, scaledStrokeWidth);
      break;
    case 'star':
      drawStar(ctx, size, scaledStrokeWidth);
      break;
    case 'diamond':
      drawDiamond(ctx, size, scaledStrokeWidth);
      break;
    case 'octagon':
      drawOctagon(ctx, size, scaledStrokeWidth);
      break;
    case 'ellipse':
      drawEllipse(ctx, size, scaledStrokeWidth);
      break;
    case 'cross':
      drawCross(ctx, size, scaledStrokeWidth);
      break;
    case 'arrow':
      drawArrow(ctx, size, scaledStrokeWidth);
      break;
    case 'heart':
      drawHeart(ctx, size, scaledStrokeWidth);
      break;
    case 'cloud':
      drawCloud(ctx, size, scaledStrokeWidth);
      break;
    case 'polygon':
      drawRegularPolygon(ctx, size, scaledStrokeWidth, shape.sides||6);
      break;
    default:
      drawCircle(ctx, size, scaledStrokeWidth);
  }
};
  
const drawCircle = (ctx, size, strokeWidth) => {
  ctx.arc(0, 0, size / 2 - strokeWidth / 2, 0, Math.PI * 2);
};

const drawSquare = (ctx, size, strokeWidth) => {
  const half = size / 2 - strokeWidth / 2;
  ctx.rect(-half, -half, size - strokeWidth, size - strokeWidth);
};

const drawRectangle = (ctx, size, strokeWidth) => {
  const width = size - strokeWidth;
  const height = size * 0.66 - strokeWidth;
  ctx.rect(-width / 2, -height / 2, width, height);
};

const drawHexagon = (ctx, size, strokeWidth) => {
  const radius = size / 2 - strokeWidth / 2;
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
};

const drawTriangle = (ctx, size, strokeWidth) => {
  const r = size / 2 - strokeWidth / 2;
  ctx.moveTo(0, -r);
  ctx.lineTo(r * Math.cos(Math.PI / 6), r * Math.sin(Math.PI / 6));
  ctx.lineTo(-r * Math.cos(Math.PI / 6), r * Math.sin(Math.PI / 6));
  ctx.closePath();
};

const drawStar = (ctx, size, strokeWidth) => {
  const outerRadius = size / 2 - strokeWidth / 2;
  const innerRadius = outerRadius * 0.4;
  const points = 5;
  
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / points;
    const x = Math.cos(angle - Math.PI / 2) * radius;
    const y = Math.sin(angle - Math.PI / 2) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
};

const drawDiamond = (ctx, size, strokeWidth) => {
  const half = size / 2 - strokeWidth / 2;
  ctx.moveTo(0, -half);
  ctx.lineTo(half, 0);
  ctx.lineTo(0, half);
  ctx.lineTo(-half, 0);
  ctx.closePath();
};

const drawOctagon = (ctx, size, strokeWidth) => {
  const radius = size / 2 - strokeWidth / 2;
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
};

const drawEllipse = (ctx, size, strokeWidth) => {
  const radiusX = size / 2 - strokeWidth / 2;
  const radiusY = (size / 2 - strokeWidth / 2) * 0.6;
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
};

const drawCross = (ctx, size, strokeWidth) => {
  const length = size / 2 - strokeWidth / 2;
  const width = length * 0.25;
  
  ctx.moveTo(-width, -length);
  ctx.lineTo(width, -length);
  ctx.lineTo(width, -width);
  ctx.lineTo(length, -width);
  ctx.lineTo(length, width);
  ctx.lineTo(width, width);
  ctx.lineTo(width, length);
  ctx.lineTo(-width, length);
  ctx.lineTo(-width, width);
  ctx.lineTo(-length, width);
  ctx.lineTo(-length, -width);
  ctx.lineTo(-width, -width);
  ctx.closePath();
};

const drawArrow = (ctx, size, strokeWidth) => {
  const length = size / 2 - strokeWidth / 2;
  const width = length * 0.3;
  
  ctx.moveTo(0, -length);
  ctx.lineTo(width, -length/2);
  ctx.lineTo(width/2, -length/2);
  ctx.lineTo(width/2, length);
  ctx.lineTo(-width/2, length);
  ctx.lineTo(-width/2, -length/2);
  ctx.lineTo(-width, -length/2);
  ctx.closePath();
};

const drawHeart = (ctx, size, strokeWidth) => {
  const scale = (size / 2 - strokeWidth / 2) / 12;
  
  ctx.moveTo(0, 2 * scale);
  
  // 左半边
  ctx.bezierCurveTo(
    -10 * scale, -8 * scale,
    -20 * scale, 0 * scale,
    0, 12 * scale
  );
  
  // 右半边
  ctx.bezierCurveTo(
    20 * scale, 0 * scale,
    10 * scale, -8 * scale,
    0, 2 * scale
  );
};

const drawCloud = (ctx, size, strokeWidth) => {
  const radius = (size / 2 - strokeWidth / 2) * 0.3;
  
  ctx.arc(-radius * 1.5, radius, radius, 0, Math.PI * 2);
  ctx.arc(0, 0, radius * 1.2, 0, Math.PI * 2);
  ctx.arc(radius * 1.5, radius * 0.8, radius, 0, Math.PI * 2);
  ctx.arc(0, radius * 1.2, radius * 1.1, 0, Math.PI * 2);
};
  
const applyStyle = (ctx, forClipping, nodeStrokeWidth, nodeStrokeColor, scaledStrokeWidth) => {
  if (forClipping) {
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  } else {
    ctx.fillStyle = 'transparent';
    ctx.fill();

    if (nodeStrokeWidth > 0) {
      ctx.strokeStyle = nodeStrokeColor;
      ctx.lineWidth = scaledStrokeWidth;
      ctx.stroke();
    }
  }
};
  
const drawRegularPolygon = (ctx, size, strokeWidth, sides) => {
  const radius = size / 2 - strokeWidth / 2;
  ctx.beginPath();
  
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.closePath();
};
  