/**
 * 重复文件还原脚本
 * 将扫描到的重复文件从备份目录还原到原始位置
 */
const fs = require('fs')
const fsPromises = require('fs').promises
const path = require('path')
import { 打开任务控制对话框 } from '../../dialog/tasks.js';
import { filePickPromise } from '../../dialog/fileDiffAndPick.js';

/**
 * 纯函数 - 解析扫描结果文件
 */
function useJsonParse(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`解析JSON文件失败: ${error.message}`);
  }
}

/**
 * 纯函数 - 获取要还原的文件路径列表
 */
function forFilesToRestore(scanResult) {
  const filesList = [];
  
  if (scanResult && scanResult.duplicates) {
    // 遍历所有重复文件组
    for (const [originPath, duplicates] of Object.entries(scanResult.duplicates)) {
      if (Array.isArray(duplicates) && duplicates.length > 0) {
        // 每组的第一个文件是原始文件，其余为重复文件
        filesList.push({
          source: duplicates[0],
          targets: duplicates.slice(1)
        });
      }
    }
  }
  
  return filesList;
}

/**
 * 纯函数 - 确保目录存在
 */
async function withDirectoryEnsured(filePath) {
  const dirname = path.dirname(filePath);
  try {
    await fsPromises.access(dirname);
    return false; // 目录已存在
  } catch (error) {
    await fsPromises.mkdir(dirname, { recursive: true });
    return true; // 创建了新目录
  }
}

/**
 * 检查文件是否存在
 */
