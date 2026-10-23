# oh-my-opencode Agent 설계 및 등록 튜토리얼

이 문서는 새 agent를 설계하고, 프롬프트를 작성하고, OpenCode와 oh-my-opencode에 등록하고, 다른 agent가 실제로 호출할 수 있는지 검증하는 전체 과정을 설명한다.

예제에서는 `database-reviewer`라는 읽기 전용 데이터베이스 검토 agent를 만든다. 다른 역할의 agent를 만들 때는 이름, 책임, 프롬프트, 권한, 모델 fallback, 라우팅 metadata만 바꾸면 된다.

> 적용 범위: 이 문서는 현재 워크스페이스의 `oh-my-opencode` 3.10.0 계열 `src/` 구조를 기준으로 한다. 최신 upstream은 `packages/omo-opencode/` 중심의 모노레포로 이동했으므로, upstream 최신 브랜치에서 작업할 때는 파일 경로를 다시 확인해야 한다.

## 빠른 사용법

- 역할 프롬프트부터 시험하려면 Part A만 진행한다.
- 포크의 정식 built-in agent로 만들려면 Part B까지 진행한다.
- agent 사이의 입력 계약을 설계하려면 Part C를 참고한다.
- 구현 완료 여부는 Part D와 Part E로 검증한다.
- 다른 agent 생성을 요청할 때는 Part H의 양식을 복사해 채운다.

## 완성 후 갖게 되는 구조

```text
사용자 요청
    │
    ▼
Sisyphus / Hephaestus / Atlas
    │  AgentPromptMetadata를 보고 담당 agent 선택
    │
    ├─ task(subagent_type="database-reviewer", prompt="...")
    │
    ▼
database-reviewer 전용 자식 세션
    ├─ 고정 역할: AgentConfig.prompt
    ├─ 추가 지침: category/skill system content
    ├─ 현재 업무: task의 prompt
    └─ 권한: read 허용, edit/write/task 차단
    │
    ▼
검토 결과가 task 결과로 부모 agent에게 반환
```

## 1. 먼저 확장 방식을 선택한다

Agent를 추가하는 방법은 두 가지다.

| 방식 | 위치 | 적합한 경우 | 장점 | 한계 |
|---|---|---|---|---|
| OpenCode 네이티브 agent | `.opencode/agents/<name>.md` | 프로젝트 전용 agent, 빠른 실험 | 소스 빌드 불필요, 업그레이드에 안전 | 이 checkout에서는 OMO 조정자에 자동 소개되지 않을 수 있음 |
| oh-my-opencode built-in agent | `src/agents/`와 registry | 포크에 기본 탑재하고 자동 라우팅 | metadata, 모델 fallback, override, 권한을 완전히 통합 | 수정 지점과 테스트가 많고 upstream 이식 비용이 발생 |

권장 순서는 다음과 같다.

1. 네이티브 Markdown agent로 역할과 출력 품질을 먼저 검증한다.
2. 반복 사용하면서 책임 경계와 라우팅 조건을 다듬는다.
3. 다른 사용자에게 배포하거나 Sisyphus 자동 라우팅이 필요해지면 built-in으로 승격한다.

