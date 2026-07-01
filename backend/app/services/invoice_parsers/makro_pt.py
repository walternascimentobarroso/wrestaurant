import io
import re
from datetime import datetime

import pdfplumber

from app.schemas.invoice import (
    InvoiceDraft,
    InvoiceItemDraft,
    InvoiceSkippedLineDraft,
    InvoiceSupplierDraft,
    InvoiceTotalsDraft,
)
from app.services.invoice_parsers.base import InvoiceParser

PACK_TYPES = ("PC", "CA", "KG", "BG", "BX", "BT", "SW")
PACK_PATTERN = re.compile(r"\s(" + "|".join(PACK_TYPES) + r")\s")
PRODUCT_LINE_PATTERN = re.compile(r"^(\d{13})\s+(.+)$")
SUBTOTAL_TOLERANCE_EUR = 0.50

_SPACING_FIXES = (
    ("M AKRO", "MAKRO"),
    ("N º", "Nº"),
    ("F actura", "Factura"),
    ("R UA", "RUA"),
    ("G ROSSISTA", "GROSSISTA"),
    ("C apital", "Capital"),
    ("I NSC", "INSC"),
    ("N o.", "No."),
    ("L ocal", "Local"),
    ("T ransacção", "Transacção"),
    ("W ALTER", "WALTER"),
    ("V álido", "Válido"),
    ("A s ", "As "),
    ("O s ", "Os "),
    ("D inheiro", "Dinheiro"),
    ("V :", "V:"),
)


def _normalize_pdf_text(text: str) -> str:
    normalized = text
    for old, new in _SPACING_FIXES:
        normalized = normalized.replace(old, new)
    return re.sub(r"N\s+º", "Nº", normalized)


def _parse_pt_decimal(value: str) -> float:
    cleaned = value.strip().replace(" ", "")
    if "," in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    return float(cleaned)


def _parse_numeric_tail(numeric_tail: str) -> dict[str, float | str] | None:
    tail = re.sub(r"\s+[PV]$", "", numeric_tail.strip())
    tail = re.sub(r"\s+\d{5}$", "", tail)
    parts = tail.split()
    if len(parts) < 6:
        return None

    pr_unit, unit_kg, unit_price, quantity, total_price, vat_code = parts[-6:]
    return {
        "pr_unit": _parse_pt_decimal(pr_unit),
        "unit_kg": _parse_pt_decimal(unit_kg),
        "unit_price": _parse_pt_decimal(unit_price),
        "quantity": _parse_pt_decimal(quantity),
        "total_price": _parse_pt_decimal(total_price),
        "vat_code": vat_code,
    }


def _classify_skipped_line(line: str) -> str | None:
    stripped = line.strip()
    if not stripped or set(stripped) <= {"-", " "}:
        return "metadata"

    upper = stripped.upper()
    if stripped.startswith("+"):
        if "DEPOSITO" in upper:
            return "deposit"
        return "tax_line"
    if "DEPOSITO" in upper:
        return "deposit"
    if "TAXA IEC" in upper or "IEC BEB" in upper:
        return "tax_line"
    if "CAMPANHA" in upper or "DESCONTO" in upper:
        return "discount"
    if "VALOR A TRANSPORTAR" in upper or "VALOR TRANSPORTADO" in upper:
        return "metadata"
    if "Nº DE ARTIGOS" in upper or upper.startswith("VALOR TOTAL"):
        return "metadata"
    if "CÓDIGO ARTIGO" in upper or "CODIGO ARTIGO" in upper:
        return "metadata"
    if stripped.startswith("MAKRO CASH") or stripped.startswith("RUA QUINTA"):
        return "metadata"
    if "DATA DA VENDA" in upper or "Nº CONTRIBUINTE" in upper:
        return "metadata"
    if "TOTAL S/ IVA" in upper or "VALOR LIQ." in upper:
        return "metadata"
    if "DINHEIRO" in upper or "A DEVOLVER" in upper:
        return "metadata"
    return None


def _extract_global_discount(text: str) -> float:
    normalized = _normalize_pdf_text(text)
    match = re.search(r"Desconto total\s+([\d,]+)", normalized)
    if match is None:
        return 0.0
    return _parse_pt_decimal(match.group(1))


