import { kernelApi } from "../../../asyncModules.js";
import { runPipeline } from './pipelineManager.js';
import { AutoTokenizer, CLIPTextModelWithProjection,AutoModel, AutoProcessor, RawImage, matmul,env  } from '../../../../static/@huggingface/transformers/index.js';
import { IEventEmitterSimple } from "../../../utils/events/emitter.js";
import { splitText } from './textSplitter.js';
console.log(env)
const sql = `select hash,id from blocks where length limit 10240000`

//请求所有hash
console.time('查询全库hash')
const allHashIds = (await kernelApi.sql({stmt:sql}))
console.timeEnd('查询全库hash')
console.log(allHashIds.length)
const pendingIds = [...allHashIds] // 待查询ID
const embeddings = new Map(); // Map<id, Array<{text: string, embedding: number[]}>>();

// 添加任务队列控制器
import { 串行任务控制器 } from '../../../utils/queue/task.js';
const embeddingQueue = new 串行任务控制器({
    destroyOnComplete: false,
    useIdleCallback: true

});

// 添加动态批量大小控制
const batchSizeController = {
  min: 5,
  max: 50,
  current: 10,
  processingTimes: [], // 存储最近几次处理时间
  maxSamples: 5,      // 保留最近5次样本

  // 记录处理时间
  addProcessingTime(time) {
    this.processingTimes.push(time);
    if (this.processingTimes.length > this.maxSamples) {
      this.processingTimes.shift();
    }
  },

  // 获取平均处理时间
  getAverageTime() {
    if (this.processingTimes.length === 0) return 0;
    return this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
  },

  // 动态调整批量大小
  adjust() {
    const avgTime = this.getAverageTime();
    const targetTime = 2000; // 目标处理时间（毫秒）

    if (avgTime > 0) {
      if (avgTime > targetTime * 1.2) {
        // 处理时间过长，减小批量
        this.current = Math.max(this.min, Math.floor(this.current * 0.8));
      } else if (avgTime < targetTime * 0.8) {
        // 处理时间过短，增加批量
        this.current = Math.min(this.max, Math.ceil(this.current * 1.2));
      }
    }

    return this.current;
  }
};

// 添加模型下载进度监控
async function downloadWithProgress(url, options = {}) {
    const response = await fetch(url);
    const contentLength = response.headers.get('content-length');
    const total = parseInt(contentLength, 10);
    let loaded = 0;
    
    const reader = response.body.getReader();
    const chunks = [];

    while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;
        
        // 计算下载进度
        const progress = (loaded / total) * 100;
        console.log(`下载进度: ${progress.toFixed(1)}%, ${(loaded/1024/1024).toFixed(2)}MB/${(total/1024/1024).toFixed(2)}MB`);
    }

    return new Blob(chunks);
}

// 添加缓存控制
const modelCache = new Map();

