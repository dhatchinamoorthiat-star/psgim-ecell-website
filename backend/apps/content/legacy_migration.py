"""
Phase 2B migration adapters: existing `web/src/app/core/data/*.data.ts`
content, transcribed verbatim (not invented, not paraphrased) into the
corrected Phase 2A block schema. Each function here is pure and
deterministic — same source in, same `blocks` document out — so the
management command that calls these (`migrate_legacy_content`) can be
idempotent (docs/25_VISUAL_EDITOR_ARCHITECTURE.md "Migration impact").

Only a representative subset of the 17 public routes is migrated in Phase
2B: Home, Gallery, Team, Initiatives, and the roadmap ("Soon") page. This
covers every block type in the Phase 2A catalogue (hero, rich_text,
section_heading, stats, timeline is intentionally NOT exercised here — see
note on `home` below — card_grid, gallery, team_grid, cta) against real
data. The remaining routes (About and its five sub-pages, Origin,
Vision-Mission, Reach, Spotlight, History, Podcast, Website-AV, NEC,
Contact, Events, Blogs, Search, Control) are catalogued but not migrated —
see `docs/22_MIGRATION_MATRIX.md` for the per-route status and why each
one is deferred rather than silently skipped.

No content is invented. Every string below is copied character-for-character
from the cited source file. Where a source field has no corresponding block
prop yet (e.g. `Initiative.href`, `EventItem` fields), it is either mapped
to an existing optional prop (see block_catalogue.py's card_grid
extensions) or the gap is named explicitly in the migration matrix — never
silently dropped without a paper trail.
"""

from dataclasses import dataclass, field
from datetime import UTC, datetime


@dataclass(frozen=True)
class PageMigration:
    content_type: str
    slug: str
    title: str
    seo: dict
    blocks: list[dict] = field(default_factory=list)
    # Extra fields for the type-specific detail model beyond `title`
    # (NECDetail.edition, EventDetail.starts_at, BlogDetail.excerpt, etc.)
    # — see `migrate_legacy_content.apply_migration`.
    detail_fields: dict = field(default_factory=dict)


def _doc(blocks: list[dict]) -> dict:
    return {"schema_version": 1, "blocks": blocks}


# --- Home (web/src/app/core/data/home.data.ts, about.data.ts hero, stats.data.ts, gallery.data.ts) ---


def migrate_home() -> PageMigration:
    blocks = [
        {
            "id": "home-hero", "type": "hero",
            "props": {
                "heading": "Creating founders on campus",
                "description": (
                    "The Entrepreneurship Cell of PSGIM has, since 2019, helped students take an idea from a "
                    "classroom conversation to a working venture — through speaker sessions, build weekends, "
                    "mentorship and the National Entrepreneurship Challenge."
                ),
            },
        },
        {
            "id": "home-why", "type": "rich_text",
            "props": {
                "heading": "Entrepreneurship starts before the startup.",
                # WhyContent{lede, questions[], body} — no block type has separate
                # lede/questions/body slots, so each is carried as its own
                # paragraph in order (lede, then each question, then body),
                # preserving every sentence rather than dropping the questions.
                "paragraphs": [
                    "You don’t need a company name, a pitch deck or a million-dollar idea to think like an "
                    "entrepreneur. Sometimes, it starts with a question.",
                    "Why is this done this way?",
                    "What if we tried something different?",
                    "Could this problem become an opportunity?",
                    "E-Cell PSGIM exists to create a space for those questions. Through experiences, "
                    "conversations, collaborations and challenges, we encourage students to explore ideas, "
                    "develop perspectives and turn curiosity into action.",
                ],
            },
        },
        {
            "id": "home-what-happens", "type": "card_grid",
            "props": {
                "heading": "Build. Connect. Experiment. Collaborate. Share.",
                "cards": [
                    {"title": "Build", "body": "Turn an idea into something people can actually see, use or question."},
                    {"title": "Connect", "body": "Meet founders, alumni, industry voices, students and people who think differently."},
                    {"title": "Experiment", "body": "Workshops, challenges, competitions and projects that take entrepreneurship outside the classroom."},
                    {"title": "Collaborate", "body": "Because good ideas don’t care which department, college or country you come from."},
                    {"title": "Share", "body": "Stories, conversations, lessons and the things we learn along the way."},
                ],  # fmt: skip
            },
        },
        {
            # EcellWayContent's WayItem{left, right, note} has no dedicated block
            # type — represented as a card_grid where title states the contrast
            # and body carries the note, which preserves all three fields.
            "id": "home-ecell-way", "type": "card_grid",
            "props": {
                "heading": "How we try to work",
                "cards": [
                    {"title": "Curious, not Comfortable", "body": "Ask better questions."},
                    {"title": "Action, not Intention", "body": "Ideas are nice. Execution is nicer."},
                    {"title": "People, not Titles", "body": "The best idea doesn’t always come from the person with the biggest title."},
                    {"title": "Failure, not Pretending", "body": "If something doesn’t work, we learn why."},
                    {"title": "Collaboration, not Competition", "body": "Build together whenever you can."},
                ],  # fmt: skip
            },
        },
        {
            "id": "home-stats", "type": "stats",
            "props": {
                "items": [
                    {"value": "2019", "label": "Established", "count": None},
                    {"value": "23", "label": "Active members", "count": 23},
                    {"value": "12+", "label": "Events a year", "count": 12, "suffix": "+"},
                    {"value": "NEC", "label": "2026 · Registered", "count": None},
                ]
            },
        },
        {
            "id": "home-cta", "type": "cta",
            "props": {"label": "Join the Cell", "url": "/contact/"},
        },
    ]
    return PageMigration(
        content_type="page", slug="home", title="Home",
        seo={
            "title": "PSGIM E-Cell — Entrepreneurship Cell, PSG Institute of Management",
            "description": (
                "The student-run Entrepreneurship Cell of PSG Institute of Management, Coimbatore. Speaker "
                "sessions, build weekends, mentoring and the National Entrepreneurship Challenge."
            ),
            "path": "/",
        },
        blocks=blocks,
    )  # fmt: skip


