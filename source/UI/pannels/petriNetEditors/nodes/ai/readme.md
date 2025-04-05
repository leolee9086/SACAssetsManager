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

## 思源AI聊天节点 (SiyuanAIChat)

这个节点提供与AI进行对话交互的功能，支持以下特性：

1. 默认使用思源笔记的AI配置
2. 支持多轮对话，保持上下文连贯性
3. 可接收来自SiyuanAIConfig节点的配置
4. 提供Promise输出，支持异步处理模式
5. 自动处理think标签，提供清理后的文本

### 输入端口

- **prompt** (字符串，必需)：用户的提问或指令
- **systemPrompt** (字符串，可选)：系统提示词，用于指导AI回答
- **aiConfig** (对象，可选)：AI配置对象，可以从SiyuanAIConfig节点获取

### 输出端口

- **fullText**：AI回复的完整文本内容
- **cleanText**：去除think标签后的文本
- **chatHistory**：完整的对话历史记录
- **aiConfig**：使用的AI配置对象
- **responsePromise**：表示请求进度的Promise对象，可用于控制流程执行顺序

### 使用示例

1. 基本用法：
   - 连接一个文本输入节点到prompt输入端口
   - 从cleanText或fullText输出获取AI回复

2. 与配置节点配合：
   - 添加SiyuanAIConfig节点并连接其config输出到aiConfig输入
   - 这样可以在运行时切换或修改AI配置

3. 多轮对话：
   - 节点会自动维护对话历史
   - 可以通过chatHistory输出监控对话状态

4. 顺序执行控制：
   - 将responsePromise输出连接到需要等待AI完成的节点
   - 确保在一轮对话完成后再开始下一步操作

## 最佳实践

1. 使用配置节点作为AI处理流程的起点
2. 使用同一个配置节点为多个AI节点提供统一配置
3. 在需要特殊配置的场景中使用自定义配置输入
4. 配置刷新后，相关的处理节点会自动使用新配置
5. 对于多轮对话，使用SiyuanAIChat节点的responsePromise输出控制执行顺序 