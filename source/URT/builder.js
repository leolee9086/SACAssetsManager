/**
 * URT 资源类型枚举
 * @readonly
 * @enum {string}
 */
export const URTResourceType = {
  FILE: 'file',
  FOLDER: 'folder',
  FEED: 'feed',
  BOOKMARK: 'bookmark',
  COLLECTION: 'collection'
};

/**
 * URT 存储驱动类型枚举
 * @readonly
 * @enum {string}
 */
export const URTDriverType = {
  LOCAL: 'local',
  HTTP: 'http',
  FTP: 'ftp',
  WEBDAV: 'webdav',
  S3: 's3',
  ONEDRIVE: 'onedrive',
  GDRIVE: 'gdrive',
  RSS: 'rss'
};

/**
 * URT 元数据
 * @typedef {Object} URTMeta
 * @property {string} id - 唯一标识符
 * @property {string} created - 创建时间戳
 * @property {string} [modified] - 最后修改时间戳
 * @property {boolean} [isDirectory] - 是否为目录
 * @property {boolean} [isVirtual] - 是否为虚拟目录
 * @property {string} [thumb] - 缩略图URL或路径
 * @property {Object} [stats] - 资源统计信息
 * @property {number} [stats.size] - 文件大小(bytes)
 * @property {string} [stats.hash] - 内容哈希值
 * @property {string} [stats.encoding] - 文件编码
 */

/**
 * URT 关系定义
 * @typedef {Object} URTRelation
 * @property {string} [parent] - 父��源ID
 * @property {string[]} [references] - 引用的其他资源ID
 * @property {string} [derivedFrom] - 派生自哪个资源ID
 * @property {string[]} [versions] - 其他版本的资源ID
 * @property {Object} [graph] - 资源关系图
 */

/**
 * 访问级别枚举
 * @readonly
 * @enum {string}
 */
export const URTAccessLevel = {
  PUBLIC: 'public',      // 元信息公开，需要基础授权下载
  PROTECTED: 'protected', // 元信息和内容都需要授权可见
  PRIVATE: 'private'     // 仅管理员确认后可见
};

/**
 * 授权类型枚举
 * @readonly
 * @enum {string}
 */
export const URTAuthType = {
  FREE: 'free',         // 免费授权用户(基础下载权限)
  PREMIUM: 'premium',   // 付费授权用户(完整访问权限)
  TOKEN: 'token'        // Token授权(临时完整权限)
};

/**
 * URT 权限定义
 * @typedef {Object} URTPermission
 * @property {string} owner - 所有者ID
 * @property {URTAccessLevel} level - 访问级别
 * @property {URTAuthType[]} allowedAuth - 允许的授权类型
 * @property {string} [accessToken] - 访问令牌(优先级最高)
 * @property {Date} [expiredAt] - 访问过期时间
 * @property {boolean} [requireAuth] - 是否需要授权才能下载(默认true)
 */

/**
 * URT 质量信息
 * @typedef {Object} URTQuality
 * @property {number} completeness - 数据完整度(0-1)
 * @property {number} confidence - 数据可信度(0-1)
 * @property {boolean} verified - 是否经过验证
 * @property {string[]} issues - 已知问题列表
 * @property {Object} validation - 验证结果
 */

/**
 * URT 阅读状态
 * @typedef {Object} URTReadingState
 * @property {number} progress - 阅读进度(0-1)
 * @property {Array<{text: string, position: number, createdAt: string}>} highlights - 高亮标注
 * @property {boolean} archived - 是否已归档
 * @property {boolean} favorite - 是否收藏
 * @property {string} addedAt - 添加时间
 * @property {string} [lastReadAt] - 最后阅读时间
 * @property {number} [readCount] - 阅读次数
 * @property {string} [note] - 笔记
 */

