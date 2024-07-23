import { loadCsharpFunc } from "../utils/CSharpLoader.js";
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
/*
   `
#r "System.Drawing.dll"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;


public class Startup
{
    [DllImport("shell32.dll")]
    private static extern IntPtr SHGetFileInfo(string pszPath, uint dwFileAttributes, out SHFILEINFO psfi, uint cbSizeFileInfo, uint uFlags);

    // 定义SHGetFileInfo标志
    private const uint SHGFI_ICON = 0x000000100;
    private const uint SHGFI_LARGEICON = 0x000000000;
    private const uint SHGFI_USEFILEATTRIBUTES = 0x000000010;

    [StructLayout(LayoutKind.Sequential)]
    private struct SHFILEINFO
    {
        public IntPtr hIcon;
        public int iIcon;
        public uint dwAttributes;
    };

    public async Task<object> Invoke(dynamic input)
    {
        string filePath = Encoding.UTF8.GetString(Convert.FromBase64String((string)input));

        SHFILEINFO shFileInfo = new SHFILEINFO();
        // 调用SHGetFileInfo获取图标句柄
        IntPtr hIcon = SHGetFileInfo(filePath, 0, out shFileInfo, (uint)Marshal.SizeOf(shFileInfo), SHGFI_ICON | SHGFI_LARGEICON | SHGFI_USEFILEATTRIBUTES);

        // 检查句柄是否有效
        if (hIcon == IntPtr.Zero)
        {
            throw new InvalidOperationException("Unable to retrieve file icon.");
        }

        try
        {
            // 从句柄创建Icon对象
            using (Icon icon = (Icon)Icon.FromHandle(hIcon))
            {
                if (icon == null)
                {
                    throw new InvalidOperationException("Icon creation failed.");
                }

                // 将Icon转换为Image
                using (Image image = icon.ToBitmap())
                {
                    // 将Image保存到MemoryStream
                    using (MemoryStream ms = new MemoryStream())
                    {
                        // 保存Image对象到MemoryStream中，格式为PNG
                        image.Save(ms, ImageFormat.Png);
                        byte[] imageBytes = ms.ToArray();

                        // 将byte数组编码为base64字符串
                        string base64String = Convert.ToBase64String(imageBytes);
                        return base64String;
                    }
                }
            }
        }
        finally
        {
            // 释放图标句柄
            DestroyIcon(hIcon);
        }
    }

    [DllImport("user32.dll")]
    private static extern bool DestroyIcon(IntPtr handle);
}    `*/
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



