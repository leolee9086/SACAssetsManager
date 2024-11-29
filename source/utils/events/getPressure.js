import { isPressureSupported } from "../system/surport/pressure";

export const 获取压力值 = (e) => {
    if (isPressureSupported() && e.pressure !== undefined && e.pressure !== 0) {
        return e.pressure;
    }
    return 1.0;
}