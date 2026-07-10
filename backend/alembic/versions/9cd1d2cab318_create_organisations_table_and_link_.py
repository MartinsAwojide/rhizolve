"""create organisations table and link users.org_id as FK

Revision ID: 9cd1d2cab318
Revises: 75016da78c11
Create Date: 2026-07-10 11:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9cd1d2cab318"
down_revision: Union[str, Sequence[str], None] = "75016da78c11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organisations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("clerk_org_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("maturity_level", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_organisations_clerk_org_id"),
        "organisations",
        ["clerk_org_id"],
        unique=True,
    )

    # users.org_id was a plain nullable String (US-15). No real data exists
    # yet (pre-launch), so drop-and-recreate as an Integer FK rather than an
    # in-place type cast.
    op.drop_column("users", "org_id")
    op.add_column(
        "users",
        sa.Column(
            "org_id",
            sa.Integer(),
            sa.ForeignKey("organisations.id"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "org_id")
    op.add_column("users", sa.Column("org_id", sa.String(), nullable=True))

    op.drop_index(op.f("ix_organisations_clerk_org_id"), table_name="organisations")
    op.drop_table("organisations")
