/**
 * 召回率计算工具模块
 * 用于计算HNSW实现的召回率和结果匹配度
 */

// 设置为true可启用详细的调试输出
const ENABLE_DEBUG_OUTPUT = false;

/**
 * 从精确查询结果中提取ID
 * @param {Object} item - 精确查询结果项
 * @returns {string} 提取的ID
 */
function extractExactResultId(item) {
  return item.id; // 精确查询结果格式固定为 {id: "timestamp_index", distance: value, data: {...}}
}

/**
 * 从自定义HNSW结果中提取ID
 * @param {Object} item - 自定义HNSW结果项
 * @returns {number} 提取的ID
 */
function extractCustomHnswId(item) {
  return item.id; // 自定义HNSW返回格式固定为 {id: number, distance: value, data: {...}}
}

/**
 * 从经典HNSW结果中提取ID
 * @param {Object} item - 经典HNSW结果项
 * @returns {string} 提取的ID
 */
function extractClassicHnswId(item) {
  return item.id; // 经典HNSW返回完整数据对象，包含原始id
}

/**
 * 从Hora WASM HNSW结果中提取ID
 * @param {Array} item - Hora WASM HNSW结果项
 * @returns {number} 提取的ID
 */
function extractHoraHnswId(item) {
  return item; // Hora返回格式固定为 [index] 数组
}

/**
 * 检查自定义HNSW ID是否匹配精确结果ID
 * 自定义HNSW返回纯数字ID，精确结果返回"timestamp_index"格式
 * @param {number|string} customId - 自定义HNSW的ID
 * @param {string|number} exactId - 精确结果的ID
 * @returns {boolean} 是否匹配
 */
function matchCustomToExact(customId, exactId) {
  // 直接相等
  if (customId === exactId) {
    return true;
  }
  
  // 字符串表示相等
  if (String(customId) === String(exactId)) {
    return true;
  }
  
  // 从"timestamp_index"格式中提取index部分
  if (typeof exactId === 'string' && exactId.includes('_')) {
    const indexPart = exactId.split('_')[1];
    return String(customId) === indexPart || customId === Number(indexPart);
  }
  
  // 尝试反向匹配：如果customId是"timestamp_index"格式
  if (typeof customId === 'string' && customId.includes('_')) {
    const indexPart = customId.split('_')[1];
    return String(exactId) === indexPart || exactId === Number(indexPart);
  }
  
  return false;
}

/**
 * 检查经典HNSW ID是否匹配精确结果ID
 * 经典HNSW和精确结果都使用完整的"timestamp_index"格式
 * @param {string|number} classicId - 经典HNSW的ID
 * @param {string|number} exactId - 精确结果的ID
 * @returns {boolean} 是否匹配
 */
function matchClassicToExact(classicId, exactId) {
  // 直接相等
  if (classicId === exactId) {
    return true;
  }
  
  // 字符串表示相等
  if (String(classicId) === String(exactId)) {
    return true;
  }
  
  // 尝试比较数字部分
  if (typeof classicId === 'string' && typeof exactId === 'string') {
    if (classicId.includes('_') && exactId.includes('_')) {
      const classicIndexPart = classicId.split('_')[1];
      const exactIndexPart = exactId.split('_')[1];
      return classicIndexPart === exactIndexPart;
    }
  }
  
  // 如果一个是ID格式，一个是纯数字
  if (typeof classicId === 'string' && classicId.includes('_')) {
    const indexPart = classicId.split('_')[1];
    return String(exactId) === indexPart || exactId === Number(indexPart);
  }
  
  if (typeof exactId === 'string' && exactId.includes('_')) {
    const indexPart = exactId.split('_')[1];
    return String(classicId) === indexPart || classicId === Number(indexPart);
  }
  
  return false;
}

/**
 * 检查Hora HNSW ID是否匹配精确结果ID
 * Hora返回纯数字ID，精确结果返回"timestamp_index"格式
 * @param {number|string} horaId - Hora HNSW的ID
 * @param {string|number} exactId - 精确结果的ID
 * @returns {boolean} 是否匹配
 */
