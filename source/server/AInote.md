# 服务器模块重构笔记

## 重构状态

服务器模块正在重构中，计划分阶段将现有功能迁移到`src/services`目录。

## 职责范围

- 提供API服务接口
- 管理数据存储和检索
- 处理插件的后端逻辑
- 维护服务器配置和状态
- 与思源笔记核心交互

## 重构原则

1. **服务隔离**：
   - 按功能领域拆分服务
   - 明确服务边界和责任
   - 减少服务间耦合

2. **异步优化**：
   - 使用Promise和async/await
   - 避免阻塞主线程操作
   - 处理复杂异步流程

3. **接口标准化**：
   - 统一API设计风格
   - 明确错误处理机制
   - 规范化参数和返回值

4. **渐进式重构**：
   - 保持与现有代码兼容
   - 增量实现新功能
   - 提供适配层和兼容层

## 通用工具函数拆分计划

### 拆分原则

1. **功能聚合**：按功能类别组织工具函数
2. **单一职责**：每个工具函数只负责一个功能
3. **避免重复**：消除代码库中的功能重复
4. **提高可测试性**：便于单元测试的编写

### 已发现需要拆分的工具函数

1. **文件系统操作工具** (`utils/fs`):
   - `statWithCatch`: 安全获取文件状态 (fs/stat.js, processors/fs/stat.js)
   - `statWithNew`: 获取文件状态并写入缓存 (processors/fs/stat.js)
   - `buildStepCallback`: 构建步骤回调函数 (processors/fs/stat.js)
   - `计算哈希`: 计算文件哈希值
   - `获取哈希并写入数据库`: 获取哈希并保存 (processors/fs/stat.js)

2. **缓存相关工具** (`utils/cache`):
   - `buildCache`: 构建缓存实例 (processors/cache/cache.js)
   - `getCachePath`: 获取缓存路径 (processors/fs/cached/fs.js)

3. **遍历相关工具** (`utils/traversal`):
   - `更新目录索引`: 更新目录索引 (processors/fs/walk.js)
   - `initializeWalkParams`: 初始化遍历参数 (processors/fs/walk.js)
   - `processWalkResults`: 处理遍历结果 (processors/fs/walk.js)
   - `调度文件夹索引任务`: 安排索引更新任务 (processors/fs/walk.js)
   - `文件遍历回调`: 文件遍历回调函数 (processors/fs/walk.js)
   - `计算目录遍历优先级`: 计算遍历优先级 (processors/fs/walk.js)

4. **心跳检测工具** (`utils/heartbeat`):
   - `初始化心跳处理`: 心跳响应处理 (heartbeat.js)
   - `更新主服务启动时间`: 更新主服务时间 (heartbeat.js)
   - `更新静态服务启动时间`: 更新静态服务时间 (heartbeat.js)
   - `获取服务状态快照`: 获取服务状态 (heartbeat.js)

5. **URL和路径工具** (`utils/url`):
   - `getStaticServerURL`: 构建静态服务器URL (main.js)
   - `判定路径排除`: 判断路径是否排除 (utils/fs/windowsSystemDirs.js)

6. **任务队列工具** (`utils/queue`):
   - `添加优先级任务`: 添加优先级任务 (processors/queue/taskQueue.js)
   - `添加后进先出后台任务`: 添加后台任务 (processors/queue/taskQueue.js)
   - `globalTaskQueue`: 全局任务队列 (processors/queue/taskQueue.js)

7. **网络请求和响应工具** (`utils/http`):
   - `sendFileWithCacheSet`: 发送文件并设置缓存 (handlers/utils/responseType.js)
   - 各种响应头设置函数 (middlewares/headers.js)

