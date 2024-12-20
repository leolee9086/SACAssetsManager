import { PatternRenderer } from '../../../utils/image/textures.js/pattern/index.js'
import { P1ImagePattern } from '../../../utils/image/textures.js/pattern/p1Image.js';
import { P2ImagePattern } from '../../../utils/image/textures.js/pattern/p2Image.js'
import { PGImagePattern } from '../../../utils/image/textures.js/pattern/pgImage.js';
import { PMImagePattern } from '../../../utils/image/textures.js/pattern/pmImage.js'
import { PGGImagePattern } from '../../../utils/image/textures.js/pattern/pggImage.js'
import {
    P4GImagePattern,
    PMMImagePattern,
    PMGImagePattern,
    CMImagePattern,
    CMMImagePattern,
    P4ImagePattern,
    P4MImagePattern,
    P3ImagePattern,
    P3M1ImagePattern,
    P6ImagePattern,
    P6MImagePattern,
    P31MImagePattern
} from '../../../utils/image/textures.js/pattern/pmm.js'
export {PatternRenderer}
export const getPatternClass = (type) => {
    const patterns = {
        p1: P1ImagePattern,
        p2: P2ImagePattern,
        pg: PGImagePattern,
        pm: PMImagePattern,
        pgg: PGGImagePattern,
        pmm: PMMImagePattern,
        pmg: PMGImagePattern,
        p4: P4ImagePattern,
        p4m: P4MImagePattern,
        p4g: P4GImagePattern,
        cm: CMImagePattern,
        cmm: CMMImagePattern,
        p3: P3ImagePattern,
        p3m1: P3M1ImagePattern,
        p31m: P31MImagePattern,
        p6: P6ImagePattern,
        p6m: P6MImagePattern
    }
    return patterns[type]
}
// 添加基向量约束配置
export const symmetryConstraints = {
    p1: {
      name: "P1 - 基本平移",
      description: "无特殊限制",
      constraints: "自由",
      validateBasis: (b1, b2) => true,
      normalizeBasis: (b1, b2) => ({ basis1: b1, basis2: b2 })
    },
    p2: {
      name: "P2 - 2次旋转",
      description: "无特殊限制",
      constraints: "自由",
      validateBasis: (b1, b2) => true,
      normalizeBasis: (b1, b2) => ({ basis1: b1, basis2: b2 })
    },
    pg: {
      name: "PG - 滑移",
      description: "无特殊限制",
      constraints: "自由",
      validateBasis: (b1, b2) => true,
      normalizeBasis: (b1, b2) => ({ basis1: b1, basis2: b2 })
    },
    pm: {
      name: "PM - 镜像",
      description: "建议基向量垂直于镜面",
      constraints: "自由",
      validateBasis: (b1, b2) => true,
      normalizeBasis: (b1, b2) => ({ basis1: b1, basis2: b2 })
    },
    pgg: {
      name: "PGG - 双滑移",
      description: "无特殊限制",
      constraints: "自由",
      validateBasis: (b1, b2) => true,
      normalizeBasis: (b1, b2) => ({ basis1: b1, basis2: b2 })
    },
    pmm: {
      name: "PMM - 双向镜像",
      description: "建议基向量相互垂直",
      constraints: "矩形",
      validateBasis: (b1, b2) => {
        const dotProduct = b1.x * b2.x + b1.y * b2.y;
        return Math.abs(dotProduct) < 0.001;
      },
      normalizeBasis: (b1, b2) => {
        const len1 = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        const len2 = Math.sqrt(b2.x * b2.x + b2.y * b2.y);
        return {
          basis1: { x: len1, y: 0 },
          basis2: { x: 0, y: len2 }
        };
      }
    },
    pmg: {
      name: "PMG - 镜像+滑移",
      description: "建议基向量垂直于镜面",
      constraints: "自由",
      validateBasis: (b1, b2) => true,
      normalizeBasis: (b1, b2) => ({ basis1: b1, basis2: b2 })
    },
    p4: {
      name: "P4 - 4次旋转",
      description: "要求基向量正交且长度相等",
      constraints: "正方形",
      validateBasis: (b1, b2) => {
        const dotProduct = b1.x * b2.x + b1.y * b2.y;
        const len1 = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        const len2 = Math.sqrt(b2.x * b2.x + b2.y * b2.y);
        return Math.abs(dotProduct) < 0.001 && Math.abs(len1 - len2) < 0.001;
      },
      normalizeBasis: (b1, b2) => {
        const len = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        return {
          basis1: { x: len, y: 0 },
          basis2: { x: 0, y: len }
        };
      }
    },
    p4m: {
      name: "P4M - 4次旋转+镜像",
      description: "要求基向量正交且长度相等",
      constraints: "正方形",
      validateBasis: (b1, b2) => {
        const dotProduct = b1.x * b2.x + b1.y * b2.y;
        const len1 = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        const len2 = Math.sqrt(b2.x * b2.x + b2.y * b2.y);
        return Math.abs(dotProduct) < 0.001 && Math.abs(len1 - len2) < 0.001;
      },
      normalizeBasis: (b1, b2) => {
        const len = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        return {
          basis1: { x: len, y: 0 },
          basis2: { x: 0, y: len }
        };
      }
    },
    p4g: {
      name: "P4G - 4次旋转+镜像(变体)",
      description: "要求基向量正交且长度相等",
      constraints: "正方形",
      validateBasis: (b1, b2) => {
        const dotProduct = b1.x * b2.x + b1.y * b2.y;
        const len1 = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        const len2 = Math.sqrt(b2.x * b2.x + b2.y * b2.y);
        return Math.abs(dotProduct) < 0.001 && Math.abs(len1 - len2) < 0.001;
      },
      normalizeBasis: (b1, b2) => {
        const len = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        return {
          basis1: { x: len, y: 0 },
          basis2: { x: 0, y: len }
        };
      }
    },
    cm: {
      name: "CM - 菱形中心镜像",
      description: "要求基向量等长",
      constraints: "菱形",
      validateBasis: (b1, b2) => {
        const len1 = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        const len2 = Math.sqrt(b2.x * b2.x + b2.y * b2.y);
        return Math.abs(len1 - len2) < 0.001;
      },
      normalizeBasis: (b1, b2) => {
        const len = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        const angle = Math.atan2(b2.y, b2.x);
        return {
          basis1: { x: len, y: 0 },
          basis2: { x: len * Math.cos(angle), y: len * Math.sin(angle) }
        };
      }
    },
    cmm: {
      name: "CMM - 菱形双向镜像",
      description: "要求基向量等长",
      constraints: "菱形",
      validateBasis: (b1, b2) => {
        const len1 = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        const len2 = Math.sqrt(b2.x * b2.x + b2.y * b2.y);
        return Math.abs(len1 - len2) < 0.001;
      },
      normalizeBasis: (b1, b2) => {
        const len = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        const angle = Math.atan2(b2.y, b2.x);
        return {
          basis1: { x: len, y: 0 },
          basis2: { x: len * Math.cos(angle), y: len * Math.sin(angle) }
        };
      }
    },
    p3: {
      name: "P3 - 3次旋转",
      description: "基向量等长且夹角120°",
      constraints: "六角形",
      validateBasis: (b1, b2) => {
        const len1 = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        const len2 = Math.sqrt(b2.x * b2.x + b2.y * b2.y);
        
        // 计算夹角
        const dotProduct = b1.x * b2.x + b1.y * b2.y;
        const cosAngle = dotProduct / (len1 * len2);
        const expectedCos = -0.5; // cos(120°)
        
        // 允许一定的误差范围
        const tolerance = 0.01;
        return (
          Math.abs(len1 - len2) < tolerance && 
          Math.abs(cosAngle - expectedCos) < tolerance
        );
      },
      normalizeBasis: (b1, b2) => {
        const size = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        return {
          basis1: { x: size, y: 0 },
          basis2: { x: -size/2, y: size * Math.sqrt(3)/2 }
        };
      }
    },
    p3m1: {
      name: "P3M1 - 3次旋转+镜像",
      description: "基向量等长且夹角120°",
      constraints: "六角形",
      validateBasis: (b1, b2) => {
        const len1 = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        const len2 = Math.sqrt(b2.x * b2.x + b2.y * b2.y);
        
        // 计算夹角
        const dotProduct = b1.x * b2.x + b1.y * b2.y;
        const cosAngle = dotProduct / (len1 * len2);
        const expectedCos = -0.5; // cos(120°)
        
        // 允许一定的误差范围
        const tolerance = 0.01;
        return (
          Math.abs(len1 - len2) < tolerance && 
          Math.abs(cosAngle - expectedCos) < tolerance
        );
      },
      normalizeBasis: (b1, b2) => {
        const size = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        return {
          basis1: { x: size, y: 0 },
          basis2: { x: -size/2, y: size * Math.sqrt(3)/2 }
        };
      }
    },
    p6: {
      name: "P6 - 6次旋转",
      description: "基向量等长且夹角120度",
      constraints: "六角形",
      validateBasis: (b1, b2) => {
        const len1 = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        const len2 = Math.sqrt(b2.x * b2.x + b2.y * b2.y);
        
        // 计算夹角
        const dotProduct = b1.x * b2.x + b1.y * b2.y;
        const cosAngle = dotProduct / (len1 * len2);
        const expectedCos = -0.5; // cos(120°)
        
        // 允许一定的误差范围
        const tolerance = 0.01;
        return (
          Math.abs(len1 - len2) < tolerance && 
          Math.abs(cosAngle - expectedCos) < tolerance
        );
      },
      normalizeBasis: (b1, b2) => {
        const size = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        return {
          basis1: { x: size, y: 0 },
          basis2: { x: -size/2, y: size * Math.sqrt(3)/2 }
        };
      }
    },
    p6m: {
      name: "P6M - 6次旋转+镜像",
      description: "基向量等长且夹角120度",
      constraints: "六角形",
      validateBasis: (b1, b2) => {
        const len1 = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        const len2 = Math.sqrt(b2.x * b2.x + b2.y * b2.y);
        
        // 计算夹角
        const dotProduct = b1.x * b2.x + b1.y * b2.y;
        const cosAngle = dotProduct / (len1 * len2);
        const expectedCos = -0.5; // cos(120°)
        
        // 允许一定的误差范围
        const tolerance = 0.01;
        return (
          Math.abs(len1 - len2) < tolerance && 
          Math.abs(cosAngle - expectedCos) < tolerance
        );
      },
      normalizeBasis: (b1, b2) => {
        const size = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        return {
          basis1: { x: size, y: 0 },
          basis2: { x: -size/2, y: size * Math.sqrt(3)/2 }
        };
      }
    },
    p31m: {
      name: "P31M - 三重旋转+镜像",
      description: "基向量等长且夹角120度",
      constraints: "六角形",
      validateBasis: (b1, b2) => {
        const len1 = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        const len2 = Math.sqrt(b2.x * b2.x + b2.y * b2.y);
        
        // 计算夹角
        const dotProduct = b1.x * b2.x + b1.y * b2.y;
        const cosAngle = dotProduct / (len1 * len2);
        const expectedCos = -0.5; // cos(120°)
        
        // 允许一定的误差范围
        const tolerance = 0.01;
        return (
          Math.abs(len1 - len2) < tolerance && 
          Math.abs(cosAngle - expectedCos) < tolerance
        );
      },
      normalizeBasis: (b1, b2) => {
        const size = Math.sqrt(b1.x * b1.x + b1.y * b1.y);
        return {
          basis1: { x: size, y: 0 },
          basis2: { x: -size/2, y: size * Math.sqrt(3)/2 }
        };
      }
    }
  };
  



  import { 生成晶格设置, 生成图片绘制设置, 生成图案渲染配置 } from './patternState.js';

