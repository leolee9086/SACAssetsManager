const { exec } = require('child_process');
const { dialog } = require('@electron/remote');
const fs = require('fs');
const path = require('path');
const util = require('util');
const { spawn } = require('child_process');

const execAsync = util.promisify(exec);

// Windows系统特殊文件夹列表
const SYSTEM_FOLDERS = [
  'Windows',
  'Program Files',
  'Program Files (x86)',
  'ProgramData',
  'System32',
  '$Recycle.Bin',
  'AppData'
];

// 定义huggingface-cli路径
const HUGGINGFACE_CLI_PATH = 'D:/思源主库/temp/sac/env/huggingface-cli.exe';

export async function selectInstallPath() {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择TRELLIS安装目录',
    buttonLabel: '选择文件夹',
    filters: [
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    throw new Error('用户取消安装');
  }

  const selectedPath = result.filePaths[0];
  
  // 检查是否为系统文件夹
  const isSystemPath = SYSTEM_FOLDERS.some(folder => 
    selectedPath.toLowerCase().includes(folder.toLowerCase())
  );

  if (isSystemPath) {
    throw new Error('请不要选择系统文件夹');
  }

  return selectedPath;
}

export async function installTrellis(installPath) {
  console.log(installPath)
  
  const steps = {
    // 1. 克隆仓库
    async cloneRepo() {
      await execAsync('git clone https://github.com/microsoft/TRELLIS.git', {
        cwd: installPath
      });
      return path.join(installPath, 'TRELLIS');
    },

    // 2. 检查并安装Conda
    async checkConda() {
      try {
        await execAsync('conda --version');
      } catch (error) {
        throw new Error('请先安装Conda环境管理工具');
      }
    },

    // 3. 创建Conda环境
    async createEnv(trellisPath) {
      await execAsync(`
        conda create -n trellis python=3.10 -y &&
        conda activate trellis &&
        pip install -r requirements.txt
      `, {
        cwd: trellisPath,
        shell: 'cmd.exe'
      });
    },

    // 4. 下载预训练模型
    async downloadModels(trellisPath) {
      const modelsPath = path.join(trellisPath, 'models');
      if (!fs.existsSync(modelsPath)) {
        fs.mkdirSync(modelsPath);
      }
      
      // 这里可以添加模型下载逻辑
      // 例如使用huggingface-cli下载
      await execAsync(`
        huggingface-cli download JeffreyXiang/TRELLIS-image-large --local-dir models
      `, {
        cwd: trellisPath
      });
    }
  };

  const progress = {
    current: 0,
    total: Object.keys(steps).length,
    status: ''
  };

  try {
    // 1. 克隆仓库
    progress.status = '克隆TRELLIS仓库...';
    const trellisPath = await steps.cloneRepo();
    progress.current++;

    // 2. 检查Conda
    progress.status = '检查Conda环境...';
    await steps.checkConda();
    progress.current++;

    // 3. 创建环境
    progress.status = '创建Conda环境...';
    await steps.createEnv(trellisPath);
    progress.current++;

    // 4. 下载模型
    progress.status = '下载预训练模型...';
    await steps.downloadModels(trellisPath);
    progress.current++;

    return {
      success: true,
      message: '安装完成',
      installPath: trellisPath
    };

  } catch (error) {
    return {
      success: false,
      message: error.message,
      progress
    };
  }
}

async function checkHuggingFaceCLI() {
  try {
    await execAsync(`"${HUGGINGFACE_CLI_PATH}" --version`);
    return true;
  } catch (error) {
    return false;
  }
}

// 递归搜索模型文件
function findModelFiles(dir) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // 递归搜索子目录
      results = results.concat(findModelFiles(fullPath));
    } else {
      // 检查文件扩展名
      if (file.endsWith('.pth') || file.endsWith('.ckpt') || file.endsWith('.bin')) {
        results.push({
          relativePath: path.relative(dir, fullPath),
          fullPath: fullPath
        });
      }
    }
  }
  
  return results;
}

