"""
The initial block-type catalogue (task §5, §22_VISUAL_EDITOR_ARCHITECTURE).

Derived from what the 17 existing public page components
(`web/src/app/features/*`) actually render today — not invented:

  hero            -> the hero sections in home/about (heading, description, image, CTA)
  rich_text       -> narrative copy paragraphs used throughout about/origin/vision/reach
  section_heading -> the existing `ui-section-heading` (kicker + heading)
  stats           -> the existing `ui-stat-tile` / `stats.data.ts` shape
  timeline        -> `TimelineEntry` (year, what) used by history/about
  card_grid       -> the `ActionCard`/`WhatHappensContent` pattern (home "what happens")
  gallery         -> `gallery.data.ts`
  cta             -> the site-wide primary CTA pattern (site.data.ts primaryCta)

Only `page`-level composition is allowed at Phase 2A: every type accepts
`null` as an allowed parent (top-level) except where noted. Nesting rules
are enforced by `ContentBlockType.allowed_parent_keys` +
`apps.content.validation`.
"""

BLOCK_TYPES: list[dict] = [
    {
        "key": "section_heading",
        "label": "Section heading",
        "json_schema": {
            "props": {
                "kicker": {"type": "string", "max_length": 80},
                "heading": {"type": "string", "required": True, "max_length": 200},
            }
        },
        "allowed_parent_keys": [],
    },
    {
        "key": "hero",
        "label": "Hero",
        "json_schema": {
            "props": {
                "heading": {"type": "string", "required": True, "max_length": 200},
                "description": {"type": "string", "max_length": 600},
                "image": {"type": "url"},
                "cta_label": {"type": "string", "max_length": 60},
                "cta_url": {"type": "url"},
                "alignment": {"type": "string", "enum": ["left", "center"]},
            }
        },
        "allowed_parent_keys": [],
    },
    {
        "key": "rich_text",
        "label": "Rich text",
        "json_schema": {
            "props": {
                "heading": {"type": "string", "max_length": 200},
                "body": {"type": "string", "required": True, "max_length": 4000},
            }
        },
        "allowed_parent_keys": [],
    },
    {
        "key": "stats",
        "label": "Stat tiles",
        "json_schema": {
            "props": {
                "heading": {"type": "string", "max_length": 200},
                "items": {"type": "list", "item_type": "string", "required": True},
            }
        },
        "allowed_parent_keys": [],
    },
    {
        "key": "timeline",
        "label": "Timeline",
        "json_schema": {
            "props": {
                "heading": {"type": "string", "max_length": 200},
                "entries": {"type": "list", "item_type": "string", "required": True},
            }
        },
        "allowed_parent_keys": [],
    },
    {
        "key": "card_grid",
        "label": "Card grid",
        "json_schema": {
            "props": {
                "heading": {"type": "string", "max_length": 200},
                "columns": {"type": "int"},
                "cards": {"type": "list", "item_type": "string", "required": True},
            }
        },
        "allowed_parent_keys": [],
    },
    {
        "key": "gallery",
        "label": "Gallery",
        "json_schema": {
            "props": {
                "heading": {"type": "string", "max_length": 200},
                "images": {"type": "list", "item_type": "url", "required": True},
            }
        },
        "allowed_parent_keys": [],
    },
    {
        "key": "cta",
        "label": "Call to action",
        "json_schema": {
            "props": {
                "heading": {"type": "string", "max_length": 200},
                "label": {"type": "string", "required": True, "max_length": 60},
                "url": {"type": "url", "required": True},
            }
        },
        "allowed_parent_keys": [],
    },
]
