; ==============================================================================
; OrbitGravity — NSIS Installer Hooks
; Ensures desktop shortcut creation in current-user space with clean uninstall
; and complete removal of all Antigravity profile directories on uninstallation.
; ==============================================================================

!macro NSIS_HOOK_POSTINSTALL
  ; Create Desktop Shortcut for OrbitGravity pointing to the installed executable
  CreateShortcut "$DESKTOP\OrbitGravity.lnk" "$INSTDIR\OrbitGravity.exe" "" "$INSTDIR\OrbitGravity.exe" 0
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; Terminate any running OrbitGravity instances before removing files
  ExecWait 'taskkill.exe /F /IM OrbitGravity.exe' $0
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; Clean up Desktop Shortcut upon uninstallation
  Delete "$DESKTOP\OrbitGravity.lnk"

  ; Clean up application state and telemetry only
  RMDir /r "$LOCALAPPDATA\OrbitGravity"
  RMDir /r "$APPDATA\OrbitGravity"
!macroend
