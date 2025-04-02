<!-- serviceMonitor.vue -->
<template>
  <div class="service-monitor">
    <h2>服务状态监控</h2>
    
    <div class="service-cards">
      <!-- 主服务状态卡片 -->
      <div class="service-card" :class="{ 'service-active': mainService.isRunning, 'service-inactive': !mainService.isRunning }">
        <div class="service-header">
          <h3>主服务</h3>
          <div class="status-indicator" :class="{ 'active': mainService.isRunning, 'inactive': !mainService.isRunning }"></div>
        </div>
        
        <div class="service-details">
          <div class="detail-row">
            <span>状态:</span>
            <span :class="{'status-active': mainService.isRunning, 'status-inactive': !mainService.isRunning}">
              {{ mainService.isRunning ? '运行中' : '已停止' }}
            </span>
          </div>
          
          <div class="detail-row">
            <span>端口:</span>
            <span>{{ mainService.port || 'N/A' }}</span>
          </div>
          
          <div class="detail-row">
            <span>启动时间:</span>
            <span>{{ mainService.startTime ? formatDateTime(mainService.startTime) : 'N/A' }}</span>
          </div>
          
          <div class="detail-row">
            <span>运行时长:</span>
            <span>{{ mainService.startTime ? calculateRuntime(mainService.startTime) : 'N/A' }}</span>
          </div>
          
          <div class="detail-row">
            <span>最后心跳:</span>
            <span>{{ mainService.lastHeartbeat ? calculateTimeSince(mainService.lastHeartbeat) : 'N/A' }}</span>
          </div>
        </div>
        
        <div class="service-actions">
          <button @click="restartMainService" :disabled="!mainService.isRunning">重启服务</button>
          <button v-if="!mainService.isRunning" @click="startMainService">启动服务</button>
          <button v-else @click="stopMainService">停止服务</button>
        </div>
      </div>
      
      <!-- 静态服务状态卡片 -->
      <div class="service-card" :class="{ 'service-active': staticService.isRunning, 'service-inactive': !staticService.isRunning }">
        <div class="service-header">
          <h3>静态资源服务</h3>
          <div class="status-indicator" :class="{ 'active': staticService.isRunning, 'inactive': !staticService.isRunning }"></div>
        </div>
        
        <div class="service-details">
          <div class="detail-row">
            <span>状态:</span>
            <span :class="{'status-active': staticService.isRunning, 'status-inactive': !staticService.isRunning}">
              {{ staticService.isRunning ? '运行中' : '已停止' }}
            </span>
          </div>
          
          <div class="detail-row">
            <span>端口:</span>
            <span>{{ staticService.port || 'N/A' }}</span>
          </div>
          
          <div class="detail-row">
            <span>启动时间:</span>
            <span>{{ staticService.startTime ? formatDateTime(staticService.startTime) : 'N/A' }}</span>
          </div>
          
          <div class="detail-row">
            <span>运行时长:</span>
            <span>{{ staticService.startTime ? calculateRuntime(staticService.startTime) : 'N/A' }}</span>
          </div>
          
          <div class="detail-row">
            <span>最后心跳:</span>
            <span>{{ staticService.lastHeartbeat ? calculateTimeSince(staticService.lastHeartbeat) : 'N/A' }}</span>
          </div>
        </div>
        
        <div class="service-actions">
          <button @click="restartStaticService" :disabled="!staticService.isRunning">重启服务</button>
          <button v-if="!staticService.isRunning" @click="startStaticService">启动服务</button>
          <button v-else @click="stopStaticService">停止服务</button>
        </div>
      </div>
    </div>
    
    <div class="system-info">
      <h3>系统信息</h3>
      <div class="detail-row">
        <span>上次刷新:</span>
        <span>{{ lastUpdateTime ? formatDateTime(lastUpdateTime) : 'N/A' }}</span>
      </div>
      <div class="detail-row">
        <span>下次检查:</span>
        <span>{{ nextCheckTime ? calculateTimeTo(nextCheckTime) : 'N/A' }}</span>
      </div>
      <button class="refresh-button" @click="refreshStatus">手动刷新</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';

