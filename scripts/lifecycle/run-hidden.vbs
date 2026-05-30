' run-hidden.vbs <caminho.ps1> — roda um .ps1 100% OCULTO (sem flash de janela CMD/PowerShell)
' Usado pelas Tarefas Agendadas pra eliminar o piscar de janela.
Set sh = CreateObject("WScript.Shell")
ps1 = WScript.Arguments(0)
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & ps1 & """", 0, False
