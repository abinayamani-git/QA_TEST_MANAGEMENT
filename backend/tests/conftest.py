"""Use a fresh in-memory database for every test. Sample data is not seeded."""

import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SEED_DATA"] = "0"

import pytest
from fastapi.testclient import TestClient

from database import Base, engine
from main import app


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client
