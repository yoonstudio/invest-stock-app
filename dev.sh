#!/usr/bin/env bash
# mcp_03 개발 서비스 관리 스크립트
# 사용법: ./dev.sh [start|stop|restart|status|logs]

# ── 경로 설정 ──────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$SCRIPT_DIR/.pids"
LOG_DIR="$SCRIPT_DIR/.logs"
SERVER_PID_FILE="$PID_DIR/server.pid"
CLIENT_PID_FILE="$PID_DIR/client.pid"
SERVER_LOG="$LOG_DIR/server.log"
CLIENT_LOG="$LOG_DIR/client.log"

# ── 색상 ───────────────────────────────────────────────────────────────────
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

# ── 헬퍼 함수 ─────────────────────────────────────────────────────────────
log_server() { echo -e "${CYAN}[SERVER]${RESET} $*"; }
log_client() { echo -e "${MAGENTA}[CLIENT]${RESET} $*"; }
log_info()   { echo -e "${GREEN}[INFO]${RESET}   $*"; }
log_warn()   { echo -e "${YELLOW}[WARN]${RESET}   $*"; }
log_error()  { echo -e "${RED}[ERROR]${RESET}  $*"; }

is_running() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid=$(cat "$pid_file")
    kill -0 "$pid" 2>/dev/null
    return $?
  fi
  return 1
}

kill_tree() {
  local pid="$1"
  local children
  children=$(ps --ppid "$pid" -o pid= 2>/dev/null || true)
  for child in $children; do
    kill_tree "$child"
  done
  kill -TERM "$pid" 2>/dev/null || true
  sleep 0.3
  kill -KILL "$pid" 2>/dev/null || true
}

wait_for_port() {
  local port="$1"
  local label="$2"
  local timeout="${3:-20}"
  local count=0
  printf "${GREEN}[INFO]${RESET}   %s 응답 대기 중 " "$label"
  while ! ss -tlnp 2>/dev/null | grep -q ":${port}"; do
    if [[ $count -ge $timeout ]]; then
      echo " 타임아웃"
      return 1
    fi
    printf "."
    sleep 1
    count=$((count + 1))
  done
  echo " 준비됨 (${count}s)"
  return 0
}

# ── Node.js 버전 검사 ─────────────────────────────────────────────────────
check_node_version() {
  local version major minor
  version=$(node --version 2>/dev/null | sed 's/^v//')
  major=$(echo "$version" | cut -d. -f1)
  minor=$(echo "$version" | cut -d. -f2)

  # Next.js 15 요구 버전: ^18.18.0 || ^19.8.0 || >= 20.0.0
  local ok=0
  if [[ "$major" -ge 20 ]]; then ok=1
  elif [[ "$major" -eq 19 && "$minor" -ge 8 ]]; then ok=1
  elif [[ "$major" -eq 18 && "$minor" -ge 18 ]]; then ok=1
  fi

  if [[ $ok -eq 0 ]]; then
    log_error "Node.js 버전 불일치: v${version} (현재)"
    log_error "Next.js 15는 Node.js 18.18.0 이상 또는 20.0.0 이상이 필요합니다."
    echo ""
    echo -e "  ${YELLOW}▶ Windows(Git Bash/CMD/PowerShell)에서 실행 중이라면:${RESET}"
    echo -e "    CMD:        ${CYAN}dev.bat start${RESET}"
    echo -e "    PowerShell: ${CYAN}.\\dev.ps1 start${RESET}"
    echo -e "    (WSL의 Node.js v24를 자동으로 사용합니다)"
    echo ""
    echo -e "  ${YELLOW}▶ WSL 터미널에서 직접 실행:${RESET}"
    echo -e "    ${CYAN}bash /mnt/c/project/vibecoding/mcp_03/dev.sh start${RESET}"
    exit 1
  fi
}

