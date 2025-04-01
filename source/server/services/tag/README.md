# 标签服务

## 服务说明

标签服务是资源管理系统的关键组件，负责管理资源的分类、组织和检索。通过提供丰富的标签管理功能，该服务使用户能够灵活地对资源进行归类，建立有意义的组织结构，并通过标签快速检索相关资源。

## 功能

- 标签的创建、更新、删除和查询
- 资源与标签的关联与解除
- 标签层次结构管理（支持父子关系）
- 自动标签建议
- 标签统计与分析
- 批量标签操作
- 标签导入导出
- 标签同义词管理
- 智能标签匹配

## 文件结构

- `tagService.js` - 主服务实现，提供标签管理的核心功能
- `tagRelations.js` - 标签关系管理，处理标签之间的层次和关联
- `tagSuggestion.js` - 标签建议生成，提供智能标签推荐
- `tagExport.js` - 标签导入导出功能
- `tagUtils.js` - 标签工具函数，提供标签处理的辅助功能

## 配置项

标签服务的配置位于`config/default.js`中：

```javascript
tag: {
    // 标签系统设置
    system: {
        // 是否启用层次标签
        hierarchical: true,
        // 是否启用同义词标签
        synonymsEnabled: true,
        // 标签分隔符（用于层次标签）
        separator: '/',
        // 最大标签长度
        maxTagLength: 50,
        // 最大标签数（每个资源）
        maxTagsPerResource: 100
    },
    // 自动标签建议设置
    suggestion: {
        // 是否启用
        enabled: true,
        // 最大建议数量
        maxSuggestions: 10,
        // 最小置信度
        minConfidence: 0.5,
        // 来源权重
        sourceWeights: {
            filename: 0.8,
            content: 0.6,
            similar: 0.7,
            exif: 0.5
        }
    },
    // 标签云设置
    cloud: {
        // 最小字体大小
        minFontSize: 12,
        // 最大字体大小
        maxFontSize: 30,
        // 最大显示标签数
        maxTags: 100
    }
}
```

## API参考

### 标签基本操作

```javascript
/**
 * 创建新标签
 * @param {string} name - 标签名称
 * @param {Object} [options] - 标签选项
 * @param {string} [options.description] - 标签描述
 * @param {string} [options.color] - 标签颜色
 * @param {string} [options.parent] - 父标签名称
 * @returns {Promise<Object>} 创建的标签对象
 */
async createTag(name, options)

/**
 * 更新标签信息
 * @param {string} name - 标签名称
 * @param {Object} updates - 更新内容
 * @returns {Promise<Object>} 更新后的标签对象
 */
async updateTag(name, updates)

/**
 * 删除标签
 * @param {string} name - 标签名称
 * @param {Object} [options] - 删除选项
 * @param {boolean} [options.removeFromResources=true] - 是否从资源中移除
 * @returns {Promise<boolean>} 删除成功返回true
 */
async deleteTag(name, options)

/**
 * 获取标签信息
 * @param {string} name - 标签名称
 * @returns {Promise<Object|null>} 标签对象或null（未找到）
 */
async getTag(name)

/**
 * 获取所有标签
 * @param {Object} [options] - 查询选项
 * @param {string} [options.sortBy='name'] - 排序字段
 * @param {boolean} [options.includeCount=true] - 是否包含使用计数
 * @returns {Promise<Array<Object>>} 标签对象数组
 */
async getAllTags(options)
```

### 资源标签操作

```javascript
/**
 * 为资源添加标签
 * @param {string} resourceId - 资源ID
 * @param {Array<string>} tags - 要添加的标签
 * @param {Object} [options] - 选项
 * @param {boolean} [options.createMissing=true] - 是否创建不存在的标签
 * @returns {Promise<Array<string>>} 更新后的标签数组
 */
async addTagsToResource(resourceId, tags, options)

/**
 * 从资源移除标签
 * @param {string} resourceId - 资源ID
 * @param {Array<string>} tags - 要移除的标签
 * @returns {Promise<Array<string>>} 更新后的标签数组
 */
async removeTagsFromResource(resourceId, tags)

/**
 * 设置资源的标签（替换现有标签）
 * @param {string} resourceId - 资源ID
 * @param {Array<string>} tags - 标签数组
 * @returns {Promise<Array<string>>} 设置后的标签数组
 */
async setResourceTags(resourceId, tags)

/**
 * 获取资源的标签
 * @param {string} resourceId - 资源ID
 * @returns {Promise<Array<string>>} 标签数组
 */
async getResourceTags(resourceId)

/**
 * 按标签查找资源
 * @param {string|Array<string>} tags - 标签或标签数组
 * @param {Object} [options] - 查询选项
 * @param {string} [options.operator='AND'] - 查询操作符 ('AND'/'OR')
 * @param {number} [options.limit] - 结果数量限制
 * @returns {Promise<Array<Object>>} 匹配的资源数组
 */
async findResourcesByTags(tags, options)
```

