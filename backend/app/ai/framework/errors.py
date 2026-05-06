class AgentFrameworkError(Exception):
    """Base class for all agent-framework errors."""

class MasterCvLoadError(AgentFrameworkError):
    def __init__(self, message: str, *, field_path: str = ""):
        super().__init__(message)
        self.field_path = field_path

class JdLoadError(AgentFrameworkError):
    pass

class AiClientError(AgentFrameworkError):
    def __init__(self, message: str, *, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code

class AiSchemaError(AgentFrameworkError):
    def __init__(self, message: str, *, raw: str = ""):
        super().__init__(message)
        self.raw = raw

class PdfRenderError(AgentFrameworkError):
    pass