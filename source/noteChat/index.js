import { plugin } from "../pluginSymbolRegistry.js"
import { kernelApi } from "../asyncModules.js"
import BlockHandler from "../fromThirdParty/siyuanUtils/BlockHandler.js"
import { 思源sql助手提示词 } from "../../assets/prompts/思源笔记表结构介绍.js";
/**
 * 合并用户对话消息，确保对话角色(user/assistant/system)交替出现
 * @param {Array<{role: string, content: string}>} notechat - 原始对话消息数组
 * @returns {Array<{role: string, content: string}>} 处理后的对话消息数组
 * @throws {Error} 如果角色(user/system/assistant)连续出现会抛出错误
 */
function mergeUserDialogue(notechat) {
    let mergedDialogue = [];
    let tempContent = '';
    
    // 如果第一个角色不是 'user'，添加一个 'user' 角色，内容是 '你好'
    if (notechat.length > 0 && notechat[0].role !== 'user') {
        mergedDialogue.push({role: 'user', content: '你好'});
    }

    for (let i = 0; i < notechat.length; i++) {
        if ((notechat[i].role === 'user' || notechat[i].role === 'assistant' || notechat[i].role === 'system') && (i === notechat.length - 1 || notechat[i + 1].role !== notechat[i].role)) {
            tempContent += notechat[i].content;
            mergedDialogue.push({role: notechat[i].role, content: tempContent});
            tempContent = '';
        } else if (notechat[i].role === 'user' || notechat[i].role === 'assistant' || notechat[i].role === 'system') {
            tempContent += notechat[i].content + ' ';
        } else {
            mergedDialogue.push(notechat[i]);
        }
    }
    for (let i = 1; i < mergedDialogue.length; i++) {
        if (mergedDialogue[i].role === 'system' && mergedDialogue[i].content === '') {
            continue;
        }
        if (mergedDialogue[i].role === mergedDialogue[i - 1].role) {
            throw new Error("角色 'user', 'system', 'assistant' 必须交替出现");
        }
    }
    // 如果最后一个角色不是 'user'，添加一个 'user' 角色，内容是 '继续'
    if (mergedDialogue.length > 0 && mergedDialogue[mergedDialogue.length - 1].role !== 'user') {
        mergedDialogue.push({role: 'user', content: '继续'});
    }

    return mergedDialogue;
}

/**
 * 点击块图标事件处理
 * @event click-blockicon
 * @param {Object} e - 事件对象
 * @param {Object} e.detail - 事件详情
 * @param {HTMLElement[]} e.detail.blockElements - 点击的块元素数组
 * @param {Object} e.detail.menu - 菜单对象，用于添加菜单项
 */
