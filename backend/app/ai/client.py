from typing import TypeVar

from pydantic import BaseModel

SchemaT = TypeVar("SchemaT", bound=BaseModel)


def _default_chat_model(model: str) -> object:
    from langchain_openai import ChatOpenAI

    return ChatOpenAI(model=model, streaming=True)


class OpenAiStructuredClient:
    def __init__(self, model: str = "gpt-5.4", chat_model: object | None = None):
        self.model = model
        self.chat_model = chat_model if chat_model is not None else _default_chat_model(model)

    def generate(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        output_schema: type[SchemaT],
    ) -> SchemaT:
        structured_model = self.chat_model.with_structured_output(output_schema)
        result = structured_model.invoke(
            [
                ("system", system_prompt),
                ("user", user_prompt),
            ]
        )
        if isinstance(result, output_schema):
            return result
        return output_schema.model_validate(result)
