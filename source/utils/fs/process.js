import { clientApi } from '../../asyncModules.js';
import { confirmAsPromise } from '../siyuanUI/confirm.js';
const fs = require('fs').promises
const path = require('path')
const MAX_PATH_LENGTH = 260; // Windows 的最大路径长度限制
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

export async function processFiles(assets, targetPath, operation) {
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
                        `请确认在操作之前你已经知晓硬链接可能造成的问题：
1. 硬链接不能跨越不同的文件系统。\n
2. 删除原始文件不会删除硬链接指向的数据，只有当所有硬链接都被删除后，文件数据才会被删除。\n
3. 硬链接可能会使文件的权限管理变得复杂，因为每个链接都可能有不同的权限设置。\n
4. 在某些操作系统或文件系统中，硬链接可能不支持对目录的创建。\n
5. 创建硬链接可能会对文件系统的完整性造成风险，特别是在不正确的操作下。\n

请确保你完全理解上述问题，并在确认安全的情况下继续操作。`

                    );
                    hardlinkConfirm && await createHardLink(asset.path, targetFilePath);
                    break;
                case 'symlink':
                    const symlinkConfirm = await confirmAsPromise(
                        '⚠是否确认操作',
                        `请确认在操作之前你已经知晓硬链接可能造成的问题：
1. 软链接可能会使文件系统的结构变得复杂，因为它引用了另一个位置的文件或目录。\n
2. 如果目标文件或目录被移动或删除，软链接将变成死链接，无法再访问原始内容。\n
3. 在不同的操作系统中，软链接的行为可能有所不同，这可能会在跨平台使用时造成问题。\n
4. 软链接可能会增加安全风险，因为它们可以被用来隐藏文件的真实路径或创建难以追踪的引用。\n
5. 创建软链接需要相应的权限，如果没有足够的权限，操作可能会失败。\n

请确保你完全理解上述问题，并在确认安全的情况下继续操作。`

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