### 标签层次与关系

```javascript
/**
 * 创建父子标签关系
 * @param {string} parentTag - 父标签名称
 * @param {string} childTag - 子标签名称
 * @returns {Promise<boolean>} 操作成功返回true
 */
async createTagRelation(parentTag, childTag)

/**
 * 移除父子标签关系
 * @param {string} parentTag - 父标签名称
 * @param {string} childTag - 子标签名称
 * @returns {Promise<boolean>} 操作成功返回true
 */
async removeTagRelation(parentTag, childTag)

/**
 * 获取标签的所有子标签
 * @param {string} parentTag - 父标签名称
 * @param {boolean} [recursive=false] - 是否递归获取所有后代
 * @returns {Promise<Array<Object>>} 子标签对象数组
 */
async getChildTags(parentTag, recursive)

/**
 * 获取标签的所有父标签
 * @param {string} childTag - 子标签名称
 * @param {boolean} [recursive=false] - 是否递归获取所有祖先
 * @returns {Promise<Array<Object>>} 父标签对象数组
 */
async getParentTags(childTag, recursive)
```

### 标签同义词

```javascript
/**
 * 添加标签同义词
 * @param {string} tagName - 主标签名称
 * @param {string} synonym - 同义词
 * @returns {Promise<boolean>} 操作成功返回true
 */
async addTagSynonym(tagName, synonym)

/**
 * 移除标签同义词
 * @param {string} tagName - 主标签名称
 * @param {string} synonym - 同义词
 * @returns {Promise<boolean>} 操作成功返回true
 */
async removeTagSynonym(tagName, synonym)

/**
 * 获取标签的所有同义词
 * @param {string} tagName - 标签名称
 * @returns {Promise<Array<string>>} 同义词数组
 */
async getTagSynonyms(tagName)
```

### 标签建议

```javascript
/**
 * 为资源生成标签建议
 * @param {string} resourceId - 资源ID
 * @param {Object} [options] - 选项
 * @param {number} [options.limit=10] - 建议数量
 * @param {Array<string>} [options.sources] - 建议来源（'filename', 'content', 'similar', 'exif'）
 * @returns {Promise<Array<Object>>} 建议标签数组（带置信度）
 */
async suggestTags(resourceId, options)

/**
 * 获取与现有标签相关的标签建议
 * @param {Array<string>} existingTags - 现有标签数组
 * @param {number} [limit=5] - 建议数量
 * @returns {Promise<Array<string>>} 建议标签数组
 */
async suggestRelatedTags(existingTags, limit)
```

### 标签统计和分析

```javascript
/**
 * 获取标签使用统计
 * @param {Object} [options] - 选项
 * @param {number} [options.limit] - 结果数量限制
 * @param {string} [options.sortBy='count'] - 排序字段
 * @returns {Promise<Array<Object>>} 标签统计数组
 */
async getTagStats(options)

/**
 * 获取标签使用趋势
 * @param {string} tagName - 标签名称
 * @param {string} timeRange - 时间范围（'day', 'week', 'month', 'year'）
 * @returns {Promise<Array<Object>>} 时间序列数据
 */
async getTagTrend(tagName, timeRange)

/**
 * 获取共现标签
 * @param {string} tagName - 标签名称
 * @param {number} [limit=10] - 结果数量限制
 * @returns {Promise<Array<Object>>} 共现标签数组（带共现次数）
 */
async getCoOccurringTags(tagName, limit)

/**
 * 生成标签云数据
 * @param {Object} [options] - 选项
 * @param {number} [options.limit=100] - 最大标签数
 * @returns {Promise<Array<Object>>} 标签云数据
 */
async generateTagCloud(options)
```

## 使用示例

### 标签管理

```javascript
import { tagService } from '../services/tag/tagService.js';

// 创建标签
try {
    const tag = await tagService.createTag('设计作品', {
        description: '设计相关的作品和资源',
        color: '#3498db',
        parent: '作品'
    });
    
    console.log(`标签创建成功: ${tag.name}`);
} catch (error) {
    console.error(`标签创建失败: ${error.message}`);
}

// 获取所有标签（按使用次数排序）
try {
    const tags = await tagService.getAllTags({
        sortBy: 'count',
        includeCount: true
    });
    
    console.log('系统中的标签:');
    tags.forEach(tag => {
        console.log(`- ${tag.name} (${tag.count}次使用)`);
        if (tag.description) {
            console.log(`  描述: ${tag.description}`);
        }
    });
} catch (error) {
    console.error(`获取标签失败: ${error.message}`);
}
```

### 资源标签管理

