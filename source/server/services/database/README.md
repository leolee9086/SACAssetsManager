# 数据库服务

## 服务说明

数据库服务是资源管理系统的核心组件，负责所有数据的持久化存储和检索。该服务提供统一的数据访问接口，支持各种数据操作，如资源元数据存储、标签管理、颜色数据索引、用户偏好等。服务设计为轻量级封装，可以适应不同的存储后端。

## 功能

- 资源元数据管理（文件信息、属性、EXIF数据等）
- 标签和分类管理
- 颜色数据索引存储
- 用户设置和偏好存储
- 查询构建器API
- 事务支持
- 数据迁移和版本控制
- 缓存集成
- 批量操作支持

## 文件结构

- `dbService.js` - 主服务实现，提供统一数据访问接口
- `dbConnection.js` - 数据库连接管理
- `migrations/` - 数据库迁移脚本目录
- `models/` - 数据模型定义
  - `resourceModel.js` - 资源数据模型
  - `tagModel.js` - 标签数据模型
  - `colorModel.js` - 颜色数据模型
  - `settingModel.js` - 设置数据模型
- `queries/` - 预定义查询集合

## 配置项

数据库服务的配置位于`config/default.js`中：

```javascript
database: {
    // 数据库类型: 'sqlite', 'nedb', 或 'memory'
    type: 'sqlite',
    
    // SQLite配置
    sqlite: {
        // 数据库文件路径
        filename: './data/resourcedb.sqlite',
        // 数据库连接选项
        options: {
            // 是否自动创建表
            autoCreateTables: true,
            // 最大连接数
            poolSize: 5,
            // 超时设置（毫秒）
            timeout: 5000
        }
    },
    
    // NeDB配置（文件型NoSQL数据库）
    nedb: {
        // 数据文件目录
        directory: './data/nedb',
        // 文件扩展名
        extension: '.db',
        // 是否压缩数据
        compressed: false
    },
    
    // 缓存设置
    cache: {
        // 是否启用缓存
        enabled: true,
        // 缓存过期时间（毫秒）
        ttl: 300000,
        // 最大缓存项数
        maxItems: 1000
    },
    
    // 查询限制
    queryLimits: {
        // 默认页大小
        defaultPageSize: 100,
        // 最大页大小
        maxPageSize: 1000
    }
}
```

## API参考

### 数据库连接

```javascript
/**
 * 初始化数据库连接
 * @returns {Promise<void>}
 */
async initialize()

/**
 * 关闭数据库连接
 * @returns {Promise<void>}
 */
async close()

/**
 * 检查数据库连接状态
 * @returns {boolean} 连接是否可用
 */
isConnected()
```

### 资源操作

```javascript
/**
 * 保存资源元数据
 * @param {Object} resource - 资源对象
 * @param {string} resource.path - 资源路径
 * @param {Object} [resource.metadata] - 元数据
 * @param {Array<string>} [resource.tags] - 标签数组
 * @param {Array<Object>} [resource.colors] - 颜色数组
 * @returns {Promise<Object>} 保存后的资源对象（包含ID）
 */
async saveResource(resource)

/**
 * 获取资源元数据
 * @param {string} id - 资源ID或路径
 * @returns {Promise<Object|null>} 资源对象或null（未找到）
 */
async getResource(id)

/**
 * 更新资源元数据
 * @param {string} id - 资源ID或路径
 * @param {Object} updates - 更新内容
 * @returns {Promise<Object>} 更新后的资源对象
 */
async updateResource(id, updates)

/**
 * 删除资源元数据
 * @param {string} id - 资源ID或路径
 * @returns {Promise<boolean>} 删除成功返回true
 */
async deleteResource(id)
```

### 查询构建器

```javascript
/**
 * 创建资源查询构建器
 * @returns {QueryBuilder} 查询构建器实例
 */
createQuery()

// 链式调用示例
const resources = await db.createQuery()
    .where('type', '==', 'image')
    .where('size', '>', 1000000)
    .orderBy('createDate', 'desc')
    .limit(50)
    .offset(100)
    .execute();
```

