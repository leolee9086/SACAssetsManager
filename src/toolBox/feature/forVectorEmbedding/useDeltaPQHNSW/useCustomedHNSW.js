/**
 * 优化版HNSW (Hierarchical Navigable Small World) 索引实现
 * 使用更高效的邻居存储结构，以空间换性能
 */
import {
  computeEuclideanDistance,
  computeCosineDistance,
  computeInnerProduct
} from "../../../base/forMath/forGeometry/forVectors/forDistance.js";
// 导入HNSW辅助函数
import { createMinHeap as createBinaryHeap } from "../../../feature/useDataStruct/useHeaps/useMinHeap.js";

// 常量定义
const DEFAULT_M = 32;                  
const DEFAULT_EF_CONSTRUCTION = 200; 
const DEFAULT_EF_SEARCH = 200;        
const DEFAULT_ML = 16;                
const BOTTOM_LAYER_CONNECTIONS = 64; 

// 度量方法枚举
const Metric = {
  Unknown: 0,
  Euclidean: 1,
  Cosine: 2,
  Manhattan: 3,
  DotProduct: 4
};

/**
 * 创建邻居对象的辅助函数
 */
export function createNeighbor(idx, distance) {
  return {
    idx: () => idx,
    distance: () => distance
  };
}

/**
 * 优化版Node类的函数式实现
 * 直接存储向量数据，减少函数调用开销
 */
export function createNode(vector, id = null) {
  const vectorData = vector instanceof Float32Array ? vector : new Float32Array(vector);
  
  return {
    vector: vectorData,
    id: id,
    data: null,
    len: () => vectorData.length
  };
}

// ================ 度量计算 ================

/**
 * 度量计算函数
 */
export function metric(x, y, metricType) {
  if (!x || !y || x.length !== y.length) {
    throw new Error("向量维度不匹配或无效");
  }

  // 使用预计算的向量长度缓存
  const xLength = x.length;
  const xBuffer = x instanceof Float32Array ? x : new Float32Array(x);
  const yBuffer = y instanceof Float32Array ? y : new Float32Array(y);
  
  // 预计算向量长度
  let xNorm = 0;
  let yNorm = 0;
  let dotProduct = 0;
  
  // 使用循环展开和SIMD友好的内存访问模式
  for (let i = 0; i < xLength; i += 4) {
    const x0 = xBuffer[i];
    const y0 = yBuffer[i];
    const x1 = xBuffer[i + 1];
    const y1 = yBuffer[i + 1];
    const x2 = xBuffer[i + 2];
    const y2 = yBuffer[i + 2];
    const x3 = xBuffer[i + 3];
    const y3 = yBuffer[i + 3];
    
    // 并行计算点积和范数
    dotProduct += x0 * y0 + x1 * y1 + x2 * y2 + x3 * y3;
    xNorm += x0 * x0 + x1 * x1 + x2 * x2 + x3 * x3;
    yNorm += y0 * y0 + y1 * y1 + y2 * y2 + y3 * y3;
  }
  
  // 处理剩余元素
  for (let i = (xLength & ~3); i < xLength; i++) {
    const xi = xBuffer[i];
    const yi = yBuffer[i];
    dotProduct += xi * yi;
    xNorm += xi * xi;
    yNorm += yi * yi;
  }

  switch (metricType) {
    case Metric.Euclidean:
      return Math.sqrt(xNorm + yNorm - 2 * dotProduct);
      
    case Metric.Cosine:
      const normXSqrt = Math.sqrt(xNorm);
      const normYSqrt = Math.sqrt(yNorm);
      if (normXSqrt === 0 || normYSqrt === 0) return 1.0;
      return 1.0 - dotProduct / (normXSqrt * normYSqrt);
      
    case Metric.Manhattan:
      let sum = 0;
      for (let i = 0; i < xLength; i++) {
        sum += Math.abs(xBuffer[i] - yBuffer[i]);
      }
      return sum;
      
    case Metric.DotProduct:
      return -dotProduct;
      
    default:
      throw new Error(`未知度量类型: ${metricType}`);
  }
}

