/**
 * 向量生成工具模块
 * 用于生成测试用的随机向量数据集
 */

/**
 * 生成随机向量数据集
 * @param {number} numVectors - 向量数量
 * @param {number} dimensions - 向量维度
 * @param {boolean} useFloat32 - 是否使用Float32Array类型
 * @returns {Array<{id: number, vector: Object, meta: Object}>} 生成的向量数据集
 */
function generateRandomVectors(numVectors, dimensions, useFloat32 = true) {
  // 防御性检查
  if (!numVectors || numVectors <= 0 || !dimensions || dimensions <= 0) {
    throw new Error('生成随机向量错误: 无效参数');
  }

  const vectors = [];
  // 使用一个Set来跟踪已生成的ID，防止重复
  const existingIds = new Set();

  for (let i = 0; i < numVectors; i++) {
    let vector;

    if (useFloat32) {
      vector = new Float32Array(dimensions);
      for (let j = 0; j < dimensions; j++) {
        // 使用较小的随机值范围，避免数值不稳定
        vector[j] = Math.random() * 2 - 1; // 范围在 [-1, 1] 之间

        // 确保没有NaN或无穷值
        if (isNaN(vector[j]) || !isFinite(vector[j])) {
          vector[j] = 0; // 如果生成了无效值，使用0替代
        }
      }
    } else {
      vector = new Array(dimensions);
      for (let j = 0; j < dimensions; j++) {
        vector[j] = Math.random() * 2 - 1;

        // 确保没有NaN或无穷值
        if (isNaN(vector[j]) || !isFinite(vector[j])) {
          vector[j] = 0;
        }
      }
    }
    
    // 归一化向量 - 计算向量的模长
    let norm = 0;
    for (let j = 0; j < dimensions; j++) {
      norm += vector[j] * vector[j];
    }
    norm = Math.sqrt(norm);
    
    // 防止除以零
    if (norm > 0) {
      for (let j = 0; j < dimensions; j++) {
        vector[j] /= norm;
      }
    } else {
      // 如果向量长度为零，生成单位向量
      vector[0] = 1;
    }

    // 生成一个简短的数字ID
    let id;
    do {
      // 生成14位数字开头的ID
      const timestamp = new Date().getTime(); // 13位时间戳
      const randomDigit = Math.floor(Math.random() * 10); // 1位随机数字
      id = `${timestamp}${randomDigit}_${i}`; // 14位数字 + 下划线 + 索引
    } while (existingIds.has(id));
    
    // 记录ID，防止重复
    existingIds.add(id);

    vectors.push({
      id: id, // 数字ID
      vector: { test_model: vector },  // 使用命名的向量字段
      meta: {                          // 直接添加meta字段
        id: id,
        text: `向量_${i}`,
        path: `test_path_${i}`         // 添加路径字段作为文件路径键
      }
    });
  }

  return vectors;
}

export { generateRandomVectors }; 