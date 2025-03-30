# Vite模式使用指南

## 概述

Vite模式是对Vue组件加载器的增强，提供了类似Vite开发服务器的开发体验：

1. **快速冷启动** - 利用ESM直接加载模块，无需全量编译
2. **按需编译** - 只编译当前需要的文件
3. **热模块替换(HMR)** - 无需刷新页面的模块热替换
4. **依赖预打包管理** - 智能处理和预加载依赖
5. **智能路径修复** - 自动处理缺少扩展名的路径问题

> **新特性**：现在组件加载器默认使用Vite模式！您无需修改代码，即可享受Vite的开发体验。

## 默认Vite模式

从最新版本开始，组件加载器默认使用Vite模式加载组件，无需额外代码。如果您使用以下代码：

```javascript
import { initVueApp, createVueInterface } from '/plugins/SACAssetsManager/src/toolBox/feature/useVue/vueExports.js';

// 加载组件 - 自动使用Vite模式
const app = await initVueApp('/plugins/SACAssetsManager/source/UI/App.vue', 'App');

// 创建界面 - 自动使用Vite模式
const interface = await createVueInterface(container, '/plugins/SACAssetsManager/source/UI/Panel.vue');
```

系统会自动判断是否使用Vite模式。如需手动配置Vite模式，可以使用：

```javascript
import { configureViteMode } from '/plugins/SACAssetsManager/src/toolBox/feature/useVue/vueExports.js';

// 配置Vite模式
const 当前配置 = configureViteMode({
  启用: true,                // 全局开关
  最小路径长度: 10,           // 最小路径长度
  自动预加载: true,           // 是否自动预加载依赖
  启用热重载: true,           // 是否启用热重载
  检测文件变化间隔: 500,       // 毫秒
  智能路径修复: true,         // 启用智能路径修复
  路径黑名单: [],             // 不使用Vite模式的路径列表
  严格模式: false             // 严格模式下不会自动降级到传统模式
});

console.log('当前配置状态:', 当前配置);
```

## 智能路径修复功能

新增的智能路径修复功能可以解决组件路径缺少扩展名的问题。例如，当您这样加载组件时：

```javascript
// 路径缺少.vue扩展名
const app = await initVueApp('/plugins/SACAssetsManager/source/UI/components/Counter');
```

系统会自动尝试：
1. 检测到路径没有扩展名
2. 尝试添加常见扩展名(.vue, .js, .jsx, .ts等)
3. 记住成功的路径映射，避免重复检测
4. 如果所有尝试都失败，自动降级到传统模式

智能路径修复配置会被自动保存到localStorage，重启页面后仍然有效。

## 黑名单管理

某些组件可能不兼容Vite模式，您可以将它们添加到黑名单中：

```javascript
import { configureViteMode } from '/plugins/SACAssetsManager/src/toolBox/feature/useVue/vueExports.js';

// 获取当前配置
const 配置 = configureViteMode();

// 添加新的黑名单路径
const 新黑名单 = [...配置.路径黑名单, '/plugins/SACAssetsManager/source/UI/Problem.vue'];

// 更新配置
configureViteMode({ 路径黑名单: 新黑名单 });
```

系统会自动将加载失败的路径添加到黑名单，之后会使用传统模式加载这些路径。

## 判断是否使用了Vite模式

您可以通过检查应用实例的`isMountedWithVite`属性来判断是否使用了Vite模式：

```javascript
const app = await initVueApp('/plugins/SACAssetsManager/source/UI/App.vue');
if (app.isMountedWithVite) {
  console.log('使用了Vite模式');
  // 访问内部Vite应用
  const viteApp = app._viteApp;
}
```

## 手动使用Vite模式

如果需要更精细控制，您仍可以手动初始化Vite模式：

```javascript
// 导入Vite模式工具
import { initViteMode } from '/plugins/SACAssetsManager/src/toolBox/feature/useVue/vueExports.js';
import * as Vue from '/plugins/SACAssetsManager/static/vue.esm-browser.js';

// 初始化Vite模式
const viteApp = await initViteMode(Vue, {
  // 项目根路径
  基础路径: '/plugins/SACAssetsManager/source/UI/',
  // 入口点，用于自动预加载依赖
  入口点: '/plugins/SACAssetsManager/source/UI/App.vue',
  // 启用热重载
  热重载: true,
  // 监视目录
  监视目录: '/plugins/SACAssetsManager/source/UI/',
  // 并发加载限制
  并发限制: 5
});

// 加载并挂载组件
const app = await viteApp.加载并挂载(
  '/plugins/SACAssetsManager/source/UI/App.vue',
  document.getElementById('app'),
  {
    // 组件数据
    message: 'Hello Vite Mode!'
  }
);
```

## 测试工具

我们提供了测试工具帮助您诊断Vite模式相关问题：

```javascript
import { testViteMode, testPathExtension } from '/plugins/SACAssetsManager/src/toolBox/feature/useVue/ViteModeTester.js';

// 测试特定路径
const 结果 = await testViteMode('/plugins/SACAssetsManager/source/UI/App.vue');
console.log('测试结果:', 结果);

// 测试缺少扩展名的路径
const 扩展名测试 = await testPathExtension(
  '/plugins/SACAssetsManager/source/UI', 
  'components/Counter'
);
console.log('扩展名测试结果:', 扩展名测试);
```

## 核心功能

### 1. 运行时编译器

运行时编译器提供了类似Vite的即时编译能力：

