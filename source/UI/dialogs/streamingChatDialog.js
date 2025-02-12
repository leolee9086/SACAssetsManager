import { AISSEProvider } from '../pannels/MAGI/core/openAISSEAPI.js'
import { IEventEmitterSimple as EventEmitter} from '../../utils/events/emitter.js'
export async function showStreamingChatDialog(messages, config = {}) {
  const emitter = new EventEmitter()
  
  // 创建对话框
  const dialog = document.createElement('dialog')
  const content = document.createElement('div')
  const buttonContainer = document.createElement('div')
  const acceptBtn = document.createElement('button')
  const rejectBtn = document.createElement('button')
  
  // 设置样式
  dialog.style.cssText = `
    padding: 20px;
    max-width: 600px;
    width: 80%;
    border-radius: 8px;
  `
  content.style.cssText = `
    white-space: pre-wrap;
    margin-bottom: 20px;
    min-height: 100px;
  `
  
  // 修改按钮样式和布局
  buttonContainer.style.cssText = `
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  `
  
  const buttonStyle = `
    padding: 5px 15px;
    cursor: pointer;
  `
  
  acceptBtn.style.cssText = buttonStyle
  rejectBtn.style.cssText = buttonStyle
  
  // 初始状态只显示取消按钮
  acceptBtn.style.display = 'none'
  rejectBtn.textContent = '取消'
  
  acceptBtn.onclick = () => {
    emitter.emit('userAccept')
    dialog.close()
  }
  
  rejectBtn.onclick = () => {
    emitter.emit('userReject')
    dialog.close()
  }
  
  buttonContainer.appendChild(acceptBtn)
  buttonContainer.appendChild(rejectBtn)
  
  dialog.appendChild(content)
  dialog.appendChild(buttonContainer)
  document.body.appendChild(dialog)
  dialog.showModal()

  // 将流式处理逻辑移到一个单独的函数中
  const startStreaming = async () => {
    try {
      console.log(config)
      const provider = new AISSEProvider(config)
      
      // 开始流式接收响应
      for await (const chunk of provider.createChatCompletion(messages)) {
        if (chunk.error) {
          emitter.emit('error', chunk.error)
          throw new Error(chunk.error.message)
        }
        
        const text = chunk.choices[0]?.delta?.content || ''
        content.textContent += text
        emitter.emit('data', text)
      }
      console.log(config)
      emitter.emit('end')
      
      // 流式响应完成后，显示接受按钮，将取消按钮改为拒绝
      acceptBtn.style.display = 'inline-block'
      acceptBtn.textContent = '接受'
      rejectBtn.textContent = '拒绝'
      
    } catch (error) {
      content.innerHTML += `\n\n<span style="color: red">错误: ${error.message}</span>`
      emitter.emit('error', error)
    }
  }

  // 监听start事件来开始流式处理
  emitter.on('start', startStreaming)

  dialog.addEventListener('close', () => {
    emitter.emit('close')
  })

  return emitter
} 