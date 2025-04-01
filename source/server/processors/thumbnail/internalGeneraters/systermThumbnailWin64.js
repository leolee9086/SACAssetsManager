import { loadCsharpFunc } from "../../../../../src/toolBox/base/useElectron/forCSharp/useCSharpLoader.js";
import { 创建不可见Webview } from "../../../../../src/toolBox/base/useElectron/forWindow/useWebview.js";

export const getLargeIcon = loadCsharpFunc(
    `
    #r "System.Drawing.dll"
    using System;
    using System.Drawing;
    using System.IO;
    using System.Drawing.Imaging;
    using System.Text;
    using System.Threading.Tasks;
    public class Startup
    {
        public async Task<object> Invoke(dynamic input)
        {
            string filePath = Encoding.UTF8.GetString(Convert.FromBase64String((string)input));
            try
            {
                using (Icon icon = Icon.ExtractAssociatedIcon(filePath))
                {
                    using (Bitmap bmp = icon.ToBitmap())
                    {   
                       // bmp.MakeTransparent(); 添加这行代码以处理透明度
                        using (MemoryStream ms = new MemoryStream())
                        {
                            bmp.Save(ms, ImageFormat.Png); 
                            byte[] byteImage = ms.ToArray();
                            return Convert.ToBase64String(byteImage); 
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                return "Error: " + ex.Message;
            }
        }
    }
    `
)
export const getBase64Thumbnail = loadCsharpFunc(
    `
    #r "System.Drawing.dll"
    using System;
    using System.Drawing;
    using System.Drawing.Imaging;
    using System.IO;
    using System.Text;
    using System.Threading.Tasks;
    using System.Runtime.InteropServices;
    using System.Runtime.InteropServices.ComTypes;
    
    public class Startup
    {
        public async Task<object> Invoke(dynamic input)
        {
            string filePath = Encoding.UTF8.GetString(Convert.FromBase64String((string)input));
            Size size = new Size(256, 256);
            return GenerateBase64Thumbnail(filePath, size);
        }

        public static string GenerateBase64Thumbnail(string filePath, Size size)
        {
            IShellItem shellItem;
            Guid shellItemGuid = new Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE");
            int hr = SHCreateItemFromParsingName(filePath, IntPtr.Zero, ref shellItemGuid, out shellItem);
            if (hr != 0)
            {
                Marshal.ThrowExceptionForHR(hr);
            }

            IShellItemImageFactory imageFactory = (IShellItemImageFactory)shellItem;
            IntPtr hBitmap;
            hr = imageFactory.GetImage(size, SIIGBF.SIIGBF_BIGGERSIZEOK, out hBitmap);
            if (hr != 0)
            {
                Marshal.ThrowExceptionForHR(hr);
            }

            Bitmap thumbnail = Bitmap.FromHbitmap(hBitmap);
            //thumbnail.MakeTransparent();  添加这行代码以处理透明度

            DeleteObject(hBitmap);
            Marshal.ReleaseComObject(shellItem);

            using (MemoryStream ms = new MemoryStream())
            {
                thumbnail.Save(ms, ImageFormat.Png);
                byte[] byteImage = ms.ToArray();
                return Convert.ToBase64String(byteImage);
            }
        }

        [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
        private static extern int SHCreateItemFromParsingName([MarshalAs(UnmanagedType.LPWStr)] string pszPath, IntPtr pbc, ref Guid riid, out IShellItem ppv);

        [DllImport("gdi32.dll")]
        private static extern bool DeleteObject(IntPtr hObject);

        [ComImport]
        [Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE")]
        [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        private interface IShellItem
        {
        }

        [ComImport]
        [Guid("bcc18b79-ba16-442f-80c4-8a59c30c463b")]
        [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        private interface IShellItemImageFactory
        {
            [PreserveSig]
            int GetImage([In, MarshalAs(UnmanagedType.Struct)] Size size, [In] SIIGBF flags, out IntPtr phbm);
        }

        [Flags]
        private enum SIIGBF
        {
            SIIGBF_RESIZETOFIT = 0x00,
            SIIGBF_BIGGERSIZEOK = 0x01,
            SIIGBF_MEMORYONLY = 0x02,
            SIIGBF_ICONONLY = 0x04,
            SIIGBF_THUMBNAILONLY = 0x08,
            SIIGBF_INCACHEONLY = 0x10,
        }
    }

    `
)

const buildEsmWebview = async (esmURL) => {
    const webview = await 创建不可见Webview(esmURL,
        true, window.siyuanConfig.system.workspaceDir + "\\data\\plugins\\SACAssetsManager\\source\\server\\processors\\thumbnail\\internalGeneraters\\preload.js")
    console.log(webview)

    return webview
}

export default class SystemThumbnailLoader {
    constructor() {
        this.commonIcons = new Map()
       // this.onLoad()
    }
    async onLoad() {
        this.webviews = []
        const cpus = require('os').cpus()
        for (let i = 0; i < cpus.length/2; i++) {
            this.webviews.push(await buildEsmWebview(import.meta.resolve('./systermThumbnailWin64/index.html')))
        }
        this.webviews.forEach(webview => {
            webview.$webContents.on('did-finish-load', async () => {
                webview.$webContents.openDevTools()
            })
            try {
                webview.$webContents.openDevTools()
            } catch (e) {
                console.log(e)
            }
        })
    }


    async generateThumbnail(filePath, targetPath) {
       /* const channel = new BroadcastChannel('sac-thumbnail-generate-channel')
        channel.postMessage({
            filePath,
            targetPath
        })
        return null*/
        const encodedPath = Buffer.from(filePath.replace(/\//g, '\\')).toString('base64');
        let resultBuffer = null
        let error = null
        try {
            resultBuffer = Buffer.from(await getBase64Thumbnail(encodedPath), 'base64')
        } catch (e) {
            error = e
        }
        if (!resultBuffer) {
            try {
                resultBuffer = Buffer.from(await getLargeIcon(encodedPath), 'base64')
            } catch (e) {
                error = e
            }
        }
        if (!resultBuffer) {
            throw new Error('Failed to generate thumbnail:' + error.message)
        }
        return resultBuffer
    }
    /**
     * 返回一个正则表达式，用于匹配文件路径
     * 这里返回一个匹配全部的正则表达式
     * @param {*} filePath 
     * @returns 
     */
    match(filePath) {
        // 匹配所有文件，但优先级最低
        return /.*/;
    }
    sys = ['win32 x64']
}

