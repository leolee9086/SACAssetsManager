import { buildLogProxy } from './proxy.js';
import { 去循环序列化, 是否循环引用 } from './safeStringify.js';
export let chunk = []
let writters = new Map(
  [
    ['log', [{ write:  function (...message) { 
      console.log(...message) 
    } }]],
    ['warn', [{ write:  function (...message) { 
      console.warn(...message) 
    } }]],
    ['info', [{ write:  function (...message) { 
      console.log(...message) 
    } }]],
    ['error', [{ write:  function (...message) {
       console.error(...message) 
      } }]],
    ['debug', [{ write:  function (...message) { 
      console.debug(...message) 
    
    } }]],
  ]
)

class 日志记录器原型 {
  constructor(name,config={
    writters: writters,
    maxRetries: 5,
  }) {
    
    if(!name){
      throw new Error('要创建一个日志,必须提供名称')
    }
    this.name = name
    if(globalThis[Symbol.for(`$sac_logger_${this.name}`)]){
      throw new Error(`名称${this.name}已经存在`)
    }
    globalThis[Symbol.for(`$sac_logger_${this.name}`)]=this

    this.config = config
  }
  添加日志级别(level, writter) {
    // Validate level name
    if (typeof level !== 'string' || level.trim() === '') {
      throw new Error('Invalid level name');
    }
    // Validate writter
    if (typeof writter !== 'object' || typeof writter.write !== 'function') {
      throw new Error('Invalid writter');
    }
    // Check if the new level conflicts with any existing level
    for (const existingLevel of this.config.writters.keys()) {
      if (level.endsWith(existingLevel) || existingLevel.endsWith(level)) {
        throw new Error(`Level ${level} conflicts with existing level ${existingLevel}`);
      }
    }
    this.config.writters.set(level, [writter]);
    return this
  }
  async sendLog(logLevel, logName, options, ...messages) {
    this.validateLogLevel(logLevel);
    let newStackTrace = this.extractStackTrace(options);
    await this.writeLogMessages(logLevel, logName, newStackTrace, messages);
  }

  validateLogLevel(logLevel) {
    if (!this.config.writters.has(logLevel)) {
      throw new Error(`Invalid log level: ${logLevel}`);
    }
  }

  extractStackTrace(options) {
    if (options.withStack) {
      const originalStackTrace = new Error().stack;
      return originalStackTrace.split('\n').slice(3).join('\n');
    }
    return null;
  }

  async writeLogMessages(logLevel, logName, newStackTrace, messages) {
    for (const writter of this.config.writters.get(logLevel)) {
      let retryCount = 0;
      while (retryCount < this.config.maxRetries) {
        try {
          await this.写入日志(writter, logLevel, logName, newStackTrace, messages);
          break;
        } catch (error) {
          console.error(`Failed to send ${logLevel} message to writter:`, error);
          retryCount++;
          if (retryCount === this.config.maxRetries) {
            console.error(`Failed to send ${logLevel} message to writter after ${this.config.maxRetries} retries:`, error);
          }
        }
      }
    }
  }
  async 写入日志(writter, logLevel, logName, newStackTrace, messages) {
    if (writter.writeObject) {
      await writter.writeObject({
        level: logLevel,
        name: logName,
        messages: messages.map(message => { return !是否循环引用(message)? message : 去循环序列化(message) }),
        stack: newStackTrace && newStackTrace.split("\n")
      });
    }
    if (writter.write) {
      await writter.write(`${logLevel} of ${logName} :\n`, ...messages, '\nstack:\n' + newStackTrace);
    }
  }
}
const 日志记录器 =globalThis[Symbol.for(`$sac_logger_default`)] ||new 日志记录器原型('default');
const 日志代理 = buildLogProxy(日志记录器)


export const 创建日志记录器=(...args)=>{
  return buildLogProxy(new 日志记录器原型(...args))
}
export default 日志代理;
export { 日志代理 as logger }