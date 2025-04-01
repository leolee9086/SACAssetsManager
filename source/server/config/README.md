# 配置模块

## 模块说明

配置模块负责管理整个应用的配置项，提供统一的配置访问接口。该模块确保配置的一致性，并支持从多个来源（默认配置、环境变量、配置文件等）加载配置。

## 文件结构

- `configManager.js` - 配置管理器，提供配置加载和访问功能
- `default.js` - 默认配置文件，定义所有配置项的默认值

## 配置加载顺序

配置按照以下顺序加载，后加载的配置会覆盖先加载的配置：

1. 默认配置（`default.js`）
2. 环境变量
3. 用户配置文件（如果存在）
4. 运行时修改的配置（通过API）

## 配置管理器API

### 获取应用配置

```javascript
/**
 * 获取完整的应用配置
 * @returns {Object} 应用配置对象
 */
getAppConfig()
```

### 获取特定配置项

```javascript
/**
 * 获取特定配置项
 * @param {string} key - 配置项键名
 * @param {any} defaultValue - 默认值（如果配置项不存在）
 * @returns {any} 配置项值
 */
getConfigValue(key, defaultValue)
```

### 设置配置项

```javascript
/**
 * 设置配置项
 * @param {string} key - 配置项键名
 * @param {any} value - 配置项值
 * @returns {boolean} 设置成功返回true
 */
setConfigValue(key, value)
```

### 重新加载配置

```javascript
/**
 * 重新加载配置
 * @returns {Object} 更新后的配置对象
 */
reloadConfig()
```

## 默认配置结构

默认配置文件（`default.js`）定义了所有配置项的默认值，结构如下：

```javascript
export const DEFAULT_CONFIG = {
    server: {
        // 服务器配置...
    },
    logger: {
        // 日志配置...
    },
    fs: {
        // 文件系统配置...
    },
    thumbnail: {
        // 缩略图配置...
    },
    metadata: {
        // 元数据配置...
    },
    color: {
        // 颜色分析配置...
    },
    eagle: {
        // Eagle集成配置...
    },
    document: {
        // 文档处理配置...
    },
    license: {
        // 许可证配置...
    }
};
```

## 使用示例

### 在服务中使用配置

```javascript
import { getAppConfig } from '../../config/configManager.js';

// 获取服务配置
const getServiceConfig = () => {
  const config = getAppConfig();
  return config.serviceName || defaultConfig;
};

// 使用配置项
const serviceFunction = () => {
  const config = getServiceConfig();
  const option = config.optionName;
  
  // 使用选项执行操作...
};
```

### 全局配置访问

```javascript
import { getConfigValue } from '../../config/configManager.js';

// 获取特定配置项
const serverPort = getConfigValue('server.port', 3000);
const logLevel = getConfigValue('logger.level', 'info');

// 使用配置项...
```

## 扩展配置

要添加新的配置项，应当：

1. 在`default.js`中定义配置项及其默认值
2. 在相应的服务中使用配置管理器访问配置项

示例：添加新服务的配置

```javascript
// 在default.js中添加
newService: {
    // 选项1
    option1: 'defaultValue',
    // 选项2
    option2: 42,
    // 子选项
    subOptions: {
        subOption1: true,
        subOption2: 'value'
    }
}

// 在服务中使用
import { getAppConfig } from '../../config/configManager.js';

const getNewServiceConfig = () => {
  const config = getAppConfig();
  return config.newService || {};
};
```

## 配置校验（建议实现）

为确保配置的有效性，建议实现配置校验机制：

1. 定义每个配置项的规则（类型、范围、必填等）
2. 在加载配置时进行校验
3. 对于无效配置，记录警告并使用默认值

## 配置变更通知（建议实现）

为了支持配置热更新，建议实现配置变更通知机制：

1. 定义配置变更事件
2. 允许服务注册监听器
3. 当配置变更时，通知所有监听器 