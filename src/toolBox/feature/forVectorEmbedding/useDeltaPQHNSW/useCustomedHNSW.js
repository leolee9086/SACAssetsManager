/**
 * HNSW (Hierarchical Navigable Small World) 索引实现
 * 用于高性能近似最近邻搜索的层次化图结构
 * 
 * 此实现特点:
 * 1. 采用函数式风格，避免嵌套函数结构
 * 2. 使用LRU缓存优化距离计算
 * 3. 支持距离计算的多种度量方式 (欧几里得、余弦、内积)
 * 4. 逻辑删除节点而非物理删除，减少内存碎片
 * 5. 使用分层搜索策略实现对数时间复杂度查询
 * 6. 针对JavaScript执行环境进行了优化
 * 
 * 性能考量:
 * - 时间复杂度: 构建O(n log n)，查询O(log n) 
 * - 空间复杂度: O(n * M * L)，其中M为最大连接数，L为平均层数
 * - 距离计算缓存用于减少重复计算
 * - 搜索参数ef和efConstruction可调整精度与速度的平衡
 */

// 导入所有距离计算函数
import {
  computeEuclideanDistance,
  computeCosineDistance,
  computeCosineSimilarity,
  computeInnerProduct
} from "../../../base/forMath/forGeometry/forVectors/forDistance.js";

// 导入最小堆实现
import { createMinHeap } from "../../../feature/useDataStruct/useHeaps/useMinHeap.js";

// 导入HNSW辅助函数
import {
  createDistanceCache,
  getRandomLevel,
  createHNSWNode
} from "./forHNSWHelpers.js";

// 导入ID映射辅助函数
import {
  ensureNodeIdMapping
} from "./forHNSWIdMapping.js";

// 常量定义
const DEFAULT_M = 64;              // 每个节点最大连接数
const DEFAULT_EF_CONSTRUCTION = 200; // 构建时的候选集大小
const DEFAULT_EF_SEARCH = 200;      // 搜索时的候选集大小，从50增加到200提高召回率
const DEFAULT_ML = 16;            // 最大层数


/**
 * 在指定层查找K个最近邻节点，使用最小堆优化
 * @param {Object} q - 查询节点
 * @param {number} k - 返回的邻居数量
 * @param {number} ef - 搜索候选集大小
 * @param {number} level - 搜索的层级
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {Function} distanceFunc - 距离计算函数
 * @param {Set<number>} [excludeIds] - 要排除的节点ID集合
 * @param {Set<number>} [visitedNodes] - 已访问节点跟踪，可传入跨层次共享的访问记录
 * @returns {Array<{id: number, distance: number}>} 最近邻节点列表
 */
export function searchLayer(q, k, ef, level, nodes, entryPoint, distanceFunc, excludeIds = new Set(), visitedNodes = new Set()) {
  // 安全检查
  if (!entryPoint || !q || !q.vector) {
    console.warn('搜索层失败: 无效的入口点或查询向量');
    return [];
  }
  
  // 确保ef至少为k
  const effectiveEf = Math.max(ef, k);
  
  // 从入口点开始
  const ep = nodes.get(entryPoint.id);
  if (!ep || ep.deleted || !ep.vector) {
    console.warn(`搜索层失败: 找不到入口点节点或节点无效`);
    return [];
  }
  
  // 初始化已访问集
  const visited = new Set([...visitedNodes]);
  visited.add(entryPoint.id);
  
  // 计算到入口点的距离
  let distance;
  try {
    distance = distanceFunc(q.vector, ep.vector);
  } catch (error) {
    console.error('计算距离失败:', error);
    return [];
  }
  
  // 优先队列(最小堆) - 按距离从小到大排序，用于确定下一个访问的节点
  const candidatesHeap = createMinHeap((a, b) => a.distance - b.distance);
  candidatesHeap.push({ id: ep.id, distance });
  
  // 结果队列(最大堆) - 按距离从大到小排序，保留最近的ef个节点
  const resultsHeap = createMinHeap((a, b) => b.distance - a.distance);
  resultsHeap.push({ id: ep.id, distance });
  
  // 当前结果集中最远距离的基准
  let currentDistance = distance;
  
  // 当候选集不为空时继续搜索
  while (candidatesHeap.size() > 0) {
    // 获取当前最近的候选节点
    const current = candidatesHeap.pop();
    if (!current) continue;
    
    // 如果候选节点比结果集中最远的节点还远，且结果集已满，则停止搜索
    if (resultsHeap.size() >= effectiveEf && current.distance > currentDistance) {
      break;
    }
    
    // 获取节点并检查其连接
    const currentNode = nodes.get(current.id);
    if (!currentNode || currentNode.deleted) continue;
    
    // 获取当前层的连接
    const connections = Array.isArray(currentNode.connections[level]) ? 
      currentNode.connections[level] : [];
    
    // 检查所有邻居
    for (const neighborId of connections) {
      // 跳过已访问或排除的节点
      if (visited.has(neighborId) || excludeIds.has(neighborId)) continue;
      
      const neighbor = nodes.get(neighborId);
      if (!neighbor || neighbor.deleted || !neighbor.vector) continue;
      
      // 标记为已访问
      visited.add(neighborId);
      
      // 计算距离
      let neighborDistance;
      try {
        neighborDistance = distanceFunc(q.vector, neighbor.vector);
      } catch (error) {
        continue;
      }
      
      // 如果结果集未满或距离小于当前最远距离，则加入结果集和候选集
      if (resultsHeap.size() < effectiveEf || neighborDistance < currentDistance) {
        candidatesHeap.push({ id: neighborId, distance: neighborDistance });
        resultsHeap.push({ id: neighborId, distance: neighborDistance });
        
        // 如果结果集超过ef，移除最远的
        if (resultsHeap.size() > effectiveEf) {
          resultsHeap.pop();
          
          // 更新当前距离基准
          const worst = resultsHeap.peek();
          if (worst) {
            currentDistance = worst.distance;
          }
        }
      }
    }
  }
  
  // 将结果转换为数组
  const results = [];
  while (resultsHeap.size() > 0) {
    results.unshift(resultsHeap.pop());
  }
  
  // 返回前k个结果
  return results.slice(0, k);
}

