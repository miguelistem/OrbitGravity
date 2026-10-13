; ==============================================================================
; OrbitGravity — NSIS Installer Hooks
; Ensures desktop shortcut creation in current-user space with clean uninstall.
; NOTE: User profiles and workspaces in AntigravityProfiles are preserved
; permanently and NEVER deleted on uninstall.
; ==============================================================================

!macro NSIS_HOOK_POSTINSTALL
  ; Create Desktop Shortcut for OrbitGravity pointing to the installed executable
  ${If} ${FileExists} "$INSTDIR\orbitgravity.exe"
    CreateShortcut "$DESKTOP\OrbitGravity.lnk" "$INSTDIR\orbitgravity.exe" "" "$INSTDIR\orbitgravity.exe" 0
  ${Else}
    CreateShortcut "$DESKTOP\OrbitGravity.lnk" "$INSTDIR\OrbitGravity.exe" "" "$INSTDIR\OrbitGravity.exe" 0
  ${EndIf}
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; Terminate any running OrbitGravity instances before removing files
  ExecWait 'taskkill.exe /F /IM orbitgravity.exe' $0
  ExecWait 'taskkill.exe /F /IM OrbitGravity.exe' $0
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; Clean up Desktop Shortcut upon uninstallation
  Delete "$DESKTOP\OrbitGravity.lnk"

  ; Clean up application state and telemetry only with defensive empty-variable checks
  ${If} $LOCALAPPDATA != ""
    RMDir /r "$LOCALAPPDATA\OrbitGravity"
  ${EndIf}
  ${If} $APPDATA != ""
    RMDir /r "$APPDATA\OrbitGravity"
  ${EndIf}
!macroend
