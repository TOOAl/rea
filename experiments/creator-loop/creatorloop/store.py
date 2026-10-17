"""Local project store: one directory per video project plus append-only channel memory.

Layout (root defaults to ``./out``, override with ``CREATOR_LOOP_HOME``)::

    <root>/decisions.jsonl     append-only human decision log (authenticity evidence)
    <root>/catalog.jsonl       channel memory: published videos, fingerprints, metrics
    <root>/weights.json        learned title/thumbnail scorer weights
    <root>/runs/<run>.json     loop run records (①→②→③→④)
    <root>/analytics/*.json    analytics reports
    <root>/projects/<brief>/   brief, screenplay, assets, subtitles, package, video
"""

from __future__ import annotations

import json
import os
import shutil
from dataclasses import asdict
from pathlib import Path
from typing import Any, Iterable, Iterator

from .contracts import (
    AnalyticsReport,
    HumanDecision,
    LoopRun,
    PolicyReport,
    ProducedVideo,
    Screenplay,
    TopicBrief,
    VideoMetrics,
    VideoPackage,
    dump_json,
    load_contract,
    utcnow,
)

DEFAULT_ROOT_ENV = "CREATOR_LOOP_HOME"


def default_root() -> Path:
    override = os.environ.get(DEFAULT_ROOT_ENV)
    if override:
        return Path(override).expanduser()
    return Path.cwd() / "out"


