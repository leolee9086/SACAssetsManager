/**
 * @fileoverview 兼容层 - 几何与数学工具
 * 此文件作为兼容层保持API兼容性
 * @deprecated 请直接从src/toolBox/base/useEcma/forMath导入函数
 */

import * as d3 from "../../static/d3-quadtree.js";
import { Rectangle, QuadTreeNode, generateRandomRectangles } from "../../src/toolBox/base/useEcma/forMath/index.js";

// 重新导出类和函数，保持兼容性
export { Rectangle, QuadTreeNode, generateRandomRectangles };

// 为兼容性保留的示例代码
if (typeof window !== 'undefined' && window.document && import.meta.url.includes('?debug=true')) {
    // 测试四叉树
    const boundary = new Rectangle(0, 0, 1000, 1000);
    const quadtree = new QuadTreeNode(boundary);
    const rectangles = generateRandomRectangles(1000000, 1000, 1000);

    // 记录插入时间
    const insertStartTime = performance.now();
    rectangles.forEach(rect => quadtree.insert(rect));
    const insertEndTime = performance.now();
    console.log(`插入时间: ${(insertEndTime - insertStartTime).toFixed(2)} 毫秒`);

    // 记录查询时间
    const queryRect = new Rectangle(250, 250, 500, 500);
    const queryStartTime = performance.now();
    const results = quadtree.query(queryRect);
    const queryEndTime = performance.now();
    console.log(`四叉树查询时间: ${(queryEndTime - queryStartTime).toFixed(2)} 毫秒`);
    console.log(`四叉树查询结果数量: ${results.length}`);

    // 暴力查询
    const bruteForceStartTime = performance.now();
    const bruteForceResults = rectangles.filter(rect => rect.intersects(queryRect));
    const bruteForceEndTime = performance.now();
    console.log(`暴力查询时间: ${(bruteForceEndTime - bruteForceStartTime).toFixed(2)} 毫秒`);
    console.log(`暴力查询结果数量: ${bruteForceResults.length}`);

    // 正确性校验
    const isCorrect = results.length === bruteForceResults.length && results.every(r => 
        bruteForceResults.some(er => 
            r.x === er.x && r.y === er.y && r.width === er.width && r.height === er.height
        )
    );

    console.log(`查询结果正确性: ${isCorrect ? '正确' : '错误'}`);

    // 创建d3-quadtree
    const d3Quadtree = d3.quadtree()
        .x(d => d.x)
        .y(d => d.y)
        .addAll(rectangles);

    // 记录d3-quadtree查询时间
    const d3QueryStartTime = performance.now();
    const d3Results = [];
    d3Quadtree.visit((node, x0, y0, x1, y1) => {
        if (!node.length) {
            do {
                const d = node.data;
                if (d.x >= queryRect.x && d.x <= queryRect.right && d.y >= queryRect.y && d.y <= queryRect.bottom) {
                    d3Results.push(d);
                }
            } while (node = node.next);
        }
        return x0 > queryRect.right || x1 < queryRect.x || y0 > queryRect.bottom || y1 < queryRect.y;
    });
    const d3QueryEndTime = performance.now();
    console.log(`d3-quadtree查询时间: ${(d3QueryEndTime - d3QueryStartTime).toFixed(2)} 毫秒`);
    console.log(`d3-quadtree查询结果数量: ${d3Results.length}`);

    // 正确性校验
    const isD3Correct = results.length === d3Results.length && results.every(r => 
        d3Results.some(er => 
            r.x === er.x && r.y === er.y && r.width === er.width && r.height === er.height
        )
    );

    console.log(`d3-quadtree查询结果正确性: ${isD3Correct ? '正确' : '错误'}`);
}