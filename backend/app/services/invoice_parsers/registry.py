import io

import pdfplumber

from app.schemas.invoice import InvoiceDraft
from app.services.invoice_parsers.base import InvoiceParser, UnsupportedInvoiceFormatError
from app.services.invoice_parsers.makro_pt import MakroPortugalParser

PARSERS: list[InvoiceParser] = [MakroPortugalParser()]


def extract_raw_text(file_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def detect_and_parse(file_bytes: bytes) -> InvoiceDraft:
    text = extract_raw_text(file_bytes)
    for parser in PARSERS:
        if parser.can_parse(text):
            return parser.parse(file_bytes)
    raise UnsupportedInvoiceFormatError(
        "Formato de fatura não reconhecido. Envie um PDF de fornecedor suportado.",
    )