// 修改嵌入生成函数中的向量处理
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
            
            // 重写 AutoProcessor 和 AutoModel 的 from_pretrained 方法
            const originalProcessorFromPretrained = AutoProcessor.from_pretrained;
            const originalModelFromPretrained = AutoModel.from_pretrained;

            AutoProcessor.from_pretrained = async (modelId, options = {}) => {
                const cacheKey = `processor_${modelId}`;
                if (modelCache.has(cacheKey)) {
                    console.log('使用缓存的处理器');
                    return modelCache.get(cacheKey);
                }

                console.log('开始下载处理器...');
                const processor = await originalProcessorFromPretrained.call(AutoProcessor, modelId, {
                    ...options,
                    fetchFn: downloadWithProgress
                });
                modelCache.set(cacheKey, processor);
                return processor;
            };

            AutoModel.from_pretrained = async (modelId, options = {}) => {
                const cacheKey = `model_${modelId}`;
                if (modelCache.has(cacheKey)) {
                    console.log('使用缓存的模型');
                    return modelCache.get(cacheKey);
                }

                console.log('开始下载模型...');
                const model = await originalModelFromPretrained.call(AutoModel, modelId, {
                    ...options,
                    fetchFn: downloadWithProgress
                });
                modelCache.set(cacheKey, model);
                return model;
            };

            generateEmbedding.processor = await AutoProcessor.from_pretrained(model_id);
            generateEmbedding.model = await AutoModel.from_pretrained(model_id, {
                dtype: "q4",
            });
            console.log('模型初始化完成');
        }

        // 对于短文本，直接处理而不拆分
        if (content.length <= 1024) {
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
            maxLength: 1024,
            minLength: 3,
            overlap: 0,
            verbose: true

        });

        console.log(`长文本拆分结果：共 ${textChunks.length} 个区块，总长度 ${content.length} 字符`);
        
        const chunkEmbeddings = [];
        for (const [index, chunk] of textChunks.entries()) {
            console.log(textChunks)
            try {
                // 添加区块处理日志
                console.log(`处理区块 ${index + 1}/${textChunks.length}`, {
                    chunkLength: chunk.length,
                    startPos: chunk.offset,
                    endPos: chunk.offset + chunk.length,
                    contentPreview: chunk.text.slice(0, 50) + (chunk.text.length > 50 ? '...' : '')
                });

                // 确保文本块非空且长度足够
                if (!chunk.text.trim() || chunk.length < 3) continue;

                // 处理文本
                const inputs = await generateEmbedding.processor(chunk.text);
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
                    console.log(`区块 ${index + 1} 处理成功，向量维度: ${uint8Array.length}`);
                    chunkEmbeddings.push({
                        text: chunk.text,
                        embedding: uint8Array
                    });
                }
            } catch (chunkError) {
                console.error(`处理区块 ${index + 1} 失败:`, chunkError);
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

// 修改遍历器的实现
export function createEmbeddingIterator() {
  const iterator = new IEventEmitterSimple();
  
  iterator.progress = {
    total: allHashIds.length,
    processed: 0,
    failed: 0,
    failedIds: [],
    remaining: allHashIds.length,
    percentage: 0,
    hasFirstEmbedding: false,
    startTime: Date.now(),
    totalCharacters: 0,
    charactersPerSecond: 0,
    eta: '计算中...'
  };

  // 新增时间格式化函数
  const formatETA = (ms) => {
    if (ms <= 0 || !isFinite(ms)) return '--';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${hours}小时${minutes}分钟${seconds}秒`.replace(/0小时|0分钟/g, '');
  };

  // 修改进度处理程序
  const progressHandler = ({ result }) => {
    if (Array.isArray(result)) {
      result.forEach(itemResult => {
        if (itemResult.success) {
          // 如果是内容获取成功但还未处理的状态
          if (itemResult.status === 'CONTENT_FETCHED') {
            // 不增加processed计数，因为还需要进行嵌入处理
            return;
          }
          
          // 如果是嵌入处理完成的状态
          if (itemResult.embeddings) {
            iterator.progress.processed++;
            embeddings.set(itemResult.id, itemResult.embeddings);
            iterator.progress.totalCharacters += itemResult.contentLength || 0;
            
            if (!iterator.progress.hasFirstEmbedding && embeddings.size > 0) {
              iterator.progress.hasFirstEmbedding = true;
              iterator.emit('firstEmbeddingComplete');
            }
          }
        } else {
          iterator.progress.failed++;
          if (itemResult.error !== 'EMPTY_CONTENT') {
            iterator.progress.failedIds.push(itemResult.id);
            console.error(`处理ID ${itemResult.id} 失败:`, itemResult.error || '未知错误');
          }
        }
      });
    }
    
    iterator.progress.remaining = pendingIds.length;
    
    // 计算剩余时间
    const elapsed = Date.now() - iterator.progress.startTime;
    const processedCount = iterator.progress.processed + iterator.progress.failed;
    const remainingCount = iterator.progress.total - processedCount;
    const avgTimePerItem = elapsed / Math.max(1, processedCount);
    iterator.progress.eta = formatETA(avgTimePerItem * remainingCount);

    // 立即更新进度
    const progress = {
      ...iterator.progress,
      percentage: ((iterator.progress.processed + iterator.progress.failed) / iterator.progress.total * 100).toFixed(1),
      charactersPerSecond: Math.round(iterator.progress.totalCharacters / ((Date.now() - iterator.progress.startTime) / 1000))
    };

    console.log(`处理进度: ${progress.percentage}%, 处理速度: ${progress.charactersPerSecond} 字/秒，预计剩余时间: ${iterator.progress.eta}`);
  };

  embeddingQueue.on('taskCompleted', progressHandler);

  iterator[Symbol.asyncIterator] = async function*() {
    // 修改任务处理部分
    for (let i = 0; i < pendingIds.length;) {
      const batchSize = batchSizeController.adjust();
      const batchIds = pendingIds.slice(i, i + batchSize);
      const startTime = Date.now();

      // 添加批量获取内容的任务
      embeddingQueue.addTask(async () => {
        try {
          // 批量获取内容
          const idList = batchIds.map(item => `'${item.id}'`).join(',');
          const result = await kernelApi.sql({
            stmt: `select * from blocks where id in (${idList})`
          });
          
          // 创建id到结果的映射
          const resultMap = new Map(result.map(row => [row.id, row]));
          
          // 返回单个结果，而不是在这里添加新任务
          return batchIds.map(item => {
            const row = resultMap.get(item.id);
            if (!row) {
              return {
                success: false,
                id: item.id,
                error: 'EMPTY_RESULT',
                message: '内容不存在'
              };
            }

            const content = row.content?.trim();
            if (!content) {
              return {
                success: true,
                id: item.id,
                error: 'EMPTY_CONTENT',
                message: '内容为空，已跳过'
              };
            }

            // 为每个有效内容添加处理任务
            embeddingQueue.addTask(async () => {
              try {
                const generatedEmbeddings = await generateEmbedding(content);
                // 在嵌入生成成功后直接更新进度
                iterator.progress.processed++;
                embeddings.set(item.id, generatedEmbeddings);
                iterator.progress.totalCharacters += content.length;
                
                if (!iterator.progress.hasFirstEmbedding && embeddings.size > 0) {
                  iterator.progress.hasFirstEmbedding = true;
                  iterator.emit('firstEmbeddingComplete');
                }

                // 更新并输出当前进度
                const progress = {
                  ...iterator.progress,
                  percentage: ((iterator.progress.processed + iterator.progress.failed) / iterator.progress.total * 100).toFixed(1),
                  charactersPerSecond: Math.round(iterator.progress.totalCharacters / ((Date.now() - iterator.progress.startTime) / 1000)),
                  eta: iterator.progress.eta
                };
                console.log(`处理进度: ${progress.percentage}%, 处理速度: ${progress.charactersPerSecond} 字/秒，预计剩余时间: ${progress.eta}`);

                return {
                  success: true,
                  id: item.id,
                  embeddings: generatedEmbeddings,
                  contentLength: content.length
                };
              } catch (error) {
                // 在处理失败时更新失败计数
                iterator.progress.failed++;
                iterator.progress.failedIds.push(item.id);
                console.error(`处理ID ${item.id} 失败:`, error.message || '未知错误');

                return {
                  success: false,
                  id: item.id,
                  error: error.message || '处理失败'
                };
              }
            });
            console.log(content.length)
            // 返回内容获取成功的状态
            return {
              success: true,
              id: item.id,
              contentLength: content.length,
              status: 'CONTENT_FETCHED'
            };
          });

        } catch (error) {
          console.error('批量获取内容失败:', error);
          return batchIds.map(item => ({
            success: false,
            id: item.id,
            error: error.message || '批量获取内容失败'
          }));
        }
      });

      i += batchSize;
    }

    // 持续输出进度
    while (iterator.progress.processed + iterator.progress.failed < iterator.progress.total) {
      const progress = {
        ...iterator.progress,
        percentage: ((iterator.progress.processed + iterator.progress.failed) / iterator.progress.total * 100).toFixed(1),
        charactersPerSecond: Math.round(iterator.progress.totalCharacters / ((Date.now() - iterator.progress.startTime) / 1000)),
        eta: iterator.progress.eta
      };

      if (iterator.progress.failed > 0) {
        console.warn(`处理进度: ${progress.percentage}%, 失败: ${iterator.progress.failed}个, 处理速度: ${progress.charactersPerSecond} 字/秒，预计剩余时间: ${progress.eta}`);
      } else {
        console.log(`处理进度: ${progress.percentage}%, 处理速度: ${progress.charactersPerSecond} 字/秒，预计剩余时间: ${progress.eta}`);
      }
      yield progress;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 清理事件监听器
    embeddingQueue.off('taskCompleted', progressHandler);

    yield {
      ...iterator.progress,
      percentage: 100,
      charactersPerSecond: Math.round(iterator.progress.totalCharacters / ((Date.now() - iterator.progress.startTime) / 1000))
    };
  };

  return iterator;
}

// 修改余弦相似度计算函数以处理 Uint8Array
function cosineSimilarity(vecA, vecB) {
    // 将 Uint8Array 转换回浮点数进行计算
    const floatVecA = Array.from(vecA).map(x => (x / 127.5) - 1);
    const floatVecB = Array.from(vecB).map(x => (x / 127.5) - 1);
    
    // 将 NaN 值替换为 0
    const safeVecA = floatVecA.map(v => isNaN(v) ? 0 : v);
    const safeVecB = floatVecB.map(v => isNaN(v) ? 0 : v);
    
    const dotProduct = safeVecA.reduce((sum, a, i) => sum + a * safeVecB[i], 0);
    const normA = Math.sqrt(safeVecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(safeVecB.reduce((sum, b) => sum + b * b, 0));
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (normA * normB);
}

// 修改余弦相似度计算，支持多向量匹配
function findBestMatch(queryEmbedding, documentEmbeddings) {
    let bestScore = -1;
    let bestChunk = null;
    
    for (const {text, embedding} of documentEmbeddings) {
        const score = cosineSimilarity(queryEmbedding, embedding);
        if (score > bestScore) {
            bestScore = score;
            bestChunk = text;
        }
    }
    
    return { score: bestScore, matchedText: bestChunk };
}

// 修改查询函数中的错误处理
export async function queryEmbeddings(queryText, topK = 5) {
    try {
        if (embeddings.size === 0) {
            throw new Error('没有可用的嵌入向量，请先生成嵌入');
        }

        console.log(`开始查询，当前向量库大小: ${embeddings.size}`);
        const queryEmbeddings = await generateEmbedding(queryText);
        
        if (!queryEmbeddings || queryEmbeddings.length === 0) {
            console.error('查询嵌入生成结果为空');
            throw new Error('查询文本嵌入生成失败');
        }

        const queryEmbedding = queryEmbeddings[0].embedding;
        console.log('查询向量生成成功，开始搜索相似内容...');

        const scores = [];
        let processedCount = 0;
        let errorCount = 0;

        for (const [id, documentEmbeddings] of embeddings.entries()) {
            try {
                if (documentEmbeddings && documentEmbeddings.length > 0) {
                    const { score, matchedText } = findBestMatch(queryEmbedding, documentEmbeddings);
                    if (!isNaN(score)) {
                        scores.push({ id, score, matchedText });
                    }
                    processedCount++;
                } else {
                    errorCount++;
                    console.warn(`ID ${id} 的嵌入向量无效`);
                }
            } catch (error) {
                errorCount++;
                console.error(`处理ID ${id} 时出错:`, error);
            }
        }

        console.log(`查询完成。处理: ${processedCount}, 错误: ${errorCount}`);

        if (scores.length === 0) {
            console.warn('未找到匹配结果');
            return [];
        }

        const topResults = scores
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);

        console.log(`找到 ${topResults.length} 个匹配结果`);
        return topResults;
    } catch (error) {
        console.error('向量查询失败:', error);
        throw error;
    }
}