export default {
  name: 'ServiceMonitor',
  setup() {
    // 获取插件实例和运行时
    const plugin = window.runtime.plugin;
    
    // 服务状态
    const mainService = ref({
      isRunning: false,
      port: null,
      startTime: null,
      lastHeartbeat: null
    });
    
    const staticService = ref({
      isRunning: false,
      port: null,
      startTime: null,
      lastHeartbeat: null
    });
    
    // 更新时间追踪
    const lastUpdateTime = ref(null);
    const nextCheckTime = ref(null);
    const updateInterval = ref(null);
    
    // 计算下次检查时间
    const calculateNextCheckTime = () => {
      nextCheckTime.value = Date.now() + 5000; // 5秒后
    };
    
    // 格式化日期时间
    const formatDateTime = (timestamp) => {
      if (!timestamp) return 'N/A';
      const date = new Date(timestamp);
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    };
    
    // 计算运行时长
    const calculateRuntime = (startTime) => {
      if (!startTime) return 'N/A';
      
      const runtime = Date.now() - startTime;
      const days = Math.floor(runtime / (1000 * 60 * 60 * 24));
      const hours = Math.floor((runtime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((runtime % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((runtime % (1000 * 60)) / 1000);
      
      let result = '';
      if (days > 0) result += `${days}天 `;
      if (hours > 0 || days > 0) result += `${hours}小时 `;
      if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}分钟 `;
      result += `${seconds}秒`;
      
      return result;
    };
    
    // 计算时间差
    const calculateTimeSince = (timestamp) => {
      if (!timestamp) return 'N/A';
      
      const diff = Date.now() - timestamp;
      
      if (diff < 1000) return '刚刚';
      if (diff < 60000) return `${Math.floor(diff / 1000)}秒前`;
      if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
      
      return formatDateTime(timestamp);
    };
    
    // 计算还有多久
    const calculateTimeTo = (timestamp) => {
      if (!timestamp) return 'N/A';
      
      const diff = timestamp - Date.now();
      
      if (diff <= 0) return '即将刷新';
      if (diff < 60000) return `${Math.ceil(diff / 1000)}秒后`;
      
      return `${Math.ceil(diff / 60000)}分钟后`;
    };
    
    // 刷新服务状态
    const refreshStatus = async () => {
      try {
        // 如果插件已初始化并具有服务状态
        if (plugin && plugin.servicesStatus) {
          // 直接使用插件缓存的服务状态
          mainService.value = { ...plugin.servicesStatus.main };
          staticService.value = { ...plugin.servicesStatus.static };
        } else {
          // 检查主服务
          if (plugin && plugin.pingServer) {
            await plugin.pingServer();
          }
          
          // 检查静态服务
          if (plugin && plugin.pingStaticServer) {
            await plugin.pingStaticServer();
          }
          
          // 重新从插件获取状态
          if (plugin && plugin.servicesStatus) {
            mainService.value = { ...plugin.servicesStatus.main };
            staticService.value = { ...plugin.servicesStatus.static };
          }
        }
        
        // 更新刷新时间
        lastUpdateTime.value = Date.now();
        calculateNextCheckTime();
      } catch (error) {
        console.error('刷新服务状态失败:', error);
      }
    };
    
    // 启动服务管理函数
    const startMainService = async () => {
      try {
        // 触发启动主服务事件
        await plugin.eventBus.emit('server:start');
        await refreshStatus();
      } catch (error) {
        console.error('启动主服务失败:', error);
      }
    };
    
    const stopMainService = async () => {
      try {
        // 触发停止主服务事件
        await plugin.eventBus.emit('server:stop');
        await refreshStatus();
      } catch (error) {
        console.error('停止主服务失败:', error);
      }
    };
    
    const restartMainService = async () => {
      try {
        await stopMainService();
        // 等待一段时间确保服务完全停止
        setTimeout(async () => {
          await startMainService();
        }, 1000);
      } catch (error) {
        console.error('重启主服务失败:', error);
      }
    };
    
    const startStaticService = async () => {
      try {
        // 触发启动静态服务事件
        await plugin.eventBus.emit('staticServer:start');
        await refreshStatus();
      } catch (error) {
        console.error('启动静态服务失败:', error);
      }
    };
    
    const stopStaticService = async () => {
      try {
        // 触发停止静态服务事件
        await plugin.eventBus.emit('staticServer:stop');
        await refreshStatus();
      } catch (error) {
        console.error('停止静态服务失败:', error);
      }
    };
    
    const restartStaticService = async () => {
      try {
        await stopStaticService();
        // 等待一段时间确保服务完全停止
        setTimeout(async () => {
          await startStaticService();
        }, 1000);
      } catch (error) {
        console.error('重启静态服务失败:', error);
      }
    };
    
    // 服务状态更新处理函数
    const handleServiceStatusUpdate = (data) => {
      if (!data || !data.service || !data.status) return;
      
      if (data.service === 'main') {
        mainService.value = { ...data.status };
      } else if (data.service === 'static') {
        staticService.value = { ...data.status };
      }
      
      // 更新刷新时间
      lastUpdateTime.value = Date.now();
      calculateNextCheckTime();
    };
    
    // 组件挂载时
    onMounted(() => {
      // 初始化状态
      if (plugin && plugin.servicesStatus) {
        mainService.value = { ...plugin.servicesStatus.main };
        staticService.value = { ...plugin.servicesStatus.static };
      }
      
      // 添加事件监听
      if (plugin && plugin.eventBus) {
        plugin.eventBus.on('service:status-updated', handleServiceStatusUpdate);
      }
      
      // 立即进行一次刷新
      refreshStatus();
      
      // 设置定时刷新
      updateInterval.value = setInterval(() => {
        // 更新时间显示（不触发实际检查）
        lastUpdateTime.value = lastUpdateTime.value;
      }, 1000);
    });
    
    // 组件卸载时
    onUnmounted(() => {
      // 移除事件监听
      if (plugin && plugin.eventBus) {
        plugin.eventBus.off('service:status-updated', handleServiceStatusUpdate);
      }
      
      // 清除定时器
      if (updateInterval.value) {
        clearInterval(updateInterval.value);
        updateInterval.value = null;
      }
    });
    
    return {
      mainService,
      staticService,
      lastUpdateTime,
      nextCheckTime,
      formatDateTime,
      calculateRuntime,
      calculateTimeSince,
      calculateTimeTo,
      refreshStatus,
      startMainService,
      stopMainService,
      restartMainService,
      startStaticService,
      stopStaticService,
      restartStaticService
    };
  }
};
</script>

<style>
.service-monitor {
  padding: 15px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

h2 {
  margin-bottom: 15px;
  color: #333;
  border-bottom: 1px solid #ddd;
  padding-bottom: 8px;
}

.service-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 20px;
}

.service-card {
  flex: 1;
  min-width: 300px;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background-color: #f9f9f9;
  transition: all 0.3s ease;
}

.service-active {
  border-left: 4px solid #4CAF50;
}

.service-inactive {
  border-left: 4px solid #F44336;
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.service-header h3 {
  margin: 0;
  color: #333;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-left: 8px;
}

.status-indicator.active {
  background-color: #4CAF50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
}

.status-indicator.inactive {
  background-color: #F44336;
  box-shadow: 0 0 8px rgba(244, 67, 54, 0.6);
}

.service-details {
  margin-bottom: 15px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 4px 0;
  border-bottom: 1px dashed #eee;
}

.status-active {
  color: #4CAF50;
  font-weight: bold;
}

.status-inactive {
  color: #F44336;
  font-weight: bold;
}

.service-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background-color: #2196F3;
  color: white;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #0b7dda;
}

button:disabled {
  background-color: #bbb;
  cursor: not-allowed;
}

.system-info {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
}

.system-info h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #333;
}

.refresh-button {
  margin-top: 10px;
  background-color: #009688;
}

.refresh-button:hover {
  background-color: #00796b;
}

@media (max-width: 768px) {
  .service-cards {
    flex-direction: column;
  }
  
  .service-card {
    min-width: auto;
  }
}
</style> 