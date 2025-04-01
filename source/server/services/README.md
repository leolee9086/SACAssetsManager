# 服务模块

## 模块说明

服务模块是应用的核心业务逻辑层，实现各种功能域的具体业务操作。每个服务都封装在自己的目录中，提供特定领域的功能实现。服务层位于API层和数据层之间，负责处理业务逻辑并管理数据访问。

## 服务列表

| 服务目录 | 功能描述 | 主要功能 |
|----------|---------|----------|
| fs/ | 文件系统服务 | 文件读写、目录操作、文件信息获取 |
| thumbnail/ | 缩略图服务 | 图片缩略图生成、缓存管理 |
| logger/ | 日志服务 | 系统日志记录、文件日志、控制台日志 |
| color/ | 颜色分析服务 | 图片颜色提取、颜色匹配 |
| document/ | 文档处理服务 | PDF处理、Office文档处理 |
| db/ | 数据库服务 | 数据存储、查询、管理 |
| license/ | 许可证服务 | 许可证验证、管理 |

## 服务实现原则

1. **单一职责**：每个服务只负责一个特定的功能域
2. **高内聚低耦合**：服务内部高度内聚，服务之间尽量减少耦合
3. **抽象接口**：提供清晰的函数接口，隐藏实现细节
4. **可测试性**：设计易于单元测试的接口
5. **异常处理**：妥善处理所有可能的异常情况
6. **日志记录**：适当记录服务操作日志

## 服务标准结构

每个服务目录应包含以下文件：

- `xxxService.js` - 主服务实现文件
- `xxxCache.js` - 缓存实现(可选)
- `xxxUtils.js` - 工具函数(可选)
- `README.md` - 服务文档

服务实现文件的标准结构：

```javascript
/**
 * [服务名称]
 * [服务描述]
 */

import { logger } from '../logger/loggerService.js';
import { getAppConfig } from '../../config/configManager.js';

// 获取配置
const getServiceConfig = () => {
  const config = getAppConfig();
  return config.serviceSection || {};
};

// 服务初始化(可选)
const initialize = () => {
  // 初始化代码...
};

/**
 * [功能描述]
 * @param {type} param - 参数描述
 * @returns {Promise<type>} 返回值描述
 */
export const serviceFunction = async (param) => {
  try {
    // 实现逻辑...
    return result;
  } catch (error) {
    logger.error(`操作失败: ${error.message}`, 'Service-Name');
    throw error;
  }
};

// 如果需要初始化，在模块加载时执行
initialize();
```

## 创建新服务

创建新服务的步骤：

1. 在`services/`目录下创建新的服务目录
2. 创建主服务实现文件（如`xxxService.js`）
3. 在`types/`目录中创建相应的类型定义文件
4. 在`config/default.js`中添加服务配置项
5. 创建服务文档（README.md）

## 服务之间的依赖

- 服务之间的依赖关系应当明确且最小化
- 避免循环依赖
- 可以使用事件系统（`backendEvents.js`）实现松散耦合的服务通信

## 配置管理

服务应当从配置系统获取配置，而不是硬编码配置值：

```javascript
import { getAppConfig } from '../../config/configManager.js';

// 获取服务配置
const getServiceConfig = () => {
  const config = getAppConfig();
  return config.serviceName || defaultConfig;
};
```

## 错误处理

服务中的错误处理应当遵循以下原则：

1. 捕获所有可能的异常
2. 详细记录错误信息和上下文
3. 抛出有意义的错误对象，包含错误类型和消息
4. 不要吞掉错误，确保错误能被上层调用者处理

## 日志记录

服务应当使用日志服务记录重要操作和错误：

```javascript
import { logger } from '../logger/loggerService.js';

// 记录操作
logger.info(`执行操作: ${operation}`, 'Service-Name');

// 记录错误
logger.error(`操作失败: ${error.message}`, 'Service-Name');
```

## 缓存管理

如果服务需要缓存，应遵循以下原则：

1. 缓存应当可配置（开关、大小、过期时间等）
2. 提供缓存清理机制
3. 处理缓存穿透和缓存击穿问题
4. 确保缓存数据一致性 