# --- Gallery (web/src/app/core/data/gallery.data.ts) ---


def migrate_gallery() -> PageMigration:
    items = [
        ("bootcamp.jpg", "Bootcamp ’26", "workshops", "landscape"),
        ("founders-on-campus.jpg", "Founders on Campus", "events", "portrait"),
        ("ideathon.jpg", "Ideathon finals", "ideathon", "landscape"),
        ("nec-kickoff.jpg", "NEC kick-off", "nec", "square"),
        ("idea-clinic.jpg", "Idea Clinic", "workshops", "portrait"),
        ("team-offsite.jpg", "Team offsite", "community", "landscape"),
        ("workshop-series.jpg", "Workshop series", "workshops", "square"),
        ("campus-drive.jpg", "Campus drive", "nec", "portrait"),
    ]
    images = [
        {
            # No file at these names actually exists anywhere under
            # web/public (verified directly), and the current site never
            # renders an <img> for a gallery tile either — only a captioned
            # placeholder (gallery.component.html). Inventing a resolvable
            # URL here would misrepresent the source, so `image` is left
            # unset; `file` preserves the original filename string verbatim
            # for provenance, to be resolved to a real MediaAsset once
            # photography actually exists (galleryNote: "Photography goes in
            # once the shared drive is set up").
            "file": file,
            "caption": caption,
            "album": album,
            "ratio": ratio,
        }
        for file, caption, album, ratio in items
    ]
    blocks = [{"id": "gallery-grid", "type": "gallery", "props": {"images": images}}]
    return PageMigration(
        content_type="page", slug="gallery", title="Gallery",
        seo={
            "title": "Gallery",
            "description": "Photography goes in once the shared drive is set up. Tiles without an image are labelled placeholders.",
            "path": "/gallery/",
        },
        blocks=blocks,
    )  # fmt: skip


# --- Team (web/src/app/core/data/team.data.ts) ---


def migrate_team() -> PageMigration:
    # `photo` filenames exist in the source but the current site never
    # renders them as images anywhere (team.component.html only ever shows
    # `initials(name)`); migrating a `photo` prop here would represent a
    # capability the live site doesn't actually have. TeamGridComponent
    # (Phase 2B Angular side) replicates the same initials-avatar fallback
    # when no photo is present, so behavior stays identical.
    faculty_members = [
        {"name": "Dr. Srividya", "role": "Director, PSG Institute of Management"},  # patron
        {"name": "Dr. Venketalakshmi", "role": "Faculty Coordinator", "org": "PSGIM E-Cell"},
        {"name": "Dr. Vijay Vardhan", "role": "Faculty Coordinator", "org": "PSGIM E-Cell"},
    ]
    role_members = [
        {"role": "Lead", "name": "Nimisha Sivakumar", "remit": "Overall delivery, faculty liaison"},
        {"role": "Technical", "name": "Dhatchina Moorthi TA", "remit": "Website, tooling, data"},
        {"role": "Content & outreach", "remit": "Copy, event write-ups, collaborations"},  # name: null in source
        {"role": "Design & social", "remit": "Post templates, calendar, publishing"},
        {"role": "Events", "remit": "Logistics, speakers, venues"},
        {"role": "Analytics", "remit": "Weekly metrics to the coordinators"},
    ]
    blocks = [
        {"id": "team-faculty", "type": "team_grid", "props": {"heading": "Faculty & patron", "members": faculty_members}},
        {"id": "team-roles", "type": "team_grid", "props": {"heading": "Core team", "members": role_members}},
    ]
    return PageMigration(
        content_type="page", slug="team", title="Team",
        seo={
            "title": "Team",
            "description": "Faculty coordinators, the core team and the NEC campus team behind PSGIM E-Cell.",
            "path": "/team/",
        },
        blocks=blocks,
    )  # fmt: skip


# --- Initiatives (web/src/app/core/data/initiatives.data.ts) ---


