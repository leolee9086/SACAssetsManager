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
