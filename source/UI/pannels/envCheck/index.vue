<template>
  <div class="b3-cards">
    <!-- Git检查卡片 -->
    <div class="b3-card b3-card--wrap">
      <div class="b3-card__img">
        <svg class="pannel-icon">
          <use xlink:href="#iconGit"></use>
        </svg>
      </div>
      <div class="fn__flex-1 fn__flex-column">
        <div class="b3-card__info fn__flex-1">
          Git环境检查
          <div v-if="gitLoading" class="b3-card__desc">
            正在检查Git环境...
          </div>
          <div v-else>
            <div v-if="gitExists" class="b3-card__desc success">
              <i class="el-icon-check"></i>
              Git已安装
              <div>版本: {{ gitVersion }}</div>
            </div>
            <div v-else class="b3-card__desc warning">
              <i class="el-icon-warning"></i>
              未检测到Git
              <div>
                <a href="https://git-scm.com/downloads" target="_blank">
                  点击下载Git
                </a>
              </div>
            </div>
          </div>
        </div>
        <div class="b3-card__actions">
          <span class="block__icon block__icon--show">
            <svg><use xlink:href="#iconRefresh" @click="checkGit"></use></svg>
          </span>
          <div class="fn__flex-1"></div>
          <span class="block__icon block__icon--show">
            <svg><use xlink:href="#iconHelp"></use></svg>
          </span>
        </div>
      </div>
    </div>

    <!-- Python检查卡片 -->
    <div class="b3-card b3-card--wrap">
      <div class="b3-card__img">
        <svg class="pannel-icon">
          <use xlink:href="#iconPython"></use>
        </svg>
      </div>
      <div class="fn__flex-1 fn__flex-column">
        <div class="b3-card__info fn__flex-1">
          Python环境检查
          <div v-if="pythonLoading" class="b3-card__desc">
            正在检查Python环境...
          </div>
          <div v-else>
            <div v-if="pythonExists" class="b3-card__desc success">
              <i class="el-icon-check"></i>
              Python已安装
              <div>版本: {{ pythonVersion }}</div>
            </div>
            <div v-else class="b3-card__desc warning">
              <i class="el-icon-warning"></i>
              未检测到Python
              <div>
                <a href="https://www.python.org/downloads/" target="_blank">
                  点击下载Python
                </a>
              </div>
            </div>
          </div>
        </div>
        <div class="b3-card__actions">
          <span class="block__icon block__icon--show">
            <svg><use xlink:href="#iconRefresh" @click="checkPython"></use></svg>
          </span>
          <div class="fn__flex-1"></div>
          <span class="block__icon block__icon--show">
            <svg><use xlink:href="#iconHelp"></use></svg>
          </span>
        </div>
      </div>
    </div>

    <!-- TRELLIS环境检查卡片 -->
    <div class="b3-card b3-card--wrap">
      <div class="b3-card__img">
        <svg class="pannel-icon">
          <use xlink:href="#icon3D"></use>
        </svg>
      </div>
      <div class="fn__flex-1 fn__flex-column">
        <div class="b3-card__info fn__flex-1">
          TRELLIS环境检查
          <div v-if="trellisLoading" class="b3-card__desc">
            正在检查TRELLIS环境...
          </div>
          <div v-else>
            <div v-if="cudaExists && pythonVersion >= '3.8'" class="b3-card__desc success">
              <i class="el-icon-check"></i>
              环境兼容
              <div>CUDA版本: {{ cudaVersion }}</div>
              <div>Python版本: {{ pythonVersion }}</div>
            </div>
            <div v-else class="b3-card__desc warning">
              <i class="el-icon-warning"></i>
              环境不兼容
              <div v-if="!cudaExists">
                未检测到CUDA
                <div>
                  <a href="https://developer.nvidia.com/cuda-downloads" target="_blank">
                    点击下载CUDA
                  </a>
                </div>
              </div>
              <div v-if="pythonVersion < '3.8'">
                Python版本过低 (需要3.8+)
                <div>
                  <a href="https://www.python.org/downloads/" target="_blank">
                    点击下载Python
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="b3-card__actions">
          <span class="block__icon block__icon--show">
            <svg><use xlink:href="#iconRefresh" @click="checkTrellis"></use></svg>
          </span>
          <div class="fn__flex-1"></div>
          <span 
            v-if="cudaExists && pythonVersion >= '3.8'" 
            class="block__icon block__icon--show"
            @click="handleSelectPath"
            :class="{ 'installing': installing }"
          >
            <svg><use :xlink:href="selectedPath ? '#iconPlay' : '#iconDownload'"></use></svg>
          </span>
          <span class="block__icon block__icon--show">
            <svg><use xlink:href="#iconHelp"></use></svg>
          </span>
        </div>
      </div>
    </div>

    <!-- Conda检查卡片 -->
    <div class="b3-card b3-card--wrap">
      <div class="b3-card__img">
        <svg class="pannel-icon">
          <use xlink:href="#iconConda"></use>
        </svg>
      </div>
      <div class="fn__flex-1 fn__flex-column">
        <div class="b3-card__info fn__flex-1">
          Conda环境检查
          <div v-if="condaLoading" class="b3-card__desc">
            正在检查Conda环境...
          </div>
          <div v-else>
            <div v-if="condaExists" class="b3-card__desc success">
              <i class="el-icon-check"></i>
              Conda已安装
              <div>版本: {{ condaVersion }}</div>
            </div>
            <div v-else class="b3-card__desc warning">
              <i class="el-icon-warning"></i>
              未检测到Conda
              <div>
                <a href="https://docs.conda.io/en/latest/miniconda.html" target="_blank">
                  点击下载Conda
                </a>
              </div>
            </div>
          </div>
        </div>
        <div class="b3-card__actions">
          <span class="block__icon block__icon--show">
            <svg><use xlink:href="#iconRefresh" @click="checkConda"></use></svg>
          </span>
          <div class="fn__flex-1"></div>
          <span class="block__icon block__icon--show">
            <svg><use xlink:href="#iconHelp"></use></svg>
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- 确认对话框 -->
  <div v-if="showConfirmDialog" class="dialog-overlay">
    <div class="dialog-content">
      <h3>安装确认</h3>
      <p>确认将TRELLIS安装到以下路径？</p>
      <pre>{{ selectedPath }}</pre>
      <div class="dialog-actions">
        <button @click="confirmInstall">确定</button>
        <button @click="cancelInstall">取消</button>
      </div>
    </div>
  </div>

  <!-- 安装进度对话框 -->
  <div v-if="showInstallDialog" class="dialog-overlay">
    <div class="dialog-content">
      <h3>TRELLIS 安装进度</h3>
      <div class="install-progress">
        <div class="progress-step">{{ installProgress.status }}</div>
        <div class="progress-bar">
          <div 
            class="progress-bar__inner" 
            :style="{ width: `${(installProgress.current / installProgress.total) * 100}%` }"
          ></div>
        </div>
      </div>
      <div class="dialog-actions">
        <button 
          @click="showInstallDialog = false"
          :disabled="installing"
        >
          关闭
        </button>
      </div>
    </div>
  </div>

  <!-- 提示消息 -->
  <div v-if="message.show" class="message" :class="message.type">
    {{ message.content }}
  </div>
