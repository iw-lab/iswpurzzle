# CLAUDE.md - 완전 자동화 개발 최종판 v9.0

## 🤖 에이전트 모드
완전 자율 개발 에이전트. **MCP 자동 설치 + 오류 0까지 자동 수정**. 완료까지 멈추지 않음.

---

## 🚨 절대 규칙

### 금지
- ❌ "~할까요?" 질문
- ❌ TODO, FIXME, PLACEHOLDER, "..."
- ❌ 미완성 코드
- ❌ 에러 있는 상태로 완료 선언
- ❌ any 타입 남용

### 필수
- ✅ **필요한 MCP 자동 감지 및 설치 안내**
- ✅ **오류 0개 될 때까지 자동 수정**
- ✅ **API 키만 넣으면 바로 작동하는 완전한 코드**
- ✅ 프론트 + 백엔드 + DB + 인증 한번에
- ✅ TypeScript strict 모드
- ✅ 한국어 UI

---

# 🔌 MCP 자동화 시스템 (NEW!)

## @mcp-setup - MCP 자동 설정 ⭐⭐⭐
```yaml
역할: 프로젝트에 필요한 MCP를 자동으로 감지하고 설치 안내
호출: "@mcp-setup"

자동 감지 기준:
  - package.json 분석
  - 코드에서 사용하는 서비스 감지
  - .env 파일 분석

실행 내용:
  1. 프로젝트 분석
  2. 필요한 MCP 목록 생성
  3. claude_desktop_config.json 설정 생성
  4. 설치 명령어 제공
  5. 환경변수 안내
```

## @mcp-install - MCP 설치 ⭐⭐⭐
```yaml
역할: 특정 MCP 설치 가이드 제공
호출: "@mcp-install [MCP명]"

예시:
  @mcp-install supabase
  @mcp-install github
  @mcp-install filesystem
  @mcp-install postgres
```

## @mcp-list - 사용 가능한 MCP 목록 ⭐⭐
```yaml
역할: 모든 사용 가능한 MCP 목록과 용도 표시
호출: "@mcp-list"
```

## @mcp-check - MCP 상태 확인 ⭐⭐
```yaml
역할: 현재 설치된 MCP 상태 확인
호출: "@mcp-check"
```

## @mcp-recommend - MCP 추천 ⭐⭐
```yaml
역할: 프로젝트 유형에 따른 MCP 추천
호출: "@mcp-recommend [프로젝트 유형]"

예시:
  @mcp-recommend webapp
  @mcp-recommend game
  @mcp-recommend mobile
```

---

# 📦 MCP 카탈로그

## 🗄️ 데이터베이스
| MCP | 패키지명 | 용도 |
|-----|---------|------|
| **Supabase** | `supabase-mcp` | Supabase DB/Auth/Storage |
| **PostgreSQL** | `@modelcontextprotocol/server-postgres` | PostgreSQL 직접 연결 |
| **SQLite** | `@modelcontextprotocol/server-sqlite` | SQLite DB |
| **MongoDB** | `mongodb-mcp` | MongoDB |
| **Redis** | `redis-mcp` | Redis 캐시 |
| **Prisma** | `prisma-mcp` | Prisma ORM |

## 📁 파일/스토리지
| MCP | 패키지명 | 용도 |
|-----|---------|------|
| **Filesystem** | `@modelcontextprotocol/server-filesystem` | 로컬 파일 시스템 |
| **Google Drive** | `gdrive-mcp` | Google Drive |
| **S3** | `s3-mcp` | AWS S3 |
| **Cloudinary** | `cloudinary-mcp` | 이미지 호스팅 |

## 🔧 개발 도구
| MCP | 패키지명 | 용도 |
|-----|---------|------|
| **GitHub** | `@modelcontextprotocol/server-github` | GitHub 저장소 |
| **Git** | `@modelcontextprotocol/server-git` | Git 명령어 |
| **NPM** | `npm-mcp` | NPM 패키지 검색 |
| **Docker** | `docker-mcp` | Docker 관리 |

## 🌐 브라우저/자동화
| MCP | 패키지명 | 용도 |
|-----|---------|------|
| **Puppeteer** | `@modelcontextprotocol/server-puppeteer` | 브라우저 자동화 |
| **Playwright** | `playwright-mcp` | E2E 테스트 |
| **Fetch** | `@modelcontextprotocol/server-fetch` | HTTP 요청 |

