using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;

internal static class Tests
{
    internal static Snapshot Fixture(string provider)
    {
        return new Snapshot { version=2,provider=provider,source=provider=="claude"?"claude.ai/settings/usage":"codex/account/rateLimits/read",
            observedAt=DateTimeOffset.UtcNow.ToString("o"),
            rows=new[]{new UsageRow{label="5 hours",usedPercent=12,resetText="Resets 18:09"},new UsageRow{label="Weekly",usedPercent=88,resetText="Resets Sep 15"}}};
    }
    internal static void Run(string report)
    {
        var fixture=Fixture("claude");
        Assert(Snapshot.Parse(Store.Json(fixture)).rows[0].Remaining==88,"Used/remaining conversion");
        Assert(Snapshot.Parse(Store.Json(fixture)).rows[1].Remaining==12,"Weekly remaining conversion");
        Assert(Store.IsStale(null),"Missing is not live");
        fixture.observedAt=DateTimeOffset.UtcNow.AddMinutes(-4).ToString("o");
        Assert(Store.IsStale(fixture),"Stale data");
        fixture.observedAt=DateTimeOffset.UtcNow.ToString("o");
        Assert(!Store.IsStale(fixture),"Fresh data");
        Reject(()=>Snapshot.Parse(Store.Json(fixture).Replace("\"usedPercent\":12","\"usedPercent\":101")),"Out of range");
        Reject(()=>Snapshot.Parse(Store.Json(fixture).Replace("\"provider\":\"claude\"","\"provider\":\"chatgpt\"")),"Wrong provider");
        Reject(()=>Snapshot.Parse("{\"demo\":true}"),"Demo cannot be live");
        var result=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(
            "{\"rateLimits\":{\"primary\":{\"usedPercent\":99}},\"rateLimitsByLimitId\":{\"codex\":{\"primary\":{\"usedPercent\":12,\"windowDurationMins\":300,\"resetsAt\":1789124997},\"secondary\":{\"usedPercent\":88,\"windowDurationMins\":10080}}}}");
        var codex=CodexSource.Map(result);
        Assert(codex.rows[0].Remaining==88 && codex.rows[1].Remaining==12,"Prefer matching Codex bucket");
        using(var memory=new MemoryStream())
        {
            string unicode="{\"text\":\"ทดสอบ · UTF-8\"}";
            NativeHost.WriteFrame(memory,unicode);
            Assert(BitConverter.ToInt32(memory.ToArray(),0)==Encoding.UTF8.GetByteCount(unicode),"Frame uses byte count");
            memory.Position=0;
            Assert(NativeHost.ReadFrame(memory)==unicode,"Unicode frame roundtrip");
        }
        Reject(()=>NativeHost.ReadFrame(new MemoryStream(new byte[]{255,255,255,127})),"Oversized frame");
        Reject(()=>NativeHost.ReadFrame(new MemoryStream(new byte[]{8,0,0,0,1})),"Truncated frame");
        Assert(Widget.KeepVisible(new Point(5000,5000),new Size(320,440),new Rectangle(0,0,1366,728))==new Point(1046,288),"Offscreen recovery");
        Assert(Widget.KeepVisible(new Point(-1800,30),new Size(320,440),new Rectangle(-1920,0,1920,1080))==new Point(-1800,30),"Second monitor");
        using(var widget=new Widget(true))
        {
            Assert(widget.HasNativeDragTarget(),"Native drag hit test");
            Render(widget,report+".disconnected.png");
            widget.SetTestData(null,codex);
            Assert(widget.AccessibleDescription.Contains("Claude: Not connected"),"One provider does not make another live");
            Render(widget,report+".mixed.png");
            widget.SetTestData(fixture,codex);
            Render(widget,report+".connected.png");
        }
        Store.AtomicWrite(report,"PASS: conversion, missing/stale, provider isolation, validation, Codex bucket mapping, UTF-8 framing, malformed frames, native dragging, monitor recovery and three rendered states.");
    }
    private static void Render(Form form,string path)
    {
        using(var bitmap=new Bitmap(form.Width,form.Height))
        {form.DrawToBitmap(bitmap,new Rectangle(Point.Empty,form.Size));foreach(Control c in form.Controls)c.DrawToBitmap(bitmap,c.Bounds);bitmap.Save(path);}
    }
    private static void Reject(Action action,string label){try{action();}catch{ return;}throw new InvalidOperationException("Expected rejection: "+label);}
    private static void Assert(bool ok,string label){if(!ok)throw new InvalidOperationException(label);}
}
