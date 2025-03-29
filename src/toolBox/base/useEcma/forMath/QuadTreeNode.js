/**
 * @fileoverview 四叉树实现
 */

import { Rectangle } from './Rectangle.js';

/**
 * 四叉树节点类，用于二维空间中的高效区域查询
 */
export class QuadTreeNode {
    /**
     * 创建四叉树节点
     * @param {Rectangle} rectangle 当前节点边界区域
     */
    constructor(rectangle) {
        this.rectangle = rectangle;
        this.children = [];
        this.isLeaf = true;
    }

    /**
     * 插入一个矩形到四叉树中
     * @param {Rectangle} rect 需要插入的矩形
     * @returns {boolean} 如果插入成功返回true，否则返回false
     */
    insert(rect) {
        if (!this.rectangle.intersects(rect)) {
            return false;
        }

        if (this.isLeaf) {
            if (this.children.length < 4) {
                this.children.push(new QuadTreeNode(rect));
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

    /**
     * 将当前节点细分为四个子节点
     */
    subdivide() {
        const midX = (this.rectangle.x + this.rectangle.right) / 2;
        const midY = (this.rectangle.y + this.rectangle.bottom) / 2;

        const child1 = new Rectangle(this.rectangle.x, this.rectangle.y, midX - this.rectangle.x, midY - this.rectangle.y);
        const child2 = new Rectangle(midX, this.rectangle.y, this.rectangle.right - midX, midY - this.rectangle.y);
        const child3 = new Rectangle(this.rectangle.x, midY, midX - this.rectangle.x, this.rectangle.bottom - midY);
        const child4 = new Rectangle(midX, midY, this.rectangle.right - midX, this.rectangle.bottom - midY);

        this.children = [
            new QuadTreeNode(child1),
            new QuadTreeNode(child2),
            new QuadTreeNode(child3),
            new QuadTreeNode(child4)
        ];

        this.isLeaf = false;

        // 重新插入现有子节点到新的子节点中
        for (let child of this.children) {
            for (let existingChild of this.children) {
                if (existingChild.insert(child.rectangle)) {
                    break;
                }
            }
        }
    }

    /**
     * 查询与给定矩形相交的所有矩形
     * @param {Rectangle} rect 查询区域
     * @param {Array} results 结果数组，用于存储查询结果
     * @returns {Array} 结果数组
     */
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