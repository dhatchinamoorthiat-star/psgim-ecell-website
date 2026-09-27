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


def _protected_routes():
    """Every (method, concrete URL) of a non-public /api/v1 view, generated from the URL conf."""
    import uuid

    routes = []
    for route, callback in _walk(get_resolver().url_patterns):
        cls = getattr(callback, "cls", None) or getattr(callback, "view_class", None)
        if cls is None or getattr(cls, "public", False):
            continue
        url = "/" + route.replace("<uuid:pk>", str(uuid.uuid4()))
        for method in cls.required_perms:
            routes.append((method.lower(), url))
    return routes


@pytest.mark.django_db
@pytest.mark.parametrize(("method", "url"), _protected_routes())
def test_every_protected_endpoint_requires_a_session(method, url):
    from rest_framework.test import APIClient

    response = getattr(APIClient(), method)(url, {}, format="json")
    assert response.status_code == 401, f"{method.upper()} {url} -> {response.status_code}"


def test_sweep_covers_the_known_endpoints():
    urls = {u for _, u in _protected_routes()}
    for fragment in [
        "users",
        "role-assignments",
        "verticals",
        "memberships",
        "academic-years",
        "audit",
        "settings",
        "auth/me",
        "auth/logout",
    ]:
        assert any(fragment in u for u in urls), fragment
