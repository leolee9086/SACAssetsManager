# 类型定义模块

## 模块说明

类型定义模块提供应用中使用的所有数据类型的JSDoc定义。这些类型定义提高了代码的可读性和可维护性，并为开发工具（如VSCode）提供更好的类型检查和自动完成支持。虽然JavaScript是动态类型语言，但通过JSDoc注释，我们可以获得类似静态类型语言的好处。

## 文件结构

- `index.js` - 类型定义入口，导出所有类型
- `api.js` - API相关类型定义
- `fs.js` - 文件系统相关类型定义
- `common.js` - 通用类型定义
- `document.js` - 文档处理相关类型定义

## 类型定义示例

### 对象类型

```javascript
/**
 * 用户配置
 * @typedef {Object} UserConfig
 * @property {string} username - 用户名
 * @property {string} email - 邮箱
 * @property {Object} preferences - 用户偏好
 * @property {string} preferences.theme - 主题
 * @property {boolean} preferences.notifications - 是否启用通知
 */
```

### 函数类型

```javascript
/**
 * 处理器函数类型
 * @typedef {function} HandlerFunction
 * @param {Object} ctx - 请求上下文
 * @param {Object} ctx.req - 请求对象
 * @param {Object} ctx.res - 响应对象
 * @returns {Promise<Object>} 处理结果
 */
```

### 联合类型

```javascript
/**
 * 日志级别
 * @typedef {'debug'|'info'|'warn'|'error'} LogLevel
 */
```

## 使用类型定义

### 标记参数类型

```javascript
/**
 * 创建用户
 * @param {string} username - 用户名
 * @param {string} email - 邮箱
 * @param {Object} [options] - 可选配置
 * @returns {Promise<User>} 创建的用户
 */
export const createUser = async (username, email, options = {}) => {
  // 实现...
};
```

### 标记返回值类型

```javascript
/**
 * 获取文件信息
 * @param {string} filePath - 文件路径
 * @returns {Promise<FileInfo>} 文件信息
 */
export const getFileInfo = async (filePath) => {
  // 实现...
};
```

### 使用类型别名（typedef）

```javascript
/**
 * @typedef {Object} RequestContext
 * @property {Object} req - 请求对象
 * @property {Object} res - 响应对象
 */

/**
 * 处理请求
 * @param {RequestContext} ctx - 请求上下文
 * @returns {Promise<Object>} 处理结果
 */
export const handleRequest = async (ctx) => {
  // 实现...
};
```

## 导入和导出类型

### 导出类型（index.js）

```javascript
/**
 * 类型定义索引
 * 统一导出所有类型定义
 */

// 导出所有类型定义
export * from './api.js';
export * from './fs.js';
export * from './common.js';
export * from './document.js';
```

### 使用类型（在其他文件中）

```javascript
// 使用JSDoc引用类型
/**
 * @param {import('../types').UserConfig} config
 */
function processConfig(config) {
  // 实现...
}
```

## 类型定义指南

### 命名约定

- 类型名应使用PascalCase（如`UserConfig`）
- 类型名应简明扼要，表达其含义
- 类型名应避免使用通用名称，可加上功能域前缀（如`FsFileInfo`）

### 文档注释

每个类型定义应包含以下内容：

- 简短描述（第一行）
- 每个属性的描述
- 对于可选属性，使用方括号标记（如`[options]`）
- 对于有默认值的属性，可在描述中注明

### 复杂类型处理

对于复杂类型，可以使用组合和嵌套：

```javascript
/**
 * 分页结果
 * @typedef {Object} PaginatedResult
 * @property {Array<T>} items - 结果项
 * @property {number} total - 总数
 * @property {number} page - 当前页
 * @property {number} pageSize - 页大小
 * @template T
 */
```

## 最佳实践

1. 为所有公共API函数添加类型注释
2. 将复杂的对象结构定义为类型
3. 保持类型定义的一致性和准确性
4. 使用模板（泛型）类型提高代码可重用性
5. 将类型按功能域分组到不同文件
6. 通过index.js统一导出所有类型

## 未来改进

1. 考虑迁移到TypeScript，获得更强大的类型系统
2. 添加类型验证器，在运行时验证数据结构
3. 自动生成API文档
4. 添加类型测试，确保API实现符合类型约定 