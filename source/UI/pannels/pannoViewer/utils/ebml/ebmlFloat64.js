// 在文件顶部添加 EBMLFloat64 类定义
export class EBMLFloat64 {
    constructor(value) {
        this.value = value;
        this.data = new ArrayBuffer(8);
        this._updateData();
    }

    // 新增setValue方法
    setValue(value) {
        this.value = value;
        this._updateData();
    }

    // 公共的更新数据方法
    _updateData() {
        new DataView(this.data).setFloat64(0, this.value, false); // 大端序
    }
}