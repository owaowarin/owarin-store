using System;
using System.IO;
using System.Text;

internal static class NativeHost
{
    internal const string ExtensionId = "nbfbbnnagaajnbhbdljbpncfdgnhfabe";
    internal const string Name = "com.aiusage.widget";
    internal static int Run(string[] args)
    {
        if (args.Length == 0 || args[0] != "chrome-extension://" + ExtensionId + "/") return 1;
        try
        {
            using (var input = Console.OpenStandardInput())
            using (var output = Console.OpenStandardOutput())
            {
                string json = ReadFrame(input);
                if (json == null) return 0;
                try
                {
                    var snapshot = Snapshot.Parse(json);
                    if (snapshot.provider != "claude") throw new InvalidDataException("Only Claude usage accepted by Chrome connector.");
                    Store.Save(snapshot);
                    WriteFrame(output, "{\"ok\":true,\"version\":2}");
                }
                catch (Exception)
                {
                    WriteFrame(output, "{\"ok\":false,\"error\":\"Invalid usage data or cannot write local cache.\"}");
                }
            }
            return 0;
        }
        catch { return 1; }
    }
    internal static string ReadFrame(Stream stream)
    {
        var length = new byte[4];
        int first = stream.ReadByte();
        if (first < 0) return null;
        length[0] = (byte)first;
        ReadExactly(stream, length, 1, 3);
        int size = BitConverter.ToInt32(length, 0);
        if (size < 2 || size > 32768) throw new InvalidDataException("Invalid message length.");
        var bytes = new byte[size];
        ReadExactly(stream, bytes, 0, size);
        return new UTF8Encoding(false, true).GetString(bytes);
    }
    private static void ReadExactly(Stream stream, byte[] buffer, int offset, int count)
    {
        while (count > 0)
        {
            int read = stream.Read(buffer, offset, count);
            if (read == 0) throw new EndOfStreamException();
            offset += read; count -= read;
        }
    }
    internal static void WriteFrame(Stream output, string json)
    {
        var bytes = Encoding.UTF8.GetBytes(json);
        var length = BitConverter.GetBytes(bytes.Length);
        output.Write(length, 0, length.Length);
        output.Write(bytes, 0, bytes.Length);
        output.Flush();
    }
}
