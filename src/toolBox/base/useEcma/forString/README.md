# 字符串处理工具 (forString)

此目录包含各种字符串处理相关的工具函数，支持搜索、转换、HTML处理等操作。

## 文件说明

- `forSearch.js` - 字符串搜索相关工具，包括模糊搜索、相似度计算等
- `forTransform.js` - 字符串转换工具，包括大小写转换、编码解码等
- `forHtmlProcessing.js` - HTML字符串处理工具，包括标签提取、安全HTML生成等

## 使用示例

### 字符串搜索

```javascript
import { 
  构建搜索文字组, 
  以关键词匹配对象, 
  模糊搜索文本,
  计算字符串相似度,
  高亮搜索词
} from '../toolBox/base/useEcma/forString/forSearch.js';

// 引入拼音工具（用于支持中文搜索）
import { 获取拼音工具 } from '../toolBox/base/useDeps/pinyinTools.js';
const pinyin = 获取拼音工具();

// 创建搜索文字组（原文、拼音、首字母）
const searchText = 构建搜索文字组('北京', pinyin);
console.log(searchText); // ['北京', 'beijing', 'bj']

// 对象关键词匹配
const item = { title: '北京旅游', description: '故宫、长城、天安门' };
const isMatch = 以关键词匹配对象('beijing', item, ['title', 'description'], pinyin);
console.log(isMatch); // true

// 模糊搜索（支持跳字匹配）
const isFuzzyMatch = 模糊搜索文本('bjly', '北京旅游');
console.log(isFuzzyMatch); // true

// 计算字符串相似度
const similarity = 计算字符串相似度('苹果', '苹果手机');
console.log(similarity); // 0.5

// 高亮搜索词
const highlighted = 高亮搜索词('这是一个示例文本', '示例');
console.log(highlighted); // '这是一个<mark>示例</mark>文本'
```

### 字符串转换

```javascript
import { 
  转换为驼峰命名, 
  转换为短横线命名, 
  转换为下划线命名,
  编码HTML,
  解码HTML
} from '../toolBox/base/useEcma/forString/forTransform.js';

// 命名转换
console.log(转换为驼峰命名('user-name')); // 'userName'
console.log(转换为短横线命名('userName')); // 'user-name'
console.log(转换为下划线命名('userName')); // 'user_name'

// HTML编解码
console.log(编码HTML('<div>测试</div>')); // '&lt;div&gt;测试&lt;/div&gt;'
console.log(解码HTML('&lt;div&gt;测试&lt;/div&gt;')); // '<div>测试</div>'
```

### HTML处理

```javascript
import { 
  提取纯文本, 
  提取HTML标签, 
  生成安全HTML,
  检查HTML安全性
} from '../toolBox/base/useEcma/forString/forHtmlProcessing.js';

// 提取HTML中的纯文本
console.log(提取纯文本('<div>Hello <b>World</b></div>')); // 'Hello World'

// 提取HTML标签
console.log(提取HTML标签('<div>Hello <b>World</b></div>')); // ['div', 'b']

// 生成安全HTML
const safeHTML = 生成安全HTML({
  tag: 'div',
  attrs: { class: 'container', id: 'content' },
  children: ['Hello World']
});
console.log(safeHTML); // '<div class="container" id="content">Hello World</div>'

// 检查HTML安全性
const isSafe = 检查HTML安全性('<img src="x" onerror="alert(1)">', {
  allowedTags: ['img'],
  allowedAttrs: ['src', 'alt']
});
console.log(isSafe); // false
```

## 注意事项

1. 字符串搜索工具中，涉及中文拼音搜索的函数需要传入拼音工具对象，可以从 `base/useDeps/pinyinTools.js` 中获取
2. HTML处理相关函数应当谨慎使用，注意防范XSS攻击
3. 字符串转换工具中的编码解码函数会自动处理特殊字符，无需额外处理 