def migrate_initiatives() -> PageMigration:
    # card_grid.cards[].body is sourced from each Initiative's shorter `summary`
    # field, not its long-form `body` prose (which runs well past a listing
    # card's purpose) — the full narrative body is one of the fields not yet
    # carried by any block type; see docs/22_MIGRATION_MATRIX.md.
    initiatives = [
        {"index": "01", "title": "Founders on Campus", "tag": "Speaker series", "cadence": "Monthly", "venue": "Auditorium", "stage": "spark",
         "body": "A monthly evening with a founder or operator — 40 minutes of story, 20 of questions."},
        {"index": "02", "title": "48-Hour Bootcamp", "tag": "Build weekend", "cadence": "Once a semester", "stage": "build",
         "body": "Teams take a real problem to a tested prototype and a two-minute pitch in one weekend."},
        {"index": "03", "title": "Ideathon", "tag": "Competition", "cadence": "February", "stage": "test",
         "body": "An open annual idea contest with a cash prize and a mentoring block for the top three teams."},
        {"index": "04", "title": "NEC Campus Drive", "tag": "National", "cadence": "Aug – Nov", "stage": "back", "href": "/nec/",
         "body": "Our structured push for the National Entrepreneurship Challenge — activities, outreach and reporting."},
        {"index": "05", "title": "Campus Ambassadors", "tag": "Network", "cadence": "Year-round", "stage": "spark",
         "body": "Students across departments who carry E-Cell into their classes and bring ideas back."},
        {"index": "06", "title": "Idea Clinic", "tag": "Mentoring", "cadence": "Fortnightly", "stage": "test",
         "body": "One-on-one feedback sessions where a team leaves with a mentor and a concrete next step."},
        {"index": "07", "title": "UNPITCHED", "tag": "Podcast", "cadence": "Ongoing", "stage": "spark",
         "body": "Conversations beyond the pitch — the doubts, failures and questions behind the ideas."},
    ]  # fmt: skip
    for i in initiatives:
        i.setdefault("venue", "")
        # href is a url-typed prop — omit the key entirely rather than default
        # to "", which the URL allowlist correctly rejects as an empty scheme.
    what_we_create = [
        {"title": "Conversations", "body": "Stories, perspectives and honest conversations through podcasts and student-focused content."},
        {"title": "Collaborations", "body": "Building connections across PSG, Coimbatore, India and beyond."},
        {"title": "Communities", "body": "Creating spaces where students, alumni and entrepreneurial communities can continue conversations beyond the classroom."},
        {"title": "Initiatives", "body": "Turning student ideas into meaningful experiences, experiments and opportunities."},
        {"title": "Challenges", "body": "Creating opportunities to question, solve, compete and think differently."},
        {"title": "Learning", "body": "Learning doesn’t always happen inside a classroom. Sometimes it happens while building something together."},
    ]  # fmt: skip
    stages = [
        {"index": "01", "title": "Spark", "stage": "spark", "body": "Hear how it actually happens, and say the idea out loud."},
        {"index": "02", "title": "Test", "stage": "test", "body": "Put it in front of a mentor and five real users."},
        {"index": "03", "title": "Build", "stage": "build", "body": "A weekend to turn the idea into something you can demo."},
        {"index": "04", "title": "Back", "stage": "back", "body": "Take it to a national stage, with the Cell behind it."},
    ]  # fmt: skip
    blocks = [
        {"id": "initiatives-what-we-create", "type": "card_grid", "props": {"heading": "From ideas to experiences", "cards": what_we_create}},
        {"id": "initiatives-stages", "type": "card_grid", "props": {"heading": "The journey", "cards": stages}},
        {"id": "initiatives-list", "type": "card_grid", "props": {"heading": "Seven initiatives", "cards": initiatives}},
    ]
    return PageMigration(
        content_type="page", slug="initiatives", title="Initiatives",
        seo={
            "title": "Initiatives",
            "description": "Seven programmes that move a PSGIM student from an idea to a national stage.",
            "path": "/initiatives/",
        },
        blocks=blocks,
    )  # fmt: skip


# --- Roadmap / "Soon" page (web/src/app/core/data/roadmap.data.ts) ---


def migrate_roadmap() -> PageMigration:
    items = [
        {"title": "Online registration", "status": "building",
         "body": "Register for an event in a couple of taps, from your phone — no more paper sign-up sheets or a Google Form bolted on after the fact."},
        {"title": "Digital certificates", "status": "building",
         "body": "A certificate with its own serial number and a QR code that verifies it — issued the moment an event closes, not weeks later."},
        {"title": "Feedback, right after the session", "status": "building",
         "body": "A short feedback form tied to the pass you checked in with, sent right after the event — so we hear from people while it's fresh."},
        {"title": "QR check-in & attendance", "status": "building",
         "body": "Scan in at the door. Attendance is recorded automatically, per session — no paper register to chase down afterwards."},
        {"title": "Participation reports", "status": "building",
         "body": "Turnout, attendance and NEC-linked activity, tracked centrally instead of rebuilt by hand for every report."},
        {"title": "A single record of every event", "status": "building",
         "body": "One place for what the Cell has run — date, format, turnout, photos, outcome — instead of scattered spreadsheets and old captions."},
    ]  # fmt: skip
    blocks = [
        {
            "id": "roadmap-note", "type": "rich_text",
            "props": {"paragraphs": [
                "These run on a system the team has already built — it just isn't switched on for everyone yet. Nothing here is a promise with no work behind it."
            ]},
        },
        {"id": "roadmap-items", "type": "card_grid", "props": {"heading": "What's coming", "cards": items}},
    ]
    return PageMigration(
        content_type="page", slug="soon", title="What's coming",
        seo={
            "title": "What's coming",
            "description": (
                "These run on a system the team has already built — it just isn't switched on for everyone yet. "
                "Nothing here is a promise with no work behind it."
            ),
            "path": "/soon/",
        },
        blocks=blocks,
    )  # fmt: skip


