/**
 * 提供虚拟滚动的紧急恢复机制
 * @param {Object} options - 配置选项
 * @param {Boolean} options.enabled - 是否启用恢复机制
 * @param {Number} options.recoveryAttempts - 最大恢复尝试次数
 * @param {Number} options.recoveryDelay - 恢复尝试间隔(ms)
 * @param {Function} options.onRecoveryStart - 恢复开始回调
 * @param {Function} options.onRecoverySuccess - 恢复成功回调
 * @param {Function} options.onRecoveryFail - 恢复失败回调
 * @returns {Object} - 恢复机制API
 */
export function useEmergencyRecovery(options = {}) {
  const defaultOptions = {
    enabled: true,
    recoveryAttempts: 3,
    recoveryDelay: 5000,
    onRecoveryStart: null,
    onRecoverySuccess: null,
    onRecoveryFail: null
  };

  const opts = { ...defaultOptions, ...options };
  let recoveryState = {
    attemptCount: 0,
    isRecovering: false,
    lastRecoveryTime: 0,
    scheduledRecoveryId: null
  };

  function safeCallback(callback, ...args) {
    if (typeof callback === 'function') {
      try {
        callback(...args);
      } catch (error) {
        console.error('恢复回调执行错误:', error);
      }
    }
  }

  function scheduleRecovery(recoveryFn, context) {
    if (!opts.enabled || recoveryState.isRecovering) return false;
    
    // 重置状态数据
    clearScheduledRecovery();
    
    // 增加尝试计数
    recoveryState.attemptCount++;
    recoveryState.isRecovering = true;
    
    // 通知恢复开始
    safeCallback(opts.onRecoveryStart, {
      attemptCount: recoveryState.attemptCount,
      context
    });
    
    // 延迟执行恢复
    recoveryState.scheduledRecoveryId = setTimeout(() => {
      try {
        recoveryFn();
        recoveryState.lastRecoveryTime = Date.now();
        recoveryState.isRecovering = false;
        
        // 恢复成功
        safeCallback(opts.onRecoverySuccess, {
          attemptCount: recoveryState.attemptCount,
          recoveryTime: recoveryState.lastRecoveryTime,
          context
        });
      } catch (error) {
        recoveryState.isRecovering = false;
        
        // 恢复失败
        safeCallback(opts.onRecoveryFail, {
          error,
          attemptCount: recoveryState.attemptCount,
          context
        });
        
        // 如果尝试次数未达上限，重新调度恢复
        if (recoveryState.attemptCount < opts.recoveryAttempts) {
          scheduleRecovery(recoveryFn, { ...context, previousError: error });
        }
      }
    }, opts.recoveryDelay);
    
    return true;
  }

  function clearScheduledRecovery() {
    if (recoveryState.scheduledRecoveryId) {
      clearTimeout(recoveryState.scheduledRecoveryId);
      recoveryState.scheduledRecoveryId = null;
    }
  }

  function resetRecoveryState() {
    clearScheduledRecovery();
    recoveryState = {
      attemptCount: 0,
      isRecovering: false,
      lastRecoveryTime: 0,
      scheduledRecoveryId: null
    };
  }

  return {
    scheduleRecovery,
    cancelRecovery: clearScheduledRecovery,
    resetRecovery: resetRecoveryState,
    getRecoveryState: () => ({ ...recoveryState }),
    setEnabled: (enabled) => {
      opts.enabled = !!enabled;
      if (!enabled) {
        clearScheduledRecovery();
      }
    }
  };
} 