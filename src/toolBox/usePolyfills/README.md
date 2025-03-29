# 平台兼容性工具 (usePolyfills)

此目录包含平台检测、环境分析和兼容性处理相关的工具函数。

## 文件说明

- `browserDetection.js` - 浏览器检测工具
- `osDetection.js` - 操作系统检测工具
- `platformDetection.js` - 平台综合检测工具
- `uaParserTools.js` - 用户代理(UA)字符串解析工具
- `uaAnalysis.js` - 设备和环境分析工具
- `getPlatformInfo.js` - 平台信息获取工具
- `getTextProcessor.js` - 文本处理能力检测工具

## 使用示例

```javascript
// UA分析工具使用示例
import { 创建设备分析 } from '../toolBox/usePolyfills/uaAnalysis.js';

// 创建分析工具实例（默认使用当前环境的UA）
const 设备分析 = 创建设备分析();

// 使用管道方式组合多个分析器
const 分析结果 = 设备分析.管道(
  设备分析.基本信息(),
  设备分析.设备特征(),
  设备分析.兼容性([
    { 名称: 'chrome', 版本: '80' },
    { 名称: 'firefox', 版本: '70' }
  ])
)(设备分析.创建上下文());

// 获取分析结果
const 结果 = 设备分析.获取结果()(分析结果);
console.log(结果);

// 浏览器检测简单使用
import { 是Chrome浏览器, 获取浏览器版本 } from '../toolBox/usePolyfills/browserDetection.js';

if (是Chrome浏览器()) {
  console.log(`Chrome版本: ${获取浏览器版本()}`);
}
```

## 平台环境支持

这些工具函数支持以下环境：

- 现代浏览器（Chrome、Firefox、Safari、Edge等）
- Node.js运行时
- 思源笔记插件环境
- Electron应用
- PWA应用

## 注意事项

1. 使用前应该先检查当前环境是否支持相关功能
2. 某些检测功能在特定环境下可能不可用或不准确
3. 在敏感操作前，建议先使用这些工具检测环境兼容性
4. 用户代理字符串可能被伪装，不要完全依赖它进行关键决策 