# --- About + its 5 dedicated sub-routes (web/src/app/core/data/about.data.ts) ---
# The sub-routes (origin/vision-mission/reach/spotlight/history) render a
# *subset* of the same about.data.ts exports the main /about page renders —
# that duplication already exists in the legacy Angular code (both
# `AboutComponent` and e.g. `OriginComponent` import the same `story`
# object), so migrating each as its own ContentItem with the matching
# subset of blocks mirrors reality rather than inventing new structure.


def migrate_about() -> PageMigration:
    blocks = [
        {"id": "about-hero", "type": "hero", "props": {
            "heading": "Creating founders on campus",
            "description": (
                "The Entrepreneurship Cell of PSGIM has, since 2019, helped students take an idea from a "
                "classroom conversation to a working venture — through speaker sessions, build weekends, "
                "mentorship and the National Entrepreneurship Challenge."
            ),
        }},  # fmt: skip
        {"id": "about-intro", "type": "rich_text", "props": {
            "heading": "Ideas, tested early — and taken seriously.",
            "paragraphs": [
                "PSGIM E-Cell helps students through workshops, speaker sessions, a build-weekend format and an "
                "annual idea competition — a small crucible for innovation, run entirely by students.",
                "We provide guidance from experienced mentors, routes to a first customer, and a network of "
                "alumni founders and partner E-Cells.",
            ],
        }},  # fmt: skip
        {"id": "about-story", "type": "rich_text", "props": {"heading": "The story", "paragraphs": _STORY_PARAGRAPHS}},
        {"id": "about-vision", "type": "rich_text", "props": {
            "heading": "What we're for", "paragraphs": [_VISION_STATEMENT, *_VISION_MISSION],
            "pending": True, "pending_label": "Drafted by the team, pending sign-off from the faculty coordinators.",
        }},  # fmt: skip
        {"id": "about-timeline", "type": "timeline", "props": {
            "heading": "How we got here", "entries": _TIMELINE_ENTRIES,
            "pending": True, "pending_label": "Milestones to be confirmed against E-Cell records.",
        }},  # fmt: skip
        {"id": "about-reach", "type": "rich_text", "props": {"heading": "Think beyond the campus", "paragraphs": [_REACH_LEDE, *_REACH_LAYERS]}},
        {"id": "about-spotlight", "type": "rich_text", "props": {"heading": "Who we're highlighting", "paragraphs": [_SPOTLIGHT_NOTE]}},
        {"id": "about-ecosystem", "type": "rich_text", "props": {"heading": "Seven verticals. One bigger picture.", "paragraphs": _ECOSYSTEM_PARAGRAPHS}},
        {"id": "about-identity", "type": "rich_text", "props": {"heading": "Not built by one. Built by everyone.", "paragraphs": _IDENTITY_PARAGRAPHS}},
        {"id": "about-dream-ecell", "type": "rich_text", "props": {"heading": "What does your E-Cell look like?", "paragraphs": _DREAM_ECELL_PARAGRAPHS}},
        {"id": "about-alumni", "type": "rich_text", "props": {"heading": "The classroom ends. The connection doesn't.", "paragraphs": _ALUMNI_PARAGRAPHS}},
        {"id": "about-closing", "type": "rich_text", "props": {"heading": "An E-Cell that can sustain its own ideas", "paragraphs": _CLOSING_PARAGRAPHS}},
        {"id": "about-join", "type": "rich_text", "props": {
            "heading": "Have an idea? Don't leave it in your notes app.",
            "paragraphs": ["Bring it to the conversation. Whether you want to create, collaborate, learn, experiment or simply explore what's possible — there's a place for you here."],
        }},  # fmt: skip
        {"id": "about-colophon", "type": "rich_text", "props": {"heading": "About this site", "paragraphs": _COLOPHON_PARAGRAPHS}},
        # mentors[]/testimonials[] are deliberately empty in the source
        # ("do not invent people/quotes") — nothing to migrate for them.
    ]  # fmt: skip
    return PageMigration(
        content_type="page", slug="about", title="About",
        seo={"title": "About", "description": "PSGIM E-Cell helps students through workshops, speaker sessions, a build-weekend format and an annual idea competition — a small crucible for innovation, run entirely by students.", "path": "/about/"},
        blocks=blocks,
    )  # fmt: skip


