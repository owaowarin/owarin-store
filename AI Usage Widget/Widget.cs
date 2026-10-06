using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Web.Script.Serialization;

internal static class Program
{
    internal static readonly uint RestoreMessage = RegisterWindowMessage("AIUsageWidget.Restore.v2");
    [STAThread]
    private static int Main(string[] args)
    {
        if (Path.GetFileNameWithoutExtension(Application.ExecutablePath) == "AIUsageBridge")
            return NativeHost.Run(args);
        try
        {
            try { SetProcessDpiAwarenessContext(new IntPtr(-4)); }
            catch (EntryPointNotFoundException) { SetProcessDPIAware(); }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            if (args.Length == 2 && args[0] == "--self-test") { Tests.Run(args[1]); return 0; }
            if (args.Length == 2 && args[0] == "--probe-codex")
            {
                Store.AtomicWrite(args[1], Store.Json(CodexSource.Read().GetAwaiter().GetResult()));
                return 0;
            }
            bool first;
            using (var mutex = new Mutex(true, @"Local\AIUsageWidget.v2." +
                System.Security.Principal.WindowsIdentity.GetCurrent().User.Value, out first))
            {
                if (!first) { PostMessage(new IntPtr(0xffff), RestoreMessage, IntPtr.Zero, IntPtr.Zero); return 0; }
                Application.Run(new Widget());
                mutex.ReleaseMutex();
            }
            return 0;
        }
        catch (Exception ex)
        {
            if (args.Length == 2 && args[0].StartsWith("--"))
            { File.WriteAllText(args[1] + ".error", ex.ToString()); return 1; }
            MessageBox.Show(ex.Message, "AI Usage Widget", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
    [DllImport("user32.dll")] private static extern bool SetProcessDpiAwarenessContext(IntPtr context);
    [DllImport("user32.dll")] private static extern bool SetProcessDPIAware();
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern uint RegisterWindowMessage(string name);
    [DllImport("user32.dll")] private static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
}
public sealed class Preferences
{
    public int x { get; set; }
    public int y { get; set; }
    public bool topMost { get; set; }
}
internal sealed class Widget : Form
{
    private Snapshot claude, codex;
    private string claudeError, codexError, settingError;
    private float scale;
    private bool ready, fetching;
    private DateTime nextPoll = DateTime.MinValue;
    private readonly bool testing;
    private readonly System.Windows.Forms.Timer timer = new System.Windows.Forms.Timer { Interval = 3000 };
    private readonly NotifyIcon tray = new NotifyIcon();
    private readonly ToolTip tips = new ToolTip();
    private readonly ToolStripMenuItem top = new ToolStripMenuItem("Always on top") { CheckOnClick = true, Checked = true };
    private readonly string settingsPath = Path.Combine(Store.Root, "window.json");
    private readonly Font titleFont = new Font("Segoe UI", 14, FontStyle.Bold, GraphicsUnit.Pixel);
    private readonly Font regular = new Font("Segoe UI", 12, FontStyle.Regular, GraphicsUnit.Pixel);
    private readonly Font small = new Font("Segoe UI", 10, FontStyle.Regular, GraphicsUnit.Pixel);
    private static readonly Color Ink = Color.FromArgb(230,235,240), Muted = Color.FromArgb(145,157,170);
    private int scroll;
    internal Widget() : this(false) { }
    internal Widget(bool test)
    {
        testing = test;
        Text = "AI Usage Widget";
        AccessibleName = Text;
        FormBorderStyle = FormBorderStyle.None;
        StartPosition = FormStartPosition.Manual;
        AutoScaleMode = AutoScaleMode.None;
        ShowInTaskbar = true; TopMost = true; DoubleBuffered = true;
        BackColor = Color.FromArgb(17,22,28); Icon = SystemIcons.Application;
        using (var g = CreateGraphics()) scale = g.DpiX / 96f;
        ClientSize = new Size(S(320), S(420));
        AddButton("\u21bb", "Refresh Codex (F5); Claude syncs from Chrome", 213, delegate { RefreshSources(true); });
        AddButton("\u2212", "Hide to tray - reopen shortcut to restore", 245, delegate { Hide(); });
        AddButton("\u00d7", "Exit widget", 277, delegate { Close(); });
        var menu = new ContextMenuStrip();
        menu.Items.Add("Show widget", null, delegate { RestoreWidget(); });
        menu.Items.Add("Connect Claude...", null, delegate { ConnectClaude(); });
        menu.Items.Add("Refresh Codex", null, delegate { RefreshSources(true); });
        menu.Items.Add(top);
        top.CheckedChanged += delegate { TopMost = top.Checked; SavePosition(); };
        menu.Items.Add("Reset position", null, delegate { ResetPosition(); SavePosition(); });
        menu.Items.Add("Connection details", null, delegate { ShowDetails(); });
        menu.Items.Add("Exit", null, delegate { Close(); });
        ContextMenuStrip = menu;
        tray.Icon = Icon; tray.Text = Text; tray.ContextMenuStrip = menu; tray.Visible = !test;
        tray.DoubleClick += delegate { RestoreWidget(); };
        KeyPreview = true;
        KeyDown += delegate(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.F5) RefreshSources(true);
            if (!e.Control) return;
            int dx = e.KeyCode == Keys.Right ? 10 : e.KeyCode == Keys.Left ? -10 : 0;
            int dy = e.KeyCode == Keys.Down ? 10 : e.KeyCode == Keys.Up ? -10 : 0;
            if (dx == 0 && dy == 0) return;
            Location = KeepVisible(new Point(Left + S(dx), Top + S(dy)), Size, Screen.FromRectangle(Bounds).WorkingArea);
            SavePosition(); e.SuppressKeyPress = true;
        };
        ResizeEnd += delegate { Location = KeepVisible(Location, Size, Screen.FromRectangle(Bounds).WorkingArea); SavePosition(); };
        timer.Tick += delegate { RefreshSources(false); };
        LayoutWidget(); ResetPosition();
        if (!test) LoadPosition();
        ready = true;
        Shown += delegate { if (!test) { RefreshSources(true); timer.Start(); } };
    }
    private int S(float n) { return (int)Math.Round(n * scale); }
    private void AddButton(string text, string label, int x, EventHandler click)
    {
        var b = new Button { Text = text, AccessibleName = label, Bounds = new Rectangle(S(x),S(10),S(28),S(30)),
            FlatStyle = FlatStyle.Flat, ForeColor = Muted, BackColor = BackColor, Cursor = Cursors.Hand,
            Font = new Font("Segoe UI",16 * scale,FontStyle.Regular,GraphicsUnit.Pixel) };
        b.FlatAppearance.BorderSize = 0; b.FlatAppearance.MouseOverBackColor = Color.FromArgb(39,47,56);
        b.Click += click; tips.SetToolTip(b,label); Controls.Add(b);
    }
    private async void RefreshSources(bool force)
    {
        if (testing || IsDisposed) return;
        try { claude = Store.ReadClaude(); claudeError = null; }
        catch (Exception) { claudeError = "Cannot read Claude data. Reconnect Chrome."; }
        LayoutWidget();
        if (fetching || (!force && DateTime.UtcNow < nextPoll)) return;
        fetching = true; nextPoll = DateTime.UtcNow.AddMinutes(1);
        try { codex = await CodexSource.Read(); codexError = null; }
        catch (Exception ex) { codexError = ex.Message; }
        finally { fetching = false; if (!IsDisposed) LayoutWidget(); }
    }
    private int CardHeight(Snapshot snapshot) { return 71 + Math.Max(1,snapshot == null ? 0 : snapshot.rows.Length) * 51; }
    private int ContentHeight() { return CardHeight(claude) + CardHeight(codex) + 20; }
    private void LayoutWidget()
    {
        if (IsDisposed) return;
        ClientSize = new Size(S(320), Math.Min(S(ContentHeight() + 96), Math.Max(S(200),Screen.FromRectangle(Bounds).WorkingArea.Height - S(24))));
        scroll = Math.Min(scroll, Math.Max(0,ContentHeight() - (int)(Height/scale-96)));
        using (var path = Rounded(new RectangleF(0,0,Width,Height),S(15)))
        { var old = Region; Region = new Region(path); if(old != null)old.Dispose(); }
        if (ready) Location = KeepVisible(Location,Size,Screen.FromRectangle(Bounds).WorkingArea);
        AccessibleDescription = Describe("Claude",claude,claudeError) + " " + Describe("Codex",codex,codexError);
        Invalidate();
    }
    private static string Describe(string name, Snapshot s, string error)
    {
        return name + ": " + (error ?? (s == null ? "Not connected." :
            (Store.IsStale(s) ? "STALE. " : "") + String.Join("; ",s.rows.Select(r=>r.label+" "+r.Remaining.ToString("0.#")+"% remaining, "+Store.Reset(r))) +
            ", source " + s.source + ", observed " + s.observedAt));
    }
    private void ConnectClaude()
    {
        var folder = Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"Chrome Connector");
        using (var dialog = new Form { Text="Connect Claude",ClientSize=new Size(560,240),StartPosition=FormStartPosition.CenterParent,
            FormBorderStyle=FormBorderStyle.FixedDialog,MaximizeBox=false,MinimizeBox=false })
        {
            dialog.Controls.Add(new Label { Bounds=new Rectangle(20,20,520,120),Text=
                "1. Run AIUsageWidget-Setup.exe once to register the connector.\n\n"+
                "2. Chrome > Extensions > Manage extensions > Developer mode.\n"+
                "    Remove the old AI Usage Widget Connector, then Load unpacked.\n\n"+
                "3. Select the folder below, then open Claude Settings > Usage.",
                Font=new Font("Segoe UI",10) });
            var path=new TextBox { Bounds=new Rectangle(20,148,520,25),ReadOnly=true,Text=folder };
            dialog.Controls.Add(path);
            var copy=new Button {Text="Copy folder path",Bounds=new Rectangle(20,190,155,30)};
            copy.Click+=delegate { Clipboard.SetText(folder); }; dialog.Controls.Add(copy);
            var open=new Button {Text="Open Claude Usage",Bounds=new Rectangle(190,190,170,30)};
            open.Click+=delegate { Process.Start(new ProcessStartInfo("https://claude.ai/settings/usage"){UseShellExecute=true}); };
            dialog.Controls.Add(open); dialog.ShowDialog(this);
        }
    }
    private void ShowDetails()
    {
        MessageBox.Show(Describe("Claude",claude,claudeError)+"\n\n"+Describe("Codex",codex,codexError)+
            "\n\nClaude uses its Chrome Usage page. Codex uses the signed-in Codex account; this is not the ordinary ChatGPT chat quota."+
            (settingError == null ? "" : "\n\n"+settingError), "Connection details",MessageBoxButtons.OK,MessageBoxIcon.Information);
    }
    protected override void OnMouseWheel(MouseEventArgs e)
    {
        scroll=Math.Max(0,Math.Min(Math.Max(0,ContentHeight()-(int)(Height/scale-96)),scroll-Math.Sign(e.Delta)*40));
        Invalidate(); base.OnMouseWheel(e);
    }
    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        var g=e.Graphics; g.ScaleTransform(scale,scale); g.SmoothingMode=SmoothingMode.AntiAlias;
        g.TextRenderingHint=System.Drawing.Text.TextRenderingHint.AntiAliasGridFit;
        float h=Height/scale;
        using(var pen=new Pen(Color.FromArgb(43,52,61)))
        using(var path=Rounded(new RectangleF(.5f,.5f,319,h-1),15))g.DrawPath(pen,path);
        using(var b=new SolidBrush(Color.FromArgb(80,200,153)))g.FillEllipse(b,18,23,6,6);
        DrawText(g,"AI usage",titleFont,Ink,32,16,110,25);
        DrawText(g,"V2",small,Muted,174,21,28,18);
        var clip=g.Save(); g.SetClip(new RectangleF(12,54,296,h-96));
        float y=54-scroll;
        DrawCard(g,"Claude",claude,claudeError,Color.FromArgb(217,119,87),y);
        y+=CardHeight(claude)+10;
        DrawCard(g,"Codex",codex,codexError,Color.FromArgb(53,201,145),y);
        g.Restore(clip);
        DrawText(g,"Bars show remaining allowance",small,Muted,18,h-33,284,17);
        DrawText(g,"Drag to move \u00b7 right-click to connect",small,Muted,18,h-18,284,16);
    }
    private void DrawCard(Graphics g,string name,Snapshot snapshot,string error,Color accent,float y)
    {
        int height=CardHeight(snapshot);
        using(var b=new SolidBrush(Color.FromArgb(25,31,38)))
        using(var path=Rounded(new RectangleF(12,y,296,height),10))g.FillPath(b,path);
        using(var b=new SolidBrush(accent))g.FillEllipse(b,26,y+18,7,7);
        DrawText(g,name,titleFont,Ink,41,y+11,150,24);
        string status=error!=null ? "ERROR" : snapshot==null ? (name=="Codex"&&fetching?"CONNECTING":"NOT CONNECTED") :
            Store.IsStale(snapshot) ? "STALE" : "CONNECTED";
        DrawText(g,status,small,status=="CONNECTED"?accent:Color.FromArgb(218,176,102),181,y+15,113,18,true);
        float rowY=y+43;
        if(snapshot==null)
        {
            DrawText(g,error ?? (name=="Claude" ? "Connect Chrome \u2192 Claude Usage" : "Sign in to Codex on this computer"),
                regular,Muted,26,rowY,268,22);
            DrawText(g,"No usage data received",small,Muted,26,rowY+29,268,18);
        }
        else foreach(var row in snapshot.rows)
        {
            DrawText(g,row.label,regular,Ink,26,rowY,167,18);
            DrawText(g,row.Remaining.ToString("0.#")+"% left",small,Ink,204,rowY+1,90,18,true);
            using(var b=new SolidBrush(Color.FromArgb(46,54,64)))
            using(var path=Rounded(new RectangleF(26,rowY+23,268,5),2.5f))g.FillPath(b,path);
            float width=(float)(268*row.Remaining/100);
            if(width>0)using(var b=new SolidBrush(Store.IsStale(snapshot)?Muted:accent))
                using(var path=Rounded(new RectangleF(26,rowY+23,width,5),Math.Min(2.5f,width/2)))g.FillPath(b,path);
            DrawText(g,Store.Reset(row),small,Muted,26,rowY+32,268,16); rowY+=51;
        }
        string source=name=="Claude" ? "Chrome Usage page" : "Codex account";
        string age=snapshot==null ? "Not connected" : DateTimeOffset.Parse(snapshot.observedAt).ToLocalTime().ToString("HH:mm:ss");
        DrawText(g,source+" \u00b7 "+age,small,Muted,26,y+height-21,268,17);
    }
    private static void DrawText(Graphics g,string text,Font font,Color color,float x,float y,float w,float h,bool right=false)
    {
        using(var brush=new SolidBrush(color))
        using(var format=new StringFormat {Trimming=StringTrimming.EllipsisCharacter,FormatFlags=StringFormatFlags.NoWrap,
            Alignment=right?StringAlignment.Far:StringAlignment.Near})g.DrawString(text,font,brush,new RectangleF(x,y,w,h),format);
    }
    private static GraphicsPath Rounded(RectangleF r,float radius)
    {
        float d=radius*2;var p=new GraphicsPath();
        p.AddArc(r.X,r.Y,d,d,180,90);p.AddArc(r.Right-d,r.Y,d,d,270,90);
        p.AddArc(r.Right-d,r.Bottom-d,d,d,0,90);p.AddArc(r.X,r.Bottom-d,d,d,90,90);p.CloseFigure();return p;
    }
    protected override void WndProc(ref Message m)
    {
        if (m.Msg==Program.RestoreMessage && ready) {RestoreWidget();return;}
        if (m.Msg==0xA3) {m.Result=IntPtr.Zero;return;}
        base.WndProc(ref m);
        if(m.Msg==0x84 && m.Result==new IntPtr(1))m.Result=new IntPtr(2);
        if(m.Msg==0xA5 && ContextMenuStrip!=null)ContextMenuStrip.Show(Cursor.Position);
        if(m.Msg==0x02E0 && ready)
        {
            float next=(m.WParam.ToInt64()&0xffff)/96f;
            if(next>0 && Math.Abs(next-scale)>.01f)
            {
                scale=next;
                for(int i=0;i<Controls.Count;i++)
                {Controls[i].Bounds=new Rectangle(S(213+i*32),S(10),S(28),S(30));
                 var old=Controls[i].Font;Controls[i].Font=new Font("Segoe UI",16*scale,FontStyle.Regular,GraphicsUnit.Pixel);old.Dispose();}
                LayoutWidget();
            }
        }
    }
    internal bool HasNativeDragTarget()
    {
        var p=PointToScreen(new Point(S(50),S(100)));
        var m=Message.Create(Handle,0x84,IntPtr.Zero,new IntPtr((p.Y<<16)|(p.X&0xffff)));WndProc(ref m);return m.Result==new IntPtr(2);
    }
    private void RestoreWidget(){Location=KeepVisible(Location,Size,Screen.FromRectangle(Bounds).WorkingArea);Show();WindowState=FormWindowState.Normal;Activate();}
    private void ResetPosition(){var a=Screen.FromPoint(Cursor.Position).WorkingArea;Location=KeepVisible(new Point(a.Right-Width-S(18),a.Bottom-Height-S(18)),Size,a);}
    internal static Point KeepVisible(Point p,Size size,Rectangle a)
    {return new Point(Math.Max(a.Left,Math.Min(p.X,a.Right-size.Width)),Math.Max(a.Top,Math.Min(p.Y,a.Bottom-size.Height)));}
    private void LoadPosition()
    {
        try
        {
            if(!File.Exists(settingsPath))return;
            var s=new JavaScriptSerializer().Deserialize<Preferences>(File.ReadAllText(settingsPath));
            Location=KeepVisible(new Point(s.x,s.y),Size,Screen.FromRectangle(new Rectangle(s.x,s.y,Width,Height)).WorkingArea);
            top.Checked=s.topMost;
        }
        catch(Exception ex){settingError="Could not restore position: "+ex.Message;}
    }
    private void SavePosition()
    {
        if(testing||!ready)return;
        try{Store.AtomicWrite(settingsPath,Store.Json(new Preferences{x=Left,y=Top,topMost=TopMost}));}
        catch(Exception ex){settingError="Could not save position: "+ex.Message;}
    }
    internal void SetTestData(Snapshot c,Snapshot x){claude=c;codex=x;LayoutWidget();}
    protected override void OnFormClosing(FormClosingEventArgs e){SavePosition();base.OnFormClosing(e);}
    protected override void Dispose(bool disposing)
    {if(disposing){timer.Dispose();tray.Visible=false;tray.Dispose();tips.Dispose();titleFont.Dispose();regular.Dispose();small.Dispose();}base.Dispose(disposing);}
}
