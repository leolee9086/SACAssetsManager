/**
 * 特殊输入设备支持模块
 * 提供对数位板、3D鼠标、眼动追踪等专业输入设备的支持
 */

/**
 * 设备类型枚举
 * @enum {string}
 */
export const DeviceType = {
  STYLUS: 'stylus',        // 触控笔/数位笔
  WHEEL: 'wheel',          // 滚轮设备
  TOUCHPAD: 'touchpad',    // 触控板
  DIGITIZER: 'digitizer',  // 数位板
  GAMEPAD: 'gamepad',      // 游戏手柄
  EYETRACKER: 'eyetracker',// 眼动追踪
  SPATIAL: 'spatial',      // 空间手势设备
  MIDI: 'midi',            // MIDI控制器
  DIAL: 'dial'             // 旋钮控制器
};

/**
 * 创建特殊设备管理器
 * 
 * @param {Object} options - 配置选项
 * @param {Object} options.eventManager - 事件管理器实例
 * @param {boolean} options.detectOnInit - 是否在初始化时自动检测设备
 * @returns {Object} 特殊设备管理器API
 */
export const createSpecialDeviceManager = (options = {}) => {
  const {
    eventManager = null,
    detectOnInit = true
  } = options;
  
  if (!eventManager) {
    throw new Error('特殊设备管理器需要一个事件管理器实例');
  }
  
  // 设备状态管理
  const deviceState = {
    detectedDevices: new Map(),
    activeDevices: new Map(),
    deviceHandlers: new Map(),
    supportsPointerEvents: 'PointerEvent' in window,
    supportsPressure: false,
    supportsTilt: false,
    supportsGamepad: 'getGamepads' in navigator,
    supportsMIDI: 'requestMIDIAccess' in navigator,
    eyeTrackerCalibrated: false
  };
  
  // 检测特殊设备能力
  const detectDeviceCapabilities = () => {
    // 检测是否支持压力感应
    deviceState.supportsPressure = testPressureSupport();
    
    // 检测是否支持笔倾斜度
    deviceState.supportsTilt = testTiltSupport();
    
    // 检测是否支持眼动追踪
    checkEyeTrackingSupport().then(supported => {
      if (supported) {
        registerDevice(DeviceType.EYETRACKER, {
          name: 'Eye Tracker',
          calibrated: false
        });
      }
    });
    
    // 检测MIDI设备
    if (deviceState.supportsMIDI) {
      detectMIDIDevices();
    }
    
    // 检测游戏手柄
    if (deviceState.supportsGamepad) {
      detectGamepads();
    }
    
    // 触发能力检测事件
    if (eventManager) {
      eventManager.core.dispatch('customDeviceCapabilitiesDetected', null, {
        capabilities: {
          pressure: deviceState.supportsPressure,
          tilt: deviceState.supportsTilt,
          pointerEvents: deviceState.supportsPointerEvents,
          gamepad: deviceState.supportsGamepad,
          midi: deviceState.supportsMIDI
        },
        timestamp: Date.now()
      });
    }
  };
  
  /**
   * 测试设备是否支持压力感应
   * @returns {boolean} 是否支持压力感应
   */
  const testPressureSupport = () => {
    if (!deviceState.supportsPointerEvents) return false;
    
    // 创建一个测试事件，尝试读取pressure属性
    const testEvent = new PointerEvent('pointerdown');
    return typeof testEvent.pressure !== 'undefined';
  };
  
  /**
   * 测试设备是否支持笔倾斜度
   * @returns {boolean} 是否支持笔倾斜度
   */
  const testTiltSupport = () => {
    if (!deviceState.supportsPointerEvents) return false;
    
    // 创建一个测试事件，尝试读取tiltX和tiltY属性
    const testEvent = new PointerEvent('pointerdown');
    return typeof testEvent.tiltX !== 'undefined' && typeof testEvent.tiltY !== 'undefined';
  };
  
  /**
   * 检查眼动追踪支持
   * @returns {Promise<boolean>} 是否支持眼动追踪
   */
  const checkEyeTrackingSupport = async () => {
    try {
      // 如果浏览器支持WebXR，可能支持眼动追踪
      if ('xr' in navigator) {
        // 检查是否支持眼动追踪功能
        // 这是未来API，目前可能不可用
        if ('supportsSession' in navigator.xr) {
          try {
            // 检查是否支持eye-tracking特性
            const supported = await navigator.xr.supportsSession('immersive-ar', {
              optionalFeatures: ['eye-tracking']
            });
            return supported;
          } catch (e) {
            // 不支持
            return false;
          }
        }
      }
      
      // 检查其他可能的眼动追踪API
      return 'EyeTracker' in window;
    } catch (error) {
      return false;
    }
  };
  
  /**
   * 注册设备到系统
   * @param {string} type - 设备类型
   * @param {Object} deviceInfo - 设备信息
   * @returns {string} 设备ID
   */
  const registerDevice = (type, deviceInfo) => {
    const deviceId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    deviceState.detectedDevices.set(deviceId, {
      id: deviceId,
      type,
      info: deviceInfo,
      connected: true,
      lastActive: Date.now()
    });
    
    // 触发设备检测事件
    if (eventManager) {
      eventManager.core.dispatch('customDeviceDetected', null, {
        deviceId,
        type,
        info: deviceInfo,
        timestamp: Date.now()
      });
    }
    
    return deviceId;
  };
  
  /**
   * 注销设备
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否成功注销
   */
  const unregisterDevice = (deviceId) => {
    const device = deviceState.detectedDevices.get(deviceId);
    if (!device) return false;
    
    // 更新设备状态
    device.connected = false;
    deviceState.detectedDevices.set(deviceId, device);
    
    // 如果设备处于活动状态，停用它
    if (deviceState.activeDevices.has(deviceId)) {
      deactivateDevice(deviceId);
    }
    
    // 触发设备断开事件
    if (eventManager) {
      eventManager.core.dispatch('customDeviceDisconnected', null, {
        deviceId,
        type: device.type,
        timestamp: Date.now()
      });
    }
    
    return true;
  };
  
  /**
   * 激活设备
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否成功激活
   */
  const activateDevice = (deviceId) => {
    const device = deviceState.detectedDevices.get(deviceId);
    if (!device || !device.connected) return false;
    
    deviceState.activeDevices.set(deviceId, {
      ...device,
      activatedAt: Date.now()
    });
    
    // 为设备类型设置专用处理器
    switch (device.type) {
      case DeviceType.STYLUS:
        setupStylusHandlers();
        break;
        
      case DeviceType.DIGITIZER:
        setupDigitizerHandlers();
        break;
        
      case DeviceType.GAMEPAD:
        setupGamepadHandlers(deviceId, device.info);
        break;
        
      case DeviceType.MIDI:
        setupMIDIHandlers(deviceId, device.info);
        break;
        
      case DeviceType.EYETRACKER:
        setupEyeTrackingHandlers();
        break;
        
      // 其他设备类型的处理...
    }
    
    // 触发设备激活事件
    if (eventManager) {
      eventManager.core.dispatch('customDeviceActivated', null, {
        deviceId,
        type: device.type,
        timestamp: Date.now()
      });
    }
    
    return true;
  };
  
  /**
   * 停用设备
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否成功停用
   */
  const deactivateDevice = (deviceId) => {
    if (!deviceState.activeDevices.has(deviceId)) return false;
    
    const device = deviceState.activeDevices.get(deviceId);
    deviceState.activeDevices.delete(deviceId);
    
    // 移除设备特定的处理器
    const handlers = deviceState.deviceHandlers.get(deviceId);
    if (handlers) {
      handlers.forEach(handler => {
        if (typeof handler.cleanup === 'function') {
          handler.cleanup();
        }
      });
      deviceState.deviceHandlers.delete(deviceId);
    }
    
    // 触发设备停用事件
    if (eventManager) {
      eventManager.core.dispatch('customDeviceDeactivated', null, {
        deviceId,
        type: device.type,
        timestamp: Date.now()
      });
    }
    
    return true;
  };
  
  /**
   * 设置数位笔事件处理器
   */
  const setupStylusHandlers = () => {
    if (!deviceState.supportsPointerEvents) return;
    
    const container = eventManager.core.getState().value.container;
    if (!container) return;
    
    // 增强处理笔压力和倾斜数据的事件处理器
    const stylusHandler = (event) => {
      // 只处理笔类型的指针事件
      if (event.pointerType !== 'pen') return;
      
      // 基础指针数据
      const pointerData = {
        x: event.clientX,
        y: event.clientY,
        pressure: event.pressure || 0,
        tiltX: event.tiltX || 0,
        tiltY: event.tiltY || 0,
        twist: event.twist || 0,
        type: event.type,
        pointerType: event.pointerType,
        timestamp: Date.now()
      };
      
      // 触发增强的笔事件
      eventManager.core.dispatch('customStylusEvent', event, {
        pointer: pointerData,
        original: event
      });
    };
    
    // 绑定事件
    const stylusEvents = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'];
    const boundHandlers = new Map();
    
    stylusEvents.forEach(eventType => {
      container.addEventListener(eventType, stylusHandler, { passive: false });
      boundHandlers.set(eventType, stylusHandler);
    });
    
    // 存储绑定的处理器，以便后续清理
    deviceState.deviceHandlers.set(DeviceType.STYLUS, {
      handlers: boundHandlers,
      cleanup: () => {
        boundHandlers.forEach((handler, eventType) => {
          container.removeEventListener(eventType, handler);
        });
      }
    });
  };
  
  /**
   * 设置数位板事件处理器
   */
  const setupDigitizerHandlers = () => {
    // 数位板通常通过pointerEvents进行交互
    // 增加对此类设备的额外属性支持，如敏感度
    
    // 这里实现数位板特定功能
  };
  
  /**
   * 获取设备列表
   * @param {string} [type] - 可选的设备类型过滤
   * @returns {Array} 设备列表
   */
  const getDevices = (type) => {
    const devices = Array.from(deviceState.detectedDevices.values())
      .filter(device => device.connected);
    
    if (type) {
      return devices.filter(device => device.type === type);
    }
    
    return devices;
  };
  
  /**
   * 获取活动设备列表
   * @param {string} [type] - 可选的设备类型过滤
   * @returns {Array} 活动设备列表
   */
  const getActiveDevices = (type) => {
    const devices = Array.from(deviceState.activeDevices.values());
    
    if (type) {
      return devices.filter(device => device.type === type);
    }
    
    return devices;
  };
  
  /**
   * 检测MIDI设备
   */
  const detectMIDIDevices = async () => {
    if (!deviceState.supportsMIDI) return;
    
    try {
      const midiAccess = await navigator.requestMIDIAccess();
      
      // 处理现有MIDI设备
      midiAccess.inputs.forEach(input => {
        const deviceId = registerDevice(DeviceType.MIDI, {
          name: input.name || 'MIDI Controller',
          manufacturer: input.manufacturer,
          connection: input.connection,
          state: input.state,
          type: 'input',
          version: input.version
        });
      });
      
      // 监听MIDI设备变化
      midiAccess.onstatechange = (event) => {
        const device = event.port;
        
        if (device.type === 'input') {
          if (device.state === 'connected') {
            registerDevice(DeviceType.MIDI, {
              name: device.name || 'MIDI Controller',
              manufacturer: device.manufacturer,
              connection: device.connection,
              state: device.state,
              type: 'input',
              version: device.version
            });
          } else if (device.state === 'disconnected') {
            // 查找设备ID并注销
            const midiDevices = getDevices(DeviceType.MIDI);
            const matchingDevice = midiDevices.find(d => 
              d.info.name === device.name && 
              d.info.manufacturer === device.manufacturer
            );
            
            if (matchingDevice) {
              unregisterDevice(matchingDevice.id);
            }
          }
        }
      };
    } catch (error) {
      console.warn('MIDI访问失败:', error);
    }
  };
  
  /**
   * 设置MIDI设备处理器
   * @param {string} deviceId - 设备ID
   * @param {Object} deviceInfo - 设备信息
   */
  const setupMIDIHandlers = async (deviceId, deviceInfo) => {
    if (!deviceState.supportsMIDI) return;
    
    try {
      const midiAccess = await navigator.requestMIDIAccess();
      
      // 查找匹配的MIDI输入设备
      let targetInput = null;
      
      midiAccess.inputs.forEach(input => {
        if (input.name === deviceInfo.name && 
            input.manufacturer === deviceInfo.manufacturer) {
          targetInput = input;
        }
      });
      
      if (!targetInput) return;
      
      // 处理MIDI消息
      const onMIDIMessage = (message) => {
        const [command, note, velocity] = message.data;
        
        // 解析MIDI命令
        let eventType = '';
        let eventData = {};
        
        // note on
        if ((command & 0xf0) === 0x90 && velocity > 0) {
          eventType = 'midiNoteOn';
          eventData = { note, velocity };
        } 
        // note off
        else if ((command & 0xf0) === 0x80 || ((command & 0xf0) === 0x90 && velocity === 0)) {
          eventType = 'midiNoteOff';
          eventData = { note };
        }
        // control change
        else if ((command & 0xf0) === 0xb0) {
          eventType = 'midiControlChange';
          eventData = { controller: note, value: velocity };
        }
        
        if (eventType && eventManager) {
          eventManager.core.dispatch(`custom${eventType}`, null, {
            deviceId,
            deviceName: deviceInfo.name,
            ...eventData,
            timestamp: Date.now()
          });
        }
      };
      
      // 绑定事件处理器
      targetInput.onmidimessage = onMIDIMessage;
      
      // 存储处理器用于后续清理
      deviceState.deviceHandlers.set(deviceId, {
        cleanup: () => {
          if (targetInput) {
            targetInput.onmidimessage = null;
          }
        }
      });
    } catch (error) {
      console.warn('MIDI处理器设置失败:', error);
    }
  };
  
  /**
   * 检测游戏手柄
   */
  const detectGamepads = () => {
    if (!deviceState.supportsGamepad) return;
    
    // 检查现有游戏手柄
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    
    for (let i = 0; i < gamepads.length; i++) {
      const gamepad = gamepads[i];
      if (gamepad) {
        registerDevice(DeviceType.GAMEPAD, {
          name: gamepad.id || `Gamepad ${i}`,
          index: gamepad.index,
          buttons: gamepad.buttons.length,
          axes: gamepad.axes.length
        });
      }
    }
    
    // 监听游戏手柄连接/断开事件
    window.addEventListener('gamepadconnected', (event) => {
      const gamepad = event.gamepad;
      registerDevice(DeviceType.GAMEPAD, {
        name: gamepad.id || `Gamepad ${gamepad.index}`,
        index: gamepad.index,
        buttons: gamepad.buttons.length,
        axes: gamepad.axes.length
      });
    });
    
    window.addEventListener('gamepaddisconnected', (event) => {
      const gamepad = event.gamepad;
      // 查找对应设备并注销
      const gamepadDevices = getDevices(DeviceType.GAMEPAD);
      const matchingDevice = gamepadDevices.find(d => d.info.index === gamepad.index);
      
      if (matchingDevice) {
        unregisterDevice(matchingDevice.id);
      }
    });
  };
  
  /**
   * 设置游戏手柄处理器
   * @param {string} deviceId - 设备ID
   * @param {Object} deviceInfo - 设备信息
   */
  const setupGamepadHandlers = (deviceId, deviceInfo) => {
    if (!deviceState.supportsGamepad) return;
    
    let animationFrameId = null;
    let lastButtonStates = [];
    
    // 处理游戏手柄输入
    const processGamepadInput = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gamepad = gamepads[deviceInfo.index];
      
      if (!gamepad) {
        cancelAnimationFrame(animationFrameId);
        return;
      }
      
      // 处理按钮状态变化
      gamepad.buttons.forEach((button, index) => {
        const isPressed = button.pressed;
        
        // 检查按钮状态是否改变
        if (lastButtonStates[index] !== isPressed) {
          if (isPressed) {
            // 按钮按下
            eventManager.core.dispatch('customGamepadButtonPress', null, {
              deviceId,
              buttonIndex: index,
              value: button.value,
              timestamp: Date.now()
            });
          } else {
            // 按钮释放
            eventManager.core.dispatch('customGamepadButtonRelease', null, {
              deviceId,
              buttonIndex: index,
              timestamp: Date.now()
            });
          }
          
          lastButtonStates[index] = isPressed;
        }
      });
      
      // 处理轴输入（如摇杆）
      // 只在有明显变化时触发事件，避免过度触发
      gamepad.axes.forEach((value, index) => {
        // 忽略很小的变化，减少噪音
        if (Math.abs(value) > 0.1) {
          eventManager.core.dispatch('customGamepadAxisMove', null, {
            deviceId,
            axisIndex: index,
            value,
            timestamp: Date.now()
          });
        }
      });
      
      // 继续下一帧处理
      animationFrameId = requestAnimationFrame(processGamepadInput);
    };
    
    // 初始化按钮状态
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gamepad = gamepads[deviceInfo.index];
    
    if (gamepad) {
      lastButtonStates = gamepad.buttons.map(button => button.pressed);
    }
    
    // 开始处理游戏手柄输入
    animationFrameId = requestAnimationFrame(processGamepadInput);
    
    // 存储处理器用于后续清理
    deviceState.deviceHandlers.set(deviceId, {
      cleanup: () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      }
    });
  };
  
  /**
   * 设置眼动追踪处理器
   */
  const setupEyeTrackingHandlers = () => {
    // 眼动追踪技术目前在Web中还不常见
    // 以下是一个基于未来API的模拟实现
    
    let eyeTrackingSession = null;
    let calibrated = deviceState.eyeTrackerCalibrated;
    
    // 尝试启动眼动追踪会话
    const startEyeTracking = async () => {
      if ('xr' in navigator && 'requestSession' in navigator.xr) {
        try {
          // 请求带有眼动追踪功能的XR会话
          const session = await navigator.xr.requestSession('immersive-ar', {
            optionalFeatures: ['eye-tracking']
          });
          
          eyeTrackingSession = session;
          
          session.addEventListener('end', () => {
            eyeTrackingSession = null;
          });
          
          // 处理XR帧
          session.requestAnimationFrame((time, frame) => {
            if (!frame) return;
            
            // 获取眼动追踪输入源
            const inputSources = Array.from(frame.session.inputSources || [])
              .filter(source => source.targetRayMode === 'gaze');
            
            if (inputSources.length > 0) {
              const gazeInputSource = inputSources[0];
              
              // 获取凝视位置
              const gazeSpace = frame.getPose(gazeInputSource.targetRaySpace, frame.referenceSpace);
              
              if (gazeSpace) {
                const gazePosition = gazeSpace.transform.position;
                const gazeDirection = gazeSpace.transform.orientation;
                
                // 触发眼动事件
                eventManager.core.dispatch('customEyeTrackingGaze', null, {
                  position: {
                    x: gazePosition.x,
                    y: gazePosition.y,
                    z: gazePosition.z
                  },
                  direction: {
                    x: gazeDirection.x,
                    y: gazeDirection.y,
                    z: gazeDirection.z,
                    w: gazeDirection.w
                  },
                  timestamp: Date.now()
                });
              }
            }
            
            // 继续下一帧
            session.requestAnimationFrame(startEyeTracking);
          });
          
          return true;
        } catch (error) {
          console.warn('启动眼动追踪失败:', error);
          return false;
        }
      }
      
      // 备用方案: 检查自定义眼动追踪API
      if ('EyeTracker' in window) {
        try {
          const tracker = new window.EyeTracker();
          eyeTrackingSession = tracker;
          
          tracker.addEventListener('gazechange', (event) => {
            eventManager.core.dispatch('customEyeTrackingGaze', null, {
              position: event.detail.position,
              confidence: event.detail.confidence,
              timestamp: Date.now()
            });
          });
          
          return true;
        } catch (error) {
          console.warn('启动自定义眼动追踪失败:', error);
          return false;
        }
      }
      
      return false;
    };
    
    // 校准眼动追踪
    const calibrateEyeTracking = async () => {
      if (!eyeTrackingSession) {
        const started = await startEyeTracking();
        if (!started) return false;
      }
      
      // 实现校准流程
      // 通常需要用户聚焦在屏幕上的几个点上
      const calibrationPoints = [
        { x: 0.1, y: 0.1 }, // 左上
        { x: 0.9, y: 0.1 }, // 右上
        { x: 0.5, y: 0.5 }, // 中心
        { x: 0.1, y: 0.9 }, // 左下
        { x: 0.9, y: 0.9 }  // 右下
      ];
      
      // 触发校准开始事件
      eventManager.core.dispatch('customEyeTrackingCalibrationStart', null, {
        points: calibrationPoints,
        timestamp: Date.now()
      });
      
      // 这里应该有一个实际的校准流程
      // 以下为模拟
      
      // 模拟校准完成
      setTimeout(() => {
        calibrated = true;
        deviceState.eyeTrackerCalibrated = true;
        
        eventManager.core.dispatch('customEyeTrackingCalibrationComplete', null, {
          success: true,
          accuracy: 0.95,
          timestamp: Date.now()
        });
      }, 5000);
      
      return true;
    };
    
    // 停止眼动追踪
    const stopEyeTracking = () => {
      if (eyeTrackingSession) {
        if (eyeTrackingSession instanceof XRSession) {
          eyeTrackingSession.end();
        } else if (typeof eyeTrackingSession.disconnect === 'function') {
          eyeTrackingSession.disconnect();
        }
        
        eyeTrackingSession = null;
        return true;
      }
      
      return false;
    };
    
    // 存储处理器用于后续清理
    deviceState.deviceHandlers.set(DeviceType.EYETRACKER, {
      startTracking: startEyeTracking,
      calibrate: calibrateEyeTracking,
      isCalibrated: () => calibrated,
      cleanup: stopEyeTracking
    });
    
    // 如果配置为自动校准，则启动校准
    if (options.autoCalibrate) {
      calibrateEyeTracking();
    }
  };
  
  /**
   * 转换设备原始数据为标准化编辑器操作
   * @param {Object} deviceData - 设备输入数据
   * @param {string} deviceType - 设备类型
   * @returns {Object} 标准化的编辑器操作
   */
  const normalizeDeviceInput = (deviceData, deviceType) => {
    switch (deviceType) {
      case DeviceType.STYLUS:
      case DeviceType.DIGITIZER:
        return normalizeStylusInput(deviceData);
        
      case DeviceType.GAMEPAD:
        return normalizeGamepadInput(deviceData);
        
      case DeviceType.MIDI:
        return normalizeMIDIInput(deviceData);
        
      case DeviceType.EYETRACKER:
        return normalizeEyeTrackerInput(deviceData);
        
      default:
        return { type: 'unknown', data: deviceData };
    }
  };
  
  /**
   * 规范化数位笔输入
   * @param {Object} data - 设备输入数据
   * @returns {Object} 标准化的编辑器操作
   */
  const normalizeStylusInput = (data) => {
    // 基于压力和倾斜度等参数计算
    const pressure = data.pressure || 0;
    const tiltMagnitude = Math.sqrt(
      Math.pow(data.tiltX || 0, 2) + 
      Math.pow(data.tiltY || 0, 2)
    );
    
    // 计算笔划粗细
    const strokeWidth = pressure > 0.1 ? pressure * 10 : 1;
    
    // 计算笔划角度
    const angle = data.tiltX && data.tiltY 
      ? Math.atan2(data.tiltY, data.tiltX) 
      : 0;
    
    return {
      type: 'stylus',
      position: { x: data.x, y: data.y },
      pressure,
      tilt: {
        x: data.tiltX || 0,
        y: data.tiltY || 0,
        magnitude: tiltMagnitude
      },
      twist: data.twist || 0,
      calculatedStyle: {
        strokeWidth,
        angle,
        opacity: pressure
      },
      timestamp: data.timestamp || Date.now()
    };
  };
  
  /**
   * 规范化游戏手柄输入
   * @param {Object} data - 设备输入数据
   * @returns {Object} 标准化的编辑器操作
   */
  const normalizeGamepadInput = (data) => {
    // 基于按钮和轴输入计算操作
    return {
      type: 'gamepad',
      button: data.buttonIndex !== undefined ? {
        index: data.buttonIndex,
        pressed: data.type === 'customGamepadButtonPress',
        value: data.value || 0
      } : undefined,
      axis: data.axisIndex !== undefined ? {
        index: data.axisIndex,
        value: data.value || 0
      } : undefined,
      timestamp: data.timestamp || Date.now()
    };
  };
  
  /**
   * 规范化MIDI输入
   * @param {Object} data - 设备输入数据
   * @returns {Object} 标准化的编辑器操作
   */
  const normalizeMIDIInput = (data) => {
    return {
      type: 'midi',
      note: data.note,
      velocity: data.velocity,
      controller: data.controller,
      value: data.value,
      isNoteOn: data.type === 'midiNoteOn',
      isNoteOff: data.type === 'midiNoteOff',
      isControlChange: data.type === 'midiControlChange',
      deviceName: data.deviceName,
      timestamp: data.timestamp || Date.now()
    };
  };
  
  /**
   * 规范化眼动追踪输入
   * @param {Object} data - 设备输入数据
   * @returns {Object} 标准化的编辑器操作
   */
  const normalizeEyeTrackerInput = (data) => {
    return {
      type: 'gaze',
      position: data.position,
      direction: data.direction,
      confidence: data.confidence,
      timestamp: data.timestamp || Date.now()
    };
  };
  
  /**
   * 绑定特殊设备事件
   */
  const bindSpecialDeviceEvents = () => {
    if (!eventManager) return;
    
    // 监听特殊设备事件并标准化为编辑器操作
    const eventHandlers = {
      // 数位笔事件
      customStylusEvent: (event) => {
        const normalizedInput = normalizeStylusInput(event.detail.pointer);
        eventManager.core.dispatch('editorStylusInput', event.originalEvent, normalizedInput);
      },
      
      // 游戏手柄按钮事件
      customGamepadButtonPress: (event) => {
        const normalizedInput = normalizeGamepadInput({
          ...event.detail,
          type: 'customGamepadButtonPress'
        });
        eventManager.core.dispatch('editorGamepadInput', null, normalizedInput);
      },
      
      customGamepadButtonRelease: (event) => {
        const normalizedInput = normalizeGamepadInput({
          ...event.detail,
          type: 'customGamepadButtonRelease'
        });
        eventManager.core.dispatch('editorGamepadInput', null, normalizedInput);
      },
      
      // 游戏手柄轴事件
      customGamepadAxisMove: (event) => {
        const normalizedInput = normalizeGamepadInput({
          ...event.detail,
          type: 'customGamepadAxisMove'
        });
        eventManager.core.dispatch('editorGamepadInput', null, normalizedInput);
      },
      
      // MIDI事件
      midiNoteOn: (event) => {
        const normalizedInput = normalizeMIDIInput({
          ...event.detail,
          type: 'midiNoteOn'
        });
        eventManager.core.dispatch('editorMIDIInput', null, normalizedInput);
      },
      
      midiNoteOff: (event) => {
        const normalizedInput = normalizeMIDIInput({
          ...event.detail,
          type: 'midiNoteOff'
        });
        eventManager.core.dispatch('editorMIDIInput', null, normalizedInput);
      },
      
      midiControlChange: (event) => {
        const normalizedInput = normalizeMIDIInput({
          ...event.detail,
          type: 'midiControlChange'
        });
        eventManager.core.dispatch('editorMIDIInput', null, normalizedInput);
      },
      
      // 眼动追踪事件
      customEyeTrackingGaze: (event) => {
        const normalizedInput = normalizeEyeTrackerInput(event.detail);
        eventManager.core.dispatch('editorGazeInput', null, normalizedInput);
      }
    };
    
    // 注册所有处理器
    const boundHandlers = new Map();
    
    Object.entries(eventHandlers).forEach(([eventName, handler]) => {
      eventManager.core.on(eventName, handler);
      boundHandlers.set(eventName, handler);
    });
    
    // 存储绑定的处理器，用于清理
    return {
      cleanup: () => {
        boundHandlers.forEach((handler, eventName) => {
          eventManager.core.off(eventName, handler);
        });
      }
    };
  };
  
  // 初始化
  let initialized = false;
  let eventBindings = null;
  
  /**
   * 初始化特殊设备管理器
   */
  const init = () => {
    if (initialized) return false;
    
    // 检测设备能力
    detectDeviceCapabilities();
    
    // 绑定事件
    eventBindings = bindSpecialDeviceEvents();
    
    initialized = true;
    return true;
  };
  
  /**
   * 清理特殊设备管理器
   */
  const cleanup = () => {
    if (!initialized) return false;
    
    // 清理事件绑定
    if (eventBindings && typeof eventBindings.cleanup === 'function') {
      eventBindings.cleanup();
    }
    
    // 停用所有活动设备
    Array.from(deviceState.activeDevices.keys()).forEach(deviceId => {
      deactivateDevice(deviceId);
    });
    
    // 注销所有设备
    Array.from(deviceState.detectedDevices.keys()).forEach(deviceId => {
      unregisterDevice(deviceId);
    });
    
    initialized = false;
    return true;
  };
  
  // 如果配置为检测设备，则自动初始化
  if (detectOnInit) {
    init();
  }
  
  // 返回公共API
  return {
    init,
    cleanup,
    getDevices,
    getActiveDevices,
    registerDevice,
    unregisterDevice,
    activateDevice,
    deactivateDevice,
    detectDeviceCapabilities,
    // 眼动追踪特定API
    eyeTracking: {
      calibrate: () => {
        const handler = deviceState.deviceHandlers.get(DeviceType.EYETRACKER);
        return handler && typeof handler.calibrate === 'function' 
          ? handler.calibrate() 
          : Promise.resolve(false);
      },
      isCalibrated: () => {
        const handler = deviceState.deviceHandlers.get(DeviceType.EYETRACKER);
        return handler && typeof handler.isCalibrated === 'function' 
          ? handler.isCalibrated() 
          : false;
      }
    },
    // 工具函数
    normalizeDeviceInput,
    // 内部状态（仅用于调试）
    _debug: {
      getState: () => ({ ...deviceState })
    }
  };
};

