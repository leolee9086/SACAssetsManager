const edge = require('electron-edge-js');
const path = require('path');

// 定义调用 Everything32.dll 的函数
const everythingDllPath = path.join(window.siyuanConfig.system.workspaceDir, "data/plugins/SACAssetsManager/source/server/utils/glob/everything/Everything64.dll")

const createEdgeFunction = (methodName) => {
    return edge.func({
        source: `
        using System;
        using System.Runtime.InteropServices;
        using System.Collections.Generic;
        using System.IO;
        using System.Threading.Tasks;

        public class Startup
        {
            [DllImport("D:/思源主库/data/plugins/SACAssetsManager/source/server/utils/glob/everything/Everything64.dll", CharSet = CharSet.Unicode)]
            public static extern int Everything_SetSearchW(string lpSearchString);
            [DllImport("D:/思源主库/data/plugins/SACAssetsManager/source/server/utils/glob/everything/Everything64.dll", CharSet = CharSet.Unicode)]
            public static extern int Everything_SetReplyWindow(IntPtr hWnd);
            [DllImport("D:/思源主库/data/plugins/SACAssetsManager/source/server/utils/glob/everything/Everything64.dll", CharSet = CharSet.Unicode)]
            public static extern int Everything_SetReplyID(int nId);
            [DllImport("D:/思源主库/data/plugins/SACAssetsManager/source/server/utils/glob/everything/Everything64.dll", CharSet = CharSet.Unicode)]
            public static extern int Everything_SetMax(int dwMax);
            [DllImport("D:/思源主库/data/plugins/SACAssetsManager/source/server/utils/glob/everything/Everything64.dll", CharSet = CharSet.Unicode)]
            public static extern int Everything_SetOffset(int dwOffset);
            [DllImport("D:/思源主库/data/plugins/SACAssetsManager/source/server/utils/glob/everything/Everything64.dll", CharSet = CharSet.Unicode)]
            public static extern bool  Everything_QueryW(bool bWait);
            public async Task<object> Invoke(dynamic input)
            {
                
                try{
                    Everything_SetSearchW(input);
                    return   Everything_QueryW(true);
                }
                catch (Exception ex){
                return   1;
                }
            }
        }
        `,
    });
};


// 操作搜索状态
export const Everything_SetSearchW = createEdgeFunction('SetSearch');
export const Everything_SetMatchPath = createEdgeFunction('SetMatchPath');
export const Everything_SetMatchCase = createEdgeFunction('SetMatchCase');
export const Everything_SetMatchWholeWord = createEdgeFunction('SetMatchWholeWord');
export const Everything_SetRegex = createEdgeFunction('SetRegex');
export const Everything_SetMax = createEdgeFunction('SetMax');
export const Everything_SetOffset = createEdgeFunction('SetOffset');
export const Everything_SetReplyWindow = createEdgeFunction('SetReplyWindow');
export const Everything_SetReplyID = createEdgeFunction('SetReplyID');
export const Everything_SetSort = createEdgeFunction('SetSort');
export const Everything_SetRequestFlags = createEdgeFunction('SetRequestFlags');

// 读取搜索状态
export const Everything_GetSearch = createEdgeFunction('GetSearch');
export const Everything_GetMatchPath = createEdgeFunction('GetMatchPath');
export const Everything_GetMatchCase = createEdgeFunction('GetMatchCase');
export const Everything_GetMatchWholeWord = createEdgeFunction('GetMatchWholeWord');
export const Everything_GetRegex = createEdgeFunction('GetRegex');
export const Everything_GetMax = createEdgeFunction('GetMax');
export const Everything_GetOffset = createEdgeFunction('GetOffset');
export const Everything_GetReplyWindow = createEdgeFunction('GetReplyWindow');
export const Everything_GetReplyID = createEdgeFunction('GetReplyID');
export const Everything_GetLastError = createEdgeFunction('GetLastError');
export const Everything_GetSort = createEdgeFunction('GetSort');
export const Everything_GetRequestFlags = createEdgeFunction('GetRequestFlags');

// 执行询问
export const Everything_Query = createEdgeFunction('Query');

// 检查询问应答
export const Everything_IsQueryReply = createEdgeFunction('IsQueryReply');

