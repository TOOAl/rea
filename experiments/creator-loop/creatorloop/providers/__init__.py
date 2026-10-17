"""Video/image provider adapters and the capability router.

Public surface used by the pipeline:

* :class:`ProviderRegistry` — availability + capability matrix for every backend
* :func:`plan_shots` / :func:`execute_plan` — routing with warned degradation
* :func:`default_chain` — still-image sources (your media -> procedural art -> keyed services)
"""

from .base import (
    Availability,
    Budget,
    Capability,
    ProviderAuthError,
    ProviderError,
    ProviderQuotaExceeded,
    ProviderRateLimited,
    ProviderRejected,
    ProviderTimeout,
    ProviderUnavailable,
    ShotAssignment,
    ShotRequest,
    ShotRequirement,
    ShotResult,
    describe_capabilities,
)
from .cloud import KlingProvider, RunwayProvider, SoraProvider, VeoProvider, all_cloud_providers
from .images import (
    GeminiImageSource,
    ImageAsset,
    PexelsSource,
    ProceduralArtSource,
    UserLibrarySource,
    default_chain,
    resolve_still,
)
from .local import LocalStudioProvider
from .router import ProviderRegistry, QuotaLedger, execute_plan, plan_shots, route_shot

__all__ = [
    "Availability",
    "Budget",
    "Capability",
    "GeminiImageSource",
    "ImageAsset",
    "KlingProvider",
    "LocalStudioProvider",
    "PexelsSource",
    "ProceduralArtSource",
    "ProviderAuthError",
    "ProviderError",
    "ProviderQuotaExceeded",
    "ProviderRateLimited",
    "ProviderRejected",
    "ProviderRegistry",
    "ProviderTimeout",
    "ProviderUnavailable",
    "QuotaLedger",
    "RunwayProvider",
    "ShotAssignment",
    "ShotRequest",
    "ShotRequirement",
    "ShotResult",
    "SoraProvider",
    "UserLibrarySource",
    "VeoProvider",
    "all_cloud_providers",
    "default_chain",
    "describe_capabilities",
    "execute_plan",
    "plan_shots",
    "resolve_still",
    "route_shot",
]
