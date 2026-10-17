"""Local web studio: the human side of the loop (① decide → ② produce → ③ package → ④ report).

Pure-stdlib HTTP server (no framework dependency), bound to ``0.0.0.0`` so it works
behind sandbox proxies.  All URLs are relative, media is served with HTTP range
support so the browser player can seek, and progress is pushed over SSE while a
render runs in a worker thread.

The studio never hides the human gates: the script panel requires you to rewrite at
least one scene before production is enabled, and the policy panel shows blocking
findings fail-closed.
"""

from __future__ import annotations

import json
import mimetypes
import threading
import time
import traceback
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

from .analytics import ingest_studio_csv, report_summary
from .contracts import to_jsonable
from .loop import CreatorLoop, LoopOptions, _load_brand
from .policy import summarize as policy_summary
from .store import Store

STATIC_DIR = Path(__file__).resolve().parent / "static"


class StudioState:
    """Shared mutable state for one studio process."""

    def __init__(self, store: Store) -> None:
        self.store = store
        self.loop = CreatorLoop(store)
        self.events: list[dict[str, Any]] = []
        self.subscribers: list[list[dict[str, Any]]] = []
        self.jobs: dict[str, dict[str, Any]] = {}
        self.lock = threading.Lock()

    def emit(self, event: dict[str, Any]) -> None:
        event = {**event, "at": time.time()}
        with self.lock:
            self.events.append(event)
            self.events = self.events[-500:]
            queues = list(self.subscribers)
        for queue in queues:
            queue.append(event)

    def subscribe(self) -> list[dict[str, Any]]:
        queue: list[dict[str, Any]] = []
        with self.lock:
            self.subscribers.append(queue)
        return queue

    def unsubscribe(self, queue: list[dict[str, Any]]) -> None:
        with self.lock:
            if queue in self.subscribers:
                self.subscribers.remove(queue)

    def start_job(self, kind: str, worker) -> str:
        job_id = f"job_{int(time.time() * 1000)}"
        with self.lock:
            self.jobs[job_id] = {"id": job_id, "kind": kind, "status": "running", "started_at": time.time()}
        self.emit({"type": "job_start", "job": job_id, "kind": kind})

        def run() -> None:
            try:
                result = worker()
                with self.lock:
                    self.jobs[job_id].update(status="done", result=result)
                self.emit({"type": "job_done", "job": job_id, "kind": kind})
            except Exception as error:  # pragma: no cover - surfaced in the UI
                detail = traceback.format_exc(limit=6)
                with self.lock:
                    self.jobs[job_id].update(status="error", error=str(error), trace=detail)
                self.emit({"type": "job_error", "job": job_id, "kind": kind, "error": str(error)})

        threading.Thread(target=run, name=kind, daemon=True).start()
        return job_id

    # ------------------------------------------------------------------ api --
    def state(self) -> dict[str, Any]:
        projects = []
        for row in self.store.projects():
            brief_id = row.get("brief_id") or row.get("id") or ""
            if not brief_id:
                continue
            brief = self.store.load_brief(brief_id)
            screenplay = self.store.load_screenplay(brief_id)
            video = self.store.load_video(brief_id)
            package = self.store.load_package(brief_id)
            policy_path = self.store.project_dir(brief_id) / "policy.json"
            policy_payload = json.loads(policy_path.read_text("utf-8")) if policy_path.exists() else None
            projects.append(
                {
                    "brief": to_jsonable(brief) if brief else None,
                    "screenplay_summary": _screenplay_summary(
                        screenplay, brief.working_title if brief else ""
                    )
                    if screenplay
                    else None,
                    "video": to_jsonable(video) if video else None,
                    "package": to_jsonable(package) if package else None,
                    "policy": _policy_payload(policy_payload),
                    "media": _media_links(self.store, brief_id, package),
                    "files": sorted(path.name for path in self.store.project_path(brief_id).glob("*")),
                }
            )
        analytics = self.store.latest_analytics()
        return {
            "doctor": self.loop.doctor(),
            "niches": to_jsonable(self.loop.library.niches),
            "ranked_niches": self.loop.research_options()["ranked_niches"],
            "projects": projects,
            "analytics": to_jsonable(analytics) if analytics else None,
            "analytics_summary": report_summary(analytics) if analytics else "",
            "catalog_size": len(self.store.catalog()),
            "decisions": self.store.decisions()[-40:],
            "events": self.events[-40:],
        }

    def brief_form(self, payload: dict[str, Any]) -> str:
        answers = {key: value for key, value in (payload.get("answers") or {}).items() if value}
        value_adds = [
            (item.get("kind", "personal_experience"), item.get("evidence", ""))
            for item in payload.get("value_adds") or []
            if item.get("evidence")
        ]
        brief = self.loop.research(
            str(payload.get("niche_id", "")),
            str(payload.get("title", "")),
            answers,
            value_adds=value_adds,
            keywords=payload.get("keywords") or [],
            sources=payload.get("sources") or [],
            personal_advantage=payload.get("personal_advantage"),
            video_format=str(payload.get("video_format", "long_form")),
            runtime_target_s=int(payload.get("runtime_target_s", 240)),
        )
        return brief.id

    def options_from(self, payload: dict[str, Any]) -> LoopOptions:
        return LoopOptions(
            aspect=str(payload.get("aspect", "16:9")),
            resolution=str(payload.get("resolution", "1080p")),
            variation_index=int(payload.get("variation_index", 0)),
            runtime_target_s=int(payload.get("runtime_target_s", 240)),
            budget_usd=float(payload.get("budget_usd", 0.0)),
            prefer_free=not bool(payload.get("allow_paid")),
            native_audio=bool(payload.get("native_audio")),
            tts_backend=str(payload.get("tts", "")),
            voice_files=tuple(payload.get("voice_files") or ()),
            media_dir=str(payload.get("media_dir", "")),
            article=str(payload.get("article", "")),
            remix_from=str(payload.get("remix_from", "")),
            fps=int(payload.get("fps", 30)),
            auto_approve=bool(payload.get("auto_gates")),
        )

    def script_form(self, payload: dict[str, Any]) -> dict[str, Any]:
        brief = self.store.load_brief(str(payload.get("brief_id")))
        if brief is None:
            raise ValueError("brief not found")
        options = self.options_from(payload)
        from .screenplay import apply_human_edits

        screenplay = self.loop.script(brief, options=options)
        edits = {key: value for key, value in (payload.get("edits") or {}).items() if value}
        if edits:
            screenplay = apply_human_edits(screenplay, edits, decided_by=str(payload.get("by", "human")))
            for decision in screenplay.decisions[-len(edits) :]:
                self.store.record_decision(decision, brief.id)
            self.store.save_screenplay(screenplay)
        return {
            "brief_id": brief.id,
            "screenplay": to_jsonable(screenplay),
            "beats": _beat_rows(screenplay),
            "gates": self.loop.check_gates(brief, screenplay, options=options),
        }

    def produce_form(self, payload: dict[str, Any]) -> dict[str, Any]:
        brief = self.store.load_brief(str(payload.get("brief_id")))
        if brief is None:
            raise ValueError("brief not found")
        screenplay = self.store.load_screenplay(brief.id)
        if screenplay is None:
            raise ValueError("script first")
        options = self.options_from(payload)
        gates = self.loop.check_gates(brief, screenplay, options=options)
        if not gates["passed"] and not payload.get("force"):
            return {"blocked": True, "gates": gates}
        produced = self.loop.produce(brief, screenplay, options=options)
        package = self.loop.package(brief, screenplay, produced)
        report = self.loop.policy_report(brief, screenplay, package, produced)
        bundle = self.loop.build_upload_bundle(brief, screenplay, package, produced["video"], report)
        return {
            "blocked": False,
            "gates": gates,
            "video": to_jsonable(produced["video"]),
            "warnings": produced["warnings"],
            "highlights": produced["highlights"],
            "package": to_jsonable(package),
            "policy": report.to_json(),
            "policy_summary": policy_summary(report),
            "upload_bundle": str(bundle),
            "media": {
                "video": f"/media/{brief.id}/video.mp4",
                "poster": f"/media/{brief.id}/poster.png",
                "thumbnails": [f"/media/{brief.id}/thumbnails/{Path(item.path).name}" for item in package.thumbnails],
                "frames": [f"/media/{brief.id}/work/frames/{path.name}" for path in (self.store.project_dir(brief.id) / "work" / "frames").glob("*.png")],
            },
        }

    def analytics_form(self, payload: dict[str, Any], csv_text: str = "") -> dict[str, Any]:
        if csv_text:
            tmp = self.store.root / "analytics" / f"upload_{int(time.time())}.csv"
            tmp.parent.mkdir(parents=True, exist_ok=True)
            tmp.write_text(csv_text, "utf-8")
            self.store.ingest_metrics(ingest_studio_csv(tmp))
        report = self.loop.analyze(window_days=int(payload.get("window_days", 90)))
        return {"report": to_jsonable(report), "summary": report_summary(report)}


