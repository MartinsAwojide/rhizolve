"""add org_id to projects

Revision ID: 2ffe5e21da57
Revises: da015062f102
Create Date: 2026-07-11 00:08:17.856089

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2ffe5e21da57"
down_revision: Union[str, Sequence[str], None] = "da015062f102"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("projects", sa.Column("org_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_projects_org_id_organisations",
        "projects",
        "organisations",
        ["org_id"],
        ["id"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "fk_projects_org_id_organisations", "projects", type_="foreignkey"
    )
    op.drop_column("projects", "org_id")
