"""Still-image sources for shots: procedural art (free), your own library, Gemini image, Pexels.

The local renderer needs a first frame for every shot.  Sources are tried in order
and each one reports whether it is available, so a keyless machine still gets
deterministic, brand-consistent art instead of failing.
"""

from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Sequence

from ..contracts import Shot
from .base import Availability, ProviderId

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


@dataclass(slots=True)
class ImageAsset:
    path: str
    source: str
    license_note: str = ""
    width: int = 0
    height: int = 0
    matched_terms: list[str] = field(default_factory=list)


class ImageSource:
    name = "base"

    def availability(self) -> Availability:  # pragma: no cover - interface
        raise NotImplementedError

    def fetch(self, shot: Shot, destination: Path, *, index: int = 0) -> ImageAsset | None:  # pragma: no cover
        raise NotImplementedError


class ProceduralArtSource(ImageSource):
    """Deterministic brand art generated with Pillow (see :mod:`creatorloop.art`)."""

    name = "procedural"

    def __init__(self, brand: dict[str, Any] | None = None, seed_text: str = "") -> None:
        self.brand = brand or {}
        self.seed_text = seed_text

    def availability(self) -> Availability:
        from ..art import fonts_available

        ok, reason = fonts_available()
        return Availability(provider=ProviderId.LOCAL_STUDIO, available=ok, reason=reason, key_present=False)

    def fetch(self, shot: Shot, destination: Path, *, index: int = 0) -> ImageAsset | None:
        from ..art import render_scene_art

        width = int(self.brand.get("width", 1920))
        height = int(self.brand.get("height", 1080))
        render_scene_art(shot, destination, brand=self.brand, seed_text=self.seed_text, index=index)
        return ImageAsset(path=str(destination), source=self.name, license_note="generated locally", width=width, height=height)


class UserLibrarySource(ImageSource):
    """Your own footage/stills directory, matched by filename and an optional tags.json."""

    name = "library"

    def __init__(self, directory: Path | str | None = None) -> None:
        self.directory = Path(directory) if directory else None
        self.tags: dict[str, list[str]] = {}
        if self.directory and (self.directory / "tags.json").exists():
            try:
                self.tags = json.loads((self.directory / "tags.json").read_text("utf-8"))
            except json.JSONDecodeError:
                self.tags = {}

    def availability(self) -> Availability:
        exists = bool(self.directory and self.directory.exists())
        return Availability(
            provider=ProviderId.LOCAL_STUDIO,
            available=exists,
            reason="" if exists else "library directory not set (CREATOR_LOOP_MEDIA or --media)",
            key_present=False,
        )

    def candidates(self) -> list[Path]:
        if not self.directory or not self.directory.exists():
            return []
        return sorted(p for p in self.directory.rglob("*") if p.suffix.lower() in IMAGE_EXTENSIONS)

    def fetch(self, shot: Shot, destination: Path, *, index: int = 0) -> ImageAsset | None:
        terms = _terms(shot)
        files = self.candidates()
        if not files:
            return None
        scored = sorted(files, key=lambda path: (-_match_score(path, terms, self.tags), str(path)))
        pick = scored[index % len(scored)]
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(pick.read_bytes())
        return ImageAsset(
            path=str(destination),
            source=self.name,
            license_note="user-provided media — you hold the rights",
            matched_terms=[t for t in terms if t in pick.stem.lower()],
        )