/**
 * 向指定层级中特定节点添加连接
 * @param {number} nodeId - 节点ID
 * @param {Array<number>} connectionIds - 要添加的连接节点ID数组
 * @param {number} level - 操作的层级
 * @param {Map} nodes - 节点存储
 * @param {number} M - 每层最大连接数
 * @param {Function} distanceFunc - 距离计算函数
 * @param {boolean} [preferNewConnections=false] - 是否优先保留新连接
 * @param {boolean} [forceAddAll=false] - 是否强制添加所有连接而不考虑M限制（底层特殊处理）
 */
export function addConnections(nodeId, connectionIds, level, nodes, M, distanceFunc, preferNewConnections = false, forceAddAll = false) {
  const node = nodes.get(nodeId);
  if (!node) return;
  
  // 如果没有要添加的连接，直接返回
  if (!connectionIds || connectionIds.length === 0) return;
  
  // 确保连接数组存在
  while (node.connections.length <= level) {
    node.connections.push([]);
  }
  
  const existingConnections = node.connections[level] || [];
  
  // 底层使用更大的连接数限制以提高召回率
  const effectiveM = level === 0 ? Math.max(M * 2, 32) : M;
  
  // 过滤有效的新连接
  const newConnectionIds = [];
  for (const connId of connectionIds) {
    // 跳过自连接或已存在的连接
    if (connId === nodeId || existingConnections.includes(connId)) continue;
    
    const connNode = nodes.get(connId);
    if (!connNode || connNode.deleted) continue;
    
    newConnectionIds.push(connId);
  }
  
  if (newConnectionIds.length === 0) return;
  
  // 合并现有连接和新连接
  let allConnections = [...existingConnections, ...newConnectionIds];
  
  // 如果超过了最大连接数且不是强制添加所有，需要筛选连接
  if (allConnections.length > effectiveM && !forceAddAll) {
    // 计算所有连接的距离
    const nodeVector = node.vector;
    const connectionDistances = [];
    
    for (const connId of allConnections) {
      const connNode = nodes.get(connId);
      if (!connNode || !connNode.vector) continue;
      
      try {
        const distance = distanceFunc(nodeVector, connNode.vector);
        connectionDistances.push({ id: connId, distance });
      } catch (error) {
        console.error('计算连接距离失败', error);
      }
    }
    
    // 按距离排序
    connectionDistances.sort((a, b) => a.distance - b.distance);
    
    // 优先保留近邻，同时确保新连接有机会被保留
    const selectedConnections = [];
    const candidates = connectionDistances.slice(0, effectiveM * 2);
    
    // 先添加一些最近的连接
    let minConnections = Math.min(effectiveM / 2, candidates.length);
    for (let i = 0; i < minConnections; i++) {
      selectedConnections.push(candidates[i].id);
    }
    
    // 再考虑连接多样性，确保不会全部连接到相似节点
    for (let i = minConnections; i < candidates.length && selectedConnections.length < effectiveM; i++) {
      const candidateId = candidates[i].id;
      const candidateNode = nodes.get(candidateId);
      
      // 检查这个候选节点与已选节点的连接情况
      let tooSimilar = false;
      for (const selectedId of selectedConnections) {
        const selectedNode = nodes.get(selectedId);
        
        if (!selectedNode || !candidateNode) continue;
        
        try {
          const connDistance = distanceFunc(selectedNode.vector, candidateNode.vector);
          
          // 如果候选节点与某个已选节点太相似，不添加
          if (connDistance < candidates[i].distance) {
            tooSimilar = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (!tooSimilar) {
        selectedConnections.push(candidateId);
      }
    }
    
    // 如果没有足够的多样性连接，继续添加最近的连接
    if (selectedConnections.length < effectiveM) {
      for (let i = 0; i < candidates.length && selectedConnections.length < effectiveM; i++) {
        if (!selectedConnections.includes(candidates[i].id)) {
          selectedConnections.push(candidates[i].id);
        }
      }
    }
    
    // 最终连接集为筛选后的连接
    allConnections = selectedConnections;
  }
  
  // 更新节点的连接
  node.connections[level] = allConnections;
  
  // 建立双向连接
  for (const connId of newConnectionIds) {
    const connNode = nodes.get(connId);
    if (!connNode) continue;
    
    // 确保连接节点的连接数组存在
    while (connNode.connections.length <= level) {
      connNode.connections.push([]);
    }
    
    // 如果邻居的连接中没有当前节点，添加它
    if (!connNode.connections[level].includes(nodeId)) {
      connNode.connections[level].push(nodeId);
      
      // 如果邻居的连接超过限制，也需要进行筛选
      if (connNode.connections[level].length > effectiveM && !forceAddAll) {
        // 递归调用以优化邻居的连接
        // 但传入false避免循环调用
        addConnections(connId, [], level, nodes, M, distanceFunc, false, false);
      }
    }
  }
}

/**
 * 向索引中插入新节点
 * @param {Float32Array} vector - 要插入的向量
 * @param {Object} [data] - 关联数据
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {number} M - 每层最大连接数
 * @param {number} ml - 最大层数
 * @param {number} efConstruction - 构建参数
 * @param {Function} distanceFunc - 距离计算函数
 * @param {Object} state - 状态对象 {maxId, maxLevel, nodeCount}
 * @returns {number} 插入节点的ID
 */
export function insertNode(vector, data, nodes, entryPoint, M, ml, efConstruction, distanceFunc, state) {
  try {
    // 防御性检查
    if (!vector || !Array.isArray(vector) && !(vector instanceof Float32Array)) {
      console.error('insertNode错误: 无效的向量数据', { vector });
      return null;
    }
    
    // 创建新节点
    const nodeId = state.maxId++;
    const level = getRandomLevel(ml);
    
    // 当前最大层级
    state.maxLevel = Math.max(state.maxLevel, level);
    
    // 创建节点对象
    const node = createHNSWNode(nodeId, vector, data, level);
    
    // 将节点添加到图中
    nodes.set(nodeId, node);
    state.nodeCount++;
    
    // 如果这是第一个节点，设置为入口点并返回
    if (entryPoint.id === null) {
      entryPoint.id = nodeId;
      entryPoint.level = level;
      return nodeId;
    }
    
    // 如果结点层级比当前最高层级还高，则需要更新入口点
    if (level > entryPoint.level) {
      entryPoint.id = nodeId;
      entryPoint.level = level;
    }
    
    // 从入口点开始，自顶向下遍历所有层级
    const q = { id: nodeId, vector };
    let currObj = { ...entryPoint };
    
    // 确保效构建时的ef值足够大
    const effectiveEf = Math.max(efConstruction, M * 2);
    
    // 自顶向下遍历层级
    for (let lc = Math.min(level, entryPoint.level); lc >= 0; lc--) {
      // 在当前层查找最近邻
      const neighbors = searchLayer(
        q, 
        Math.min(effectiveEf, M * 2), // 搜索的最近邻数量
        effectiveEf, // 候选集大小
        lc, 
        nodes, 
        currObj, 
        distanceFunc
      );
      
      // 如果找到邻居，则与新结点建立连接
      if (neighbors.length > 0) {
        // 提取邻居IDs
        const neighborIds = neighbors.map(n => n.id);
        
        // 添加连接 - 确保双向连接
        addConnections(nodeId, neighborIds, lc, nodes, M, distanceFunc, true);
        
        // 更新当前节点，用于下一层搜索
        currObj = { id: neighbors[0].id };
      }
    }
    
    return nodeId;
  } catch (error) {
    console.error('insertNode执行出错:', error);
    return null;
  }
}

/**
 * 在索引中搜索k个最近邻 
 * @param {Float32Array|Array} queryVector - 查询向量
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {number} maxLevel - 最大层数
 * @param {number} efSearch - 搜索时使用的候选集大小
 * @param {Function} distanceFunc - 距离计算函数
 * @param {number} k - 返回的最近邻数量
 * @param {number} [ef=null] - 自定义ef参数
 * @param {Set<number>} [excludeIds=new Set()] - 要排除的节点ID
 * @param {Object} [searchParams={}] - 搜索参数，包括debug标志
 * @returns {Array<{id: number, distance: number, data: any}>} 最近邻节点列表
 */
export function searchKNN(queryVector, nodes, entryPoint, maxLevel, efSearch, distanceFunc, k = 10, ef = null, excludeIds = new Set(), searchParams = {}) {
  // 防御性检查
  if (!queryVector || !nodes || !entryPoint || !distanceFunc) {
    console.error('searchKNN错误：无效参数');
    return [];
  }
  
  // 如果索引为空，返回空结果
  if (nodes.size === 0 || entryPoint.id === null) {
    return [];
  }
  
  // 确保参数有效
  const effectiveEf = ef || Math.max(efSearch, k * 2);
  
  try {
    // 创建查询对象
    const query = { vector: queryVector };
    
    // 从入口点开始
    let currObj = { ...entryPoint };
    const visitedNodes = new Set();
    
    // 自顶向下遍历层级图
    for (let level = maxLevel; level > 0; level--) {
      // 在当前层查找最近的节点
      const result = searchLayer(
        query,
        1,  // 只需要找最近的一个节点
        1,  // 候选集大小为1
        level,
        nodes,
        currObj,
        distanceFunc,
        excludeIds,
        visitedNodes
      );
      
      if (result.length > 0) {
        currObj = { id: result[0].id };
      }
    }
    
    // 在底层（0层）执行更广泛的搜索
    const results = searchLayer(
      query,
      k,
      effectiveEf,
      0,
      nodes,
      currObj,
      distanceFunc,
      excludeIds,
      visitedNodes
    );
    
    // 处理结果 - 使用节点元数据中的原始ID
    return results.map(item => {
      const node = nodes.get(item.id);
      const originalId = node?.data?.originalId !== undefined ? 
        node.data.originalId : (node?.data?.id !== undefined ? node.data.id : item.id);
      
      return {
        id: originalId,
        internalId: item.id,
        distance: item.distance,
        data: node?.data || null
      };
    });
  } catch (error) {
    console.error('searchKNN执行错误:', error);
    return [];
  }
}

/**
 * 从索引中删除节点 (标记删除，不物理移除)
 * @param {number} id - 要删除的节点ID
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {Object} state - 状态对象，包含 maxLevel 和 nodeCount
 * @returns {boolean} 删除是否成功
 */
export function removeNode(id, nodes, entryPoint, state) {
  const node = nodes.get(id);
  if (!node) return false;
  
  // 将节点标记为已删除
  node.deleted = true;
  state.nodeCount--;
  
  // 如果删除的是入口点，需要找新的入口点
  if (entryPoint.id === id) {
    // 查找新的入口点
    for (const [nodeId, node] of nodes.entries()) {
      if (!node.deleted && node.connections.length > entryPoint.level) {
        entryPoint.id = nodeId;
        entryPoint.level = node.connections.length - 1;
        break;
      }
    }
    
    // 如果没有合适的入口点，重置
    if (entryPoint.id === id) {
      entryPoint.id = null;
      entryPoint.level = -1;
      state.maxLevel = -1;
    }
  }
  
  return true;
}

/**
 * 获取索引当前状态统计
 * @param {Object} state - 状态对象
 * @param {Map} nodes - 节点存储
 * @param {Object} parameters - 参数对象
 * @returns {Object} 索引统计信息
 */
export function getStats(state, nodes, parameters) {
  return {
    nodeCount: state.nodeCount,
    maxLevel: state.maxLevel,
    totalNodes: nodes.size,
    parameters
  };
}

/**
 * 序列化索引数据
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {Object} state - 状态对象
 * @returns {Object} 可序列化的索引数据
 */
export function serializeIndex(nodes, entryPoint, state) {
  console.log(`开始序列化HNSW索引，节点数量: ${nodes.size}`);
  
  const serializedNodes = [];
  let validNodeCount = 0;
  
  // 序列化节点数据
  for (const node of nodes.values()) {
    if (node.deleted) continue; // 排除已删除节点
    
    try {
      // 验证节点数据的有效性
      if (!node.vector || node.vector.length === 0) {
        console.warn(`节点 ${node.id} 的向量数据无效，跳过该节点`);
        continue;
      }
      
      if (!node.connections || !Array.isArray(node.connections)) {
        console.warn(`节点 ${node.id} 的连接数据无效，跳过该节点`);
        continue;
      }
      
      serializedNodes.push({
        id: node.id,
        vector: Array.from(node.vector), // 将向量转为普通数组
        data: node.data,
        connections: node.connections.map(level => Array.from(level)) // 深拷贝连接数组
      });
      
      validNodeCount++;
    } catch (error) {
      console.error(`序列化节点 ${node.id} 时出错:`, error);
    }
  }
  
  console.log(`序列化完成，有效节点: ${validNodeCount}/${nodes.size}`);
  console.log(`入口点: ${JSON.stringify(entryPoint)}`);
  console.log(`索引状态: ${JSON.stringify(state)}`);
  
  const result = {
    nodes: serializedNodes,
    entryPoint: { ...entryPoint },
    state: { ...state }
  };
  
  return result;
}

/**
 * 从序列化数据还原索引
 * @param {Map} nodes - 目标节点存储
 * @param {Object} entryPoint - 目标入口点
 * @param {Object} state - 目标状态对象
 * @param {Object} data - 序列化的索引数据
 */
export function deserializeIndex(nodes, entryPoint, state, data) {
  console.log(`开始反序列化HNSW索引，节点数量: ${data.nodes ? data.nodes.length : 0}`);
  
  if (!data || !data.nodes || !Array.isArray(data.nodes)) {
    console.error('反序列化失败: 无效的节点数据');
    return false;
  }
  
  if (!data.entryPoint) {
    console.error('反序列化失败: 缺少入口点');
    return false;
  }
  
  if (!data.state) {
    console.error('反序列化失败: 缺少状态数据');
    return false;
  }
  
  // 清空现有数据
  nodes.clear();
  
  // 还原节点
  let restoredCount = 0;
  for (const nodeData of data.nodes) {
    try {
      if (!nodeData.vector || !Array.isArray(nodeData.vector)) {
        console.warn(`节点 ${nodeData.id} 的向量数据无效，跳过该节点`);
        continue;
      }
      
      const node = createHNSWNode(
        nodeData.id,
        new Float32Array(nodeData.vector),
        nodeData.data
      );
      
      if (!nodeData.connections || !Array.isArray(nodeData.connections)) {
        console.warn(`节点 ${nodeData.id} 的连接数据无效，设置为空连接`);
        node.connections = [];
      } else {
        node.connections = nodeData.connections.map(level => 
          Array.isArray(level) ? Array.from(level) : []
        );
      }
      
      nodes.set(node.id, node);
      restoredCount++;
    } catch (error) {
      console.error(`还原节点 ${nodeData.id} 时出错:`, error);
    }
  }
  
  console.log(`节点还原完成，成功还原 ${restoredCount}/${data.nodes.length} 个节点`);
  
  // 还原入口点和状态
  try {
    Object.assign(entryPoint, data.entryPoint);
    console.log(`入口点还原成功: ${JSON.stringify(entryPoint)}`);
  } catch (error) {
    console.error('还原入口点失败:', error);
    return false;
  }
  
  try {
    Object.assign(state, data.state);
    console.log(`状态还原成功: ${JSON.stringify(state)}`);
  } catch (error) {
    console.error('还原状态失败:', error);
    return false;
  }
  
  console.log('HNSW索引反序列化成功');
  return true;
}

/**
 * 计算查询向量与数据库向量之间的距离
 * @param {string} distanceName - 距离函数名称
 * @returns {Function} 距离计算函数
 */
export function getDistanceFunction(distanceName) {
  if (distanceName === 'euclidean') {
    return computeEuclideanDistance;
  } else if (distanceName === 'cosine') {
    // 直接使用余弦距离函数，它已经返回距离而非相似度
    return computeCosineDistance;
  } else if (distanceName === 'inner_product') {
    // 内积也是相似度，越大越相似，需要取负变为距离度量
    return (a, b) => -computeInnerProduct(a, b);
  } else {
    console.warn(`未知的距离函数: ${distanceName}, 使用默认的欧几里得距离`);
    return computeEuclideanDistance;
  }
}

/**
 * 优化HNSW索引的连接结构以提高召回率
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {Function} distanceFunc - 距离计算函数
 * @param {number} M - 每层最大连接数
 * @param {Object} state - 状态对象
 * @param {Object} options - 优化选项
 * @returns {Object} 优化结果统计
 */
export function optimizeIndexConnectivity(nodes, entryPoint, distanceFunc, M, state, options = {}) {
  // 默认选项
  const defaults = {
    sampleRate: 0.2,           // 需要优化的节点比例
    layersToOptimize: [0],     // 需要优化的层级，默认只优化底层
    minConnectionsPerNode: 8,  // 每个节点的最小连接数
    targetBidirectionalRate: 0.8 // 目标双向连接率
  };
  
  // 合并选项
  const opts = { ...defaults, ...options };
  
  console.log('开始优化HNSW索引连接结构...');
  console.log(`- 采样率: ${opts.sampleRate * 100}%`);
  console.log(`- 优化层级: ${opts.layersToOptimize.join(', ')}`);
  console.log(`- 最小连接数: ${opts.minConnectionsPerNode}`);
  console.log(`- 目标双向连接率: ${opts.targetBidirectionalRate * 100}%`);
  
  // 收集有效节点
  const validNodes = [];
  for (const [nodeId, node] of nodes.entries()) {
    if (!node.deleted && node.vector) {
      validNodes.push(nodeId);
    }
  }
  
  // 如果没有有效节点，直接返回
  if (validNodes.length === 0) {
    console.log('没有有效节点需要优化');
    return { success: false, reason: '没有有效节点' };
  }
  
  // 计算需要处理的节点数量
  const numNodesToProcess = Math.max(
    20, 
    Math.floor(validNodes.length * opts.sampleRate)
  );
  
  // 随机选择需要处理的节点
  const shuffledNodes = validNodes.sort(() => Math.random() - 0.5);
  const nodesToProcess = shuffledNodes.slice(0, numNodesToProcess);
  
  console.log(`将处理 ${nodesToProcess.length}/${validNodes.length} 个节点`);
  
  // 统计信息
  const stats = {
    processedNodes: 0,
    addedConnections: 0,
    bidirectionalConnections: {
      before: 0,
      after: 0
    },
    avgConnectionsPerNode: {
      before: 0,
      after: 0
    }
  };
  
  // 收集优化前的统计信息
  let totalConnectionsBefore = 0;
  let bidirectionalConnectionsBefore = 0;
  
  // 遍历所有需要处理的层级
  for (const layer of opts.layersToOptimize) {
    console.log(`优化层级 ${layer}...`);
    
    // 统计每个节点的连接数和双向连接
    for (const nodeId of validNodes) {
      const node = nodes.get(nodeId);
      if (!node || !node.connections || node.connections.length <= layer) continue;
      
      const connections = node.connections[layer] || [];
      totalConnectionsBefore += connections.length;
      
      // 检查双向连接
      for (const connId of connections) {
        const connNode = nodes.get(connId);
        if (!connNode || !connNode.connections || connNode.connections.length <= layer) continue;
        
        if (connNode.connections[layer].includes(nodeId)) {
          bidirectionalConnectionsBefore++;
        }
      }
    }
    
    // 处理选定的节点
    for (const nodeId of nodesToProcess) {
      const node = nodes.get(nodeId);
      if (!node || !node.vector) continue;
      
      // 确保节点有连接数组
      while (node.connections.length <= layer) {
        node.connections.push([]);
      }
      
      // 获取当前连接
      const currentConnections = new Set(node.connections[layer] || []);
      
      // 如果连接数已经达到或超过M，跳过
      if (currentConnections.size >= M) continue;
      
      // 检查当前连接，统计双向连接数
      let bidirectionalCount = 0;
      for (const connId of currentConnections) {
        const connNode = nodes.get(connId);
        if (!connNode || connNode.deleted) continue;
        
        // 检查是否有双向连接
        const hasReverseConn = connNode.connections[layer] && 
          connNode.connections[layer].includes(nodeId);
          
        if (hasReverseConn) {
          bidirectionalCount++;
        }
      }
      
      // 如果双向连接率已经达到目标，跳过
      const currentBidirectionalRate = currentConnections.size > 0 ? 
        bidirectionalCount / currentConnections.size : 0;
        
      if (currentConnections.size >= opts.minConnectionsPerNode && 
          currentBidirectionalRate >= opts.targetBidirectionalRate) {
        continue;
      }
      
      // 查找最近的节点
      const nearestNeighbors = [];
      for (const otherId of validNodes) {
        // 跳过自己和已经连接的节点
        if (otherId === nodeId || currentConnections.has(otherId)) continue;
        
        const otherNode = nodes.get(otherId);
        if (!otherNode || !otherNode.vector) continue;
        
        try {
          // 计算距离
          const distance = distanceFunc(node.vector, otherNode.vector);
          nearestNeighbors.push({ id: otherId, distance });
        } catch (error) {
          console.error(`计算节点${nodeId}和${otherId}之间的距离失败:`, error);
        }
      }
      
      // 按距离排序
      nearestNeighbors.sort((a, b) => a.distance - b.distance);
      
      // 选择最近的节点建立连接
      const neededConnections = Math.min(
        M - currentConnections.size,
        nearestNeighbors.length
      );
      
      if (neededConnections > 0) {
        // 选择最近的neededConnections个节点
        const newConnections = nearestNeighbors
          .slice(0, neededConnections)
          .map(n => n.id);
          
        // 添加新连接
        for (const connId of newConnections) {
          if (!currentConnections.has(connId)) {
            node.connections[layer].push(connId);
            currentConnections.add(connId);
            stats.addedConnections++;
            
            // 添加反向连接
            const connNode = nodes.get(connId);
            if (!connNode) continue;
            
            // 确保连接节点有连接数组
            while (connNode.connections.length <= layer) {
              connNode.connections.push([]);
            }
            
            // 如果没有反向连接，添加
            if (!connNode.connections[layer].includes(nodeId)) {
              connNode.connections[layer].push(nodeId);
              stats.addedConnections++;
            }
          }
        }
      }
      
      stats.processedNodes++;
    }
  }
  
  // 收集优化后的统计信息
  let totalConnectionsAfter = 0;
  let bidirectionalConnectionsAfter = 0;
  
  // 统计优化后的连接情况
  for (const layer of opts.layersToOptimize) {
    for (const nodeId of validNodes) {
      const node = nodes.get(nodeId);
      if (!node || !node.connections || node.connections.length <= layer) continue;
      
      const connections = node.connections[layer] || [];
      totalConnectionsAfter += connections.length;
      
      // 检查双向连接
      for (const connId of connections) {
        const connNode = nodes.get(connId);
        if (!connNode || !connNode.connections || connNode.connections.length <= layer) continue;
        
        if (connNode.connections[layer].includes(nodeId)) {
          bidirectionalConnectionsAfter++;
        }
      }
    }
  }
  
  // 计算平均连接数和双向连接率
  stats.avgConnectionsPerNode.before = totalConnectionsBefore / validNodes.length;
  stats.avgConnectionsPerNode.after = totalConnectionsAfter / validNodes.length;
  
  stats.bidirectionalConnections.before = totalConnectionsBefore > 0 ? 
    bidirectionalConnectionsBefore / totalConnectionsBefore : 0;
    
  stats.bidirectionalConnections.after = totalConnectionsAfter > 0 ? 
    bidirectionalConnectionsAfter / totalConnectionsAfter : 0;
  
  console.log('优化完成，统计信息:');
  console.log(`- 处理节点数: ${stats.processedNodes}`);
  console.log(`- 添加连接数: ${stats.addedConnections}`);
  console.log(`- 平均连接数: ${stats.avgConnectionsPerNode.before.toFixed(2)} -> ${stats.avgConnectionsPerNode.after.toFixed(2)}`);
  console.log(`- 双向连接率: ${(stats.bidirectionalConnections.before * 100).toFixed(2)}% -> ${(stats.bidirectionalConnections.after * 100).toFixed(2)}%`);
  
  return {
    success: true,
    stats
  };
}

/**
 * 创建HNSW索引
 * @param {Object} options - 配置选项
 * @returns {Object} HNSW索引实例
 */
export function createHNSWIndex({
  distanceFunction = 'cosine', // 修改为余弦相似度作为默认距离
  M = DEFAULT_M,
  efConstruction = DEFAULT_EF_CONSTRUCTION,
  efSearch = DEFAULT_EF_SEARCH,
  ml = DEFAULT_ML,
  useDistanceCache = true
} = {}) {
  // 参数安全检查和调整
  const effectiveM = Math.max(16, M);
  const effectiveEfConstruction = Math.max(150, efConstruction);
  const effectiveEfSearch = Math.max(100, efSearch);
  const effectiveMl = Math.max(16, ml);
  
  // 1. 初始化内部状态
  const nodes = new Map();
  const state = {
    maxId: 0,
    maxLevel: 0,
    nodeCount: 0,
    deletedCount: 0,
    distanceCalculations: 0
  };
  
  // 2. 设置距离函数
  let distanceFunc = getDistanceFunction(distanceFunction);
  
  // 3. 优化：如果启用了缓存，创建距离计算缓存
  if (useDistanceCache) {
    const originalDistanceFunc = distanceFunc;
    distanceFunc = createDistanceCache(originalDistanceFunc);
  }
  
  // 索引状态
  const entryPoint = { id: null, level: -1 };
  
  // 参数对象
  const parameters = {
    M: effectiveM,
    efConstruction: effectiveEfConstruction,
    efSearch: effectiveEfSearch,
    ml: effectiveMl
  };
  
  /**
   * 搜索K个最近邻节点
   * @param {Float32Array|Array} queryVector - 查询向量
   * @param {number} k - 返回的最近邻数量
   * @param {Object} [searchParams={}] - 搜索参数
   * @returns {Array<{id: number, distance: number, data: any}>} 最近邻节点列表
   */
  const searchKNNMethod = (queryVector, k = 10, searchParams = {}) => {
    if (!queryVector || k <= 0) {
      console.error('搜索参数无效', { queryVector, k });
      return [];
    }
    
    // 提取搜索参数
    const { 
      ef = null, 
      excludeIds = new Set(),
      debug = false
    } = searchParams || {};
    
    // 使用比k大的ef值提高召回率
    const effectiveEf = ef || Math.max(effectiveEfSearch, k * 2);
    
    // 调用搜索逻辑
    const results = searchKNN(
      queryVector, 
      nodes, 
      entryPoint, 
      state.maxLevel, 
      effectiveEfSearch,
      distanceFunc, 
      k, 
      effectiveEf, 
      excludeIds,
      { debug }
    );
    
    return results;
  };
  
  return {
    insertNode: (vector, data = null) => insertNode(
      vector, data, nodes, entryPoint, effectiveM, effectiveMl, effectiveEfConstruction, distanceFunc, state
    ),
    
    searchKNN: searchKNNMethod,
    
    removeNode: (id) => removeNode(id, nodes, entryPoint, state),
    
    getNode: (id) => {
      const node = nodes.get(id);
      if (!node || node.deleted) return null;
      return { 
        id: node.id, 
        data: node.data,
        vector: node.vector ? new Float32Array(node.vector) : null
      };
    },
    
    getStats: () => {
      const stats = getStats(state, nodes, parameters);
      stats.avgConnectionsPerNode = calculateAvgConnections(nodes);
      return stats;
    },
    
    serialize: () => serializeIndex(nodes, entryPoint, state),
    restore: (data) => deserializeIndex(nodes, entryPoint, state, data),
    
    getNodeConnections: (id) => {
      const node = nodes.get(id);
      if (!node || node.deleted) return null;
      
      // 返回所有层级的连接
      return node.connections.map((levelConns, level) => {
        // 获取连接节点的详细信息
        const connections = [];
        for (const connId of levelConns) {
          const connNode = nodes.get(connId);
          if (connNode && !connNode.deleted) {
            connections.push({
              id: connId,
              data: connNode.data,
              // 计算距离
              distance: distanceFunc(node.vector, connNode.vector)
            });
          }
        }
        return { level, connections };
      });
    },
    
    // 验证索引结构
    validateConnections: () => {
      let bidirectionalCount = 0;
      let totalConnections = 0;
      let missingConnections = 0;
      
      // 遍历所有节点检查连接
      for (const [nodeId, node] of nodes.entries()) {
        if (node.deleted) continue;
        
        // 检查各层连接
        for (let level = 0; level < node.connections.length; level++) {
          const connections = node.connections[level];
          if (!connections) continue;
          
          for (const connId of connections) {
            totalConnections++;
            
            // 检查连接节点是否存在
            const connNode = nodes.get(connId);
            if (!connNode || connNode.deleted) {
              missingConnections++;
              continue;
            }
            
            // 检查是否有反向连接（双向连接检查）
            if (level < connNode.connections.length && 
                connNode.connections[level].includes(parseInt(nodeId))) {
              bidirectionalCount++;
            }
          }
        }
      }
      
      return {
        totalConnections,
        bidirectionalCount,
        bidirectionalRate: totalConnections > 0 ? bidirectionalCount / totalConnections : 0,
        missingConnections
      };
    },
    
    // 用于测试的内部属性
    _nodes: nodes,
    
    // 优化连接结构函数
    optimizeConnectivity: (options = {}) => optimizeIndexConnectivity(
      nodes, entryPoint, distanceFunc, effectiveM, state, options
    )
  };
}

/**
 * 计算平均每个节点的连接数
 * @private
 */
function calculateAvgConnections(nodes) {
  let totalConnections = 0;
  let validNodes = 0;
  
  for (const [_, node] of nodes.entries()) {
    if (node.deleted || !node.connections) continue;
    
    validNodes++;
    let nodeConnections = 0;
    
    // 统计所有层级的连接数
    for (const levelConns of node.connections) {
      if (Array.isArray(levelConns)) {
        nodeConnections += levelConns.length;
      }
    }
    
    totalConnections += nodeConnections;
  }
  
  return validNodes > 0 ? totalConnections / validNodes : 0;
}

/**
 * 批量插入向量到索引中，比单个插入更高效
 * @param {Array<Float32Array>} vectors - 要插入的向量数组
 * @param {Array} [dataList] - 关联数据数组
 * @param {Map} nodes - 节点存储
 * @param {Object} entryPoint - 入口点
 * @param {number} M - 每层最大连接数
 * @param {number} ml - 最大层数
 * @param {number} efConstruction - 构建参数
 * @param {Function} distanceFunc - 距离计算函数
 * @param {Object} state - 状态对象 {maxId, maxLevel, nodeCount}
 * @param {number} [batchSize=10] - 每批处理的向量数量
 * @returns {Array<number>} 插入节点的ID数组
 */
export function batchInsertNodes(vectors, dataList = [], nodes, entryPoint, M, ml, efConstruction, distanceFunc, state, batchSize = 10) {
  if (!vectors || vectors.length === 0) return [];
  
  // 验证输入
  if (dataList && dataList.length > 0 && dataList.length !== vectors.length) {
    console.warn(`数据数组长度(${dataList.length})与向量数组长度(${vectors.length})不匹配，部分向量将没有关联数据`);
  }
  
  const nodeIds = [];
  const distanceCache = new Map(); // 路径距离缓存
  
  // 创建高效的距离缓存函数
  const cachedDistanceFunc = (v1, v2) => {
    // 使用向量ID或内存地址作为键
    const id1 = v1.id !== undefined ? v1.id : v1;
    const id2 = v2.id !== undefined ? v2.id : v2;
    
    // 确保id1 <= id2以避免重复键
    const [smallerId, largerId] = id1 <= id2 ? [id1, id2] : [id2, id1];
    const key = `${smallerId}_${largerId}`;
    
    if (distanceCache.has(key)) {
      return distanceCache.get(key);
    }
    
    const distance = distanceFunc(v1.vector || v1, v2.vector || v2);
    
    // 只缓存当前批次中的距离计算结果
    distanceCache.set(key, distance);
    return distance;
  };
  
  // 分批处理向量
  for (let i = 0; i < vectors.length; i += batchSize) {
    // 清空上一批次的距离缓存，避免缓存过大
    distanceCache.clear();
    
    // 当前批次的向量
    const batchVectors = vectors.slice(i, i + batchSize);
    const batchData = dataList.slice(i, i + batchSize);
    
    // 预计算当前批次内向量之间的距离，有助于提高批量插入效率
    for (let j = 0; j < batchVectors.length; j++) {
      for (let k = j + 1; k < batchVectors.length; k++) {
        const distance = distanceFunc(batchVectors[j], batchVectors[k]);
        const key = `${i + j}_${i + k}`;
        distanceCache.set(key, distance);
      }
    }
    
    // 处理当前批次的每个向量
    for (let j = 0; j < batchVectors.length; j++) {
      // 获取原始数据，如果有
      const originalData = j < batchData.length ? batchData[j] : null;
      
      // 确保数据对象存在，并包含正确的ID映射
      const enhancedData = originalData || {};
      
      // 如果是简单数据类型，转换为对象
      const nodeData = typeof enhancedData !== 'object' || enhancedData === null ? 
        { value: enhancedData } : { ...enhancedData };
      
      // 保存批量索引，可用于追踪数据来源
      nodeData.batchIndex = i + j;
      
      // 确保originalId存在
      if (nodeData.originalId === undefined) {
        // 如果有id字段，使用它作为originalId
        nodeData.originalId = nodeData.id !== undefined ? nodeData.id : (i + j);
      }
      
      // 保持id字段与originalId一致，以便兼容旧代码
      if (nodeData.id === undefined) {
        nodeData.id = nodeData.originalId;
      }
      
      const nodeId = insertNode(
        batchVectors[j],
        nodeData,  // 使用增强的数据对象
        nodes,
        entryPoint,
        M,
        ml,
        efConstruction,
        cachedDistanceFunc,
        state
      );
      nodeIds.push(nodeId);
      
      // 不再与所有现有节点计算距离，HNSW算法只需要计算搜索路径上的距离
    }
    
    // 每批次结束后输出进度信息
    if (vectors.length > batchSize) {
      const progress = Math.min(i + batchSize, vectors.length);
      console.log(`已处理 ${progress}/${vectors.length} 个向量 (${Math.round(progress/vectors.length*100)}%)`);
    }
  }
  
  return nodeIds;
}

/**
 * 贪婪搜索当前层级查找最近点
 * @param {Object} queryNode - 查询节点 {vector: Float32Array}
 * @param {Object} entryPoint - 入口点 {id: number}
 * @param {number} level - 当前层级
 * @param {Map} nodes - 节点存储
 * @param {Function} distanceFunc - 距离计算函数
 * @param {Set<number>} [visited=new Set()] - 已访问节点集合
 * @returns {Object} 最近点 {id: number, distance: number}
 */
export function greedySearchLayer(queryNode, entryPoint, level, nodes, distanceFunc, visited = new Set()) {
  if (!entryPoint || entryPoint.id === null) {
    return { id: null, distance: Infinity };
  }
  
  // 获取入口点节点
  let currentNode = nodes.get(entryPoint.id);
  if (!currentNode || currentNode.deleted) {
    return { id: null, distance: Infinity };
  }
  
  // 计算到入口点的距离
  const queryVector = queryNode.vector;
  if (!queryVector || !currentNode.vector) {
    return { id: null, distance: Infinity };
  }
  
  // 修复：确保参数顺序正确，先查询向量后节点向量
  let currentDistance = distanceFunc(queryVector, currentNode.vector);
  let currentBest = { id: currentNode.id, distance: currentDistance };
  
  // 标记当前节点为已访问
  visited.add(currentNode.id);
  
  let changed = true;
  
  // 贪婪搜索
  while (changed) {
    changed = false;
    
    // 检查当前节点的连接
    if (!currentNode.connections || !currentNode.connections[level]) {
      break;
    }
    
    const connections = currentNode.connections[level];
    
    // 遍历连接查找更近的节点
    for (const neighborId of connections) {
      // 跳过已访问的节点
      if (visited.has(neighborId)) continue;
      
      const neighbor = nodes.get(neighborId);
      if (!neighbor || neighbor.deleted || !neighbor.vector) continue;
      
      // 标记为已访问
      visited.add(neighborId);
      
      // 修复：确保参数顺序正确，先查询向量后节点向量
      const distance = distanceFunc(queryVector, neighbor.vector);
      
      // 如果找到更近的点，更新当前最佳点
      if (distance < currentBest.distance) {
        currentBest = { id: neighborId, distance: distance };
        currentNode = neighbor;
        currentDistance = distance;
        changed = true;
        break;
      }
    }
  }
  
  return currentBest;
}

/**
 * 创建专门用于HNSW搜索的最大堆
 * 对标准MinHeap的封装，简化了最大堆的使用
 */
export function createMaxHeap(compareFunc = (a, b) => a - b) {
  // 反转比较函数，将最小堆转为最大堆
  const maxHeapCompare = (a, b) => compareFunc(b, a);
  const heap = createMinHeap(maxHeapCompare);
  
  // 包装返回的堆，统一API
  return {
    push: (item) => heap.push(item),
    pop: () => heap.pop(),
    peek: () => heap.peek(),
    size: () => heap.size(),
    isEmpty: () => heap.size() === 0,
    toArray: () => {
      const array = [];
      const tempHeap = createMinHeap(maxHeapCompare);
      
      // 复制堆内容
      while (heap.size() > 0) {
        const item = heap.pop();
        array.push(item);
        tempHeap.push(item);
      }
      
      // 恢复堆
      while (tempHeap.size() > 0) {
        heap.push(tempHeap.pop());
      }
      
      return array;
    },
    getWorst: () => {
      if (heap.size() === 0) return null;
      return heap.peek();
    }
  };
}