/**
 * URT 资源
 * @typedef {Object} URTResource
 * @property {URTResourceType} type - 资源类型
 * @property {URTDriverType} driver - 存储驱动类型
 * @property {string} name - 资源名称
 * @property {string} [path] - 资源完整路径
 * @property {string} [url] - 资源URL
 * @property {URTMeta} meta - 元数据
 * @property {URTProvenance} provenance - 溯源信息
 * @property {URTRelation} [relations] - 关系信息
 * @property {URTPermission} [permissions] - 权限信息
 * @property {URTQuality} [quality] - 质量信息
 * @property {Object} [domain] - 所属域信息
 * @property {string} [domain.id] - 域ID
 * @property {string} [domain.path] - 域内路径
 * @property {Object} [extra] - 额外属性
 * @property {number} [extra.size] - 文件大小
 * @property {string} [extra.mime] - MIME类型
 * @property {string} [extra.ext] - 扩展名
 * @property {string} [extra.icon] - 图标
 * @property {URTFeedConfig} [extra.feed] - RSS源信息
 * @property {Object} [extra.bookmark] - 书签信息
 * @property {URTReadingState} [extra.reading] - 阅读状态
 * @property {URTResource[]} [children] - 子资源
 */
import { generateContentId } from './identifier.js';
import { ValidationError } from './errors.js';

/**
 * @typedef {Object} URTProvenance
 * @property {string} source - 来源系统 (e.g. 'instapaper', 'pocket', 'edge')
 * @property {string} sourceId - 原系统中的ID
 * @property {string} importedAt - 导入时间
 * @property {string} importVersion - 导入工具版本
 * @property {Object} history - 变更历史
 * @property {Object} originalData - 原始数据快照
 */

/**
 * 验证资源基本属性
 * @param {Partial<URTResource>} resource 
 * @throws {ValidationError}
 */
function validateResource(resource) {
  if (!resource.name) {
    throw new ValidationError('资源名称不能为空');
  }
  
  if (resource.type && !['file', 'folder', 'feed', 'bookmark', 'collection'].includes(resource.type)) {
    throw new ValidationError('无效的资源类型');
  }

  if (resource.driver && !['local', 'http', 'ftp', 'webdav', 's3', 'onedrive', 'gdrive', 'rss'].includes(resource.driver)) {
    throw new ValidationError('无效的存储驱动类型');
  }
}

/**
 * 创建资源元数据
 * @param {Partial<URTMeta>} meta 
 * @param {Object} content 
 * @returns {URTMeta}
 */
function createMeta(meta = {}, content) {
  const timestamp = Date.now().toString();
  
  return {
    id: meta.id || generateContentId(content),
    created: meta.created || timestamp,
    modified: meta.modified || timestamp,
    isDirectory: Boolean(meta.isDirectory),
    isVirtual: Boolean(meta.isVirtual),
    thumb: meta.thumb || null,
    stats: meta.stats || {}
  };
}

/**
 * 创建基础资源对象
 * @param {Partial<URTResource>} resource 
 * @returns {URTResource}
 */
function createBaseResource(resource) {
  validateResource(resource);
  
  return {
    type: resource.type || 'file',
    driver: resource.driver || 'local',
    name: resource.name,
    path: resource.path || null,
    url: resource.url || null,
    extra: resource.extra || {},
    children: Array.isArray(resource.children) ? resource.children : []
  };
}

/**
 * 创建溯源信息
 * @param {Partial<URTResource>} resource 
 * @returns {URTProvenance}
 */
function createProvenance(resource) {
  const timestamp = new Date().toISOString();
  
  return {
    source: resource.provenance?.source || 'manual',
    sourceId: resource.provenance?.sourceId || null,
    importedAt: resource.provenance?.importedAt || timestamp,
    importVersion: resource.provenance?.importVersion || '1.0.0',
    history: Array.isArray(resource.provenance?.history) ? 
      resource.provenance.history : 
      [{
        action: 'created',
        timestamp,
        actor: 'system',
        details: {}
      }],
    originalData: resource.provenance?.originalData || null
  };
}

