# AI Usage Widget 2.0 — Claude + Codex

## Install
Run AIUsageWidget-Setup.exe. Installs for the current Windows user, registers the Chrome native messaging host, and creates the Desktop shortcut.
Target: Windows 10/11 with .NET Framework 4.8. No .NET SDK, Node.js, admin password or PowerShell window is needed to run the widget.
The setup checks the .NET requirement; unsupported machines receive a clear error. The app is not code-signed.

## Connect Codex
Install the official Codex app/CLI and sign in with the desired ChatGPT account.
The widget finds codex.exe and reads account/rateLimits/read over its documented app-server protocol every 60 seconds.
No model request or conversation is created. No password, API key, token or browser cookie is copied.
Codex is NOT the ordinary ChatGPT chat quota. It is deliberately labeled Codex.
F5 refreshes Codex and rereads the latest Claude snapshot.

## Connect Claude in Chrome
1. Run Setup once on EACH Windows account/machine.
2. Chrome > Extensions > Manage extensions > Developer mode.
3. Remove the old AI Usage Widget Connector (1.0), if present.
4. Load unpacked from %LOCALAPPDATA%\Programs\AIUsageWidget\2.0.0\Chrome Connector.
5. Open https://claude.ai/settings/usage in the logged-in Chrome profile, with the Claude interface in English.
6. Open the extension popup to confirm “Connected — usage delivered”. The widget updates within 3 seconds.

The extension reads only the Usage settings page, not chats. It uses Chrome Native Messaging, restricted to the fixed extension ID, with bounded UTF-8 JSON validation.
There is no localhost port or network listener.
Only usage percentages, row labels, reset text and the observation timestamp are saved locally.
The extension refreshes the Usage tab every minute ONLY while that tab is in the background. Disable this in the popup if desired.
If the page is active or closed, or auto-refresh is disabled, use the popup's Open / refresh button.
Chrome sign-out, missing rows, translated/changed layouts and native-host failures appear in the popup; no estimates or substitute demo numbers are sent.
If multiple Chrome profiles are connected, the most recent valid Usage page received on this Windows account supplies the Claude card. Use one intended profile.

## Understand the display
Every bar and percentage means REMAINING: 12% used = 88% left.
Each provider has its own data, source, timestamp and status.
NOT CONNECTED = no valid data. STALE = more than three minutes since a successful observation. ERROR = a failed read, possibly retaining the last valid values.
The widget never loads the old usage.json demo file.
Claude timestamps indicate a page observation, not a guarantee that Anthropic's backend refreshed at that instant.
Absolute Codex reset dates come from the server. Claude reset text is displayed as supplied by the page; it is never guessed or converted into an invented countdown.

## Desktop behavior
Drag the title or a card anywhere; Ctrl + arrow keys move in small increments.
Position and Always on top are saved per Windows user. Disconnected monitors are clamped back onto a available screen.
Minus hides to the system tray; double-click the tray icon or reopen the shortcut to restore the SAME instance.
Right-click for Connect Claude, Refresh Codex, Reset position, Connection details or Exit.
Connection details reports errors without exposing credentials.
Settings and the Claude snapshot: %LOCALAPPDATA%\AIUsageWidget.
Portable EXE works for Codex; Claude still requires host registration through Setup on each machine.

## Update
Close the widget before running the replacement installer, then reload the extension at chrome://extensions.
Keep the installed extension folder in place. Do not load the extension from a temporary extracted archive.
Chrome extension installation cannot be silently forced on an ordinary personal browser.

## Development and verification
build.ps1 builds release artifacts using the Windows .NET Framework compiler.
node test-parser.cjs checks known Claude page sections and malformed/missing rows.
AIUsageWidget.exe --self-test <report-path> checks conversion, independent states, stale data, Native Messaging framing, reset handling, and renders state screenshots.
AIUsageWidget.exe --probe-codex <report-path> performs an actual account quota read.
protocol-test.cjs tests the native host without touching production snapshots.
No promise is made that every Windows configuration or future provider UI will work without maintenance.
Actual signed distribution, clean-machine matrix verification and ARM hardware testing remain release gates.
