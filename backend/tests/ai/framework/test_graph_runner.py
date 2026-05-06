import pytest
from app.ai.framework.graph_runner import GraphRunner, GraphDeps, LangGraphRunner
from app.models.application import ApplicationRun
from app.models.master_cv import MasterCv

def test_graph_runner_is_abstract():
    """GraphRunner cannot be instantiated directly."""
    with pytest.raises(TypeError):
        GraphRunner()

def test_graph_deps_has_required_fields():
    """GraphDeps is a dataclass with required fields."""
    from dataclasses import is_dataclass
    assert is_dataclass(GraphDeps)

def test_lang_graph_runner_implements_graph_runner():
    """LangGraphRunner is a concrete implementation."""
    assert issubclass(LangGraphRunner, GraphRunner)

def test_graph_runner_has_run_method_signature():
    """GraphRunner.run is abstract."""
    import inspect
    sig = inspect.signature(GraphRunner.run)
    params = list(sig.parameters.keys())
    # run(self, master_cv, application_run, gap_answers) -> ApplicationRun
    assert "master_cv" in params
    assert "application_run" in params
    assert "gap_answers" in params