// ================ 优化版邻居存储结构 ================

/**
 * 创建优化的邻居存储结构
 * 使用TypedArray和位图优化邻居存储和查询
 */
export function createOptimizedNeighborStore(maxLevel) {
  // 使用TypedArray存储邻居ID，每个节点预分配固定大小的空间
  const NEIGHBOR_CAPACITY = 128; // 预分配固定容量
  const nodeConnections = new Map();
  const levelBitmaps = new Map(); // 使用位图标记已使用的邻居槽位
  
  // 初始化节点连接
  function initNodeConnections(id) {
    // 为每个层级创建TypedArray存储邻居
    const connections = {
      level0: new Uint32Array(NEIGHBOR_CAPACITY),
      levels: Array(maxLevel).fill().map(() => new Uint32Array(NEIGHBOR_CAPACITY)),
      counts: new Uint8Array(maxLevel + 1) // 记录每个层级的邻居数量
    };
    
    // 初始化位图
    const bitmap = {
      level0: new Uint32Array(Math.ceil(NEIGHBOR_CAPACITY / 32)),
      levels: Array(maxLevel).fill().map(() => new Uint32Array(Math.ceil(NEIGHBOR_CAPACITY / 32)))
    };
    
    nodeConnections.set(id, connections);
    levelBitmaps.set(id, bitmap);
  }
  
  // 获取某ID在某层的邻居
  function getNeighbor(id, level) {
    const nodeConn = nodeConnections.get(id);
    if (!nodeConn) return [];
    
    const count = nodeConn.counts[level];
    if (count === 0) return [];
    
    // 直接返回已使用的邻居数组切片
    const neighbors = level === 0 ? nodeConn.level0 : nodeConn.levels[level - 1];
    return neighbors.slice(0, count);
  }
  
  // 添加邻居连接
  function addNeighbor(id, neighborId, level) {
    const nodeConn = nodeConnections.get(id);
    if (!nodeConn) {
      initNodeConnections(id);
      return addNeighbor(id, neighborId, level);
    }
    
    const count = nodeConn.counts[level];
    if (count >= NEIGHBOR_CAPACITY) {
      // 如果容量不足，创建新的更大容量数组
      const newCapacity = NEIGHBOR_CAPACITY * 2;
      const newConnections = level === 0 ? 
        new Uint32Array(newCapacity) : 
        new Uint32Array(newCapacity);
      
      // 复制现有数据
      const oldConnections = level === 0 ? nodeConn.level0 : nodeConn.levels[level - 1];
      newConnections.set(oldConnections);
      
      // 更新连接数组
      if (level === 0) {
        nodeConn.level0 = newConnections;
      } else {
        nodeConn.levels[level - 1] = newConnections;
      }
      
      // 更新位图
      const bitmap = levelBitmaps.get(id);
      const newBitmap = new Uint32Array(Math.ceil(newCapacity / 32));
      const oldBitmap = level === 0 ? bitmap.level0 : bitmap.levels[level - 1];
      newBitmap.set(oldBitmap);
      
      if (level === 0) {
        bitmap.level0 = newBitmap;
      } else {
        bitmap.levels[level - 1] = newBitmap;
      }
    }
    
    // 添加新邻居
    const neighbors = level === 0 ? nodeConn.level0 : nodeConn.levels[level - 1];
    neighbors[count] = neighborId;
    nodeConn.counts[level]++;
    
    // 更新位图
    const bitmap = levelBitmaps.get(id);
    const levelBitmap = level === 0 ? bitmap.level0 : bitmap.levels[level - 1];
    const wordIndex = Math.floor(count / 32);
    const bitIndex = count % 32;
    levelBitmap[wordIndex] |= (1 << bitIndex);
  }
  
  // 清空某层的邻居
  function clearNeighbors(id, level) {
    const nodeConn = nodeConnections.get(id);
    if (!nodeConn) return;
    
    nodeConn.counts[level] = 0;
    
    // 清空位图
    const bitmap = levelBitmaps.get(id);
    const levelBitmap = level === 0 ? bitmap.level0 : bitmap.levels[level - 1];
    levelBitmap.fill(0);
  }
  
  // 设置某层的邻居
  function setNeighbors(id, level, neighborIds) {
    const nodeConn = nodeConnections.get(id);
    if (!nodeConn) {
      initNodeConnections(id);
      return setNeighbors(id, level, neighborIds);
    }
    
    clearNeighbors(id, level);
    
    // 批量添加邻居
    const neighbors = level === 0 ? nodeConn.level0 : nodeConn.levels[level - 1];
    const count = Math.min(neighborIds.length, NEIGHBOR_CAPACITY);
    
    for (let i = 0; i < count; i++) {
      neighbors[i] = neighborIds[i];
    }
    
    nodeConn.counts[level] = count;
    
    // 更新位图
    const bitmap = levelBitmaps.get(id);
    const levelBitmap = level === 0 ? bitmap.level0 : bitmap.levels[level - 1];
    for (let i = 0; i < count; i++) {
      const wordIndex = Math.floor(i / 32);
      const bitIndex = i % 32;
      levelBitmap[wordIndex] |= (1 << bitIndex);
    }
  }
  
  // 获取所有邻居连接
  function getAllConnections() {
    return nodeConnections;
  }
  
  return {
    initNodeConnections,
    getNeighbor,
    addNeighbor,
    clearNeighbors,
    setNeighbors,
    getAllConnections
  };
}

