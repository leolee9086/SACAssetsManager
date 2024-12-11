# URT (Universal Resource Type) 白皮书

## 摘要

URT (Universal Resource Type) 是一个统一资源类型系统,旨在为各类数字资源提供标准化的描述、组织和管理框架。它采用内容寻址和关系图的方式,实现了资源的唯一标识、版本控制、关系管理以及权限控制等核心功能。

## 1. 介绍

### 1.1 背景

用于管理多种资源类型,包括但不限于:
- 本地文件与文件夹
- 网络书签
- RSS 订阅源
- 云存储文件
- 知识收藏
- 文档集合

这些资源分散在不同的系统中,缺乏统一的管理方式,导致:
- 资源难以有效组织
- 关系难以建立
- 检索效率低下
- 数据难以迁移

### 1.2 设计目标

URT 系统旨在解决以下问题:
- 提供统一的资源描述模型
- 支持多样化的存储方式
- 实现资源间的关系管理
- 确保资源的可追溯性
- 支持灵活的权限控制
- 保证数据的可移植性

## 2. 核心概念

### 2.1 资源类型

URT 定义了以下基本资源类型:
- FILE: 文件资源
- FOLDER: 文件夹资源
- FEED: RSS 订阅源
- BOOKMARK: 网络书签
- COLLECTION: 资源集合

### 2.2 存储驱动

支持多种存储方式:
- LOCAL: 本地存储
- HTTP: HTTP 协议
- FTP: FTP 协议
- WEBDAV: WebDAV 协议
- S3: S3 兼容存储
- ONEDRIVE: OneDrive
- GDRIVE: Google Drive
- RSS: RSS 源

### 2.3 资源标识

采用内容寻址(CID)方式生成资源ID,确保:
- 资源的唯一性
- 内容的不可变性
- 版本的可追踪性

## 3. 资源模型

### 3.1 基础属性

每个 URT 资源包含以下基础属性:
- type: 资源类型(file/folder/feed/bookmark/collection)
- driver: 存储驱动类型(local/http/ftp/webdav/s3等)
- name: 资源名称
- path: 资源路径
- url: 资源URL(可选)
- meta: 元数据
- extra: 扩展属性

### 3.2 元数据 (URTMeta)

元数据包含:
- id: 内容寻址的唯一标识符(CID)
- created: 创建时间戳
- modified: 修改时间戳
- isDirectory: 是否为目录
- isVirtual: 是否为虚拟目录
- thumb: 缩略图
- stats: 统计信息
  - size: 文件大小(bytes)
  - hash: 内容哈希值
  - encoding: 文件编码

### 3.3 溯源信息 (URTProvenance)

溯源信息包含:
- source: 来源系统(如 instapaper/pocket/edge)
- sourceId: 原系统ID
- importedAt: 导入时间
- importVersion: 导入版本
- history: 变更历史
- originalData: 原始数据

### 3.4 关系模型

#### 3.4.1 关系类型
- PARENT_CHILD: 父子关系
- REFERENCE: 引用关系
- DERIVED: 派生关系
- VERSION: 版本关系
- LINK: 链接关系
- EMBED: 嵌入关系
- DEPEND: 依赖关系

#### 3.4.2 关系节点
- id: 关系唯一标识
- type: 关系类型
- metadata: 关系元数据
  - sourceType: 源资源类型
  - targetType: 目标资源类型
  - domainId: 所属域ID
- created: 关系创建时间

### 3.5 权限控制

权限定义包含:
- owner: 所有者ID
- readers: 可读用户ID列表
- writers: 可写用户ID列表
- public: 是否公开
- accessToken: 访问令牌(可选)
- expiredAt: 访问过期时间(可选)

### 3.6 质量管理

质量信息包含:
- completeness: 数据完整度(0-1)
- confidence: 数据可信度(0-1)
- verified: 是否经过验证
- issues: 已知问题列表
- validation: 验证结果

### 3.7 域管理

域定义包含:
- id: 域ID(CID格式)
- name: 域名称
- type: 域类型(personal/team/organization/public)
- config: 域配置
  - storage: 存储配置
  - indexing: 索引配置
  - versioning: 版本控制开关
- allowedTypes: 允许的资源类型
- schema: 资源模式定义
- permissions: 域权限设置

### 3.8 扩展属性

针对不同资源类型的扩展属性:

#### 3.8.1 通用扩展属性
- size: 文件大小
- mime: MIME类型
- ext: 扩展名
- icon: 图标

#### 3.8.2 Feed扩展属性
- url: RSS feed URL
- siteUrl: 网站URL
- language: 语言代码
- ttl: 更新间隔
- description: Feed描述
- copyright: 版权信息
- category: 分类
- generator: 生成器信息

#### 3.8.3 阅读状态属性
- progress: 阅读进度(0-1)
- highlights: 高亮标注列表
- archived: 是否已归档
- favorite: 是否收藏
- addedAt: 添加时间
- lastReadAt: 最后阅读时

