import pytest
from app.ai.framework.errors import (
    AgentFrameworkError,
    AiClientError,
    AiSchemaError,
    JdLoadError,
    MasterCvLoadError,
    PdfRenderError,
)

def test_all_errors_share_base():
    for cls in (AiClientError, AiSchemaError, JdLoadError, MasterCvLoadError, PdfRenderError):
        assert issubclass(cls, AgentFrameworkError)

def test_ai_client_error_carries_status():
    err = AiClientError("bad gateway", status_code=502)
    assert err.status_code == 502
    assert "bad gateway" in str(err)

def test_ai_schema_error_carries_raw_response():
    err = AiSchemaError("could not parse", raw="{{invalid}}")
    assert err.raw == "{{invalid}}"

def test_master_cv_load_error_carries_field_path():
    err = MasterCvLoadError("validation failed", field_path="profile.email")
    assert err.field_path == "profile.email"

def test_subclass_can_be_raised_and_caught_as_base():
    with pytest.raises(AgentFrameworkError):
        raise PdfRenderError("playwright crashed")