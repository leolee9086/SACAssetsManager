export const generatePGGGroup = () => {
    return {
        // 群的基本信息
        groupInfo: {
            type: 'pgg',
            name: 'PGG群',
            description: '具有平移、180°旋转和滑移反射对称性的平面群',
            symmetryElements: ['translation', 'rotation2', 'glideReflection']
        },
        
        // 晶格系统
        latticeSystem: {
            type: 'rectangular',
            vectors: [
                {
                    id: 'lattice-vector-1',
                    vector: { x: 1, y: 0 },
                    label: '晶格向量1'
                },
                {
                    id: 'lattice-vector-2',
                    vector: { x: 0, y: 1 },
                    label: '晶格向量2'
                }
            ],
            // 无缝单元
            seamlessUnit: {
                id: 'seamless-unit',
                width: 1,
                height: 1,
                center: { x: 0, y: 0 },
                vertices: [
                    { x: -0.5, y: -0.5 },
                    { x: 0.5, y: -0.5 },
                    { x: 0.5, y: 0.5 },
                    { x: -0.5, y: 0.5 }
                ]
            }
        },
        
        // 对称元素
        symmetryElements: {
            // 2次旋转中心
            rotationCenters: [
                { x: 0.25, y: 0.25, order: 2 },
                { x: 0.75, y: 0.25, order: 2 },
                { x: 0.25, y: 0.75, order: 2 },
                { x: 0.75, y: 0.75, order: 2 }
            ],
            // 滑移反射轴
            glideReflectionAxes: [
                { 
                    startPoint: { x: 0, y: 0.5 },
                    endPoint: { x: 1, y: 0.5 },
                    direction: 'horizontal'
                },
                { 
                    startPoint: { x: 0.5, y: 0 },
                    endPoint: { x: 0.5, y: 1 },
                    direction: 'vertical'
                }
            ]
        },
        
        // 基础单元 - 简化版
        baseUnits: [
            {
                id: 'baseUnit-1',
                // 单元中心相对原点的位置
                center: { x: 0.25, y: 0.25 },
                // 内部Y轴方向，归一化的向量
                yAxis: { x: 0, y: 1 },
                // 坐标系类型：右手坐标系
                coordinateSystem: 'right-handed',
                // 用于辅助描述的基础形状（选填）
                shape: {
                    type: 'rectangle',
                    width: 0.5,
                    height: 0.5
                }
            },
            {
                id: 'baseUnit-2',
                // 垂直滑移反射：中心位置变化，坐标系翻转
                center: { x: 0.75, y: 0.25 },
                yAxis: { x: 0, y: 1 },
                coordinateSystem: 'left-handed',  // 反射后坐标系翻转
                shape: {
                    type: 'rectangle',
                    width: 0.5,
                    height: 0.5
                }
            },
            {
                id: 'baseUnit-3',
                // 180°旋转：中心位置变化，Y轴方向反转
                center: { x: 0.75, y: 0.75 },
                yAxis: { x: 0, y: -1 },  // 旋转180°后Y轴方向反转
                coordinateSystem: 'right-handed',
                shape: {
                    type: 'rectangle',
                    width: 0.5,
                    height: 0.5
                }
            },
            {
                id: 'baseUnit-4',
                // 水平滑移反射：中心位置变化，Y轴方向反转，坐标系翻转
                center: { x: 0.25, y: 0.75 },
                yAxis: { x: 0, y: -1 },  // Y轴方向反转
                coordinateSystem: 'left-handed',  // 反射后坐标系翻转
                shape: {
                    type: 'rectangle',
                    width: 0.5,
                    height: 0.5
                }
            }
        ]
    };
};