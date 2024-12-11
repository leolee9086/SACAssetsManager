import { RendererType } from './base.js';
import { VditorRenderer } from './editor.js';
import { 
  FileTreeRenderer, 
  OutlineRenderer, 
  BacklinksRenderer, 
  BookmarkRenderer 
} from './components.js';

// 渲染器注册表
const rendererRegistry = new Map();

// 注册渲染器
export function registerRenderer(type, rendererClass) {
  rendererRegistry.set(type, rendererClass);
}

// 创建渲染器实例
export function createRenderer(type, options = {}) {
  const RendererClass = rendererRegistry.get(type);
  if (!RendererClass) {
    throw new Error(`No renderer registered for type: ${type}`);
  }
  return new RendererClass(options);
}

// 注册所有渲染器
registerRenderer(RendererType.EDITOR, VditorRenderer);
registerRenderer(RendererType.FILE_TREE, FileTreeRenderer);
registerRenderer(RendererType.OUTLINE, OutlineRenderer);
registerRenderer(RendererType.BACKLINKS, BacklinksRenderer);
registerRenderer(RendererType.BOOKMARK, BookmarkRenderer);

// 添加样式
const style = document.createElement('style');
style.textContent = `
  .placeholder {
    padding: 16px;
    text-align: center;
    color: var(--cc-text-secondary);
    font-size: 14px;
  }
  
  .file-tree-container,
  .outline-container,
  .backlinks-container,
  .bookmark-container {
    height: 100%;
    width: 100%;
    overflow: auto;
  }
`;
document.head.appendChild(style); 