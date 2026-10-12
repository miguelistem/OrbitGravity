; ==============================================================================
; OrbitGravity — NSIS Installer Hooks
; Ensures desktop shortcut creation in current-user space with clean uninstall
; ==============================================================================

!macro NSIS_HOOK_POSTINSTALL
  ; Create Desktop Shortcut for OrbitGravity pointing to the installed executable
  CreateShortcut "$DESKTOP\OrbitGravity.lnk" "$INSTDIR\OrbitGravity.exe" "" "$INSTDIR\OrbitGravity.exe" 0
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; Clean up Desktop Shortcut upon uninstallation
  Delete "$DESKTOP\OrbitGravity.lnk"
!macroend
