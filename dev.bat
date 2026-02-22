@echo off
:: mcp_03 개발 서비스 관리 (Windows CMD용)
:: WSL의 Node.js v24를 사용하여 dev.sh 실행
:: 사용법: dev.bat [start|stop|restart|status|logs]

setlocal

:: WSL 설치 확인
where wsl >nul 2>&1
if errorlevel 1 (
    echo [ERROR] WSL이 설치되어 있지 않습니다.
    echo         관리자 권한으로 "wsl --install" 을 실행하세요.
    exit /b 1
)

:: %~dp0 = C:\project\vibecoding\mcp_03\  (trailing backslash 포함)
:: 끝의 백슬래시 제거 후 wslpath 변환
set "WIN_DIR=%~dp0"
set "WIN_DIR=%WIN_DIR:~0,-1%"

for /f "delims=" %%i in ('wsl wslpath -a "%WIN_DIR%"') do set "WSL_DIR=%%i"

wsl bash "%WSL_DIR%/dev.sh" %*

endlocal
