const presetGridRatios = [
    { name: '正方形', basis1: { x: 20, y: 0 }, basis2: { x: 0, y: 20 } },
    { name: '菱形', basis1: { x: 20, y: 20 }, basis2: { x: -20, y: 20 } },
    { name: '1:2矩形', basis1: { x: 20, y: 0 }, basis2: { x: 0, y: 40 } },
    { name: '六角形', basis1: { x: 20, y: 0 }, basis2: { x: 10, y: 17.32 } }, // sqrt(3)/2 ≈ 0.866
    { name: '2:1矩形', basis1: { x: 40, y: 0 }, basis2: { x: 0, y: 20 } },
    { name: '六角形', basis1: { x: 50, y: 0 }, basis2: { x: 25, y: 43.3 } }, // 约等于 50 * cos(120°), 50 * sin(120°)
  ]
  
const applyPresetRatio = (preset) => {
    const normalizedBasis1 = validateAndNormalizeBasis(preset.basis1);
    const normalizedBasis2 = validateAndNormalizeBasis(preset.basis2);
  
    basis1.value = normalizedBasis1;
    basis2.value = normalizedBasis2;
  
    genGridStyle();
  }