export async function launchTrellis(trellisPath) {
  let tempScriptPath = null;
  try {
    // 修改conda环境路径的创建方式
    const condaEnvPath = path.join(trellisPath, 'conda_env');
    
    try {
      console.log('检查conda环境...');
      
      const envName = 'trellis-app';
      
      // 获取当前conda环境列表
      const { stdout: envList } = await util.promisify(exec)('conda env list', {
        shell: true
      });
      console.log('当前conda环境列表:', envList);
      
      // 检查CUDA版本和路径
      console.log('检查CUDA版本...');
      const { stdout: nvccVersion } = await util.promisify(exec)('nvcc --version', {
        shell: true
      }).catch(() => ({ stdout: '' }));
      
      console.log('CUDA版本信息:', nvccVersion);
      
      // 设置CUDA环境变量
      const cudaPath = 'C:\\Program Files\\NVIDIA GPU Computing Toolkit\\CUDA\\v11.8';
      const updatedEnv = {
        ...process.env,
        CUDA_HOME: cudaPath,
        PATH: `${cudaPath}\\bin;${cudaPath}\\libnvvp;${process.env.PATH}`
      };

      // 清理已存在的环境
      if (envList.includes(envName)) {
        console.log('删除已存在的环境...');
        await util.promisify(exec)(`conda env remove -n ${envName} -y`);
      }

      // 创建基础环境
      console.log('创建新的conda环境...');
      await util.promisify(exec)(`conda create -n ${envName} python=3.10 -y`, {
        shell: true,
        maxBuffer: 1024 * 1024 * 10,
        env: updatedEnv
      });
      
      // 安装基础依赖
      console.log('安装PyTorch...');
      await util.promisify(exec)(`conda run -n ${envName} pip install torch==2.4.0 torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118`, {
        shell: true,
        maxBuffer: 1024 * 1024 * 10,
        env: updatedEnv
      });

      // 由于flash-attn安装可能有问题，我们先尝试安装xformers
      console.log('安装xformers...');
      await util.promisify(exec)(`conda run -n ${envName} pip install xformers`, {
        shell: true,
        maxBuffer: 1024 * 1024 * 10,
        env: updatedEnv
      });

      // 修改Python脚本，使用xformers作为后端
      const pythonScript = `
import os
import sys
print("Python version:", sys.version)
print("Current working directory:", os.getcwd())
print("Loading torch...")
import torch
print("CUDA available:", torch.cuda.is_available())
print("GPU device count:", torch.cuda.device_count())
if torch.cuda.is_available():
    print("Current GPU:", torch.cuda.current_device())
    print("GPU name:", torch.cuda.get_device_name())

# 设置必要的环境变量
os.environ['SPCONV_ALGO'] = 'native'
os.environ['ATTN_BACKEND'] = 'xformers'  # 使用xformers替代flash-attn

print("Loading TRELLIS pipeline...")
from trellis.pipelines import TrellisImageTo3DPipeline

# 加载模型
print("Loading model from Hugging Face...")
pipeline = TrellisImageTo3DPipeline.from_pretrained("JeffreyXiang/TRELLIS-image-large")
print("Moving model to CUDA...")
pipeline.cuda()

print("Starting app.py...")
import app
app.main()
      `;

      // 将Python脚本写入临时文件
      tempScriptPath = path.join(trellisPath, 'temp_launch.py');
      fs.writeFileSync(tempScriptPath, pythonScript);

      console.log('启动TRELLIS...');
      
      return new Promise((resolve, reject) => {
        const trellis = spawn('cmd.exe', [
          '/k',
          `conda activate ${envName} && python temp_launch.py && exit`
        ], {
          cwd: trellisPath,
          shell: true,
          stdio: 'pipe',
          env: {
            ...updatedEnv,
            // 添加conda初始化所需的路径
            PATH: `${process.env.PATH};${process.env.USERPROFILE}\\anaconda3\\Scripts;${process.env.USERPROFILE}\\anaconda3`
          }
        });

        let output = '';
        let errorOutput = '';

        // 捕获输出
        trellis.stdout.on('data', (data) => {
          const text = data.toString();
          output += text;
          console.log('TRELLIS输出:', text);
        });

        trellis.stderr.on('data', (data) => {
          const text = data.toString();
          errorOutput += text;
          console.error('TRELLIS错误:', text);
        });

        trellis.on('close', (code) => {
          if (code === 0) {
            resolve({
              success: true,
              message: 'TRELLIS启动成功'
            });
          } else {
            reject(new Error(`TRELLIS进程退出，代码: ${code}\n\n输出:\n${output}\n\n错误:\n${errorOutput}`));
          }
        });
        
        trellis.on('error', (err) => {
          reject(new Error(`TRELLIS启动失败: ${err.message}\n\n输出:\n${output}\n\n错误:\n${errorOutput}`));
        });
      });

    } catch (error) {
      throw new Error(`创建conda环境失败:\n${error.message}\n\n请尝试手动执行以下命令:\ncd "${trellisPath}"\nconda create --prefix ./conda_env python=3.10 -y`);
    }

  } catch (error) {
    console.error('完整错误信息:', error);
    return {
      success: false,
      message: `启动失败: ${error.message}\n请检查控制台输出以获取详细信息`
    };
  } finally {
    // 清理临时文件
    try {
      if (tempScriptPath && fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath);
      }
    } catch (error) {
      console.error('清理临时文件失败:', error);
    }
  }
}

module.exports = {
  selectInstallPath,
  installTrellis,
  launchTrellis
};