// ================ 距离缓存 ================

/**
 * 创建距离缓存
 * 缓存常用节点对之间的距离，减少重复计算
 */
export function createDistanceCache() {
  const distanceCache = new Map(); // 键为"id1:id2"，值为距离
  
  // 计算并缓存距离
  function getCachedDistance(id1, id2, getDistanceFromId) {
    const key = `${id1}:${id2}`;
    if (distanceCache.has(key)) {
      return distanceCache.get(key);
    }
    const distance = getDistanceFromId(id1, id2);
    distanceCache.set(key, distance);
    return distance;
  }
  
  // 清除缓存
  function clearCache() {
    distanceCache.clear();
  }
  
  return {
    getCachedDistance,
    clearCache
  };
}

// ================ 搜索相关函数 ================

/**
 * 在特定层级搜索 - 优化版
 */
export function searchLayer(root, searchData, level, ef, hasDeletion, getData, getNeighbor, isDeleted, getDistanceFromVec) {
  const visitedId = new Set();
  const topCandidates = createBinaryHeap((a, b) => {
    return b.distance() - a.distance(); // 最小堆 (距离越小越好)
  });

  const candidates = createBinaryHeap((a, b) => {
    return a.distance() - b.distance(); // 最大堆 (保留最近的)
  }); 
  let lowerBound;

  if (!hasDeletion || !isDeleted(root)) {
    const dist = getDistanceFromVec(getData(root), searchData);
    topCandidates.push(createNeighbor(root, dist));
    candidates.push(createNeighbor(root, dist));
    lowerBound = dist;
  } else {
    lowerBound = Number.MAX_VALUE; // 最大距离
    candidates.push(createNeighbor(root, -lowerBound));
  }

  visitedId.add(root);

  // 预分配一个固定大小的数组来存储当前节点的邻居
  const curNeighborsBuffer = new Array(64);
  let curNeighborsCount = 0;

  while (!candidates.isEmpty()) {
    const curNeigh = candidates.peek();
    const curDist = curNeigh.distance();
    const curId = curNeigh.idx();
    candidates.pop();

    if (curDist > lowerBound) {
      break;
    }

    // 获取当前节点的邻居并复制到预分配的缓冲区
    const neighbors = getNeighbor(curId, level);
    curNeighborsCount = neighbors.length;
    for (let i = 0; i < curNeighborsCount; i++) {
      curNeighborsBuffer[i] = neighbors[i];
    }

    // 使用预分配的缓冲区进行遍历
    for (let i = 0; i < curNeighborsCount; i++) {
      const neigh = curNeighborsBuffer[i];
      if (visitedId.has(neigh)) {
        continue;
      }

      visitedId.add(neigh);
      const dist = getDistanceFromVec(getData(neigh), searchData);

      if (topCandidates.size() < ef || dist < lowerBound) {
        candidates.push(createNeighbor(neigh, dist));

        if (!isDeleted(neigh)) {
          topCandidates.push(createNeighbor(neigh, dist));
        }

        if (topCandidates.size() > ef) {
          topCandidates.pop();
        }

        if (!topCandidates.isEmpty()) {
          lowerBound = topCandidates.peek().distance();
        }
      }
    }
  }

  return topCandidates;
}

