# Electron窗口管理工具重构笔记

## 重构内容

这个目录包含从`source/server/utils/containers/browserWindow.js`重构而来的Electron窗口管理工具。

### 主要改进

1. **函数式风格改进**：
   - 将嵌套回调改为Promise和async/await
   - 避免深度嵌套和复杂条件判断
   - 明确函数职责和边界

2. **配置参数规范化**：
   - 使用中文命名提升可读性
   - 统一配置对象结构
   - 提供合理默认值

3. **错误处理增强**：
   - 添加环境检查
   - 完善异常捕获机制
   - 提高稳定性和可靠性

4. **心跳检测优化**：
   - 改进心跳检测逻辑
   - 优化资源清理机制
   - 增加连接状态监控

### 迁移策略

保留了`createBrowserWindowByURL`作为兼容性接口，内部实现使用重构的函数。在关键调用点直接替换为新函数。

## 使用注意

1. 需要在Electron环境中使用
2. 最好提供`获取同源窗口函数`以实现单实例功能
3. 当`保持活跃`选项为true时，`单实例`也必须为true
4. 心跳检测仅在特定环境下激活

## 兼容性修复（2024-04-01）

### @electron/remote 兼容性问题

修复了Electron Remote模块的兼容性问题：

1. **问题描述**：
   - 错误信息：`Uncaught (in promise) Error: @electron/remote is disabled for this WebContents`
   - 原因：不同版本的Electron和@electron/remote启用方式不同

2. **修复措施**：
   - 参照`source/server/utils/containers/webview.js`文件实现了统一的remote启用方式
   - 提供了导出的enableRemote函数
   - 简化流程，使用`remote.require("@electron/remote/main").enable`方式
   - 减少了复杂的多方案尝试，提高可靠性
   - 保留ipcRenderer通信作为备选方案
   - 增强了错误处理和日志记录

3. **使用建议**：
   - 推荐直接使用导出的enableRemote函数：
   ```javascript
   import { enableRemote } from '../../src/toolBox/base/useElectron/forWindow/useBrowserWindow.js';
   
   // 获取enable函数
   const enableFunc = enableRemote();
   if (enableFunc) {
     enableFunc(webContents);
   }
   ```
   
   - 也可以在创建窗口时使用自定义函数：
   ```javascript
   import { 创建浏览器窗口 } from '../../src/toolBox/base/useElectron/forWindow/useBrowserWindow.js';
   
   // 自定义启用函数
   const 启用远程模块 = (webContents) => {
     try {
       const remoteEnable = require('@electron/remote').require('@electron/remote/main').enable;
       remoteEnable(webContents);
       return true;
     } catch (错误) {
       console.error('启用远程模块失败:', 错误);
       return false;
     }
   };
   
   // 使用配置选项
   创建浏览器窗口(url, {
     // 其他配置...
     enableRemote: 启用远程模块
   });
   ```
   - 遇到问题时可以查看控制台错误日志进行调试 