class GeminiImageSource(ImageSource):
    """Gemini image generation (nano-banana class models) for photoreal first frames."""

    name = "gemini_image"

    def __init__(self, api_key: str | None = None, *, model: str = "gemini-2.5-flash-image") -> None:
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "")
        self.model = os.environ.get("GEMINI_IMAGE_MODEL", model)
        self.base_url = os.environ.get("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")

    def availability(self) -> Availability:
        return Availability(
            provider=ProviderId.VEO,
            available=bool(self.api_key),
            reason="" if self.api_key else "GEMINI_API_KEY not set",
            key_present=bool(self.api_key),
        )

    def fetch(self, shot: Shot, destination: Path, *, index: int = 0) -> ImageAsset | None:
        import base64

        if not self.api_key:
            return None
        from ..direction import expand_prompt

        payload = {
            "contents": [{"parts": [{"text": expand_prompt(shot) + "; single still frame, no text overlays"}]}],
            "generationConfig": {"responseModalities": ["IMAGE"]},
        }
        url = f"{self.base_url}/models/{self.model}:generateContent?key={urllib.parse.quote(self.api_key)}"
        request = urllib.request.Request(url, data=json.dumps(payload).encode(), method="POST")
        request.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(request, timeout=90) as response:  # noqa: S310
                data = json.loads(response.read().decode("utf-8"))
        except Exception:
            return None
        for candidate in data.get("candidates", []):
            for part in candidate.get("content", {}).get("parts", []):
                blob = part.get("inlineData") or part.get("inline_data") or {}
                if blob.get("data"):
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    destination.write_bytes(base64.b64decode(blob["data"]))
                    return ImageAsset(
                        path=str(destination),
                        source=self.name,
                        license_note="AI-generated image; disclose as synthetic",
                    )
        return None


class PexelsSource(ImageSource):
    """Pexels stock search (free API key) for real b-roll stills and clips."""

    name = "pexels"

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or os.environ.get("PEXELS_API_KEY", "")
        self.base_url = "https://api.pexels.com/v1/search"

    def availability(self) -> Availability:
        return Availability(
            provider=ProviderId.STOCK_MOSAIC,
            available=bool(self.api_key),
            reason="" if self.api_key else "PEXELS_API_KEY not set",
            key_present=bool(self.api_key),
        )

    def fetch(self, shot: Shot, destination: Path, *, index: int = 0) -> ImageAsset | None:
        if not self.api_key:
            return None
        query = " ".join(_terms(shot)[:4]) or shot.prompt[:40]
        params = urllib.parse.urlencode({"query": query, "per_page": 8, "orientation": "landscape"})
        request = urllib.request.Request(f"{self.base_url}?{params}", method="GET")
        request.add_header("Authorization", self.api_key)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:  # noqa: S310
                data = json.loads(response.read().decode("utf-8"))
        except Exception:
            return None
        photos = data.get("photos", [])
        if not photos:
            return None
        pick = photos[index % len(photos)]
        url = pick.get("src", {}).get("large2x") or pick.get("src", {}).get("original", "")
        try:
            with urllib.request.urlopen(url, timeout=60) as response:  # noqa: S310
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(response.read())
        except Exception:
            return None
        return ImageAsset(
            path=str(destination),
            source=self.name,
            license_note=f"Pexels license (photographer: {pick.get('photographer', 'unknown')}) — attribution appreciated",
            width=int(pick.get("width", 0)),
            height=int(pick.get("height", 0)),
            matched_terms=_terms(shot)[:3],
        )


def _terms(shot: Shot) -> list[str]:
    words: list[str] = []
    for text in (shot.subject, shot.action, shot.prompt, shot.on_screen_text):
        words.extend(w for w in text.lower().replace(",", " ").split() if len(w) > 2)
    seen: dict[str, None] = {}
    for word in words:
        seen.setdefault(word, None)
    return list(seen)[:12]


def _match_score(path: Path, terms: Sequence[str], tags: dict[str, list[str]]) -> int:
    haystack = path.stem.lower() + " " + " ".join(tags.get(path.name, [])).lower()
    return sum(1 for term in terms if term in haystack)


def default_chain(brand: dict[str, Any] | None = None, media_dir: Path | str | None = None, seed_text: str = "") -> list[ImageSource]:
    """Order matters: your own media first, then generated art, then keyed services."""

    return [
        UserLibrarySource(media_dir or os.environ.get("CREATOR_LOOP_MEDIA")),
        ProceduralArtSource(brand, seed_text=seed_text),
        GeminiImageSource(),
        PexelsSource(),
    ]


def resolve_still(
    shot: Shot,
    destination: Path,
    sources: Sequence[ImageSource],
    *,
    index: int = 0,
) -> tuple[ImageAsset | None, list[str]]:
    notes: list[str] = []
    for source in sources:
        if not source.availability().available:
            continue
        asset = source.fetch(shot, destination, index=index)
        if asset:
            return asset, notes
        notes.append(f"{source.name}: available but produced nothing for {shot.id}")
    return None, notes
