# AI节点模块

本目录包含与AI服务交互的节点组件，用于在流程图编辑器中提供AI功能支持。

## 节点列表

- **SiyuanAIConfig**: 思源AI配置节点，从window.siyuan获取AI配置并可被其他节点覆盖
  - 输入: customConfig(对象, 可选), forceRefresh(布尔值, 可选)
  - 输出: config(完整配置), apiConfig(API配置), model(模型名称), endpoint(API端点)

- **SiyuanAIChat**: 思源AI聊天节点，支持与AI进行对话交互
  - 输入: prompt(字符串, 必需), systemPrompt(字符串, 可选), aiConfig(对象, 可选)
  - 输出: fullText(完整回复), cleanText(清理后文本), chatHistory(对话历史), aiConfig(AI配置), responsePromise(响应Promise)

## 设计原则

1. 所有AI节点应尽可能复用思源原生配置
2. 节点应支持自定义配置覆盖默认配置
3. 遵循函数式和声明式设计，减少副作用
4. 合理处理错误情况，提供用户友好的反馈
5. 节点UI应直观展示当前配置状态

## 使用说明

1. AI配置节点作为流程的起始点，提供配置信息
2. 其他AI处理节点可以连接到配置节点以获取API设置
3. 自定义配置可以在运行时动态更改
4. AI聊天节点提供Promise输出，支持异步处理，确保在上一轮输出完成后才处理下一轮输入 