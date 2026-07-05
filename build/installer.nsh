; Personalizzazione installer AuthorOS.
; Requisito: se esiste già una versione installata, proporre di disinstallarla
; prima di procedere con la nuova (i dati utente in %APPDATA% non vengono toccati).

!macro customInit
  ; Install per-utente (default electron-builder): chiave in HKCU
  ReadRegStr $0 HKCU "${UNINSTALL_REGISTRY_KEY}" "UninstallString"
  ReadRegStr $1 HKCU "${UNINSTALL_REGISTRY_KEY}" "DisplayVersion"
  ${If} $0 != ""
    MessageBox MB_YESNO|MB_ICONQUESTION \
      "È già installata una versione di AuthorOS ($1).$\r$\n$\r$\nVuoi disinstallarla prima di installare la nuova? (consigliato)$\r$\nI tuoi progetti e i tuoi dati NON verranno toccati." \
      IDNO skip_uninstall_user
    ExecWait '$0 /S'
    skip_uninstall_user:
  ${EndIf}

  ; Copertura anche per eventuali install per-macchina (HKLM)
  ReadRegStr $0 HKLM "${UNINSTALL_REGISTRY_KEY}" "UninstallString"
  ReadRegStr $1 HKLM "${UNINSTALL_REGISTRY_KEY}" "DisplayVersion"
  ${If} $0 != ""
    MessageBox MB_YESNO|MB_ICONQUESTION \
      "È già installata una versione di AuthorOS ($1) per tutti gli utenti.$\r$\n$\r$\nVuoi disinstallarla prima di installare la nuova? (consigliato)$\r$\nI tuoi progetti e i tuoi dati NON verranno toccati." \
      IDNO skip_uninstall_machine
    ExecWait '$0 /S'
    skip_uninstall_machine:
  ${EndIf}
!macroend
