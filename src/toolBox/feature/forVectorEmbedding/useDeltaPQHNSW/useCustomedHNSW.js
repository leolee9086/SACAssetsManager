/**
 * HNSW (Hierarchical Navigable Small World) 索引实现
 * 基于Rust的horaHnsw.rs 1:1翻译，确保算法一致性
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
const DEFAULT_EF_CONSTRUCTION = 800; 
const DEFAULT_EF_SEARCH = 800;        
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

// ================ 基础数据结构 ================



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
 * Node类的函数式实现
 */
export function createNode(vector, id = null) {
  const vectorData = vector instanceof Float32Array ? vector : new Float32Array(vector);
  
  return {
    vectors: () => vectorData,
    len: () => vectorData.length,
    idx: () => id,
    clone: () => createNode([...vectorData], id)
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

  let sum = 0;

  switch (metricType) {
    case Metric.Euclidean:
      for (let i = 0; i < x.length; i++) {
        const diff = x[i] - y[i];
        sum += diff * diff;
      }
      return Math.sqrt(sum);

    case Metric.Cosine:
      let dotProduct = 0;
      let normX = 0;
      let normY = 0;

      for (let i = 0; i < x.length; i++) {
        dotProduct += x[i] * y[i];
        normX += x[i] * x[i];
        normY += y[i] * y[i];
      }

      const normXSqrt = Math.sqrt(normX);
      const normYSqrt = Math.sqrt(normY);

      if (normXSqrt === 0 || normYSqrt === 0) return 1.0;
      return 1.0 - dotProduct / (normXSqrt * normYSqrt);

    case Metric.Manhattan:
      for (let i = 0; i < x.length; i++) {
        sum += Math.abs(x[i] - y[i]);
      }
      return sum;

    case Metric.DotProduct:
      for (let i = 0; i < x.length; i++) {
        sum += x[i] * y[i];
      }
      // 返回负内积作为距离，数值越大表示向量越相似
      return -sum;

    default:
      throw new Error(`未知度量类型: ${metricType}`);
  }
}

// ================ 搜索相关函数 ================

/**
 * 在特定层级搜索
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
 * 使用候选集在特定层级搜索
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
 * 通过启发式方法获取邻居
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
 * 连接邻居节点
 */
export function connectNeighbor(curId, sortedCandidates, level, isUpdate, n_neighbor0, n_neighbor, getNeighbor, getDistanceFromId, getNeighborsByHeuristic2) {
  const n_neigh = level === 0 ? n_neighbor0 : n_neighbor;
  const selectedNeighbors = getNeighborsByHeuristic2(sortedCandidates, n_neigh, getDistanceFromId);

  if (selectedNeighbors.length > n_neigh) {
    throw new Error("不应返回超过M_个候选项");
  }

  if (selectedNeighbors.length === 0) {
    throw new Error("顶部候选项为空，不可能！");
  }

  const nextClosestEntryPoint = selectedNeighbors[0].idx();

  // 获取当前邻居列表
  const curNeigh = getNeighbor(curId, level);
  // 清空当前邻居
  curNeigh.length = 0;
  // 添加选中的邻居
  for (const selectedNeighbor of selectedNeighbors) {
    curNeigh.push(selectedNeighbor.idx());
  }

  // 为选中的邻居添加反向连接
  for (const selectedNeighbor of selectedNeighbors) {
    const neighborOfSelectedNeighbors = getNeighbor(selectedNeighbor.idx(), level);

    if (neighborOfSelectedNeighbors.length > n_neigh) {
      throw new Error("neighborOfSelectedNeighbors的错误值");
    }

    if (selectedNeighbor.idx() === curId) {
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
        neighborOfSelectedNeighbors.push(curId);
      } else {
        const dMax = getDistanceFromId(curId, selectedNeighbor.idx());

        const candidates = createBinaryHeap((a, b) => {
          return a.distance() - b.distance();
        });

        candidates.push(createNeighbor(curId, dMax));

        for (const iter of neighborOfSelectedNeighbors) {
          const neighborId = iter;
          const dNeigh = getDistanceFromId(neighborId, selectedNeighbor.idx());
          candidates.push(createNeighbor(neighborId, dNeigh));
        }

        const returnList = getNeighborsByHeuristic2(candidates.intoSortedVec(), n_neigh, getDistanceFromId);

        // 清空邻居列表
        neighborOfSelectedNeighbors.length = 0;

        // 添加新的邻居
        for (const neighborInList of returnList) {
          neighborOfSelectedNeighbors.push(neighborInList.idx());
        }
      }
    }
  }

  return nextClosestEntryPoint;
}