_STORY_PARAGRAPHS = [
    "PSGIM E-Cell started in 2019 as a handful of students who wanted the same thing the older IITs and NITs had — a room where you could bring a half-formed idea and leave with a next step.",
    "Seven years on, the Cell runs a repeating calendar of speaker sessions, build weekends and an annual Ideathon, and it represents PSGIM in the National Entrepreneurship Challenge run by E-Cell, IIT Bombay.",
    "This year the team is building its first proper website and a serious social-media presence.",
]
_VISION_STATEMENT = "To make entrepreneurship a natural career choice for every PSGIM student, and to build a campus where ideas are tested, mentored and taken to market."
_VISION_MISSION = [
    "Run speaker sessions, workshops and competitions every term, open to all departments.",
    "Pair every serious idea with a mentor and a route to a first customer.",
    "Turn up for NEC and other national challenges with real activity to show.",
    "Publish what happened — numbers, photos, outcomes — after every event.",
]
_TIMELINE_ENTRIES = [
    {"year": "2019", "what": "E-Cell founded by a student group at PSGIM."},
    {"year": "2021", "what": "First inter-department Ideathon; speaker series becomes monthly."},
    {"year": "2023", "what": "Bootcamp format introduced; first mentor panel assembled."},
    {"year": "2025", "what": "Cross-college collaborations begin; social accounts opened."},
    {"year": "2026", "what": "Registered for NEC; first website and outreach drive."},
]
_REACH_LEDE = "Great ideas rarely stay in one room. We're building connections across every layer of the entrepreneurial ecosystem — PSG students and initiatives, colleges across Coimbatore, Indian business and MBA communities, and universities and associations beyond."
_REACH_LAYERS = ["PSG", "Coimbatore", "India", "The world"]
_SPOTLIGHT_NOTE = "Founders, alumni and student ventures we want to feature here — nothing confirmed yet, so nothing is invented."
_ECOSYSTEM_PARAGRAPHS = [
    "Every vertical has a role. But no vertical exists in isolation. From creating experiences and building communities to managing collaborations and telling stories, our seven verticals work together to move the Cell forward.",
    "Different roles. Different strengths. One ecosystem. And sometimes, the best place to learn isn't the vertical you're assigned to.",
    "Your role is a starting point, not a boundary. Members are encouraged to explore beyond their assigned vertical — step into how an event comes together, collaborate on content, connect on partnerships, or learn something completely outside your role. Entrepreneurship is cross-functional by nature. So is learning.",
]
_IDENTITY_PARAGRAPHS = [
    "E-Cell PSGIM is being reimagined with a fresh identity, a new direction and an open invitation to contribute — because an ecosystem cannot be built from a single perspective.",
    "Every member brings something different — an idea, a skill, a question, a connection or simply the willingness to try. That is what makes our E-Cell ours.",
]
_DREAM_ECELL_PARAGRAPHS = [
    "We asked our members to imagine it — not the E-Cell someone else designed, their E-Cell. Dream E-Cell is a collective initiative where every member gets the opportunity to share what they believe the E-Cell could become.",
    "Ideas are documented. Perspectives are discussed. Possibilities are explored. Practical ideas are put into motion. Because the future of E-Cell shouldn't be decided by one voice — it should be built by many.",
]
_ALUMNI_PARAGRAPHS = [
    "Our alumni have walked through the classrooms we sit in today. They have made decisions, faced uncertainty, built careers, changed directions and learned things that cannot always be found in a textbook.",
    "The E-Cell Alumni Community aims to bring those experiences back into the conversation through interaction, insights, guidance and collaboration — past experiences, present conversations, future possibilities.",
]
_CLOSING_PARAGRAPHS = [
    "We don't just want to create initiatives. We want to create an ecosystem capable of supporting them. Through conclaves, collaborations and other initiatives, E-Cell PSGIM aims to explore sustainable ways of generating and reinvesting resources into the continued development of the club. Create value. Build sustainably. Keep moving.",
    "Ideas need consistency to become action. Every week brings a new question, every month a new milestone. Our seven verticals work towards clear goals, timelines and deliverables while regularly reviewing progress, challenges and opportunities — because an idea without execution remains an idea.",
    "We may not know exactly what E-Cell PSGIM will look like a year from now, and that's okay — because we are not trying to build something fixed. We are building something that can learn, adapt and grow: a space where students can experiment, where different perspectives can meet, where collaboration is encouraged, where failure becomes a lesson, and where an idea can start small and still matter. This is our E-Cell. And we're only getting started.",
]
_COLOPHON_PARAGRAPHS = [
    "Designed and built in-house by the PSGIM E-Cell technical team.",
    "Static pages — no backend, no tracking, edge-served for instant loads. All content lives in plain data files any team member can edit without touching the design.",
]
_PODCAST_NOTE = "Conversations with founders, mentors and alumni — episodes to be recorded and published once the format and guest line-up are locked in. Nothing is invented here yet."
_WEBSITE_AV_NOTE = "A short audio-visual piece introducing the Cell on this site — script and footage still in progress, so nothing is embedded here yet."


def migrate_origin() -> PageMigration:
    return PageMigration(
        content_type="page", slug="origin", title="Origin",
        seo={"title": "Origin", "description": _STORY_PARAGRAPHS[0], "path": "/origin/"},
        blocks=[{"id": "origin-story", "type": "rich_text", "props": {"heading": "The story", "paragraphs": _STORY_PARAGRAPHS}}],
    )  # fmt: skip


def migrate_vision_mission() -> PageMigration:
    return PageMigration(
        content_type="page", slug="vision-mission", title="Vision & Mission",
        seo={"title": "Vision & Mission", "description": _VISION_STATEMENT, "path": "/vision-mission/"},
        blocks=[{
            "id": "vm-vision", "type": "rich_text",
            "props": {
                "heading": "What we're for", "paragraphs": [_VISION_STATEMENT, *_VISION_MISSION],
                "pending": True, "pending_label": "Drafted by the team, pending sign-off from the faculty coordinators.",
            },
        }],
    )  # fmt: skip


def migrate_reach() -> PageMigration:
    return PageMigration(
        content_type="page", slug="reach", title="Reach",
        seo={"title": "Reach", "description": _REACH_LEDE, "path": "/reach/"},
        blocks=[{"id": "reach-body", "type": "rich_text", "props": {"heading": "Think beyond the campus", "paragraphs": [_REACH_LEDE, *_REACH_LAYERS]}}],
    )  # fmt: skip


