/**
 * @fileoverview 【已废弃】思源笔记工作空间操作API
 * 此文件为兼容层，请不要直接使用。
 * 请从 src/toolBox/useAge/forSiyuan/useSiyuanWorkspace.js 导入
 */

import {
  检查工作空间目录,
  创建工作空间目录,
  移除工作空间目录,
  物理删除工作空间目录,
  获取移动端工作空间列表,
  获取工作空间列表,
  设置工作空间目录,
  列出工作空间目录,
  获取工作空间配置,
  获取工作空间状态,
  checkWorkspaceDir,
  createWorkspaceDir,
  removeWorkspaceDir,
  removeWorkspaceDirPhysically,
  getMobileWorkspaces,
  getWorkspaces,
  setWorkspaceDir,
  listWorkspaceDir,
  getWorkspaceConfig,
  getWorkspaceState,
} from '../../../src/toolBox/useAge/forSiyuan/useSiyuanWorkspace.js';

// 记录警告
console.warn('siyuanKernel/workspace.js 已经废弃，请从 src/toolBox/useAge/forSiyuan/useSiyuanWorkspace.js 导入');

// 为兼容性重新导出
export {
  // 中文API
  检查工作空间目录,
  创建工作空间目录,
  移除工作空间目录,
  物理删除工作空间目录,
  获取移动端工作空间列表,
  获取工作空间列表,
  设置工作空间目录,
  列出工作空间目录,
  获取工作空间配置,
  获取工作空间状态,
  
  // 英文API
  checkWorkspaceDir,
  createWorkspaceDir,
  removeWorkspaceDir,
  removeWorkspaceDirPhysically,
  getMobileWorkspaces,
  getWorkspaces,
  setWorkspaceDir,
  listWorkspaceDir,
  getWorkspaceConfig,
  getWorkspaceState,
}; 