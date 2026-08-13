@echo off
setlocal

set PROJECT_DIR=C:\Users\KlikBi\Documents\KlikBiGo\chatbot-whatsapp

cd /d "%PROJECT_DIR%"

echo ========================================
echo   KlikBiGo - Auto Git Update
echo ========================================
echo.

echo [1/3] Mengecek update dari GitHub...
git fetch origin revision

if errorlevel 1 (
    echo.
    echo [ERROR] Gagal melakukan git fetch.
    exit /b 1
)

echo.
echo [2/3] Mengecek perubahan...

git diff --quiet HEAD origin/revision

if errorlevel 1 (
    echo.
    echo [UPDATE] Ada perubahan baru di branch revision.
    echo [UPDATE] Menjalankan git pull...

    git pull origin revision

    if errorlevel 1 (
        echo.
        echo [ERROR] Git pull gagal.
        exit /b 1
    )

    echo.
    echo [SUCCESS] Update berhasil.
    echo [UPDATE] Restart chatbot...

    pm2 restart klikbi-go

    if errorlevel 1 (
        echo.
        echo [WARNING] Update berhasil, tetapi PM2 restart gagal.
        exit /b 1
    )

    echo.
    echo [SUCCESS] Chatbot berhasil direstart.
) else (
    echo.
    echo [OK] Tidak ada update baru.
    echo [OK] Tidak melakukan restart chatbot.
)

echo.
echo ========================================
echo   Selesai
echo ========================================

exit /b 0