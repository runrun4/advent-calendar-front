@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0docker-dev.ps1" %*
exit /b %ERRORLEVEL%