### 标签操作

```javascript
/**
 * 获取所有标签
 * @returns {Promise<Array<Object>>} 标签对象数组
 */
async getAllTags()

/**
 * 为资源添加标签
 * @param {string} resourceId - 资源ID
 * @param {Array<string>} tags - 要添加的标签
 * @returns {Promise<Array<string>>} 更新后的标签数组
 */
async addTags(resourceId, tags)

/**
 * 从资源移除标签
 * @param {string} resourceId - 资源ID
 * @param {Array<string>} tags - 要移除的标签
 * @returns {Promise<Array<string>>} 更新后的标签数组
 */
async removeTags(resourceId, tags)
```

### 颜色操作

```javascript
/**
 * 保存资源颜色数据
 * @param {string} resourceId - 资源ID
 * @param {Array<Object>} colors - 颜色数组
 * @returns {Promise<boolean>} 保存成功返回true
 */
async saveColors(resourceId, colors)

/**
 * 获取资源颜色数据
 * @param {string} resourceId - 资源ID
 * @returns {Promise<Array<Object>>} 颜色数组
 */
async getColors(resourceId)

/**
 * 按颜色搜索资源
 * @param {Object} color - 颜色对象
 * @param {Object} options - 搜索选项
 * @returns {Promise<Array<Object>>} 匹配的资源数组
 */
async searchByColor(color, options)
```

### 事务操作

```javascript
/**
 * 在事务中执行操作
 * @param {Function} callback - 事务回调函数
 * @returns {Promise<any>} 事务结果
 */
async transaction(callback)

// 使用示例
await db.transaction(async (tx) => {
    const resource = await tx.getResource(id);
    resource.metadata.processed = true;
    await tx.updateResource(id, resource);
    await tx.addTags(id, ['processed']);
});
```

## 使用示例

### 资源保存和检索

```javascript
import { dbService } from '../services/database/dbService.js';

// 保存资源元数据
try {
    const resource = await dbService.saveResource({
        path: '/path/to/image.jpg',
        metadata: {
            width: 1920,
            height: 1080,
            createDate: new Date(),
            size: 2500000,
            type: 'image/jpeg'
        },
        tags: ['风景', '自然', '旅行'],
        colors: [
            { hex: '#336699', rgb: { r: 51, g: 102, b: 153 } },
            { hex: '#EECC88', rgb: { r: 238, g: 204, b: 136 } }
        ]
    });
    
    console.log(`资源已保存，ID: ${resource.id}`);
} catch (error) {
    console.error(`资源保存失败: ${error.message}`);
}

// 检索资源元数据
try {
    const resource = await dbService.getResource('/path/to/image.jpg');
    if (resource) {
        console.log(`找到资源: ${resource.path}`);
        console.log(`创建日期: ${resource.metadata.createDate}`);
        console.log(`标签: ${resource.tags.join(', ')}`);
    } else {
        console.log('资源未找到');
    }
} catch (error) {
    console.error(`检索资源失败: ${error.message}`);
}
```

### 复杂查询

```javascript
import { dbService } from '../services/database/dbService.js';

// 查询大于5MB的图像文件，按创建日期排序
try {
    const results = await dbService.createQuery()
        .where('metadata.type', 'startsWith', 'image/')
        .where('metadata.size', '>', 5 * 1024 * 1024)
        .where('tags', 'contains', '高质量')
        .orderBy('metadata.createDate', 'desc')
        .limit(20)
        .execute();
    
    console.log(`找到 ${results.length} 个匹配资源`);
    results.forEach(resource => {
        console.log(`- ${resource.path} (${resource.metadata.size} 字节)`);
    });
} catch (error) {
    console.error(`查询失败: ${error.message}`);
}
```

### 标签管理

