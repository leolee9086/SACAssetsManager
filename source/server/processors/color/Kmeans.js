export function 欧几里得聚类(data, k) {
    return kMeansPP(data, k, euclideanDistance,100,true);
}



function euclideanDistance(a, b) {
    return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));
}

function kMeans(data, k, 算法) {
    // Initialize cluster centers and assignments
    let centers = [];
    for (let i = 0; i < k; i++) {
        const idx = (Math.floor(Math.random() * (data.length / 4))) * 4;
        centers.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
    let assignments = new Array(data.length / 4).fill(-1);
    let _counts = []
    let changed = true;
    while (changed) {
        changed = false;
        // Assign pixels to the nearest cluster center
        for (let i = 0; i < data.length; i += 4) {
            const pixel = [data[i], data[i + 1], data[i + 2]];
            let minDistance = Infinity;
            let assignedCluster = 0;
            for (let j = 0; j < k; j++) {
                const distance = 算法(pixel, centers[j]);
                //    const distance =(euclideanDistance(pixel, centers[j]));
                if (distance < minDistance) {
                    minDistance = distance;
                    assignedCluster = j;
                }
            }
            if (assignments[i / 4] !== assignedCluster) {
                assignments[i / 4] = assignedCluster;
                changed = true;
            }
        }
        // Update cluster centers
        let sums = Array(k).fill(null).map(() => [0, 0, 0]);
        let counts = Array(k).fill(0);
        for (let i = 0; i < assignments.length; i++) {
            const clusterIdx = assignments[i];
            sums[clusterIdx][0] += data[i * 4];
            sums[clusterIdx][1] += data[i * 4 + 1];
            sums[clusterIdx][2] += data[i * 4 + 2];
            counts[clusterIdx]++;
        }
        for (let i = 0; i < k; i++) {
            if (counts[i] > 0) {
                centers[i] = sums[i].map(x => x / counts[i]);
                _counts[i] = counts[i]
            }
        }
    }

    const sortedCenters = centers.map((center, index) => ({
        color: center,
        count: _counts[index]
    })).sort((a, b) => b.count - a.count).map(item => item.color);
    return { centers: sortedCenters, assignments };
}



export function kMeansPP(data, k, 算法, maxIterations = 100, withPercent = false) {
    // 初始化聚类中心
    let centers = initializeCenters(data, k);
    let assignments = new Array(data.length / 4).fill(-1);
    let counts = new Array(k).fill(0);

    for (let iteration = 0; iteration < maxIterations; iteration++) {
        let changed = false;

        // 分配像素到最近的聚类中心
        for (let i = 0; i < data.length; i += 4) {
            const pixel = [data[i], data[i + 1], data[i + 2]];
            const assignedCluster = assignToCluster(pixel, centers, 算法);

            if (assignments[i / 4] !== assignedCluster) {
                assignments[i / 4] = assignedCluster;
                changed = true;
            }
        }

        if (!changed) break;

        // 更新聚类中心
        centers = updateCenters(data, assignments, k);
        counts = calculateCounts(assignments, k);
    }

    const sortedCenters = centers.map((center, index) => ({
        color: center,
        count: counts[index]
    })).sort((a, b) => b.count - a.count || a.color[0] - b.color[0] || a.color[1] - b.color[1] || a.color[2] - b.color[2])
        .map(item => {
            if (withPercent) {
                item.percent = item.count*4 / data.length
                return item
            } else {
                return item.color
            }
        });


    return { centers: sortedCenters, assignments };
}

function initializeCenters(data, k) {
    let centers = [];
    const step = Math.floor(data.length / (k * 4));
    for (let i = 0; i < k; i++) {
        const idx = i * step * 4;
        centers.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
    return centers;
}

function assignToCluster(pixel, centers, 算法) {
    let minDistance = Infinity;
    let assignedCluster = 0;
    for (let j = 0; j < centers.length; j++) {
        const distance = 算法(pixel, centers[j]);
        if (distance < minDistance) {
            minDistance = distance;
            assignedCluster = j;
        }
    }
    return assignedCluster;
}

function updateCenters(data, assignments, k) {
    let sums = Array(k).fill(null).map(() => [0, 0, 0]);
    let counts = Array(k).fill(0);
    for (let i = 0; i < assignments.length; i++) {
        const clusterIdx = assignments[i];
        sums[clusterIdx][0] += data[i * 4];
        sums[clusterIdx][1] += data[i * 4 + 1];
        sums[clusterIdx][2] += data[i * 4 + 2];
        counts[clusterIdx]++;
    }
    return sums.map((sum, i) =>
        counts[i] > 0 ? sum.map(x => x / counts[i]) : [0, 0, 0]
    );
}

function calculateCounts(assignments, k) {
    let counts = Array(k).fill(0);
    for (let i = 0; i < assignments.length; i++) {
        counts[assignments[i]]++;
    }
    return counts;
}