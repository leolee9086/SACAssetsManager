/**
 * JavaScript实现的HNSW索引，基于Rust的horaHnsw.rs 1:1翻译
 * 
 * 这是一个高性能的近似最近邻搜索索引实现
 * 支持高维向量的高效索引和查询
 * 
 * 文件说明：
 * 此文件实现了HNSW(Hierarchical Navigable Small World)算法
 * 用于高效地解决K近邻(KNN)搜索问题
 * 相比暴力搜索，HNSW能在保持较高查询精度的同时大幅提升查询速度
 */

// 创建二进制堆实现 - 对标BinaryHeap
function createBinaryHeap(comparator) {
    const elements = [];

    return {
        push(element) {
            // 添加元素到末尾并上浮到合适位置
            elements.push(element);
            let currentIndex = elements.length - 1;
            while (currentIndex > 0) {
                const parentIndex = Math.floor((currentIndex - 1) / 2);
                if (comparator(elements[currentIndex], elements[parentIndex]) >= 0) break;
                // 交换元素
                [elements[currentIndex], elements[parentIndex]] = [elements[parentIndex], elements[currentIndex]];
                currentIndex = parentIndex;
            }
        },

        pop() {
            if (elements.length === 0) return null;

            const top = elements[0];
            const bottom = elements.pop();

            if (elements.length > 0) {
                elements[0] = bottom;
                // 下沉操作
                let currentIndex = 0;
                while (true) {
                    const leftChildIndex = 2 * currentIndex + 1;
                    const rightChildIndex = 2 * currentIndex + 2;
                    let smallestIndex = currentIndex;

                    if (leftChildIndex < elements.length &&
                        comparator(elements[leftChildIndex], elements[smallestIndex]) < 0) {
                        smallestIndex = leftChildIndex;
                    }

                    if (rightChildIndex < elements.length &&
                        comparator(elements[rightChildIndex], elements[smallestIndex]) < 0) {
                        smallestIndex = rightChildIndex;
                    }

                    if (smallestIndex === currentIndex) break;

                    [elements[currentIndex], elements[smallestIndex]] =
                        [elements[smallestIndex], elements[currentIndex]];
                    currentIndex = smallestIndex;
                }
            }

            return top;
        },

        peek() {
            return elements.length > 0 ? elements[0] : null;
        },

        isEmpty() {
            return elements.length === 0;
        },

        size() {
            return elements.length;
        },

        clear() {
            elements.length = 0;
        },

        // 转换为排序数组
        intoSortedVec() {
            // 避免创建额外数组，直接克隆并排序
            if (elements.length === 0) return [];
            const sorted = elements.slice(0);
            sorted.sort(comparator);
            return sorted;
        }
    };
}

// Neighbor类 - 类似于Rust版本的Neighbor
class Neighbor {
    constructor(idx, distance) {
        this._idx = idx;
        this._distance = distance;
    }

    idx() {
        return this._idx;
    }

    distance() {
        return this._distance;
    }

    static new(idx, distance) {
        return new Neighbor(idx, distance);
    }
}


// 度量方法枚举
export const Metric = {
    Unknown: 0,
    Euclidean: 1,
    Cosine: 2,
    Manhattan: 3,
    DotProduct: 4
};

// 度量计算函数
function metric(x, y, metricType) {
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
            // 对于归一化向量，这等价于余弦相似度
            return -sum;

        default:
            throw new Error(`未知度量类型: ${metricType}`);
    }
}

// Node类 - 包装向量和ID
export class Node {
    constructor(vector, id = null) {
        this._vector = vector instanceof Float32Array ? vector : new Float32Array(vector);
        this._id = id;
    }

    vectors() {
        return this._vector;
    }

    len() {
        return this._vector.length;
    }

    idx() {
        return this._id;
    }

    static new(vector, id = null) {
        return new Node(vector, id);
    }

    clone() {
        return new Node([...this._vector], this._id);
    }
}