function matchHoraToExact(horaId, exactId) {
  // 直接相等
  if (horaId === exactId) {
    return true;
  }
  
  // 字符串表示相等
  if (String(horaId) === String(exactId)) {
    return true;
  }
  
  // 从"timestamp_index"格式中提取index部分
  if (typeof exactId === 'string' && exactId.includes('_')) {
    const indexPart = exactId.split('_')[1];
    return String(horaId) === indexPart || horaId === Number(indexPart);
  }
  
  // 尝试反向匹配：如果horaId是"timestamp_index"格式
  if (typeof horaId === 'string' && horaId.includes('_')) {
    const indexPart = horaId.split('_')[1];
    return String(exactId) === indexPart || exactId === Number(indexPart);
  }
  
  return false;
}

/**
 * 计算召回率 - 自定义HNSW实现专用
 * @param {Array} customResults - 自定义HNSW搜索结果
 * @param {Array} exactResults - 精确搜索结果
 * @param {number} k - 前k个结果用于计算召回率
 * @param {boolean} debug - 是否打印调试信息
 * @returns {number} - 召回率，范围0-1
 */
function computeCustomRecallRate(customResults, exactResults, k = 10, debug = false) {
  if (!customResults || !exactResults || customResults.length === 0 || exactResults.length === 0) {
    if (debug) console.log("错误：无效的输入结果集");
    return 0;
  }
  
  // 处理结果数量小于k的情况
  const effectiveK = Math.min(k, Math.min(customResults.length, exactResults.length));
  
  // 提取前k个精确结果的ID
  const exactIds = exactResults.slice(0, effectiveK).map(item => extractExactResultId(item));
  
  if (debug) {
    console.log(`精确结果ID:`, exactIds);
  }
  
  // 计算有多少个近似结果与精确结果匹配
  let matchCount = 0;
  const matchedIds = [];
  
  // 遍历前k个自定义HNSW结果
  const customIds = customResults.slice(0, effectiveK).map(item => extractCustomHnswId(item));
  
  if (debug) {
    console.log(`自定义HNSW结果ID:`, customIds);
  }
  
  // 对每个自定义HNSW结果ID，检查是否匹配任何精确结果
  for (let i = 0; i < customIds.length; i++) {
    const customId = customIds[i];
    
    // 检查是否匹配任何精确结果
    for (let j = 0; j < exactIds.length; j++) {
      const exactId = exactIds[j];
      
      if (matchCustomToExact(customId, exactId)) {
        matchCount++;
        matchedIds.push(customId);
        
        if (debug) {
          console.log(`✓ ID匹配成功: 自定义HNSW ID ${customId} 匹配 精确结果ID ${exactId}`);
        }
        
        break; // 已找到匹配，继续检查下一个ID
      }
    }
  }
  
  // 计算召回率
  const recallRate = effectiveK > 0 ? matchCount / effectiveK : 0;
  
  if (debug) {
    console.log(`\n自定义HNSW匹配结果: ${matchCount}/${effectiveK} 匹配`);
    console.log(`匹配的ID数量:`, matchCount);
    console.log(`召回率: ${recallRate.toFixed(4)} (${(recallRate * 100).toFixed(2)}%)`);
  }
  
  return recallRate;
}

/**
 * 计算召回率 - 经典HNSW实现专用
 * @param {Array} classicResults - 经典HNSW搜索结果
 * @param {Array} exactResults - 精确搜索结果
 * @param {number} k - 前k个结果用于计算召回率
 * @param {boolean} debug - 是否打印调试信息
 * @returns {number} - 召回率，范围0-1
 */
