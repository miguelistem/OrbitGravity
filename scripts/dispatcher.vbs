Set objArgs = WScript.Arguments
If objArgs.Count > 0 Then
    strUrl = objArgs(0)
    Set objShell = CreateObject("WScript.Shell")
    strAppData = objShell.ExpandEnvironmentStrings("%LOCALAPPDATA%")
    strScript = strAppData & "\BetterMultigravity\dispatcher.ps1"
    strCmd = "powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File """ & strScript & """ """ & strUrl & """"
    objShell.Run strCmd, 0, False
End If
