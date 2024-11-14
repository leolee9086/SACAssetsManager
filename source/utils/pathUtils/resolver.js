const path =require('path')
/**
 * 将插件相对路径转换为绝对路径
 * @param {string} relativePath 相对路径
 * @returns {string} 绝对路径
 */
export function resolvePluginPath(relativePath) {
  if (!relativePath) return '';
  
  // 移除协议前缀
  const cleanPath = relativePath.replace(/^file:\/\//, '');
  
  // 获取思源笔记的工作空间路径
  const workspaceDir = window.siyuan?.config?.system?.workspaceDir;
  if (!workspaceDir) {
    console.warn('未找到思源笔记工作空间路径');
    return cleanPath;
  }

  // 先处理插件路径的情况
  if (cleanPath.startsWith('/plugins')) {
    return path.join(workspaceDir, cleanPath);
  }
  
  // 再判断是否为绝对路径
  if (path.isAbsolute(cleanPath)) {
    return cleanPath;
  }
  
  // 其他情况，相对于工作空间目录
  return path.join(workspaceDir, cleanPath);
}

/**
 * 格式化文件路径显示
 * @param {string} filePath 文件路径
 * @returns {string} 格式化后的路径
 */
export function formatDisplayPath(filePath) {
  if (!filePath) return '未知路径';
  
  // 获取工作空间路径
  const workspaceDir = window.siyuan?.config?.system?.workspaceDir;
  if (workspaceDir && filePath.startsWith(workspaceDir)) {
    // 如果是工作空间内的路径，显示相对于工作空间的路径
    const relativePath = path.relative(workspaceDir, filePath);
    const parts = relativePath.split(/[/\\]/);
    return parts.length > 2 ? parts.slice(-2).join('/') : relativePath;
  }
  
  // 其他情况，显示最后两级目录
  const parts = filePath.split(/[/\\]/);
  return parts.slice(-2).join('/');
}
