import { clientApi } from '../../asyncModules.js';
import { confirmAsPromise } from '../siyuanUI/confirm.js';
const fs = require('fs').promises
const path = require('path')
const MAX_PATH_LENGTH = 260; // Windows 的最大路径长度限制
export async function processFilesFrontEnd(assets, targetPath, operation,callBack) {
    const errors = [];
    console.log(assets, targetPath);

    for (const asset of assets) {
        const targetFilePath = path.join(targetPath, path.basename(asset.path));
        try {
            await handleLongPath(targetFilePath, MAX_PATH_LENGTH);
            await performOperation(operation, asset, targetFilePath);
            await callBack(operation, asset, targetFilePath)
        } catch (error) {
            console.error(error);
            errors.push(`处理文件 ${asset.name} 时出错: ${error.message}`);
            await callBack(operation, asset, targetFilePath,error)

        }
    }
    return errors;
}
// 辅助函数：生成唯一文件名
async function getUniqueFilename(filePath) {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    let newPath = filePath;
    let counter = 1;

    while (true) {
        try {
            await fs.access(newPath);
            newPath = path.join(dir, `${baseName} (${counter})${ext}`);
            counter++;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return newPath;
            }
            throw error;
        }
    }
}
async function moveFile(source, target) {
    try {
        // 检查目标文件是否已存在
        try {
            await fs.access(target);
            // 如果文件存在，询问用户是否重命名
            const shouldRename = await confirmAsPromise(
                '文件已存在',
                `目标位置已存在同名文件 "${path.basename(target)}"。是否重命名新文件？`
            );
            if (shouldRename) {
                target = await getUniqueFilename(target);
            } else {
                throw new Error('用户取消了操作');
            }
        } catch (accessError) {
            // 如果文件不存在，继续正常操作
            if (accessError.code !== 'ENOENT') {
                throw accessError;
            }
        }

        await fs.rename(source, target);
    } catch (error) {
        if (error.code === 'EXDEV') {
            // 如果源和目标不在同一个文件系统,先复制后删除
            await copyFile(source, target);
            await fs.unlink(source);
        } else {
            throw error;
        }
    }
}

async function copyFile(source, target) {
    try {
        // 检查目标文件是否已存在
        try {
            await fs.access(target);
            // 如果文件存在，询问用户是否重命名
            const shouldRename = await confirmAsPromise(
                '文件已存在',
                `目标位置已存在同名文件 "${path.basename(target)}"。是否重命名新文件？`
            );
            if (shouldRename) {
                target = await getUniqueFilename(target);
            } else {
                throw new Error('用户取消了操作');
            }
        } catch (accessError) {
            // 如果文件不存在，继续正常操作
            if (accessError.code !== 'ENOENT') {
                throw accessError;
            }
        }

        await fs.copyFile(source, target);
    } catch (error) {
        throw error;
    }
}


async function createHardLink(source, target) {
    try {
        const stats = await fs.lstat(source);
        if (stats.isSymbolicLink()) {
            throw new Error('不能为符号链接创建硬链接');
        }
        await fs.link(source, target);
    } catch (error) {
        if (error.code === 'EXDEV') {
            const useSymlink = await confirmAsPromise(
                '无法创建硬链接',
                '源文件和目标路径不在同一文件系统上,无法创建硬链接。是否创建软链接替代?'
            );
            if (useSymlink) {
                await createSymLink(source, target);
            } else {
                throw new Error('用户取消了操作');
            }
        } else {
            throw error;
        }
    }
}

async function createSymLink(source, target) {
    try {
        const stats = await fs.lstat(source);
        if (stats.isSymbolicLink()) {
            throw new Error('不能为符号链接创建软链接');
        }
        await fs.symlink(source, target);
    } catch (error) {
        if (error.message === '不能为符号链接创建软链接') {
            throw error;
        }
        const useCopy = await confirmAsPromise(
            '无法创建软链接',
            '创建软链接失败。是否复制文件作为替代?'
        );
        if (useCopy) {
            await fs.copyFile(source, target);
        } else {
            throw new Error('用户取消了操作');
        }
    }
}

