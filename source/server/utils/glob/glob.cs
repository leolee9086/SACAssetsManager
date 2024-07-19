using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

public class Startup
{
    public async Task<object> Invoke(string drive)
    {
        List<string> files = new List<string>();
        await Task.Run(() =>
        {
            try
            {
                TraverseDirectory(drive, files);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
            }
        });
        return files;
    }

    private void TraverseDirectory(string directory, List<string> files)
    {
        try
        {
            foreach (var file in Directory.GetFiles(directory))
            {
                files.Add(file);
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
                TraverseDirectory(dir, files);
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