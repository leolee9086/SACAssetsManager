

// LOD级别阈值查找表 - 使用查表法提高性能
const LOD_THRESHOLDS = [
    { threshold: 0.001, level: 0 },  // 极远视图
    { threshold: 0.01, level: 1 },   // 远视图
    { threshold: 0.1, level: 2 },    // 中远视图
    { threshold: 1, level: 3 },      // 中视图
    { threshold: 10, level: 4 },     // 中近视图
    { threshold: 100, level: 5 },    // 近视图
    { threshold: Number.MAX_VALUE, level: 6 }  // 极近视图，支持到JS数字上界
  ];
  
  // 获取当前LOD级别 - 优化为查表法
  export const getLODLevel = (viewState) => {
    const scale = viewState.scale;
    
    // 处理极小值边界情况
    if (scale <= Number.MIN_VALUE) return 0;
    
    // 查表法快速查询
    for (const entry of LOD_THRESHOLDS) {
      if (scale <= entry.threshold) {
        return entry.level;
      }
    }
    
    // 默认情况，不应该到达此处
    return 6;
  };
  
  // 网格大小计算查找表 - 使用查表法提高性能
  const GRID_SIZE_FACTORS = {
    0: (baseSize) => baseSize * 1000,   // 极远视图
    1: (baseSize) => baseSize * 100,    // 远视图
    2: (baseSize) => baseSize * 10,     // 中远视图
    3: (baseSize) => baseSize,          // 中视图 - 基本网格大小
    4: (baseSize) => baseSize / 10,     // 中近视图
    5: (baseSize) => baseSize / 100,    // 近视图
    6: (baseSize) => baseSize / 1000    // 极近视图
  };
  
  // 获取当前LOD级别的网格大小 - 优化为查表法
  export const getLODGridSize = (baseSize, viewState) => {
    const level = getLODLevel(viewState);
    
    // 查表法快速查询并计算网格大小
    const sizeFactor = GRID_SIZE_FACTORS[level] || GRID_SIZE_FACTORS[3]; // 默认使用中视图基准
    return sizeFactor(baseSize);
  };
  