plugin.eventBus.on(
    'click-blockicon',(e)=>{
        console.log(e)
        e.detail.menu.addItem({
            label: '设置为用户角色',
            click: () => {
                e.detail.blockElements.forEach(block => {
                    kernelApi.setBlockAttrs({
                        id: block.getAttribute('data-node-id'),
                        attrs: {'custom-chat-role': 'user'}
                    });
                });
            }
        })
        e.detail.menu.addItem({
            label: '设置为助手角色',
            click: () => {
                e.detail.blockElements.forEach(block => {
                    kernelApi.setBlockAttrs({
                        id: block.getAttribute('data-node-id'),
                        attrs: {'custom-chat-role': 'assistant'}
                    });
                });
            }
        })
        e.detail.menu.addItem({
            label: '设置为系统角色',
            click: () => {
                e.detail.blockElements.forEach(block => {
                    kernelApi.setBlockAttrs({
                        id: block.getAttribute('data-node-id'),
                        attrs: {'custom-chat-role': 'system'}
                    });
                });
            }
        })
        e.detail.menu.addItem({
            label: '清除角色',
            click: () => {
                e.detail.blockElements.forEach(block => {
                    kernelApi.setBlockAttrs({
                        id: block.getAttribute('data-node-id'),
                        attrs: {'custom-chat-role': ''}
                    });
                });
            }
        })
        
        // 添加流式对话菜单项
        e.detail.menu.addItem({
            label: '流式对话',
            click: async () => {
                const noteChat = e.detail.blockElements.map(item => {
                    return {
                        role: item.getAttribute('custom-chat-role') || 'user',
                        content: (new BlockHandler(item.getAttribute('data-node-id'))).markdown
                    }
                })
                const merged = mergeUserDialogue(noteChat)
                console.log(merged)
                
                // 导入并调用流式对话框，传入思源笔记的 OpenAI 配置
                const { showStreamingChatDialog } = await import('../UI/dialogs/streamingChatDialog.js')
                const emitter = await showStreamingChatDialog(merged, window.siyuan.config.ai.openAI)
                
                let responseContent = ''
                
                emitter.on('data', (text) => {
                    responseContent += text
                })
                
                emitter.on('userAccept', async () => {
                    if (responseContent) {
                        console.log(responseContent)
                        const lastBlock = e.detail.blockElements[e.detail.blockElements.length - 1]
                        const last = new BlockHandler(lastBlock.getAttribute('data-node-id'))
                        const data = await last.insertAfter(responseContent)
                        // 为新插入的块设置助手角色
                        data.forEach(item => {
                            item.doOperations.forEach(async op => {
                                await kernelApi.setBlockAttrs({
                                    id: op.id,
                                    attrs: {
                                        'custom-chat-role': 'assistant',
                                        'custom-chat-endpoint': window.siyuan.config.ai.openAI.endpoint,
                                        'custom-chat-model': window.siyuan.config.ai.openAI.model
                                    }
                                })
                                // 从data属性中提取所有块的ID
                                const blockIds = op.data.match(/data-node-id="([^"]+)"/g);
                                if (blockIds) {
                                    blockIds.forEach(blockId => {
                                        const id = blockId.replace('data-node-id="', '').replace('"', '');
                                        kernelApi.setBlockAttrs({
                                            id: id,
                                            attrs: {
                                                'custom-chat-role': 'assistant',
                                                'custom-chat-endpoint': window.siyuan.config.ai.openAI.endpoint,
                                                'custom-chat-model': window.siyuan.config.ai.openAI.model
                                            }
                                        });
                                    });
                                }
                            })
                        })
                    }
                })
                
                emitter.on('error', (error) => {
                    console.error('对话出错:', error)
                })
                emitter.emit('start')
            },
            submenu: [
                {
                    label: '基于相关内容对话',
                    click: async () => {
                        // 获取选中块的内容
                        const block = e.detail.blockElements[0];
                        const blockHandler = new BlockHandler(block.getAttribute('data-node-id'));
                        const content = blockHandler.markdown;
                        
                        // 构造系统提示词
                        const systemPrompt = {
                            role: 'system',
                            content: 思源sql助手提示词
                        };
                        
                        // 构造用户查询
                        const userQuery = {
                            role: 'user',
                            content: `请分析以下内容，根据它们的主题和讨论领域，总结关键词,编写合适的SQL嵌入块来查询相关内容，例如如果内容中提到了悉尼歌剧院，你可能需要搜索建筑、澳大利亚等等关键词：\n${content}\n请直接给出嵌入块，不要使用代码块包裹。`
                        };
                        
                        // 合并对话历史
                        const noteChat = [systemPrompt, userQuery];
                        const merged = mergeUserDialogue(noteChat);
                        
                        // 调用流式对话
                        const { showStreamingChatDialog } = await import('../UI/dialogs/streamingChatDialog.js');
                        const emitter = await showStreamingChatDialog(merged, window.siyuan.config.ai.openAI);
                        
                        let responseContent = '';
                        
                        emitter.on('data', (text) => {
                            responseContent += text;
                        });
                        
                        emitter.on('userAccept', async () => {
                            if (responseContent) {
                                const lastBlock = e.detail.blockElements[e.detail.blockElements.length - 1];
                                const last = new BlockHandler(lastBlock.getAttribute('data-node-id'));
                                const data = await last.insertAfter(responseContent);
                                
                                // 为新插入的块设置助手角色
                                data.forEach(item => {
                                    item.doOperations.forEach(async op => {
                                        await kernelApi.setBlockAttrs({
                                            id: op.id,
                                            attrs: {
                                                'custom-chat-role': 'assistant',
                                                'custom-chat-endpoint': window.siyuan.config.ai.openAI.endpoint,
                                                'custom-chat-model': window.siyuan.config.ai.openAI.model
                                            }
                                        });
                                        // 处理子块
                                        const blockIds = op.data.match(/data-node-id="([^"]+)"/g);
                                        if (blockIds) {
                                            blockIds.forEach(blockId => {
                                                const id = blockId.replace('data-node-id="', '').replace('"', '');
                                                kernelApi.setBlockAttrs({
                                                    id: id,
                                                    attrs: {
                                                        'custom-chat-role': 'assistant',
                                                        'custom-chat-endpoint': window.siyuan.config.ai.openAI.endpoint,
                                                        'custom-chat-model': window.siyuan.config.ai.openAI.model
                                                    }
                                                });
                                            });
                                        }
                                    });
                                });
                            }
                        });
                        
                        emitter.on('error', (error) => {
                            console.error('对话出错:', error);
                        });
                        
                        emitter.emit('start');
                    }
                }
            ]
        })
    }
)

// 在文件末尾添加样式
const style = document.createElement('style')
style.textContent = `
    [custom-chat-role="user"]::before,
    [custom-chat-role="assistant"]::before,
    [custom-chat-role="system"]::before {
        content: "";
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 4px;
        position: relative;
        top: -1px;
    }

    [custom-chat-role="user"]::before {
        background-color: #3498db;  /* 蓝色表示用户 */
    }

    [custom-chat-role="assistant"]::before {
        background-color: #2ecc71;  /* 绿色表示助手 */
    }

    [custom-chat-role="system"]::before {
        background-color: #e74c3c;  /* 红色表示系统 */
    }
`
document.head.appendChild(style)