OpenCode 네이티브 agent 형식은 [공식 Agents 문서](https://opencode.ai/docs/agents)를 기준으로 한다.

## 2. Agent를 코드보다 먼저 설계한다

좋은 agent는 "무엇이든 잘하는 또 하나의 코딩 agent"가 아니라, 호출 조건과 종료 조건이 명확한 specialist다.

다음 설계표를 먼저 채운다.

```yaml
key: database-reviewer
display_name: Database Reviewer
one_line_responsibility: 스키마, migration, SQL, index 변경의 위험을 근거와 함께 검토한다.
mode: subagent

use_when:
  - 데이터베이스 스키마를 변경할 때
  - migration의 롤백·락·데이터 손실 위험을 확인할 때
  - 쿼리와 index의 성능 문제를 검토할 때

avoid_when:
  - 파일 위치만 찾으면 되는 단순 탐색
  - 데이터베이스와 무관한 일반 코드 리뷰
  - 실제 migration 구현이 필요한 경우

input_contract:
  - 검토 목표
  - 대상 파일 또는 변경 diff
  - 사용하는 DBMS와 버전
  - 운영 제약과 예상 데이터 규모

output_contract:
  - 결론
  - 근거가 있는 발견 사항
  - 심각도와 영향 범위
  - 최소 수정안
  - 검증 방법

permissions:
  allow:
    - read
    - grep
    - glob
  deny:
    - write
    - edit
    - apply_patch
    - bash
    - task
    - call_omo_agent

model_profile:
  preferred: 높은 추론 정확도
  latency: 중간
  cost: 중간 또는 높음

recursion: 금지
success_condition: 파일과 코드 근거가 포함된 실행 가능한 검토 결과를 반환한다.
```

### 설계할 때 지켜야 할 기준

- `description`은 홍보 문구가 아니라 조정자가 읽는 라우팅 규칙이어야 한다.
- `useWhen`과 `avoidWhen`을 함께 적어 역할 중복을 줄인다.
- 자식 agent는 부모의 전체 대화를 자동으로 받는다고 가정하지 않는다.
- 출력 형식은 부모 agent가 그대로 소비할 수 있을 만큼 명확해야 한다.
- 필요하지 않은 쓰기·재위임 권한은 차단한다.
- agent 이름은 소문자 kebab-case로 정한다.
- 하나의 agent가 조사, 설계, 구현, 검증을 모두 소유하게 만들지 않는다.

## 3. 프롬프트의 네 가지 역할을 구분한다

Agent를 추가할 때 다음 필드들을 혼동하기 쉽다.

| 필드 | 읽는 주체 | 목적 |
|---|---|---|
| `description` | OpenCode registry와 조정자 | 이 agent가 무엇을 담당하는지 짧게 설명 |
| `AgentPromptMetadata` | Sisyphus, Hephaestus, Atlas | 언제 호출하고 언제 피할지 설명 |
| `AgentConfig.prompt` | 선택된 자식 agent | 정체성, 워크플로, 출력 형식, 제약을 정의하는 고정 시스템 프롬프트 |
| `task(..., prompt)` | 선택된 자식 agent | 이번 호출에서 처리할 구체적인 업무와 문맥 |

실행 시 자식 agent가 받는 문맥은 개념적으로 다음과 같이 조립된다.

```text
AgentConfig.prompt
  + category prompt_append와 load_skills로 만든 추가 system content
  + task 호출의 prompt
  + 같은 session_id로 재개한 경우 기존 자식 세션 기록
```

`parentID`는 세션 계층과 알림 대상을 연결하지만 부모 대화 전체를 자식 세션으로 복사하지 않는다. 따라서 부모가 작성하는 `task.prompt`에 필요한 문맥을 명시해야 한다.

---

# Part A. 네이티브 Markdown agent로 먼저 검증하기

## 4. 프로젝트 agent 파일을 만든다

프로젝트 루트에 다음 파일을 만든다.

```text
.opencode/agents/database-reviewer.md
```

내용:

```md
---
description: Reviews database schemas, migrations, SQL, and indexes for correctness, safety, and performance. Use for database-specific review, not implementation.
mode: subagent
temperature: 0.1
permission:
  write: deny
  edit: deny
  apply_patch: deny
  bash: deny
  task: deny
  call_omo_agent: deny
---

You are a database review specialist.

## Mission

Review database schemas, migrations, queries, and indexes. Find concrete correctness, data-loss, locking, rollback, and performance risks. Do not implement changes.

## Working method

1. Identify the database engine, affected schema objects, and deployment assumptions.
2. Read the referenced files and relevant surrounding code.
3. Separate verified findings from assumptions and missing information.
4. Rank findings as critical, high, medium, or low.
5. Recommend the smallest safe correction and a way to verify it.

## Output contract

Return:

1. Bottom line
2. Findings with file and code evidence
3. Operational risks
4. Recommended changes
5. Verification plan

If no material issue exists, say so explicitly and list what was checked.

## Constraints

- Stay read-only.
- Do not delegate to another agent.
- Do not invent schema size, database version, query frequency, or production topology.
- Ask for missing information only when it materially changes the conclusion.
```

전역으로 사용하려면 같은 파일을 다음 위치에 둔다.

```text
~/.config/opencode/agents/database-reviewer.md
```

## 5. 네이티브 agent를 검증한다

등록 여부를 확인한다.

```bash
opencode agent list
```

다음 두 호출을 각각 확인한다.

```text
@database-reviewer 이 migration의 위험을 검토해줘: db/migrations/0042_add_status.sql
```

```text
task(
  subagent_type="database-reviewer",
  load_skills=[],
  description="Review migration safety",
  prompt="Review db/migrations/0042_add_status.sql. Focus on locking, rollback, data loss, and index impact. Cite exact file evidence.",
  run_in_background=false
)
```

검증 기준:

- `opencode agent list`에 이름이 보인다.
- 직접 호출이 unknown agent 오류 없이 실행된다.
- 쓰기 도구를 사용하지 않는다.
- 답변이 프롬프트의 출력 계약을 따른다.
- 데이터베이스와 무관한 요청에는 사용하지 않아야 한다.

## 6. OMO 조정자에게 임시 라우팅 규칙을 알려준다

현재 checkout에는 custom agent 요약을 동적 라우팅 metadata로 바꾸려는 코드가 있지만, 연결부는 요약 배열 대신 SDK client 객체를 전달한다. 따라서 네이티브 agent가 등록되어도 Sisyphus가 자동으로 그 존재를 학습한다고 가정하면 안 된다.

직접 호출하거나 프로젝트 `.opencode/oh-my-opencode.jsonc`에 임시 라우팅 규칙을 추가한다.

```jsonc
{
  "agents": {
    "sisyphus": {
      "prompt_append": "When a request concerns database schemas, migrations, SQL correctness, indexes, locking, rollback, or data-loss risk, delegate a focused read-only review to subagent_type=\"database-reviewer\" before finalizing the answer."
    }
  }
}
```

다음 세 조건을 만족하면 built-in 승격을 고려한다.

1. 최소 여러 실제 작업에서 역할 프롬프트가 안정적으로 동작한다.
2. Explore, Oracle, 일반 category agent와 책임 경계가 명확하다.
3. 사용자가 명시하지 않아도 조정자가 자동 선택해야 할 가치가 있다.

---

# Part B. oh-my-opencode built-in agent로 등록하기

## 7. 수정할 파일을 파악한다

일반 specialist agent를 추가할 때 수정할 지점은 다음과 같다.

| 필수 여부 | 파일 | 목적 |
|---|---|---|
| 필수 | `src/agents/database-reviewer.ts` | factory, 시스템 프롬프트, 라우팅 metadata |
| 필수 | `src/agents/types.ts` | `BuiltinAgentName` 타입 등록 |
| 필수 | `src/agents/builtin-agents.ts` | factory와 metadata registry 등록 |
| 필수 | `src/config/schema/agent-names.ts` | 설정 schema의 agent 이름 등록 |
| 필수 | `src/config/schema/agent-overrides.ts` | `agents.database-reviewer` override 허용 |
| 필수 | `src/shared/model-requirements.ts` | 모델 fallback chain 정의 |
| 권장 | `src/shared/agent-tool-restrictions.ts` | 위임 세션에서 도구 권한을 다시 강제 |
| 선택 | `src/shared/agent-display-names.ts` | UI 표시 이름 변경 |
| 선택 | `src/plugin-handlers/agent-priority-order.ts` | primary orchestrator로 상단 배치할 때만 사용 |
| 필수 | co-located test와 `src/config/schema.test.ts` | factory, routing, schema 검증 |
| 필수 | `assets/oh-my-opencode.schema.json` | `bun run build:schema`로 재생성 |

Prometheus, Sisyphus-Junior, Atlas처럼 생성 과정이 특수한 agent를 만들려는 것이 아니라면 별도 config builder를 만들 필요가 없다. 먼저 `oracle.ts`, `explore.ts` 같은 일반 factory 패턴을 따른다.

## 8. Agent factory를 작성한다

`src/agents/database-reviewer.ts`를 만든다.

```ts
import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentMode, AgentPromptMetadata } from "./types"
import { createAgentToolRestrictions } from "../shared/permission-compat"

const MODE: AgentMode = "subagent"

export const DATABASE_REVIEWER_PROMPT_METADATA: AgentPromptMetadata = {
  category: "specialist",
  cost: "EXPENSIVE",
  promptAlias: "Database Reviewer",
  triggers: [
    {
      domain: "Database review",
      trigger: "Schema, migration, SQL, index, locking, rollback, or data-loss analysis",
    },
  ],
  useWhen: [
    "Reviewing schema changes and migrations",
    "Investigating query or index performance",
    "Checking locking, rollback, and data-loss risks",
  ],
  avoidWhen: [
    "A single file or symbol only needs to be located",
    "The task is unrelated to databases",
    "The caller needs implementation rather than review",
  ],
  keyTrigger: "Database migration or schema change mentioned → consult `database-reviewer`",
}

const DATABASE_REVIEWER_SYSTEM_PROMPT = `You are a database review specialist operating as a read-only consultant inside an AI-assisted development environment.

<mission>
Review schemas, migrations, SQL queries, indexes, and data-access assumptions. Identify concrete correctness, data-loss, locking, rollback, compatibility, and performance risks.
</mission>

<input_contract>
- You receive a focused delegation prompt, not the caller's full conversation.
- Use repository evidence to recover missing code context.
- Never invent database versions, row counts, traffic, deployment topology, or operational constraints.
- State any assumption that materially affects the conclusion.
</input_contract>

<workflow>
1. Identify the database engine and affected schema objects from available evidence.
2. Read the target files and relevant callers, models, migrations, and tests.
3. Check forward migration, rollback, locking, data preservation, compatibility, and query-plan impact.
4. Separate verified defects from risks that require production facts.
5. Recommend the smallest safe correction and a concrete verification method.
</workflow>

<output_contract>
Return the following sections:

1. Bottom line
2. Findings, ordered by severity
3. Evidence with exact file references
4. Recommended corrections
5. Verification plan

If there is no material issue, say so explicitly and list what was checked.
</output_contract>

<constraints>
- Stay read-only.
- Do not modify files.
- Do not delegate to another agent.
- Do not turn uncertain operational assumptions into facts.
- Stay within the requested database scope.
</constraints>`

export function createDatabaseReviewerAgent(model: string): AgentConfig {
  const restrictions = createAgentToolRestrictions([
    "write",
    "edit",
    "apply_patch",
    "bash",
    "task",
    "call_omo_agent",
  ])

  return {
    description:
      "Read-only database review specialist for schemas, migrations, SQL, indexes, locking, rollback, data-loss risk, and query performance. Use for review, not implementation. (Database Reviewer - OhMyOpenCode)",
    mode: MODE,
    model,
    temperature: 0.1,
    ...restrictions,
    prompt: DATABASE_REVIEWER_SYSTEM_PROMPT,
  } as AgentConfig
}

createDatabaseReviewerAgent.mode = MODE
```

### Factory 작성 기준

- `mode`는 factory 결과와 정적 property 양쪽에 둔다.
- 조정용 정보는 `AgentPromptMetadata`, 실행용 정보는 `SYSTEM_PROMPT`에 둔다.
- `description` 첫 문장만 잘려서 표에 사용될 수 있으므로 첫 문장에 책임을 담는다.
- 도구 권한은 `permission` 형식을 사용하고 legacy `tools` 형식은 새 코드에서 사용하지 않는다.
- 단일 specialist라면 먼저 하나의 모델 중립적 prompt로 시작한다.
- 모델군별 행동 차이가 실제 테스트에서 확인된 뒤에만 `isGptModel()` 또는 `isGeminiModel()` 분기를 추가한다.

## 9. TypeScript agent 이름에 등록한다

`src/agents/types.ts`의 `BuiltinAgentName`에 이름을 추가한다.

```ts
export type BuiltinAgentName =
  | "sisyphus"
  | "hephaestus"
  | "oracle"
  | "librarian"
  | "explore"
  | "multimodal-looker"
  | "metis"
  | "momus"
  | "atlas"
  | "database-reviewer"
```

`OverridableAgentName`은 `BuiltinAgentName`을 포함하므로 별도 union을 추가할 필요가 없다.

## 10. Factory와 routing metadata를 등록한다

`src/agents/builtin-agents.ts`에 import를 추가한다.

```ts
import {
  createDatabaseReviewerAgent,
  DATABASE_REVIEWER_PROMPT_METADATA,
} from "./database-reviewer"
```

`agentSources`에 factory를 등록한다.

```ts
const agentSources: Record<BuiltinAgentName, AgentSource> = {
  // 기존 agent들
  "database-reviewer": createDatabaseReviewerAgent,
}
```

`agentMetadata`에도 등록한다.

```ts
const agentMetadata: Partial<Record<BuiltinAgentName, AgentPromptMetadata>> = {
  // 기존 metadata
  "database-reviewer": DATABASE_REVIEWER_PROMPT_METADATA,
}
```

두 registry의 의미는 다르다.

- `agentSources`만 등록하면 직접 호출 가능한 agent는 만들어진다.
- `agentMetadata`까지 등록해야 Sisyphus, Hephaestus, Atlas의 동적 프롬프트에 호출 조건이 들어간다.

일반 specialist는 `collectPendingBuiltinAgents()`가 자동으로 모델을 선택하고 override를 적용하고 `availableAgents`에 추가한다. 이 흐름을 우회하는 별도 builder를 만들지 않는다.

## 11. 설정 schema에 등록한다

### 11.1 Agent 이름 schema

`src/config/schema/agent-names.ts`의 두 enum에 추가한다.

```ts
export const BuiltinAgentNameSchema = z.enum([
  // 기존 이름들
  "database-reviewer",
])

export const OverridableAgentNameSchema = z.enum([
  // 기존 이름들
  "database-reviewer",
])
```

### 11.2 Override schema

`src/config/schema/agent-overrides.ts`는 닫힌 object schema다. 이름을 명시하지 않으면 사용자가 설정한 override가 제거될 수 있다.

```ts
export const AgentOverridesSchema = z.object({
  // 기존 agent들
  "database-reviewer": AgentOverrideConfigSchema.optional(),
})
```

이후 사용자는 다음처럼 설정할 수 있다.

```jsonc
{
  "agents": {
    "database-reviewer": {
      "model": "openai/gpt-5.2",
      "variant": "high",
      "temperature": 0.1,
      "prompt_append": "Treat production migrations with unknown table size as requiring an explicit lock-risk warning."
    }
  }
}
```

`prompt`는 기본 prompt를 교체하고, `prompt_append`는 기본 prompt 뒤에 내용을 붙인다. 기본 역할을 유지하면서 프로젝트 규칙만 추가하려면 `prompt_append`를 사용한다.

## 12. 모델 fallback chain을 정의한다

`src/shared/model-requirements.ts`의 `AGENT_MODEL_REQUIREMENTS`에 추가한다.

```ts
"database-reviewer": {
  fallbackChain: [
    {
      providers: ["openai", "github-copilot", "opencode"],
      model: "gpt-5.2",
      variant: "high",
    },
    {
      providers: ["anthropic", "github-copilot", "opencode"],
      model: "claude-opus-4-6",
      variant: "max",
    },
    {
      providers: ["google", "github-copilot", "opencode"],
      model: "gemini-3.1-pro",
      variant: "high",
    },
  ],
},
```

모델 선택 기준:

- 검색·분류 agent는 빠르고 저렴한 모델을 우선한다.
- 아키텍처·보안·데이터 안정성 review agent는 추론 정확도를 우선한다.
- 긴 절차형 prompt는 지시 준수형 모델, 짧은 원칙형 prompt는 자율 추론형 모델과 잘 맞는지 실제로 시험한다.
- `requiresModel`은 특정 모델이 없으면 agent 전체를 숨겨야 할 때만 사용한다.
- 일반 fallback이 가능하면 `requiresModel`을 넣지 않는다.
- 연결되지 않은 provider만 있는 fallback chain을 만들면 agent가 registry에서 빠질 수 있다.

## 13. 위임 세션의 도구 제한을 추가한다

Factory의 `permission`은 agent 설정 자체를 보호한다. OMO의 `task` 실행기는 자식 세션에 별도의 `tools` map도 전달하므로, 안전상 중요한 제한은 `src/shared/agent-tool-restrictions.ts`에도 추가한다.

```ts
const AGENT_RESTRICTIONS: Record<string, Record<string, boolean>> = {
  // 기존 agent들
  "database-reviewer": {
    write: false,
    edit: false,
    apply_patch: false,
    bash: false,
    task: false,
    call_omo_agent: false,
  },
}
```

두 계층을 함께 관리하는 이유:

```text
AgentConfig.permission
  └─ OpenCode registry에서 직접 선택하거나 @agent로 호출할 때 적용

session.prompt(... tools)
  └─ OMO task가 만든 동기·백그라운드 자식 세션에서 적용
```

읽기 전용 agent를 만들면서 factory에만 제한을 추가하고 위임 세션 제한을 빠뜨리지 않는다.

## 14. 표시 이름과 우선순위를 결정한다

Config key를 그대로 노출해도 된다면 이 단계는 생략한다.

UI에 `Database Reviewer`로 보이게 하려면 `src/shared/agent-display-names.ts`에 추가한다.

```ts
export const AGENT_DISPLAY_NAMES: Record<string, string> = {
  // 기존 이름들
  "database-reviewer": "Database Reviewer",
}
```

일반 subagent는 `CORE_AGENT_ORDER`에 넣지 않는다. 이 순서는 Sisyphus, Hephaestus, Prometheus, Atlas 같은 상위 primary agent를 UI 상단에 배치하는 용도다.

표시 이름을 사용하면 다음 두 값을 구분한다.

```text
config key:    database-reviewer
display name:  Database Reviewer
```

Task resolver는 config key와 display name을 정규화하지만, 설정 파일과 코드 registry에는 항상 config key를 사용한다.

## 15. 불필요한 export를 추가하지 않는다

일반 built-in agent는 `builtin-agents.ts`가 파일에서 직접 import하므로 `src/index.ts`에 export할 필요가 없다.

특히 main `src/index.ts`에 factory 함수를 export하면 안 된다. OpenCode는 main module의 export를 plugin instance로 취급할 수 있으므로, agent factory는 내부 module에만 둔다.

---

# Part C. Agent 사이의 작업 프롬프트 설계

## 16. 부모 agent가 보내는 prompt 계약을 정한다

좋은 시스템 프롬프트만으로는 충분하지 않다. 자식 agent는 부모의 전체 문맥을 자동으로 보지 않으므로 부모가 구체적인 delegation prompt를 작성해야 한다.

권장 형식:

```text
Context:
- 왜 이 검토가 필요한가
- 관련 기술과 실행 환경

Goal:
- 이번 호출에서 결정해야 할 한 가지 결과

Scope:
- 읽어야 할 파일
- 포함할 문제
- 제외할 문제

Known facts:
- 이미 확인된 사실
- 사용자가 제공한 제약

Deliverable:
- 원하는 출력 형식
- 반드시 포함할 근거

Constraints:
- 수정 금지
- 추측 금지
- 시간·범위 제한
```

예:

```ts
task(
  subagent_type="database-reviewer",
  load_skills=[],
  description="Review status migration",
  prompt=`Context:
- PostgreSQL migration will run during a rolling deployment.
- The application currently reads users.status as nullable.

Goal:
- Decide whether migration 0042 is safe to deploy without downtime.

Scope:
- db/migrations/0042_add_status.sql
- src/users/repository.ts
- Relevant migration tests

Known facts:
- Exact production row count is unknown.
- No maintenance window is planned.

Deliverable:
- Severity-ordered findings with exact file evidence
- Smallest safe correction
- Verification commands or queries

Constraints:
- Stay read-only.
- Do not assume table size or PostgreSQL version.`,
  run_in_background=false,
)
```

## 17. 동기, 백그라운드, continuation을 선택한다

| 실행 방식 | 사용 시점 | 결과 전달 방식 |
|---|---|---|
| `run_in_background=false` | 결과가 있어야 다음 결정을 할 수 있음 | 자식 완료 후 답변이 즉시 `task` 결과로 반환 |
| `run_in_background=true` | 서로 독립적인 조사 여러 개를 병렬 실행 | 완료 알림 후 `background_output(task_id)`로 회수 |
| `session_id=<기존 id>` | 같은 agent에게 후속 질문 | 기존 자식 세션의 문맥을 유지한 채 이어서 실행 |

Agent끼리 직접 자유롭게 채팅하는 구조는 아니다. 기본 통신은 다음 star topology다.

```text
               ┌─ Explore child session
               │
Orchestrator ───┼─ Database Reviewer child session
               │
               └─ Oracle child session
```

한 specialist의 결과를 다른 specialist에게 전달하려면 조정자가 첫 결과를 두 번째 `task.prompt`에 요약해서 넣어야 한다. 동일 specialist와 대화를 이어갈 때만 `session_id`를 재사용한다.

재귀 위임이 꼭 필요하지 않다면 `task`와 `call_omo_agent`를 차단한다. 재귀는 비용, 컨텍스트 손실, 중복 작업, 무한 위임 위험을 높인다.

---

# Part D. 테스트 작성하기

## 18. Factory와 metadata 단위 테스트를 작성한다

`src/agents/database-reviewer.test.ts`를 만든다.

```ts
import { describe, expect, test } from "bun:test"
import {
  createDatabaseReviewerAgent,
  DATABASE_REVIEWER_PROMPT_METADATA,
} from "./database-reviewer"
import { buildDelegationTable } from "./dynamic-agent-prompt-builder"

describe("database-reviewer agent", () => {
  test("#given a model #when creating the agent #then returns a read-only subagent", () => {
    // #given
    const model = "openai/gpt-5.2"

    // #when
    const agent = createDatabaseReviewerAgent(model)
    const permission = agent.permission as Record<string, string>

    // #then
    expect(agent.mode).toBe("subagent")
    expect(agent.model).toBe(model)
    expect(agent.temperature).toBe(0.1)
    expect(agent.description).toContain("database review")
    expect(agent.prompt).toContain("database review specialist")
    expect(permission.write).toBe("deny")
    expect(permission.edit).toBe("deny")
    expect(permission.bash).toBe("deny")
    expect(permission.task).toBe("deny")
  })

  test("#given routing metadata #when building delegation table #then exposes database trigger", () => {
    // #given
    const agents = [
      {
        name: "database-reviewer",
        description: "Read-only database review specialist.",
        metadata: DATABASE_REVIEWER_PROMPT_METADATA,
      },
    ]

    // #when
    const table = buildDelegationTable(agents)

    // #then
    expect(table).toContain("Database review")
    expect(table).toContain("database-reviewer")
    expect(table).toContain("migration")
  })
})
```

이 테스트는 다음 회귀를 잡는다.

- mode가 실수로 primary가 되는 문제
- 읽기 전용 권한이 사라지는 문제
- 시스템 프롬프트가 비어 있는 문제
- metadata를 만들었지만 delegation table에서 쓸 수 없는 문제

## 19. Config schema 테스트를 추가한다

`src/config/schema.test.ts`에 다음 케이스를 추가한다.

```ts
test("accepts database-reviewer agent overrides", () => {
  // #given
  const config = {
    agents: {
      "database-reviewer": {
        model: "openai/gpt-5.2",
        prompt_append: "Project-specific database rules",
      },
    },
  }

  // #when
  const result = OhMyOpenCodeConfigSchema.safeParse(config)

  // #then
  expect(result.success).toBe(true)
  if (result.success) {
    expect(result.data.agents?.["database-reviewer"]?.model).toBe(
      "openai/gpt-5.2",
    )
    expect(result.data.agents?.["database-reviewer"]?.prompt_append).toBe(
      "Project-specific database rules",
    )
  }
})
```

성공 여부만 검사하면 부족하다. Zod object가 모르는 key를 제거하고도 parse에 성공할 수 있으므로, 반환 데이터에 agent override가 실제로 남아 있는지 확인한다.

## 20. Registry 통합 테스트를 추가한다

`createBuiltinAgents()` 수준에서 다음 두 결과를 확인한다.

1. 반환된 agent map에 `database-reviewer`가 존재한다.
2. Sisyphus prompt에 `database-reviewer`와 trigger가 들어간다.

기존 `src/agents/utils.test.ts`의 `fetchAvailableModels` mock 패턴을 사용한다.

```ts
test("includes database-reviewer in builtins and orchestrator prompt", async () => {
  // #given
  const fetchSpy = spyOn(shared, "fetchAvailableModels").mockResolvedValue(
    new Set([
      "anthropic/claude-opus-4-6",
      "openai/gpt-5.2",
    ]),
  )

  try {
    // #when
    const agents = await createBuiltinAgents(
      [],
      {},
      undefined,
      "anthropic/claude-opus-4-6",
    )

    // #then
    expect(agents["database-reviewer"]).toBeDefined()
    expect(agents.sisyphus.prompt).toContain("database-reviewer")
    expect(agents.sisyphus.prompt).toContain("Database review")
  } finally {
    fetchSpy.mockRestore()
  }
})
```

이 snippet을 사용할 때 파일 상단에 기존 패턴대로 다음 import가 있어야 한다.

```ts
import { expect, spyOn, test } from "bun:test"
import * as shared from "../shared"
import { createBuiltinAgents } from "./builtin-agents"
```

## 21. 검증 명령을 실행한다

빠른 피드백부터 넓은 검증 순서로 실행한다.

```bash
bun test src/agents/database-reviewer.test.ts
bun test src/agents/utils.test.ts
bun test src/config/schema.test.ts
bun run typecheck
bun run build:schema
bun run build
```

마지막으로 전체 suite를 실행한다.

```bash
bun test
```

Schema 생성 후 변경을 확인한다.

```bash
git diff -- assets/oh-my-opencode.schema.json
```

`bun run build`도 schema를 생성하지만, `build:schema`를 별도로 실행하면 schema 문제를 더 빠르게 분리할 수 있다.

---

# Part E. 실제 OpenCode 런타임에서 검증하기

## 22. 빌드한 코드가 실제로 로드되는지 확인한다

`bun run build`는 `dist/`를 만들 뿐, OpenCode가 cache에 설치한 npm plugin을 자동으로 교체하지 않는다. 런타임 테스트에서 가장 흔한 실수는 로컬 소스를 수정하고도 전역 cache의 이전 plugin을 실행하는 것이다.

OpenCode는 프로젝트 `.opencode/plugins/` 또는 전역 config의 `plugins/`에 있는 로컬 JavaScript/TypeScript plugin을 자동으로 로드한다. 자세한 로딩 규칙은 [OpenCode Plugins 공식 문서](https://opencode.ai/docs/plugins/)를 참고한다.

안전한 개발 프로필의 예:

```bash
bun run build

OMO_AGENT_DEV_CONFIG="$(mktemp -d)"
mkdir -p "$OMO_AGENT_DEV_CONFIG/plugins"
ln -s "$(pwd)/dist/index.js" "$OMO_AGENT_DEV_CONFIG/plugins/oh-my-opencode-local.js"

OPENCODE_CONFIG_DIR="$OMO_AGENT_DEV_CONFIG" opencode agent list
```

주의사항:

- 같은 프로필에 npm `oh-my-opencode`와 로컬 bundle을 동시에 등록하지 않는다.
- OpenCode는 유사한 이름의 npm plugin과 로컬 plugin을 별도로 모두 로드할 수 있다.
- provider와 model 설정이 필요한 테스트라면 격리된 개발 config에 필요한 설정만 복사한다.
- agent가 보이지 않으면 `/tmp/oh-my-opencode.log`의 `agents loaded` 로그를 확인한다.

등록 확인:

```bash
OPENCODE_CONFIG_DIR="$OMO_AGENT_DEV_CONFIG" opencode agent list | rg -i "database reviewer|database-reviewer"
```

## 23. 직접 호출과 자동 라우팅을 따로 검증한다

### 직접 호출

다음 요청은 deterministic한 등록 검증이다.

```text
Use the database-reviewer subagent to review db/migrations/0042_add_status.sql. Stay read-only and return exact evidence.
```

확인할 것:

- task metadata의 agent가 `database-reviewer` 또는 display name이다.
- 자식 세션이 생성된다.
- 결과가 부모에게 돌아온다.
- 금지된 쓰기 도구를 사용하지 않는다.

### 자동 라우팅

다음 요청에서는 agent 이름을 말하지 않는다.

```text
이 migration을 무중단 배포할 수 있는지 locking, rollback, data-loss 관점에서 검토해줘.
```

확인할 것:

- Sisyphus가 database 전문 검토가 필요하다고 분류한다.
- `task(subagent_type="database-reviewer", ...)`를 선택한다.
- delegation prompt에 대상 파일과 알려진 운영 제약이 들어간다.

직접 호출은 성공하지만 자동 라우팅이 실패하면 factory 등록 문제가 아니라 metadata 또는 조정자 prompt 문제다.

---

# Part F. 자주 발생하는 문제

## 24. 문제 해결표

| 증상 | 가장 가능성 높은 원인 | 확인할 곳 |
|---|---|---|
| `opencode agent list`에 없음 | factory registry 누락, 사용 가능한 fallback model 없음, 다른 plugin bundle 실행 중 | `builtin-agents.ts`, `model-requirements.ts`, plugin log |
| `Unknown agent` | 이름 불일치, display name 변환 문제, mode가 primary | `types.ts`, `agent-display-names.ts`, `subagent-resolver.ts` |
| 직접 호출은 되지만 자동 선택 안 됨 | `agentMetadata` 누락 또는 trigger가 모호함 | `builtin-agents.ts`, metadata의 `triggers/useWhen` |
| config override가 무시됨 | `AgentOverridesSchema`에 key 미등록 | `agent-overrides.ts`, schema test |
| agent가 파일을 수정함 | factory permission 또는 delegated-session restriction 누락 | agent factory, `agent-tool-restrictions.ts` |
| 자식이 문맥을 모름 | 부모 전체 대화가 자동 전달된다고 가정함 | `task.prompt`에 Context, Scope, Known facts 추가 |
| agent가 계속 다른 agent를 호출함 | `task` 또는 `call_omo_agent` 권한이 열림 | 두 권한 계층 모두 차단 |
| background 결과가 부모에게 바로 안 보임 | 완료 알림과 실제 결과 회수가 분리됨 | `background_output(task_id=...)` 사용 |
| 수정했는데 행동이 그대로임 | 전역 npm/cache plugin을 실행 중 | 로컬 plugin 개발 프로필 확인 |
| agent가 두 번 나타남 | npm plugin과 local plugin을 동시에 로드 | active `opencode.json`과 local plugin directory 확인 |

## 25. 현재 checkout의 custom-agent awareness 주의점

다음 코드는 custom agent 설명을 조정자 metadata로 바꾸려 한다.

```text
src/agents/custom-agent-summaries.ts
```

하지만 현재 `applyAgentConfig()`는 `createBuiltinAgents()`의 `customAgentSummaries` 위치에 `params.ctx.client`를 전달한다. 파서는 배열만 허용하므로 네이티브 custom agent 요약은 빈 배열로 처리될 가능성이 크다.

따라서 이 checkout에서의 기대치는 다음과 같이 잡는다.

```text
네이티브 custom agent
  ├─ @name 직접 호출: 가능
  ├─ task(subagent_type=name): 가능
  └─ Sisyphus 자동 awareness: 별도 prompt_append 또는 wiring 수정 필요

built-in agent + AgentPromptMetadata
  ├─ 직접 호출: 가능
  └─ Sisyphus/Hephaestus/Atlas awareness: 자동 생성
```

이 wiring을 수정하려면 plugin 초기화 중 `client.app.agents()`를 바로 호출하지 않는다. 기존 주석이 설명하듯 config hook 안의 client API 호출은 deadlock을 일으킬 수 있으므로, 이미 로드된 config agent 정보를 안전하게 요약해 넘기는 방향으로 설계해야 한다.

---

# Part G. 완료 체크리스트

## 26. Built-in agent 등록 체크리스트

### 설계

- [ ] 책임이 한 문장으로 설명된다.
- [ ] `useWhen`과 `avoidWhen`이 모두 있다.
- [ ] input/output contract가 있다.
- [ ] 기존 agent와 역할이 겹치지 않는다.
- [ ] 쓰기와 재위임 필요성을 명시적으로 결정했다.
- [ ] 모델 성향과 prompt 스타일이 맞는다.

### 구현

- [ ] `src/agents/<name>.ts`에 factory가 있다.
- [ ] `AgentConfig.prompt`에 실제 역할 지침이 있다.
- [ ] `AgentPromptMetadata`에 trigger가 있다.
- [ ] factory의 정적 `mode`가 설정됐다.
- [ ] `BuiltinAgentName`에 등록했다.
- [ ] `agentSources`와 `agentMetadata`에 모두 등록했다.
- [ ] 두 config name schema에 등록했다.
- [ ] `AgentOverridesSchema`에 등록했다.
- [ ] model fallback chain을 추가했다.
- [ ] 중요한 tool restriction을 두 권한 계층에 반영했다.
- [ ] 필요한 경우에만 display name을 추가했다.
- [ ] main `src/index.ts`에 불필요한 export를 만들지 않았다.

### 검증

- [ ] factory test가 mode, model, prompt, permission을 검증한다.
- [ ] routing test가 delegation table 노출을 검증한다.
- [ ] schema test가 override 보존을 검증한다.
- [ ] registry 통합 test가 built-in map과 Sisyphus prompt를 검증한다.
- [ ] `bun run typecheck`가 통과한다.
- [ ] `bun run build`가 통과한다.
- [ ] 생성된 JSON schema를 확인했다.
- [ ] 실제 로컬 plugin bundle로 `opencode agent list`를 확인했다.
- [ ] 직접 호출과 자동 라우팅을 각각 확인했다.
- [ ] 동기, background 또는 continuation 중 필요한 경로를 확인했다.

---

# Part H. 새 Agent 생성을 요청할 때 사용할 템플릿

## 27. Agent 설계 입력 양식

다음 양식을 채우면 구현에 필요한 판단을 대부분 고정할 수 있다.

```yaml
name: <kebab-case 이름>
display_name: <UI 표시 이름 또는 생략>
kind: native | builtin
mode: subagent | primary | all

responsibility: <한 문장 책임>
non_goals:
  - <하지 않을 일>

triggers:
  - domain: <업무 영역>
    when: <언제 호출할지>

use_when:
  - <권장 상황>

avoid_when:
  - <피해야 할 상황>

input_contract:
  - <부모가 반드시 제공할 정보>

output_contract:
  - <결과 형식>

permissions:
  allow:
    - <허용 도구 또는 행동>
  deny:
    - <금지 도구 또는 행동>

delegation:
  can_spawn_children: false
  allowed_children: []

model_profile:
  preferred_family: <Claude | GPT | Gemini | fast utility>
  fallback_models:
    - provider/model
  cost: FREE | CHEAP | EXPENSIVE

verification:
  - <완료를 판단할 테스트>

project_specific_rules:
  - <prompt_append로 둘 규칙>
```

## 28. 구현 agent에게 전달할 요청문

```text
현재 checkout의 AGENTS.md와 docs/guide/agent-authoring-tutorial.ko.md를 먼저 읽어라.

아래 설계 명세를 기반으로 oh-my-opencode agent를 구현하고 등록하라.

[여기에 Agent 설계 입력 양식 붙여넣기]

요구사항:
1. 기존 일반 specialist factory 패턴을 따른다.
2. 실행 시스템 프롬프트와 orchestration metadata를 분리한다.
3. BuiltinAgentName, factory registry, metadata registry, config schema, override schema, model fallback을 모두 등록한다.
4. 읽기/쓰기/재위임 권한을 factory와 delegated-session restriction 양쪽에서 검증한다.
5. co-located factory/routing test, config schema test, registry integration test를 작성한다.
6. bun test의 관련 target, typecheck, build:schema, build를 실행한다.
7. 생성된 schema diff와 실제 agent list 확인 방법을 보고한다.
8. 사용자 기존 변경을 보존하고, 요청 없이 rebase·commit·push하지 않는다.

완료 조건:
- 직접 subagent_type 호출이 가능하다.
- 조정자 prompt에 agent 이름과 trigger가 나타난다.
- config override가 schema parsing 후 보존된다.
- 지정한 tool permission이 직접 호출과 위임 세션 모두에서 유지된다.
- 관련 테스트, typecheck, build가 통과한다.
```

## 29. 최종 권장 방식

처음부터 built-in agent를 만들기보다 다음 순서가 실패 비용이 낮다.

```text
설계 명세 작성
  → .opencode/agents/<name>.md로 prompt 검증
  → 실제 작업에서 역할 경계 수정
  → task prompt 계약 정리
  → built-in factory + metadata로 승격
  → 두 권한 계층과 model fallback 등록
  → unit/schema/integration/runtime 검증
```

이 순서를 따르면 "등록은 됐지만 언제 불러야 할지 모르는 agent", "프롬프트는 좋지만 부모 문맥이 없어 실패하는 agent", "읽기 전용이라고 썼지만 실제로는 수정 가능한 agent"를 초기에 걸러낼 수 있다.
