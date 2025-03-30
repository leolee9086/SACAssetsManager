/**
 * 检测设备电池状态信息
 * @async
 * @function checkBatteryStatus
 * @returns {Promise<Object|null>} 返回包含电池状态的对象或null(当API不可用时)
 * @property {boolean} charging - 是否正在充电
 * @property {number} level - 电量百分比(0-1)
 * @property {number} chargingTime - 充满剩余时间(秒)
 * @property {number} dischargingTime - 耗尽剩余时间(秒)
 * @example
 * const batteryInfo = await checkBatteryStatus();
 * if (batteryInfo) {
 *   console.log(`当前电量: ${batteryInfo.level * 100}%`);
 * }
 */
export const checkBatteryStatus = async () => {
  try {
    if ('getBattery' in navigator) {
      const battery = await navigator.getBattery()
      return {
        charging: battery.charging,
        level: battery.level,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      }
    }
    return null
  } catch (e) {
    console.warn('电池状态检查失败:', e)
    return null
  }
}