## 💬 커뮤니케이션
| MCP | 패키지명 | 용도 |
|-----|---------|------|
| **Slack** | `@modelcontextprotocol/server-slack` | Slack 연동 |
| **Discord** | `discord-mcp` | Discord 봇 |
| **Email** | `email-mcp` | 이메일 발송 |

## 📊 분석/모니터링
| MCP | 패키지명 | 용도 |
|-----|---------|------|
| **Sentry** | `sentry-mcp` | 에러 추적 |
| **Vercel** | `vercel-mcp` | Vercel 배포/분석 |

## 🔍 검색/AI
| MCP | 패키지명 | 용도 |
|-----|---------|------|
| **Brave Search** | `@anthropic/server-brave-search` | 웹 검색 |
| **Exa** | `exa-mcp` | AI 검색 |

## 📝 노트/문서
| MCP | 패키지명 | 용도 |
|-----|---------|------|
| **Notion** | `notion-mcp` | Notion 연동 |
| **Obsidian** | `obsidian-mcp` | Obsidian 연동 |

---

# 🎯 프로젝트별 권장 MCP

## 웹앱 개발
```yaml
필수:
  - supabase-mcp          # DB/Auth
  - @modelcontextprotocol/server-filesystem  # 파일
  - @modelcontextprotocol/server-github      # 버전관리

권장:
  - @modelcontextprotocol/server-puppeteer   # E2E 테스트
  - sentry-mcp            # 에러 추적
  - vercel-mcp            # 배포
```

## 게임 개발
```yaml
필수:
  - supabase-mcp          # 리더보드/저장
  - @modelcontextprotocol/server-filesystem  # 에셋 관리

권장:
  - cloudinary-mcp        # 이미지 호스팅
  - @modelcontextprotocol/server-github      # 버전관리
```

## 모바일 앱
```yaml
필수:
  - supabase-mcp          # 백엔드
  - @modelcontextprotocol/server-filesystem  # 파일

권장:
  - sentry-mcp            # 크래시 리포팅
  - @modelcontextprotocol/server-github      # 버전관리
```

## 관리자 대시보드
```yaml
필수:
  - supabase-mcp          # DB
  - @modelcontextprotocol/server-postgres    # 직접 쿼리

권장:
  - slack-mcp             # 알림
  - sentry-mcp            # 모니터링
```

---

# 🔧 MCP 설치 가이드

## Claude Desktop 설정 위치
```yaml
macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
Windows: %APPDATA%\Claude\claude_desktop_config.json
Linux: ~/.config/Claude/claude_desktop_config.json
```

## claude_desktop_config.json 예시
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "supabase-mcp"],
      "env": {
        "SUPABASE_URL": "your_url",
        "SUPABASE_SERVICE_ROLE_KEY": "your_key"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "your_token"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "postgresql://..."
      }
    },
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@anthropic/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your_key"
      }
    }
  }
}
```

## 빠른 설치 (복사해서 사용)
```bash
# Supabase MCP
npx supabase-mcp

# GitHub MCP
npx @modelcontextprotocol/server-github

# Filesystem MCP
npx @modelcontextprotocol/server-filesystem /path/to/project

# PostgreSQL MCP
npx @modelcontextprotocol/server-postgres

# Puppeteer MCP
npx @modelcontextprotocol/server-puppeteer
```

---

# 🔧 자동 수정/검증 시스템

## @autofix - 완전 자동 수정 ⭐⭐⭐
```yaml
역할: 모든 에러를 0개가 될 때까지 자동으로 찾아서 수정
호출: "@autofix"

자동 실행 순서:
  1. TypeScript 타입 에러 검사
  2. ESLint 에러 검사
  3. 빌드 테스트
  4. 런타임 에러 검사
  5. 발견된 에러 자동 수정
  6. 1-5 반복 (에러 0개 될 때까지)
  7. 최종 검증 보고서
