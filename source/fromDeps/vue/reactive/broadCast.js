import { ref } from "../../../../static/vue.esm-browser.js";

// 定义广播适配器接口
class BroadcastAdapter {
  send(message) {
    throw new Error('必须实现send方法');
  }
}

// WebSocket适配器
class WebSocketAdapter extends BroadcastAdapter {
  constructor(url, onMessage) {
    super();
    this.url = url;
    this.setupWebSocket(onMessage);
    this.setupHeartbeat();
  }

  setupWebSocket(onMessage) {
    this.ws = new WebSocket(this.url);
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage?.(data.value);
    };
    
    this.ws.onclose = () => {
      console.warn('WebSocket连接关闭，尝试重连...');
      setTimeout(() => this.setupWebSocket(onMessage), 1000);
    };
  }

  setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000);
  }

  destroy() {
    clearInterval(this.heartbeatInterval);
    this.ws.close();
  }

  send(message) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

// HTTP POST适配器
class HttpPostAdapter extends BroadcastAdapter {
  constructor(url, onMessage) {
    super();
    this.url = url;
    this.pollInterval = setInterval(async () => {
      try {
        const response = await fetch(this.url);
        const data = await response.json();
        onMessage?.(data.value);
      } catch (error) {
        console.error('HTTP GET 接收失败:', error);
      }
    }, 1000); // 轮询间隔应该可配置
  }

  // 添加清理方法
  destroy() {
    clearInterval(this.pollInterval);
  }

  async send(message) {
    try {
      await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
    } catch (error) {
      console.error('HTTP POST 发送失败:', error);
    }
  }
}

// BroadcastChannel适配器
class BroadcastChannelAdapter extends BroadcastAdapter {
  constructor(channelName, onMessage) {
    super();
    this.channel = new BroadcastChannel(channelName);
    this.channel.onmessage = (event) => {
      onMessage?.(event.data.value);
    };
  }

  send(message) {
    this.channel.postMessage(message);
  }
}

// JSON文件适配器
class JSONFileAdapter extends BroadcastAdapter {
  constructor(filePath, onMessage) {
    super();
    // 检查是否在 Node.js 环境
    if (typeof require === 'undefined') {
      throw new Error('JSONFileAdapter 仅在 Node.js 环境下可用');
    }
    
    this.fs = require('fs');
    this.filePath = filePath;
    this.onMessage = onMessage;
    this.watchInterval = null;
    this.lastContent = null;
    
    // 确保文件存在
    if (!this.fs.existsSync(this.filePath)) {
      this.fs.writeFileSync(this.filePath, JSON.stringify({ value: null }));
    }
    
    this.setupWatcher();
  }

  setupWatcher() {
    // 使用轮询监视文件变化
    this.watchInterval = setInterval(() => {
      try {
        const content = this.fs.readFileSync(this.filePath, 'utf8');
        if (content !== this.lastContent) {
          this.lastContent = content;
          const data = JSON.parse(content);
          this.onMessage?.(data);
        }
      } catch (error) {
        console.error('JSON文件读取失败:', error);
      }
    }, 1000);
  }

  send(message) {
    try {
      this.fs.writeFileSync(this.filePath, JSON.stringify(message));
    } catch (error) {
      console.error('JSON文件写入失败:', error);
    }
  }

  destroy() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
    }
  }
}

// 添加消息序列化和状态管理的工具类
class MessageManager {
  constructor() {
    this.sequence = 0;
    // 为每个渠道维护单独的已处理消息集合
    this.processedMessagesByChannel = new Map();
    this.maxProcessedMessages = 1000;
  }

  createMessage(value, channel) {
    const messageId = `${channel}-${Date.now()}-${this.sequence++}`;
    return {
      id: messageId,
      value,
      timestamp: Date.now(),
      sequence: this.sequence,
      channel  // 添加 channel 信息
    };
  }

  // 检查消息是否已在特定渠道处理
  isProcessed(messageId, channel) {
    const channelMessages = this.processedMessagesByChannel.get(channel);
    return channelMessages?.has(messageId) ?? false;
  }

  // 标记消息在特定渠道已处理
  markProcessed(messageId, channel) {
    if (!this.processedMessagesByChannel.has(channel)) {
      this.processedMessagesByChannel.set(channel, new Set());
    }
    const channelMessages = this.processedMessagesByChannel.get(channel);
    channelMessages.add(messageId);

    // 清理旧消息ID
    if (channelMessages.size > this.maxProcessedMessages) {
      const entriesToDelete = channelMessages.size - this.maxProcessedMessages;
      const entries = Array.from(channelMessages);
      entries.slice(0, entriesToDelete).forEach(id => {
        channelMessages.delete(id);
      });
    }
  }
}

// 添加新的重试配接口
class RetryConfig {
  constructor(maxRetries = 3, baseDelay = 1000, maxDelay = 10000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }
}

