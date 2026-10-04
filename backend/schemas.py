"""Request and response schemas."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

TestCaseStatus = Literal["Not Run", "Pass", "Fail", "Blocked"]
Priority = Literal["Low", "Medium", "High", "Critical"]
Severity = Literal["Minor", "Major", "Critical"]
DefectStatus = Literal["Open", "In Progress", "Fixed", "Retest", "Closed", "Reopened"]


def _clean_required_text(value: str, field_name: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{field_name} cannot be empty")
    return cleaned


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        return _clean_required_text(value, "Name")

    @field_validator("description")
    @classmethod
    def clean_description(cls, value: str) -> str:
        return value.strip()


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        return _clean_required_text(value, "Name")

    @field_validator("description")
    @classmethod
    def clean_description(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        return value.strip()


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    created_at: datetime


class TestCaseCreate(BaseModel):
    project_id: int
    title: str = Field(min_length=1, max_length=200)
    module: str = Field(default="", max_length=120)
    priority: Priority = "Medium"
    preconditions: str = Field(default="", max_length=5000)
    test_steps: str = Field(default="", max_length=8000)
    expected_result: str = Field(default="", max_length=5000)
    actual_result: str = Field(default="", max_length=5000)
    status: TestCaseStatus = "Not Run"

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        return _clean_required_text(value, "Title")

    @field_validator("module", "preconditions", "test_steps", "expected_result", "actual_result")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class TestCaseUpdate(BaseModel):
    project_id: Optional[int] = None
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    module: Optional[str] = Field(default=None, max_length=120)
    priority: Optional[Priority] = None
    preconditions: Optional[str] = Field(default=None, max_length=5000)
    test_steps: Optional[str] = Field(default=None, max_length=8000)
    expected_result: Optional[str] = Field(default=None, max_length=5000)
    actual_result: Optional[str] = Field(default=None, max_length=5000)
    status: Optional[TestCaseStatus] = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        return _clean_required_text(value, "Title")

    @field_validator("module", "preconditions", "test_steps", "expected_result", "actual_result")
    @classmethod
    def strip_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        return value.strip()


class TestCaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: str
    module: str
    priority: str
    preconditions: str
    test_steps: str
    expected_result: str
    actual_result: str
    status: str
    created_at: datetime
    updated_at: datetime


class DefectCreate(BaseModel):
    project_id: int
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    severity: Severity = "Major"
    priority: Priority = "Medium"
    steps_to_reproduce: str = Field(default="", max_length=8000)
    expected_result: str = Field(default="", max_length=5000)
    actual_result: str = Field(default="", max_length=5000)
    status: DefectStatus = "Open"

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        return _clean_required_text(value, "Title")

    @field_validator("description", "steps_to_reproduce", "expected_result", "actual_result")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class DefectUpdate(BaseModel):
    project_id: Optional[int] = None
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)
    severity: Optional[Severity] = None
    priority: Optional[Priority] = None
    steps_to_reproduce: Optional[str] = Field(default=None, max_length=8000)
    expected_result: Optional[str] = Field(default=None, max_length=5000)
    actual_result: Optional[str] = Field(default=None, max_length=5000)
    status: Optional[DefectStatus] = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        return _clean_required_text(value, "Title")

    @field_validator("description", "steps_to_reproduce", "expected_result", "actual_result")
    @classmethod
    def strip_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        return value.strip()


class DefectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: str
    description: str
    severity: str
    priority: str
    steps_to_reproduce: str
    expected_result: str
    actual_result: str
    status: str
    created_at: datetime
    updated_at: datetime
