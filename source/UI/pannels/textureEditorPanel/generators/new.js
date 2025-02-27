export const generateGroup = () => {
    return {
        
        // 晶格系统 - 定义平面图案的周期性重复结构
        latticeSystem: {
            type: 'rectangular',
            // 定义晶格的基础向量，决定了图案如何在平面重复
            vectors: [
                {
                    id: 'lattice-vector-1',
                    vector: { x: 1, y: 0 },  // 水平方向的单位向量
                    label: '晶格向量1'
                },
                {
                    id: 'lattice-vector-2',
                    vector: { x: 0, y: 1 },  // 垂直方向的单位向量
                    label: '晶格向量2'
                }
            ],
            // 无缝单元 - 定义整个图案的重复单元
            seamlessUnit: {
                id: 'seamless-unit',
                width: 1,
                height: 1,
                center: { x: 0, y: 0 },  // 单元中心位于原点
                // 无缝单元的四个顶点，形成一个正方形
                vertices: [
                    { x: -0.5, y: -0.5 },  // 左下角
                    { x: 0.5, y: -0.5 },   // 右下角
                    { x: 0.5, y: 0.5 },    // 右上角
                    { x: -0.5, y: 0.5 }    // 左上角
                ]
            }
        },
        
        baseUnits: [
            {
                id: 'baseUnit-1',
                // 参考基础单元 - 恒等变换(Identity)
                center: { x: -0.25, y: -0.25 },  // 相对于原点，位于第三象限
                yAxis: { x: 0, y: 1 },         // 标准Y轴方向
                coordinateSystem: 'right-handed',  // 标准右手坐标系
                shape: {
                    type: 'rectangle',
                    width: 0.5,
                    height: 0.5
                }
            },
            {
                id: 'baseUnit-2',
                // 垂直反射变换(Vertical Reflection)
                // 相对于x=0的垂直线进行镜像
                center: { x: 0.25, y: -0.25 },  // 相对于原点，位于第四象限
                yAxis: { x: 0, y: 1 },         // Y轴方向保持不变
                coordinateSystem: 'left-handed',  // 反射导致坐标系从右手变为左手
                shape: {
                    type: 'rectangle',
                    width: 0.5,
                    height: 0.5
                }
            },
            {
                id: 'baseUnit-3',
                // 180°旋转变换(180° Rotation)
                // 相对于原点(0,0)旋转180度
                center: { x: 0.25, y: 0.25 },  // 相对于原点，位于第一象限
                yAxis: { x: 0, y: -1 },        // Y轴方向旋转180°后反向
                coordinateSystem: 'right-handed',  // 旋转不改变坐标系手性
                shape: {
                    type: 'rectangle',
                    width: 0.5,
                    height: 0.5
                }
            },
            {
                id: 'baseUnit-4',
                // 水平反射变换(Horizontal Reflection)
                // 相对于y=0的水平线进行镜像
                center: { x: -0.25, y: 0.25 },  // 相对于原点，位于第二象限
                yAxis: { x: 0, y: -1 },        // Y轴方向反转
                coordinateSystem: 'left-handed',  // 反射导致坐标系从右手变为左手
                shape: {
                    type: 'rectangle',
                    width: 0.5,
                    height: 0.5
                }
            }
        ]
    };
};