/**
 * 创建关系信息
 * @param {Partial<URTResource>} resource 
 * @returns {URTRelation}
 */
function createRelations(resource) {
  return {
    parent: resource.relations?.parent || null,
    references: Array.isArray(resource.relations?.references) ? 
      resource.relations.references : [],
    derivedFrom: resource.relations?.derivedFrom || null,
    versions: Array.isArray(resource.relations?.versions) ? 
      resource.relations.versions : [],
    graph: resource.relations?.graph || {}
  };
}

/**
 * 创建资源节点
 * @param {Partial<URTResource>} resource 
 * @returns {URTResource}
 */
function createResource(resource) {
  validateResource(resource);
  
  const baseResource = createBaseResource(resource);
  const result = {
    ...baseResource,
    meta: createMeta(resource.meta, baseResource),
    provenance: createProvenance(resource),
    relations: createRelations(resource),
    permissions: createPermissions(resource),
    quality: createQuality(resource)
  };

  // 添加域信息
  if (resource.domain) {
    result.domain = {
      id: resource.domain.id,
      path: resource.domain.path || '/'
    };
  }

  return result;
}

/**
 * 创建权限信息
 * @param {Partial<URTResource>} resource 
 * @returns {URTPermission}
 */
function createPermissions(resource) {
  // token 仅对非文件夹类型资源有效
  const canHaveToken = resource.type !== 'folder';
  
  return {
    owner: resource.permissions?.owner || 'system',
    level: resource.permissions?.level || 'private',
    allowedAuth: Array.isArray(resource.permissions?.allowedAuth) ? 
      resource.permissions.allowedAuth : ['free'],
    // token 仅在允许且非文件夹时可用
    accessToken: canHaveToken ? resource.permissions?.accessToken : null,
    // token 必须设置过期时间
    expiredAt: canHaveToken && resource.permissions?.accessToken ? 
      (resource.permissions?.expiredAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) : // 默认7天过期
      null,
    requireAuth: resource.permissions?.requireAuth !== false
  };
}

/**
 * 创建资源访问令牌
 * @param {URTResource} resource 
 * @param {Object} options
 * @param {Date} [options.expiredAt] - 过期时间
 * @param {number} [options.validDays=7] - 有效天数
 * @returns {string|null} 
 */
function createAccessToken(resource, options = {}) {
  if (resource.type === 'folder') {
    return null; // 文件夹不支持token访问
  }

  const expiredAt = options.expiredAt || 
    new Date(Date.now() + (options.validDays || 7) * 24 * 60 * 60 * 1000);

  // 生成token的逻辑...
  const token = generateContentId({
    resourceId: resource.meta.id,
    expiredAt: expiredAt.toISOString(),
    timestamp: Date.now()
  });

  // 更新资源的token信息
  resource.permissions.accessToken = token;
  resource.permissions.expiredAt = expiredAt;

  return token;
}

/**
 * 验证访问令牌
 * @param {URTResource} resource 
 * @param {string} token 
 * @returns {boolean}
 */
function validateAccessToken(resource, token) {
  if (resource.type === 'folder') {
    return false;
  }

  const { accessToken, expiredAt } = resource.permissions;
  
  if (!accessToken || !expiredAt) {
    return false;
  }

  // 检查token是否匹配且未过期
  return accessToken === token && 
    new Date(expiredAt) > new Date();
}

/**
 * 创建质量信息
 * @param {Partial<URTResource>} resource 
 * @returns {URTQuality}
 */
function createQuality(resource) {
  return {
    completeness: resource.quality?.completeness || 1,
    confidence: resource.quality?.confidence || 1,
    verified: Boolean(resource.quality?.verified),
    issues: Array.isArray(resource.quality?.issues) ? resource.quality.issues : [],
    validation: resource.quality?.validation || {}
  };
}

/**
 * 创建目录节点
 * @param {string} name 
 * @param {string} path 
 * @param {Object} options 
 * @returns {URTResource}
 */
