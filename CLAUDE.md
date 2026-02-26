# 개발 규칙

## 자동 커밋 규칙
- 각 태스크 완료 후 반드시 git add -A && git commit 실행
- 커밋 메시지 형식: "feat: TASK-XXX - 태스크명"
- push는 태스크 3개 완료마다 실행

## 코딩 규칙
- Java 17 + Spring Boot 3.x
- 모든 API 응답은 ApiResponse<T> wrapper
- 삭제는 soft delete만 (hard delete 금지)
- DB 변경은 Flyway 마이그레이션으로
- 테스트 코드 반드시 작성

## 프로젝트 구조
- backend: /home/ubuntu/coffee-inventory/backend
- frontend: /home/ubuntu/coffee-inventory/frontend
- docs: /home/ubuntu/coffee-inventory/docs
