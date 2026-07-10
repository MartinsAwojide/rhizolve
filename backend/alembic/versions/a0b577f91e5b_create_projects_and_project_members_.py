"""create projects and project_members tables

Revision ID: a0b577f91e5b
Revises: 9cd1d2cab318
Create Date: 2026-07-10 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a0b577f91e5b"
down_revision: Union[str, Sequence[str], None] = "9cd1d2cab318"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("domain", sa.String(), nullable=True),
        sa.Column(
            "visibility",
            sa.Enum("PRIVATE", "TEAM", "ORG", name="visibility"),
            nullable=False,
        ),
        sa.Column("compliance_standards", sa.ARRAY(sa.String()), nullable=False),
        sa.Column("maturity_level", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "project_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "role",
            sa.Enum(
                "OWNER",
                "ANALYST",
                "CONTRIBUTOR",
                "OPERATOR",
                "MANAGER",
                "VIEWER",
                name="project_member_role",
            ),
            nullable=False,
        ),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("project_members")
    op.drop_table("projects")
    op.execute("DROP TYPE IF EXISTS project_member_role")
    op.execute("DROP TYPE IF EXISTS visibility")