/**
 * 创建特殊设备适配器
 * 将各种特殊设备集成到编辑器中
 * 
 * @param {Object} options - 配置选项
 * @param {Object} options.eventManager - 事件管理器实例
 * @param {Object} options.documentModel - 文档模型实例
 * @param {Object} options.deviceManager - 特殊设备管理器实例
 * @returns {Object} 特殊设备适配器API
 */
export const createSpecialDeviceAdapter = (options = {}) => {
  const {
    eventManager = null,
    documentModel = null,
    deviceManager = null
  } = options;
  
  if (!eventManager || !documentModel || !deviceManager) {
    throw new Error('特殊设备适配器需要事件管理器、文档模型和设备管理器实例');
  }
  
  // 创建命令映射
  const commandMappings = new Map();
  
  /**
   * 将设备输入映射到编辑器命令
   * @param {string} deviceType - 设备类型
   * @param {Object} inputPattern - 输入模式
   * @param {string|Function} command - 要执行的命令或函数
   */
  const mapInputToCommand = (deviceType, inputPattern, command) => {
    if (!commandMappings.has(deviceType)) {
      commandMappings.set(deviceType, []);
    }
    
    commandMappings.get(deviceType).push({
      pattern: inputPattern,
      command
    });
  };
  
  /**
   * 检查输入是否匹配模式
   * @param {Object} input - 标准化的输入
   * @param {Object} pattern - 匹配模式
   * @returns {boolean} 是否匹配
   */
  const matchesPattern = (input, pattern) => {
    // 简单的模式匹配，可以根据需要扩展
    return Object.entries(pattern).every(([key, value]) => {
      if (key === '_condition' && typeof value === 'function') {
        return value(input);
      }
      
      if (typeof value === 'object' && value !== null && typeof input[key] === 'object' && input[key] !== null) {
        return matchesPattern(input[key], value);
      }
      
      return input[key] === value;
    });
  };
  
  /**
   * 处理设备输入
   * @param {Object} input - 标准化的输入
   * @param {string} deviceType - 设备类型
   */
  const handleDeviceInput = (input, deviceType) => {
    const mappings = commandMappings.get(deviceType) || [];
    
    // 查找匹配的命令映射
    for (const mapping of mappings) {
      if (matchesPattern(input, mapping.pattern)) {
        // 执行命令
        if (typeof mapping.command === 'function') {
          mapping.command(input, documentModel);
        } else if (typeof mapping.command === 'string') {
          // 使用文档模型执行命令
          documentModel.execCommand(mapping.command, input);
        }
        
        // 找到匹配项后中断
        break;
      }
    }
  };
  
  // 绑定事件处理器
  const bindEventHandlers = () => {
    if (!eventManager) return null;
    
    const handlers = {
      // 数位笔输入
      editorStylusInput: (event) => {
        handleDeviceInput(event.detail, DeviceType.STYLUS);
      },
      
      // 游戏手柄输入
      editorGamepadInput: (event) => {
        handleDeviceInput(event.detail, DeviceType.GAMEPAD);
      },
      
      // MIDI输入
      editorMIDIInput: (event) => {
        handleDeviceInput(event.detail, DeviceType.MIDI);
      },
      
      // 眼动追踪输入
      editorGazeInput: (event) => {
        handleDeviceInput(event.detail, DeviceType.EYETRACKER);
      }
    };
    
    // 注册所有处理器
    const boundHandlers = new Map();
    
    Object.entries(handlers).forEach(([eventName, handler]) => {
      eventManager.core.on(eventName, handler);
      boundHandlers.set(eventName, handler);
    });
    
    // 返回清理函数
    return {
      cleanup: () => {
        boundHandlers.forEach((handler, eventName) => {
          eventManager.core.off(eventName, handler);
        });
      }
    };
  };
  
  // 设置默认命令映射
  const setupDefaultMappings = () => {
    // 数位笔映射示例
    mapInputToCommand(DeviceType.STYLUS, {
      pressure: { _condition: p => p > 0.8 },
      calculatedStyle: { strokeWidth: { _condition: w => w > 8 } }
    }, 'formatBold');
    
    mapInputToCommand(DeviceType.STYLUS, {
      tilt: { magnitude: { _condition: m => m > 45 } }
    }, 'formatItalic');
    
    // 游戏手柄映射示例
    mapInputToCommand(DeviceType.GAMEPAD, {
      button: { index: 0, pressed: true }
    }, 'moveCursorNext');
    
    mapInputToCommand(DeviceType.GAMEPAD, {
      button: { index: 1, pressed: true }
    }, 'moveCursorPrev');
    
    // MIDI控制器映射示例
    mapInputToCommand(DeviceType.MIDI, {
      isNoteOn: true,
      note: 60 // 中央C
    }, 'insertNewline');
    
    // 眼动追踪映射示例
    // 通常用于辅助功能
    mapInputToCommand(DeviceType.EYETRACKER, {
      _condition: input => {
        // 检测用户长时间凝视某个位置
        const dwellTime = 2000; // 2秒
        const now = Date.now();
        
        if (!lastGazePosition || !lastGazeTime) {
          lastGazePosition = input.position;
          lastGazeTime = now;
          return false;
        }
        
        // 计算与上次位置的距离
        const dx = input.position.x - lastGazePosition.x;
        const dy = input.position.y - lastGazePosition.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        // 如果视线移动很小且已经凝视足够长时间
        if (distance < 0.05 && now - lastGazeTime > dwellTime) {
          // 重置计时
          lastGazeTime = now;
          return true;
        }
        
        // 如果视线移动明显，更新位置和时间
        if (distance > 0.1) {
          lastGazePosition = input.position;
          lastGazeTime = now;
        }
        
        return false;
      }
    }, (input, model) => {
      // 在凝视位置执行点击
      const element = document.elementFromPoint(
        input.position.x * window.innerWidth,
        input.position.y * window.innerHeight
      );
      
      if (element) {
        element.click();
      }
    });
  };
  
  // 跟踪眼动位置
  let lastGazePosition = null;
  let lastGazeTime = null;
  
  // 初始化适配器
  let initialized = false;
  let eventBindings = null;
  
  /**
   * 初始化特殊设备适配器
   */
  const init = () => {
    if (initialized) return false;
    
    // 设置默认命令映射
    setupDefaultMappings();
    
    // 绑定事件
    eventBindings = bindEventHandlers();
    
    initialized = true;
    return true;
  };
  
  /**
   * 清理特殊设备适配器
   */
  const cleanup = () => {
    if (!initialized) return false;
    
    // 清理事件绑定
    if (eventBindings && typeof eventBindings.cleanup === 'function') {
      eventBindings.cleanup();
    }
    
    // 清空命令映射
    commandMappings.clear();
    
    initialized = false;
    return true;
  };
  
  // 返回公共API
  return {
    init,
    cleanup,
    mapInputToCommand
  };
};

// 导出创建特殊设备输入管理器的工厂函数
export default {
  createSpecialDeviceManager,
  createSpecialDeviceAdapter
}; 