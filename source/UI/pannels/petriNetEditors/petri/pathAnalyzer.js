export function analyzePath(petriNet, startNode) {
    const path = [];
    const visited = new Set();
    const queue = [startNode];

    while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current)) continue;
        
        visited.add(current);
        path.push(current);

        // 添加下游节点
        const downstream = findDownstreamNodes(petriNet, current);
        queue.push(...downstream);
    }

    return path;
}

export function findDownstreamNodes(petriNet, nodeId) {
    const downstream = [];
    petriNet.连接.forEach(conn => {
        if (conn.from === nodeId) {
            downstream.push(conn.to);
        }
    });
    return downstream;
}

export function compilePath(petriNet, path) {
    return async (inputs) => {
        const results = {};
        
        for (const nodeId of path) {
            const node = petriNet.节点.get(nodeId);
            if (node?.内容?.process) {
                results[nodeId] = await node.内容.process(results);
            }
        }

        return results;
    };
}