/**
 * 使用候选集在特定层级搜索 - 优化版
 */
export function searchLayerWithCandidate(searchData, sortedCandidates, visitedId, level, ef, hasDeletion, getData, getNeighbor, isDeleted, getDistanceFromVec) {
  const topCandidates = createBinaryHeap((a, b) => {
    return b.distance() - a.distance(); // 最小堆 (距离越小越好)
  });

  const candidates = createBinaryHeap((a, b) => {
    return a.distance() - b.distance(); // 最大堆 (保留最近的)
  });

  for (const neighbor of sortedCandidates) {
    const root = neighbor.idx();
    if (!hasDeletion || !isDeleted(root)) {
      const dist = getDistanceFromVec(getData(root), searchData);
      topCandidates.push(createNeighbor(root, dist));
      candidates.push(createNeighbor(root, dist));
    } else {
      candidates.push(createNeighbor(root, Number.MAX_VALUE));
    }
    visitedId.add(root);
  }

  let lowerBound = topCandidates.isEmpty()
    ? Number.MAX_VALUE
    : topCandidates.peek().distance();

  while (!candidates.isEmpty()) {
    const curNeigh = candidates.peek();
    const curDist = curNeigh.distance();
    const curId = curNeigh.idx();
    candidates.pop();

    if (curDist > lowerBound) {
      break;
    }

    const curNeighbors = getNeighbor(curId, level);

    for (const neigh of curNeighbors) {
      if (visitedId.has(neigh)) {
        continue;
      }

      visitedId.add(neigh);
      const dist = getDistanceFromVec(getData(neigh), searchData);

      if (topCandidates.size() < ef || dist < lowerBound) {
        candidates.push(createNeighbor(neigh, dist));

        if (!isDeleted(neigh)) {
          topCandidates.push(createNeighbor(neigh, dist));
        }

        if (topCandidates.size() > ef) {
          topCandidates.pop();
        }

        if (!topCandidates.isEmpty()) {
          lowerBound = topCandidates.peek().distance();
        }
      }
    }
  }

  return topCandidates;
}

/**
 * 通过启发式方法获取邻居 - 优化版
 */
export function getNeighborsByHeuristic2(sortedList, retSize, getDistanceFromId) {
  const sortedListLen = sortedList.length;
  const returnList = [];

  for (const iter of sortedList) {
    if (returnList.length >= retSize) {
      break;
    }

    const idx = iter.idx();
    const distance = iter.distance();

    if (sortedListLen < retSize) {
      returnList.push(createNeighbor(idx, distance));
      continue;
    }

    let good = true;

    for (const retNeighbor of returnList) {
      const cur2retDis = getDistanceFromId(idx, retNeighbor.idx());
      if (cur2retDis < distance) {
        good = false;
        break;
      }
    }

    if (good) {
      returnList.push(createNeighbor(idx, distance));
    }
  }

  return returnList; // 从小到大
}

/**
 * 连接邻居节点 - 优化版
 */
