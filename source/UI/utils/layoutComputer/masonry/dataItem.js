export  function 更新图片尺寸(e, cardData,size,表格视图阈值,updateSizeCallback) {
    const previewer = e.target;
    const { naturalWidth, naturalHeight } = previewer;
    const { cardHeight: 新卡片高度, imageHeight: 新图片高度 } = 根据目标宽度计算新高度(naturalWidth, naturalHeight, size, 表格视图阈值);

    // 使用回调函数来更新 Vue 的状态
    updateSizeCallback({ width: cardData.width, height: 新卡片高度 });
}
function 根据目标宽度计算新高度(原始高度, 原始宽度, 目标宽度, 表格视图阈值) {
    const 缩放因子 = 原始高度 / 目标宽度;
    const 新高度 = 原始宽度 / 缩放因子;

    if (目标宽度 < 表格视图阈值) {
        return {
            cardHeight: 目标宽度,
            imageHeight: 新高度
        };
    } else {
        return {
            cardHeight: 新高度 + 36,
            imageHeight: 新高度
        };
    }
}