async function handleLongPath(targetFilePath, MAX_PATH_LENGTH) {
    if (targetFilePath.length > MAX_PATH_LENGTH) {
        const continueOperation = await confirmAsPromise(
            '目标路径过长',
            `目标路径 "${targetFilePath}" 超过了${MAX_PATH_LENGTH}个字符。是否继续操作？`
        );
        if (!continueOperation) {
            throw new Error('用户取消了操作: 目标路径过长');
        }
    }
}
async function trashFile(path) {
    const { shell } = require('@electron/remote')
    try {
        await shell.trashItem(path.replace(/\//g,'\\'));
    } catch (error) {
        console.error(`将文件移动到回收站时出错: ${error.message}`);
        throw new Error(`无法将文件移动到回收站: ${error.message}`);
    }
    
}
async function performOperation(operation, asset, targetFilePath) {
    switch (operation) {
        case 'move':
            await moveFile(asset.path, targetFilePath);
            break;
        case 'copy':
            await copyFile(asset.path, targetFilePath);
            break;
        case 'hardlink':
            await handleHardLink(asset.path, targetFilePath);
            break;
        case 'symlink':
            await handleSymLink(asset.path, targetFilePath);
            break;
        case 'trash':
            await trashFile(asset.path, targetFilePath)
            break
        default:
            throw new Error(`未知操作: ${operation}`);
    }
}

async function handleHardLink(sourcePath, targetPath) {
    const hardlinkConfirm = await confirmAsPromise(
        '⚠是否确认操作',
        `<p>请确认在操作前你已了解硬链接可能造成的问题：</p>
        <ol>
          <li>不能跨越不同文件系统</li>
          <li>删除原始文件不会删除硬链接数据</li>
          <li>可能使文件权限管理变复杂</li>
          <li>某些系统可能不支持对目录创建硬链接</li>
          <li>可能对文件系统完整性造成风险</li>
        </ol>
        <p>请确保完全理解上述问题，并在确认安全的情况下继续操作。</p>`
    );
    if (hardlinkConfirm) {
        await createHardLink(sourcePath, targetPath);
    }
}

async function handleSymLink(sourcePath, targetPath) {
    const symlinkConfirm = await confirmAsPromise(
        '⚠是否确认操作',
        `<p>请确认在操作前你已了解软链接可能造成的问题：</p>
        <ol>
          <li>可能使文件系统结构变复杂</li>
          <li>目标文件移动或删除后，软链接将失效</li>
          <li>不同操作系统中行为可能不一致</li>
          <li>可能增加安全风险</li>
          <li>创建需要相应权限</li>
        </ol>
        <p>请确保完全理解上述问题，并在确认安全的情况下继续操作。</p>`
    );
    if (symlinkConfirm) {
        await createSymLink(sourcePath, targetPath);
    }
}
/*export async function processFiles(assets, targetPath, operation) {
    const errors = [];
    console.log(assets, targetPath)
    let skipLongPathWarning = false;
    for (const asset of assets) {
        const targetFilePath = path.join(targetPath, path.basename(asset.path));
        if (targetFilePath.length > MAX_PATH_LENGTH) {
            const continueOperation = await confirmAsPromise(
                '目标路径过长',
                `目标路径 "${targetFilePath}" 超过了${MAX_PATH_LENGTH}个字符。是否继续操作？`
            );
            if (!continueOperation) {
                errors.push(`用户取消了操作: 目标路径过长`);
                break;
            }
            skipLongPathWarning = true;
        }
        try {
            switch (operation) {
                case 'move':
                    await moveFile(asset.path, targetFilePath);
                    break;
                case 'copy':
                    await copyFile(asset.path, targetFilePath);
                    break;
                case 'hardlink':
                    const hardlinkConfirm = await confirmAsPromise(
                        '⚠是否确认操作',
                        `<p>请确认在操作前你已了解硬链接可能造成的问题：</p>
<ol>
  <li>不能跨越不同文件系统</li>
  <li>删除原始文件不会删除硬链接数据</li>
  <li>可能使文件权限管理变复杂</li>
  <li>某些系统可能不支持对目录创建硬链接</li>
  <li>可能对文件系统完整性造成风险</li>
</ol>
<p>请确保完全理解上述问题，并在确认安全的情况下继续操作。</p>`

                    );
                    hardlinkConfirm && await createHardLink(asset.path, targetFilePath);
                    break;
                case 'symlink':
                    const symlinkConfirm = await confirmAsPromise(
                        '⚠是否确认操作',
                        `<p>请确认在操作前你已了解软链接可能造成的问题：</p>
<ol>
  <li>可能使文件系统结构变复杂</li>
  <li>目标文件移动或删除后，软链接将失效</li>
  <li>不同操作系统中行为可能不一致</li>
  <li>可能增加安全风险</li>
  <li>创建需要相应权限</li>
</ol>
<p>请确保完全理解上述问题，并在确认安全的情况下继续操作。</p>`

                    );

                    symlinkConfirm&& await createSymLink(asset.path, targetFilePath);
                    break;
            }
        } catch (error) {
            console.error(error)
            errors.push(`处理文件 ${asset.name} 时出错: ${error.message}`);
        }
    }
    return errors;
}
*/