@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

rem ---------------------------------------------------------------------------
rem  Publica a branch de trabalho no GitHub.
rem  Para trocar de destino, altere as tres linhas abaixo.
rem ---------------------------------------------------------------------------
set "REPO_URL=https://github.com/repositoriocpd4-collab/AssistInfra.git"
set "REMOTE=origin"
set "BRANCH=DevAssist"

echo ======================================================
echo   PUBLICAR NO GITHUB - Agenda Integrada
echo   Repositorio: %REPO_URL%
echo   Branch:      %BRANCH%
echo ======================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Git nao foi encontrado neste computador.
  echo Instale em https://git-scm.com/download/win e tente novamente.
  pause
  exit /b 1
)

if not exist ".git" (
  echo Inicializando repositorio local...
  git init
  git checkout -b %BRANCH%
  goto :depois_da_branch
)

rem --- Confere em que branch estamos, sem trocar nada por conta propria -------
for /f "tokens=*" %%b in ('git rev-parse --abbrev-ref HEAD') do set "ATUAL=%%b"
if /i not "!ATUAL!"=="%BRANCH%" (
  echo A branch atual e "!ATUAL!", mas este arquivo publica a "%BRANCH%".
  echo.
  echo Trocar de branch agora pode esconder trabalho que esta so na "!ATUAL!".
  set /p "TROCAR=Digite S para mudar para %BRANCH%, ou qualquer outra tecla para cancelar: "
  if /i not "!TROCAR!"=="S" (
    echo Cancelado. Nada foi alterado.
    pause
    exit /b 1
  )
  git rev-parse --verify %BRANCH% >nul 2>nul
  if errorlevel 1 (
    git checkout -b %BRANCH%
  ) else (
    git checkout %BRANCH%
  )
  if errorlevel 1 (
    echo.
    echo [ERRO] Nao foi possivel trocar de branch. Salve ou descarte as
    echo alteracoes pendentes e rode este arquivo de novo.
    pause
    exit /b 1
  )
)

:depois_da_branch
echo.
echo Alteracoes que serao enviadas:
echo ------------------------------------------------------
git status --short
echo ------------------------------------------------------
echo.
echo Confira a lista acima. Arquivos que nao devem ir para o GitHub
echo (imagens de referencia, arquivos temporarios) precisam entrar no
echo .gitignore antes de continuar.
echo.

set "MSG="
set /p "MSG=Mensagem do commit (Enter usa uma mensagem com a data): "
if "!MSG!"=="" (
  for /f "tokens=*" %%d in ('powershell -NoProfile -Command "Get-Date -Format \"dd/MM/yyyy HH:mm\""') do set "AGORA=%%d"
  set "MSG=Atualizacao do sistema - !AGORA!"
)

echo.
echo Adicionando arquivos (respeitando o .gitignore)...
git add .

git diff --cached --quiet
if errorlevel 1 (
  git commit -m "!MSG!"
  if errorlevel 1 (
    echo.
    echo [ERRO] O commit falhou. Veja a mensagem acima.
    pause
    exit /b 1
  )
) else (
  echo Nada novo para commitar. Seguindo para o envio do que ja esta pronto.
)

echo.
echo Configurando o remoto "%REMOTE%"...
git remote get-url %REMOTE% >nul 2>nul
if errorlevel 1 (
  git remote add %REMOTE% %REPO_URL%
) else (
  git remote set-url %REMOTE% %REPO_URL%
)

echo.
echo Verificando o acesso ao repositorio...
git ls-remote --exit-code %REMOTE% >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERRO] O GitHub respondeu que o repositorio nao existe, ou esta conta
  echo        nao tem acesso a ele:
  echo        %REPO_URL%
  echo.
  echo Duas causas possiveis:
  echo   1^) O repositorio ainda nao foi criado. Crie em https://github.com/new
  echo      com o nome exato, SEM marcar "Add a README".
  echo   2^) Ele existe mas e privado, e o Git deste computador esta logado com
  echo      outra conta. Abra o Gerenciador de Credenciais do Windows, remova a
  echo      credencial "git:https://github.com" e rode este arquivo de novo para
  echo      entrar com a conta correta.
  echo.
  pause
  exit /b 1
)

echo.
echo Enviando a branch "%BRANCH%"...
git push -u %REMOTE% %BRANCH%
if errorlevel 1 (
  echo.
  echo [ERRO] O envio falhou.
  echo.
  echo O GitHub tem commits na "%BRANCH%" que nao existem neste computador.
  echo.
  echo Voce tem duas saidas:
  echo.
  echo   A^) TRAZER o que esta la e juntar com o que esta aqui:
  echo      git pull %REMOTE% %BRANCH% --allow-unrelated-histories
  echo      ^(pode gerar conflitos para resolver a mao^)
  echo.
  echo   B^) SOBRESCREVER o GitHub com o que esta neste computador.
  echo      ATENCAO: os commits que estao la serao DESCARTADOS e nao ha
  echo      como recupera-los pela interface do GitHub.
  echo.
  set "CONFIRMA="
  set /p "CONFIRMA=Para a opcao B, digite SOBRESCREVER. Enter cancela: "
  if /i not "!CONFIRMA!"=="SOBRESCREVER" (
    echo Cancelado. Nada foi enviado.
    pause
    exit /b 1
  )
  echo.
  echo Sobrescrevendo a "%BRANCH%" no GitHub...
  git push --force-with-lease %REMOTE% %BRANCH%
  if errorlevel 1 (
    echo.
    echo [ERRO] A sobrescrita tambem falhou. Veja a mensagem acima.
    pause
    exit /b 1
  )
)

echo.
echo ======================================================
echo Concluido.
echo https://github.com/repositoriocpd4-collab/AssistInfra/tree/%BRANCH%
echo ======================================================
pause
