import { AutoModel, AutoProcessor } from '../../../../static/@huggingface/transformers/index.js';
import { splitText } from './textSplitter.js';

let model = null;
let processor = null;

// 初始化模型
async function initializeModel() {
    if (!model || !processor) {
        console.log('初始化模型和处理器...');
        const model_id = 'jinaai/jina-clip-v2';
        processor = await AutoProcessor.from_pretrained(model_id);
        model = await AutoModel.from_pretrained(model_id, {
            dtype: "q4",
        });
        console.log('模型初始化完成');
    }
}

// 处理嵌入生成
async function generateEmbedding(content) {
    try {
        // 输入验证
        if (!content || typeof content !== 'string') {
            console.error('无效的输入内容:', content);
            throw new Error('输入内容必须是非空字符串');
        }

        // 处理极短文本
        if (content.length < 3) {
            console.warn('文本过短，进行填充处理');
            content = content.padEnd(3, content); // 重复文本直到达到最小长度
        }

        // 特殊处理第一次调用，初始化并缓存模型和处理器
        if (!generateEmbedding.model || !generateEmbedding.processor) {
            console.log('初始化模型和处理器...');
            const model_id = 'jinaai/jina-clip-v2';
            generateEmbedding.processor = await AutoProcessor.from_pretrained(model_id);
            generateEmbedding.model = await AutoModel.from_pretrained(model_id, {
                dtype: "q4",  // 使用更高效的量化方式
                device:'gpu'
            });
            console.log('模型初始化完成');
        }

        // 对于短文本，直接处理而不拆分
        if (content.length <= 50) {
            try {
                const inputs = await generateEmbedding.processor(content);
                if (!inputs) {
                    throw new Error('处理器处理失败');
                }

                const output = await generateEmbedding.model(inputs);
                if (!output || !output.l2norm_text_embeddings) {
                    throw new Error('模型推理失败');
                }

                // 将浮点数组转换为 Uint8Array
                const floatArray = Array.from(output.l2norm_text_embeddings.cpuData || output.l2norm_text_embeddings.data);
                const uint8Array = new Uint8Array(floatArray.map(x => Math.round((x + 1) * 127.5)));
                console.log(output)
                return [{
                    text: content,
                    embedding: uint8Array
                }];
            } catch (error) {
                console.error('短文本处理失败:', error);
                throw new Error('短文本嵌入生成失败');
            }
        }

        // 对于长文本，使用拆分处理
        const textChunks = splitText(content, {
            maxLength: 4096,
            minLength: 3,  // 降低最小长度限制
            overlap: 0
        });

        if (!textChunks || textChunks.length === 0) {
            console.error('文本拆分失败:', content);
            throw new Error('文本拆分失败');
        }

        const chunkEmbeddings = [];
        for (const chunk of textChunks) {
            try {
                // 确保文本块非空且长度足够
                if (!chunk.trim() || chunk.length < 3) continue;

                // 处理文本
                const inputs = await generateEmbedding.processor(chunk);
                if (!inputs) {
                    console.error('处理器处理失败:', chunk);
                    continue;
                }

                // 生成嵌入
                const output = await generateEmbedding.model(inputs);
                if (!output || !output.l2norm_text_embeddings) {
                    console.error('模型推理失败:', chunk);
                    continue;
                }

                const embedding = Array.from(output.l2norm_text_embeddings.data);
                if (embedding && embedding.length > 0) {
                    const uint8Array = new Uint8Array(embedding.map(x => Math.round((x + 1) * 127.5)));
                    chunkEmbeddings.push({
                        text: chunk,
                        embedding: uint8Array
                    });
                }
            } catch (chunkError) {
                console.error('处理文本块失败:', chunk, chunkError);
                continue;
            }
        }

        // 确保至少生成了一个有效的嵌入
        if (chunkEmbeddings.length === 0) {
            console.error('未能生成任何有效的嵌入向量，内容:', content);
            throw new Error('未能生成任何有效的嵌入向量');
        }

        return chunkEmbeddings;
    } catch (error) {
        console.error('嵌入生成失败:', error, '内容长度:', content.length);
        throw error;
    }
}

// 监听消息
self.onmessage = async function(e) {
    console.log(e)

    try {
        const { id, content } = e.data;
        const embeddings = await generateEmbedding(content);
        self.postMessage({ success: true, id, embeddings });
        console.log(id, embeddings)
    } catch (error) {
        console.error(error)

        self.postMessage({ 
            success: false, 
            id: e.data.id, 
            error: error.message 
        });
    }
}; 