"""Bridge to the REA reverse-engineering CLI that this experiment lives inside.

**Scope and legality are explicit.**  The six commercial video products (InVideo AI,
Pictory, Veo 3, Runway Gen-4, Kling, Sora 2) run their models server-side.  REA cannot
and must not be pointed at their servers; this bridge only ever emits commands for
artifacts *you already lawfully possess*:

* your own browser session against a product you have an account with,
* HAR/mitmproxy captures you recorded of your own traffic,
* project files you exported from your own account,
* APK/IPA files you obtained through the official distribution channel.

The output is a **capability manifest** — observed parameters, limits and defaults —
which creator-loop uses to keep its own adapter contracts honest (for example the
Kling ``camera_control`` single-axis rule).  Nothing here reproduces proprietary model
implementations; the rendering work is done by creator-loop's own engines.

Usage::

    creatorloop rea plan --target web-client --artifact /path/to/har
    creatorloop rea ingest --file out/rea/manifests/kling.json
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Sequence

from .contracts import to_jsonable

REA_BIN = "rea"

TARGETS: dict[str, dict[str, str]] = {
    "web-client": {
        "title": "웹 클라이언트 번들/세션 (본인 계정 세션만)",
        "description": "본인 브라우저에서 제품 UI를 직접 사용하면서 관찰한 파라미터·기본값·제한을 수집합니다.",
    },
    "har": {
        "title": "본인이 녹화한 HAR / mitmproxy 캡처",
        "description": "요청 본문에 들어 있는 파라미터 이름·범위·기본값을 추출합니다 (URL 재요청 없음).",
    },
    "project-export": {
        "title": "본인 계정의 프로젝트 내보내기 파일",
        "description": "InVideo/Pictory류의 프로젝트 JSON에서 씬·브랜드킷·자막 구조를 관찰합니다.",
    },
    "apk": {
        "title": "공식 채널로 받은 APK",
        "description": "클라이언트측 제한(길이·해상도·카메라 프리셋) 문자열을 관찰합니다.",
    },
    "any": {
        "title": "기타 본인이 소유한 아티팩트",
        "description": "일반 아티팩트 검사 경로.",
    },
}

LEGAL_CHECKLIST = (
    "해당 서비스의 이용약관이 자동화 수집·역공학을 허용하는지 확인",
    "본인 계정/본인 기기/본인 트래픽만 대상으로 할 것",
    "타인의 저작물·개인정보가 담긴 캡처는 제외할 것",
    "수집한 자격증명(토큰·쿠키)을 저장하지 말 것 — REA sensitive-value 마스크 사용",
    "관찰 결과는 '상호운용을 위한 사실 정보'로만 사용하고 모델/코드를 복제하지 말 것",
)


@dataclass(slots=True)
class ReaStep:
    step: str
    command: str
    why: str
    output: str = ""
    notes: list[str] = field(default_factory=list)


def analysis_plan(
    *,
    target: str = "web-client",
    artifacts: Sequence[str] = (),
    endpoint: str = "http://127.0.0.1:9222",
    product: str = "",
) -> dict[str, Any]:
    """Emit the REA command sequence for a lawful artifact-inspection session."""

    target_info = TARGETS.get(target, TARGETS["any"])
    steps: list[ReaStep] = []
    label = product or "대상 제품"

    if target == "har":
        capture = artifacts[0] if artifacts else "/absolute/path/to/your.har"
        steps += [
            ReaStep(
                "1. 캡처 구조 파악",
                f"{REA_BIN} inspect-web-network-capture {capture} har --sensitive-value Authorization --sensitive-value Cookie",
                "본인 HAR의 요청/응답 스키마를 재요청 없이 읽습니다. 자격증명은 마스크합니다.",
                "out/rea/har-summary.json",
            ),
            ReaStep(
                "2. 파라미터 추출",
                f"{REA_BIN} inspect-web-network-capture {capture} har --record 0 --record 1",
                "생성 요청 본문에서 파라미터 이름·타입·기본값·허용 범위를 관찰합니다.",
                "out/rea/params.json",
            ),
            ReaStep(
                "3. 증거 고정",
                f"{REA_BIN} evidence-export out/rea/har-summary.json out/rea/evidence/{label}-har.json --overwrite",
                "관찰 결과를 검증된 증거 번들로 남겨 계약 테스트의 픽스처로 씁니다.",
            ),
        ]
    elif target == "project-export":
        project = artifacts[0] if artifacts else "/absolute/path/to/project.json"
        steps += [
            ReaStep(
                "1. 아티팩트 검사",
                f"{REA_BIN} inspect-artifact {project}",
                "프로젝트 파일의 구조(씬·트랙·브랜드킷·자막)를 파악합니다.",
            ),
            ReaStep(
                "2. 필드 검색",
                f'{REA_BIN} search {project} --pattern "brand|caption|scene|duration|aspect"',
                "브랜드킷/자막/씬 분할 관련 필드 이름을 찾습니다.",
            ),
            ReaStep(
                "3. 스키마 기록",
                f"{REA_BIN} evidence-export out/rea/project-summary.json out/rea/evidence/{label}-project.json --overwrite",
                "관찰한 스키마를 증거로 남깁니다.",
            ),
        ]
    elif target == "apk":
        apk = artifacts[0] if artifacts else "/absolute/path/to/app.apk"
        steps += [
            ReaStep("1. 패키지 검사", f"{REA_BIN} inspect-android-package {apk}", "클라이언트 제한 문자열·리소스를 확인합니다."),
            ReaStep("2. 클래스 검색", f'{REA_BIN} search-android-classes {apk} --pattern "camera|duration|resolution"', "카메라 프리셋·길이 제한 관련 심볼을 찾습니다."),
            ReaStep("3. 리소스 디코드", f"{REA_BIN} decode-android-resources {apk}", "프리셋 이름·라벨을 사람이 읽는 형태로 확보합니다."),
        ]
    else:  # web-client
        steps += [
            ReaStep(
                "0. 준비",
                f"rea doctor && rea list-browser-targets {endpoint}",
                "본인 브라우저의 loopback CDP 엔드포인트와 대상 탭을 확인합니다.",
            ),
            ReaStep(
                "1. 번들 정적 분석",
                f"{REA_BIN} analyze-web-bundle {endpoint} <targetId> --allowed-origins https://<본인이 접속한 제품 도메인> --observation-ms 20000",
                "클라이언트 JS에서 파라미터 검증 로직·프리셋 목록을 관찰합니다.",
                "out/rea/bundle-analysis.json",
                ["스크립트 소스는 관찰 목적의 로컬 복사본으로만 사용합니다."],
            ),
            ReaStep(
                "2. UI 상태 관찰",
                f"{REA_BIN} observe-web-execution {endpoint} <targetId> --observation-ms 30000 --include-json-body-shapes --include-console-text",
                "본인이 UI를 조작하는 동안 실제 요청 본문 형태를 관찰합니다.",
            ),
            ReaStep(
                "3. 네트워크 캡처",
                f"{REA_BIN} inspect-web-network-capture /absolute/path/to/session.har har --sensitive-value Authorization",
                "세션 캡처에서 파라미터 범위/기본값을 확인합니다.",
            ),
            ReaStep(
                "4. 스크린샷 비교",
                f"{REA_BIN} capture-web-screenshot {endpoint} <targetId> --output out/rea/ui-before.png",
                "설정 변경 전후의 UI 상태를 비교해 어떤 파라미터가 어떤 결과에 대응하는지 확인합니다.",
            ),
            ReaStep(
                "5. 증거 고정",
                f"{REA_BIN} evidence-export out/rea/bundle-analysis.json out/rea/evidence/{label}-web.json --overwrite",
                "관찰 결과를 계약 테스트 픽스처로 남깁니다.",
            ),
        ]

    manifest_path = f"out/rea/manifests/{(product or target).replace(' ', '-')}.json"
    return {
        "product": product or target,
        "target": target,
        "target_info": target_info,
        "legal_checklist": list(LEGAL_CHECKLIST),
        "steps": to_jsonable(steps),
        "manifest_template": manifest_template(product or target, target_info["title"]),
        "manifest_path": manifest_path,
        "markdown": _markdown(product or target, target_info, steps, manifest_path),
    }


def manifest_template(product: str, artifact_kind: str) -> dict[str, Any]:
    return {
        "product": product,
        "artifact_kind": artifact_kind,
        "collected_at": "",
        "collected_from": "본인 계정/본인 기기 (URL·토큰 기록 금지)",
        "legal_basis": "상호운용 목적의 사실 관찰 (약관 확인 완료 여부: 미확인)",
        "observed_capabilities": [
            {
                "feature": "예: camera_control",
                "observed_values": {"type": "simple", "axes": ["pan", "tilt", "zoom"]},
                "constraint": "simple 모드는 0이 아닌 축을 1개만 허용",
                "evidence": "out/rea/evidence/....json#record-3",
                "maps_to_creator_loop": "direction.kling_camera_control",
            }
        ],
        "observed_limits": [
            {"name": "max_duration_s", "value": 10, "evidence": "..."}
        ],
        "not_observed": ["모델 가중치", "서버측 프롬프트 확장 문구"],
    }


def ingest_manifest(path: Path | str, *, store_root: Path | str | None = None) -> dict[str, Any]:
    """Validate a capability manifest and store it for provider contract checks."""

    source = Path(path)
    payload = json.loads(source.read_text("utf-8"))
    product = str(payload.get("product", source.stem))
    capabilities = payload.get("observed_capabilities", [])
    limits = payload.get("observed_limits", [])
    if not isinstance(capabilities, list) or not isinstance(limits, list):
        raise ValueError("manifest must contain observed_capabilities[] and observed_limits[]")
    missing_evidence = [item.get("feature", "?") for item in capabilities if not item.get("evidence")]

    root = Path(store_root or Path.cwd() / "out")
    destination = root / "rea" / "manifests" / f"{product}.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    normalized = {
        **payload,
        "product": product,
        "ingested_from": str(source.resolve()),
        "capability_count": len(capabilities),
        "limit_count": len(limits),
        "missing_evidence": missing_evidence,
    }
    destination.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), "utf-8")

    contract_checks = _contract_checks(normalized)
    (root / "rea" / "manifests" / f"{product}.checks.json").write_text(
        json.dumps(contract_checks, ensure_ascii=False, indent=2), "utf-8"
    )
    return {
        "ok": not missing_evidence,
        "product": product,
        "stored_at": str(destination),
        "capabilities": len(capabilities),
        "limits": len(limits),
        "missing_evidence": missing_evidence,
        "contract_checks": contract_checks,
    }


def _contract_checks(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    """Compare observed facts with what creator-loop's adapters currently assume."""

    from .direction import KLING_DYNAMIC, KLING_SIMPLE
    from .providers import LocalStudioProvider, all_cloud_providers

    checks: list[dict[str, Any]] = []
    product = str(manifest.get("product", "")).lower()
    observed = {str(item.get("feature", "")).lower(): item for item in manifest.get("observed_capabilities", [])}
    limits = {str(item.get("name", "")).lower(): item.get("value") for item in manifest.get("observed_limits", [])}

    for provider in (*all_cloud_providers(), LocalStudioProvider()):
        capability = provider.capability if not callable(provider.capability) else provider.capability()
        name = capability.provider.value
        if name not in product and product not in name:
            continue
        observed_max = limits.get("max_duration_s")
        mismatch = observed_max is not None and float(observed_max) < capability.max_clip_s
        checks.append(
            {
                "provider": name,
                "adapter_max_clip_s": capability.max_clip_s,
                "observed_max_duration_s": observed_max,
                "adapter_native_audio": capability.native_audio,
                "adapter_camera_control": capability.camera_control,
                "adapter_reference_images": capability.reference_images,
                "ok": not mismatch,
                "note": (
                    "어댑터가 관찰값보다 긴 클립을 허용합니다 — capability.max_clip_s 를 낮추세요"
                    if mismatch
                    else ""
                ),
            }
        )
    if "camera_control" in observed:
        constraint = str(observed["camera_control"].get("constraint", ""))
        single_axis = bool(re.search(r"(1개|one|single)", constraint, flags=re.I))
        checks.append(
            {
                "feature": "kling_camera_control",
                "adapter_simple_axes": KLING_SIMPLE,
                "adapter_dynamic_axes": KLING_DYNAMIC,
                "observed_single_axis_rule": single_axis,
                "ok": single_axis,
                "note": "simple 모드 단일축 규칙 — direction.kling_camera_control 가 compound 무브를 dynamic으로 보냅니다.",
            }
        )
    for item in manifest.get("observed_capabilities", []):
        mapping = item.get("maps_to_creator_loop")
        checks.append({"feature": item.get("feature"), "maps_to": mapping or "(미매핑)", "ok": bool(mapping)})
    return checks


