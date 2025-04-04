import { AISSEProvider } from '../../../src/toolBox/feature/useOpenAI/useOpenAISSE.js'
import { IEventEmitterSimple as EventEmitter} from '../../../src/utils/events/emitter.js'

/**
 * 创建并显示流式聊天对话框
 */
export async function showStreamingChatDialog(messages, config = {}) {
  const emitter = new EventEmitter()
  
  // 创建对话框UI组件
  const { dialog, content, acceptBtn, rejectBtn } = createDialogElements()
  
  // 设置样式
  applyDialogStyles(dialog, content)
  setupButtonsStyle(acceptBtn, rejectBtn)
  
  // 设置按钮行为
  setupButtonEvents(emitter, dialog, acceptBtn, rejectBtn)
  
  // 显示对话框
  document.body.appendChild(dialog)
  dialog.showModal()

  // 监听事件
  emitter.on('start', () => startStreaming(messages, config, content, acceptBtn, rejectBtn, emitter))

  dialog.addEventListener('close', () => {
    emitter.emit('close')
  })

  return emitter
} 

/**
 * 创建对话框元素
 */
function createDialogElements() {
  const dialog = document.createElement('dialog')
  const content = document.createElement('div')
  const buttonContainer = document.createElement('div')
  const acceptBtn = document.createElement('button')
  const rejectBtn = document.createElement('button')
  
  // 初始状态只显示取消按钮
  acceptBtn.style.display = 'none'
  rejectBtn.textContent = '取消'
  
  buttonContainer.appendChild(acceptBtn)
  buttonContainer.appendChild(rejectBtn)
  
  dialog.appendChild(content)
  dialog.appendChild(buttonContainer)
  
  return { dialog, content, buttonContainer, acceptBtn, rejectBtn }
}

/**
 * 设置对话框和内容样式
 */
function applyDialogStyles(dialog, content) {
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
}

/**
 * 设置按钮样式
 */
function setupButtonsStyle(acceptBtn, rejectBtn) {
  const buttonContainer = acceptBtn.parentElement
  
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
}

/**
 * 设置按钮事件
 */
function setupButtonEvents(emitter, dialog, acceptBtn, rejectBtn) {
  acceptBtn.onclick = () => {
    emitter.emit('userAccept')
    dialog.close()
  }
  
  rejectBtn.onclick = () => {
    emitter.emit('userReject')
    dialog.close()
  }
}

/**
 * 开始流式处理聊天响应
 */
async function startStreaming(messages, config, content, acceptBtn, rejectBtn, emitter) {
  try {
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

