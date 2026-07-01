import re
import unicodedata

_NAME_SUFFIXES = (
    r"\bs\.a\.?\b",
    r"\bltda\.?\b",
    r"\bsa\b",
    r"\bgrossista\b",
)


def normalize_tax_id(value: str) -> str:
    """Remove prefixo PT, pontos, hífens — retorna só dígitos."""
    cleaned = value.strip().upper()
    if cleaned.startswith("PT"):
        cleaned = cleaned[2:]
    return re.sub(r"\D", "", cleaned)


def normalize_name(value: str) -> str:
    """Lowercase, sem acentos, remove LTDA/SA/S.A./GROSSISTA, colapsa espaços."""
    normalized = unicodedata.normalize("NFKD", value)
    without_accents = "".join(char for char in normalized if not unicodedata.combining(char))
    lowered = without_accents.lower()

    for suffix in _NAME_SUFFIXES:
        lowered = re.sub(suffix, "", lowered, flags=re.IGNORECASE)

    without_punctuation = re.sub(r"[^\w\s]", " ", lowered)
    return re.sub(r"\s+", " ", without_punctuation).strip()
