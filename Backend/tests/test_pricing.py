"""Total calculation.

These are the tests that would have caught the original defect: the size and
extras upcharge was shown to the customer and then dropped, so an Espresso
configured at $5.49 was charged at $2.99 (AUDIT.md section 2.3).
"""

from __future__ import annotations

from decimal import Decimal

import pytest

from app import crud
from app.config import TAX_RATE
from app.crud import PricingError, money, unit_price


# --- rounding ---------------------------------------------------------------


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("2.994", "2.99"),
        ("2.995", "3.00"),  # half-up, not banker's rounding
        ("2.985", "2.99"),
        ("0.125", "0.13"),
        ("10.00", "10.00"),
    ],
)
def test_money_rounds_half_up(raw, expected):
    assert money(Decimal(raw)) == Decimal(expected)


def test_money_never_uses_binary_floating_point():
    """0.1 + 0.2 must be 0.30 exactly, not 0.30000000000000004."""
    assert money(Decimal("0.1") + Decimal("0.2")) == Decimal("0.30")


# --- unit price -------------------------------------------------------------


def test_base_price_with_no_options(espresso):
    assert unit_price(espresso, None, []) == Decimal("2.99")


def test_size_upcharge_is_applied(espresso):
    assert unit_price(espresso, "Triple", []) == Decimal("4.99")


def test_extras_are_applied(espresso):
    assert unit_price(espresso, None, ["Extra Shot"]) == Decimal("3.98")


def test_size_and_extras_together(espresso):
    """The exact case from the audit: base 2.99 + Triple 2.00 + Vanilla 0.50."""
    assert unit_price(espresso, "Triple", ["Vanilla Syrup"]) == Decimal("5.49")


def test_multiple_extras_all_count(espresso):
    assert unit_price(espresso, None, ["Extra Shot", "Vanilla Syrup"]) == Decimal("4.48")


def test_a_zero_priced_size_costs_nothing_extra(espresso):
    assert unit_price(espresso, "Single", []) == Decimal("2.99")


def test_a_product_with_no_options_prices_at_base(croissant):
    assert unit_price(croissant, None, []) == Decimal("3.29")


# --- rejection of options a product does not offer --------------------------


def test_an_unknown_size_is_rejected(espresso):
    with pytest.raises(PricingError, match="no size"):
        unit_price(espresso, "Gigantic", [])


def test_an_unknown_extra_is_rejected_not_silently_ignored(espresso):
    """Ignoring it would hand the customer the extra for free."""
    with pytest.raises(PricingError, match="no extra"):
        unit_price(espresso, None, ["Free Gold Bar"])


def test_an_unknown_milk_is_rejected(espresso):
    with pytest.raises(PricingError, match="no milk"):
        crud.validate_milk(espresso, "Unicorn")


def test_a_size_on_a_product_with_no_options_is_rejected(croissant):
    with pytest.raises(PricingError):
        unit_price(croissant, "Large", [])


# --- order totals -----------------------------------------------------------


def _order(db, user, items):
    from app import schemas

    return crud.create_order(
        db,
        user,
        schemas.OrderCreate(
            order_type="pickup",
            payment_method="card",
            contact_name="Sarah Ali",
            contact_phone="+20 100 555 0123",
            contact_email="sarah@example.com",
            items=items,
        ),
    )


def test_order_total_is_subtotal_plus_tax(db_session, customer, espresso):
    order = _order(db_session, customer, [{"product_slug": "espresso", "quantity": 1}])

    assert order.subtotal == Decimal("2.99")
    assert order.tax == money(Decimal("2.99") * TAX_RATE)
    assert order.total == order.subtotal + order.tax


def test_line_total_is_unit_price_times_quantity(db_session, customer, espresso):
    order = _order(
        db_session,
        customer,
        [{"product_slug": "espresso", "quantity": 3, "size": "Triple", "extras": ["Vanilla Syrup"]}],
    )
    line = order.items[0]

    assert line.unit_price == Decimal("5.49")
    assert line.line_total == Decimal("16.47")
    assert order.subtotal == Decimal("16.47")


def test_a_multi_product_order_sums_every_line(db_session, customer, espresso, croissant):
    """The old model could not even represent this: one product per order."""
    order = _order(
        db_session,
        customer,
        [
            {"product_slug": "espresso", "quantity": 1, "size": "Triple", "extras": ["Vanilla Syrup"]},
            {"product_slug": "croissant", "quantity": 2},
        ],
    )

    assert len(order.items) == 2
    assert order.subtotal == Decimal("12.07")  # 5.49 + 6.58
    assert order.tax == Decimal("0.97")
    assert order.total == Decimal("13.04")


def test_chosen_options_are_stored_on_the_line(db_session, customer, espresso):
    """These had no column at all in the original model."""
    order = _order(
        db_session,
        customer,
        [
            {
                "product_slug": "espresso",
                "quantity": 1,
                "size": "Double",
                "milk": "Oat",
                "extras": ["Extra Shot"],
                "special_instructions": "Extra hot please",
            }
        ],
    )
    line = order.items[0]

    assert line.size == "Double"
    assert line.milk == "Oat"
    assert line.extras == ["Extra Shot"]
    assert line.special_instructions == "Extra hot please"


def test_the_line_price_is_frozen_at_purchase_time(db_session, customer, espresso):
    """Repricing a product must not rewrite what past orders were charged."""
    order = _order(db_session, customer, [{"product_slug": "espresso", "quantity": 1}])
    assert order.items[0].unit_price == Decimal("2.99")

    espresso.price = Decimal("9.99")
    db_session.commit()
    db_session.refresh(order)

    assert order.items[0].unit_price == Decimal("2.99")
    assert order.total == Decimal("3.23")


def test_an_unavailable_product_cannot_be_ordered(db_session, customer, espresso):
    espresso.available = False
    db_session.commit()

    with pytest.raises(PricingError, match="not currently available"):
        _order(db_session, customer, [{"product_slug": "espresso", "quantity": 1}])


def test_an_unknown_product_is_rejected(db_session, customer):
    with pytest.raises(PricingError, match="No such product"):
        _order(db_session, customer, [{"product_slug": "does-not-exist", "quantity": 1}])