def migrate_spotlight() -> PageMigration:
    return PageMigration(
        content_type="page", slug="spotlight", title="Spotlight",
        seo={"title": "Spotlight", "description": _SPOTLIGHT_NOTE, "path": "/spotlight/"},
        blocks=[{"id": "spotlight-body", "type": "rich_text", "props": {"heading": "Who we're highlighting", "paragraphs": [_SPOTLIGHT_NOTE]}}],
    )  # fmt: skip


def migrate_history() -> PageMigration:
    return PageMigration(
        content_type="page", slug="history", title="History",
        seo={"title": "History", "description": "How we got here", "path": "/history/"},
        blocks=[{
            "id": "history-timeline", "type": "timeline",
            "props": {
                "heading": "How we got here", "entries": _TIMELINE_ENTRIES,
                "pending": True, "pending_label": "Milestones to be confirmed against E-Cell records.",
            },
        }],
    )  # fmt: skip


def migrate_podcast() -> PageMigration:
    return PageMigration(
        content_type="page", slug="podcast", title="Podcast",
        seo={"title": "Podcast", "description": _PODCAST_NOTE, "path": "/podcast/"},
        blocks=[{"id": "podcast-body", "type": "rich_text", "props": {"heading": "The E-Cell Podcast", "paragraphs": [_PODCAST_NOTE]}}],
    )  # fmt: skip


def migrate_website_av() -> PageMigration:
    return PageMigration(
        content_type="page", slug="website-av", title="Website AV",
        seo={"title": "Website AV", "description": _WEBSITE_AV_NOTE, "path": "/website-av/"},
        blocks=[{"id": "website-av-body", "type": "rich_text", "props": {"heading": "Website AV", "paragraphs": [_WEBSITE_AV_NOTE]}}],
    )  # fmt: skip


# --- NEC (web/src/app/core/data/nec.data.ts) ---
# Deliberately decomposed into typed blocks (hero/rich_text/stats/card_grid/
# timeline), not one rich_text dump — per task §7, structure that exists in
# the source must remain individually addressable.


