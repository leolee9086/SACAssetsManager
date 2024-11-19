import { openDialog } from '../vueDialog.js';
export async function showHistogramDialog(result) {
  const { app, dialog } = openDialog(
    import.meta.resolve('./ImageHistogram.vue'),
    'ImageHistogram',
    {},
    '',
    result,
    '图像直方图:',
    '300px',
    'auto',
    true
  );

  return { app, dialog };
}