def _media_links(store: Store, brief_id: str, package: Any) -> dict[str, Any]:
    """Relative media URLs for one project (프록시/프리뷰 환경에서도 동작)."""

    project = store.project_path(brief_id)

    def link(name: str) -> str:
        return f"/media/{brief_id}/{name}" if (project / name).is_file() else ""

    thumbs = [Path(item.path).name for item in getattr(package, "thumbnails", []) or []]
    return {
        "video": link("video.mp4"),
        "poster": link("poster.png"),
        "thumbnails": [f"/media/{brief_id}/thumbnails/{name}" for name in thumbs if (project / "thumbnails" / name).is_file()],
        "subtitles": link("subtitles.srt"),
        "upload_bundle": link("upload.json"),
    }


def _beat_rows(screenplay: Any) -> list[dict[str, Any]]:
    from .screenplay import beat_summary

    return beat_summary(screenplay)


def _screenplay_summary(screenplay: Any, title: str = "") -> dict[str, Any]:
    return {
        "id": screenplay.id,
        "title": title or screenplay.logline,
        "logline": screenplay.logline,
        "hook_archetype": screenplay.hook_archetype,
        "beat_plan": screenplay.beat_plan,
        "scenes": len(screenplay.scenes),
        "shots": sum(len(scene.shots) for scene in screenplay.scenes),
        "estimated_runtime_s": screenplay.estimated_runtime_s,
        "human_sourced_ratio": screenplay.human_sourced_ratio,
        "human_edited": screenplay.human_edited,
        "human_edit_distance": screenplay.human_edit_distance,
        "variation_lineage": screenplay.variation_lineage,
        "beats": _beat_rows(screenplay),
    }


