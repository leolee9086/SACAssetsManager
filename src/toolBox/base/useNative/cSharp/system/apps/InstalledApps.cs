using System;
using System.Collections.Generic;
using Microsoft.Win32;
using IWshRuntimeLibrary;

public class InstalledApps
{
    // 修改为直接返回JSON字符串
    public static string GetInstalledAppsForEdge(dynamic input)
    {
        try {
            var apps = GetInstalledApps();
            return Newtonsoft.Json.JsonConvert.SerializeObject(apps);
        }
        catch (Exception ex) {
            return Newtonsoft.Json.JsonConvert.SerializeObject(new {
                error = true,
                message = ex.Message
            });
        }
    }

    // 修改返回类型为List<object>提高兼容性
    public static List<object> GetInstalledApps()
    {
        var apps = new List<object>();
        
        // 从注册表读取32位程序
        ReadRegistryApps(RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, 
            RegistryView.Registry32), apps);
        
        // 从注册表读取64位程序
        ReadRegistryApps(RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, 
            RegistryView.Registry64), apps);
        
        // 从用户目录读取程序
        ReadUserApps(apps);
        
        return apps;
    }

    // 修改ReadRegistryApps方法
    private static void ReadRegistryApps(RegistryKey root, List<object> apps)
    {
        const string uninstallKey = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall";
        
        using (var key = root.OpenSubKey(uninstallKey))
        {
            if (key == null) return;
            
            foreach (string subKeyName in key.GetSubKeyNames())
            {
                using (var subKey = key.OpenSubKey(subKeyName))
                {
                    var displayName = subKey?.GetValue("DisplayName") as string;
                    var installLocation = subKey?.GetValue("InstallLocation") as string;
                    var publisher = subKey?.GetValue("Publisher") as string;
                    
                    if (!string.IsNullOrEmpty(displayName))
                    {
                        apps.Add(new {
                            name = displayName,
                            path = installLocation ?? "",
                            publisher = publisher ?? "",
                            source = "registry"
                        });
                    }
                }
            }
        }
    }

    // 修改ReadUserApps方法
    private static void ReadUserApps(List<object> apps)
    {
        string startMenuPath = Environment.GetFolderPath(
            Environment.SpecialFolder.CommonStartMenu) + "\\Programs";
        
        try {
            foreach (var file in System.IO.Directory.EnumerateFiles(
                startMenuPath, "*.lnk", System.IO.SearchOption.AllDirectories))
            {
                try {
                    var shell = new WshShell();
                    var shortcut = (IWshShortcut)shell.CreateShortcut(file);
                    
                    if (!string.IsNullOrEmpty(shortcut.TargetPath))
                    {
                        apps.Add(new {
                            name = System.IO.Path.GetFileNameWithoutExtension(file),
                            path = System.IO.Path.GetFullPath(Environment.ExpandEnvironmentVariables(shortcut.TargetPath)),
                            args = shortcut.Arguments,
                            source = "shortcut"
                        });
                    }
                }
                catch (Exception ex) {
                    // 记录或处理特定异常
                }
            }
        }
        catch (Exception ex) {
            // 记录或处理目录访问异常
        }
    }
}