export function connectNeighbor(curId, sortedCandidates, level, isUpdate, n_neighbor0, n_neighbor, getNeighbor, getDistanceFromId, getNeighborsByHeuristic2, setNeighbors) {
  const n_neigh = level === 0 ? n_neighbor0 : n_neighbor;
  const selectedNeighbors = getNeighborsByHeuristic2(sortedCandidates, n_neigh, getDistanceFromId);

  if (selectedNeighbors.length > n_neigh) {
    throw new Error("不应返回超过M_个候选项");
  }

  if (selectedNeighbors.length === 0) {
    throw new Error("顶部候选项为空，不可能！");
  }

  const nextClosestEntryPoint = selectedNeighbors[0].idx();

  // 获取当前邻居列表并设置
  const neighborIds = selectedNeighbors.map(n => n.idx());
  setNeighbors(curId, level, neighborIds);

  // 为选中的邻居添加反向连接
  for (const selectedNeighbor of selectedNeighbors) {
    const neighborId = selectedNeighbor.idx();
    const neighborOfSelectedNeighbors = getNeighbor(neighborId, level);

    if (neighborOfSelectedNeighbors.length > n_neigh) {
      throw new Error("neighborOfSelectedNeighbors的错误值");
    }

    if (neighborId === curId) {
      throw new Error("尝试将元素连接到自身");
    }

    let isCurIdPresent = false;

    if (isUpdate) {
      for (const iter of neighborOfSelectedNeighbors) {
        if (iter === curId) {
          isCurIdPresent = true;
          break;
        }
      }
    }

    if (!isCurIdPresent) {
      if (neighborOfSelectedNeighbors.length < n_neigh) {
        // 使用优化版邻居存储结构添加邻居
        const updatedNeighbors = [...neighborOfSelectedNeighbors, curId];
        setNeighbors(neighborId, level, updatedNeighbors);
      } else {
        const dMax = getDistanceFromId(curId, neighborId);

        const candidates = createBinaryHeap((a, b) => {
          return a.distance() - b.distance();
        });

        candidates.push(createNeighbor(curId, dMax));

        for (const iter of neighborOfSelectedNeighbors) {
          const nId = iter;
          const dNeigh = getDistanceFromId(nId, neighborId);
          candidates.push(createNeighbor(nId, dNeigh));
        }

        const returnList = getNeighborsByHeuristic2(candidates.intoSortedVec(), n_neigh, getDistanceFromId);
        const updatedNeighbors = returnList.map(n => n.idx());
        setNeighbors(neighborId, level, updatedNeighbors);
      }
    }
  }

  return nextClosestEntryPoint;
}

/**
 * 构建单个项目 - 优化版
 */
export function constructSingleItem(insertId, id2level, state, getData, getDistanceFromId, searchLayerWithCandidate, connectNeighbor, ef_build, isDeleted, getNeighbor, n_neighbor0, n_neighbor, getNeighborsByHeuristic2, getDistanceFromVec, nodes, setNeighbors) {
  const insertLevel = id2level[insertId];
  let curId = state.root_id;

  if (insertId === 0) {
    return;
  }

  if (insertLevel < state.cur_level) {
    let curDist = getDistanceFromId(curId, insertId);
    let curLevel = state.cur_level;

    while (curLevel > insertLevel) {
      let changed = true;
      while (changed) {
        changed = false;
        const curNeighs = getNeighbor(curId, curLevel);

        for (const curNeigh of curNeighs) {
          if (curNeigh > nodes.length) {
            throw new Error("候选项错误");
          }

          const neighDist = getDistanceFromId(curNeigh, insertId);
          if (neighDist < curDist) {
            curDist = neighDist;
            curId = curNeigh;
            changed = true;
          }
        }
      }

      curLevel -= 1;
    }
  }

  let level = insertLevel < state.cur_level ? insertLevel : state.cur_level;
  const visitedId = new Set();
  let sortedCandidates = [];
  const insertData = getData(insertId);

  visitedId.add(insertId);
  sortedCandidates.push(createNeighbor(curId, getDistanceFromId(curId, insertId)));

  while (true) {
    const topCandidates = searchLayerWithCandidate(
      insertData,
      sortedCandidates,
      visitedId,
      level,
      ef_build,
      false,
      getData,
      getNeighbor,
      isDeleted,
      getDistanceFromVec
    );

    if (isDeleted(curId)) {
      const curDist = getDistanceFromId(curId, insertId);
      topCandidates.push(createNeighbor(curId, curDist));
      if (topCandidates.size() > ef_build) {
        topCandidates.pop();
      }
    }

    // 将堆转换为排序数组
    const candidatesArray = [];
    while (!topCandidates.isEmpty()) {
      candidatesArray.push(topCandidates.pop());
    }
    sortedCandidates = candidatesArray.sort((a, b) => a.distance() - b.distance());

    if (sortedCandidates.length === 0) {
      throw new Error("排序的候选项为空");
    }

    curId = connectNeighbor(insertId, sortedCandidates, level, false, n_neighbor0, n_neighbor, getNeighbor, getDistanceFromId, getNeighborsByHeuristic2, setNeighbors);

    if (level === 0) {
      break;
    }

    level -= 1;
  }
}