/**
 * 创建对称图案实例
 * @param {Object} config 配置参数
 * @param {string} config.symmetryType 对称类型
 * @param {Object} config.basis1 基向量1
 * @param {Object} config.basis2 基向量2
 * @param {string} config.processedNodeImage 处理后的节点图片
 * @param {Object} config.nodeTransform 节点变换参数
 * @param {string} config.fillImageUrl 填充图片URL
 * @param {Object} config.fillTransform 填充图片变换参数
 * @param {string} config.lineColor 线条颜色
 * @param {number} config.lineWidth 线条宽度
 * @returns {Promise<Pattern>} 图案实例
 */
export const createPattern = async ({
  symmetryType,
  basis1,
  basis2,
  processedNodeImage,
  nodeTransform,
  fillImageUrl,
  fillTransform,
  lineColor,
  lineWidth
}) => {
  const PatternClass = getPatternClass(symmetryType);
  const pattern = new PatternClass({
    lattice: 生成晶格设置(basis1, basis2),
    nodeImage: 生成图片绘制设置(processedNodeImage, nodeTransform, 'contain'),
    fillImage: 生成图片绘制设置(fillImageUrl, fillTransform, 'contain'),
    render: 生成图案渲染配置(lineColor, lineWidth),
  });
  await pattern.loadImages();
  return pattern;
};