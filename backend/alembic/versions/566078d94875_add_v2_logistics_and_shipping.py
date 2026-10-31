"""add_v2_logistics_and_shipping

Revision ID: 566078d94875
Revises: 706b30c649c9
Create Date: 2026-10-22 21:19:37.364733

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '566078d94875'
down_revision: Union[str, Sequence[str], None] = '706b30c649c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema for V2.0.0 Logistics & Shipping."""
    # 1. Product weight_grams column & constraint
    op.add_column(
        'products',
        sa.Column('weight_grams', sa.Integer(), server_default=sa.text('1000'), nullable=False),
    )
    op.create_check_constraint(
        'check_product_weight_grams_positive',
        'products',
        'weight_grams > 0',
    )

    # 2. Order shipping & tracking columns
    op.add_column('orders', sa.Column('shipping_province', sa.String(length=100), nullable=True))
    op.add_column('orders', sa.Column('shipping_city_id', sa.String(length=50), nullable=True))
    op.add_column('orders', sa.Column('shipping_city_name', sa.String(length=100), nullable=True))
    op.add_column('orders', sa.Column('shipping_postal_code', sa.String(length=20), nullable=True))
    op.add_column('orders', sa.Column('courier_code', sa.String(length=50), nullable=True))
    op.add_column('orders', sa.Column('courier_service', sa.String(length=100), nullable=True))
    op.add_column('orders', sa.Column('shipping_etd', sa.String(length=50), nullable=True))
    op.add_column(
        'orders',
        sa.Column(
            'shipping_weight_grams',
            sa.Integer(),
            server_default=sa.text('1000'),
            nullable=False,
        ),
    )
    op.add_column(
        'orders',
        sa.Column(
            'shipping_cost',
            sa.Numeric(precision=12, scale=2),
            server_default=sa.text('0.00'),
            nullable=False,
        ),
    )
    op.add_column('orders', sa.Column('tracking_number', sa.String(length=100), nullable=True))
    op.add_column('orders', sa.Column('shipped_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('orders', sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True))

    # 3. Tracking number index & Order constraints
    op.create_index(op.f('ix_orders_tracking_number'), 'orders', ['tracking_number'], unique=False)
    op.create_check_constraint(
        'check_order_shipping_cost_non_negative',
        'orders',
        'shipping_cost >= 0',
    )
    op.create_check_constraint(
        'check_order_shipping_weight_grams_positive',
        'orders',
        'shipping_weight_grams > 0',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('check_order_shipping_weight_grams_positive', 'orders', type_='check')
    op.drop_constraint('check_order_shipping_cost_non_negative', 'orders', type_='check')
    op.drop_index(op.f('ix_orders_tracking_number'), table_name='orders')
    op.drop_column('orders', 'completed_at')
    op.drop_column('orders', 'shipped_at')
    op.drop_column('orders', 'tracking_number')
    op.drop_column('orders', 'shipping_cost')
    op.drop_column('orders', 'shipping_weight_grams')
    op.drop_column('orders', 'shipping_etd')
    op.drop_column('orders', 'courier_service')
    op.drop_column('orders', 'courier_code')
    op.drop_column('orders', 'shipping_postal_code')
    op.drop_column('orders', 'shipping_city_name')
    op.drop_column('orders', 'shipping_city_id')
    op.drop_column('orders', 'shipping_province')
    op.drop_constraint('check_product_weight_grams_positive', 'products', type_='check')
    op.drop_column('products', 'weight_grams')