# ── 사전 확인 ─────────────────────────────────────────────────────────────
check_deps() {
  local missing=()
  if ! command -v node >/dev/null 2>&1; then missing+=("node"); fi
  if ! command -v npm  >/dev/null 2>&1; then missing+=("npm"); fi
  if [[ ${#missing[@]} -gt 0 ]]; then
    log_error "필수 도구 없음: ${missing[*]}"
    exit 1
  fi
  check_node_version
  if [[ ! -f "$SCRIPT_DIR/.env" ]]; then
    log_warn ".env 파일이 없습니다. 기본값으로 실행됩니다."
  fi
  if [[ ! -f "$SCRIPT_DIR/client/.env.local" ]]; then
    log_warn "client/.env.local 파일이 없습니다."
  fi
  if [[ ! -d "$SCRIPT_DIR/node_modules" ]]; then
    log_warn "node_modules 없음. 설치 중..."
    npm install --prefix "$SCRIPT_DIR" --silent
  fi
  if [[ ! -d "$SCRIPT_DIR/client/node_modules" ]]; then
    log_warn "client/node_modules 없음. 설치 중..."
    npm install --prefix "$SCRIPT_DIR/client" --silent
  fi
}

# ── start ─────────────────────────────────────────────────────────────────
cmd_start() {
  mkdir -p "$PID_DIR" "$LOG_DIR"

  # 서버 시작
  if is_running "$SERVER_PID_FILE"; then
    log_server "이미 실행 중 (PID: $(cat "$SERVER_PID_FILE"))"
  else
    log_server "시작 중... (포트 3001)"
    : > "$SERVER_LOG"
    (
      cd "$SCRIPT_DIR"
      npx dotenv -e .env -- npx tsx server/index.ts >> "$SERVER_LOG" 2>&1
    ) &
    echo $! > "$SERVER_PID_FILE"
    if wait_for_port 3001 "서버(3001)" 25; then
      log_server "기동 완료 → http://localhost:3001"
    else
      log_error "서버 기동 실패. 로그 확인: $SERVER_LOG"
      tail -20 "$SERVER_LOG" | sed 's/^/  /'
    fi
  fi

  # 클라이언트 시작
  if is_running "$CLIENT_PID_FILE"; then
    log_client "이미 실행 중 (PID: $(cat "$CLIENT_PID_FILE"))"
  else
    # 포트 3000 잔여 프로세스 정리
    if ss -tlnp 2>/dev/null | grep -q ':3000'; then
      log_warn "포트 3000 선점 프로세스 발견 → 종료 중..."
      pkill -KILL -f "next-server" 2>/dev/null || true
      pkill -KILL -f "next dev"    2>/dev/null || true
      sleep 1
    fi
    log_client "시작 중... (포트 3000)"
    : > "$CLIENT_LOG"
    (
      cd "$SCRIPT_DIR/client"
      PORT=3000 npm run dev >> "$CLIENT_LOG" 2>&1
    ) &
    echo $! > "$CLIENT_PID_FILE"
    if wait_for_port 3000 "클라이언트(3000)" 60; then
      log_client "기동 완료 → http://localhost:3000"
    else
      log_error "클라이언트 기동 실패. 로그 확인: $CLIENT_LOG"
      tail -20 "$CLIENT_LOG" | sed 's/^/  /'
    fi
  fi

  echo ""
  log_info "로그 확인:  ./dev.sh logs"
  log_info "종료:       ./dev.sh stop"
}

# ── stop ──────────────────────────────────────────────────────────────────
cmd_stop() {
  local stopped=0

  if is_running "$SERVER_PID_FILE"; then
    local pid
    pid=$(cat "$SERVER_PID_FILE")
    kill_tree "$pid"
    rm -f "$SERVER_PID_FILE"
    log_server "종료됨 (PID: $pid)"
    stopped=$((stopped + 1))
  else
    log_server "실행 중이 아님"
  fi

  if is_running "$CLIENT_PID_FILE"; then
    local pid
    pid=$(cat "$CLIENT_PID_FILE")
    kill_tree "$pid"
    rm -f "$CLIENT_PID_FILE"
    log_client "종료됨 (PID: $pid)"
    stopped=$((stopped + 1))
  else
    log_client "실행 중이 아님"
  fi

  # 잔여 프로세스 강제 정리
  pkill -KILL -f "tsx server/index.ts" 2>/dev/null && log_server "잔여 프로세스 정리 완료" || true
  pkill -KILL -f "next dev"            2>/dev/null && log_client "잔여 프로세스 정리 완료" || true
  pkill -KILL -f "next-server"         2>/dev/null || true
  pkill -KILL -f "\.next/server"       2>/dev/null || true
  rm -f "$SERVER_PID_FILE" "$CLIENT_PID_FILE"

  if [[ $stopped -gt 0 ]]; then
    log_info "총 ${stopped}개 서비스 종료 완료"
  fi
}

# ── restart ───────────────────────────────────────────────────────────────
cmd_restart() {
  log_info "재시작 중..."
  cmd_stop
  sleep 1
  cmd_start
}

# ── status ────────────────────────────────────────────────────────────────
cmd_status() {
  echo -e "${BOLD}=== mcp_03 서비스 상태 ===${RESET}"
  echo ""

  if is_running "$SERVER_PID_FILE"; then
    local pid
    pid=$(cat "$SERVER_PID_FILE")
    log_server "${GREEN}실행 중${RESET} (PID: $pid) → http://localhost:3001"
  else
    log_server "${RED}중지됨${RESET}"
  fi

  if is_running "$CLIENT_PID_FILE"; then
    local pid
    pid=$(cat "$CLIENT_PID_FILE")
    log_client "${GREEN}실행 중${RESET} (PID: $pid) → http://localhost:3000"
  else
    log_client "${RED}중지됨${RESET}"
  fi

  echo ""
  if ss -tlnp 2>/dev/null | grep -q ':3001'; then
    log_info "포트 3001 ${GREEN}응답 중${RESET}"
  else
    log_info "포트 3001 ${YELLOW}미응답${RESET}"
  fi
  if ss -tlnp 2>/dev/null | grep -q ':3000'; then
    log_info "포트 3000 ${GREEN}응답 중${RESET}"
  else
    log_info "포트 3000 ${YELLOW}미응답${RESET}"
  fi
}

# ── logs ──────────────────────────────────────────────────────────────────
cmd_logs() {
  local target="${1:-all}"

  case "$target" in
    server)
      if [[ -f "$SERVER_LOG" ]]; then
        tail -f "$SERVER_LOG"
      else
        log_error "서버 로그 없음 (서비스를 먼저 시작하세요)"
      fi
      ;;
    client)
      if [[ -f "$CLIENT_LOG" ]]; then
        tail -f "$CLIENT_LOG"
      else
        log_error "클라이언트 로그 없음 (서비스를 먼저 시작하세요)"
      fi
      ;;
    *)
      [[ ! -f "$SERVER_LOG" ]] && mkdir -p "$LOG_DIR" && touch "$SERVER_LOG"
      [[ ! -f "$CLIENT_LOG" ]] && touch "$CLIENT_LOG"
      log_info "로그 스트리밍 중... (Ctrl+C로 종료, 서비스는 계속 실행)"
      tail -f "$SERVER_LOG" -f "$CLIENT_LOG" 2>/dev/null
      ;;
  esac
}