async function fileExists(filePath) {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 非纯函数 - 复制文件
 */
async function forFileCopy(context, options) {
  const { sourcePath, targetPath, overwrite } = options;
  
  try {
    // 确保目标目录存在
    await withDirectoryEnsured(targetPath);
    
    // 检查目标文件是否存在
    const targetExists = await fileExists(targetPath);
    
    // 如果文件已存在且不允许覆盖，则跳过
    if (targetExists && !overwrite) {
      return { success: false, message: `目标文件已存在: ${targetPath}` };
    }
    
    // 复制文件
    await fsPromises.copyFile(sourcePath, targetPath);
    return { success: true, message: `成功复制: ${sourcePath} -> ${targetPath}` };
  } catch (error) {
    return { success: false, message: `复制失败: ${error.message}` };
  }
}

/**
 * 转换文件组为可选择项
 */
function withFileGroupToSelectItems(fileGroup) {
  const items = [];
  
  // 源文件作为第一个选项
  items.push({
    src: fileGroup.source,
    label: `保留源文件: ${path.basename(fileGroup.source)}`,
    isSource: true
  });
  
  // 目标文件作为其他选项
  fileGroup.targets.forEach((target, index) => {
    items.push({
      src: target,
      label: `还原到: ${path.basename(target)}`,
      isTarget: true,
      index
    });
  });
  
  return items;
}

/**
 * 使用任务控制对话框执行还原
 */
export async function 执行还原重复文件(jsonPath, backupDir, options = {}) {
  const defaultOptions = {
    overwrite: false,
    interactive: true,
    resultLog: 'restore_result.log'
  };
  
  const config = { ...defaultOptions, ...options };
  
  try {
    console.log(`正在从扫描结果 ${jsonPath} 还原文件...`);
    
    // 解析扫描结果
    const scanResult = useJsonParse(jsonPath);
    
    // 获取要还原的文件列表
    const filesToRestore = forFilesToRestore(scanResult);
    
    if (filesToRestore.length === 0) {
      console.log('没有找到需要还原的文件。');
      return { success: false, message: '没有找到需要还原的文件' };
    }
    
    console.log(`找到 ${filesToRestore.length} 个文件组需要还原。`);
    
    // 创建任务控制对话框
    const taskController = await 打开任务控制对话框('还原重复文件', '正在还原文件...');
    
    let restoredCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // 处理每个文件组
    for (const fileGroup of filesToRestore) {
      await taskController.addTask(async () => {
        const sourcePath = fileGroup.source;
        
        // 检查源文件是否存在
        if (!(await fileExists(sourcePath))) {
          return { message: `错误: 源文件不存在: ${sourcePath}` };
        }
        
        // 如果启用交互模式，展示文件选择对话框
        if (config.interactive && fileGroup.targets.length > 0) {
          const selectItems = withFileGroupToSelectItems(fileGroup);
          const pickResult = await filePickPromise(
            '选择要还原的文件',
            selectItems,
            '选择需要还原的文件位置。如选择源文件则不进行还原。'
          );
          
          if (pickResult) {
            const selectedItem = selectItems[pickResult.index];
            
            // 如果选择了源文件，则跳过还原
            if (selectedItem.isSource) {
              skippedCount += fileGroup.targets.length;
              return { message: `跳过还原: ${sourcePath}` };
            }
            
            // 如果选择了目标位置，只还原到该位置
            if (selectedItem.isTarget) {
              const targetPath = selectedItem.src;
              const result = await forFileCopy({}, {
                sourcePath,
                targetPath,
                overwrite: config.overwrite
              });
              
              if (result.success) {
                restoredCount++;
              } else {
                errorCount++;
              }
              
              skippedCount += fileGroup.targets.length - 1;
              return { message: result.message };
            }
          } else {
            skippedCount += fileGroup.targets.length;
            return { message: `用户取消了还原: ${sourcePath}` };
          }
        } else {
          // 非交互模式，还原到所有目标位置
          for (const targetPath of fileGroup.targets) {
            const result = await forFileCopy({}, {
              sourcePath,
              targetPath,
              overwrite: config.overwrite
            });
            
            if (result.success) {
              restoredCount++;
            } else {
              errorCount++;
            }
          }
          
          return { message: `处理完成: ${sourcePath} -> ${fileGroup.targets.length} 个位置` };
        }
      });
    }
    
    // 开始执行任务
    taskController.start();
    
    // 所有任务完成后处理
    taskController.on('allTasksCompleted', async () => {
      const summary = `还原完成: ${restoredCount} 个文件成功, ${errorCount} 个文件失败, ${skippedCount} 个文件跳过`;
      console.log(summary);
      
      // 写入结果日志
      if (config.resultLog) {
        try {
          await fsPromises.appendFile(
            config.resultLog, 
            `\n=== 还原完成 [${new Date().toLocaleString()}] ===\n` +
            `总共处理: ${filesToRestore.length} 个文件组\n` +
            `成功还原: ${restoredCount} 个文件\n` +
            `失败: ${errorCount} 个文件\n` +
            `跳过: ${skippedCount} 个文件\n\n`,
            'utf8'
          );
        } catch (error) {
          console.error(`写入日志失败: ${error.message}`);
        }
      }
    });
    
    return {
      success: true,
      message: `开始还原重复文件，共 ${filesToRestore.length} 个文件组`
    };
  } catch (error) {
    console.error(`还原过程出错: ${error.message}`);
    return { success: false, message: error.message };
  }
}

/**
 * 命令行运行
 */
function forCommandLineExecution() {
  // 命令行参数处理
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('用法: node restoreDuplicates.js <扫描结果JSON路径> <备份目录> [--overwrite] [--no-interactive]');
    process.exit(1);
  }

  const jsonPath = args[0];
  const backupDir = args[1];
  const overwrite = args.includes('--overwrite');
  const interactive = !args.includes('--no-interactive');

  // 运行脚本
  执行还原重复文件(jsonPath, backupDir, { overwrite, interactive })
    .then(result => {
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error(`执行出错: ${error.message}`);
      process.exit(1);
    });
}

// 如果直接运行此脚本，则执行命令行处理
if (require.main === module) {
  forCommandLineExecution();
}

// 导出函数供其他模块使用
export {
  useJsonParse,
  forFilesToRestore,
  withDirectoryEnsured,
  forFileCopy,
  withFileGroupToSelectItems,
  fileExists
};