8. **日志工具** (`utils/logger`):
   - 自定义的控制台日志方法 (server.js)
   - 日志接口 (utils/logs/*.js)

### 后续步骤

1. 创建以上工具函数的专用目录结构
2. 将功能从原位置迁移到新目录
3. 修改导入路径，确保兼容性
4. 为每个工具函数编写单元测试
5. 更新文档说明工具函数的用法

## 迁移计划

### 第一阶段：核心服务（进行中）

- API核心框架
- 数据存储服务
- 事件系统
- 日志服务

### 第二阶段：功能服务（计划中）

- 文档处理服务
- 搜索索引服务
- 用户认证服务
- 插件管理服务

### 第三阶段：扩展服务（计划中）

- WebSocket实时通信
- 同步服务
- 备份恢复服务
- 高级分析服务

## 目录迁移映射

| 现有目录/文件 | 目标位置 | 优先级 | 状态 | 备注 |
|--------------|---------|-------|------|------|
| apiService.js | src/services/api | 高 | 进行中 | API服务核心 |
| dataBase/ | src/services/database | 高 | 待开始 | 数据存储服务 |
| handlers/ | src/services/api/handlers | 高 | 待开始 | API处理器 |
| endPoints.js | src/services/api/endpoints | 高 | 待开始 | API端点定义 |
| processors/ | src/services/processors | 中 | 待开始 | 数据处理器 |
| middlewares/ | src/middlewares | 中 | 待开始 | 请求中间件 |
| backendEvents.js | src/services/events | 高 | 进行中 | 事件系统 |
| server.js | src/services/server | 高 | 待开始 | 服务器核心 |
| logger.js | src/services/logger | 高 | 完成 | 日志服务 |
| packageServer/ | src/services/packages | 低 | 待开始 | 包管理服务 |
| licenseChecker.js | src/services/license | 低 | 待开始 | 许可证服务 |
| utils/ | src/services/utils | 中 | 进行中 | 工具函数 |

## 特殊处理说明

### API兼容性处理

为确保兼容性，API服务将采用适配器模式：

1. 新API遵循RESTful设计原则
2. 为旧API提供兼容层
3. 使用API版本控制机制
4. 逐步迁移客户端到新API

### 数据库迁移

数据库服务需要特别注意数据完整性：

1. 创建数据模型映射层
2. 实现数据迁移工具
3. 支持数据回滚机制
4. 提供数据校验功能

### 错误处理策略

错误处理需要更加系统化：

1. 实现标准化错误码系统
2. 采用结构化错误响应格式
3. 增强错误日志记录
4. 支持错误监控和报告

## 性能优化重点

1. **数据库查询优化**：
   - 优化SQL查询
   - 添加适当索引
   - 实现查询缓存
   - 批量处理大量记录

2. **并发请求处理**：
   - 使用连接池
   - 实现请求节流和限速
   - 优化锁机制减少竞争
   - 监控并发性能瓶颈

3. **内存管理**：
   - 优化大对象处理
   - 实现资源池化
   - 控制内存泄漏
   - 监控内存使用情况

## 测试策略

1. **单元测试**：
   - 使用Jest或Mocha测试框架
   - 为核心服务编写单元测试
   - 模拟外部依赖
   - 测试异常和边界情况

2. **集成测试**：
   - 测试服务间交互
   - 验证数据流正确性
   - 测试系统级功能
   - 模拟真实使用场景

3. **性能测试**：
   - 基准测试核心功能
   - 压力测试并发处理能力
   - 测试不同负载下的性能
   - 识别和解决性能瓶颈

## 文档要求

为迁移的服务提供以下文档：

1. 服务功能和责任
2. API接口规范
3. 数据模型和关系
4. 错误处理机制
5. 性能优化建议
6. 示例代码和使用场景

## 重构日志

| 日期 | 工作内容 | 状态 | 负责人 |
|------|---------|------|-------|
| 2023-12-05 | 初始化服务器模块重构计划 | 完成 | 团队 |
| 2023-12-20 | 完成日志服务迁移 | 完成 | AI助手 |
| 2024-01-15 | API服务框架设计 | 进行中 | AI助手 |
| 2024-01-30 | 事件系统重构 | 进行中 | 团队 |

## 注意事项

- 确保在重构过程中不影响现有功能
- 为每个迁移的服务添加完整的单元测试
- 监控服务性能指标，及时发现问题
- 遵循最小权限原则设计服务接口
- 服务调用链中考虑超时和失败处理
- 保持清晰的依赖关系，避免循环依赖 