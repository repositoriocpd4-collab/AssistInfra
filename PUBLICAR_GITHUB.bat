@echo off
setlocal
cd /d "%~dp0"

set "REPO_URL=https://github.com/repositoriocpd4-collab/AssistInfra.git"
set "BRANCH=DevAssist"

echo ======================================================
echo   PUBLICAR NO GITHUB - Agenda Integrada (AssistInfra)
echo   Repositorio: https://github.com/repositoriocpd4-collab/AssistInfra
echo   Branch: %BRANCH%
echo ======================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo Git nao foi encontrado no computador.
  echo Instale em https://git-scm.com/download/win e tente novamente.
  pause
  exit /b 1
)

if not exist ".git" (
  echo Inicializando repositorio local...
  git init
  git checkout -b %BRANCH%
) else (
  echo Repositorio local ja existe, pulando "git init".
  echo Alternando/criando a branch "%BRANCH%"...
  git rev-parse --verify %BRANCH% >nul 2>nul
  if errorlevel 1 (
    git checkout -b %BRANCH%
  ) else (
    git checkout %BRANCH%
  )
)

echo.
echo Adicionando arquivos ao commit (respeitando o .gitignore)...
git add .
git commit -m "Agenda Integrada - versao GOV.BR com assistente de registro e menu fixo"
if errorlevel 1 (
  echo.
  echo Nada novo para commitar, ou o commit falhou. Verifique as mensagens acima.
)

echo.
echo Configurando o remoto "origin"...
git remote remove origin >nul 2>nul
git remote add origin %REPO_URL%

echo.
echo Enviando a branch "%BRANCH%"...
git push -u origin %BRANCH%
if errorlevel 1 (
  echo.
  echo O envio da "%BRANCH%" falhou. Isso costuma acontecer quando o repositorio no
  echo GitHub ja tem commits nessa branch (ex.: foi criado com README pela interface web)
  echo ou quando as credenciais do Git ainda nao foram configuradas neste computador.
  echo Nesse caso, rode manualmente:
  echo   git pull origin %BRANCH% --allow-unrelated-histories
  echo e resolva conflitos se aparecerem, depois rode este arquivo de novo.
  pause
  exit /b 1
)

echo.
echo ======================================================
echo Concluido. Confira em:
echo https://github.com/repositoriocpd4-collab/AssistInfra/tree/%BRANCH%
echo ======================================================
pause
