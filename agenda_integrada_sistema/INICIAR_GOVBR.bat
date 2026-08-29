@echo off
setlocal
cd /d "%~dp0"

set "AGENDA_PORT=8017"
set "AGENDA_URL=http://127.0.0.1:%AGENDA_PORT%"

echo ======================================================
echo   AGENDA INTEGRADA - PADRAO CIDADES / GOV.BR
echo   Infraestrutura e Gestao Escolar em Acao
echo ======================================================
echo.
echo IMPORTANTE: esta versao visual usa a porta %AGENDA_PORT%.
echo Isso evita abrir por engano uma versao antiga que esteja
echo ainda executando na porta 8000.
echo.

where python >nul 2>nul
if errorlevel 1 (
  echo Python nao foi encontrado no computador.
  echo Instale o Python 3.11 ou superior e marque "Add Python to PATH".
  pause
  exit /b 1
)

python -c "import fastapi, uvicorn, jinja2, multipart, itsdangerous" >nul 2>nul
if errorlevel 1 (
  echo Instalando dependencias necessarias...
  python -m pip install -r requirements.txt
  if errorlevel 1 (
    echo Nao foi possivel instalar as dependencias.
    pause
    exit /b 1
  )
)

echo Verificando a porta %AGENDA_PORT%...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-NetTCPConnection -LocalPort %AGENDA_PORT% -State Listen -ErrorAction SilentlyContinue; if($p){exit 2}else{exit 0}" >nul 2>nul
if errorlevel 2 (
  echo.
  echo A porta %AGENDA_PORT% ja esta em uso.
  echo Feche outra instancia desta versao do sistema e tente novamente.
  pause
  exit /b 2
)

echo.
echo Iniciando a NOVA interface GOV.BR em %AGENDA_URL%
echo Para encerrar o servidor, feche esta janela ou pressione CTRL+C.
echo.
start "" cmd /c "timeout /t 2 /nobreak >nul ^& start \"\" %AGENDA_URL%"
python app.py
pause