def _extract_header(text: str) -> dict[str, str]:
    normalized = _normalize_pdf_text(text)

    tax_id_match = re.search(r"Nº Contribuinte:\s*(\d+)", normalized)
    atcud_match = re.search(r"ATCUD:(\S+)", normalized)
    invoice_match = re.search(r"Factura Nº\s+(.+?)(?:\s+nf/C|\s*$)", normalized, re.MULTILINE)
    date_match = re.search(r"Data da venda\s+(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2})", normalized)
    supplier_match = re.search(
        r"MAKRO CASH & CARRY PORTUGAL, S\.A\.\s+(MAKRO\s+\S+)",
        normalized,
    )
    subtotal_match = re.search(r"Total s/ IVA:\s*([\d,]+)", normalized)
    total_match = re.search(r"Valor Total\s+([\d,]+)", normalized)

    missing = [
        name
        for name, match in (
            ("tax_id", tax_id_match),
            ("atcud", atcud_match),
            ("invoice_number", invoice_match),
            ("issue_date", date_match),
            ("supplier_store", supplier_match),
            ("total_inc_vat", total_match),
        )
        if match is None
    ]
    if missing:
        msg = f"Não foi possível extrair campos do cabeçalho MAKRO: {', '.join(missing)}"
        raise ValueError(msg)

    return {
        "tax_id": tax_id_match.group(1),
        "atcud": atcud_match.group(1),
        "invoice_number": invoice_match.group(1),
        "issue_date": date_match.group(1),
        "supplier_store": supplier_match.group(1),
        "subtotal_ex_vat": subtotal_match.group(1) if subtotal_match else "",
        "total_inc_vat": total_match.group(1),
    }


def _parse_product_line(line: str) -> InvoiceItemDraft | InvoiceSkippedLineDraft | None:
    stripped = line.strip()
    if not stripped:
        return None

    skip_reason = _classify_skipped_line(stripped)
    if skip_reason:
        return InvoiceSkippedLineDraft(reason=skip_reason, raw=stripped)

    product_match = PRODUCT_LINE_PATTERN.match(stripped)
    if not product_match:
        return InvoiceSkippedLineDraft(reason="metadata", raw=stripped)

    _, rest = product_match.groups()
    pack_matches = list(PACK_PATTERN.finditer(rest))
    if not pack_matches:
        return InvoiceSkippedLineDraft(reason="metadata", raw=stripped)

    pack_match = pack_matches[-1]
    pack_type = pack_match.group(1)
    description = rest[: pack_match.start()].strip()
    if pack_type == "KG":
        description = re.sub(r"\s[A-Z]{2}$", "", description)
    if pack_type == "SW" and not description.endswith(" SW"):
        description = f"{description} SW"

    numeric = _parse_numeric_tail(rest[pack_match.end() :])
    if numeric is None:
        return InvoiceSkippedLineDraft(reason="metadata", raw=stripped)

    weight_kg = None
    if pack_type == "KG" and numeric["unit_kg"] != 1:
        weight_kg = numeric["unit_kg"]

    return InvoiceItemDraft(
        lineNumber=0,
        externalCode=product_match.group(1),
        description=description,
        packType=pack_type,
        unitPrice=numeric["unit_price"],
        quantity=numeric["quantity"],
        totalPrice=numeric["total_price"],
        vatCode=str(numeric["vat_code"]),
        weightKg=weight_kg,
    )


class MakroPortugalParser(InvoiceParser):
    template = "makro_pt"

    def can_parse(self, text: str) -> bool:
        normalized = _normalize_pdf_text(text)
        return "MAKRO" in normalized and "Nº Contribuinte:" in normalized

    def parse(self, file_bytes: bytes) -> InvoiceDraft:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)

        header = _extract_header(text)
        items: list[InvoiceItemDraft] = []
        skipped_lines: list[InvoiceSkippedLineDraft] = []

        for line in text.splitlines():
            parsed = _parse_product_line(line)
            if parsed is None:
                continue
            if isinstance(parsed, InvoiceSkippedLineDraft):
                if parsed.reason != "metadata":
                    skipped_lines.append(parsed)
                continue
            parsed.lineNumber = len(items) + 1
            items.append(parsed)

        subtotal_ex_vat = (
            _parse_pt_decimal(header["subtotal_ex_vat"]) if header["subtotal_ex_vat"] else None
        )
        total_inc_vat = _parse_pt_decimal(header["total_inc_vat"])
        items_total = sum(item.totalPrice for item in items)
        discount_total = _extract_global_discount(text)
        tolerance = SUBTOTAL_TOLERANCE_EUR + discount_total
        if subtotal_ex_vat is not None and abs(items_total - subtotal_ex_vat) > tolerance:
            msg = (
                f"Soma dos itens ({items_total:.2f}) diverge do subtotal "
                f"({subtotal_ex_vat:.2f}) além da tolerância."
            )
            raise ValueError(msg)

        issue_date = datetime.strptime(header["issue_date"], "%d-%m-%Y %H:%M")

        return InvoiceDraft(
            template=self.template,
            documentId=header["atcud"],
            invoiceNumber=header["invoice_number"],
            issueDate=issue_date,
            supplier=InvoiceSupplierDraft(
                legalName="MAKRO CASH & CARRY PORTUGAL, S.A.",
                storeName=header["supplier_store"],
                taxId=header["tax_id"],
            ),
            items=items,
            totals=InvoiceTotalsDraft(
                subtotalExVat=subtotal_ex_vat,
                totalIncVat=total_inc_vat,
                currency="EUR",
            ),
            skippedLines=skipped_lines,
        )