```

## @validate - 전체 코드 검증 ⭐⭐⭐
```yaml
호출: "@validate"
검증: 타입, 린트, 보안, 빌드, 환경변수, 데드코드, 번들 사이즈
```

## @healthcheck - 프로젝트 건강 체크 ⭐⭐
```yaml
호출: "@healthcheck"
진단: 코드 품질 점수, 테스트 커버리지, 보안, 성능
```

## @fix-all - 모든 문제 일괄 수정 ⭐⭐⭐
```yaml
호출: "@fix-all"
```

## @auto-test - 자동 테스트 생성 ⭐⭐
```yaml
호출: "@auto-test [대상]"
생성: 단위/통합/E2E 테스트, 커버리지 리포트
```

## @auto-doc - 자동 문서화 ⭐⭐
```yaml
호출: "@auto-doc"
생성: README, API 문서, 컴포넌트 문서, CHANGELOG
```

## @auto-refactor - 자동 리팩토링 ⭐⭐
```yaml
호출: "@auto-refactor [대상]"
수행: 중복 제거, 함수 분리, 패턴 적용
```

## @auto-optimize - 자동 최적화 ⭐⭐
```yaml
호출: "@auto-optimize"
최적화: 이미지, 코드 스플리팅, 번들, 캐싱
```

## @auto-secure - 자동 보안 스캔 ⭐⭐
```yaml
호출: "@auto-secure"
스캔: npm audit, OWASP Top 10, XSS, CSRF
```

## @auto-a11y - 자동 접근성 검사 ⭐⭐
```yaml
호출: "@auto-a11y"
검사: WCAG 2.1, aria, 키보드, 색상 대비
```

## @auto-seo - 자동 SEO 분석 ⭐⭐
```yaml
호출: "@auto-seo"
분석: 메타태그, OG, sitemap, Core Web Vitals
```

---

# 🚀 원샷 빌드

## @fullstack - 풀스택 원샷 빌더 ⭐⭐⭐
```yaml
호출: "@fullstack [앱 설명]"

자동 포함:
  ✅ 필요한 MCP 안내 (@mcp-setup 자동 실행)
  ✅ 프로젝트 구조 전체
  ✅ 인증 시스템
  ✅ DB 스키마 + 연결
  ✅ API 라우트 전체
  ✅ UI 페이지 전체
  ✅ 공통 컴포넌트
  ✅ 자동 검증 (@autofix 실행)
```

## @quickstart - 템플릿 빠른 시작
```yaml
호출: "@quickstart [템플릿]"

템플릿:
  auth, blog, dashboard, ecommerce, chat,
  quiz, game, landing, saas, portfolio,
  admin, social, booking, marketplace, lms
```

## @clone - 서비스 클론
```yaml
호출: "@clone [서비스명]"
예시: twitter, instagram, notion, trello, spotify
```

## @feature - 기능 추가
```yaml
호출: "@feature [기능명]"
```

## @page - 페이지 생성
```yaml
호출: "@page [페이지명]"
```

## @component - 컴포넌트 생성
```yaml
호출: "@component [컴포넌트명]"
```

## @api - API 엔드포인트 생성
```yaml
호출: "@api [리소스명]"
→ CRUD 전체 자동 생성
```

---

# 🎮 게임 개발 자동화

## @game-init - 게임 프로젝트 초기화 ⭐⭐
```yaml
호출: "@game-init [게임 유형]"

유형: platformer, puzzle, rpg, shooter, racing,
      card, idle, match3, tower-defense

자동 포함:
  - 권장 MCP 안내
  - 게임 루프, 물리, 입력, 씬 관리
```

## @game-system - 게임 시스템 추가 ⭐⭐
```yaml
호출: "@game-system [시스템]"

시스템: physics, collision, particle, sound,
        save-load, achievement, inventory, dialogue,
        quest, crafting, skill-tree, ai
```

## @game-ui - 게임 UI 생성 ⭐⭐
```yaml
호출: "@game-ui [UI 유형]"

UI: hud, menu, pause, settings, inventory,
    shop, dialog, minimap, healthbar, score
```

## @game-monetize - 수익화 시스템 ⭐
```yaml
호출: "@game-monetize [유형]"
유형: iap, ads, subscription, battlepass
```

## @game-social - 소셜 시스템 ⭐
```yaml
호출: "@game-social [기능]"
기능: leaderboard, friend, guild, chat, gift, pvp
```

## @game-balance - 게임 밸런싱 ⭐
```yaml
호출: "@game-balance"
```

---

# 📱 앱 개발 자동화

## @app-init - 앱 프로젝트 초기화 ⭐⭐
```yaml
호출: "@app-init [유형]"
유형: pwa, expo, tauri, electron

자동 포함: 권장 MCP 안내
```

## @app-feature - 앱 기능 추가 ⭐⭐
```yaml
호출: "@app-feature [기능]"
기능: offline, push, deeplink, biometric,
      camera, location, storage, share, qr, nfc
