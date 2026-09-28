"""
The initial block-type catalogue (task §5, docs/25_VISUAL_EDITOR_ARCHITECTURE.md).

Derived from what the 17 existing public page components
(`web/src/app/features/*`) actually render today — not invented:

  hero            -> the hero sections in home/about (heading, description, image, CTA)
  rich_text       -> narrative copy paragraphs used throughout about/origin/vision/reach
  section_heading -> the existing `ui-section-heading` (kicker + heading)
  stats           -> `ui-stat-tile` / `stats.data.ts` Stat{value,label,count,suffix}
  timeline        -> `TimelineEntry`{year,what} used by history/about
  card_grid       -> `ActionCard`{title,body} (home "what happens")
  gallery         -> `GalleryItem`{file,caption,album,ratio} (gallery.data.ts)
  team_grid       -> `FacultyMember`/`TeamRole`/NEC team member shape (team.data.ts) —
                     proves the object_list pattern generalizes to people records
                     without inventing new site content; no real people are seeded here
  cta             -> the site-wide primary CTA pattern (site.data.ts primaryCta)

Structured list props use the `list` + `item_type: "object"` + `item_schema`
shape (see `apps.content.validation`), not bare scalars — a Phase 2A gate
review found the earlier bare-string-list schemas silently dropped every
field but one (a Stat's `count`/`suffix`, a timeline entry's `year`, a
card's `body`, a gallery item's `caption`/`album`/`ratio`). Fixed here.

Image-bearing props use `{"type": "image"}` (a structured MediaAsset
reference or an explicit external URL + alt text — see
`apps.content.validation._validate_image`), not a bare `url`, so alt text
has somewhere to live and a publish-time accessibility gate has something
to check (`apps.content.validation.validate_image_accessibility`).

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
                "image": {"type": "image"},
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
                "paragraphs": {
                    "type": "list", "item_type": "string", "required": True, "max_items": 40,
                },  # fmt: skip
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
                "items": {
                    "type": "list", "item_type": "object", "required": True, "max_items": 20,
                    "item_schema": {
                        "properties": {
                            "value": {"type": "string", "required": True, "max_length": 40},
                            "label": {"type": "string", "required": True, "max_length": 120},
                            "count": {"type": "int", "required": False},
                            "suffix": {"type": "string", "required": False, "max_length": 20},
                        }
                    },
                },  # fmt: skip
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
                "entries": {
                    "type": "list", "item_type": "object", "required": True, "max_items": 60,
                    "item_schema": {
                        "properties": {
                            "year": {"type": "string", "required": True, "max_length": 20},
                            "what": {"type": "string", "required": True, "max_length": 400},
                        }
                    },
                },  # fmt: skip
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
                "cards": {
                    "type": "list", "item_type": "object", "required": True, "max_items": 40,
                    "item_schema": {
                        "properties": {
                            "title": {"type": "string", "required": True, "max_length": 120},
                            "body": {"type": "string", "required": True, "max_length": 600},
                        }
                    },
                },  # fmt: skip
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
                "images": {
                    "type": "list", "item_type": "object", "required": True, "max_items": 200,
                    "item_schema": {
                        "properties": {
                            "image": {"type": "image", "required": True},
                            "caption": {"type": "string", "required": False, "max_length": 200},
                            "album": {"type": "string", "required": False, "max_length": 80},
                            "ratio": {"type": "string", "required": False, "enum": ["landscape", "portrait", "square"]},
                        }
                    },
                },  # fmt: skip
            }
        },
        "allowed_parent_keys": [],
    },
    {
        "key": "team_grid",
        "label": "Team grid",
        "json_schema": {
            "props": {
                "heading": {"type": "string", "max_length": 200},
                "members": {
                    "type": "list", "item_type": "object", "required": True, "max_items": 100,
                    "item_schema": {
                        "properties": {
                            "name": {"type": "string", "required": True, "max_length": 120},
                            "role": {"type": "string", "required": False, "max_length": 120},
                            "photo": {"type": "image", "required": False},
                        }
                    },
                },  # fmt: skip
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
