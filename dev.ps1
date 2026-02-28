# mcp_03 개발 서비스 관리 (PowerShell용)
# WSL의 Node.js v24를 사용하여 dev.sh 실행
# 사용법: .\dev.ps1 [start|stop|restart|status|logs]

param(
    [Parameter(Position=0)]
    [string]$Command = "help",

    [Parameter(Position=1)]
    [string]$SubCommand = ""
)

# WSL 설치 확인
if (-not (Get-Command wsl -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] WSL이 설치되어 있지 않습니다." -ForegroundColor Red
    Write-Host "        관리자 권한 PowerShell에서 'wsl --install' 을 실행하세요."
    exit 1
}

# 현재 스크립트 위치를 WSL 경로로 변환
$winDir = $PSScriptRoot
$wslDir = (wsl wslpath -a $winDir.Replace('\', '/'))
$scriptPath = "$wslDir/dev.sh"

# 인자 구성
$args_list = @($Command)
if ($SubCommand -ne "") {
    $args_list += $SubCommand
}

# WSL bash로 실행
wsl bash $scriptPath @args_list
