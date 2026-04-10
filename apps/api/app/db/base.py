from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Shared SQLAlchemy declarative base.

    Every future ORM model in Step C5 will inherit from this.
    We define it now so the DB layer has one canonical metadata root.
    """

    pass
