import { loadCsharpFunc } from "../../../utils/CSharpLoader.js";
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
export const getBase64Thumbnail =loadCsharpFunc(
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
            Size size = new Size(512, 512);
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


const callBackPromise = (fun)=>{
    return (...args)=>{
        return new Promise((resolve, reject) => {
            try{
                fun(...args, (err, result) => {
                    if (err) {
                    reject(err);
                } else {
                    resolve(result);
                    }
                });
            }catch(e){
                reject(e)
            }
        });
    }
}

/**
 * 不需要单独缩略图的列表
 */
const noThumbnailList = [
    //文本类型的肯定是不需要的
    'markdown',
    'md',
    'txt',
    'json',
    'js',
    'css',
    'html',
    'htm',
    'dll',
    'go',
    'py',
    'rb',
    'sh',
    'bat',
    'cmd',
    'com',
    'sys',
    'ini',
    'config',
    'log',
    'lock',
    'cache',
    'temp',
    'backup',
    'old',
    'temp',
    'tmp',
    'cache',
    'lock',
    'pid',
    'lock',
    'cache',
    'tmp',
    'lock',
    'pid',
    'lock',
    'cache',
    'tmp',
    'lock',
    'pid',
    'pyd',
    'yml',
    'js',
    'css',
    'html',
    'htm',
    'xml',
    'docx',
    'sy',
    'db'
]


export default class SystemThumbnailLoader {
    constructor() {
        this.commonIcons = new Map()
    }
    async generateThumbnail(filePath) {
        const extension = filePath.split('.').pop()
        const encodedPath = Buffer.from(filePath.replace(/\//g,'\\')).toString('base64');
        let resultBuffer = null
        let error = null
        if(noThumbnailList.includes(extension)){
            console.log('不需要单独缩略图',filePath,extension)
            if(this.commonIcons.has(extension)){
                return this.commonIcons.get(extension)
            }
            
        }
        try{
            resultBuffer = Buffer.from(await callBackPromise(getBase64Thumbnail)(encodedPath), 'base64')
        }catch(e){
            error = e
        }
     if(!resultBuffer){
            try{
                resultBuffer = Buffer.from(await callBackPromise(getLargeIcon)(encodedPath), 'base64')
            }catch(e){
                error = e
            }
        }
        if(!resultBuffer){
            throw new Error('Failed to generate thumbnail:'+error.message)
        }
        if(noThumbnailList.includes(extension)&&!this.commonIcons.has(extension)){
            this.commonIcons.set(extension, resultBuffer)
        }
        return resultBuffer
    }
    /**
     * 返回一个正则表达式，用于匹配文件路径
     * 这里返回一个匹配全部的正则表达式
     * @param {*} filePath 
     * @returns 
     */
    match(filePath){
        return /.*/
    }
    sys=['win32 x64']
}