function computeClassicRecallRate(classicResults, exactResults, k = 10, debug = false) {
  if (!classicResults || !exactResults || classicResults.length === 0 || exactResults.length === 0) {
    if (debug) console.log("错误：无效的输入结果集");
    return 0;
  }
  
  // 处理结果数量小于k的情况
  const effectiveK = Math.min(k, Math.min(classicResults.length, exactResults.length));
  
  // 提取前k个精确结果的ID
  const exactIds = exactResults.slice(0, effectiveK).map(item => extractExactResultId(item));
  
  if (debug) {
    console.log(`精确结果ID:`, exactIds);
  }
  
  // 计算有多少个近似结果与精确结果匹配
  let matchCount = 0;
  const matchedIds = [];
  
  // 遍历前k个经典HNSW结果
  const classicIds = classicResults.slice(0, effectiveK).map(item => extractClassicHnswId(item));
  
  if (debug) {
    console.log(`经典HNSW结果ID:`, classicIds);
  }
  
  // 对每个经典HNSW结果ID，检查是否匹配任何精确结果
  for (let i = 0; i < classicIds.length; i++) {
    const classicId = classicIds[i];
    
    // 检查是否匹配任何精确结果
    for (let j = 0; j < exactIds.length; j++) {
      const exactId = exactIds[j];
      
      if (matchClassicToExact(classicId, exactId)) {
        matchCount++;
        matchedIds.push(classicId);
        
        if (debug) {
          console.log(`✓ ID匹配成功: 经典HNSW ID ${classicId} 匹配 精确结果ID ${exactId}`);
        }
        
        break; // 已找到匹配，继续检查下一个ID
      }
    }
  }
  
  // 计算召回率
  const recallRate = effectiveK > 0 ? matchCount / effectiveK : 0;
  
  if (debug) {
    console.log(`\n经典HNSW匹配结果: ${matchCount}/${effectiveK} 匹配`);
    console.log(`匹配的ID数量:`, matchCount);
    console.log(`召回率: ${recallRate.toFixed(4)} (${(recallRate * 100).toFixed(2)}%)`);
  }
  
  return recallRate;
}

/**
 * 计算召回率 - Hora WASM HNSW实现专用
 * @param {Array} horaResults - Hora WASM HNSW搜索结果
 * @param {Array} exactResults - 精确搜索结果
 * @param {number} k - 前k个结果用于计算召回率
 * @param {boolean} debug - 是否打印调试信息
 * @returns {number} - 召回率，范围0-1
 */
function computeHoraRecallRate(horaResults, exactResults, k = 10, debug = false) {
  if (!horaResults || !exactResults || horaResults.length === 0 || exactResults.length === 0) {
    if (debug) console.log("错误：无效的输入结果集");
    return 0;
  }
  
  // 处理结果数量小于k的情况
  const effectiveK = Math.min(k, Math.min(horaResults.length, exactResults.length));
  
  // 提取前k个精确结果的ID
  const exactIds = exactResults.slice(0, effectiveK).map(item => extractExactResultId(item));
  
  if (debug) {
    console.log(`精确结果ID:`, exactIds);
  }
  
  // 计算有多少个近似结果与精确结果匹配
  let matchCount = 0;
  const matchedIds = [];
  
  const horaIds = horaResults.slice(0, effectiveK).map(item => extractHoraHnswId(item));
  
  if (debug) {
    console.log(`Hora WASM HNSW结果ID:`, horaIds);
  }
  
  // 对每个Hora HNSW结果ID，检查是否匹配任何精确结果
  for (let i = 0; i < horaIds.length; i++) {
    const horaId = horaIds[i];
    
    // 检查是否匹配任何精确结果
    for (let j = 0; j < exactIds.length; j++) {
      const exactId = exactIds[j];
      
      if (matchHoraToExact(horaId, exactId)) {
        matchCount++;
        matchedIds.push(horaId);
        
        if (debug) {
          console.log(`✓ ID匹配成功: Hora HNSW ID ${horaId} 匹配 精确结果ID ${exactId}`);
        }
        
        break; // 已找到匹配，继续检查下一个ID
      }
    }
  }
  
  // 计算召回率
  const recallRate = effectiveK > 0 ? matchCount / effectiveK : 0;
  
  if (debug) {
    console.log(`\nHora WASM HNSW匹配结果: ${matchCount}/${effectiveK} 匹配`);
    console.log(`匹配的ID数量:`, matchCount);
    console.log(`召回率: ${recallRate.toFixed(4)} (${(recallRate * 100).toFixed(2)}%)`);
  }
  
  return recallRate;
}

export { 
  computeCustomRecallRate, 
  computeClassicRecallRate, 
  computeHoraRecallRate,
  matchCustomToExact,
  matchClassicToExact,
  matchHoraToExact,
  ENABLE_DEBUG_OUTPUT
}; 