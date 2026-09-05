"""Tiny helpers for asserting on the {success, message, data} envelope."""


def envelope(resp):
    body = resp.get_json()
    assert body is not None, f"non-JSON response ({resp.status_code}): {resp.data!r}"
    return body


def data_of(resp):
    body = envelope(resp)
    assert body.get("success") is True, f"expected success envelope, got {body}"
    return body["data"]


def error_of(resp):
    body = envelope(resp)
    assert body.get("success") is False, f"expected error envelope, got {body}"
    return body["error"]["code"]