function createFolder(name, path, options = {}) {
  return createResource({
    type: 'folder',
    driver: options.driver || 'local',
    name,
    path,
    meta: {
      isDirectory: true
    },
    extra: {
      icon: options.icon || 'folder'
    }
  });
}

/**
 * 创建书签节点
 * @param {string} name 
 * @param {string} url 
 * @param {Object} options 
 * @returns {URTResource}
 */
function createBookmark(name, url, options = {}) {
  if (!url) {
    throw new ValidationError('书签URL不能为空');
  }

  return createResource({
    type: 'bookmark',
    driver: 'http',
    name,
    url,
    extra: {
      icon: options.icon || 'bookmark',
      description: options.description || '',
      tags: Array.isArray(options.tags) ? options.tags : [],
      favicon: options.favicon || null,
      reading: {
        progress: 0,
        highlights: [],
        archived: false,
        favorite: false,
        addedAt: new Date().toISOString()
      }
    }
  });
}

/**
 * RSS Feed 配置
 * @typedef {Object} URTFeedConfig
 * @property {string} [url] - RSS feed URL
 * @property {string} [siteUrl] - 网站 URL
 * @property {string} [language='zh-CN'] - 语言代码
 * @property {string} [ttl='60'] - 更新间隔（分钟）
 * @property {string} [description] - Feed 描述
 * @property {string} [copyright] - 版权信息
 * @property {string} [category] - 分类
 * @property {string} [generator='URT RSS Exporter'] - 生成器信息
 */

/**
 * 资源额外属性
 * @typedef {Object} URTExtra
 * @property {number} [size] - 文件大小
 * @property {string} [mime] - MIME类型
 * @property {string} [ext] - 扩展名
 * @property {string} [icon] - 图标
 * @property {URTFeedConfig} [feed] - RSS源信息
 * @property {Object} [bookmark] - 书签信息
 * @property {Object} [reading] - 阅读相关属性
 * @property {number} [reading.progress] - 阅读进度(0-1)
 * @property {string[]} [reading.highlights] - 高亮标注
 * @property {boolean} [reading.archived] - 是否已归档
 * @property {boolean} [reading.favorite] - 是否收藏
 * @property {string} [reading.addedAt] - 添加时间
 */

/**
 * 创建集合节点
 * @param {string} name - 集合名称
 * @param {Object} options - 配置选项
 * @param {string} [options.driver='local'] - 存储驱动类型
 * @param {string} [options.icon='collection'] - 图标
 * @param {string} [options.format='netscape'] - 导出格式
 * @param {string} [options.source] - 来源
 * @param {string} [options.feedUrl] - RSS feed URL
 * @param {string} [options.siteUrl] - 网站 URL
 * @param {string} [options.language] - 语言代码
 * @param {string} [options.ttl] - 更新间隔
 * @param {string} [options.description] - 描述
 * @param {string} [options.copyright] - 版权信息
 * @param {string} [options.category] - 分类
 * @returns {URTResource} 集合资源对象
 */
function createCollection(name, options = {}) {
  return createResource({
    type: 'collection',
    driver: options.driver || 'local',
    name,
    meta: {
      isDirectory: true,
      isVirtual: true
    },
    extra: {
      icon: options.icon || 'collection',
      format: options.format || 'netscape',
      source: options.source || null,
      feed: {
        url: options.feedUrl,
        siteUrl: options.siteUrl,
        language: options.language,
        ttl: options.ttl,
        description: options.description,
        copyright: options.copyright,
        category: options.category,
        generator: 'URT RSS Exporter'
      },
      reading: {
        progress: 0,
        highlights: [],
        archived: false,
        favorite: false,
        addedAt: new Date().toISOString()
      }
    }
  });
}

/**
 * URT 域定义
 * @typedef {Object} URTDomain
 * @property {string} id - 域ID (CID格式)
 * @property {string} name - 域名称
 * @property {string} type - 域类型 (personal|team|organization|public)
 * @property {Object} config - 域配置
 * @property {string[]} allowedTypes - 允许的资源类型
 * @property {Object} schema - 资源模式定义
 * @property {URTPermission} permissions - 域权限
 */

