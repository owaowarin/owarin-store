using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Web.Script.Serialization;

internal static class CodexSource
{
    internal static string Locate()
    {
        string known = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "OpenAI", "Codex", "bin", "codex.exe");
        if (File.Exists(known)) return known;
        foreach (var directory in (Environment.GetEnvironmentVariable("PATH") ?? "").Split(Path.PathSeparator))
        {
            try { var path = Path.Combine(directory.Trim('"'), "codex.exe"); if (File.Exists(path)) return path; }
            catch (ArgumentException) { }
        }
        return null;
    }
    internal static async Task<Snapshot> Read()
    {
        string path = Locate();
        if (path == null) throw new InvalidOperationException("Install Codex and sign in to your ChatGPT account.");
        using (var process = new Process())
        {
            process.StartInfo = new ProcessStartInfo(path, "app-server --listen stdio://") {
                UseShellExecute = false, CreateNoWindow = true, RedirectStandardInput = true,
                RedirectStandardOutput = true, RedirectStandardError = true,
                StandardOutputEncoding = Encoding.UTF8, StandardErrorEncoding = Encoding.UTF8
            };
            process.Start();
            // Drain logs but never store tokens, account details, or unrelated messages.
            var drain = process.StandardError.ReadToEndAsync();
            try
            {
                var work = Query(process);
                if (await Task.WhenAny(work, Task.Delay(20000)) != work)
                    throw new TimeoutException("Codex did not respond. Check connection and sign-in.");
                return await work;
            }
            finally
            {
                if (!process.HasExited) process.Kill();
                process.WaitForExit(2000);
                drain.Wait(1000);
            }
        }
    }
    private static async Task<Snapshot> Query(Process p)
    {
        p.StandardInput.WriteLine(Store.Json(new { id = 1, method = "initialize", @params = new {
            clientInfo = new { name = "ai_usage_widget", version = "2.0.0" } } }));
        p.StandardInput.Flush();
        string line;
        while ((line = await p.StandardOutput.ReadLineAsync()) != null)
        {
            var msg = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(line);
            object id;
            if (!msg.TryGetValue("id", out id)) continue;
            if (msg.ContainsKey("error")) throw new InvalidOperationException("Codex usage unavailable. Check Codex sign-in and network.");
            if (Convert.ToInt32(id) == 1)
            {
                p.StandardInput.WriteLine("{\"method\":\"initialized\"}");
                p.StandardInput.WriteLine("{\"id\":2,\"method\":\"account/rateLimits/read\"}");
                p.StandardInput.Flush();
            }
            else if (Convert.ToInt32(id) == 2) return Map((Dictionary<string, object>)msg["result"]);
        }
        throw new InvalidOperationException("Codex exited before returning usage.");
    }
    internal static Snapshot Map(Dictionary<string, object> result)
    {
        object value;
        Dictionary<string, object> bucket = null;
        if (result.TryGetValue("rateLimitsByLimitId", out value) && value is Dictionary<string, object>)
        {
            var buckets = (Dictionary<string, object>)value;
            if (buckets.TryGetValue("codex", out value)) bucket = value as Dictionary<string, object>;
            else throw new InvalidDataException("No Codex quota in the returned limits.");
        }
        else if (result.TryGetValue("rateLimits", out value)) bucket = value as Dictionary<string, object>;
        if (bucket == null) throw new InvalidDataException("Codex quota unavailable.");
        var rows = new List<UsageRow>();
        foreach (string key in new[] { "primary", "secondary" })
        {
            if (!bucket.TryGetValue(key, out value) || !(value is Dictionary<string, object>)) continue;
            var window = (Dictionary<string, object>)value;
            object used, minutes, reset;
            if (!window.TryGetValue("usedPercent", out used) || used == null) continue;
            double duration = window.TryGetValue("windowDurationMins", out minutes) && minutes != null ? Convert.ToDouble(minutes) : 0;
            string label = duration == 10080 ? "Weekly" : duration == 300 ? "5 hours" :
                duration > 0 ? duration.ToString(CultureInfo.InvariantCulture) + " min window" : key + " window";
            rows.Add(new UsageRow { label = label, usedPercent = Convert.ToDouble(used),
                resetsAt = window.TryGetValue("resetsAt", out reset) && reset != null ? (long?)Convert.ToInt64(reset) : null });
        }
        if (rows.Count == 0) throw new InvalidDataException("No usage percentages returned.");
        return Snapshot.Parse(Store.Json(new Snapshot { version = 2, provider = "codex",
            source = "codex/account/rateLimits/read", observedAt = DateTimeOffset.UtcNow.ToString("o"), rows = rows.ToArray() }));
    }
}
