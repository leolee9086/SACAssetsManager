const $黄金比 = (1 + Math.sqrt(5)) / 2;     // ≈ 1.618033988749895
const $黄金比倒数 = 1 / $黄金比;            // ≈ 0.618033988749895
const $三十六度弧度 = Math.PI / 5;          // 36度对应的弧度
const $十边形顶点数 = 10;                   // 十边形的顶点数
const $十边形角度数组 = Array.from(         // 预计算十边形的所有角度
    { length: $十边形顶点数 }, 
    (_, i) => i * $三十六度弧度
);

// 添加工具函数
const 工具 = {
    限制精度: (数值, 位数 = 6) => Number(数值.toFixed(位数)),
    验证点: (点) => 点 && typeof 点.x === 'number' && typeof 点.y === 'number',
    深度克隆点: (点) => ({ x: 点.x, y: 点.y })
};

// 瓦片对象池
class 瓦片池 {
    constructor() {
        this.池 = [];
    }

    获取瓦片() {
        return this.池.pop() || {};
    }

    归还瓦片(瓦片) {
        瓦片.顶点 = null;
        瓦片.类型 = null;
        this.池.push(瓦片);
    }
}

export class 彭罗斯图案P1 {
    constructor(配置 = {}) {
        this.验证配置(配置);
        
        this.配置 = {
            迭代次数: 配置.iterations || 4,
            尺寸: 配置.size || 100,
            中心点: this.验证并克隆中心点(配置.center),
            渲染: {
                描边样式: 配置.render?.strokeStyle || '#000000',
                填充样式: 配置.render?.fillStyle || '#ffffff',
                瓦片颜色: {
                    箭头: 配置.render?.tileColors?.dart || '#ff9999',
                    风筝: 配置.render?.tileColors?.kite || '#99ff99'
                }
            }
        };

        this.瓦片组 = [];
        this.已初始化 = false;
        this._视口中心 = null;
        this._瓦片池 = new 瓦片池();
        this._渲染缓存 = new Map(); // 用于批量渲染
    }

    验证配置(配置) {
        if (配置.iterations !== undefined && (配置.iterations < 0 || !Number.isInteger(配置.iterations))) {
            throw new Error('迭代次数必须是非负整数');
        }
        if (配置.size !== undefined && 配置.size <= 0) {
            throw new Error('尺寸必须大于0');
        }
    }

    验证并克隆中心点(中心点) {
        if (!中心点) return { x: 0, y: 0 };
        if (!工具.验证点(中心点)) {
            throw new Error('中心点必须包含有效的x和y坐标');
        }
        return 工具.深度克隆点(中心点);
    }

    render(ctx, viewport) {
        if (!ctx || !viewport) {
            throw new Error('缺少必要的渲染参数');
        }

        if (!this.已初始化) {
            this.初始化();
        }

        this._视口中心 = {
            x: viewport.width / 2,
            y: viewport.height / 2
        };

        // 清空渲染缓存
        this._渲染缓存.clear();
        
        ctx.save();
        try {
            // 坐标系转换
            ctx.translate(
                this._视口中心.x + this.配置.中心点.x,
                this._视口中心.y + this.配置.中心点.y
            );

            // 按类型分组瓦片
            for (const 瓦片 of this.瓦片组) {
                const 缓存键 = 瓦片.类型;
                if (!this._渲染缓存.has(缓存键)) {
                    this._渲染缓存.set(缓存键, []);
                }
                this._渲染缓存.get(缓存键).push(瓦片);
            }

            // 批量渲染相同类型的瓦片
            for (const [类型, 瓦片组] of this._渲染缓存) {
                ctx.beginPath();
                for (const 瓦片 of 瓦片组) {
                    this.添加瓦片路径(ctx, 瓦片);
                }
                ctx.fillStyle = 类型 === '箭头' 
                    ? this.配置.渲染.瓦片颜色.箭头 
                    : this.配置.渲染.瓦片颜色.风筝;
                ctx.fill();
                ctx.strokeStyle = this.配置.渲染.描边样式;
                ctx.stroke();
            }
        } finally {
            ctx.restore();
        }
    }

    添加瓦片路径(ctx, 瓦片) {
        const 顶点组 = 瓦片.顶点;
        ctx.moveTo(顶点组[0].x, 顶点组[0].y);
        for (let i = 1; i < 顶点组.length; i++) {
            ctx.lineTo(顶点组[i].x, 顶点组[i].y);
        }
        ctx.closePath();
    }

    细分瓦片() {
        const 新瓦片组 = [];
        for (const 瓦片 of this.瓦片组) {
            const 细分结果 = 瓦片.类型 === '箭头' 
                ? this.细分箭头(瓦片)
                : this.细分风筝(瓦片);
            新瓦片组.push(...细分结果);
            this._瓦片池.归还瓦片(瓦片);
        }
        this.瓦片组 = 新瓦片组;
    }

    获取黄金分割点(点1, 点2) {
        return {
            x: 工具.限制精度(点1.x + (点2.x - 点1.x) * $黄金比倒数),
            y: 工具.限制精度(点1.y + (点2.y - 点1.y) * $黄金比倒数)
        };
    }

    创建瓦片(类型, 顶点) {
        const 瓦片 = this._瓦片池.获取瓦片();
        瓦片.类型 = 类型;
        瓦片.顶点 = 顶点.map(工具.深度克隆点);
        return 瓦片;
    }

    destroy() {
        // 清理所有资源
        for (const 瓦片 of this.瓦片组) {
            this._瓦片池.归还瓦片(瓦片);
        }
        this.瓦片组 = [];
        this.已初始化 = false;
        this._视口中心 = null;
        this._渲染缓存.clear();
    }

    初始化() {
        this.创建初始瓦片();
        for (let i = 0; i < this.配置.迭代次数; i++) {
            this.细分瓦片();
        }
        this.已初始化 = true;
    }

    创建初始瓦片() {
        const 尺寸 = this.配置.尺寸;
        const 中心点 = this.配置.中心点;
        
        const 十边形顶点 = $十边形角度数组.map(角度 => ({
            x: 中心点.x + 尺寸 * Math.cos(角度),
            y: 中心点.y + 尺寸 * Math.sin(角度)
        }));
        
        this.瓦片组 = [];
        for (let i = 0; i < $十边形顶点数; i += 2) {
            this.瓦片组.push({
                类型: '箭头',
                顶点: [
                    十边形顶点[i],
                    十边形顶点[(i + 1) % $十边形顶点数],
                    中心点,
                    十边形顶点[(i + 2) % $十边形顶点数]
                ]
            });
        }
    }

    细分箭头(瓦片) {
        const [A, B, C, D] = 瓦片.顶点;
        const P = this.获取黄金分割点(A, C);
        const Q = this.获取黄金分割点(B, C);
        
        return [
            { 类型: '风筝', 顶点: [P, A, Q, C] },
            { 类型: '箭头', 顶点: [Q, B, D, P] }
        ];
    }

    细分风筝(瓦片) {
        const [A, B, C, D] = 瓦片.顶点;
        const P = this.获取黄金分割点(B, A);
        const Q = this.获取黄金分割点(D, A);
        
        return [
            { 类型: '箭头', 顶点: [P, B, C, Q] },
            { 类型: '风筝', 顶点: [A, P, Q, D] }
        ];
    }
}