// 主HNSW索引类
export class HNSWIndex {
    constructor(dimension, params = {}) {
        this._dimension = dimension;
        this._n_items = 0;
        this._n_constructed_items = 0;
        this._max_item = params.max_item || 1000000;
        this._n_neighbor = params.n_neighbor || 32;
        this._n_neighbor0 = params.n_neighbor0 || 64;
        this._max_level = params.max_level || 16;
        this._cur_level = 0;
        this._id2neighbor = []; // 除level 0外的邻居
        this._id2neighbor0 = []; // level 0的邻居
        this._nodes = []; // 数据储存
        this._item2id = new Map(); // item_id到HNSW内部id映射
        this._root_id = 0; // HNSW根节点
        this._id2level = []; // id到层级映射
        this._has_removed = params.has_deletion || false;
        this._ef_build = params.ef_build || 400;
        this._ef_search = params.ef_search || 400;
        this._delete_ids = new Set(); // 已删除id集合
        this.mt = Metric.Unknown; // 计算度量方式

        // 用于序列化
        this._id2neighbor_tmp = [];
        this._id2neighbor0_tmp = [];
        this._nodes_tmp = [];
        this._item2id_tmp = [];
        this._delete_ids_tmp = [];
    }

    static new(dimension, params = {}) {
        return new HNSWIndex(dimension, params);
    }

    // 获取随机层级
    getRandomLevel() {
        let ret = 0;
        while (ret < this._max_level) {
            if (Math.random() > 0.5) {
                ret += 1;
            } else {
                break;
            }
        }
        return ret;
    }

    // 通过启发式方法获取邻居
    getNeighborsByHeuristic2(sortedList, retSize) {
        const sortedListLen = sortedList.length;
        const returnList = [];

        for (const iter of sortedList) {
            if (returnList.length >= retSize) {
                break;
            }

            const idx = iter.idx();
            const distance = iter.distance();

            if (sortedListLen < retSize) {
                returnList.push(Neighbor.new(idx, distance));
                continue;
            }

            let good = true;

            for (const retNeighbor of returnList) {
                const cur2retDis = this.getDistanceFromId(idx, retNeighbor.idx());
                if (cur2retDis < distance) {
                    good = false;
                    break;
                }
            }

            if (good) {
                returnList.push(Neighbor.new(idx, distance));
            }
        }

        return returnList; // 从小到大
    }

    // 获取某ID在某层的邻居
    getNeighbor(id, level) {
        if (level === 0) {
            return this._id2neighbor0[id];
        }
        return this._id2neighbor[id][level - 1];
    }

    // 获取ID的层级
    getLevel(id) {
        return this._id2level[id];
    }

