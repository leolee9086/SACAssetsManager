using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

public class Startup
{
    public async Task<object> Invoke(string drive)
    {
        List<FileSystemEntry> entries = new List<FileSystemEntry>();
        await Task.Run(() =>
        {
            try
            {
                TraverseDirectory(drive, entries);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
            }
        });
        return entries;
    }

    private void TraverseDirectory(string directory, List<FileSystemEntry> entries)
    {
        try
        {
            foreach (var file in Directory.GetFiles(directory))
            {
                try
                {
                    var fileInfo = new FileInfo(file);
                    entries.Add(new FileSystemEntry
                    {
                        Path = fileInfo.FullName,
                        IsDirectory = false,
                        Size = fileInfo.Length,
                        CreationTime = fileInfo.CreationTime,
                        LastAccessTime = fileInfo.LastAccessTime,
                        LastWriteTime = fileInfo.LastWriteTime
                    });
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Error accessing file: " + ex.Message);
                }
            }
        }
        catch (UnauthorizedAccessException ex)
        {
            Console.WriteLine("Access denied: " + ex.Message);
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error accessing files in directory: " + ex.Message);
        }

        try
        {
            foreach (var dir in Directory.GetDirectories(directory))
            {
                try
                {
                    var dirInfo = new DirectoryInfo(dir);
                    entries.Add(new FileSystemEntry
                    {
                        Path = dirInfo.FullName,
                        IsDirectory = true,
                        Size = 0, // Directories do not have a size
                        CreationTime = dirInfo.CreationTime,
                        LastAccessTime = dirInfo.LastAccessTime,
                        LastWriteTime = dirInfo.LastWriteTime
                    });
                    TraverseDirectory(dir, entries);
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Error accessing directory: " + ex.Message);
                }
            }
        }
        catch (UnauthorizedAccessException ex)
        {
            Console.WriteLine("Access denied: " + ex.Message);
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error accessing directories in directory: " + ex.Message);
        }
    }
}

public class FileSystemEntry
{
    public string Path { get; set; }
    public bool IsDirectory { get; set; }
    public long Size { get; set; }
    public DateTime CreationTime { get; set; }
    public DateTime LastAccessTime { get; set; }
    public DateTime LastWriteTime { get; set; }
}