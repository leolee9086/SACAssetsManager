import { 当前设备支持压感 } from "../system/surport/pressure.js";

export const 获取事件压力值 = (e) => {
    if (当前设备支持压感 && e.pressure !== undefined && e.pressure !== 0) {
        return e.pressure;
    }
    return 1.0;
}