    // 连接邻居节点
    connectNeighbor(curId, sortedCandidates, level, isUpdate) {
        const n_neigh = level === 0 ? this._n_neighbor0 : this._n_neighbor;
        const selectedNeighbors = this.getNeighborsByHeuristic2(sortedCandidates, n_neigh);

        if (selectedNeighbors.length > n_neigh) {
            throw new Error("不应返回超过M_个候选项");
        }

        if (selectedNeighbors.length === 0) {
            throw new Error("顶部候选项为空，不可能！");
        }

        const nextClosestEntryPoint = selectedNeighbors[0].idx();

        // 获取当前邻居列表
        const curNeigh = this.getNeighbor(curId, level);
        // 清空当前邻居
        curNeigh.length = 0;
        // 添加选中的邻居
        for (const selectedNeighbor of selectedNeighbors) {
            curNeigh.push(selectedNeighbor.idx());
        }

        // 为选中的邻居添加反向连接
        for (const selectedNeighbor of selectedNeighbors) {
            const neighborOfSelectedNeighbors = this.getNeighbor(selectedNeighbor.idx(), level);

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
                    const dMax = this.getDistanceFromId(curId, selectedNeighbor.idx());

                    const candidates = createBinaryHeap((a, b) => {
                        return a.distance() - b.distance();
                    });

                    candidates.push(Neighbor.new(curId, dMax));

                    for (const iter of neighborOfSelectedNeighbors) {
                        const neighborId = iter;
                        const dNeigh = this.getDistanceFromId(neighborId, selectedNeighbor.idx());
                        candidates.push(Neighbor.new(neighborId, dNeigh));
                    }

                    const returnList = this.getNeighborsByHeuristic2(candidates.intoSortedVec(), n_neigh);

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

    // 删除ID
    deleteId(id) {
        if (id > this._n_constructed_items) {
            throw new Error("无效的删除ID");
        }

        if (this.isDeleted(id)) {
            throw new Error("ID已删除");
        }

        this._delete_ids.add(id);
    }

    // 检查ID是否已删除
    isDeleted(id) {
        return this._has_removed && this._delete_ids.has(id);
    }

    // 获取ID对应的数据
    getData(id) {
        if (id >= this._nodes.length || id < 0) {
            throw new Error(`无效的节点ID: ${id}`);
        }
        return this._nodes[id];
    }

    // 计算两个向量之间的距离
    getDistanceFromVec(x, y) {
        return metric(x.vectors(), y.vectors(), this.mt);
    }

    // 计算两个ID之间的距离
    getDistanceFromId(x, y) {
        return metric(
            this.getData(x).vectors(),
            this.getData(y).vectors(),
            this.mt
        );
    }

    // 使用候选集在特定层级搜索
    searchLayerWithCandidate(searchData, sortedCandidates, visitedId, level, ef, hasDeletion) {
        const topCandidates = createBinaryHeap((a, b) => {
            return b.distance() - a.distance(); // 最小堆 (距离越小越好)
        });

        const candidates = createBinaryHeap((a, b) => {
            return a.distance() - b.distance(); // 最大堆 (保留最近的)
        });

        for (const neighbor of sortedCandidates) {
            const root = neighbor.idx();
            if (!hasDeletion || !this.isDeleted(root)) {
                const dist = this.getDistanceFromVec(this.getData(root), searchData);
                topCandidates.push(Neighbor.new(root, dist));
                candidates.push(Neighbor.new(root, dist));
            } else {
                candidates.push(Neighbor.new(root, Number.MAX_VALUE));
            }
            visitedId.add(root);
        }

        let lowerBound = topCandidates.isEmpty()
            ? Number.MAX_VALUE
            : topCandidates.peek().distance();

        while (!candidates.isEmpty()) {
            const curNeigh = candidates.peek();
            const curDist = -curNeigh.distance();
            const curId = curNeigh.idx();
            candidates.pop();

            if (curDist > lowerBound) {
                break;
            }

            const curNeighbors = this.getNeighbor(curId, level);

            for (const neigh of curNeighbors) {
                if (visitedId.has(neigh)) {
                    continue;
                }

                visitedId.add(neigh);
                const dist = this.getDistanceFromVec(this.getData(neigh), searchData);

                if (topCandidates.size() < ef || dist < lowerBound) {
                    candidates.push(Neighbor.new(neigh, dist));

                    if (!this.isDeleted(neigh)) {
                        topCandidates.push(Neighbor.new(neigh, dist));
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

    // 在特定层级搜索
    searchLayer(root, searchData, level, ef, hasDeletion) {
        const visitedId = new Set();
        const topCandidates = createBinaryHeap((a, b) => {
            return b.distance() - a.distance(); // 最小堆 (距离越小越好)
        });

        const candidates = createBinaryHeap((a, b) => {
            return a.distance() - b.distance(); // 最大堆 (保留最近的)
        }); 
        let lowerBound;

        if (!hasDeletion || !this.isDeleted(root)) {
            const dist = this.getDistanceFromVec(this.getData(root), searchData);
            topCandidates.push(Neighbor.new(root, dist));
            candidates.push(Neighbor.new(root, dist));
            lowerBound = dist;
        } else {
            lowerBound = Number.MAX_VALUE; // 最大距离
            candidates.push(Neighbor.new(root, -lowerBound));
        }

        visitedId.add(root);

        while (!candidates.isEmpty()) {
            const curNeigh = candidates.peek();
            const curDist = -curNeigh.distance();
            const curId = curNeigh.idx();
            candidates.pop();

            if (curDist > lowerBound) {
                break;
            }

            const curNeighbors = this.getNeighbor(curId, level);

            for (const neigh of curNeighbors) {
                if (visitedId.has(neigh)) {
                    continue;
                }

                visitedId.add(neigh);
                const dist = this.getDistanceFromVec(this.getData(neigh), searchData);

                if (topCandidates.size() < ef || dist < lowerBound) {
                    candidates.push(Neighbor.new(neigh, dist));

                    if (!this.isDeleted(neigh)) {
                        topCandidates.push(Neighbor.new(neigh, dist));
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

    // K最近邻搜索
    searchKnn(searchData, k) {
        let topCandidate = createBinaryHeap((a, b) => {
            return a.distance() - b.distance(); // 最大堆
        });

        if (this._n_constructed_items === 0) {
            return topCandidate;
        }

        let curId = this._root_id;
        let curDist = this.getDistanceFromVec(this.getData(curId), searchData);
        let curLevel = this._cur_level;

        while (true) {
            let changed = true;
            while (changed) {
                changed = false;
                const curNeighs = this.getNeighbor(curId, curLevel);

                for (const neigh of curNeighs) {
                    if (neigh > this._max_item) {
                        throw new Error("候选项错误");
                    }

                    const dist = this.getDistanceFromVec(this.getData(neigh), searchData);
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

        const searchRange = this._ef_search > k ? this._ef_search : k;

        topCandidate = this.searchLayer(curId, searchData, 0, searchRange, this._has_removed);

        while (topCandidate.size() > k) {
            topCandidate.pop();
        }

        return topCandidate;
    }

    // 初始化项目
    initItem(data) {
        const curId = this._n_items;
        let curLevel = this.getRandomLevel();

        if (curId === 0) {
            curLevel = this._max_level;
            this._cur_level = curLevel;
            this._root_id = curId;
        }

        const neigh0 = [];
        const neigh = [];

        for (let i = 0; i < curLevel; i++) {
            neigh.push([]);
        }

        this._nodes.push(data.clone());
        this._id2neighbor0.push(neigh0);
        this._id2neighbor.push(neigh);
        this._id2level.push(curLevel);

        if (data.idx() !== null) {
            this._item2id.set(data.idx(), curId);
        }

        this._n_items += 1;
        return curId;
    }

    // 批量构建
    batchConstruct(mt) {
        if (this._n_items < this._n_constructed_items) {
            throw new Error("构建错误");
        }

        for (let insertId = this._n_constructed_items; insertId < this._n_items; insertId++) {
            this.constructSingleItem(insertId);
        }

        this._n_constructed_items = this._n_items;
    }

    // 添加未构建的项目
    addItemNotConstructed(data) {
        if (data.len() !== this._dimension) {
            throw new Error("维度不同");
        }

        if (this._n_items >= this._max_item) {
            throw new Error("元素数量超过指定限制");
        }

        const insertId = this.initItem(data);
        return insertId;
    }

    // 添加单个项目
    addSingleItem(data) {
        if (data.len() !== this._dimension) {
            throw new Error("维度不同");
        }

        if (this._n_items >= this._max_item) {
            throw new Error("元素数量超过指定限制");
        }

        const insertId = this.initItem(data);
        this.constructSingleItem(insertId);
        this._n_constructed_items += 1;

        return insertId;
    }

    // 构建单个项目
    constructSingleItem(insertId) {
        const insertLevel = this._id2level[insertId];
        let curId = this._root_id;

        if (insertId === 0) {
            return;
        }

        if (insertLevel < this._cur_level) {
            let curDist = this.getDistanceFromId(curId, insertId);
            let curLevel = this._cur_level;

            while (curLevel > insertLevel) {
                let changed = true;
                while (changed) {
                    changed = false;
                    const curNeighs = this.getNeighbor(curId, curLevel);

                    for (const curNeigh of curNeighs) {
                        if (curNeigh > this._n_items) {
                            throw new Error("候选项错误");
                        }

                        const neighDist = this.getDistanceFromId(curNeigh, insertId);
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

        let level = insertLevel < this._cur_level ? insertLevel : this._cur_level;
        const visitedId = new Set();
        let sortedCandidates = [];
        const insertData = this.getData(insertId);

        visitedId.add(insertId);
        sortedCandidates.push(Neighbor.new(curId, this.getDistanceFromId(curId, insertId)));

        while (true) {
            const topCandidates = this.searchLayerWithCandidate(
                insertData,
                sortedCandidates,
                visitedId,
                level,
                this._ef_build,
                false
            );

            if (this.isDeleted(curId)) {
                const curDist = this.getDistanceFromId(curId, insertId);
                topCandidates.push(Neighbor.new(curId, curDist));
                if (topCandidates.size() > this._ef_build) {
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

            curId = this.connectNeighbor(insertId, sortedCandidates, level, false);

            if (level === 0) {
                break;
            }

            level -= 1;
        }
    }

    // 实现ANNIndex接口方法

    // 构建索引
    build(mt) {
        this.mt = mt;
        this.batchConstruct(mt);
    }

    // 添加节点
    addNode(item) {
        return this.addItemNotConstructed(item);
    }

    // 索引是否已构建
    built() {
        return true;
    }

    // 搜索k个最近邻
    nodeSearchK(item, k) {
        const ret = this.searchKnn(item, k);
        const result = [];
        const resultIdx = [];

        // 从堆中提取结果
        while (!ret.isEmpty()) {
            const top = ret.peek();
            const topIdx = top.idx();
            const topDistance = top.distance();
            ret.pop();
            resultIdx.push([topIdx, topDistance]);
        }

        // 按正确顺序组织结果 - 反转数组避免额外计算
        resultIdx.reverse();
        for (const [idx, distance] of resultIdx) {
            result.push([this._nodes[idx].clone(), distance]);
        }

        return result;
    }

    // 获取索引名称
    name() {
        return "HNSWIndex";
    }

    // 获取维度
    dimension() {
        return this._dimension;
    }

    // 序列化相关方法

    // 加载索引
    static load(path) {
        throw new Error("JS版本不支持从文件加载，请使用其他方式恢复数据");
    }

    // 保存索引
    dump(path) {
        throw new Error("JS版本不支持保存到文件，请使用其他方式序列化数据");
    }

    // 序列化
    serialize() {
        this._id2neighbor_tmp = [];
        for (let i = 0; i < this._id2neighbor.length; i++) {
            const tmp = [];
            for (let j = 0; j < this._id2neighbor[i].length; j++) {
                tmp.push([...this._id2neighbor[i][j]]);
            }
            this._id2neighbor_tmp.push(tmp);
        }

        this._id2neighbor0_tmp = [];
        for (let i = 0; i < this._id2neighbor0.length; i++) {
            this._id2neighbor0_tmp.push([...this._id2neighbor0[i]]);
        }

        this._nodes_tmp = this._nodes.map(x => x.clone());

        this._item2id_tmp = [];
        for (const [k, v] of this._item2id.entries()) {
            this._item2id_tmp.push([k, v]);
        }

        this._delete_ids_tmp = [...this._delete_ids];

        return {
            _dimension: this._dimension,
            _n_items: this._n_items,
            _n_constructed_items: this._n_constructed_items,
            _max_item: this._max_item,
            _n_neighbor: this._n_neighbor,
            _n_neighbor0: this._n_neighbor0,
            _max_level: this._max_level,
            _cur_level: this._cur_level,
            _root_id: this._root_id,
            _id2level: [...this._id2level],
            _has_removed: this._has_removed,
            _ef_build: this._ef_build,
            _ef_search: this._ef_search,
            mt: this.mt,
            _id2neighbor_tmp: this._id2neighbor_tmp,
            _id2neighbor0_tmp: this._id2neighbor0_tmp,
            _nodes_tmp: this._nodes_tmp,
            _item2id_tmp: this._item2id_tmp,
            _delete_ids_tmp: this._delete_ids_tmp
        };
    }

    // 反序列化成索引
    static deserialize(serializedData) {
        const index = new HNSWIndex(serializedData._dimension, {
            max_item: serializedData._max_item,
            n_neighbor: serializedData._n_neighbor,
            n_neighbor0: serializedData._n_neighbor0,
            max_level: serializedData._max_level,
            has_deletion: serializedData._has_removed,
            ef_build: serializedData._ef_build,
            ef_search: serializedData._ef_search
        });

        index._n_items = serializedData._n_items;
        index._n_constructed_items = serializedData._n_constructed_items;
        index._cur_level = serializedData._cur_level;
        index._root_id = serializedData._root_id;
        index._id2level = [...serializedData._id2level];
        index.mt = serializedData.mt;

        // 恢复节点数据
        index._nodes = serializedData._nodes_tmp.map(node => {
            return node instanceof Node ? node.clone() : new Node(node.vectors(), node.idx());
        });

        // 恢复邻居关系
        index._id2neighbor = [];
        for (let i = 0; i < serializedData._id2neighbor_tmp.length; i++) {
            const neighbors = [];
            for (let j = 0; j < serializedData._id2neighbor_tmp[i].length; j++) {
                neighbors.push([...serializedData._id2neighbor_tmp[i][j]]);
            }
            index._id2neighbor.push(neighbors);
        }

        index._id2neighbor0 = [];
        for (let i = 0; i < serializedData._id2neighbor0_tmp.length; i++) {
            index._id2neighbor0.push([...serializedData._id2neighbor0_tmp[i]]);
        }

        // 恢复映射和删除状态
        index._item2id = new Map();
        for (const [k, v] of serializedData._item2id_tmp) {
            index._item2id.set(k, v);
        }

        index._delete_ids = new Set(serializedData._delete_ids_tmp);

        return index;
    }

}
// 创建一个HNSW参数对象
export function createHNSWParams(options = {}) {
    return {
        max_item: options.max_item || 1000000,
        n_neighbor: options.n_neighbor || 32,
        n_neighbor0: options.n_neighbor0 || 64,
        max_level: options.max_level || 16,
        has_deletion: options.has_deletion || false,
        ef_build: options.ef_build || 400,
        ef_search: options.ef_search || 400
    };
}
