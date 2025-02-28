// 扩展的LOD级别阈值查找表 - 支持从JS数值下界到上界的完整范围
export const LOD_THRESHOLDS = [
  { threshold: Number.MIN_VALUE, level: -17 },  // JS最小正数
  { threshold: 1e-308, level: -16 },            // 接近最小值
  { threshold: 1e-256, level: -15 },            // 极微小值
  { threshold: 1e-200, level: -14 },            // 极微小值
  { threshold: 1e-150, level: -13 },            // 极微小值
  { threshold: 1e-100, level: -12 },            // 极微小值
  { threshold: 1e-50, level: -11 },             // 极微小值  
  { threshold: 1e-25, level: -10 },             // 极微小值
  { threshold: 1e-20, level: -9 },              // 极微小值
  { threshold: 1e-15, level: -8 },              // 极微小值
  { threshold: 1e-10, level: -7 },              // 极微小值
  { threshold: 1e-8, level: -6 },               // 极微小值
  { threshold: 1e-6, level: -5 },               // 极微小值
  { threshold: 1e-4, level: -4 },               // 极微小值
  { threshold: 1e-3, level: -3 },               // 微小值
  { threshold: 1e-2, level: -2 },               // 极远视图
  { threshold: 1e-1, level: -1 },               // 远视图
  { threshold: 1, level: 0 },                   // 基准视图
  { threshold: 1e1, level: 1 },                 // 中视图
  { threshold: 1e2, level: 2 },                 // 中近视图
  { threshold: 1e3, level: 3 },                 // 近视图
  { threshold: 1e4, level: 4 },                 // 极近视图
  { threshold: 1e6, level: 5 },                 // 超近视图
  { threshold: 1e8, level: 6 },                 // 微观视图
  { threshold: 1e10, level: 7 },                // 微观细节视图
  { threshold: 1e15, level: 8 },                // 纳米级视图
  { threshold: 1e20, level: 9 },                // 原子级视图
  { threshold: 1e25, level: 10 },               // 亚原子级视图
  { threshold: 1e50, level: 11 },               // 超微观视图
  { threshold: 1e100, level: 12 },              // 量子级视图
  { threshold: 1e150, level: 13 },              // 超量子级视图
  { threshold: 1e200, level: 14 },              // 接近最大值
  { threshold: 1e250, level: 15 },              // 接近最大值
  { threshold: 1e300, level: 16 },              // 接近最大值
  { threshold: Number.MAX_VALUE, level: 17 }    // JS最大数值
];

// 扩展的网格大小计算查找表 - 增加对应级别
export const GRID_SIZE_FACTORS = {
  "-15": (baseSize) => baseSize * 1e15,  // JS最小正数级
  "-14": (baseSize) => baseSize * 1e14,
  "-13": (baseSize) => baseSize * 1e13,
  "-12": (baseSize) => baseSize * 1e12,
  "-11": (baseSize) => baseSize * 1e11,
  "-10": (baseSize) => baseSize * 1e10,
  "-9": (baseSize) => baseSize * 1e9,
  "-8": (baseSize) => baseSize * 1e8,
  "-7": (baseSize) => baseSize * 1e7,
  "-6": (baseSize) => baseSize * 1e6,
  "-5": (baseSize) => baseSize * 1e5,
  "-4": (baseSize) => baseSize * 1e4,
  "-3": (baseSize) => baseSize * 1e3,
  "-2": (baseSize) => baseSize * 1e2,
  "-1": (baseSize) => baseSize * 10,
  "0": (baseSize) => baseSize,           // 极远视图基准
  "1": (baseSize) => baseSize / 10,      // 远视图
  "2": (baseSize) => baseSize / 100,     // 中远视图
  "3": (baseSize) => baseSize / 1000,    // 中视图
  "4": (baseSize) => baseSize / 1e4,     // 中近视图
  "5": (baseSize) => baseSize / 1e5,     // 近视图
  "6": (baseSize) => baseSize / 1e6,     // 极近视图
  "7": (baseSize) => baseSize / 1e7,     // 超近视图
  "8": (baseSize) => baseSize / 1e8,     // 微观视图
  "9": (baseSize) => baseSize / 1e9,     // 微观细节视图
  "10": (baseSize) => baseSize / 1e10,   // 纳米级视图
  "11": (baseSize) => baseSize / 1e11,   // 原子级视图
  "12": (baseSize) => baseSize / 1e12,   // 亚原子级视图
  "13": (baseSize) => baseSize / 1e13,   // 超微观视图
  "14": (baseSize) => baseSize / 1e14,   // 量子级视图
  "15": (baseSize) => baseSize / 1e15,   // 超量子级视图
  "16": (baseSize) => baseSize / 1e16,   // 接近最大值
  "17": (baseSize) => baseSize / 1e17,   // 接近最大值
  "18": (baseSize) => baseSize / 1e18,   // 接近最大值
  "19": (baseSize) => baseSize / 1e19    // JS最大数值级
};

// 获取当前LOD级别 - 优化为查表法
export const getLODLevel = (viewState) => {
  // 如果传入的是简单的数值，转换为正确的格式
  const scale = typeof viewState === 'number' ? viewState : 
                (viewState.scale !== undefined ? viewState.scale : 1.0);
  
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

// 获取当前LOD级别的网格大小 - 优化为查表法
export const getLODGridSize = (baseSize, viewState) => {
  const level = getLODLevel(viewState);
  
  // 查表法快速查询并计算网格大小
  const sizeFactor = GRID_SIZE_FACTORS[level] || GRID_SIZE_FACTORS[3]; // 默认使用中视图基准
  return sizeFactor(baseSize);
}; 