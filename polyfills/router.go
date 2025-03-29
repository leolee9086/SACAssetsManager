// SiYuan - Refactor your thinking
// Copyright (c) 2020-present, b3log.org
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

package api

import (
	"github.com/gin-gonic/gin"
	"github.com/siyuan-note/siyuan/kernel/model"
)

func ServeAPI(ginServer *gin.Engine) {
	// 不需要鉴权

	ginServer.Handle("GET", "/api/system/bootProgress", bootProgress)
	ginServer.Handle("POST", "/api/system/bootProgress", bootProgress)
	ginServer.Handle("GET", "/api/system/version", version)
	ginServer.Handle("POST", "/api/system/version", version)
	ginServer.Handle("POST", "/api/system/currentTime", currentTime)
	ginServer.Handle("POST", "/api/system/uiproc", addUIProcess)
	ginServer.Handle("POST", "/api/system/loginAuth", model.LoginAuth)
	ginServer.Handle("POST", "/api/system/logoutAuth", model.LogoutAuth)
	ginServer.Handle("GET", "/api/system/getCaptcha", model.GetCaptcha)

	// 需要鉴权

	ginServer.Handle("POST", "/api/system/getEmojiConf", model.CheckAuth, getEmojiConf)
	ginServer.Handle("POST", "/api/system/setAPIToken", model.CheckAuth, model.CheckAdminRole, model.CheckReadonly, setAPIToken)
	ginServer.Handle("POST", "/api/system/setAccessAuthCode", model.CheckAuth, model.CheckAdminRole, model.CheckReadonly, setAccessAuthCode)
	ginServer.Handle("POST", "/api/system/setFollowSystemLockScreen", model.CheckAuth, model.CheckAdminRole, model.CheckReadonly, setFollowSystemLockScreen)
	ginServer.Handle("POST", "/api/system/setNetworkServe", model.CheckAuth, model.CheckAdminRole, model.CheckReadonly, setNetworkServe)
	ginServer.Handle("POST", "/api/system/setUploadErrLog", model.CheckAuth, model.CheckAdminRole, model.CheckReadonly, setUploadErrLog)
	ginServer.Handle("POST", "/api/system/setAutoLaunch", model.CheckAuth, model.CheckAdminRole, model.CheckReadonly, setAutoLaunch)
	ginServer.Handle("POST", "/api/system/setGoogleAnalytics", model.CheckAuth, model.CheckAdminRole, model.CheckReadonly, setGoogleAnalytics)
	ginServer.Handle("POST", "/api/system/setDownloadInstallPkg", model.CheckAuth, model.CheckAdminRole, model.CheckReadonly, setDownloadInstallPkg)
	ginServer.Handle("POST", "/api/system/setNetworkProxy", model.CheckAuth, model.CheckAdminRole, model.CheckReadonly, setNetworkProxy)
	ginServer.Handle("POST", "/api/system/setWorkspaceDir", model.CheckAuth, model.CheckAdminRole, model.CheckReadonly, setWorkspaceDir)
	ginServer.Handle("POST", "/api/system/getWorkspaces", model.CheckAuth, getWorkspaces)
	ginServer.Handle("POST", "/api/system/getMobileWorkspaces", model.CheckAuth, model.CheckAdminRole, getMobileWorkspaces)
	ginServer.Handle("POST", "/api/system/checkWorkspaceDir", model.CheckAuth, model.CheckAdminRole, model.CheckReadonly, checkWorkspaceDir)
	ginServer.Handle("POST", "/api/system/createWorkspaceDir", model.CheckAuth, model.CheckAdminRole, model.CheckReadonly, createWorkspaceDir)
	ginServer.Handle("POST", "/api/system/removeWorkspaceDir", model.CheckAuth, model.CheckAdminRole, model.CheckReadonly, removeWorkspaceDir)
	ginServer.Handle("POST", "/api/system/removeWorkspaceDirPhysically", model.CheckAuth, model.CheckAdminRole, model.CheckReadonly, removeWorkspaceDirPhysically)
	ginServer.Handle("POST", "/api/system/setAppearanceMode", model.CheckAuth, model.CheckAdminRole, model.CheckReadonly, setAppearanceMode)
	ginServer.Handle("POST", "/api/system/setUILayout", model.CheckAuth, model.CheckAdminRole, model.CheckReadonly, setUILayout)
	ginServer.Handle("POST", "/api/system/getSysFonts", model.CheckAuth, model.CheckAdminRole, getSysFonts)
	ginServer.Handle("POST", "/api/system/exit", model.CheckAuth, model.CheckAdminRole, exit)
	ginServer.Handle("POST", "/api/system/getConf", model.CheckAuth, getConf)
	ginServer.Handle("POST", "/api/system/checkUpdate", model.CheckAuth, model.CheckAdminRole, checkUpdate)
	ginServer.Handle("POST", "/api/system/exportLog", model.CheckAuth, model.CheckAdminRole, exportLog)
	ginServer.Handle("POST", "/api/system/getChangelog", model.CheckAuth, getChangelog)
	ginServer.Handle("POST", "/api/system/getNetwork", model.CheckAuth, model.CheckAdminRole, getNetwork)
} 