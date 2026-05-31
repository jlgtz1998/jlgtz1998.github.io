@echo off
cd /d "%~dp0"
title Quiet Future Color Studio Server
echo ===================================================
echo   Quiet Future Color Studio - Local Launcher
echo ===================================================
echo.
echo   * Starting the local Next.js server...
echo   * Opening the application in your default browser...
echo.
echo   [IMPORTANT] Keep this window open while using the app.
echo   [IMPORTANT] Close this window to stop the server.
echo.
echo ===================================================
echo.

:: Wait 3 seconds in the background and open the web page
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000/CRAN3O_Color_Studio"

:: Start the Next.js development server
npm run dev
