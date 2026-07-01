from abc import ABC, abstractmethod

from app.schemas.invoice import InvoiceDraft


class UnsupportedInvoiceFormatError(ValueError):
    """Raised when no registered parser can handle the uploaded file."""


class InvoiceParser(ABC):
    template: str

    @abstractmethod
    def can_parse(self, text: str) -> bool: ...

    @abstractmethod
    def parse(self, file_bytes: bytes) -> InvoiceDraft: ...