def migrate_nec() -> PageMigration:
    tracks = [
        {"title": "Basic Track", "body": "For teams whose E-Cell is new to NEC. Start with fundamental concepts and the essential tasks of running a Cell.", "tag": "Our track"},
        {"title": "Advanced Track", "body": "For returning teams. Deeper tasks, complex challenges, and higher stakes — the goal for PSGIM next cycle."},
        {"title": "Mentor Track", "body": "Guide other campuses while sharpening leadership and teaching skills. Open to senior E-Cell members."},
    ]  # fmt: skip
    incentives = [
        {"title": "Cash prizes", "body": "Winning teams across the challenge share a prize pool worth several lakhs, awarded by E-Cell, IIT Bombay."},
        {"title": "Official documentation", "body": "Get the PSGIM E-Cell formally documented and recognised by E-Cell, IIT Bombay."},
        {"title": "E-Summit passes", "body": "Free passes to E-Summit'26, Asia's largest student entrepreneurship summit."},
        {"title": "Networking", "body": "Build a network of student founders, mentors and investors across campuses."},
        {"title": "Mentorship", "body": "A mentor from E-Cell, IIT Bombay assigned to the team through the challenge."},
        {"title": "Resume value", "body": "Taking part in a pan-India challenge is a real line on every team member's CV."},
        {"title": "Certification", "body": "Certificates from Asia's largest student-run Entrepreneurship Cell."},
    ]  # fmt: skip
    timeline_entries = [
        {"year": "Jun", "what": "Head-start task & preliminary task launch."},
        {"year": "Jul 31", "what": "Registration deadline — register before this for the early-bird bonus."},
        {"year": "Aug – Oct", "what": "Weekly tasks; mentor allotted after the preliminary task is submitted."},
        {"year": "Oct 18", "what": "Submission window closes for all tasks."},
        {"year": "Nov", "what": "Advanced track and national finals at IIT Bombay."},
        {"year": "Dec", "what": "Results announced at E-Summit'26."},
    ]  # fmt: skip
    faq_cards = [
        {"title": "How do I join the PSGIM NEC team?", "body": "Fill the interest form linked below. The team lead adds you to the roster on the NEC portal once the campus team is confirmed."},
        {"title": "Do I need a startup idea to join?", "body": "No. Most NEC tasks are about running the Cell — events, outreach, documentation. Ideas help, but they are not a requirement."},
        {"title": "What is the time commitment?", "body": "Expect a few hours a week across the six months, heavier around task deadlines and events."},
        {"title": "Basic or Advanced track — which are we on?", "body": "Basic, this cycle. The portal auto-assigns the track from the E-Cell's age; PSGIM moves to Advanced once eligible."},
        {"title": "Can first-years join?", "body": "Yes — the team is open to both years and every department."},
    ]  # fmt: skip
    blocks = [
        {"id": "nec-hero", "type": "hero", "props": {
            "heading": "PSGIM E-Cell at National Entrepreneurship Challenge",
            "description": "PSGIM E-Cell is competing in NEC 2026 — E-Cell IIT Bombay's pan-India challenge to build an actively functioning Entrepreneurship Cell on every campus.",
        }},  # fmt: skip
        {"id": "nec-about", "type": "rich_text", "props": {
            "heading": "What is NEC?",
            "paragraphs": [
                "India's largest student entrepreneurship challenge",
                "An Entrepreneurship Cell matters to a college because it builds students' entrepreneurial spirit — and NEC is the platform that helps a college turn that into an actively functioning E-Cell.",
                "NEC is a roughly six-month competition run by E-Cell, IIT Bombay. Teams are given a series of tasks that are essential for any Entrepreneurship Cell to run smoothly, and are mentored through them.",
                "PSGIM E-Cell is registered for the 2026 cycle. This page is where our campus team tracks the drive and where new members sign up.",
            ],
        }},  # fmt: skip
        {"id": "nec-goal", "type": "rich_text", "props": {
            "heading": "Our goal",
            "paragraphs": [
                "Entrepreneurship for every student, every idea",
                "We want NEC to leave PSGIM with a stronger, better-documented E-Cell — a repeatable calendar, a mentor bench, and a public record of what the Cell does.",
                "Just as importantly, we want more students on campus to feel that starting something is not rocket science — that there is a room to bring an idea to, and people who will help take it forward.",
            ],
        }},  # fmt: skip
        {"id": "nec-stats", "type": "stats", "props": {"items": [
            {"value": "23", "label": "Team members", "count": 23},
            {"value": "6 mo", "label": "Challenge length", "count": 6, "suffix": " mo"},
            {"value": "8+", "label": "Tasks ahead", "count": 8, "suffix": "+"},
            {"value": "2019", "label": "E-Cell since", "count": None},
        ]}},  # fmt: skip
        {"id": "nec-tracks", "type": "card_grid", "props": {"heading": "Tracks", "cards": tracks}},
        {"id": "nec-incentives", "type": "card_grid", "props": {"heading": "What you get", "cards": incentives}},
        {"id": "nec-timeline", "type": "timeline", "props": {
            "heading": "Timeline", "entries": timeline_entries,
            "pending": True, "pending_label": "Dates to be confirmed against the official NEC portal.",
        }},  # fmt: skip
        {"id": "nec-guidelines", "type": "rich_text", "props": {"heading": "Guidelines", "paragraphs": [
            "NEC is a 5–6 month challenge focused on building and strengthening your own Entrepreneurship Cell.",
            "PSGIM enters one team for the institute — only one team per college is allowed.",
            "Our team runs on the Basic Track this cycle; the track is auto-assigned from the E-Cell's age on the NEC portal.",
            "Each team has a minimum of 5 and a maximum of 25 members — individuals cannot take part alone.",
            "Registering before the deadline earns an early-bird bonus; the task window still closes on the fixed date.",
        ]}},  # fmt: skip
        {"id": "nec-faq", "type": "card_grid", "props": {"heading": "FAQ", "columns": 2, "cards": faq_cards}},
        {"id": "nec-join", "type": "rich_text", "props": {
            "heading": "Join our NEC team",
            # No real interest-form URL exists yet (site.data.ts's
            # contact.interestForm is Pending<null>) — represented as text,
            # not an invented CTA link.
            "paragraphs": ["Bring an idea, or come find one", "Open to every department and both years. Fill the interest form and the team lead will be in touch before the next task."],
        }},  # fmt: skip
    ]
    return PageMigration(
        content_type="nec", slug="nec", title="NEC 2026",
        seo={"title": "NEC 2026", "description": "PSGIM E-Cell's National Entrepreneurship Challenge 2026 drive.", "path": "/nec/"},
        blocks=blocks, detail_fields={"edition": "2026"},
    )  # fmt: skip


# --- Events (web/src/app/core/data/events.data.ts) ---
# Each EventItem becomes its own ContentItem(EVENT) + EventDetail, so the
# dynamic_query mechanism (apps.content.dynamic_queries) has real published
# rows to list — not just the mechanism proven against test fixtures.

_EVENT_SOURCE = [
    {"id": "founders-on-campus-sep", "title": "Founders on Campus — bootstrapped SaaS from Coimbatore", "date": "2026-09-18", "time": "6:00 PM", "venue": "Auditorium", "audience": "Open to all", "summary": "A Coimbatore founder on going from a college side-project to a profitable software business without raising a rupee.", "registration": None, "pending": True},
    {"id": "bootcamp-oct", "title": "48-Hour Bootcamp — problem statements from local industry", "date": "2026-10-04", "endDate": "2026-10-06", "time": "Fri – Sun", "venue": None, "audience": "Teams of 4", "summary": "A full build weekend. Problem statements from local manufacturers and D2C brands. Mentors on site throughout.", "registration": "open", "pending": True},
    {"id": "nec-kickoff", "title": "NEC kick-off & orientation", "date": "2026-08-22", "time": None, "venue": "Seminar Hall", "audience": None, "summary": "The campaign team and open attendees walked through the NEC task list, timeline and how to get involved.", "turnout": "~120 attended", "registration": None, "pending": True},
    {"id": "idea-clinic-jul", "title": "Idea Clinic — one-on-one feedback with mentors", "date": "2026-07-30", "time": None, "venue": None, "audience": "14 teams", "summary": "Fourteen teams, twenty-minute slots, one written next step each. Three were fast-tracked to the Bootcamp.", "turnout": "~45 attended", "registration": None, "pending": True},
    {"id": "ideathon-2026-finals", "title": "Ideathon 2026 finals", "date": "2026-03-12", "time": None, "venue": None, "audience": "₹25k prize pool", "summary": "Nine teams pitched live to a panel of alumni and investors. The top three took a mentoring block into the summer.", "turnout": "~200 attended", "registration": None, "pending": True},
]  # fmt: skip


