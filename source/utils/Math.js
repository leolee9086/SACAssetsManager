import * as d3 from "../../static/d3-quadtree.js";
class Rectangle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.right = x + width;
        this.bottom = y + height;
    }

    intersects(rect) {
        return !(this.right < rect.x || this.bottom < rect.y || this.x > rect.right || this.y > rect.bottom);
    }
}



class Node {
    constructor(rectangle) {
        this.rectangle = rectangle;
        this.children = [];
        this.isLeaf = true;
    }

    insert(rect) {
        if (!this.rectangle.intersects(rect)) {
            return false;
        }

        if (this.isLeaf) {
            if (this.children.length < 4) {
                this.children.push(new Node(rect));
                return true;
            } else {
                this.subdivide();
            }
        }

        for (let child of this.children) {
            if (child.insert(rect)) {
                return true;
            }
        }

        return false;
    }

    subdivide() {
        const midX = (this.rectangle.x + this.rectangle.right) / 2;
        const midY = (this.rectangle.y + this.rectangle.bottom) / 2;

        const child1 = new Rectangle(this.rectangle.x, this.rectangle.y, midX - this.rectangle.x, midY - this.rectangle.y);
        const child2 = new Rectangle(midX, this.rectangle.y, this.rectangle.right - midX, midY - this.rectangle.y);
        const child3 = new Rectangle(this.rectangle.x, midY, midX - this.rectangle.x, this.rectangle.bottom - midY);
        const child4 = new Rectangle(midX, midY, this.rectangle.right - midX, this.rectangle.bottom - midY);

        this.children = [
            new Node(child1),
            new Node(child2),
            new Node(child3),
            new Node(child4)
        ];

        this.isLeaf = false;

        // Re-insert existing children into the new children
        for (let child of this.children) {
            for (let existingChild of this.children) {
                if (existingChild.insert(child.rectangle)) {
                    break;
                }
            }
        }
    }

    query(rect, results = []) {
        const stack = [this];

        while (stack.length > 0) {
            const node = stack.pop();

            if (node.rectangle.intersects(rect)) {
                if (node.isLeaf) {
                    for (let child of node.children) {
                        if (child.rectangle.intersects(rect)) {
                            results.push(child);
                        }
                    }
                } else {
                    stack.push(...node.children.filter(child => child.rectangle.intersects(rect)));
                }
            }
        }

        return results;
    }
}
// 生成随机矩形
function generateRandomRectangles(num, maxWidth, maxHeight) {
    const rectangles = [];
    for (let i = 0; i < num; i++) {
        const x = Math.random() * maxWidth;
        const y = Math.random() * maxHeight;
        const width = Math.random() * (maxWidth - x);
        const height = Math.random() * (maxHeight - y);
        rectangles.push(new Rectangle(x, y, width, height));
    }
    return rectangles;
}
// 测试四叉树
const boundary = new Rectangle(0, 0, 1000, 1000);
const quadtree = new Node(boundary);
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