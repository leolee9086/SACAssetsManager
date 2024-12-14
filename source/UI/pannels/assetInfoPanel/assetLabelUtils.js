export const getAssetLabel = (assets) => {
  if (assets.length === 0) return '';
  
  if (assets.length <= 3) {
    return assets.map(item => item?.path.split('/').pop()).join(', ');
  }
  
  return `${assets[0]?.path.split('/').pop()} 等 ${assets.length} 个文件`;
}