</template>

<script>
const { exec } = window.require('child_process')
const util = window.require('util')
const fs = window.require('fs')
const path = window.require('path')
const execAsync = util.promisify(exec)
import { selectInstallPath, installTrellis, launchTrellis } from './trellisInstaller.js'

export default {
  name: 'EnvChecker',
  data() {
    return {
      gitLoading: true,
      gitExists: false,
      gitVersion: '',
      pythonLoading: true,
      pythonExists: false,
      pythonVersion: '',
      trellisLoading: true,
      cudaExists: false,
      cudaVersion: '',
      installing: false,
      showConfirmDialog: false,
      showInstallDialog: false,
      selectedPath: '',
      installProgress: {
        current: 0,
        total: 4,
        status: ''
      },
      message: {
        show: false,
        content: '',
        type: 'info',
        timer: null
      },
      condaLoading: true,
      condaExists: false,
      condaVersion: '',
    }
  },
  async created() {
    await Promise.all([
      this.checkGit(),
      this.checkPython(),
      this.checkTrellis(),
      this.checkConda()
    ])
  },
  methods: {
    showMessage(content, type = 'info') {
      if (this.message.timer) {
        clearTimeout(this.message.timer);
      }
      this.message.show = true;
      this.message.content = content;
      this.message.type = type;
      this.message.timer = setTimeout(() => {
        this.message.show = false;
      }, 3000);
    },

    async checkGit() {
      this.gitLoading = true
      try {
        const { stdout } = await execAsync('git --version')
        this.gitExists = true
        this.gitVersion = stdout.trim()
      } catch (error) {
        this.gitExists = false
        this.gitVersion = ''
      } finally {
        this.gitLoading = false
      }
    },
    async checkPython() {
      this.pythonLoading = true
      try {
        const { stdout } = await execAsync('python --version')
        this.pythonExists = true
        this.pythonVersion = stdout.trim()
      } catch (error) {
        try {
          const { stdout } = await execAsync('python3 --version')
          this.pythonExists = true
          this.pythonVersion = stdout.trim()
        } catch (err) {
          this.pythonExists = false
          this.pythonVersion = ''
        }
      } finally {
        this.pythonLoading = false
      }
    },
    async checkTrellis() {
      this.trellisLoading = true
      try {
        // 检查CUDA
        const { stdout: cudaStdout } = await execAsync('nvidia-smi --query-gpu=driver_version --format=csv,noheader')
        this.cudaExists = true
        this.cudaVersion = cudaStdout.trim()
      } catch (error) {
        this.cudaExists = false
        this.cudaVersion = ''
      } finally {
        this.trellisLoading = false
      }
    },
    async checkConda() {
      this.condaLoading = true
      try {
        const { stdout } = await execAsync('conda --version')
        this.condaExists = true
        this.condaVersion = stdout.trim()
      } catch (error) {
        this.condaExists = false
        this.condaVersion = ''
      } finally {
        this.condaLoading = false
      }
    },
    async handleSelectPath() {
      if (this.installing) return;
      
      try {
        const installPath = await selectInstallPath();
        this.selectedPath = installPath;
        
        // 检查是否已存在TRELLIS安装
        const trellisPath = path.join(installPath, 'TRELLIS');
        if (fs.existsSync(trellisPath) && fs.existsSync(path.join(trellisPath, 'app.py'))) {
          // 如果已存在，直接启动
          this.showMessage('检测到已有TRELLIS安装，正在启动...', 'info');
          const result = await launchTrellis(trellisPath);
          if (result.success) {
            this.showMessage('TRELLIS启动成功！', 'success');
          } else {
            this.showMessage(`启动失败: ${result.message}`, 'error');
          }
        } else {
          // 如果不存在，显示安装确认对话框
          this.showConfirmDialog = true;
        }
      } catch (error) {
        this.showMessage(error.message || '操作失败', 'error');
      }
    },
    
    async confirmInstall() {
      this.showConfirmDialog = false;
      await this.startInstallation();
    },

    cancelInstall() {
      this.showConfirmDialog = false;
      this.selectedPath = '';
    },
    
    async startInstallation() {
      try {
        this.installing = true;
        this.showInstallDialog = true;
        
        const result = await installTrellis(this.selectedPath, (progress) => {
          this.installProgress = progress;
        });
        
        if (result.success) {
          this.showMessage('TRELLIS安装成功！', 'success');
          await this.checkTrellis();
        } else {
          this.showMessage(`安装失败: ${result.message}`, 'error');
        }
      } catch (error) {
        this.showMessage(error.message || '安装过程出错', 'error');
      } finally {
        this.installing = false;
      }
    }
  }
}
</script>