def _markdown(product: str, target_info: dict[str, str], steps: Sequence[ReaStep], manifest_path: str) -> str:
    lines = [
        f"# REA 분석 플랜 — {product}",
        "",
        f"**대상 유형**: {target_info['title']}",
        target_info["description"],
        "",
        "## 사전 확인 (법적/약관)",
        "",
    ]
    lines += [f"- [ ] {item}" for item in LEGAL_CHECKLIST]
    lines += ["", "## 실행 순서", ""]
    for step in steps:
        lines += [f"### {step.step}", "", "```bash", step.command, "```", "", step.why, ""]
        if step.output:
            lines += [f"- 출력: `{step.output}`", ""]
        for note in step.notes:
            lines += [f"- 주의: {note}", ""]
    lines += [
        "## 관찰 결과 기록",
        "",
        f"관찰한 사실은 `{manifest_path}` 형태(아래 템플릿)로 남긴 뒤 인제스트합니다.",
        "",
        "```bash",
        f"creatorloop rea ingest --file {manifest_path}",
        "```",
        "",
        "인제스트하면 creator-loop 어댑터가 가정하는 값과 관찰값을 대조한 contract check가 생성됩니다.",
        "",
        "**금지**: 모델 가중치 추출·서버측 프롬프트 복제·타인 계정 대상 수집. 관찰 결과는 상호운용을 위한 사실 정보로만 사용합니다.",
    ]
    return "\n".join(lines)