/**
 * 初始化项目 - 优化版
 */
export function initItem(data, nodes, max_level, neighborStore, id2level, item2id, getRandomLevel, state) {
  const curId = nodes.length;
  let curLevel = getRandomLevel();

  if (curId === 0) {
    curLevel = max_level;
    state.cur_level = curLevel;
    state.root_id = curId;
  }

  // 初始化邻居存储
  neighborStore.initNodeConnections(curId);

  nodes.push(data);
  id2level.push(curLevel);

  if (data.id !== null) {
    item2id.set(data.id, curId);
  }

  return curId;
}

/**
 * K最近邻搜索 - 优化版
 */
export function searchKnn(searchData, k, nodes, state, max_item, getData, getNeighbor, getDistanceFromVec, searchLayer, has_removed, ef_search, isDeleted) {
  let topCandidate = createBinaryHeap((a, b) => {
    return a.distance() - b.distance(); // 最大堆
  });

  if (nodes.length === 0) {
    return topCandidate;
  }

  let curId = state.root_id;
  let curDist = getDistanceFromVec(getData(curId), searchData);
  let curLevel = state.cur_level;

  while (true) {
    let changed = true;
    while (changed) {
      changed = false;
      const curNeighs = getNeighbor(curId, curLevel);

      for (const neigh of curNeighs) {
        if (neigh > max_item) {
          throw new Error("候选项错误");
        }

        const dist = getDistanceFromVec(getData(neigh), searchData);
        if (dist < curDist) {
          curDist = dist;
          curId = neigh;
          changed = true;
        }
      }
    }

    if (curLevel === 0) {
      break;
    }

    curLevel -= 1;
  }

  const searchRange = ef_search > k ? ef_search : k;

  topCandidate = searchLayer(curId, searchData, 0, searchRange, has_removed, getData, getNeighbor, isDeleted, getDistanceFromVec);

  while (topCandidate.size() > k) {
    topCandidate.pop();
  }

  return topCandidate;
}

/**
 * 添加单个项目 - 优化版
 */
export function addSingleItem(data, dimension, nodes, max_item, initItem, constructSingleItem, state) {
  if (dimension !== null && data.len() !== dimension) {
    throw new Error("维度不同");
  }

  if (nodes.length >= max_item) {
    throw new Error("元素数量超过指定限制");
  }

  const insertId = initItem(data, state);
  constructSingleItem(insertId, state);

  return insertId;
}

// ================ 主函数 ================

/**
 * 创建优化版HNSW索引
 */