```javascript
import { dbService } from '../services/database/dbService.js';

// 获取所有标签及其使用次数
try {
    const tags = await dbService.getAllTags();
    console.log('系统中的标签:');
    tags.forEach(tag => {
        console.log(`- ${tag.name} (${tag.count} 资源)`);
    });
} catch (error) {
    console.error(`获取标签失败: ${error.message}`);
}

// 批量更新资源标签
try {
    const resourceId = 'resource123';
    // 添加标签
    await dbService.addTags(resourceId, ['设计', '作品集']);
    // 移除标签
    await dbService.removeTags(resourceId, ['临时']);
    
    // 获取更新后的资源
    const resource = await dbService.getResource(resourceId);
    console.log(`更新后的标签: ${resource.tags.join(', ')}`);
} catch (error) {
    console.error(`标签更新失败: ${error.message}`);
}
```

## 数据模型

### 资源模型

```javascript
{
    // 资源ID (自动生成)
    id: 'res_12345',
    // 资源路径
    path: '/path/to/file.jpg',
    // 资源元数据
    metadata: {
        // 文件属性
        filename: 'file.jpg',
        size: 1500000,
        createDate: '2023-04-15T10:30:00Z',
        modifyDate: '2023-04-15T10:30:00Z',
        type: 'image/jpeg',
        
        // 图像属性 (针对图像)
        width: 1920,
        height: 1080,
        
        // EXIF数据 (针对照片)
        exif: {
            camera: 'Canon EOS R5',
            exposureTime: '1/125',
            aperture: 'f/2.8',
            iso: 100,
            // ... 其他EXIF数据
        }
    },
    // 标签数组
    tags: ['风景', '旅行', '自然'],
    // 颜色数组
    colors: [
        { hex: '#336699', rgb: { r: 51, g: 102, b: 153 } },
        { hex: '#EECC88', rgb: { r: 238, g: 204, b: 136 } }
    ],
    // 系统记录
    system: {
        createdAt: '2023-04-15T10:35:00Z',
        updatedAt: '2023-04-15T10:35:00Z',
        indexed: true,
        version: 1
    }
}
```

### 标签模型

```javascript
{
    // 标签名
    name: '旅行',
    // 引用计数
    count: 42,
    // 最后使用时间
    lastUsed: '2023-04-15T10:35:00Z',
    // 相关标签 (基于共现频率)
    related: ['风景', '自然', '度假']
}
```

## 存储后端

数据库服务支持以下存储后端：

1. **SQLite** - 默认后端，支持复杂查询和全文搜索
   - 优点：性能好，支持事务，SQL查询强大
   - 适用场景：大多数生产环境

2. **NeDB** - 基于文件的NoSQL数据库
   - 优点：轻量级，无需安装，简单部署
   - 适用场景：简单应用，快速开发

3. **内存存储** - 仅用于测试
   - 优点：超快速度，简单实现
   - 适用场景：单元测试，功能验证

## 性能优化

为提高性能，数据库服务采用以下优化策略：

1. **查询缓存** - 缓存常用查询结果，减少数据库访问
2. **索引优化** - 自动为常用字段创建索引
3. **连接池** - 使用数据库连接池管理连接
4. **批量操作** - 支持批量插入和更新，减少事务开销
5. **延迟加载** - 支持按需加载大型数据集
6. **查询优化** - 自动优化查询计划

## 数据一致性与备份

服务提供以下数据保护机制：

1. **事务支持** - 确保复杂操作的原子性
2. **自动备份** - 定期备份数据库文件
3. **迁移脚本** - 安全升级数据库结构
4. **验证层** - 数据存储前进行验证
5. **错误恢复** - 提供恢复到上一致状态的机制

## 未来改进

1. 实现分布式数据存储支持，提高可扩展性
2. 添加更多数据库后端选项（MongoDB, MySQL等）
3. 增强全文搜索功能，支持更复杂的搜索语法
4. 实现数据同步机制，支持多设备同步
5. 添加数据统计和分析功能 