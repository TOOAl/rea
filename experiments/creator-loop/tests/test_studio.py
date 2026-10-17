"""Local web studio: state assembly and media serving.

The studio is the human-facing surface of the loop, so these tests assert the
two things that must never silently break: (1) projects created by the CLI/demo
are visible in ``/api/state``, and (2) ``/media/`` only ever serves files inside
the store (no path traversal).
"""

from __future__ import annotations

import json
import threading
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

import pytest

from creatorloop.loop import CreatorLoop, LoopOptions
from creatorloop.studio import StudioHandler, StudioState


@pytest.fixture()
def studio(store):
    state = StudioState(store)
    handler = type("BoundStudioHandler", (StudioHandler,), {"state": state})
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    httpd.daemon_threads = True
    thread = threading.Thread(target=httpd.serve_forever, name="studio-test", daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{httpd.server_address[1]}"
    yield state, base
    httpd.shutdown()
    httpd.server_close()


def _get(url: str, headers: dict[str, str] | None = None):
    request = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(request, timeout=10) as response:
        return response.status, response.read()


@pytest.fixture()
def made_project(store):
    loop = CreatorLoop(store)
    brief = loop.research(
        "solo_tax_kr",
        "개인사업자 첫 부가세 신고 전에 확인할 5가지",
        {"human_take": "저는 첫 신고 때 증빙을 못 찾아서 40만원을 더 냈습니다."},
        value_adds=[("personal_experience", "첫 신고 때 40만원을 더 냈습니다.")],
        keywords=["부가가치세 신고"],
        runtime_target_s=60,
    )
    loop.script(brief, options=LoopOptions(runtime_target_s=60), edits={"sc00": "제가 확인한 순서입니다."})
    return brief


def test_state_lists_projects_created_by_the_cli(studio, made_project, store):
    state, base = studio
    payload = state.state()

    assert payload["projects"], "CLI가 만든 프로젝트가 스튜디오에 보여야 합니다"
    row = next(item for item in payload["projects"] if item["brief"] and item["brief"]["id"] == made_project.id)
    assert row["screenplay_summary"] is not None
    assert row["brief"]["working_title"]

    status, body = _get(f"{base}/api/state")
    assert status == 200
    served = json.loads(body)
    assert served["ok"] is True
    assert any(item.get("brief", {}).get("id") == made_project.id for item in served["state"]["projects"])


def test_state_exposes_relative_media_urls(studio, made_project, store):
    """프록시 환경(프리뷰)에서 동작하려면 미디어 URL은 상대 경로여야 합니다."""

    state, _base = studio
    project = store.project_path(made_project.id)
    (project / "thumbnails").mkdir(parents=True, exist_ok=True)
    (project / "video.mp4").write_bytes(b"stub")
    (project / "poster.png").write_bytes(b"stub")
    (project / "subtitles.srt").write_text("1\n00:00:00,000 --> 00:00:02,000\n테스트\n", "utf-8")

    payload = state.state()
    row = next(item for item in payload["projects"] if item["brief"] and item["brief"]["id"] == made_project.id)
    media = row["media"]
    assert media["video"] == f"/media/{made_project.id}/video.mp4"
    assert media["poster"] == f"/media/{made_project.id}/poster.png"
    assert media["subtitles"] == f"/media/{made_project.id}/subtitles.srt"
    assert media["upload_bundle"] == "", "없는 파일은 링크로 만들지 않습니다"
    assert "http://" not in json.dumps(media) and "https://" not in json.dumps(media)


def test_media_serves_store_files_and_rejects_traversal(studio, made_project, store):
    _state, base = studio
    video_path = store.project_path(made_project.id) / "video.mp4"
    video_path.parent.mkdir(parents=True, exist_ok=True)
    video_path.write_bytes(b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 64)

    status, body = _get(f"{base}/media/{made_project.id}/video.mp4")
    assert status in (200, 206)
    assert body.startswith(b"\x00\x00\x00\x18ftyp")

    # range request (브라우저 영상 탐색에 필요)
    status, body = _get(f"{base}/media/{made_project.id}/video.mp4", {"Range": "bytes=0-7"})
    assert status in (200, 206)
    assert len(body) <= 8

    for hostile in ("../../etc/passwd", f"{made_project.id}/../../decisions.jsonl", "%2e%2e%2f%2e%2e%2fetc/passwd"):
        with pytest.raises(urllib.error.HTTPError) as error:
            _get(f"{base}/media/{hostile}")
        assert error.value.code in (400, 403, 404)


def test_missing_media_is_404(studio, made_project):
    _state, base = studio
    with pytest.raises(urllib.error.HTTPError) as error:
        _get(f"{base}/media/{made_project.id}/does-not-exist.mp4")
    assert error.value.code == 404


def test_health_and_index_are_served(studio):
    _state, base = studio
    status, body = _get(f"{base}/api/health")
    assert status == 200
    assert json.loads(body)["ok"] is True

    status, body = _get(f"{base}/")
    assert status == 200
    assert b"<html" in body.lower() or b"<!doctype" in body.lower()
