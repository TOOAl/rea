"""creator-loop — authenticity-first YouTube production loop.

① 사람이 주제를 결정 → ② AI가 고속 제작 → ③ 제목·썸네일 최적화 → ④ 데이터 리포트 → ①

The package is deliberately dependency-light: Pillow + numpy + a static ffmpeg build
are enough to render a real Korean narrated video offline, and the paid video
providers (Veo 3, Runway Gen-4, Kling, Sora 2) are optional adapters that the router
uses when keys and budget exist.

Public entry points::

    from creatorloop import CreatorLoop, LoopOptions, Store
    loop = CreatorLoop(Store("./out"))
    brief = loop.research("solo_tax_kr", "제목", answers, value_adds=[...])
    screenplay = loop.script(brief, options=LoopOptions(resolution="1080p"))
    produced = loop.produce(brief, screenplay, options=LoopOptions(resolution="1080p"))
    package = loop.package(brief, screenplay, produced)
    report = loop.policy_report(brief, screenplay, package, produced)
"""

from __future__ import annotations

__version__ = "0.1.0"
__all__ = [
    "CreatorLoop",
    "LoopOptions",
    "Store",
    "PolicyEngine",
    "NicheLibrary",
    "BriefBuilder",
    "__version__",
]


def __getattr__(name: str):  # lazy re-exports keep `import creatorloop` cheap
    if name == "CreatorLoop":
        from .loop import CreatorLoop

        return CreatorLoop
    if name == "LoopOptions":
        from .loop import LoopOptions

        return LoopOptions
    if name == "Store":
        from .store import Store

        return Store
    if name == "PolicyEngine":
        from .policy import PolicyEngine

        return PolicyEngine
    if name == "NicheLibrary":
        from .research import NicheLibrary

        return NicheLibrary
    if name == "BriefBuilder":
        from .research import BriefBuilder

        return BriefBuilder
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