def _parse_iso_date_utc(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value).replace(tzinfo=UTC)


def migrate_events() -> list[PageMigration]:
    migrations = []
    for ev in _EVENT_SOURCE:
        blocks = [{"id": "event-hero", "type": "hero", "props": {"heading": ev["title"], "description": ev["summary"]}}]
        migrations.append(
            PageMigration(
                content_type="event", slug=ev["id"], title=ev["title"],
                seo={"title": ev["title"], "description": ev["summary"], "path": f"/events/{ev['id']}/"},
                blocks=blocks,
                detail_fields={
                    "starts_at": _parse_iso_date_utc(ev["date"]),
                    "ends_at": _parse_iso_date_utc(ev.get("endDate")),
                    "venue": ev.get("venue") or "",
                    "summary": ev["summary"],
                    "time_label": ev.get("time") or "",
                    "audience": ev.get("audience") or "",
                    "registration_status": ev.get("registration") or "",
                    "turnout": ev.get("turnout") or "",
                    "pending": ev.get("pending", False),
                },
            )
        )
    return migrations


# --- Blogs (web/src/app/core/data/blogs.data.ts) ---

_BLOG_SOURCE = [
    {"id": "sample-blog-1", "title": "Why bootstrapped founders beat pitch decks", "author": "E-Cell writing team", "url": None, "summary": "A look at how Coimbatore-area founders built revenue before they built slides.", "pending": True},
]  # fmt: skip


def migrate_blogs() -> list[PageMigration]:
    migrations = []
    for post in _BLOG_SOURCE:
        blocks = [{"id": "blog-hero", "type": "hero", "props": {"heading": post["title"], "description": post["summary"]}}]
        migrations.append(
            PageMigration(
                content_type="blog", slug=post["id"], title=post["title"],
                seo={"title": post["title"], "description": post["summary"], "path": f"/blogs/{post['id']}/"},
                blocks=blocks,
                detail_fields={
                    "author_name": post["author"],
                    "excerpt": post["summary"],
                    "external_url": post.get("url") or "",
                    "pending": post.get("pending", False),
                },
            )
        )
    return migrations


# --- Events / Blogs *listing* pages ---
# The individual event/blog ContentItems above are the data `dynamic_query`
# lists; these are the actual `/events` and `/blogs` route content — each a
# `page` ContentItem whose blocks are `dynamic_query` blocks, so the
# existing pages become genuinely CMS-editable (heading/copy), not just a
# hardcoded Angular route. Ordering, the upcoming/past split, and the empty
# states are preserved exactly by the allowlisted resolvers themselves
# (apps.content.dynamic_queries) and `BlockDynamicQueryComponent`.


def migrate_events_page() -> PageMigration:
    blocks = [
        {"id": "events-hero", "type": "hero", "props": {"heading": "Events", "description": "Sample entries while the calendar is being confirmed with the office. Dates, venues and turnout are illustrative."}},
        {"id": "events-upcoming", "type": "dynamic_query", "props": {
            "heading": "What's next", "query": "published_events_upcoming", "sort": "starts_at_asc", "empty_label": "No upcoming events right now.",
        }},  # fmt: skip
        {"id": "events-past", "type": "dynamic_query", "props": {
            "heading": "What happened", "query": "published_events_past", "sort": "starts_at_desc", "empty_label": "No past events recorded yet.",
        }},  # fmt: skip
    ]  # fmt: skip
    return PageMigration(
        content_type="page", slug="events", title="Events",
        seo={"title": "Events", "description": "Sample entries while the calendar is being confirmed with the office. Dates, venues and turnout are illustrative.", "path": "/events/"},
        blocks=blocks,
    )  # fmt: skip


def migrate_blogs_page() -> PageMigration:
    blocks = [
        {"id": "blogs-hero", "type": "hero", "props": {"heading": "Blogs", "description": "Weekly blogs written by the team on entrepreneurship, posted to our blog portal. Sample entries while the archive is being confirmed."}},
        {"id": "blogs-latest", "type": "dynamic_query", "props": {
            "heading": "Latest posts", "query": "published_blogs", "sort": "published_at_desc", "empty_label": "No blog posts yet.",
        }},  # fmt: skip
    ]  # fmt: skip
    return PageMigration(
        content_type="page", slug="blogs", title="Blogs",
        seo={"title": "Blogs", "description": "Weekly blogs written by the team on entrepreneurship, posted to our blog portal. Sample entries while the archive is being confirmed.", "path": "/blogs/"},
        blocks=blocks,
    )  # fmt: skip


PAGE_MIGRATIONS: list[PageMigration] = [
    migrate_home(),
    migrate_gallery(),
    migrate_team(),
    migrate_initiatives(),
    migrate_roadmap(),
    migrate_about(),
    migrate_origin(),
    migrate_vision_mission(),
    migrate_reach(),
    migrate_spotlight(),
    migrate_history(),
    migrate_podcast(),
    migrate_website_av(),
    migrate_nec(),
    migrate_events_page(),
    migrate_blogs_page(),
    *migrate_events(),
    *migrate_blogs(),
]