```javascript
import { createRuntimeCompiler } from '/plugins/SACAssetsManager/src/toolBox/feature/useVue/vueExports.js';

// 创建编译器
const compiler = createRuntimeCompiler({
  基础路径: '/plugins/SACAssetsManager/source/UI/'
});

// 解析模块
const module = await compiler.解析('./components/Counter.vue');

// 获取模块URL（可在import()中使用）
const moduleUrl = await compiler.获取模块URL('./components/Counter.vue');

// 创建导入映射（类似Vite的importMap）
const importMap = compiler.创建导入映射({
  'vue': '/plugins/SACAssetsManager/static/vue.esm-browser.js',
  'lodash': '/plugins/SACAssetsManager/static/lodash.js'
});

// 释放资源
compiler.清理();
```

### 2. 开发服务器

开发服务器提供了文件监视和热重载功能：

```javascript
import { createDevServer } from '/plugins/SACAssetsManager/src/toolBox/feature/useVue/vueExports.js';

// 创建开发服务器
const server = createDevServer({
  基础路径: '/plugins/SACAssetsManager/source/UI/'
});

// 加载组件
const component = await server.加载组件('./components/Counter.vue');

// 启用文件监视（需要Electron环境）
server.启用监视('/plugins/SACAssetsManager/source/UI/');

// 停止监视
server.停止监视('/plugins/SACAssetsManager/source/UI/');
server.停止所有监视();

// 释放资源
server.清理();
```

### 3. 依赖预处理器

依赖预处理器提供了智能依赖管理：

```javascript
import { createDepsProcessor } from '/plugins/SACAssetsManager/src/toolBox/feature/useVue/vueExports.js';

// 创建依赖预处理器
const processor = createDepsProcessor({
  并发限制: 5
});

// 预加载单个依赖
await processor.预加载('vue', '/plugins/SACAssetsManager/static/vue.esm-browser.js', 10);

// 批量预加载
await processor.批量预加载({
  'vue': '/plugins/SACAssetsManager/static/vue.esm-browser.js',
  'lodash': '/plugins/SACAssetsManager/static/lodash.js'
});

// 自动预加载入口点的所有依赖
const deps = await processor.自动预加载('/plugins/SACAssetsManager/source/UI/App.vue');

// 获取已缓存的依赖
const cachedModule = processor.获取缓存('vue', '/plugins/SACAssetsManager/static/vue.esm-browser.js');

// 清理缓存
processor.清理缓存();
```

## 在组件中使用HMR

Vite模式提供了类似Vite的HMR API，可以在组件中使用：

```javascript
// Counter.vue
<script setup>
import { ref } from 'vue';

const count = ref(0);

// 启用HMR
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    console.log('Counter组件已更新');
  });
}
</script>

<template>
  <button @click="count++">{{ count }}</button>
</template>
```

## 最佳实践

1. **使用默认启用** - 默认启用Vite模式，无需额外代码
2. **添加扩展名** - 尽量在路径中明确指定扩展名，避免依赖智能路径修复
3. **使用相对路径** - 在组件中使用相对路径引用其他组件和资源
4. **启用热重载** - 在开发环境中总是启用热重载以提高效率
5. **预加载关键依赖** - 预加载常用的依赖以提高性能
6. **使用ESM语法** - 始终使用ESM语法（import/export）
7. **清理资源** - 不再需要时调用清理方法释放资源

## 注意事项

1. **自动降级** - 如果Vite模式加载失败，会自动降级使用传统模式
2. **环境检测** - 系统会自动检测环境是否支持Vite模式
3. **路径问题** - 缺少扩展名的路径会通过智能路径修复功能处理
4. **黑名单管理** - 不兼容的组件会自动添加到黑名单，之后使用传统模式加载
5. **热重载限制** - 只有在Electron环境中才能使用基于文件系统的热重载
6. **浏览器兼容性** - Vite模式依赖现代浏览器特性（如ES模块、Blob URL）
7. **跨域限制** - 远程组件加载可能受到浏览器跨域限制
8. **样式隔离** - 每个应用实例有独立的样式管理，避免样式冲突

## 问题排查

如果您遇到以下错误：

```
解析依赖图失败: /plugins/SACAssetsManager/source/UI/pannels/assetInfoPanel/vue Error: 获取组件失败: /plugins/SACAssetsManager/source/UI/pannels/assetInfoPanel/vue, 状态码: 404
```

这通常是路径缺少扩展名导致的。Vite模式现在会自动尝试添加扩展名，但为了更好的性能，建议：

1. 修改您的代码，添加正确的文件扩展名
2. 或者使用配置工具将此路径添加到黑名单

```javascript
import { configureViteMode } from '/plugins/SACAssetsManager/src/toolBox/feature/useVue/vueExports.js';

// 将有问题的路径添加到黑名单
configureViteMode({
  路径黑名单: [
    '/plugins/SACAssetsManager/source/UI/pannels/assetInfoPanel/vue'
  ]
});
```

## 与传统加载器对比

| 功能 | 传统加载器 | Vite模式 |
|------|------------|----------|
| 启动速度 | 需要完整加载 | 快速冷启动 |
| 热重载 | 基础支持 | 高级HMR支持 |
| 依赖处理 | 手动处理 | 智能预加载 |
| ESM支持 | 有限支持 | 完全支持 |
| 资源使用 | 较高 | 按需加载更高效 |
| 调试体验 | 基础 | 增强（源映射支持）|
| 路径问题 | 可能需要手动修复 | 智能路径修复 | 