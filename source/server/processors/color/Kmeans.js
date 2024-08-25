import {CIEDE2000RGBA} from "./similar.js"
import {CIE76} from "./similar.js"
export function 欧几里得聚类(data, k) {
    return kMeansPP(data, k, euclideanDistanceWithHueCorrection,100,true);
}
export function CIEDE2000聚类(data, k) {
    return kMeansPP(data, k, CIEDE2000RGBA,100,true);
}
const cache = new Map();
/**
 * 查找两个颜色是否相近,搜索瓶颈不在这里
 * @param {*} color1 
 * @param {*} color2 
 * @returns 
 */
export const diffColor = (color1, color2) => {
    // 直接使用欧几里得距离
   // const distance1 =     euclideanDistanceWithHueCorrection(color1, color2);
   const distance2 =CIEDE2000RGBA(color1, color2);
    const distance3 = CIE76(color1, color2)

    //let result1=isDistanceAcceptable(distance1, 'totalDistance2', 'count2', 0.8)
    let result2=isDistanceAcceptable(distance2, 'totalDistance1', 'count1', 0.9)
    const result3 = isDistanceAcceptable(distance3, 'totalDistance3', 'count3', 50)
    return result3&&result2
};

function isDistanceAcceptable(distance, totalKey, countKey, threshold) {
    if (!cache.has(totalKey)) {
        cache.set(totalKey, 0);
        cache.set(countKey, 0);
    }
    const totalDistance = (cache.get(totalKey) + distance)||0;
    const count = (cache.get(countKey) + 1);
    cache.set(totalKey, totalDistance);
    cache.set(countKey, count);
    const averageDistance = (totalDistance / count)||0;
    if(threshold>1){
        return distance <  threshold;
    }else{
        return distance < averageDistance * threshold;
    }
}
function euclideanDistanceWithHueCorrection(a, b) {
    // 色相修正
    const hueCorrectedA = correctHue(a);
    const hueCorrectedB = correctHue(b);
    return Math.sqrt(hueCorrectedA.reduce((sum, val, i) => sum + (val - hueCorrectedB[i]) ** 2, 0));
}
function correctHue(color) {
    const [r, g, b] = color;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let hue = 0;
    if (max === min) {
        hue = 0; 
    } else if (max === r) {
        hue = (60 * ((g - b) / (max - min)) + 360) % 360;
    } else if (max === g) {
        hue = (60 * ((b - r) / (max - min)) + 120) % 360;
    } else if (max === b) {
        hue = (60 * ((r - g) / (max - min)) + 240) % 360;
    }
    return [r, g, b, hue];
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
                return item.color.map(x=>Math.round(x))
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