class Store:
    def __init__(self, root: Path | str | None = None) -> None:
        self.root = Path(root).expanduser() if root else default_root()
        (self.root / "projects").mkdir(parents=True, exist_ok=True)
        (self.root / "runs").mkdir(parents=True, exist_ok=True)
        (self.root / "analytics").mkdir(parents=True, exist_ok=True)

    # ---------- paths ----------
    def project_path(self, brief_id: str) -> Path:
        """Read-side project path — never creates directories."""

        return self.root / "projects" / brief_id

    def project_dir(self, brief_id: str) -> Path:
        """Write-side project path — creates ``assets/`` and ``thumbnails/``."""

        path = self.project_path(brief_id)
        (path / "assets").mkdir(parents=True, exist_ok=True)
        (path / "thumbnails").mkdir(parents=True, exist_ok=True)
        return path

    def resolve_brief_id(self, value: str) -> str:
        """Accept a brief id, a project directory, or a path to a ``brief.json``.

        Returning an id (never a path) keeps ``project_path()`` from growing
        stray nested directories when a user pastes a file path.
        """

        text = (value or "").strip()
        if not text:
            return ""
        candidate = Path(text).expanduser()
        if candidate.suffix == ".json" and candidate.exists():
            try:
                payload = json.loads(candidate.read_text("utf-8"))
            except json.JSONDecodeError:
                payload = {}
            return str(payload.get("id") or candidate.parent.name)
        if candidate.is_dir():
            return candidate.name
        known = self.list_briefs()
        if text in known:
            return text
        for brief_id in known:
            if brief_id.startswith(text) or text.startswith(brief_id):
                return brief_id
        return candidate.name if "/" in text or "\\" in text else text

    def asset_path(self, brief_id: str, name: str) -> Path:
        return self.project_dir(brief_id) / "assets" / name

    def thumb_path(self, brief_id: str, name: str) -> Path:
        return self.project_dir(brief_id) / "thumbnails" / name

    # ---------- artifacts ----------
    def save_brief(self, brief: TopicBrief) -> Path:
        return dump_json(brief, self.project_dir(brief.id) / "brief.json")

    def load_brief(self, brief_id: str) -> TopicBrief | None:
        path = self.project_path(brief_id) / "brief.json"
        return load_contract(TopicBrief, json.loads(path.read_text("utf-8"))) if path.exists() else None

    def list_briefs(self) -> list[str]:
        return sorted(p.name for p in (self.root / "projects").iterdir() if (p / "brief.json").exists())

    def save_screenplay(self, screenplay: Screenplay) -> Path:
        return dump_json(screenplay, self.project_dir(screenplay.brief_id) / "screenplay.json")

    def load_screenplay(self, brief_id: str) -> Screenplay | None:
        path = self.project_path(brief_id) / "screenplay.json"
        return load_contract(Screenplay, json.loads(path.read_text("utf-8"))) if path.exists() else None

    def save_package(self, package: VideoPackage) -> Path:
        return dump_json(package, self.project_dir(package.brief_id) / "package.json")

    def load_package(self, brief_id: str) -> VideoPackage | None:
        path = self.project_path(brief_id) / "package.json"
        return load_contract(VideoPackage, json.loads(path.read_text("utf-8"))) if path.exists() else None

    def save_video(self, video: ProducedVideo) -> Path:
        return dump_json(video, self.project_dir(video.brief_id) / "video.json")

    def load_video(self, brief_id: str) -> ProducedVideo | None:
        path = self.project_path(brief_id) / "video.json"
        return load_contract(ProducedVideo, json.loads(path.read_text("utf-8"))) if path.exists() else None

    def save_policy(self, report: PolicyReport, brief_id: str) -> Path:
        return dump_json(report.to_json(), self.project_dir(brief_id) / "policy.json")

    def load_policy(self, brief_id: str) -> dict[str, Any] | None:
        path = self.project_path(brief_id) / "policy.json"
        return json.loads(path.read_text("utf-8")) if path.exists() else None

    def save_any(self, brief_id: str, name: str, payload: Any) -> Path:
        return dump_json(payload, self.project_dir(brief_id) / name)

    # ---------- human decision log ----------
    def record_decision(self, decision: HumanDecision, brief_id: str = "") -> None:
        entry = decision.to_json()
        entry["brief_id"] = brief_id
        with (self.root / "decisions.jsonl").open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry, ensure_ascii=False) + "\n")

    def decisions(self, brief_id: str | None = None) -> list[dict[str, Any]]:
        path = self.root / "decisions.jsonl"
        if not path.exists():
            return []
        rows = [json.loads(line) for line in path.read_text("utf-8").splitlines() if line.strip()]
        return [row for row in rows if brief_id is None or row.get("brief_id") == brief_id]

    def decisions_for(self, brief_id: str) -> list[dict[str, Any]]:
        return self.decisions(brief_id)

    # ---------- channel memory ----------
    def append_catalog(self, record: dict[str, Any]) -> None:
        with (self.root / "catalog.jsonl").open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")

    def catalog(self) -> list[dict[str, Any]]:
        path = self.root / "catalog.jsonl"
        if not path.exists():
            return []
        return [json.loads(line) for line in path.read_text("utf-8").splitlines() if line.strip()]

    def catalog_metrics(self) -> list[VideoMetrics]:
        rows: list[VideoMetrics] = []
        for record in self.catalog():
            metrics = record.get("metrics")
            if isinstance(metrics, dict):
                payload = dict(metrics)
                for alias in ("impressions_ctr", "ctr_pct", "impressions_click_through_rate"):
                    if alias in payload and not payload.get("ctr"):
                        payload["ctr"] = payload.pop(alias)
                ctr = payload.get("ctr")
                if isinstance(ctr, str) and ctr.strip().endswith("%"):
                    try:
                        payload["ctr"] = float(ctr.strip().rstrip("%")) / 100.0
                    except ValueError:
                        pass
                rows.append(load_contract(VideoMetrics, payload))
        return rows

    def ingest_metrics(self, metrics: Iterable[VideoMetrics]) -> int:
        """Upsert published metrics into the channel catalog by video id."""

        records = {row.get("video_id"): row for row in self.catalog()}
        for item in metrics:
            entry = records.setdefault(item.video_id, {"video_id": item.video_id})
            entry["metrics"] = asdict(item)
            entry["updated_at"] = utcnow()
        path = self.root / "catalog.jsonl"
        with path.open("w", encoding="utf-8") as handle:
            for entry in records.values():
                handle.write(json.dumps(entry, ensure_ascii=False) + "\n")
        return len(records)

    # ---------- learned weights ----------
    def weights(self) -> dict[str, float]:
        path = self.root / "weights.json"
        return json.loads(path.read_text("utf-8")) if path.exists() else {}

    def save_weights(self, weights: dict[str, float]) -> Path:
        return dump_json(weights, self.root / "weights.json")

    # ---------- loop runs ----------
    def save_run(self, run: LoopRun) -> Path:
        return dump_json(run, self.root / "runs" / f"{run.id}.json")

    def load_run(self, run_id: str) -> LoopRun | None:
        path = self.root / "runs" / f"{run_id}.json"
        return load_contract(LoopRun, json.loads(path.read_text("utf-8"))) if path.exists() else None

    def list_runs(self) -> list[str]:
        return sorted(p.stem for p in (self.root / "runs").glob("*.json"))

    def save_analytics(self, report: AnalyticsReport) -> Path:
        return dump_json(report, self.root / "analytics" / f"{report.id}.json")

    def load_analytics(self, report_id: str) -> AnalyticsReport | None:
        path = self.root / "analytics" / f"{report_id}.json"
        return load_contract(AnalyticsReport, json.loads(path.read_text("utf-8"))) if path.exists() else None

    def list_analytics(self) -> list[str]:
        return sorted(p.stem for p in (self.root / "analytics").glob("*.json"))

    # ---------- maintenance ----------
    def iter_projects(self) -> Iterator[dict[str, Any]]:
        for brief_id in self.list_briefs():
            yield {
                "brief_id": brief_id,
                "brief": self.load_brief(brief_id),
                "screenplay": self.load_screenplay(brief_id),
                "package": self.load_package(brief_id),
                "video": self.load_video(brief_id),
                "policy": self.load_policy(brief_id),
                "path": str(self.project_dir(brief_id)),
            }

    def projects(self) -> list[dict[str, Any]]:
        """Newest-first project index (used by the web studio)."""

        rows = list(self.iter_projects())
        rows.sort(key=lambda row: str(row.get("updated_at", "")), reverse=True)
        return rows

    def latest_analytics(self) -> AnalyticsReport | None:
        ids = self.list_analytics()
        return self.load_analytics(ids[-1]) if ids else None

    def reset_project(self, brief_id: str) -> None:
        shutil.rmtree(self.project_dir(brief_id), ignore_errors=True)


