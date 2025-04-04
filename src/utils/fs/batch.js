const path = require('path')
const fs = require('fs').promises
export const 递归扫描文件夹并执行任务 = async (dir, controller, 文件处理函数 = null, 目录处理函数 = null,depth = 0) => {
    const 添加任务 = async (任务函数, 错误消息前缀) => {
        return controller.addTask(async () => {
            try {
                return await 任务函数();
            } catch (err) {
                return { message: `${错误消息前缀}: ${err.message}` };
            }
        });
    };
    await 添加任务(async () => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for await (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (目录处理函数) {
                    await 目录处理函数(fullPath, entry.name,controller, 添加任务,depth);
                }
                await 递归扫描文件夹并执行任务(fullPath, controller, 文件处理函数, 目录处理函数,depth+1);
            } else {
                if (文件处理函数) {
                    await 文件处理函数(fullPath, entry.name, controller, 添加任务,depth);
                }
            }
        }
        return { message: `已处理文件夹: ${dir}` };
    }, `读取目录失败: ${dir}`);
};