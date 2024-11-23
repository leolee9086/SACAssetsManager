import { 
    PatternDefinition,
    PatternRenderer,
    Vector2,
    FundamentalDomain,
    Transform2D,
    PatternUtils
} from "./pattern/index.js";

// 创建基本图形集合
function createTestMotifs() {
    return [
        // 测试用例1: 适合PMG群的L形
        {
            vertices: [
                new Vector2(0, 0),
                new Vector2(0.2, 0),
                new Vector2(0.2, 0.3),
                new Vector2(0.1, 0.3),
                new Vector2(0.1, 0.4),
                new Vector2(0, 0.4)
            ],
            properties: {
                id: 'L1',
                fillColor: '#808080',
                label: 'A'
            }
        },
        // 测试用例2: 细长L形
        {
            vertices: [
                new Vector2(0, 0),
                new Vector2(0.3, 0),
                new Vector2(0.3, 0.6),
                new Vector2(0.1, 0.6),
                new Vector2(0.1, 1.0),
                new Vector2(0, 1.0)
            ],
            properties: {
                id: 'L2',
                fillColor: '#A0A0A0',
                label: 'B'
            }
        },
        // 测试用例3: 不对称L形
        {
            vertices: [
                new Vector2(0, 0),
                new Vector2(0.5, 0),
                new Vector2(0.5, 0.3),
                new Vector2(0.2, 0.3),
                new Vector2(0.2, 0.7),
                new Vector2(0, 0.7)
            ],
            properties: {
                id: 'L3',
                fillColor: '#606060',
                label: 'C'
            }
        }
    ];
}

// 生成PMG图案
async function testPMGPatterns() {
    const testResults = [];
    const motifs = createTestMotifs();
    
    for (const motif of motifs) {
        try {
            const pattern = new PatternDefinition();
            const bounds = PatternUtils.calculateMotifBounds(motif.vertices);
            
            // 1. 调整基本单元格大小计算
            const baseUnit = Math.max(bounds.width, bounds.height);
            // 增加单元格大小以留出更多空间
            const cellWidth = Math.ceil(baseUnit * 3.0 * 1e6) / 1e6;  // 从2.2改为3.0
            const cellHeight = Math.ceil(baseUnit * 3.0 * 1e6) / 1e6;
            
            pattern.setLattice(
                new Vector2(cellWidth, 0),
                new Vector2(0, cellHeight)
            );
            
            // 2. 调整基本图形的位置
            const domain = new FundamentalDomain();
            const adjustedVertices = motif.vertices.map(v => {
                const relX = (v.x - bounds.minX) / baseUnit;
                const relY = (v.y - bounds.minY) / baseUnit;
                
                return new Vector2(
                    Math.round(relX * cellWidth * 0.25 * 1e6) / 1e6,  // 从0.2改为0.25
                    Math.round(relY * cellHeight * 0.25 * 1e6) / 1e6
                );
            });
            
            // 3. 调整变换原点
            domain.addPolygon(adjustedVertices, {
                ...motif.properties,
                transformOrigin: new Vector2(cellWidth/4, cellHeight/4)  // 调整变换原点
            });
            
            pattern.setFundamentalDomain(domain);
            pattern.setWallpaperGroup('pmg');
            
            // 4. 调整显示范围
            const gridUnits = 3;  // 从4改为3以获得更好的视觉效果
            const displayBounds = {
                min: new Vector2(
                    -gridUnits * cellWidth / 2,
                    -gridUnits * cellHeight / 2
                ),
                max: new Vector2(
                    gridUnits * cellWidth / 2,
                    gridUnits * cellHeight / 2
                )
            };
            
            // 5. 扩展生成范围
            const generatedPattern = pattern.generate({
                min: new Vector2(
                    displayBounds.min.x - cellWidth * 0.5,
                    displayBounds.min.y - cellHeight * 0.5
                ),
                max: new Vector2(
                    displayBounds.max.x + cellWidth * 0.5,
                    displayBounds.max.y + cellHeight * 0.5
                )
            });
            
            const renderer = new PatternRenderer(400, 400);
            
            // 6. 调整视口缩放
            const viewportScale = Math.min(
                renderer.width / ((gridUnits + 1) * cellWidth),
                renderer.height / ((gridUnits + 1) * cellHeight)
            );
            
            // 7. 调整渲染选项
            const blobURL = await renderer.renderToBlobURL(generatedPattern, {
                backgroundColor: '#ffffff',
                strokeColor: '#000000',
                defaultFillColor: motif.properties.fillColor,
                lineWidth: 1/viewportScale,
                scale: viewportScale,
                showLabels: true,
                fontSize: 12/viewportScale,
                showGrid: true,
                gridColor: '#cccccc',
                showSymmetryMarkers: true,
                viewport: displayBounds,
                symmetryOptions: {
                    mirrorLineColor: 'rgba(255, 0, 0, 0.8)',
                    glideLineColor: 'rgba(0, 255, 0, 0.8)',
                    rotationCenterColor: 'rgba(0, 0, 255, 0.8)',
                    markerSize: Math.min(cellWidth, cellHeight) * 0.15,  // 增加标记大小
                    lineWidth: 1.5/viewportScale,  // 增加线宽
                    showLabels: true,
                    fontSize: 14/viewportScale,  // 增加字体大小
                    dashLength: 8/viewportScale,  // 调整虚线长度
                    gapLength: 4/viewportScale,
                    opacity: 0.8
                },
                gridOptions: {
                    showHorizontalLines: true,
                    showVerticalLines: true,
                    dashLength: 0,
                    gapLength: 0,
                    opacity: 0.3,
                    lineWidth: 0.5/viewportScale
                }
            });
            
            testResults.push({ id: motif.properties.id, success: true, blobURL });
        } catch (error) {
            console.error(`测试 ${motif.properties.id} 失败:`, error);
            testResults.push({
                id: motif.properties.id,
                success: false,
                error: error.message
            });
        }
    }
    
    return testResults;
}

// 显示测试结果
async function displayTestResults() {
    try {
        const results = await testPMGPatterns();
        
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.gap = '20px';
        container.style.padding = '20px';
        
        for (const result of results) {
            const resultDiv = document.createElement('div');
            resultDiv.style.textAlign = 'center';
            
            if (result.success) {
                const img = document.createElement('img');
                img.src = result.blobURL;
                img.style.width = '800px';
                img.style.height = '600px';
                img.style.border = '1px solid #ccc';
                img.onload = () => URL.revokeObjectURL(result.blobURL);
                
                const label = document.createElement('div');
                label.textContent = `测试 ${result.id}`;
                label.style.marginTop = '10px';
                
                resultDiv.appendChild(img);
                resultDiv.appendChild(label);
            } else {
                resultDiv.textContent = `测试 ${result.id} 失败: ${result.error}`;
                resultDiv.style.color = 'red';
            }
            
            container.appendChild(resultDiv);
        }
        
        document.body.appendChild(container);
    } catch (error) {
        console.error('显示测试结果失败:', error);
    }
}

// 运行测试
displayTestResults();