/**
 * 构建单个项目
 */
export function constructSingleItem(insertId, id2level, state, getData, getDistanceFromId, searchLayerWithCandidate, connectNeighbor, ef_build, isDeleted, getNeighbor, n_neighbor0, n_neighbor, getNeighborsByHeuristic2, getDistanceFromVec, nodes) {
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

    curId = connectNeighbor(insertId, sortedCandidates, level, false, n_neighbor0, n_neighbor, getNeighbor, getDistanceFromId, getNeighborsByHeuristic2);

    if (level === 0) {
      break;
    }

    level -= 1;
  }
}

/**
 * 初始化项目
 */
export function initItem(data, nodes, max_level, id2neighbor0, id2neighbor, id2level, item2id, getRandomLevel, state) {
  const curId = nodes.length;
  let curLevel = getRandomLevel();

  if (curId === 0) {
    curLevel = max_level;
    state.cur_level = curLevel;
    state.root_id = curId;
  }

  const neigh0 = [];
  const neigh = [];

  for (let i = 0; i < curLevel; i++) {
    neigh.push([]);
  }

  nodes.push(data.clone());
  id2neighbor0.push(neigh0);
  id2neighbor.push(neigh);
  id2level.push(curLevel);

  if (data.idx() !== null) {
    item2id.set(data.idx(), curId);
  }

  return curId;
}

/**
 * K最近邻搜索
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
 * 添加单个项目
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
 * 创建HNSW索引
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
  const id2neighbor = []; // 除level 0外的邻居
  const id2neighbor0 = []; // level 0的邻居
  const nodes = []; // 数据储存
  const item2id = new Map(); // item_id到HNSW内部id映射
  const id2level = []; // id到层级映射
  const has_removed = false;
  const ef_build = Math.max(400, efConstruction);
  const ef_search = Math.max(400, efSearch);
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

  // 获取某ID在某层的邻居
  function getNeighbor(id, level) {
    if (level === 0) {
      return id2neighbor0[id];
    }
    return id2neighbor[id][level - 1];
  }

  // 计算两个向量之间的距离
  function getDistanceFromVec(x, y) {
    return metric(x.vectors(), y.vectors(), mt);
  }

  // 计算两个ID之间的距离
  function getDistanceFromId(x, y) {
    return metric(
      getData(x).vectors(),
      getData(y).vectors(),
      mt
    );
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
      
      // 第一次添加时确定维度
      if (dimension === null && nodes.length === 0) {
        dimension = node.len();
      }
      
      return addSingleItem(node, dimension, nodes, max_item, 
        (data) => initItem(data, nodes, max_level, id2neighbor0, id2neighbor, id2level, item2id, getRandomLevel, state),
        (insertId) => constructSingleItem(insertId, id2level, state, getData, getDistanceFromId, 
          (searchData, sortedCandidates, visitedId, level, ef, hasDeletion) => 
            searchLayerWithCandidate(searchData, sortedCandidates, visitedId, level, ef, hasDeletion, 
              getData, getNeighbor, isDeleted, getDistanceFromVec),
          (curId, sortedCandidates, level, isUpdate) => 
            connectNeighbor(curId, sortedCandidates, level, isUpdate, n_neighbor0, n_neighbor, 
              getNeighbor, getDistanceFromId, 
              (sortedList, retSize) => getNeighborsByHeuristic2(sortedList, retSize, getDistanceFromId)),
          ef_build, isDeleted, getNeighbor, n_neighbor0, n_neighbor, getNeighborsByHeuristic2, getDistanceFromVec, nodes),
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
          data: (node.data !== undefined) ? node.data : null
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
      data: (node.data !== undefined) ? node.data : null,
      vector: node.vectors ? new Float32Array(node.vectors()) : null
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
      if (id2neighbor0[i]) {
        totalConnections += id2neighbor0[i].length;
      }
      
      // 计算其他层级的连接
      if (id2neighbor[i]) {
        for (const levelConns of id2neighbor[i]) {
          if (Array.isArray(levelConns)) {
            totalConnections += levelConns.length;
          }
        }
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
    const level0Conns = id2neighbor0[id];
    if (level0Conns && level0Conns.length > 0) {
      const level0Connections = [];
      for (const connId of level0Conns) {
        if (!isDeleted(connId)) {
          level0Connections.push({
            id: connId,
            data: (nodes[connId].data !== undefined) ? nodes[connId].data : null,
            distance: getDistanceFromId(id, connId)
          });
        }
      }
      connections.push({ level: 0, connections: level0Connections });
    }
    
    // 添加其他层级的连接
    if (id2neighbor[id]) {
      for (let level = 0; level < id2neighbor[id].length; level++) {
        const levelConns = id2neighbor[id][level];
        if (levelConns && levelConns.length > 0) {
          const levelConnections = [];
          for (const connId of levelConns) {
            if (!isDeleted(connId)) {
              levelConnections.push({
                id: connId,
                data: (nodes[connId].data !== undefined) ? nodes[connId].data : null,
                distance: getDistanceFromId(id, connId)
              });
            }
          }
          connections.push({ level: level + 1, connections: levelConnections });
        }
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

/**
 * 搜索KNN
 */