def _policy_payload(payload: dict[str, Any] | None) -> dict[str, Any] | None:
    if not payload:
        return None
    return {
        "score": payload.get("score"),
        "ok": payload.get("ok"),
        "summary": payload.get("summary", ""),
        "findings": payload.get("findings", []),
        "generated_at": payload.get("generated_at", ""),
    }


class StudioHandler(BaseHTTPRequestHandler):
    server_version = "creator-loop-studio/0.1"
    protocol_version = "HTTP/1.1"
    state: StudioState  # injected by serve()

    # ------------------------------------------------------------- plumbing --
    def log_message(self, fmt: str, *args: Any) -> None:  # quieter logs
        if self.path.startswith("/api/events"):
            return
        print(f"[studio] {self.address_string()} {fmt % args}", flush=True)

    def _send(self, body: bytes, content_type: str = "application/json; charset=utf-8", status: int = 200, extra: dict[str, str] | None = None) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for key, value in (extra or {}).items():
            self.send_header(key, value)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json(self, payload: Any, status: int = 200) -> None:
        self._send(json.dumps(to_jsonable(payload), ensure_ascii=False).encode("utf-8"), status=status)

    def _error(self, message: str, status: int = 400) -> None:
        self._json({"ok": False, "error": message}, status=status)

    def _body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length") or 0)
        if not length:
            return {}
        raw = self.rfile.read(length)
        content_type = self.headers.get("Content-Type", "")
        if "application/json" in content_type:
            return json.loads(raw.decode("utf-8"))
        if "text/csv" in content_type:
            return {"__csv__": raw.decode("utf-8", "replace")}
        return {key: value[0] for key, value in parse_qs(raw.decode("utf-8", "replace")).items()}

    # ---------------------------------------------------------------- routes --
    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path
        try:
            if path in ("/", "/index.html"):
                return self._file(STATIC_DIR / "index.html", "text/html; charset=utf-8")
            if path.startswith("/static/"):
                return self._file(STATIC_DIR / Path(unquote(path[len("/static/") :])).name)
            if path == "/api/state":
                return self._json({"ok": True, "state": self.state.state()})
            if path == "/api/questions":
                niche = parse_qs(parsed.query).get("niche", [""])[0]
                return self._json({"ok": True, "questions": self.state.loop.builder.questions(niche)})
            if path == "/api/events":
                return self._sse()
            if path.startswith("/media/"):
                return self._media(unquote(path[len("/media/") :]))
            if path == "/api/health":
                return self._json({"ok": True, "time": time.time()})
            return self._error("not found", 404)
        except Exception as error:
            return self._error(f"{error}\n{traceback.format_exc(limit=4)}", 500)

    def do_HEAD(self) -> None:  # noqa: N802
        self.do_GET()

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path
        try:
            payload = self._body()
            if path == "/api/brief":
                brief_id = self.state.brief_form(payload)
                self.state.emit({"type": "brief_created", "brief_id": brief_id})
                return self._json({"ok": True, "brief_id": brief_id})
            if path == "/api/script":
                result = self.state.script_form(payload)
                return self._json({"ok": True, **result})
            if path == "/api/produce":
                job = self.state.start_job("produce", lambda: self.state.produce_form(payload))
                return self._json({"ok": True, "job": job})
            if path == "/api/job":
                job_id = str(payload.get("job", ""))
                with self.state.lock:
                    job = self.state.jobs.get(job_id)
                return self._json({"ok": bool(job), "job": job or {}})
            if path == "/api/package":
                brief = self.state.store.load_brief(str(payload.get("brief_id")))
                if brief is None:
                    return self._error("brief not found", 404)
                screenplay = self.state.store.load_screenplay(brief.id)
                video = self.state.store.load_video(brief.id)
                if video is None:
                    return self._error("produce first", 409)
                timings_path = self.state.store.project_dir(brief.id) / "produce_report.json"
                timings = json.loads(timings_path.read_text("utf-8")).get("scene_timings", []) if timings_path.exists() else []
                package = self.state.loop.package(brief, screenplay, {"video": video, "scene_timings": timings})
                return self._json({"ok": True, "package": to_jsonable(package)})
            if path == "/api/policy":
                brief = self.state.store.load_brief(str(payload.get("brief_id")))
                if brief is None:
                    return self._error("brief not found", 404)
                screenplay = self.state.store.load_screenplay(brief.id)
                package = self.state.store.load_package(brief.id)
                report = self.state.loop.policy_report(brief, screenplay, package, None)
                return self._json({"ok": True, "policy": report.to_json(), "summary": policy_summary(report)})
            if path == "/api/analytics":
                csv_text = str(payload.pop("__csv__", ""))
                result = self.state.analytics_form(payload, csv_text)
                return self._json({"ok": True, **result})
            if path == "/api/approve":
                brief = self.state.store.load_brief(str(payload.get("brief_id")))
                if brief is None:
                    return self._error("brief not found", 404)
                decision = self.state.loop.approve_final(brief, decided_by=str(payload.get("by", "human")), note=str(payload.get("note", "")))
                return self._json({"ok": True, "decision": to_jsonable(decision)})
            return self._error("not found", 404)
        except Exception as error:
            return self._error(f"{error}\n{traceback.format_exc(limit=4)}", 500)

    # ----------------------------------------------------------------- files --
    def _file(self, target: Path, content_type: str | None = None) -> None:
        if not target.exists() or not target.is_file():
            return self._error(f"missing asset: {target.name}", 404)
        body = target.read_bytes()
        guessed = content_type or mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        if guessed.startswith("text/") or guessed in ("application/javascript",):
            guessed = f"{guessed}; charset=utf-8" if "charset" not in guessed else guessed
        self._send(body, content_type=guessed)

    def _media(self, relative: str) -> None:
        projects = (self.state.store.root / "projects").resolve()
        target = (projects / relative).resolve()
        # 접두사 비교(startswith)는 ../../decisions.jsonl 같은 이동을 막지 못합니다.
        # resolve() 이후에도 반드시 projects/ '안에' 있어야 서빙합니다.
        if projects not in target.parents or not target.is_file():
            return self._error("media not found", 404)
        content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        size = target.stat().st_size
        range_header = self.headers.get("Range")
        if range_header and range_header.startswith("bytes="):
            spec = range_header[len("bytes=") :]
            start_text, _, end_text = spec.partition("-")
            start = int(start_text) if start_text else 0
            end = int(end_text) if end_text else size - 1
            end = min(end, size - 1)
            length = max(0, end - start + 1)
            with target.open("rb") as handle:
                handle.seek(start)
                chunk = handle.read(length)
            self.send_response(206)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(len(chunk)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(chunk)
            return
        self._send(target.read_bytes(), content_type=content_type, extra={"Accept-Ranges": "bytes"})

    def _sse(self) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()
        queue = self.state.subscribe()
        try:
            self.wfile.write(b"retry: 3000\n\n")
            self.wfile.flush()
            while True:
                if queue:
                    event = queue.pop(0)
                    payload = json.dumps(to_jsonable(event), ensure_ascii=False)
                    self.wfile.write(f"data: {payload}\n\n".encode("utf-8"))
                    self.wfile.flush()
                else:
                    time.sleep(0.4)
                    self.wfile.write(b": keepalive\n\n")
                    self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            self.state.unsubscribe(queue)


def serve(*, host: str = "0.0.0.0", port: int = 8787, store: Store | None = None, open_browser: bool = True) -> None:
    state = StudioState(store or Store())
    handler = type("BoundStudioHandler", (StudioHandler,), {"state": state})
    httpd = ThreadingHTTPServer((host, port), handler)
    httpd.daemon_threads = True
    url = f"http://{'127.0.0.1' if host in ('0.0.0.0', '') else host}:{port}/"
    print(f"creator-loop studio → {url}")
    print(f"store: {state.store.root}")
    print("Ctrl-C 로 종료")
    if open_browser:
        try:
            webbrowser.open(url)
        except Exception:
            pass
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopping studio…")
    finally:
        httpd.server_close()
