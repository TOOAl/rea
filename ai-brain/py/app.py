#!/usr/bin/env python3
"""External-agent microservice (stage 2).

Roles delegated OUT of the brain: corpus retrieval (/collect),
eval scoring (/score), reflection critique (/reflect).
Retrieval uses character bigram containment — robust for Korean, where
whitespace tokenization fails. All logic here is replaceable.
"""
import json
import os
import re
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

CORPUS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "corpus.json")


def bigrams(s: str) -> set[str]:
    return {s[i : i + 2] for i in range(len(s) - 1)}


def similarity(a: str, b: str) -> float:
    # Containment: overlap over the smaller set — robust when a short
    # query is matched against longer documents.
    A, B = bigrams(a), bigrams(b)
    if not A or not B:
        return 0.0
    return len(A & B) / min(len(A), len(B))


def load_corpus() -> list[dict]:
    with open(CORPUS_PATH, encoding="utf-8") as f:
        return json.load(f)


def jaccard_words(a: str, b: str) -> float:
    ta = set(re.findall(r"\w+", a.lower()))
    tb = set(re.findall(r"\w+", b.lower()))
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


class Handler(BaseHTTPRequestHandler):
    def _json(self, code: int, obj: dict) -> None:
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("content-type", "application/json; charset=utf-8")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if urlparse(self.path).path == "/health":
            self._json(200, {"status": "ok"})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        length = int(self.headers.get("content-length", 0))
        data = json.loads(self.rfile.read(length) or b"{}")

        if path == "/collect":
            # L3 foundation: retrieve top-K relevant evidence for the query.
            query = data.get("query", "")
            ranked = sorted(
                load_corpus(), key=lambda d: similarity(query, d["text"]), reverse=True
            )
            hits = [d for d in ranked if similarity(query, d["text"]) >= 0.15][:5]
            return self._json(200, {"evidence": hits})

        if path == "/score":
            expected, actual = data.get("expected", ""), data.get("actual", "")
            score = 1.0 if expected and expected in actual else jaccard_words(
                expected, actual
            )
            return self._json(200, {"score": round(score, 3), "method": "substring-or-jaccard"})

        if path == "/reflect":
            return self._json(
                200,
                {
                    "critique": "template critique: verify citations and unknowns (LLM critic not yet wired)",
                    "issues": [],
                },
            )

        self._json(404, {"error": "not found"})

    def log_message(self, *args) -> None:  # keep demo output clean
        pass


if __name__ == "__main__":
    HTTPServer(("0.0.0.0", 8787), Handler).serve_forever()
