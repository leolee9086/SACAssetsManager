import { pipeline } from '../../../../static/@huggingface/transformers/index.js';
import { imagePipelines } from './pipelines/image.js';

// 获取支持的任务列表
export const tasks = imagePipelines.filter(p => p.supported !== false).map(p => p.id);

// 管线执行函数
export const runPipeline = async (task, modelName, input) => {
    try {
        const pipe = await pipeline(task, modelName || undefined, {
            quantized: true,
            device:'dml'
        });
        return await pipe(input);
    } catch (error) {
        throw new Error(`管线执行失败: ${error.message}`);
    }
}; 