/**
 * 创建域
 * @param {string} name 
 * @param {Object} options 
 * @returns {URTDomain}
 */
export function createDomain(name, options = {}) {
  const domain = {
    id: generateContentId({ name, type: options.type || 'personal' }),
    name,
    type: options.type || 'personal',
    config: {
      storage: options.storage || 'local',
      indexing: options.indexing || 'basic',
      versioning: Boolean(options.versioning),
      ...options.config
    },
    allowedTypes: options.allowedTypes || ['file', 'folder', 'bookmark'],
    schema: options.schema || {},
    permissions: createPermissions(options)
  };
  
  return domain;
}

/**
 * URT 关系类型
 * @readonly
 * @enum {string}
 */
export const URTRelationType = {
  PARENT_CHILD: 'parent_child',    // 父子关系
  REFERENCE: 'reference',          // 引用关系
  DERIVED: 'derived',             // 派生关系
  VERSION: 'version',             // 版本关系
  LINK: 'link',                   // 链接关系
  EMBED: 'embed',                 // 嵌入关系
  DEPEND: 'depend'                // 依赖关系
};

/**
 * 关系图节点
 * @typedef {Object} URTGraphNode
 * @property {string} id - 资源ID (CID格式)
 * @property {URTRelationType} type - 关系类型
 * @property {Object} metadata - 关系元数据
 * @property {string} created - 关系创建时间
 */

/**
 * 创建关系图
 * @param {URTResource} source 
 * @param {URTResource} target 
 * @param {URTRelationType} type 
 * @param {Object} metadata 
 * @returns {URTGraphNode}
 */
export function createRelation(source, target, type, metadata = {}) {
  // 使用源和目标资源的内容生成关系ID
  const relationContent = {
    sourceId: source.meta.id,
    targetId: target.meta.id,
    type,
    timestamp: Date.now()
  };

  return {
    id: generateContentId(relationContent),
    type,
    metadata: {
      ...metadata,
      sourceType: source.type,
      targetType: target.type,
      domainId: source.domain?.id
    },
    created: new Date().toISOString()
  };
}

/**
 * 更新资源关系图
 * @param {URTResource} resource 
 * @param {URTGraphNode} relation 
 */
export function updateResourceGraph(resource, relation) {
  if (!resource.relations.graph) {
    resource.relations.graph = {};
  }
  
  const graphKey = `${relation.type}:${relation.id}`;
  resource.relations.graph[graphKey] = relation;
  
  // 更新资源的修改时间
  resource.meta.modified = new Date().toISOString();
}

/**
 * 内容索引结构
 * @typedef {Object} URTContentIndex
 * @property {string} content - 文本内容
 * @property {Object} vectors - 向量嵌入
 * @property {Array<{start: number, end: number, type: string}>} segments - 内容分段
 * @property {Object} metadata - 结构化元数据
 * @property {Object} semantic - 语义标注
 */

/**
 * 搜索上下文
 * @typedef {Object} URTSearchContext
 * @property {string} query - 搜索查询
 * @property {string} sessionId - 对话会话ID
 * @property {Array} history - 历史交互记录
 * @property {Object} filters - 搜索过滤条件
 */

/**
 * AI 交互上下文
 * @typedef {Object} URTAIContext
 * @property {Object} capabilities - AI 能力定义
 * @property {Array} allowedOperations - 允许的操作
 * @property {Object} memory - 上下��记忆
 * @property {Object} preferences - 交互偏好
 */

/**
 * AI 操作结果
 * @typedef {Object} URTAIResult
 * @property {boolean} success - 是否成功
 * @property {string} action - 执行的动作
 * @property {Object} changes - 产生的变更
 * @property {string} explanation - 操作说明
 */

export {
  createResource,
  createFolder,
  createBookmark,
  createCollection
};