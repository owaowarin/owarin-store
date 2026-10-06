using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Web.Script.Serialization;

public sealed class UsageRow
{
    public string label { get; set; }
    public double? usedPercent { get; set; }
    public string resetText { get; set; }
    public long? resetsAt { get; set; }
    public double Remaining { get { return Math.Max(0, Math.Min(100, 100 - usedPercent.Value)); } }
}
public sealed class Snapshot
{
    public int version { get; set; }
    public string provider { get; set; }
    public string source { get; set; }
    public string observedAt { get; set; }
    public UsageRow[] rows { get; set; }
    public static Snapshot Parse(string json)
    {
        if (json == null || Encoding.UTF8.GetByteCount(json) > 32768) throw new InvalidDataException("Usage message too large.");
        var s = new JavaScriptSerializer().Deserialize<Snapshot>(json);
        DateTimeOffset date;
        if (s == null || s.version != 2 || (s.provider != "claude" && s.provider != "codex") ||
            s.source != (s.provider == "claude" ? "claude.ai/settings/usage" : "codex/account/rateLimits/read") ||
            !DateTimeOffset.TryParse(s.observedAt, out date) || date > DateTimeOffset.UtcNow.AddMinutes(1) ||
            s.rows == null || s.rows.Length == 0 || s.rows.Length > 8)
            throw new InvalidDataException("Unsupported usage message, source or timestamp.");
        foreach (var row in s.rows)
        {
            if (row == null || String.IsNullOrWhiteSpace(row.label) || row.label.Length > 64 ||
                !row.usedPercent.HasValue || double.IsNaN(row.usedPercent.Value) || double.IsInfinity(row.usedPercent.Value) || row.usedPercent < 0 || row.usedPercent > 100 ||
                (row.resetText != null && row.resetText.Length > 100) ||
                (row.resetsAt.HasValue && (row.resetsAt < 0 || row.resetsAt > 4102444800L)))
                throw new InvalidDataException("Invalid usage row.");
        }
        if (s.rows.Select(r => r.label).Distinct().Count() != s.rows.Length)
            throw new InvalidDataException("Duplicate usage rows.");
        return s;
    }
}
internal static class Store
{
    internal static readonly string Root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "AIUsageWidget");
    internal static string Json(object value) { return new JavaScriptSerializer().Serialize(value); }
    internal static void AtomicWrite(string path, string text)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path));
        string temp = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            File.WriteAllText(temp, text, new UTF8Encoding(false));
            if (File.Exists(path)) File.Replace(temp, path, null); else File.Move(temp, path);
        }
        finally { if (File.Exists(temp)) File.Delete(temp); }
    }
    internal static void Save(Snapshot snapshot)
    {
        Snapshot.Parse(Json(snapshot));
        AtomicWrite(Path.Combine(Root, snapshot.provider + "-v2.json"), Json(snapshot));
    }
    internal static Snapshot ReadClaude()
    {
        string path = Path.Combine(Root, "claude-v2.json");
        return File.Exists(path) ? Snapshot.Parse(File.ReadAllText(path, Encoding.UTF8)) : null;
    }
    internal static bool IsStale(Snapshot snapshot)
    {
        return snapshot == null || DateTimeOffset.UtcNow - DateTimeOffset.Parse(snapshot.observedAt) > TimeSpan.FromMinutes(3);
    }
    internal static string Reset(UsageRow row)
    {
        if (!row.resetsAt.HasValue) return row.resetText ?? "Reset time unavailable";
        var date = new DateTimeOffset(1970, 1, 1, 0, 0, 0, TimeSpan.Zero).AddSeconds(row.resetsAt.Value);
        if (date <= DateTimeOffset.UtcNow) return "Reset passed - refreshing required";
        return "Resets " + date.ToLocalTime().ToString("ddd d MMM HH:mm");
    }
}
