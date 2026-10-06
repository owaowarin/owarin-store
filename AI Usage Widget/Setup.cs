using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Win32;

internal static class Setup
{
    [STAThread]
    private static int Main(string[] args)
    {
        bool quiet=args.Contains("--install-quiet");
        try
        {
            using(var key=Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full"))
                if(key==null || Convert.ToInt32(key.GetValue("Release",0))<528040)
                    throw new InvalidOperationException("Requires .NET Framework 4.8. Install the Microsoft runtime, then retry.");
            if(!quiet && MessageBox.Show("Install AI Usage Widget 2.0 for this Windows user?\n\n"+
                "Creates a Desktop shortcut and registers the local Chrome connector.\n"+
                "Claude requires one manual Chrome extension installation. Codex must be installed and signed in.",
                "AI Usage Widget Setup",MessageBoxButtons.OKCancel,MessageBoxIcon.Information)!=DialogResult.OK)return 0;
            string target=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Programs","AIUsageWidget","2.0.0");
            Directory.CreateDirectory(target);
            using(var stream=Assembly.GetExecutingAssembly().GetManifestResourceStream("app.zip"))
            using(var archive=new ZipArchive(stream,ZipArchiveMode.Read))
            foreach(var entry in archive.Entries)
            {
                string path=Path.GetFullPath(Path.Combine(target,entry.FullName));
                if(!path.StartsWith(Path.GetFullPath(target)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))
                    throw new InvalidDataException("Unsafe package path.");
                if(String.IsNullOrEmpty(entry.Name)){Directory.CreateDirectory(path);continue;}
                Directory.CreateDirectory(Path.GetDirectoryName(path));
                using(var input=entry.Open())
                using(var output=File.Create(path))input.CopyTo(output);
            }
            string manifest=Path.Combine(target,"native-host.json");
            var json=new JavaScriptSerializer().Serialize(new {name="com.aiusage.widget",description="AI Usage Widget Claude connector",
                path=Path.Combine(target,"AIUsageBridge.exe"),type="stdio",
                allowed_origins=new[]{"chrome-extension://nbfbbnnagaajnbhbdljbpncfdgnhfabe/"}});
            File.WriteAllText(manifest,json,new UTF8Encoding(false));
            foreach(var view in new[]{RegistryView.Registry32,RegistryView.Registry64})
            using(var root=RegistryKey.OpenBaseKey(RegistryHive.CurrentUser,view))
            using(var key=root.CreateSubKey(@"Software\Google\Chrome\NativeMessagingHosts\com.aiusage.widget"))
                key.SetValue("",manifest,RegistryValueKind.String);
            string shortcut=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),"AI Usage Widget.lnk");
            object shell=Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell"));
            dynamic link=shell.GetType().InvokeMember("CreateShortcut",BindingFlags.InvokeMethod,null,shell,new object[]{shortcut});
            link.TargetPath=Path.Combine(target,"AIUsageWidget.exe");link.WorkingDirectory=target;
            link.Description="Claude and Codex usage";link.Save();
            if(!quiet)
            {
                Process.Start(new ProcessStartInfo(Path.Combine(target,"AIUsageWidget.exe")){UseShellExecute=true});
                MessageBox.Show("Installed.\n\nChrome > Extensions > Developer mode > Load unpacked:\n"+
                    Path.Combine(target,"Chrome Connector")+"\n\nOpen Claude Settings > Usage. Use Connection details in the widget to diagnose issues.",
                    "AI Usage Widget",MessageBoxButtons.OK,MessageBoxIcon.Information);
            }
            return 0;
        }
        catch(Exception ex)
        {
            if(quiet)File.WriteAllText(Path.Combine(Path.GetTempPath(),"ai-usage-setup-error.txt"),ex.ToString());
            else MessageBox.Show(ex.Message,"Installation failed",MessageBoxButtons.OK,MessageBoxIcon.Error);
            return 1;
        }
    }
}