```javascript
import { tagService } from '../services/tag/tagService.js';

// 为资源添加标签
try {
    const resourceId = 'resource123';
    const updatedTags = await tagService.addTagsToResource(
        resourceId,
        ['设计', 'UI/UX', '插画'],
        { createMissing: true }
    );
    
    console.log(`资源 ${resourceId} 更新后的标签: ${updatedTags.join(', ')}`);
} catch (error) {
    console.error(`添加标签失败: ${error.message}`);
}

// 按标签查找资源
try {
    const resources = await tagService.findResourcesByTags(
        ['设计', '插画'],
        { operator: 'AND', limit: 20 }
    );
    
    console.log(`找到 ${resources.length} 个同时包含"设计"和"插画"标签的资源`);
    resources.forEach(resource => {
        console.log(`- ${resource.path}`);
    });
} catch (error) {
    console.error(`标签搜索失败: ${error.message}`);
}
```

### 层次标签与关系

```javascript
import { tagService } from '../services/tag/tagService.js';

// 创建标签层次结构
try {
    // 创建主标签
    await tagService.createTag('设计');
    
    // 创建子标签
    await tagService.createTag('UI设计');
    await tagService.createTag('平面设计');
    await tagService.createTag('网页设计');
    
    // 建立父子关系
    await tagService.createTagRelation('设计', 'UI设计');
    await tagService.createTagRelation('设计', '平面设计');
    await tagService.createTagRelation('设计', '网页设计');
    
    // 获取设计标签的所有子标签
    const childTags = await tagService.getChildTags('设计');
    console.log(`"设计"的子标签: ${childTags.map(tag => tag.name).join(', ')}`);
} catch (error) {
    console.error(`标签层次操作失败: ${error.message}`);
}
```

### 标签建议

```javascript
import { tagService } from '../services/tag/tagService.js';

// 为资源获取标签建议
try {
    const resourceId = 'image123';
    const suggestions = await tagService.suggestTags(resourceId, {
        limit: 8,
        sources: ['filename', 'similar', 'exif']
    });
    
    console.log(`为资源 ${resourceId} 推荐的标签:`);
    suggestions.forEach(suggestion => {
        console.log(`- ${suggestion.tag} (置信度: ${suggestion.confidence.toFixed(2)})`);
    });
} catch (error) {
    console.error(`获取标签建议失败: ${error.message}`);
}

// 获取相关标签建议
try {
    const relatedTags = await tagService.suggestRelatedTags(['自然', '风景'], 5);
    console.log(`与"自然"和"风景"相关的标签: ${relatedTags.join(', ')}`);
} catch (error) {
    console.error(`获取相关标签失败: ${error.message}`);
}
```

## 数据模型

### 标签模型

```javascript
{
    // 标签名称 (唯一标识符)
    name: '设计',
    // 标签描述
    description: '设计相关的资源',
    // 显示颜色 (十六进制)
    color: '#3498db',
    // 使用次数
    count: 156,
    // 父标签列表
    parents: ['创意'],
    // 子标签列表
    children: ['UI设计', '平面设计', '网页设计'],
    // 同义词列表
    synonyms: ['design', '设计艺术'],
    // 系统记录
    system: {
        createdAt: '2023-04-15T10:35:00Z',
        updatedAt: '2023-04-16T14:20:00Z',
        createdBy: 'user1'
    }
}
```

### 资源标签关联模型

```javascript
{
    // 资源ID
    resourceId: 'res_12345',
    // 标签名称
    tagName: '设计',
    // 添加时间
    addedAt: '2023-04-15T10:35:00Z',
    // 添加方式 ('manual', 'auto', 'import')
    addedBy: 'manual',
    // 置信度 (对于自动添加的标签)
    confidence: 0.95
}
```

## 依赖说明

标签服务依赖以下组件：

1. 数据库服务 - 用于存储和检索标签数据
2. 配置管理器 - 获取标签系统配置
3. 日志服务 - 记录标签操作日志
4. 文件系统服务 - 用于处理标签导入导出

## 标签建议算法

服务使用以下算法为资源生成标签建议：

1. **基于文件名** - 从文件名中提取关键词
2. **基于相似资源** - 从相似资源的标签中推荐
3. **基于内容** - 从文件内容中提取关键信息
4. **基于EXIF数据** - 从图像EXIF数据中提取信息
5. **基于协同过滤** - 基于用户行为和标签共现分析

## 性能优化

为提高性能，标签服务采用以下优化策略：

1. 标签缓存 - 缓存常用标签和统计信息
2. 层次索引 - 为标签层次关系建立高效索引
3. 批量操作 - 支持批量添加和删除标签，减少操作开销
4. 查询优化 - 针对标签搜索优化查询计划
5. 异步处理 - 标签统计和分析任务异步执行

## 未来改进

1. 实现机器学习驱动的标签自动分类系统
2. 添加自然语言处理能力，支持从内容提取更准确的标签
3. 实现标签系统的多语言支持
4. 增强标签可视化功能，提供更丰富的标签关系图
5. 支持更复杂的标签规则和自动化工作流 