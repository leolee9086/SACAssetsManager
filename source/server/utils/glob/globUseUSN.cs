using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;

public class UsnJournalReader
{
    [StructLayout(LayoutKind.Sequential, Pack = 1)]
    public struct USN_RECORD
    {
        public uint RecordLength;
        public ushort MajorVersion;
        public ushort MinorVersion;
        public ulong FileReferenceNumber;
        public ulong ParentFileReferenceNumber;
        public USN Usn;
        public long TimeStamp;
        public uint Reason;
        public uint SourceInfo;
        public uint SecurityId;
        public uint FileAttributes;
        public ushort FileNameLength;
        public ushort FileNameOffset;
        public string FileName;
    }

    [StructLayout(LayoutKind.Sequential, Pack = 1)]
    public struct USN_JOURNAL_DATA
    {
        public ulong UsnJournalID;
        public USN FirstUsn;
        public USN NextUsn;
        public USN LowestValidUsn;
        public USN MaxUsn;
        public ulong MaximumSize;
        public ulong AllocationDelta;
    }

    [StructLayout(LayoutKind.Sequential, Pack = 1)]
    public struct MFT_ENUM_DATA
    {
        public USN StartFileReferenceNumber;
        public USN LowUsn;
        public USN HighUsn;
    }

    [StructLayout(LayoutKind.Sequential, Pack = 1)]
    public struct USN
    {
        public long Value;
    }

    public class NativeMethods
    {
        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern IntPtr CreateFile(
            string lpFileName,
            uint dwDesiredAccess,
            uint dwShareMode,
            IntPtr lpSecurityAttributes,
            uint dwCreationDisposition,
            uint dwFlagsAndAttributes,
            IntPtr hTemplateFile);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool DeviceIoControl(
            IntPtr hDevice,
            uint dwIoControlCode,
            IntPtr lpInBuffer,
            uint nInBufferSize,
            IntPtr lpOutBuffer,
            uint nOutBufferSize,
            out uint lpBytesReturned,
            IntPtr lpOverlapped);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool DeviceIoControl(
            IntPtr hDevice,
            uint dwIoControlCode,
            ref MFT_ENUM_DATA lpInBuffer,
            uint nInBufferSize,
            IntPtr lpOutBuffer,
            uint nOutBufferSize,
            out uint lpBytesReturned,
            IntPtr lpOverlapped);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool DeviceIoControl(
            IntPtr hDevice,
            uint dwIoControlCode,
            IntPtr lpInBuffer,
            uint nInBufferSize,
            ref USN_JOURNAL_DATA lpOutBuffer,
            uint nOutBufferSize,
            out uint lpBytesReturned,
            IntPtr lpOverlapped);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool ReadFile(
            IntPtr hFile,
            IntPtr lpBuffer,
            uint nNumberOfBytesToRead,
            out uint lpNumberOfBytesRead,
            IntPtr lpOverlapped);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool CloseHandle(IntPtr hObject);
    }

    public static List<string> GetFiles(string driveLetter)
    {
        List<string> files = new List<string>();

        string volumePath = "\\\\.\\" + driveLetter + ":";
        const uint OPEN_EXISTING = 3;
        const uint FILE_ATTRIBUTE_READONLY = 0x00000001;
        const uint GENERIC_READ = 0x80000000;
        const uint FILE_SHARE_READ = 0x00000001 | 0x00000002; // FILE_SHARE_READ | FILE_SHARE_WRITE

        IntPtr hVolume = NativeMethods.CreateFile(
            volumePath,                // lpFileName
            GENERIC_READ,              // dwDesiredAccess: GENERIC_READ
            FILE_SHARE_READ,           // dwShareMode: FILE_SHARE_READ | FILE_SHARE_WRITE
            IntPtr.Zero,               // lpSecurityAttributes
            OPEN_EXISTING,             // dwCreationDisposition
            FILE_ATTRIBUTE_READONLY,   // dwFlagsAndAttributes
            IntPtr.Zero);              // hTemplateFile

        if (hVolume == IntPtr.Zero || hVolume == new IntPtr(-1))
        {
            int errorCode = Marshal.GetLastWin32Error();
            Console.WriteLine("Failed to open volume {volumePath}.", errorCode);
        }

        try
        {
            //获取USN日志数据
            USN_JOURNAL_DATA journalData = new USN_JOURNAL_DATA();
            //获取返回的字节数
            uint bytesReturned;
            //如果获取USN日志数据成功
            if (!NativeMethods.DeviceIoControl(
                hVolume,
                0x000900f4,
                IntPtr.Zero,
                0,
                ref journalData,
                (uint)Marshal.SizeOf(journalData),
                out bytesReturned,
                IntPtr.Zero))
            {
                int errorCode = Marshal.GetLastWin32Error();
                files.Add(errorCode.ToString());
            }

            MFT_ENUM_DATA enumData = new MFT_ENUM_DATA
            {
                StartFileReferenceNumber = new USN { Value = 0 },
                LowUsn = new USN { Value = 0 },
                HighUsn = journalData.NextUsn
            };
            //创建内存托管
            IntPtr buffer = Marshal.AllocHGlobal(9012);

            try
            {

                if (!NativeMethods.DeviceIoControl(
                    hVolume,
                    0x000900b3,
                    ref enumData,
                    (uint)Marshal.SizeOf(enumData),
                    buffer,
                    9012,
                    out bytesReturned,
                    IntPtr.Zero))
                {
                    int errorCode = Marshal.GetLastWin32Error();
                    files.Add(errorCode.ToString());
                }
                //返回的字节数
                files.Add(bytesReturned.ToString());

                enumData.StartFileReferenceNumber = new USN { Value = Marshal.ReadInt64(buffer) };
                files.Add(enumData.StartFileReferenceNumber.Value.ToString());
            }

            finally
            {
                Marshal.FreeHGlobal(buffer);
            }
        }
        finally
        {
            //  NativeMethods.CloseHandle(hVolume);
        }

        return files;
    }
}

public class Startup
{
    public async Task<object> Invoke(object input)
    {
        string driveLetter = (string)input;
        try
        {
            List<string> files = UsnJournalReader.GetFiles(driveLetter);
            return files;
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error: " + ex.Message);
            List<string> files = new List<string>();
            string error = ex.Message;
            string stacktrace = ex.StackTrace;
            files.Add(error);
            files.Add(stacktrace);
            return files;
        }
        return null;
    }
}