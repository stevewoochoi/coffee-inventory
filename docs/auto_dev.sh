#!/bin/bash
# auto_dev.sh - 커피 재고관리 시스템 자동화 개발 스크립트
# 사용법: tmux new -s claude-dev && chmod +x auto_dev.sh && ./auto_dev.sh

set -e

PROJECT_DIR="/home/ubuntu/coffee-inventory"
LOG_FILE="$PROJECT_DIR/auto_dev.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

run_backend_test() {
  log "🧪 백엔드 테스트 실행 중..."
  cd "$PROJECT_DIR/backend"
  if mvn test -q 2>&1 | tee -a "$LOG_FILE"; then
    log "✅ 백엔드 테스트 통과"
    return 0
  else
    log "❌ 백엔드 테스트 실패"
    return 1
  fi
}

run_frontend_build() {
  log "🔨 프론트엔드 빌드 중..."
  cd "$PROJECT_DIR/frontend"
  if npm run build 2>&1 | tee -a "$LOG_FILE"; then
    log "✅ 프론트엔드 빌드 성공"
    return 0
  else
    log "❌ 프론트엔드 빌드 실패"
    return 1
  fi
}

get_next_task() {
  grep -m 1 "^\- \[ \]" "$PROJECT_DIR/docs/TASKS.md" | sed 's/- \[ \] //'
}

log "🚀 커피 재고관리 시스템 자동 개발 시작"
log "📁 프로젝트 디렉토리: $PROJECT_DIR"

cd "$PROJECT_DIR"

while true; do
  NEXT_TASK=$(get_next_task)

  if [ -z "$NEXT_TASK" ]; then
    log "🎉 모든 태스크 완료!"
    break
  fi

  log "📋 다음 태스크: $NEXT_TASK"

  # Claude Code 실행
  claude --print "
당신은 커피 재고관리 시스템을 개발하는 시니어 풀스택 개발자입니다.

## 현재 태스크
$NEXT_TASK

## 참고 문서
- docs/ARCHITECTURE.md: 전체 아키텍처, DB 스키마, API 구조
- docs/TASKS.md: 전체 태스크 목록
- docs/DESIGN_SYSTEM.md: React 디자인 가이드

## 개발 규칙
- Java 17 + Spring Boot 3.x, React 18 + Tailwind CSS + shadcn/ui
- 모든 API 응답은 ApiResponse<T> wrapper 사용
- 모든 삭제는 soft delete (hard delete 금지)
- DB 변경은 Flyway 마이그레이션 파일로 관리
- 테스트 코드 반드시 작성 (JUnit5)
- React는 shadcn/ui + Tailwind, blue 계열 메인 컬러

위 태스크를 완전히 구현해주세요. 완료 후 TASKS.md에서 해당 태스크의 [ ]를 [x]로 변경해주세요.
" 2>&1 | tee -a "$LOG_FILE"

  # 테스트 실행
  BACKEND_OK=0
  FRONTEND_OK=0

  if [ -d "$PROJECT_DIR/backend" ]; then
    run_backend_test && BACKEND_OK=1 || BACKEND_OK=0
  else
    BACKEND_OK=1  # 아직 생성 전
  fi

  if [ -d "$PROJECT_DIR/frontend" ]; then
    run_frontend_build && FRONTEND_OK=1 || FRONTEND_OK=0
  else
    FRONTEND_OK=1  # 아직 생성 전
  fi

  if [ $BACKEND_OK -eq 1 ] && [ $FRONTEND_OK -eq 1 ]; then
    log "✅ 태스크 완료 - 다음 태스크로 이동"
    # Git 자동 커밋
    cd "$PROJECT_DIR"
    git add -A
    git commit -m "feat: $NEXT_TASK" 2>/dev/null || true
  else
    log "🔧 빌드/테스트 실패 - Claude에게 수정 요청"
    
    ERROR_LOG=$(tail -50 "$LOG_FILE")
    claude --print "
빌드 또는 테스트가 실패했습니다. 에러 로그를 분석하고 수정해주세요.

## 에러 로그 (최근 50줄)
$ERROR_LOG

## 수정 후 확인사항
- 컴파일 에러 모두 수정
- 테스트 통과
- 빌드 성공
" 2>&1 | tee -a "$LOG_FILE"
  fi

  sleep 3
done

log "🏁 자동화 스크립트 종료"
