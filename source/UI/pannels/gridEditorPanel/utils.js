// 基向量验证和限制函数
export const validateAndNormalizeBasis = (basis) => {
    const MIN_COMPONENT = 10;
    const MAX_RATIO = 5;
  
    let x = Number(basis.x);
    let y = Number(basis.y);
  
    if (Math.abs(x) < MIN_COMPONENT && Math.abs(y) < MIN_COMPONENT) {
      if (x === 0 && y === 0) {
        x = MIN_COMPONENT;
      } else {
        if (Math.abs(x) < Math.abs(y)) {
          x = x === 0 ? MIN_COMPONENT : Math.sign(x) * MIN_COMPONENT;
        } else {
          y = y === 0 ? MIN_COMPONENT : Math.sign(y) * MIN_COMPONENT;
        }
      }
    }
  
    const ratio = Math.max(Math.abs(x), Math.abs(y)) / 
      Math.min(Math.abs(x) || MIN_COMPONENT, Math.abs(y) || MIN_COMPONENT);
  
    if (ratio > MAX_RATIO) {
      if (Math.abs(x) > Math.abs(y)) {
        x = Math.sign(x) * Math.abs(y) * MAX_RATIO;
      } else {
        y = Math.sign(y) * Math.abs(x) * MAX_RATIO;
      }
    }
  
    return { x, y };
  };