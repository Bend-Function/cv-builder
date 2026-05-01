from pydantic import BaseModel

from app.ai.client import OpenAiStructuredClient


class ExampleOutput(BaseModel):
    name: str


class FakeChatModel:
    def with_structured_output(self, schema):
        self.schema = schema
        return self

    def invoke(self, messages):
        self.messages = messages
        return self.schema(name="Alex")


def test_structured_client_uses_configured_model_name():
    chat_model = FakeChatModel()
    client = OpenAiStructuredClient(model="gpt-5.4", chat_model=chat_model)

    result = client.generate(
        system_prompt="Return a name.",
        user_prompt="Name the candidate.",
        output_schema=ExampleOutput,
    )

    assert result.name == "Alex"
    assert client.model == "gpt-5.4"
    assert chat_model.messages[0] == ("system", "Return a name.")
    assert chat_model.messages[1] == ("user", "Name the candidate.")
