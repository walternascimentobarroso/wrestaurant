import json
from pathlib import Path

from app.services.invoice_parsers import detect_and_parse

_BACKEND_DIR = Path(__file__).resolve().parents[1]
_FIXTURE_CANDIDATES = (
    _BACKEND_DIR.parent / "docs" / "invoice-import" / "fixtures",
    _BACKEND_DIR / "tests" / "fixtures",
)
FIXTURES_DIR = next(path for path in _FIXTURE_CANDIDATES if path.exists())
PDF_FIXTURE = FIXTURES_DIR / "makro-braga-2026-06-28.pdf"
EXPECTED_JSON = FIXTURES_DIR / "makro-braga-2026-06-28.expected.json"


def test_makro_fixture_matches_expected():
    pdf_bytes = PDF_FIXTURE.read_bytes()
    draft = detect_and_parse(pdf_bytes)
    expected = json.loads(EXPECTED_JSON.read_text())

    assert draft.template == expected["template"]
    assert draft.documentId == expected["documentId"]
    assert draft.invoiceNumber == expected["invoiceNumber"]
    assert draft.supplier.taxId == expected["supplier"]["taxId"]
    assert draft.supplier.legalName == expected["supplier"]["legalName"]
    assert draft.supplier.storeName == expected["supplier"]["storeName"]
    assert draft.totals.subtotalExVat == expected["totals"]["subtotalExVat"]
    assert draft.totals.totalIncVat == expected["totals"]["totalIncVat"]
    assert draft.totals.currency == expected["totals"]["currency"]
    assert len(draft.items) == len(expected["items"])

    for actual_item, expected_item in zip(draft.items, expected["items"], strict=True):
        assert actual_item.lineNumber == expected_item["lineNumber"]
        assert actual_item.externalCode == expected_item["externalCode"]
        assert actual_item.description == expected_item["description"]
        assert actual_item.packType == expected_item["packType"]
        assert actual_item.unitPrice == expected_item["unitPrice"]
        assert actual_item.quantity == expected_item["quantity"]
        assert actual_item.totalPrice == expected_item["totalPrice"]
        assert actual_item.vatCode == expected_item["vatCode"]
        assert actual_item.weightKg == expected_item.get("weightKg")

    assert len(draft.skippedLines) == len(expected["skippedLines"])
    for actual_skip, expected_skip in zip(draft.skippedLines, expected["skippedLines"], strict=True):
        assert actual_skip.reason == expected_skip["reason"]
        assert actual_skip.raw == expected_skip["raw"]
