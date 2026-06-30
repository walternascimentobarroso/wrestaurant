from enum import StrEnum


class ProductKind(StrEnum):
    MENU = "menu"
    INGREDIENT = "ingredient"


class StockUnit(StrEnum):
    UN = "un"
    ML = "ml"
    CL = "cl"
    L = "L"
    G = "g"
    KG = "kg"


class TableCategory(StrEnum):
    COUNTER = "counter"
    INDOOR = "indoor"
    OUTDOOR = "outdoor"


class TableStatus(StrEnum):
    FREE = "free"
    OCCUPIED = "occupied"


class PaymentMethod(StrEnum):
    CASH = "cash"
    CARD = "card"


class StockMovementType(StrEnum):
    SALE = "sale"
    ADJUSTMENT = "adjustment"
    RESTOCK = "restock"


class PayableStatus(StrEnum):
    PENDING = "pending"
    PAID = "paid"
    CANCELLED = "cancelled"


class PayableRecurrence(StrEnum):
    NONE = "none"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    SEMIANNUAL = "semiannual"
    YEARLY = "yearly"


class ChecklistType(StrEnum):
    OPENING = "opening"
    CLOSING = "closing"


class CurrencyCode(StrEnum):
    BRL = "BRL"
    EUR = "EUR"
    USD = "USD"
