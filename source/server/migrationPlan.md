# 服务器模块迁移计划

## 目录结构迁移

我们已经创建了新的目录结构，按照功能和职责进行了更清晰的组织：

```
source/server/
├── bootstrap/                 # 启动和初始化相关
│   ├── index.js               # 主入口点
│   ├── serverStarter.js       # 服务器启动（替代server.js）
│   ├── initializer.js         # 初始化逻辑（替代init.js）
│   └── preload.js             # 预加载脚本
│
├── api/                       # API相关
│   ├── router.js              # 主路由定义（替代endPoints.js）
│   ├── apiService.js          # API服务实现
│   ├── backendEvents.js       # 后端事件系统
│   └── handlers/              # API处理器
│
├── services/                  # 核心服务实现
│   ├── fs/                    # 文件系统服务
│   ├── db/                    # 数据库服务
│   ├── thumbnail/             # 缩略图服务
│   ├── color/                 # 颜色分析服务
│   ├── license/               # 许可证服务
│   └── logger/                # 日志服务
│
├── utils/                     # 工具函数
├── middlewares/               # 中间件
└── processors/                # 数据处理器
```

## 迁移步骤

### 第一阶段：结构调整（当前）

1. ✅ 创建新的目录结构
2. ✅ 创建基础服务框架（fs、db、logger等）
3. ✅ 创建bootstrap目录下的入口文件
4. ✅ 创建API相关结构

### 第二阶段：功能迁移（待进行）

1. 替换入口文件引用
   - 修改`index.html`中的引用，从原来的`init.js`改为`bootstrap/index.js`

2. 服务初始化迁移
   - 将现有的`main.js`功能迁移到`bootstrap`目录下的对应文件

3. API服务迁移
   - 将现有handlers依次迁移到新的目录结构
   - 更新路由引用关系

4. 数据处理器迁移
   - 将`processors`下的功能依次迁移到对应的`services`

### 第三阶段：优化和测试（待进行）

1. 功能测试
   - 确保所有功能正常工作
   - 修复迁移过程中发现的问题

2. 代码清理
   - 移除不再使用的旧文件
   - 统一代码风格和命名规范

3. 性能优化
   - 识别并解决性能瓶颈
   - 优化缓存机制

## 迁移原则

1. **渐进式迁移**：逐步替换组件，而不是一次性全部替换
2. **向后兼容**：确保现有功能不受影响
3. **单一职责**：每个服务和模块只负责一个明确的功能领域
4. **函数式风格**：优先使用函数而非类，减少状态管理复杂性
5. **清晰命名**：使用描述性名称，避免使用无语义的文件名
6. **统一导出**：使用命名导出而非默认导出

## 功能对应表

| 旧文件/目录           | 新位置                           | 状态    |
|---------------------|----------------------------------|---------|
| server.js           | bootstrap/serverStarter.js       | ✅ 已创建 |
| init.js             | bootstrap/initializer.js         | ✅ 已创建 |
| main.js             | bootstrap/index.js               | ✅ 已创建 |
| endPoints.js        | api/router.js                    | ✅ 已创建 |
| apiService.js       | api/apiService.js                | ✅ 已创建 |
| backendEvents.js    | api/backendEvents.js             | ✅ 已创建 |
| licenseChecker.js   | services/license/licenseChecker.js | ✅ 已创建 |
| logger.js           | services/logger/loggerService.js | ✅ 已创建 |
| dataBase/           | services/db/                     | ✅ 已创建 |
| handlers/           | api/handlers/                    | 待迁移   |
| processors/color/   | services/color/                  | ✅ 已创建 |
| processors/thumbnail/ | services/thumbnail/            | ✅ 已创建 |
| processors/fs/      | services/fs/                     | ✅ 已创建 |
| middlewares/        | middlewares/                     | 保持不变 |

## 注意事项

1. **保持引用路径**：确保所有import和require语句正确更新
2. **避免循环依赖**：检查并解决可能的循环依赖问题
3. **增量测试**：每迁移一个组件就进行测试
4. **文档同步**：更新相关文档以反映新的结构

## 完成标志

1. 所有功能正常工作，无regression bugs
2. 所有旧文件已迁移或废弃
3. 代码结构清晰，职责分明
4. 测试覆盖关键功能
5. 文档已更新 