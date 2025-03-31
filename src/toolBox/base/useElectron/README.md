# Electron工具 (useElectron)

本目录包含与Electron环境相关的工具函数，用于处理Electron特有的功能和API。

## 工具列表

- **useHeartBeat.js** - 心跳工具函数，用于在耗时操作中向前端报告后台仍然存活
- **forCSharp/** - 与C#交互相关的工具函数目录

## 使用心跳工具

心跳工具用于在后台执行长时间操作时定期向主进程报告状态，防止用户认为程序已经死锁或崩溃。

```javascript
import { 报告心跳, 初始化心跳监听 } from '../../../toolBoxExports.js';

// 在渲染进程中初始化心跳监听
const 取消监听 = 初始化心跳监听();

// 在耗时操作中定期报告心跳
async function 处理大量数据() {
    for (let i = 0; i < 10000; i++) {
        // 每处理100项报告一次心跳
        if (i % 100 === 0) {
            报告心跳();
            await new Promise(resolve => setTimeout(resolve, 0)); // 让UI有机会更新
        }
        
        // 处理数据...
    }
}

// 不再需要心跳监听时取消
// 取消监听();
```

## C#交互工具

C#交互工具提供了从JavaScript调用C#代码的能力，基于electron-edge-js实现。

```javascript
import { 加载C井函数, 加载C井文件, 设置DLL路径 } from '../../../toolBoxExports.js';

// 设置DLL路径，解决非ASCII字符路径问题（仅Windows环境需要）
设置DLL路径();

// 从字符串加载C#函数
const 求和函数 = 加载C井函数(`
    using System;
    using System.Threading.Tasks;
    
    public class Startup
    {
        public async Task<object> Invoke(object input)
        {
            int[] numbers = (int[])input;
            int sum = 0;
            foreach (int num in numbers)
            {
                sum += num;
            }
            return sum;
        }
    }
`);

// 调用C#函数
async function 调用CSharp求和() {
    const 结果 = await 求和函数([1, 2, 3, 4, 5]);
    console.log('求和结果：', 结果); // 15
}

// 从文件加载C#函数
const 图像处理 = 加载C井文件('./path/to/imageProcessor.cs');

// 调用文件中的C#函数
async function 处理图像() {
    const 结果 = await 图像处理({
        图像路径: '/path/to/image.jpg',
        参数: { 宽度: 100, 高度: 100 }
    });
    console.log('处理结果：', 结果);
}
```

## 注意事项

1. 这些工具仅在Electron环境中可用，在Web环境中会优雅失败或提供兼容性接口
2. C#交互工具依赖于electron-edge-js模块，需要确保项目已安装该依赖
3. 心跳工具需要主进程和渲染进程之间的通信，确保IPC通道已正确设置
4. Windows环境下的中文路径可能导致DLL加载问题，使用`设置DLL路径`函数可解决此问题 