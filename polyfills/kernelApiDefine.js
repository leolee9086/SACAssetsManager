let kernelApiDefine = [
  ["GET", "/api/system/bootProgress", "bootProgress", "获取启动进度"],

  ["POST", "/api/system/bootProgress", "bootProgress", "获取启动进度"],

  ["GET", "/api/system/version", "version", "获取软件版本"],

  ["POST", "/api/system/version", "version", "获取软件版本"],

  ["POST", "/api/system/currentTime", "currentTime", "获取当前时间"],

  ["POST", "/api/system/uiproc", "addUIProcess", "UI生成进度"],

  ["POST", "/api/system/loginAuth", "LoginAuth", "登录鉴权"],

  ["POST", "/api/system/logoutAuth", "LogoutAuth", "退出登录"],

  ["GET", "/api/system/getCaptcha", "GetCaptcha", "获取验证码"],
  ["POST", " /api/system/getChangelog", "getChangelog", "获取更新日志"],
  // 需要鉴权

  ["POST", "/api/system/getEmojiConf", "getEmojiConf", "获取emoji配置"],

  ["POST", "/api/system/setAccessAuthCode", "setAccessAuthCode", "设置鉴权码"],

  ["POST", "/api/system/setNetworkServe", "setNetworkServe", "设置网络服务器"],

  [
    "POST",

    "/api/system/setUploadErrLog",

    "setUploadErrLog",

    "设置上传错误日志",
  ],

  ["POST", "/api/system/setAutoLaunch", "setAutoLaunch", "设置自动启动"],

  [
    "POST",

    "/api/system/setGoogleAnalytics",

    "setGoogleAnalytics",

    "设置谷歌数据分析",
  ],

  [
    "POST",

    "/api/system/setDownloadInstallPkg",

    "setDownloadInstallPkg",

    "设置是否下载安装包",
  ],

  ["POST", "/api/system/setNetworkProxy", "setNetworkProxy", "设置网络代理"],

  [
    "POST",

    "/api/system/setWorkspaceDir",

    "setWorkspaceDir",

    "设置工作空间目录",
  ],

  ["POST", "/api/system/getWorkspaces", "getWorkspaces", "获取工作空间目录"],

  [
    "POST",

    "/api/system/getMobileWorkspaces",

    "getMobileWorkspaces",

    "获取移动端工作空间目录",
  ],

  [
    "POST",

    "/api/system/createWorkspaceDir",

    "createWorkspaceDir",

    "创建工作空间",
  ],

  [
    "POST",

    "/api/system/removeWorkspaceDir",

    "removeWorkspaceDir",

    "移除动作空间",
  ],

  [
    "POST",

    "/api/system/setAppearanceMode",

    "setAppearanceMode",

    "设置外观模式",
  ],

  ["POST", "/api/system/getSysFonts", "getSysFonts", "获取系统字体"],

  ["POST", "/api/system/exit", "exit", "退出"],

  ["POST", "/api/system/setUILayout", "setUILayout", "设置UI布局"],

  ["POST", "/api/system/getConf", "getConf", "获取配置"],

  ["POST", "/api/system/checkUpdate", "checkUpdate", "检查更新"],

  ["POST", "/api/system/exportLog", "exportLog", "导出日志"],

  //存储相关
  ["POST", "/api/storage/setLocalStorage", "setLocalStorage", "设置存储"],

  ["POST", "/api/storage/getLocalStorage", "getLocalStorage", "获取存储"],

  [
    "POST",

    "/api/storage/setLocalStorageVal",

    "setLocalStorageVal",

    "设置存储项",
  ],
  ["POST", " /api/storage/removeLocalStorageVals", "removeLocalStorageVals"],
  [
    "POST",

    "/api/storage/removeLocalStorageVal",

    "removeLocalStorageVal",

    "获取存储项",
  ],

  ["POST", "/api/storage/setCriterion", "setCriterion", "设置标准"],

  ["POST", "/api/storage/getCriteria", "getCriteria", "获取标准"],

  ["POST", "/api/storage/removeCriterion", "removeCriterion", "移除标准"],

  ["POST", "/api/storage/getRecentDocs", "getRecentDocs", "获取最近文档"],

  //账户登录
  ["POST", "/api/account/login", "login", "登录账号"],

  [
    "POST",

    "/api/account/checkActivationcode",

    "checkActivationcode",

    "检查激活码",
  ],

  ["POST", "/api/account/useActivationcode", "useActivationcode", "使用激活码"],

  ["POST", "/api/account/deactivate", "deactivateUser", "注销账号"],

  ["POST", "/api/account/startFreeTrial", "startFreeTrial", "开始免费试用"],

  //笔记本相关
  ["POST", "/api/notebook/lsNotebooks", "lsNotebooks", "获取笔记本列表"],

  ["POST", "/api/notebook/openNotebook", "openNotebook", "打开笔记本"],

  ["POST", "/api/notebook/closeNotebook", "closeNotebook", "关闭笔记本"],

  [
    "POST",

    "/api/notebook/getNotebookConf",

    "getNotebookConf",

    "获取笔记本配置",
  ],

  [
    "POST",

    "/api/notebook/setNotebookConf",

    "setNotebookConf",

    "设置笔记本配置",
  ],

  ["POST", "/api/notebook/createNotebook", "createNotebook", "创建笔记本"],

  ["POST", "/api/notebook/removeNotebook", "removeNotebook", "删除笔记本"],

  ["POST", "/api/notebook/renameNotebook", "renameNotebook", "重命名笔记本"],

  [
    "POST",

    "/api/notebook/changeSortNotebook",

    "changeSortNotebook",

    "改变笔记本排序",
  ],

  [
    "POST",

    "/api/notebook/setNotebookIcon",

    "setNotebookIcon",

    "设置笔记本图标",
  ],

  //文档树相关
  ["POST", "/api/filetree/searchDocs", "searchDocs", "搜索文档"],

  [
    "POST",

    "/api/filetree/listDocsByPath",

    "listDocsByPath",

    "获取路径下文档列表",
  ],

  ["POST", "/api/filetree/getDoc", "getDoc", "获取文档"],

  [
    "POST",

    "/api/filetree/getDocCreateSavePath",

    "getDocCreateSavePath",

    "获取文档创建路径",
  ],

  [
    "POST",

    "/api/filetree/getRefCreateSavePath",

    "getRefCreateSavePath",

    "获取块引创建路径",
  ],

  ["POST", "/api/filetree/changeSort", "changeSort", "更改排序"],

  [
    "POST",

    "/api/filetree/createDocWithMd",

    "createDocWithMd",

    "创建文档-md",
  ],

  ["POST", "/api/filetree/createDailyNote", "createDailyNote", "创建日记"],

  ["POST", "/api/filetree/createDoc", "createDoc", "创建文档"],

  ["POST", "/api/filetree/renameDoc", "renameDoc", "重命名文档"],

  ["POST", "/api/filetree/removeDoc", "removeDoc", "移除文档"],

  ["POST", "/api/filetree/removeDocs", "removeDocs", "批量删除文档"],

  ["POST", "/api/filetree/moveDocs", "moveDocs", "批量移动文档"],

  ["POST", "/api/filetree/duplicateDoc", "duplicateDoc", "复制文档"],

  [
    "POST",

    "/api/filetree/getHPathByPath",

    "getHPathByPath",

    "通过路径获取层级路径",
  ],
  [
    "POST",

    "/api/filetree/getHPathsByPaths",

    "getHPathsByPaths",

    "批量通过路径获取层级路径",
  ],
  [
    "POST",

    "/api/filetree/getHPathByID",

    "getHPathByID",

    "通过id获取层级路径",
  ],
  ["POST", "/api/filetree/getIDsByHPath", "getIDsByHPath", "根据层级路径获取id"],

  ["POST", "/api/filetree/getPathByID", "getPathByID", "根据id获取路径"],

  [
    "POST",

    "/api/filetree/getFullHPathByID",

    "getFullHPathByID",

    "根据id获取完整层级路径",
  ],

  ["POST", "/api/filetree/doc2Heading", "doc2Heading", "文档转换为标题"],

  ["POST", "/api/filetree/heading2Doc", "heading2Doc", "标题转换为文档"],

  ["POST", "/api/filetree/li2Doc", "li2Doc", "列表转换为文档"],

  [
    "POST",

    "/api/filetree/refreshFiletree",

    "refreshFiletree",

    "刷新文档树",
  ],

  [
    "POST",

    "/api/filetree/upsertIndexes",

    "upsertIndexes",

    "创建/更新索引",
  ],

  [
    "POST",

    "/api/filetree/removeIndexes",

    "removeIndexes",

    "删除索引",
  ],
  ["POST", "/api/filetree/listDocTree", "listDocTree", "树形列出 doc"],
  //格式化

  ["POST", "/api/format/autoSpace", "autoSpace", "自动空格"],

  [
    "POST",

    "/api/format/netImg2LocalAssets",

    "netImg2LocalAssets",

    "网络图片转本地资源",
  ],

  [
    "POST",

    "/api/format/netAssets2LocalAssets",

    "netAssets2LocalAssets",

    "网络资源转本地资源",
  ],
  //历史
  [
    "POST",

    "/api/history/getNotebookHistory",

    "getNotebookHistory",

    "获取笔记本历史",
  ],

  [
    "POST",

    "/api/history/rollbackNotebookHistory",

    "rollbackNotebookHistory",

    "回滚笔记本",
  ],

  [
    "POST",

    "/api/history/rollbackAssetsHistory",

    "rollbackAssetsHistory",

    "回滚资源文件",
  ],

  [
    "POST",

    "/api/history/getDocHistoryContent",

    "getDocHistoryContent",

    "获取历史文档内容",
  ],

  [
    "POST",

    "/api/history/rollbackDocHistory",

    "rollbackDocHistory",

    "回滚文档历史",
  ],
  [
    "POST",

    "/api/history/clearWorkspaceHistory",

    "clearWorkspaceHistory",

    "清空工作区历史",
  ],

  [
    "POST",

    "/api/history/reindexHistory",

    "reindexHistory",

    "重建历史索引",
  ],

  ["POST", "/api/history/searchHistory", "searchHistory", "搜索历史"],

  [
    "POST",

    "/api/history/getHistoryItems",

    "getHistoryItems",

    "获取历史条目",
  ],

  //大纲
  ["POST", "/api/outline/getDocOutline", "getDocOutline", "获取文档大纲"],

  //书签
  ["POST", "/api/bookmark/getBookmark", "getBookmark", "获取书签"],

  [
    "POST",

    "/api/bookmark/renameBookmark",

    "renameBookmark",

    "重命名书签",
  ],

  [
    "POST",

    "/api/bookmark/removeBookmark",

    "removeBookmark",

    "移除书签",
  ],

  //标签
  ["POST", "/api/tag/getTag", "getTag", "获取标签"],

  ["POST", "/api/tag/renameTag", "renameTag", "重命名标签"],

  ["POST", "/api/tag/removeTag", "removeTag", "删除标签"],

  //lute
  ["POST", "/api/lute/spinBlockDOM", "spinBlockDOM", "原生渲染"],

  ["POST", "/api/lute/html2BlockDOM", "html2BlockDOM", "html转blockDOM"],

  [
    "POST",

    "/api/lute/copyStdMarkdown",

    "copyStdMarkdown",

    "导出标准markdown",
  ],

  //query
  ["POST", "/api/query/sql", "SQL", "SQL查询"],

  //sqlite
  ["POST", "/api/sqlite/flushTransaction", "flushTransaction", "提交事务"],

  //search

  ["POST", "/api/search/searchTag", "searchTag", "搜索标签"],
  ["POST", "/api/search/searchTemplate", "searchTemplate", "搜索模板"],
  ["POST", "/api/search/removeTemplate", "removeTemplate", "移除模板"],
  ["POST", "/api/search/searchWidget", "searchWidget", "搜索挂件"],
  ["POST", "/api/search/searchRefBlock", "searchRefBlock", "搜索引用块"],
  ["POST", "/api/search/searchEmbedBlock", "searchEmbedBlock", "搜索嵌入块"],
  ["POST", "/api/search/getEmbedBlock", "getEmbedBlock", "获取嵌入块"],
  ["POST", "/api/search/updateEmbedBlock", "updateEmbedBlock", "更新嵌入块"],
  ["POST", "/api/search/fullTextSearchBlock", "fullTextSearchBlock", "全文搜索"],
  ["POST", "/api/search/searchAsset", "searchAsset", "搜索资源文件"],
  ["POST", "/api/search/findReplace", "findReplace", "查找替换"],
  [
    "POST",

    "/api/search/fullTextSearchAssetContent",

    "fullTextSearchAssetContent",

    "全文搜索资源文件内容",
  ],

  ["POST", "/api/search/getAssetContent", "getAssetContent", "获取资源文件内容"],

  [
    "POST",

    "/api/search/listInvalidBlockRefs",

    "listInvalidBlockRefs",

    "获取无效的块引用",
  ],

  //block
  ["POST", "/api/block/getBlockInfo", "getBlockInfo", "获取块信息"],

  ["POST", "/api/block/getBlockDOM", "getBlockDOM", "获取块DOM"],

  [
    "POST",

    "/api/block/getBlockKramdown",

    "getBlockKramdown",

    "获取块kramdown",
  ],

  ["POST", "/api/block/getChildBlocks", "getChildBlocks", "获取子块"],

  [
    "POST",

    "/api/block/getTailChildBlocks",

    "getTailChildBlocks",

    "获取尾部子块",
  ],

  [
    "POST",

    "/api/block/getBlockBreadcrumb",

    "getBlockBreadcrumb",

    "获取块面包屑",
  ],

  ["POST", "/api/block/getBlockIndex", "getBlockIndex", "获取块索引"],

  [
    "POST",

    "/api/block/getBlocksIndexes",

    "getBlocksIndexes",

    "获取块索引",
  ],

  ["POST", "/api/block/getRefIDs", "getRefIDs", "获取引用id"],

  [
    "POST",

    "/api/block/getRefIDsByFileAnnotationID",

    "getRefIDsByFileAnnotationID",

    "根据文件标注id获取引用id",
  ],

  [
    "POST",

    "/api/block/getBlockDefIDsByRefText",

    "getBlockDefIDsByRefText",

    "根据引用文本获取块定义id",
  ],

  ["POST", "/api/block/getRefText", "getRefText", "获取引用文本"],

  ["POST", "/api/block/getDOMText", "getDOMText", "获取DOM文本"],

  ["POST", "/api/block/getTreeStat", "getTreeStat", "获取树状态"],

  [
    "POST",

    "/api/block/getBlocksWordCount",

    "getBlocksWordCount",

    "获取块字数",
  ],

  [
    "POST",

    "/api/block/getContentWordCount",

    "getContentWordCount",

    "获取内容字数",
  ],

  [
    "POST",

    "/api/block/getRecentUpdatedBlocks",

    "getRecentUpdatedBlocks",

    "获取最近更新的块",
  ],

  ["POST", "/api/block/getDocInfo", "getDocInfo", "获取文档信息"],

  [
    "POST",

    "/api/block/checkBlockExist",

    "checkBlockExist",

    "检查块是否存在",
  ],

  ["POST", "/api/block/checkBlockFold", "checkBlockFold", "检查块是否折叠"],

  ["POST", "/api/block/insertBlock", "insertBlock", "插入块"],

  ["POST", "/api/block/prependBlock", "prependBlock", "插入前置子块"],

  ["POST", "/api/block/appendBlock", "appendBlock", "插入后置子块"],

  [
    "POST",

    "/api/block/appendDailyNoteBlock",

    "appendDailyNoteBlock",

    "追加日记块",
  ],

  [
    "POST",

    "/api/block/prependDailyNoteBlock",

    "prependDailyNoteBlock",

    "插入日记块",
  ],

  ["POST", "/api/block/updateBlock", "updateBlock", "更新块"],

  ["POST", "/api/block/deleteBlock", "deleteBlock", "删除块"],

  ["POST", "/api/block/moveBlock", "moveBlock", "移动块"],

  [
    "POST",

    "/api/block/moveOutlineHeading",

    "moveOutlineHeading",

    "移动大纲标题",
  ],

  ["POST", "/api/block/foldBlock", "foldBlock", "折叠块"],

  ["POST", "/api/block/unfoldBlock", "unfoldBlock", "展开块"],

  [
    "POST",

    "/api/block/setBlockReminder",

    "setBlockReminder",

    "设置块提醒",
  ],

  [
    "POST",

    "/api/block/getHeadingLevelTransaction",

    "getHeadingLevelTransaction",

    "获取标题级别事务",
  ],

  [
    "POST",

    "/api/block/getHeadingDeleteTransaction",

    "getHeadingDeleteTransaction",

    "获取标题删除事务",
  ],

  [
    "POST",

    "/api/block/getHeadingChildrenIDs",

    "getHeadingChildrenIDs",

    "获取标题子块id",
  ],

  [
    "POST",

    "/api/block/getHeadingChildrenDOM",

    "getHeadingChildrenDOM",

    "获取标题子块DOM",
  ],

  ["POST", "/api/block/swapBlockRef", "swapBlockRef", "交换块引用"],

  [
    "POST",

    "/api/block/transferBlockRef",

    "transferBlockRef",

    "转移块引用",
  ],

  [
    "POST",

    "/api/block/getBlockSiblingID",

    "getBlockSiblingID",

    "获取块同级id",
  ],
  ["POST", "/api/block/getBlockTreeInfos", "getBlockTreeInfos", "获取块树信息"],
  //文件
  ["POST", "/api/file/getFile", "getFile", "获取文件"],

  ["POST", "/api/file/putFile", "putFile", "上传文件"],

  ["POST", "/api/file/copyFile", "copyFile", "复制文件"],

  [
    "POST",

    "/api/file/globalCopyFiles",

    "globalCopyFiles",

    "全局复制文件",
  ],

  ["POST", "/api/file/removeFile", "removeFile", "移除文件"],

  ["POST", "/api/file/renameFile", "renameFile", "重命名文件"],

  ["POST", "/api/file/readDir", "readDir", "获取文件夹"],

  [
    "POST",

    "/api/file/getUniqueFilename",

    "getUniqueFilename",

    "获取文件唯一名",
  ],

  //引用

  ["POST", "/api/ref/refreshBacklink", "refreshBacklink", "刷新反向链接"],

  ["POST", "/api/ref/getBacklink", "getBacklink", "获取反向链接"],

  ["POST", "/api/ref/getBacklink2", "getBacklink2", "获取反向链接2"],

  [
    "POST",

    "/api/ref/getBacklinkDoc",

    "getBacklinkDoc",

    "获取反向链接文档",
  ],

  [
    "POST",

    "/api/ref/getBackmentionDoc",

    "getBackmentionDoc",

    "获取反向提及文档",
  ],

  //属性

  [
    "POST",

    "/api/attr/getBookmarkLabels",

    "getBookmarkLabels",

    "获取书签标签",
  ],

  [
    "POST",

    "/api/attr/resetBlockAttrs",

    "resetBlockAttrs",

    "重置块属性",
  ],

  ["POST", "/api/attr/setBlockAttrs", "setBlockAttrs", "设置块属性"],
  ["POST", "/api/attr/batchSetBlockAttrs", "batchSetBlockAttrs", "批量设置块属性"],

  ["POST", "/api/attr/getBlockAttrs", "getBlockAttrs", "获取块属性"],
  ["POST", "/api/attr/batchGetBlockAttrs", "batchGetBlockAttrs", "批量获取块属性"],

  //云端

  ["POST", "/api/cloud/getCloudSpace", "getCloudSpace", "获取云端空间"],

  //同步
  ["POST", "/api/sync/setSyncEnable", "setSyncEnable", "设置是否启用同步"],

  [
    "POST",

    "/api/sync/setSyncPerception",

    "setSyncPerception",

    "设置同步感知",
  ],

  [
    "POST",

    "/api/sync/setSyncGenerateConflictDoc",

    "setSyncGenerateConflictDoc",

    "设置同步是否生成冲突文档",
  ],

  ["POST", "/api/sync/setSyncMode", "setSyncMode", "设置同步模式"],

  [
    "POST",

    "/api/sync/setSyncProvider",

    "setSyncProvider",

    "设置同步供应商",
  ],

  [
    "POST",

    "/api/sync/setSyncProviderS3",

    "setSyncProviderS3",

    "设置S3同步",
  ],

  [
    "POST",

    "/api/sync/setSyncProviderWebDAV",

    "setSyncProviderWebDAV",

    "设置webdav同步",
  ],

  [
    "POST",

    "/api/sync/setCloudSyncDir",

    "setCloudSyncDir",

    "设置云端同步目录",
  ],

  [
    "POST",

    "/api/sync/createCloudSyncDir",

    "createCloudSyncDir",

    "创建云端同步目录",
  ],

  [
    "POST",

    "/api/sync/removeCloudSyncDir",

    "removeCloudSyncDir",

    "删除云端同步目录",
  ],

  [
    "POST",

    "/api/sync/listCloudSyncDir",

    "listCloudSyncDir",

    "获取云端同步目录",
  ],
  ["POST", "/api/sync/performSync", "performSync", "执行同步"],
  ["POST", "/api/sync/performBootSync", "performBootSync", "执行启动同步"],
  ["POST", "/api/sync/getBootSync", "getBootSync", "获取启动同步"],
  ["POST", "/api/sync/getSyncInfo", "getSyncInfo", "获取同步信息"],
  ["POST", "/api/sync/exportSyncProviderS3", "exportSyncProviderS3", "导出 S3 同步"],
  ["POST", "/api/sync/importSyncProviderS3", "importSyncProviderS3", "导入 S3 同步"],
  ["POST", "/api/sync/exportSyncProviderWebDAV", "exportSyncProviderWebDAV", "导出 WebDAV"],
  ["POST", "/api/sync/importSyncProviderWebDAV", "importSyncProviderWebDAV", "导入 WebDAV"],
]
  .filter((item) => item[2] !== undefined)
  .reduce((acc, item) => {
    return {
      ...acc,
      [item[2]]: {
        方法: item[0],
        路径: item[1],
        英文名: item[2],
        中文名: item[3],
      },
    };
  }, {});

export default kernelApiDefine; 