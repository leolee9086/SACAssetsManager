import Vditor from 'https://esm.sh/vditor@3.9.9';
import { BaseRenderer } from './base.js';

export class VditorRenderer extends BaseRenderer {
  constructor(options) {
    super(options);
    this.editor = null;
  }

  async mount(container) {
    this.editor = new Vditor(container, {
      height: '100%',
      mode: 'ir',
      theme: 'dark',
      value: this.options.value || '',
      cache: {
        enable: false
      },
      after: () => {
        this.editor.setValue(this.options.value || '');
      }
    });
  }

  async unmount(container) {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
  }
} 