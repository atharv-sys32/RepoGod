from typing import AsyncIterator

from groq import AsyncGroq

from app.config import settings


_client = None


def _get_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    return _client


class LLMService:
    """Wrapper around Groq LLM API (Llama 3 / Mixtral)."""

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        context: str = "",
    ) -> str:
        user_content = self._build_user_content(user_prompt, context)
        client = _get_client()
        response = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.2,
            max_tokens=4096,
        )
        return response.choices[0].message.content or ""

    async def generate_stream(
        self,
        system_prompt: str,
        user_prompt: str,
        context: str = "",
    ) -> AsyncIterator[str]:
        user_content = self._build_user_content(user_prompt, context)
        client = _get_client()
        stream = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.2,
            max_tokens=4096,
            stream=True,
        )
        async for chunk in stream:
            text = chunk.choices[0].delta.content or ""
            if text:
                yield text

    @staticmethod
    def _build_user_content(user_prompt: str, context: str) -> str:
        if context:
            return f"{user_prompt}\n\n---\n**Relevant Code Context:**\n\n{context}"
        return user_prompt