<style scoped>
.success {
  color: #67c23a;
}

.warning {
  color: #e6a23c;
}

.success i, .warning i {
  margin-right: 4px;
}

.b3-card__desc a {
  color: #409eff;
  text-decoration: none;
}

.b3-card__desc a:hover {
  text-decoration: underline;
}

.b3-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.installing {
  cursor: not-allowed;
  opacity: 0.7;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.dialog-actions {
  margin-top: 20px;
  text-align: right;
}

.dialog-actions button {
  margin-left: 10px;
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
}

.dialog-actions button:first-child {
  background: #4285f4;
  color: white;
  border: none;
}

.dialog-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 4px;
  z-index: 1001;
  animation: slideIn 0.3s ease;
}

.message.info {
  background: #f4f4f5;
  color: #909399;
}

.message.success {
  background: #f0f9eb;
  color: #67c23a;
}

.message.error {
  background: #fef0f0;
  color: #f56c6c;
}

@keyframes slideIn {
  from {
    transform: translate(-50%, -100%);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}

pre {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  word-break: break-all;
  white-space: pre-wrap;
}

.progress-bar {
  height: 6px;
  background: #eee;
  border-radius: 3px;
  margin: 10px 0;
  overflow: hidden;
}

.progress-bar__inner {
  height: 100%;
  background: #409eff;
  transition: width 0.3s ease;
}

.progress-step {
  margin: 10px 0;
  color: #606266;
}
</style> 