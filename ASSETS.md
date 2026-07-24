# Reusable assets

이 저장소는 upstream `oh-my-opencode`와 갈라진 ruahverce fork다. 공통 plugin surface와
fork 전용 Ultra Research mode를 함께 고정한 revision으로만 평가한다.

| 자산 | 정본 경로 | 재사용 계약 |
|---|---|---|
| Forked `oh-my-opencode` plugin | `src/index.ts`, `package.json` | default OpenCode plugin export, config schema, CLI와 platform launcher를 한 package로 build한다. package 이름이 upstream과 같으므로 npm mainline 설치본과 이 fork source를 같은 artifact로 간주하지 않는다. |
| Ultra Research keyword mode | `src/hooks/keyword-detector/ultra-research/`, `src/hooks/keyword-detector/detector.ts`, `src/hooks/keyword-detector/hook.ts` | 독립 단어 `ultra research`, `ultra-research`, `ulr`를 사용자 prompt에서 감지해 max variant와 evidence/experiment 중심 4-round directive를 주입한다. 부분 문자열, system directive와 background task message는 trigger가 아니다. |
| ULR contract tests | `src/hooks/keyword-detector/index.test.ts` | activation, partial-match rejection, main/non-main session과 message injection을 고정한다. prompt 문구·pattern·session rule 변경은 이 테스트와 함께 바꾼다. |
| Plugin configuration schema | `src/config/`, `assets/oh-my-opencode.schema.json`, `script/build-schema.ts` | fork revision의 Zod source에서 JSON Schema를 생성한다. user JSON/JSONC를 source schema로 검증하고 generated schema를 손으로 편집하지 않는다. |

## 현재 통합 상태

- `calculate_math/.plugins/oh-my-opencode-ulr`가 fork 개발 checkout이다. Ultra Research를
  쓰려면 이 Git revision을 명시적으로 build/install하고 upstream npm package로
  대체하지 않는다.
- `opencode/oh-my-opencode` mainline checkout과 release·schema·binary를 교차 복사하지
  않는다. upstream 변경은 fork 테스트를 통과하는 의도적 port로만 가져온다.
- `ulr` mode는 prompt orchestration 계약이지 연구 결과의 정확성 보증이 아니다. 결과는
  각 소비 프로젝트의 evidence·experiment gate로 검증한다.
