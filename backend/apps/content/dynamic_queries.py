"""
The allowlisted dynamic-content mechanism (docs/25_VISUAL_EDITOR_ARCHITECTURE.md
"Dynamic content"). A `dynamic_query` block never carries SQL, an ORM
expression, a model name, or arbitrary filters — only a `query` identifier
from `QUERY_REGISTRY` below, plus a bounded `sort`/`limit` chosen from that
query's own declared options. The public content endpoint resolves the
identifier server-side; the CMS document only ever selects among
pre-approved options, exactly like `PublicContentDetailView` already trusts
only `published_version`.

Every resolver here reads *only* published content
(`content_item.published_version_id` not null) — a dynamic block must never
become a side channel for draft/unpublished content, matching doc 06's
"published content isolation" invariant.

`published_events` is split into `published_events_upcoming`/
`published_events_past` (Phase 2B) rather than one query with a
client-supplied "when" filter, replicating `events.data.ts`'s
`splitEvents()` exactly: the effective end (`ends_at` if set, else
`starts_at`) compared to now, end-of-day granularity on the *date*
component was the legacy behavior for `Date` objects — here, with real
`DateTimeField`s, the comparison is instant-accurate, which is at least as
correct and does not need re-deriving end-of-day semantics for a stored
timestamp that already carries real time-of-day precision.
"""

from collections.abc import Callable
from dataclasses import dataclass

from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from .models import ContentItem, ContentType


@dataclass(frozen=True)
class DynamicQuery:
    query_id: str
    allowed_sorts: tuple[str, ...]
    default_sort: str
    max_limit: int
    resolver: Callable[[str, int], list[dict]]


def _events_base_qs():
    return (
        ContentItem.objects.filter(content_type=ContentType.EVENT, published_version__isnull=False)
        .select_related("event_detail", "published_version")
        .annotate(_effective_end=Coalesce("event_detail__ends_at", "event_detail__starts_at"))
    )


def _serialize_event(item: ContentItem) -> dict:
    d = item.event_detail
    return {
        "slug": item.slug,
        "title": d.title,
        "kind": d.kind,
        "starts_at": d.starts_at,
        "ends_at": d.ends_at,
        "venue": d.venue,
        "summary": d.summary,
        "description": d.description,
        "time_label": d.time_label,
        "audience": d.audience,
        "organizer": d.organizer,
        "registration_status": d.registration_status,
        "registration_link": d.registration_link,
        "turnout": d.turnout,
        "pending": d.pending,
        "linkedin_url": d.linkedin_url,
        "source": d.source,
        "hashtags": d.hashtags,
        "speakers": d.speakers,
        "featured_image": d.featured_image,
        "gallery": d.gallery,
        "seo": item.published_version.seo,
    }


def _resolve_published_events_upcoming(sort: str, limit: int) -> list[dict]:
    order = "_effective_end" if sort == "starts_at_asc" else "-_effective_end"
    qs = _events_base_qs().filter(_effective_end__gte=timezone.now()).order_by(order)[:limit]
    return [_serialize_event(item) for item in qs]


def _resolve_published_events_past(sort: str, limit: int) -> list[dict]:
    order = "_effective_end" if sort == "starts_at_asc" else "-_effective_end"
    qs = _events_base_qs().filter(_effective_end__lt=timezone.now()).order_by(order)[:limit]
    return [_serialize_event(item) for item in qs]


def _resolve_published_blogs(sort: str, limit: int) -> list[dict]:
    # No dedicated `published_at` field exists yet (would need its own
    # migration); the published version's own updated_at is the closest
    # available proxy — the moment `publish()` last touched this version,
    # which is when it actually went live. Documented, not silently assumed.
    order = "published_version__updated_at" if sort == "published_at_asc" else "-published_version__updated_at"
    qs = (
        ContentItem.objects.filter(content_type=ContentType.BLOG, published_version__isnull=False)
        .select_related("blog_detail", "published_version")
        .order_by(order)[:limit]
    )
    return [
        {
            "slug": item.slug,
            "title": item.blog_detail.title,
            "excerpt": item.blog_detail.excerpt,
            "category": item.blog_detail.category,
            "author_name": item.blog_detail.author_name or (item.blog_detail.author.email if item.blog_detail.author_id else ""),
            "external_url": item.blog_detail.external_url,
            "pending": item.blog_detail.pending,
            "published_at": item.published_version.updated_at,
            "seo": item.published_version.seo,
        }
        for item in qs
    ]


QUERY_REGISTRY: dict[str, DynamicQuery] = {
    "published_events_upcoming": DynamicQuery(
        query_id="published_events_upcoming", allowed_sorts=("starts_at_asc", "starts_at_desc"),
        default_sort="starts_at_asc", max_limit=24, resolver=_resolve_published_events_upcoming,
    ),  # fmt: skip
    "published_events_past": DynamicQuery(
        query_id="published_events_past", allowed_sorts=("starts_at_asc", "starts_at_desc"),
        default_sort="starts_at_desc", max_limit=24, resolver=_resolve_published_events_past,
    ),  # fmt: skip
    "published_blogs": DynamicQuery(
        query_id="published_blogs", allowed_sorts=("published_at_asc", "published_at_desc"),
        default_sort="published_at_desc", max_limit=24, resolver=_resolve_published_blogs,
    ),  # fmt: skip
}


def resolve(query_id: str, *, sort: str | None = None, limit: int | None = None) -> dict:
    """Raises NotFound for an unknown query_id (no distinction from "doesn't
    exist" — this is an allowlist, not a generic query API) and ValidationError
    for an out-of-range sort/limit."""
    query = QUERY_REGISTRY.get(query_id)
    if query is None:
        raise NotFound()
    sort = sort or query.default_sort
    if sort not in query.allowed_sorts:
        raise ValidationError({"sort": [f"Must be one of {list(query.allowed_sorts)}."]})
    limit = query.max_limit if limit is None else limit
    if not isinstance(limit, int) or limit < 1 or limit > query.max_limit:
        raise ValidationError({"limit": [f"Must be an integer between 1 and {query.max_limit}."]})
    results = query.resolver(sort, limit)
    return {"query": query_id, "sort": sort, "count": len(results), "results": results}