// 操作结果
export const Everything_SortResultsByPath = createEdgeFunction('SortResultsByPath');
export const Everything_Reset = createEdgeFunction('Reset');

// 读取结果
export const Everything_GetNumFileResults = createEdgeFunction('GetNumFileResults');
export const Everything_GetNumFolderResults = createEdgeFunction('GetNumFolderResults');
export const Everything_GetNumResults = createEdgeFunction('GetNumResults');
export const Everything_GetTotFileResults = createEdgeFunction('GetTotFileResults');
export const Everything_GetTotFolderResults = createEdgeFunction('GetTotFolderResults');
export const Everything_GetTotResults = createEdgeFunction('GetTotResults');
export const Everything_IsVolumeResult = createEdgeFunction('IsVolumeResult');
export const Everything_IsFolderResult = createEdgeFunction('IsFolderResult');
export const Everything_IsFileResult = createEdgeFunction('IsFileResult');
export const Everything_GetResultFileName = createEdgeFunction('GetResultFileName');
export const Everything_GetResultPath = createEdgeFunction('GetResultPath');
export const Everything_GetResultFullPathName = createEdgeFunction('GetResultFullPathName');
export const Everything_GetResultListSort = createEdgeFunction('GetResultListSort');
export const Everything_GetResultListRequestFlags = createEdgeFunction('GetResultListRequestFlags');
export const Everything_GetResultExtension = createEdgeFunction('GetResultExtension');
export const Everything_GetResultSize = createEdgeFunction('GetResultSize');
export const Everything_GetResultDateCreated = createEdgeFunction('GetResultDateCreated');
export const Everything_GetResultDateModified = createEdgeFunction('GetResultDateModified');
export const Everything_GetResultDateAccessed = createEdgeFunction('GetResultDateAccessed');
export const Everything_GetResultAttributes = createEdgeFunction('GetResultAttributes');
export const Everything_GetResultFileListFileName = createEdgeFunction('GetResultFileListFileName');
export const Everything_GetResultRunCount = createEdgeFunction('GetResultRunCount');
export const Everything_GetResultDateRun = createEdgeFunction('GetResultDateRun');
export const Everything_GetResultDateRecentlyChanged = createEdgeFunction('GetResultDateRecentlyChanged');
export const Everything_GetResultHighlightedFileName = createEdgeFunction('GetResultHighlightedFileName');
export const Everything_GetResultHighlightedPath = createEdgeFunction('GetResultHighlightedPath');
export const Everything_GetResultHighlightedFullPathAndFileName = createEdgeFunction('GetResultHighlightedFullPathAndFileName');

// 常规
export const Everything_CleanUp = createEdgeFunction('CleanUp');
export const Everything_GetMajorVersion = createEdgeFunction('GetMajorVersion');
export const Everything_GetMinorVersion = createEdgeFunction('GetMinorVersion');
export const Everything_GetRevision = createEdgeFunction('GetRevision');
export const Everything_GetBuildNumber = createEdgeFunction('GetBuildNumber');
export const Everything_Exit = createEdgeFunction('Exit');
export const Everything_IsDBLoaded = createEdgeFunction('IsDBLoaded');
export const Everything_IsAdmin = createEdgeFunction('IsAdmin');
export const Everything_IsAppData = createEdgeFunction('IsAppData');
export const Everything_RebuildDB = createEdgeFunction('RebuildDB');
export const Everything_UpdateAllFolderIndexes = createEdgeFunction('UpdateAllFolderIndexes');
export const Everything_SaveDB = createEdgeFunction('SaveDB');
export const Everything_SaveRunHistory = createEdgeFunction('SaveRunHistory');
export const Everything_DeleteRunHistory = createEdgeFunction('DeleteRunHistory');
export const Everything_GetTargetMachine = createEdgeFunction('GetTargetMachine');

// 运行历史
export const Everything_GetRunCountFromFileName = createEdgeFunction('GetRunCountFromFileName');
export const Everything_SetRunCountFromFileName = createEdgeFunction('SetRunCountFromFileName');
export const Everything_IncRunCountFromFileName = createEdgeFunction('IncRunCountFromFileName');
