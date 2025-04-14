# 思源笔记 AI 提示词查看器

本目录包含思源笔记 SACAssetsManager 插件的 AI 提示词查看功能。

## 文件结构

- `AInote.md` - AI 功能详细梳理文档
- `README.md` - 本说明文件
- `index.vue` - AI 提示词查看面板组件
- `config-editor.js` - AI 配置编辑器功能模块（已移至 keyManager 面板使用）

## 主要功能

SACAssetsManager 插件的 AI 提示词查看器包含以下功能：

1. **AI 提示词查看**
   - 展示思源笔记中保存的所有 AI 提示词
   - 支持关键词搜索和过滤
   - 提供提示词详细内容查看
   - 从 local.json 读取数据

2. **数据来源**
   - 思源笔记的 local.json 本地存储
   - 读取用户保存的提示词和聊天历史
   - 使用思源 API 获取数据

## 技术实现

此功能基于以下技术实现：

- Vue 3 组件化开发
- 思源笔记 API 集成（/api/storage/getLocalStorage）
- 响应式 UI 设计

## 使用方法

1. 进入 AI 提示词查看面板
2. 使用搜索框筛选提示词
3. 点击提示词查看详细内容
4. 使用"刷新"按钮更新提示词列表

## 相关功能

- AI 密钥管理功能已整合到 keyManager 面板中
- 配置编辑器模块 (config-editor.js) 用于支持 keyManager 面板

## 未来计划

- 添加提示词编辑和保存功能
- 提供提示词分类和标签管理
- 支持提示词的导入/导出
- 增加从提示词直接创建新对话的功能 