## 4. 节点网络

### 4.1 节点身份

每个参与网络的节点包含以下身份信息:
- nodeId: 基于公钥生成的唯一标识
- profile: 节点资料
  - name: 显示名称
  - avatar: 头像URL
  - bio: 个人简介
  - tags: 兴趣标签列表
  - proof: 身份证明(可选)
- devices: 认证设备列表
  - id: 设备ID
  - type: 设备类型
  - lastSeen: 最后在线时间
- status: 节点状态
  - online: 在线状态
  - lastActive: 最后活跃时间
  - capabilities: 节点能力列表

### 4.2 网络拓扑

#### 4.2.1 节点关系
- peers: 直连节点
  - id: 节点ID
  - address: 网络地址
  - latency: 连接延迟
  - reliability: 可靠性评分
- groups: 群组关系
  - id: 群组ID
  - name: 群组名称
  - members: 成员列表
  - roles: 角色定义
- trust: 信任网络
  - level: 信任等级(0-1)
  - context: 信任场景
  - proof: 信任证明
  - history: 互动历史

## 5. 资源分发

### 5.1 发布机制

#### 5.1.1 可见性控制
- private: 仅自己可见
- trusted: 信任节点可见
- group: 指定群组可见
- public: 公开可见

#### 5.1.2 分发策略
- push: 主动推送模式
  - target: 目标节点
  - priority: 推送优先级
  - retry: 重试策略
- pull: 按需拉取模式
  - cache: 缓存策略
  - prefetch: 预取规则
- relay: 中继转发模式
  - hops: 中继跳数
  - path: 转发路径

#### 5.1.3 生命周期
- ttl: 生存时间
- revoke: 撤回机制
- archive: 归档策略

### 5.2 订阅机制

#### 5.2.1 订阅源
- feeds: 订阅源列表
  - id: 源标识
  - type: 源类型
  - url: 源地址
  - schedule: 更新计划

#### 5.2.2 过滤器
- type: 资源类型过滤
- tags: 标签过滤
- keywords: 关键词过滤
- rules: 自定义规则

#### 5.2.3 同步策略
- interval: 同步间隔
- conditions: 触发条件
- bandwidth: 带宽限制

## 6. 存储系统

### 6.1 本地存储

#### 6.1.1 存储配额
- total: 总容量限制
- used: 已用容量
- reserved: 预留空间
- alert: 告警阈值

#### 6.1.2 缓存策略
- size: 缓存容量
- policy: 淘汰策略
  - LRU: 最近最少使用
  - LFU: 最不经常使用
  - FIFO: 先进先出
- priority: 优先级规则
  - high: 高优先级
  - normal: 普通优先级
  - low: 低优先级

### 6.2 分布式存储

#### 6.2.1 分片策略
- method: 分片方法
- size: 分片大小
- distribution: 分布策略

#### 6.2.2 副本策略
- count: 副本数量
- placement: 存放位置
- sync: 同步策略

#### 6.2.3 恢复机制
- detection: 故障检测
- repair: 修复流程
- verification: 完整性校验

## 7. 同步与冲突

### 7.1 同步机制

#### 7.1.1 同步策略
- full: 全量同步
- incremental: 增量同步
- selective: 选择性同步

#### 7.1.2 调度策略
- periodic: 定期同步
- event-driven: 事件驱动
- manual: 手动触发

#### 7.1.3 带宽控制
- limit: 速率限制
- priority: 优先级队列
- schedule: 时间调度

### 7.2 冲突处理

#### 7.2.1 冲突检测
- vector-clock: 向量时钟
- merkle-tree: 默克尔树
- timestamp: 时间戳比对

#### 7.2.2 解决策略
- auto: 自动解决规则
- manual: 手动解决流程
- merge: 合并策略

## 8. 安全机制

### 8.1 加密系统

#### 8.1.1 密钥管理
- personal: 个人密钥对
- shared: 共享密钥
- temporary: 临时密钥
- rotation: 密钥轮换

#### 8.1.2 加密算法
- symmetric: 对称加密
- asymmetric: 非对称加密
- hash: 哈希算法

### 8.2 访问控制

#### 8.2.1 身份认证
- methods: 认证方式
- tokens: 令牌管理
- session: 会话管理

#### 8.2.2 权限控制
- roles: 角色定义
- policies: 策略规则
- audit: 审计日志

## 9. 互操作性

### 9.1 数据交换

#### 9.1.1 导入导出
- formats: 支持格式
- mapping: 字段映射
- validation: 数据校验

#### 9.1.2 API接口
- rest: REST API
- websocket: 实时接口
- p2p: 点对点协议

### 9.2 兼容性

#### 9.2.1 版本控制
- semantic: 语义化版本
- migration: 迁移策略
- compatibility: 兼容性矩阵

#### 9.2.2 降级方案
- detection: 能力检测
- fallback: 降级规则
- notification: 通知机制