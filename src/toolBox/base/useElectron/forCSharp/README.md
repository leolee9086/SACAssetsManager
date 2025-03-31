# C#交互工具 (forCSharp)

本目录包含用于在Electron环境中与C#代码交互的工具函数，基于electron-edge-js实现。

## 工具介绍

- **useCSharpLoader.js** - 提供C#代码加载和执行的功能
  - 支持从字符串加载C#代码
  - 支持从文件加载C#代码
  - 提供DLL路径修复工具，解决Windows下非ASCII字符路径问题

## 使用方法

### 基本用法

```javascript
import { 使用C井, 加载C井函数, 加载C井文件, 设置DLL路径 } from '../../../../toolBoxExports.js';

// 设置DLL路径（在Windows环境下需要调用）
设置DLL路径();

// 从字符串加载C#函数
const 计算函数 = 加载C井函数(`
    using System;
    using System.Threading.Tasks;
    
    public class Startup
    {
        public async Task<object> Invoke(object input)
        {
            dynamic data = input;
            double a = data.a;
            double b = data.b;
            return a + b;
        }
    }
`);

// 调用C#函数
async function 示例() {
    try {
        const 结果 = await 计算函数({ a: 5, b: 3 });
        console.log('计算结果：', 结果); // 输出：计算结果：8
    } catch (错误) {
        console.error('调用C#函数出错：', 错误);
    }
}

// 从文件加载C#函数
const 文件处理函数 = 加载C井文件('./路径/到/csharp文件.cs');
```

### 并行处理

```javascript
// C#代码将根据CPU核心数自动并行处理
const 图像处理函数 = 加载C井函数(`
    using System;
    using System.Threading.Tasks;
    using System.Drawing;
    
    public class Startup
    {
        public async Task<object> Invoke(object input)
        {
            string imagePath = (string)input;
            // 图像处理代码...
            return "处理完成";
        }
    }
`);

// 并行处理多个图像
async function 并行处理图像(图像路径列表) {
    const 任务列表 = 图像路径列表.map(路径 => 图像处理函数(路径));
    return await Promise.all(任务列表);
}
```

### 高级用法

```javascript
// 也可以通过对象形式使用
import { 使用C井 } from '../../../../toolBoxExports.js';

// 初始化环境
使用C井.设置DLL路径();

// 创建一个复杂的C#函数
const 数据分析器 = 使用C井.加载C井函数(`
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading.Tasks;
    
    public class Startup
    {
        public async Task<object> Invoke(object input)
        {
            dynamic data = input;
            var numbers = ((object[])data.numbers).Select(n => Convert.ToDouble(n)).ToArray();
            
            return new {
                sum = numbers.Sum(),
                average = numbers.Average(),
                min = numbers.Min(),
                max = numbers.Max()
            };
        }
    }
`);

// 调用分析函数
async function 分析数据() {
    const 结果 = await 数据分析器({
        numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    });
    
    console.log('数据分析结果：', 结果);
    // 输出：数据分析结果：{ sum: 55, average: 5.5, min: 1, max: 10 }
}
```

## 注意事项

1. 此工具依赖于electron-edge-js，仅在Electron环境中可用
2. 在Windows环境下，路径中包含非ASCII字符时，需要调用`设置DLL路径`解决DLL加载问题
3. C#代码会根据CPU核心数自动并行处理，以提高性能
4. 所有C#函数都是异步的，返回Promise对象

## 兼容性

为保持向后兼容性，提供了以下别名：
- `loadCsharpFunc` 对应 `加载C井函数`
- `loadCsharpFile` 对应 `加载C井文件`
- `setupDllPaths` 对应 `设置DLL路径` 