# wt-corps — 원텍 해외법인 ERP

이 저장소는 **한 파일 = 한 사이트**인 정적 웹앱(빌드 없음, HTML 하나에 CSS·JS 전부 내장)이다.

| 파일 | 사이트 | 담당 |
|---|---|---|
| `us.html` | 미국법인 종합 ERP | **본사 담당자(이 저장소의 담당)** |
| `th.html` | 태국법인 ERP | 오너 |
| `index.html` | us로 보내는 런처 | 오너 |

- 라이브 주소: https://wt-management.github.io/wt-corps/us.html
- 데이터는 코드가 아니라 Supabase에 있음(아래 참고). 이 저장소를 고쳐도 데이터는 안 지워진다.

---

## ⚠️ 반드시 지킬 4가지

1. **main에 직접 push 금지 — 항상 PR로.**
   ```
   git switch -c fix-무엇을-고침      # 새 브랜치
   # ...수정...
   git commit -am "무엇을 왜 고쳤는지"
   git push -u origin fix-무엇을-고침
   ```
   → GitHub에서 Pull Request 생성 → **자동검사(초록불)** 확인 → **Merge** 클릭.
   머지되면 몇 분 뒤 라이브에 자동 반영된다(직접 배포할 것 없음).

2. **`us.html`만 수정한다.** `th.html` · `index.html` · `.github/` · `CLAUDE.md`는 오너 승인 영역이니 건드리지 말 것.
   - us.html은 th.html과 코드가 이미 갈라져 있음 → "th를 참고해 다시 만들기" 금지. us.html을 직접 고친다.

3. **비밀키(관리자 키) 커밋 금지.** `sb_secret_...` 또는 service_role 키는 코드·커밋에 절대 넣지 말 것.
   - 사이트에 이미 들어있는 `sb_publishable_...` 키는 공개용이라 정상. 그대로 두면 됨.
   - PR 자동검사가 관리자 키를 감지하면 머지를 막는다.

4. **공용 셸은 건드리지 말 것.** 로그인 · 권한(loadPerm) · 자동 로그아웃 · 사이트 이동 · 비밀번호 변경 관련 코드는 전 사이트 공통이라 오너 영역이다.

---

## 데이터 (Supabase)

- 저장 위치: `cons_cache` 테이블, **key = `corp_us_erp`** (JSON 블롭 하나)
- 블롭 구조: `{ rate, sales, orders, items, moves, funds, clients, deals, acts, tasks, equipment, shipments, targets, accounts, snapshots }`
- **주의 — 마지막 저장이 이김(last-writer-wins):** 저장 시 블롭 전체를 덮어쓴다. 여러 명이 동시에 편집하면 나중 저장이 앞 저장을 지울 수 있으니, 큰 변경 전엔 팀에 알린다.
- **로컬에서 안전하게 테스트:** `us.html`을 localhost로 열면 LOCAL 모드가 되어 **저장이 안 되고 샘플 데이터로만** 동작한다. 마음껏 실험해도 실데이터는 안 바뀐다.

---

## 수정한 뒤 반드시 확인

- 브라우저에서 실제로 열어 동작 확인, **콘솔 에러 0개**
- 한국어 / English 토글 둘 다 안 깨지는지(us.html은 자동번역이 내장돼 있음)
- 그 다음 커밋 → 푸시 → PR

## 자주 하는 작업 위치 (us.html 안에서 검색)

- 제목·라벨·색상 → 해당 텍스트나 CSS 변수(`--...`)를 검색해 수정
- 새 메뉴(뷰) 추가 → 네 곳을 함께 고쳐야 함: ① nav 항목 ② `VIEWS_KEYS` ③ render 분기(dispatch) ④ 뷰 함수
- KPI·카드 추가 → 해당 뷰 함수(예: 대시보드는 `vDash`) 안

막히면 오너에게 물어보고, 큰 구조 변경은 PR로 올려 오너 리뷰를 받는다.