export function createHNSWIndex({
  distanceFunction = 'cosine',
  M = DEFAULT_M,
  efConstruction = DEFAULT_EF_CONSTRUCTION,
  efSearch = DEFAULT_EF_SEARCH,
  ml = DEFAULT_ML,
} = {}) {
  let dimension = null; // 将在第一次插入时确定
  const max_item = 1000000;
  const n_neighbor = Math.max(16, M);
  const n_neighbor0 = BOTTOM_LAYER_CONNECTIONS;
  const max_level = Math.max(16, ml);
  
  // 使用优化版邻居存储结构
  const neighborStore = createOptimizedNeighborStore(max_level);
  
  // 使用距离缓存
  const distanceCache = createDistanceCache();
  
  const nodes = []; // 数据储存
  const item2id = new Map(); // item_id到HNSW内部id映射
  const id2level = []; // id到层级映射
  const has_removed = false;
  const ef_build = Math.max(200, efConstruction);
  const ef_search = Math.max(200, efSearch);
  const delete_ids = new Set(); // 已删除id集合
  let mt = Metric.Unknown; // 计算度量方式
  
  // 创建状态对象
  const state = {
    cur_level: 0,
    root_id: 0
  };

  // 设置度量方式
  if (distanceFunction === 'euclidean') {
    mt = Metric.Euclidean;
  } else if (distanceFunction === 'cosine') {
    mt = Metric.Cosine;
  } else if (distanceFunction === 'inner_product') {
    mt = Metric.DotProduct;
  }

  // 获取随机层级
  function getRandomLevel() {
    let ret = 0;
    while (ret < max_level) {
      if (Math.random() > 0.5) {
        ret += 1;
      } else {
        break;
      }
    }
    return ret;
  }

  // 获取某ID在某层的邻居 - 使用优化版邻居存储
  function getNeighbor(id, level) {
    return neighborStore.getNeighbor(id, level);
  }

  // 计算两个向量之间的距离
  function getDistanceFromVec(x, y) {
    return metric(x.vector, y.vector, mt);
  }

  // 计算两个ID之间的距离 - 使用距离缓存
  function getDistanceFromId(x, y) {
    return distanceCache.getCachedDistance(x, y, (id1, id2) => {
      return metric(
        getData(id1).vector,
        getData(id2).vector,
        mt
      );
    });
  }

  // 获取ID对应的数据
  function getData(id) {
    if (id >= nodes.length || id < 0) {
      throw new Error(`无效的节点ID: ${id}`);
    }
    return nodes[id];
  }

  // 检查ID是否已删除
  function isDeleted(id) {
    return has_removed && delete_ids.has(id);
  }

  // 对外暴露的添加节点方法
  function insertNode(vector, data = null) {
    try {
      if (!vector || (!Array.isArray(vector) && !(vector instanceof Float32Array))) {
        console.error('insertNode错误: 无效的向量数据', { vector });
        return null;
      }
      
      const node = createNode(vector, null);
      node.data = data;
      
      // 第一次添加时确定维度
      if (dimension === null && nodes.length === 0) {
        dimension = node.len();
      }
      
      return addSingleItem(node, dimension, nodes, max_item, 
        (data) => initItem(data, nodes, max_level, neighborStore, id2level, item2id, getRandomLevel, state),
        (insertId) => constructSingleItem(insertId, id2level, state, getData, getDistanceFromId, 
          (searchData, sortedCandidates, visitedId, level, ef, hasDeletion) => 
            searchLayerWithCandidate(searchData, sortedCandidates, visitedId, level, ef, hasDeletion, 
              getData, getNeighbor, isDeleted, getDistanceFromVec),
          (curId, sortedCandidates, level, isUpdate) => 
            connectNeighbor(curId, sortedCandidates, level, isUpdate, n_neighbor0, n_neighbor, 
              getNeighbor, getDistanceFromId, 
              (sortedList, retSize) => getNeighborsByHeuristic2(sortedList, retSize, getDistanceFromId),
              neighborStore.setNeighbors),
          ef_build, isDeleted, getNeighbor, n_neighbor0, n_neighbor, getNeighborsByHeuristic2, getDistanceFromVec, nodes, neighborStore.setNeighbors),
        state);
    } catch (error) {
      console.error('insertNode执行出错:', error);
      return null;
    }
  }

  // 对外暴露的搜索方法
  function searchKNNMethod(queryVector, k = 10, searchParams = {}) {
    try {
      if (!queryVector || k <= 0) {
        console.error('搜索参数无效', { queryVector, k });
        return [];
      }
      
      const node = createNode(queryVector);
      const topCandidates = searchKnn(node, k, nodes, state, max_item, 
        getData, getNeighbor, getDistanceFromVec, 
        (root, searchData, level, ef, hasDeletion) => 
          searchLayer(root, searchData, level, ef, hasDeletion, getData, getNeighbor, isDeleted, getDistanceFromVec),
        has_removed, ef_search, isDeleted);
      
      const results = [];
      const resultIdx = [];
      
      // 从堆中提取结果
      while (!topCandidates.isEmpty()) {
        const top = topCandidates.peek();
        const topIdx = top.idx();
        const topDistance = top.distance();
        topCandidates.pop();
        resultIdx.push([topIdx, topDistance]);
      }
      
      // 按正确顺序组织结果
      resultIdx.reverse();
      for (const [idx, distance] of resultIdx) {
        const node = nodes[idx];
        if (isDeleted(idx)) continue;
        
        // 构建结果对象 - 保持对外接口兼容
        const resultObj = {
          id: idx,
          distance: distance,
          data: node.data
        };
        
        if (searchParams.returnScore) {
          resultObj.score = 1 - distance;
        }
        
        results.push(resultObj);
      }
      
      return results;
    } catch (error) {
      console.error('searchKNN执行出错:', error);
      return [];
    }
  }

  // 删除节点
  function removeNodeMethod(id) {
    if (id >= nodes.length || id < 0) {
      return false;
    }
    
    if (isDeleted(id)) {
      return false;
    }
    
    delete_ids.add(id);
    return true;
  }

  // 获取节点
  function getNodeMethod(id) {
    if (id >= nodes.length || id < 0 || isDeleted(id)) {
      return null;
    }
    
    const node = nodes[id];
    return {
      id: id,
      data: node.data,
      vector: node.vector ? new Float32Array(node.vector) : null
    };
  }

  // 获取统计信息
  function getStatsMethod() {
    let totalConnections = 0;
    let activeNodeCount = 0;
    
    for (let i = 0; i < nodes.length; i++) {
      if (isDeleted(i)) continue;
      activeNodeCount++;
      
      // 计算level 0的连接
      const level0Conns = getNeighbor(i, 0);
      totalConnections += level0Conns.length;
      
      // 计算其他层级的连接
      for (let level = 1; level <= id2level[i]; level++) {
        const levelConns = getNeighbor(i, level);
        totalConnections += levelConns.length;
      }
    }
    
    return {
      nodeCount: activeNodeCount,
      maxLevel: state.cur_level,
      totalNodes: nodes.length,
      activeNodeCount,
      avgConnectionsPerNode: activeNodeCount > 0 ? totalConnections / activeNodeCount : 0,
      parameters: {
        M: n_neighbor,
        efConstruction: ef_build,
        efSearch: ef_search,
        ml: max_level
      }
    };
  }

  // 获取节点连接
  function getNodeConnectionsMethod(id) {
    if (id >= nodes.length || id < 0 || isDeleted(id)) {
      return null;
    }
    
    const connections = [];
    
    // 添加level 0的连接
    const level0Conns = getNeighbor(id, 0);
    if (level0Conns && level0Conns.length > 0) {
      const level0Connections = [];
      for (const connId of level0Conns) {
        if (!isDeleted(connId)) {
          level0Connections.push({
            id: connId,
            data: nodes[connId].data,
            distance: getDistanceFromId(id, connId)
          });
        }
      }
      connections.push({ level: 0, connections: level0Connections });
    }
    
    // 添加其他层级的连接
    for (let level = 1; level <= id2level[id]; level++) {
      const levelConns = getNeighbor(id, level);
      if (levelConns && levelConns.length > 0) {
        const levelConnections = [];
        for (const connId of levelConns) {
          if (!isDeleted(connId)) {
            levelConnections.push({
              id: connId,
              data: nodes[connId].data,
              distance: getDistanceFromId(id, connId)
            });
          }
        }
        connections.push({ level: level, connections: levelConnections });
      }
    }
    
    return connections;
  }

  // 返回对外API
  return {
    insertNode,
    searchKNN: searchKNNMethod,
    removeNode: removeNodeMethod,
    getNode: getNodeMethod,
    getStats: getStatsMethod,
    getNodeConnections: getNodeConnectionsMethod,
    _nodes: nodes
  };
} 