"""Every /api/v1 view declares its permission (docs/12 "Permission declaration")."""

import pytest
from django.urls import URLPattern, URLResolver, get_resolver


def _walk(patterns, prefix=""):
    for p in patterns:
        if isinstance(p, URLResolver):
            yield from _walk(p.url_patterns, prefix + str(p.pattern))
        elif isinstance(p, URLPattern):
            yield prefix + str(p.pattern), p.callback


def test_every_api_view_declares_permissions():
    undeclared = []
    for route, callback in _walk(get_resolver().url_patterns):
        cls = getattr(callback, "cls", None) or getattr(callback, "view_class", None)
        if cls is None:
            undeclared.append(f"{route} (function view)")
            continue
        if getattr(cls, "public", False):
            continue
        perms = getattr(cls, "required_perms", None)
        methods = [m.upper() for m in cls.http_method_names if hasattr(cls, m) and m not in ("options", "head")]
        missing = [m for m in methods if not perms or (m not in perms and "*" not in perms)]
        if missing:
            undeclared.append(f"{route} {missing}")
    assert not undeclared, "Views without a permission declaration:\n" + "\n".join(undeclared)


@pytest.mark.django_db
def test_schema_generates_and_is_not_public_outside_dev(org):
    from conftest import client_for

    assert client_for(None).get("/api/v1/schema").status_code in (401, 403)
    r = client_for(org["member_a"]).get("/api/v1/schema")
    assert r.status_code == 200
    assert b"/api/v1/auth/login" in r.content
