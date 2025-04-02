# useArtTemplate 模块说明

该模块提供了在项目中使用art-template模板引擎的功能封装，通过隔离的iframe环境加载模板引擎，以避免全局污染。

## 文件说明

### fromArt.js

该文件使用通用iframe加载器加载art-template模板引擎，并提供对其功能的访问。

主要功能：
- 懒加载art-template-web.js
- 通过iframe隔离环境加载，防止全局污染
- 使用Symbol存储模板引擎实例，提高访问效率
- 提供错误处理机制

## 使用示例

```javascript
import { artTemplate } from './fromArt.js';

// 基本用法
const html = artTemplate('templateId', { name: '张三', age: 30 });

// 编译模板
const render = artTemplate.compile('<div>{{name}}</div>');
const html = render({ name: '李四' });

// 使用辅助方法
artTemplate.helper('formatDate', (date) => {
  return new Date(date).toLocaleDateString();
});
```

## 技术细节

模板引擎通过以下步骤加载：
1. 检查全局Symbol中是否已存在art-template实例
2. 创建隔离的iframe环境
3. 在iframe中加载art-template-web.js
4. 获取iframe中的template对象并导出

## 注意事项

- 首次加载可能有短暂延迟，后续使用将从缓存获取
- 确保art-template-web.js在静态资源中可用
- 页面卸载时iframe会自动销毁 