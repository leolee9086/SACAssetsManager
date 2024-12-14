export const getNames = (asset) => {
  return asset?.path.split('/').pop()
}

export const getFileFormat = (assets) => {
  if (assets.length === 0) return '';
  const formats = new Set(assets.map(asset => asset.path.split('.').pop().toUpperCase()));
  return formats.size === 1 ? Array.from(formats)[0] : '多种';
}

