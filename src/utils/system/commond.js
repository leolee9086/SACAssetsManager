if(!window.require){
    throw('这个模块依赖nodejs,请仅在本地调用')
}
const { exec } = window.require('child_process');
const fs = window.require('fs');

/**
 * 执行本地命令并获取结果
 * @param {string} command 要执行的命令
 * @param {Object} options 执行选项
 * @param {string|'buffer'|'utf8'} [options.encoding='utf8'] 输出编码
 * @param {boolean} [options.useFile=false] 是否使用文件输出
 * @param {string} [options.outputPath] 输出文件路径（当 useFile 为 true 时必需）
 * @param {string} [options.fileEncoding='utf16le'] 读取输出文件的编码
 * @returns {Promise<string|Buffer>} 命令执行结果
 * @throws {Error} 当命令执行失败时抛出错误
 */
export async function executeCommand(command, options = {}) {
    const {
        encoding = 'utf8',
        useFile = false,
        outputPath = '',
        fileEncoding = 'utf16le'
    } = options;

    return new Promise((resolve, reject) => {
        exec(command, { encoding }, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }

            if (useFile) {
                try {
                    const output = fs.readFileSync(outputPath, fileEncoding);
                    resolve(output);
                } catch (error) {
                    reject(error);
                }
            } else {
                resolve(stdout);
            }
        });
    });
}
