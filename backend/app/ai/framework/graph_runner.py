from abc import ABC, abstractmethod
from dataclasses import dataclass
from app.models.application import ApplicationRun
from app.models.master_cv import MasterCv


@dataclass
class GraphDeps:
    """Dependency container for the graph. Passed to build_cv_graph()."""
    llm_client: "LlmClient"  # injected, not imported to avoid cycle
    storage_path: str = "data"
    max_revision_loops: int = 2


class GraphRunner(ABC):
    """Abstract base for graph runners."""

    @abstractmethod
    def run(
        self,
        master_cv: MasterCv,
        application_run: ApplicationRun,
        gap_answers: dict[str, str] | None = None,
    ) -> ApplicationRun:
        """
        Run the CV generation graph end-to-end.

        Args:
            master_cv: The user's master CV
            application_run: The application context (company, JD, etc.)
            gap_answers: Optional pre-filled answers to gap questions

        Returns:
            The updated ApplicationRun with generated_documents populated.
        """
        ...


class LangGraphRunner(GraphRunner):
    """LangGraph-based implementation of GraphRunner."""

    def __init__(self, deps: GraphDeps):
        self._deps = deps

    def run(
        self,
        master_cv: MasterCv,
        application_run: ApplicationRun,
        gap_answers: dict[str, str] | None = None,
    ) -> ApplicationRun:
        # Placeholder — actual implementation comes in Task 18 (graph assembly)
        # For now, just return the input unchanged (tests only check interface)
        return application_run