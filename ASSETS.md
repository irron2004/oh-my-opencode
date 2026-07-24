# Reusable assets

`oh-my-opencode`가 OpenCode 설치와 다른 프로젝트에 제공하는 공개 package 경계를 기록한다.
`src/` 내부 함수를 임의 import하지 말고 `package.json`의 exports와 CLI를 계약으로 삼는다.

| 자산 | 정본 경로 | 재사용 계약 |
|---|---|---|
| `oh-my-opencode` plugin | `src/index.ts`, `package.json` | npm package의 default export가 OpenCode `Plugin` factory다. config를 읽어 agent, hook, tool, MCP를 조립한다. root의 추가 runtime function export는 OpenCode가 plugin instance로 오해하므로 금지한다. |
| Public TypeScript types | `src/index.ts`, `src/config/` | package root가 `OhMyOpenCodeConfig`, agent/MCP/hook/command 이름과 override type을 내보낸다. runtime 구현은 공개 API가 아니며 새 공개 surface는 declaration build와 SemVer 검토를 동반한다. |
| Configuration JSON Schema | `src/config/`, `script/build-schema.ts`, `assets/oh-my-opencode.schema.json` | Zod config source에서 JSON Schema를 생성한다. 사용자 JSON/JSONC를 parse·validate하고 comment-preserving edit를 유지하며 schema와 loader가 어긋나면 build/check를 실패시킨다. |
| `oh-my-opencode` CLI | `bin/oh-my-opencode.js`, `src/cli/` | `install`, `run`, `doctor`, version 명령을 제공한다. `doctor --json`은 기계 판독 진단이고 `run --json`은 완료된 session 결과를 낸다. 설치/config write, agent run, completion hook은 외부 상태 변경이므로 명시적 호출에서만 수행한다. |
| Platform launcher packages | `packages/`, `bin/platform.js`, `script/build-binaries.ts` | OS/arch/libc별 optional package에서 실행 가능한 binary를 선택한다. package version과 binary metadata를 함께 맞추며 지원되지 않는 platform을 잘못된 binary로 fallback하지 않는다. |

## 현재 통합 상태

- 공개 소비 표면은 npm package, default plugin export, `./schema.json`, CLI다. 이
  워크스페이스의 `opencode/oh-my-opencode`는 source checkout이며 사용자 config 설치본과
  자동으로 동기화되지 않는다.
- `calculate_math/.plugins/oh-my-opencode-ulr`는 별도 fork/revision이다. 양쪽의
  `src/`를 부분 복사하거나 한쪽 build 산출물을 다른 쪽 package로 사용하지 않는다.
- release, npm publish, 사용자 OpenCode config 수정과 platform binary 교체는
  별도 승인·release workflow 대상이다. `dist/`는 생성물이지 편집 정본이 아니다.
