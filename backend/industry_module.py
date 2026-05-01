"""
SafeBase industry registry — single source of truth on the backend.
Mirrors /app/frontend/src/data/industries.config.js for the *selectable* list;
we intentionally keep the two in sync by shape (slug, name, nav, icon) only,
not by copy — the frontend owns marketing copy, the backend owns compliance
defaults (seed doc types, seed credentials, seed risks).

Data shape per industry:
  {
    slug, name, nav, icon,
    default_doc_types: [doc_type_id, ...],   # what ships in their library
    hero_signal: {pulse_fallback, featured}, # shown on marketing pages when
                                             # real aggregation has < 3 users
  }

Existing 31 doc types stay universal (registered with no `industries` key so
they show to everyone). NEW industry-specific doc types carry an
`industries: [...]` filter enforced in docs_module.list_types().
"""
from __future__ import annotations

INDUSTRIES = {
    "trades": {
        "slug": "trades",
        "name": "Trades and Construction",
        "nav": "Trades",
        "icon": "HardHat",
        "hero_signal": {
            "pulse_fallback": "1,247 trade businesses onboarded this quarter",
            "featured": "Featured this month: Sydney builder passes WorkSafe audit in 92 seconds — no binders, no scramble",
        },
    },
    "hospitality": {
        "slug": "hospitality",
        "name": "Hospitality",
        "nav": "Hospitality",
        "icon": "ChefHat",
        "hero_signal": {
            "pulse_fallback": "247 venues joined this week — 43 cafes, 61 restaurants, 29 bars, 114 others",
            "featured": "Featured this month: Brisbane cafe group cuts council inspection prep from 6 hours to 4 minutes",
        },
    },
    "transport": {
        "slug": "transport",
        "name": "Transport and Logistics",
        "nav": "Transport",
        "icon": "Truck",
        "hero_signal": {
            "pulse_fallback": "83 operators onboarded this month · 3 multi-chain freight groups this week",
            "featured": "Featured this month: Regional freight operator generates full CoR Management Plan in 14 minutes",
        },
    },
    "healthcare": {
        "slug": "healthcare",
        "name": "Healthcare and Aged Care",
        "nav": "Healthcare",
        "icon": "HeartStraight",
        "hero_signal": {
            "pulse_fallback": "196 practices + aged care providers joined this month — ahead of Aged Care Act 2024 go-live",
            "featured": "Featured this month: Allied health group tracks 47 AHPRA registrations across 4 clinics — zero lapses",
        },
    },
    "retail": {
        "slug": "retail",
        "name": "Retail",
        "nav": "Retail",
        "icon": "ShoppingBag",
        "hero_signal": {
            "pulse_fallback": "312 retailers + 4 franchise networks onboarded this week",
            "featured": "Featured this month: 112-location franchise group inducts 840 seasonal casuals in 48 hours via QR",
        },
    },
}

VALID_INDUSTRIES = set(INDUSTRIES.keys())
DEFAULT_INDUSTRY = "trades"


def is_valid(slug: str | None) -> bool:
    return slug in VALID_INDUSTRIES


def coerce(slug: str | None) -> str:
    """Return a valid industry slug or DEFAULT_INDUSTRY."""
    return slug if slug in VALID_INDUSTRIES else DEFAULT_INDUSTRY