export function searchKNN(queryVector, k, searchParams = {}, nodes, entryPoint, distanceFunc, excludeIds = new Set()) {
  const efSearch = searchParams.efSearch || DEFAULT_EF_SEARCH;
  const ef = searchParams.ef; 
  if (!queryVector || !nodes || !entryPoint || entryPoint.id === null || !distanceFunc) {
    console.error('searchKNN错误：无效参数');
    return [];
  }
  if (nodes.size === 0) {
    return [];
  }
  let curId = entryPoint.id;
  let curDist = distanceFunc(queryVector, nodes.get(curId).vector);
  let curLevel = entryPoint.level;
  
  // 严格按照经典实现的逐层贪心搜索
  while (true) {
    let changed = true;
    while (changed) {
      changed = false;
      const currentNode = nodes.get(curId);
      if (!currentNode || currentNode.deleted) break;
      
      const connections = currentNode.connections && 
                          curLevel < currentNode.connections.length ? 
                          currentNode.connections[curLevel] : [];
      for (const neighborId of connections) {
        // 越界检查
        if (neighborId >= nodes.size) {
          throw new Error("候选项错误");
        }
        const neighbor = nodes.get(neighborId);
        if (!neighbor || neighbor.deleted) continue;
        const dist = distanceFunc(queryVector, neighbor.vector);
        
        // 更新当前节点到距离最近的邻居
        if (dist < curDist) {
          curDist = dist;
          curId = neighborId;
          changed = true;
        }
      }
    }
    if (curLevel === 0) {
      break;
    }
    
    // 降低层级继续搜索
    curLevel--;
  }
  
  // 确定搜索范围 (ef)
  const searchRange = Math.max(efSearch, k);
  const effectiveEf = ef || searchRange;
  
  const topCandidates = searchLayer(
    { vector: queryVector },  // 查询节点
    k,
    effectiveEf,
    0, // 底层
    nodes,
    { id: curId, level: 0 },
    distanceFunc,
    excludeIds,
    new Set() // 访问标记集合
  );
  
  while (topCandidates.size() > k) {
    topCandidates.pop();
  }
  
  const results = [];
  const resultIdx = [];
  while (!topCandidates.isEmpty()) {
    const top = topCandidates.peek();
    const topIdx = top.idx();
    const topDistance = top.distance();
    topCandidates.pop();
    resultIdx.push([topIdx, topDistance]);
  }
  
  // 按照距离排序呈现结果 - 遵循经典实现
  resultIdx.reverse();  // 反转来得到正确的顺序
  for (const [idx, distance] of resultIdx) {
    const node = nodes.get(idx);
    if (!node || node.deleted) continue;
    
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
}