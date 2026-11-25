@echo off
REM ==========================================================
REM  Abre o PAINEL DA LOJA no Chrome com IMPRESSAO DIRETA
REM  (a comanda sai sozinha, sem a janela de "Imprimir").
REM
REM  - A comanda vai para a impressora PADRAO do Windows.
REM  - Usa um perfil separado do Chrome so para o painel:
REM    no primeiro uso, faca o login do admin nessa janela.
REM  - Quando o site estiver no ar, troque o ENDERECO abaixo.
REM ==========================================================

set ENDERECO=http://localhost:4200/admin

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if not exist "%CHROME%" (
  echo Google Chrome nao encontrado. Instale o Chrome e tente de novo.
  pause
  exit /b 1
)

start "" "%CHROME%" --kiosk-printing --user-data-dir="%LocalAppData%\TimDoLelePainel" --app=%ENDERECO%
