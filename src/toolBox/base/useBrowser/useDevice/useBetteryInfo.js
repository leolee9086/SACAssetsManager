  // 检测电池状态
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
