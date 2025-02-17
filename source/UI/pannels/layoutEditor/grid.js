// 创建网格生成器
import { FundamentalDomain,Lattice,PatternDefinition  } from "../../../utils/image/textures/pattern/index.js";
import { Vector2 } from "../../../utils/image/textures/pattern/index.js";
export function createGridPattern(gridSize, lineWidth, lineColor, opacity) {
    // 1. 创建基本晶格
    const basis1 = new Vector2(gridSize, 0);
    const basis2 = new Vector2(0, gridSize);
    console.log('basis1:', basis1); // 检查 basis1 是否为 Vector2 实例
    console.log('basis1.length:', typeof basis1.length); // 检查 length 方法是否存在
    
    const lattice = new Lattice(basis1, basis2);
    console.log('lattice:', lattice); // 检查晶格对象
    console.log('lattice.basis1:', lattice.basis1); // 检查晶格的 basis1


  // 2. 创建基本区域 - 一个简单的正方形网格单元
  const fundamentalDomain = new FundamentalDomain();
  fundamentalDomain.addPolygon([
    new Vector2(0, 0),
    new Vector2(gridSize, 0),
    new Vector2(gridSize, gridSize),
    new Vector2(0, gridSize)
  ], {
    lineWidth,
    lineColor,
    opacity
  });

  
  // 4. 创建图案定义
  const patternDef = new PatternDefinition();
  patternDef.setLattice(basis1,basis2);
  patternDef.setFundamentalDomain(fundamentalDomain);
  patternDef.setWallpaperGroup('pmg');
  
  return patternDef;
}

