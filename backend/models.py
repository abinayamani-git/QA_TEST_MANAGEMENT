"""SQLAlchemy models for projects, test cases, and defects."""

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base

TEST_CASE_STATUSES = ("Not Run", "Pass", "Fail", "Blocked")
PRIORITIES = ("Low", "Medium", "High", "Critical")
SEVERITIES = ("Minor", "Major", "Critical")
DEFECT_STATUSES = ("Open", "In Progress", "Fixed", "Retest", "Closed", "Reopened")


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, nullable=False, default=utcnow)

    test_cases = relationship(
        "TestCase",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    defects = relationship(
        "Defect",
        back_populates="project",
        cascade="all, delete-orphan",
    )


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    module = Column(String(120), nullable=False, default="")
    priority = Column(String(20), nullable=False, default="Medium")
    preconditions = Column(Text, nullable=False, default="")
    test_steps = Column(Text, nullable=False, default="")
    expected_result = Column(Text, nullable=False, default="")
    actual_result = Column(Text, nullable=False, default="")
    status = Column(String(20), nullable=False, default="Not Run")
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow)

    project = relationship("Project", back_populates="test_cases")


class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False, default="")
    severity = Column(String(20), nullable=False, default="Major")
    priority = Column(String(20), nullable=False, default="Medium")
    steps_to_reproduce = Column(Text, nullable=False, default="")
    expected_result = Column(Text, nullable=False, default="")
    actual_result = Column(Text, nullable=False, default="")
    status = Column(String(20), nullable=False, default="Open")
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow)

    project = relationship("Project", back_populates="defects")
