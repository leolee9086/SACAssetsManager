using System.Threading.Tasks;
using System;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;

[ComVisible(true)]
public class FileDataObject : IDataObject
{
    private string[] files;

    public FileDataObject(string[] files)
    {
        this.files = files;
    }

    public int GetData(ref FORMATETC formatetc, out STGMEDIUM medium)
    {
        medium = new STGMEDIUM();
        if (formatetc.cfFormat == (short)ClipboardFormats.CF_HDROP && (formatetc.tymed & TYMED.HGLOBAL) != 0)
        {
            IntPtr ptr = Marshal.AllocHGlobal(Marshal.SizeOf<DROPFILES>() + (files.Length + 1) * Marshal.SystemDefaultCharSize);
            DROPFILES dropfiles = new DROPFILES
            {
                pFiles = Marshal.SizeOf<DROPFILES>(),
                fWide = true
            };
            Marshal.StructureToPtr(dropfiles, ptr, false);
            IntPtr filePtr = IntPtr.Add(ptr, Marshal.SizeOf<DROPFILES>());
            foreach (string file in files)
            {
                Marshal.StringToHGlobalUni(file);
                filePtr = IntPtr.Add(filePtr, (file.Length + 1) * Marshal.SystemDefaultCharSize);
            }
            Marshal.WriteInt16(filePtr, 0);

            medium.tymed = TYMED.HGLOBAL;
            medium.unionmember = ptr;
            medium.pUnkForRelease = null;
            return 0; // S_OK
        }
        return -2147467259; // DV_E_FORMATETC
    }

    public int GetDataHere(ref FORMATETC formatetc, ref STGMEDIUM medium) => -2147467263; // E_NOTIMPL

    public int QueryGetData(ref FORMATETC formatetc)
    {
        if (formatetc.cfFormat == (short)ClipboardFormats.CF_HDROP && (formatetc.tymed & TYMED.HGLOBAL) != 0)
            return 0; // S_OK
        return -2147467259; // DV_E_FORMATETC
    }

    public int GetCanonicalFormatEtc(ref FORMATETC formatectIn, out FORMATETC formatetcOut)
    {
        formatetcOut = formatectIn;
        return -2147467262; // E_NOTIMPL
    }

    public int SetData(ref FORMATETC formatetc, ref STGMEDIUM medium, bool fRelease) => -2147467263; // E_NOTIMPL

    public IEnumFORMATETC EnumFormatEtc(DATADIR direction) => null;

    public int DAdvise(ref FORMATETC formatetc, ADVF advf, IAdviseSink adviseSink, out int connection)
    {
        connection = 0;
        return -2147467263; // E_NOTIMPL
    }

    public int DUnadvise(int connection) => -2147467263; // E_NOTIMPL

    public int EnumDAdvise(out IEnumSTATDATA enumAdvise)
    {
        enumAdvise = null;
        return -2147467263; // E_NOTIMPL
    }
}

[StructLayout(LayoutKind.Sequential)]
public struct DROPFILES
{
    public int pFiles;
    public POINT pt;
    public bool fNC;
    public bool fWide;
}

[StructLayout(LayoutKind.Sequential)]
public struct POINT
{
    public int x;
    public int y;
}

public static class ClipboardFormats
{
    public const short CF_HDROP = 15;
}
public class Startup
{
    public async Task<object> Invoke(dynamic input)
    {
        return new FileDataObject(input.files);
    }
}