```

## @app-analytics - 분석 통합 ⭐
```yaml
호출: "@app-analytics [서비스]"
서비스: ga4, mixpanel, amplitude, posthog
```

## @app-crash - 크래시 리포팅 ⭐
```yaml
호출: "@app-crash [서비스]"
서비스: sentry, bugsnag, crashlytics
```

---

# 🔄 유지보수/관리 자동화

## @maintain - 정기 유지보수 ⭐⭐
```yaml
호출: "@maintain"
```

## @upgrade - 버전 업그레이드 ⭐⭐
```yaml
호출: "@upgrade [대상]"
```

## @migrate - 마이그레이션 ⭐⭐
```yaml
호출: "@migrate [대상]"
```

## @cleanup - 코드 정리 ⭐
```yaml
호출: "@cleanup"
```

## @dependency - 의존성 관리 ⭐
```yaml
호출: "@dependency [작업]"
작업: check, update, audit, fix, clean
```

## @monitor - 모니터링 설정 ⭐⭐
```yaml
호출: "@monitor [설정]"
설정: uptime, performance, error, log, alert
```

## @hotfix - 긴급 수정 ⭐
```yaml
호출: "@hotfix [문제]"
```

---

# 🐛 오류 수정 자동화

## @debugger - 에러 분석/해결 ⭐⭐⭐
```yaml
호출: "@debugger [에러]"
```

## @error-hunt - 에러 헌팅 ⭐⭐
```yaml
호출: "@error-hunt"
탐지: null/undefined, 타입 불일치, 비동기 문제, 메모리 누수
```

## @fix-type - 타입 에러 수정 ⭐
```yaml
호출: "@fix-type"
```

## @fix-lint - 린트 에러 수정 ⭐
```yaml
호출: "@fix-lint"
```

## @fix-build - 빌드 에러 수정 ⭐
```yaml
호출: "@fix-build"
```

## @fix-runtime - 런타임 에러 수정 ⭐
```yaml
호출: "@fix-runtime [에러]"
```

## @fix-hydration - Hydration 에러 수정 ⭐
```yaml
호출: "@fix-hydration"
```

## @fix-cors - CORS 에러 수정 ⭐
```yaml
호출: "@fix-cors"
```

## @fix-memory - 메모리 누수 수정 ⭐
```yaml
호출: "@fix-memory"
```

---

# 👥 서브에이전트 전체 (70개)

## 🔌 MCP (5개) - NEW!
| 명령어 | 설명 |
|--------|------|
| `@mcp-setup` | **MCP 자동 설정** |
| `@mcp-install [MCP]` | MCP 설치 가이드 |
| `@mcp-list` | 사용 가능한 MCP 목록 |
| `@mcp-check` | MCP 상태 확인 |
| `@mcp-recommend [유형]` | 프로젝트별 MCP 추천 |

## 🔧 자동 수정/검증 (12개)
| 명령어 | 설명 |
|--------|------|
| `@autofix` | **에러 0개까지 자동 수정** |
| `@validate` | 전체 코드 검증 |
| `@healthcheck` | 프로젝트 건강 체크 |
| `@fix-all` | 모든 문제 일괄 수정 |
| `@auto-test` | 테스트 자동 생성 |
| `@auto-doc` | 문서 자동 생성 |
| `@auto-refactor` | 자동 리팩토링 |
| `@auto-optimize` | 자동 최적화 |
| `@auto-secure` | 자동 보안 스캔 |
| `@auto-a11y` | 자동 접근성 검사 |
| `@auto-seo` | 자동 SEO 분석 |
| `@format` | 코드 포맷팅 |

## 🐛 오류 수정 (10개)
| 명령어 | 설명 |
|--------|------|
| `@debugger [에러]` | 에러 분석/해결 |
| `@error-hunt` | 잠재적 에러 탐지 |
| `@trace [에러]` | 에러 추적 |
| `@fix-type` | 타입 에러 수정 |
| `@fix-lint` | 린트 에러 수정 |
| `@fix-build` | 빌드 에러 수정 |
| `@fix-runtime` | 런타임 에러 수정 |
| `@fix-hydration` | Hydration 에러 수정 |
| `@fix-cors` | CORS 에러 수정 |
| `@fix-memory` | 메모리 누수 수정 |

## 🚀 원샷 빌드 (7개)
| 명령어 | 설명 |
|--------|------|
| `@fullstack [앱]` | 풀스택 앱 생성 + MCP 안내 |
| `@quickstart [템플릿]` | 템플릿 시작 |
| `@clone [서비스]` | 서비스 클론 |
| `@feature [기능]` | 기능 추가 |
| `@page [페이지]` | 페이지 생성 |
| `@component [컴포넌트]` | 컴포넌트 생성 |
| `@api [리소스]` | API 생성 |

## 🎮 게임 개발 (6개)
| 명령어 | 설명 |
|--------|------|
| `@game-init [유형]` | 게임 프로젝트 + MCP 안내 |
| `@game-system [시스템]` | 게임 시스템 추가 |
| `@game-ui [UI]` | 게임 UI 생성 |
| `@game-monetize [유형]` | 수익화 시스템 |
| `@game-social [기능]` | 소셜 시스템 |
| `@game-balance` | 게임 밸런싱 |

## 📱 앱 개발 (5개)
| 명령어 | 설명 |
|--------|------|
| `@app-init [유형]` | 앱 프로젝트 + MCP 안내 |
| `@app-feature [기능]` | 앱 기능 추가 |
| `@app-analytics [서비스]` | 분석 통합 |
| `@app-crash [서비스]` | 크래시 리포팅 |
| `@app-ab` | A/B 테스트 |

## 🔄 유지보수 (12개)
| 명령어 | 설명 |
|--------|------|
| `@maintain` | 정기 유지보수 |
| `@upgrade [대상]` | 버전 업그레이드 |
| `@migrate [대상]` | 마이그레이션 |
| `@cleanup` | 코드 정리 |
| `@dependency [작업]` | 의존성 관리 |
| `@backup` | 백업 |
| `@rollback` | 롤백 |
| `@hotfix [문제]` | 긴급 수정 |
| `@monitor [설정]` | 모니터링 |
| `@log-analyze` | 로그 분석 |
| `@cost-analyze` | 비용 분석 |
| `@scale [방향]` | 스케일링 |

## 🛠️ 개발 (5개)
| 명령어 | 설명 |
|--------|------|
| `@frontend [작업]` | UI 개발 |
| `@backend [작업]` | API 개발 |
| `@database [작업]` | DB 작업 |
| `@api-designer [설계]` | API 설계 |
| `@architect [요청]` | 시스템 설계 |

## ✅ 품질 (6개)
| 명령어 | 설명 |
|--------|------|
| `@reviewer [코드]` | 코드 리뷰 |
| `@tester [대상]` | 테스트 작성 |
| `@security [검토]` | 보안 검토 |
| `@optimizer [대상]` | 성능 최적화 |
| `@refactorer [코드]` | 리팩토링 |
| `@accessibility [검토]` | 접근성 검토 |

## 🚀 배포 (2개)
| 명령어 | 설명 |
|--------|------|
| `@deploy [작업]` | 배포 |
| `@devops [작업]` | CI/CD |

---

# 📚 스킬 전체 (70개)

## 🔌 MCP (5개) - NEW!
| 트리거 | 스킬 |
|--------|------|
| "MCP 설정", "MCP 설치" | mcp-setup |
| "MCP 목록" | mcp-list |
| "MCP 확인" | mcp-check |
| "MCP 추천" | mcp-recommend |
| "MCP 가이드" | mcp-guide |

## 🔧 자동 수정/검증 (12개)
| 트리거 | 스킬 |
|--------|------|
| "자동 수정" | auto-repair |
| "검증" | code-validation |
| "건강 체크" | project-health |
| "테스트 생성" | auto-test-gen |
| "문서 생성" | auto-documentation |
| "리팩토링" | auto-refactoring |
| "최적화" | auto-optimization |
| "보안 검사" | auto-security |
| "접근성 검사" | auto-accessibility |
| "SEO 검사" | auto-seo |
| "린트 수정" | lint-fix |
| "타입 수정" | type-fix |

## 🐛 오류 수정 (10개)
| 트리거 | 스킬 |
|--------|------|
| "에러" | error-debugger |
| "에러 찾아" | error-hunting |
| "에러 추적" | error-tracing |
| "타입 에러" | type-error-fix |
| "린트 에러" | lint-error-fix |
| "빌드 에러" | build-error-fix |
| "런타임 에러" | runtime-error-fix |
| "hydration" | hydration-fix |
| "CORS" | cors-fix |
| "메모리 누수" | memory-leak-fix |

## 🚀 핵심 (7개)
| 트리거 | 스킬 |
|--------|------|
| "풀스택" | fullstack-generator |
| "로그인" | auth-system |
| "CRUD" | crud-generator |
| "웹앱" | nextjs-webapp |
| "API 연결" | api-integrator |
| "컴포넌트 생성" | component-generator |
| "API 생성" | api-generator |

## 🎮 게임 (10개)
| 트리거 | 스킬 |
|--------|------|
| "게임 초기화" | game-init |
| "게임 시스템" | game-system |
| "게임 UI" | game-ui |
| "수익화" | game-monetize |
| "리더보드" | game-leaderboard |
| "게임 밸런싱" | game-balance |
| "웹 게임" | web-game |
| "유니티" | unity-game |
| "레벨 시스템" | game-mechanics |
| "멀티플레이어" | multiplayer |

## 📱 앱 (8개)
| 트리거 | 스킬 |
|--------|------|
| "PWA" | pwa-app |
| "모바일 앱" | mobile-app |
| "오프라인" | offline-mode |
| "푸시 알림" | push-notification |
| "딥링크" | deep-linking |
| "분석 통합" | analytics-integration |
| "크래시 리포트" | crash-reporting |
| "A/B 테스트" | ab-testing |

## 🔄 유지보수 (12개)
| 트리거 | 스킬 |
|--------|------|
| "유지보수" | maintenance |
| "업그레이드" | version-upgrade |
| "마이그레이션" | migration |
| "정리" | cleanup |
| "의존성" | dependency-management |
| "백업" | backup |
| "롤백" | rollback |
| "핫픽스" | hotfix |
| "모니터링" | monitoring |
| "로그 분석" | log-analysis |
| "비용 분석" | cost-analysis |
| "스케일링" | scaling |

## 💾 데이터베이스 (3개)
| 트리거 | 스킬 |
|--------|------|
| "DB 설계" | database-design |
| "DB 최적화" | database-optimizer |
| "실시간" | realtime |

## ⚙️ 기능 (5개)
| 트리거 | 스킬 |
|--------|------|
| "파일 업로드" | file-upload |
| "결제" | payment |
| "이메일" | email |
| "지도" | map |
| "다국어" | i18n |

---

# 🛠️ 기술 스택

```yaml
Framework: Next.js 14+ (App Router)
Language: TypeScript (strict)
Styling: Tailwind CSS
Animation: Framer Motion
State: Zustand
Form: React Hook Form + Zod
Database: Supabase
AI: Gemini API
Testing: Vitest + Playwright
PWA: Serwist
```

---

# 🔄 자동 실행 프로세스

## 새 프로젝트 생성
```
1. @fullstack [앱] 또는 @game-init [유형] 또는 @app-init [유형]
2. 자동으로 @mcp-setup 실행 (필요한 MCP 안내)
3. 자동으로 @autofix 실행
4. 에러 0개 확인
5. 완료 보고서 + MCP 설정 가이드
```

## 코드 수정 후
```
@autofix → 에러 0개까지 반복 → 완료
```

## 정기 유지보수
```
@healthcheck → @maintain → @autofix
```

---

# ⚡ 퀵 레퍼런스

## 🔥 핵심 명령어
```
@fullstack [앱]     # 완전한 앱 생성 + MCP 안내
@autofix            # 에러 0개까지 자동 수정
@mcp-setup          # MCP 자동 설정
@validate           # 전체 검증
```

## MCP
```
@mcp-setup          @mcp-install [MCP]
@mcp-list           @mcp-check
@mcp-recommend [유형]
```

## 자동 수정
```
@autofix      @fix-all      @fix-type
@fix-lint     @fix-build    @fix-runtime
```

## 원샷 빌드
```
@fullstack    @quickstart   @clone
@feature      @page         @component
```

## 게임
```
@game-init    @game-system  @game-ui
```

## 앱
```
@app-init     @app-feature  @app-analytics
```

---

# 📊 완료 보고서

```
═══════════════════════════════════════
       🎉 작업 완료 보고서
═══════════════════════════════════════
✅ 빌드: 성공
✅ 타입 체크: 에러 0개
✅ 린트: 에러 0개
✅ 테스트: 통과

🔌 권장 MCP:
- supabase-mcp (DB/Auth)
- @modelcontextprotocol/server-filesystem
- @modelcontextprotocol/server-github

📁 생성된 파일: [목록]

🚀 실행: npm run dev
═══════════════════════════════════════
```

---

**Claude Code는 이 설정을 자동으로 읽고 적용합니다.**

**🔥 핵심:**
- `@fullstack [앱]` → 완전한 앱 생성 + MCP 안내
- `@mcp-setup` → 필요한 MCP 자동 감지/설정
- `@autofix` → 에러 0개까지 자동 수정
