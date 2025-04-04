const fs = require('fs')
const path = require('path')
import { IEventEmitterSimple } from '../../../../src/utils/events/emitter.js'
import { showStreamingChatDialog } from '../../dialogs/streamingChatDialog.js'
import { TEST_GENERATION_PROMPTS } from '../../../../assets/prompts/测试文件生成.js'

export class TestGenerator {
  constructor() {
    this.emitter = new IEventEmitterSimple()
  }

  // 生成测试文件
  async generateTest(filePath, aiConfig) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const messages = [
        {
          role: 'system',
          content: TEST_GENERATION_PROMPTS.system
        },
        {
          role: 'user',
          content: TEST_GENERATION_PROMPTS.getUserPrompt(fileContent)
        }
      ]

      const chatEmitter = await showStreamingChatDialog(messages, aiConfig)
      let testContent = ''

      return new Promise((resolve, reject) => {
        chatEmitter.on('data', (text) => {
          testContent += text
          this.emitter.emit('progress', '正在生成测试...')
        })

        chatEmitter.on('userAccept', async () => {
          if (testContent) {
            this.saveTestFile(filePath, testContent)
            this.emitter.emit('progress', '测试文件已生成')
            resolve(testContent)
          }
        })

        chatEmitter.on('error', (err) => {
          this.emitter.emit('error', `生成测试时发生错误: ${err}`)
          reject(err)
        })

        chatEmitter.emit('start')
      })
    } catch (err) {
      this.emitter.emit('error', `生成测试文件时发生错误: ${err.message}`)
      throw err
    }
  }

  // 在沙箱环境中运行测试
  async runTest(sourceFilePath) {
    try {
      const testPath = this.getTestFilePath(sourceFilePath)
      if (!fs.existsSync(testPath)) {
        throw new Error('测试文件不存在')
      }

      // 创建沙箱环境的事件发射器
      const sandboxEmitter = new IEventEmitterSimple()
      
      // 转发沙箱环境的事件到主发射器
      sandboxEmitter.on('start', (msg) => this.emitter.emit('test-start', msg))
      sandboxEmitter.on('case', (msg) => this.emitter.emit('test-case', msg))
      sandboxEmitter.on('pass', (msg) => this.emitter.emit('test-pass', msg))
      sandboxEmitter.on('fail', (msg) => this.emitter.emit('test-fail', msg))
      sandboxEmitter.on('end', (msg) => this.emitter.emit('test-end', msg))

      // 加载源文件和测试文件
      const sourceModule = await import(sourceFilePath)
      const testModule = await import(testPath)

      if (typeof testModule.run !== 'function') {
        throw new Error('测试文件必须导出 run 函数')
      }

      // 运行测试
      await testModule.run(sourceModule, sandboxEmitter)
    } catch (err) {
      this.emitter.emit('error', `运行测试时发生错误: ${err.message}`)
      throw err
    }
  }

  // 获取测试文件路径
  getTestFilePath(sourceFilePath) {
    const dir = path.dirname(sourceFilePath)
    const basename = path.basename(sourceFilePath, '.js')
    return path.join(dir, `${basename}.test.js`)
  }

  // 保存测试文件
  saveTestFile(sourceFilePath, content) {
    const testPath = this.getTestFilePath(sourceFilePath)
    fs.writeFileSync(testPath, content)
  }

  // 检查测试文件是否存在
  checkTestFileExists(sourceFilePath) {
    const dir = path.dirname(sourceFilePath)
    const basename = path.basename(sourceFilePath, '.js')
    const testPath = path.join(dir, `${basename}.test.js`)
    return fs.existsSync(testPath)
  }

  // 获取事件发射器
  getEmitter() {
    return this.emitter
  }
}