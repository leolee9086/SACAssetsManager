# AI节点使用说明

## 思源AI配置节点 (SiyuanAIConfig)

这个节点用于从思源笔记中获取AI配置信息，支持以下功能：

1. 自动读取思源笔记的AI配置（从`window.siyuan.config.ai.openAI`）
2. 允许自定义配置覆盖默认配置
3. 提供多种输出端口，方便连接其他AI处理节点

### 输入端口

- **customConfig** (对象，可选)：自定义配置，可覆盖思源默认配置
  ```javascript
  {
    apiConfig: {
      model: "gpt-4",
      endpoint: "https://your-custom-api.com/v1/chat/completions",
      temperature: 0.7,
      // 其他API参数...
    },
    targetLang: "en_US"
  }
  ```

- **forceRefresh** (布尔值，可选)：设为true时强制刷新配置

### 输出端口

- **config**：完整的配置对象，包含所有设置
- **apiConfig**：API调用所需的配置参数
- **model**：当前使用的模型名称
- **endpoint**：API请求端点URL

### 使用示例

1. 将SiyuanAIConfig节点放置在流程图中
2. 连接config输出到其他AI节点的配置输入
3. 对于需要自定义配置的场景，连接自定义配置到customConfig输入

## 最佳实践

1. 使用配置节点作为AI处理流程的起点
2. 使用同一个配置节点为多个AI节点提供统一配置
3. 在需要特殊配置的场景中使用自定义配置输入
4. 配置刷新后，相关的处理节点会自动使用新配置 