# ── 도움말 ────────────────────────────────────────────────────────────────
cmd_help() {
  echo -e "${BOLD}사용법:${RESET} ./dev.sh <명령>"
  echo ""
  echo "  ${GREEN}start${RESET}           서버 + 클라이언트 시작"
  echo "  ${RED}stop${RESET}            서버 + 클라이언트 종료"
  echo "  ${YELLOW}restart${RESET}         재시작"
  echo "  ${CYAN}status${RESET}          실행 상태 확인"
  echo "  ${MAGENTA}logs${RESET}            전체 로그 실시간 출력"
  echo "  ${MAGENTA}logs server${RESET}     서버 로그만"
  echo "  ${MAGENTA}logs client${RESET}     클라이언트 로그만"
  echo ""
  echo "  서버:       http://localhost:3001"
  echo "  클라이언트: http://localhost:3000"
}

# ── 진입점 ────────────────────────────────────────────────────────────────
CMD="${1:-help}"

case "$CMD" in
  start)   check_deps; cmd_start ;;
  stop)    cmd_stop ;;
  restart) check_deps; cmd_restart ;;
  status)  cmd_status ;;
  logs)    cmd_logs "${2:-all}" ;;
  help|-h|--help) cmd_help ;;
  *)
    log_error "알 수 없는 명령: $CMD"
    echo ""
    cmd_help
    exit 1
    ;;
esac
