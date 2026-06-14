@echo off
chcp 65001 > nul
cls

echo.
echo  ╔══════════════════════════════════════╗
echo  ║        PrumoCanteiro — Local         ║
echo  ╚══════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: ── Node.js ───────────────────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERRO] Node.js nao encontrado.
    echo  Baixe em: https://nodejs.org  ^(versao LTS^)
    pause & exit /b 1
)

:: ── Dependências ─────────────────────────────────────────────────────────────
if not exist "node_modules" (
    echo  Instalando dependencias ^(1x, aguarde^)...
    npm install
    if %errorlevel% neq 0 ( echo  [ERRO] npm install falhou. & pause & exit /b 1 )
)

:: ── Prisma client ────────────────────────────────────────────────────────────
echo  Gerando Prisma client...
npx prisma generate --silent 2>nul
if %errorlevel% neq 0 (
    npx prisma generate
)

:: ── Banco de dados (SQLite, criado automaticamente) ──────────────────────────
echo  Aplicando schema no banco...
npx prisma db push --skip-generate --accept-data-loss 2>nul
if %errorlevel% neq 0 (
    echo  Tentando criar banco novamente...
    npx prisma db push --skip-generate
    if %errorlevel% neq 0 ( echo  [ERRO] Falha ao criar banco. & pause & exit /b 1 )
)

:: ── Seed (dados demo) ─────────────────────────────────────────────────────────
echo  Carregando dados demo...
npx tsx prisma/seed.ts 2>nul

:: ── Servidor ─────────────────────────────────────────────────────────────────
echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║  Sistema pronto!  http://localhost:3001              ║
echo  ║                                                      ║
echo  ║  Login:  demo@prumo.com                              ║
echo  ║  Senha:  demo123                                     ║
echo  ║                                                      ║
echo  ║  Pressione Ctrl+C para parar.                        ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

start "" cmd /c "timeout /t 4 >nul && start http://localhost:3001"

npm run dev -- --port 3001
