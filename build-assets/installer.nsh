; ======================================================================
; EchoTerm - custom NSIS installer script
;
; Adds an "Installation Options" page that lets the user choose whether to
; create a desktop shortcut.
;
; electron-builder's built-in desktop-shortcut creation is disabled in
; package.json ("nsis.createDesktopShortcut": false); this script creates the
; shortcut (and removes it on uninstall) based on the user's choice, so the
; wizard checkbox is the single source of truth.
; ======================================================================

; These variables are only used by the installer (not the uninstaller), so
; guard them to avoid NSIS warning 6001 being treated as an error.
!ifndef BUILD_UNINSTALLER
  Var DesktopShortcutCheckbox
  Var DesktopShortcutOpt
!endif

!macro customInit
  ; Default to creating the desktop shortcut (matches the checked checkbox).
  ; Silent installs skip the options page, so they keep this default unless
  ; the --no-desktop-shortcut flag is passed.
  StrCpy $DesktopShortcutOpt "1"
!macroend

!macro customPageAfterChangeDir
  Page custom shortcutOptionsPage shortcutOptionsLeave

  Function shortcutOptionsPage
    !insertmacro MUI_HEADER_TEXT "Installation Options" "Select additional options"
    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}

    ${NSD_CreateCheckbox} 0 10u 100% 12u "Create a desktop shortcut"
    Pop $DesktopShortcutCheckbox
    ${NSD_SetState} $DesktopShortcutCheckbox ${BST_CHECKED}

    nsDialogs::Show
  FunctionEnd

  Function shortcutOptionsLeave
    ${NSD_GetState} $DesktopShortcutCheckbox $DesktopShortcutOpt
  FunctionEnd
!macroend

!macro customInstall
  ${ifNot} ${isNoDesktopShortcut}
    ${if} $DesktopShortcutOpt == "1"
      CreateShortCut "$newDesktopLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
      ClearErrors
      WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
      System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
    ${endIf}
  ${endIf}
!macroend

!macro customUnInstall
  ${ifNot} ${isKeepShortcuts}
    ${if} ${FileExists} "$oldDesktopLink"
      WinShell::UninstShortcut "$oldDesktopLink"
      Delete "$oldDesktopLink"
    ${endIf}
  ${endIf}
!macroend