// 改进的指数退避重试函数
const retryWithBackoff = async (fn, retryConfig, context = '') => {
  const config = retryConfig instanceof RetryConfig ? 
    retryConfig : 
    new RetryConfig();

  for (let i = 0; i < config.maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const delay = Math.min(
        config.baseDelay * Math.pow(2, i),
        config.maxDelay
      );
      
      console.warn(
        `${context} 重试 ${i + 1}/${config.maxRetries}, ` +
        `等待 ${delay}ms, 错误: ${error.message}`
      );

      if (i === config.maxRetries - 1) {
        throw new Error(`${context} 重试失败: ${error.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// 添加值容器接口
class ValueContainer {
  constructor(initialValue) {
    this._value = initialValue;
    this._timestamp = Date.now();
  }

  get value() {
    return this._value;
  }

  set value(newValue) {
    this._value = newValue;
    this._timestamp = Date.now();
  }

  get timestamp() {
    return this._timestamp;
  }
}

// Vue Ref 实现
class VueRefContainer extends ValueContainer {
  constructor(initialValue) {
    super(initialValue);
    this._ref = ref(initialValue);
  }

  get value() {
    return this._ref.value;
  }

  set value(newValue) {
    this._ref.value = newValue;
    this._timestamp = Date.now();
  }
}

// 广播函数
export function broadCast(initialValue, adapters = [], retryConfig) {
  const channels = new Map(); // 存储所有渠道
  const initializedAdapters = [];
  const messageManager = new MessageManager();
  const broadcastPromises = new Map(); // 每个渠道的最后一个广播 Promise

  // 创建新的广播渠道
  const createChannel = (channelName, initialChannelValue = initialValue) => {
    if (channels.has(channelName)) {
      console.warn(`渠道 ${channelName} 已存在`);
      return channels.get(channelName);
    }

    // 使用容器替代直接的 ref
    const container = new VueRefContainer(initialChannelValue);
    broadcastPromises.set(channelName, Promise.resolve());

    // 改进的广播函数，确保消息按渠道顺序发送
    const broadcast = async (newValue, channel) => {
      const message = messageManager.createMessage(newValue, channel);
      
      const lastPromise = broadcastPromises.get(channel);
      const newPromise = lastPromise.then(() => 
        Promise.allSettled(
          initializedAdapters.map(adapter => 
            adapter.send({ ...message, channel }).catch(error => {
              console.error(`广播失败: ${error.message}`);
              return retryWithBackoff(
                () => adapter.send({ ...message, channel }),
                retryConfig,
                `适配器 ${adapter.constructor.name} 发送消息`
              );
            })
          )
        )
      );
      
      broadcastPromises.set(channel, newPromise);
      return newPromise;
    };

    // 创建代理
    const proxy = new Proxy(container, {
      get(target, prop) {
        return target[prop];
      },
      set(target, prop, newValue) {
        if (prop === 'value') {
          const result = Reflect.set(target, prop, newValue);
          broadcast(newValue, channelName);
          return result;
        }
        return Reflect.set(target, prop, newValue);
      }
    });

    channels.set(channelName, proxy);
    return proxy;
  };

  // 处理来自适配器的更新
  const handleMessage = (message) => {
    if (!message.channel || !channels.has(message.channel)) {
      console.warn('收到未知渠道的消息，已忽略');
      return;
    }

    // 忽略已处理的��息
    if (messageManager.isProcessed(message.id, message.channel)) {
      return;
    }

    const channelValue = channels.get(message.channel);

    // 检查消息时序
    if (message.timestamp < channelValue._timestamp) {
      console.warn('收到过期消息，已忽略');
      return;
    }

    // 标记消息为已处理
    messageManager.markProcessed(message.id, message.channel);

    // 更新值和时间戳
    if (channelValue.value !== message.value) {
      channelValue.value = message.value;
      channelValue._timestamp = message.timestamp;
    }
  };

  // 初始化适配器
  adapters.forEach(adapter => {
    try {
      const instance = adapter instanceof BroadcastAdapter 
        ? adapter 
        : createAdapter(adapter.type, adapter.options, handleMessage);
      initializedAdapters.push(instance);
    } catch (error) {
      console.error(`适配器初始化失败: ${error.message}`);
    }
  });

  // 清理方法
  const destroy = () => {
    initializedAdapters.forEach(adapter => {
      adapter.destroy?.();
    });
    channels.clear();
    broadcastPromises.clear();
  };

  // 等待所有渠道的广播完成
  const flush = async () => {
    await Promise.all(Array.from(broadcastPromises.values()));
  };

  return {
    createChannel,
    destroy,
    flush,
    // 获取现有渠道
    getChannel: (channelName) => channels.get(channelName),
    // 获取所有渠道名称
    getChannelNames: () => Array.from(channels.keys())
  };
}

// 将适配器创建逻辑抽离
function createAdapter(type, options, handleMessage) {
  switch (type) {
    case 'websocket':
      return new WebSocketAdapter(options.url, handleMessage);
    case 'http':
      return new HttpPostAdapter(options.url, handleMessage);
    case 'broadcast-channel':
      return new BroadcastChannelAdapter(options.channelName, handleMessage);
    case 'json-file':
      return new JSONFileAdapter(options.filePath, handleMessage);
    default:
      throw new Error(`未知的适配器类型: ${type}`);
  }
}