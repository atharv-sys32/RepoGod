from typing import AsyncIterator

import google.generativeai as genai

from app.config import settings


class LLMService:
    """Wrapper around the Google Gemini API."""

    def __init__(self) -> None:
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        self._model_name = settings.LLM_MODEL
        self._model = genai.GenerativeModel(
            self._model_name,
            generation_config=genai.GenerationConfig(
                temperature=0.2,
                max_output_tokens=4096,
            ),
        )

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        context: str = "",
    ) -> str:
        user_content = self._build_user_content(user_prompt, context)
        response = await self._model.generate_content_async(
            contents=[
                {"role": "user", "parts": [{"text": f"{system_prompt}\n\n{user_content}"}]},
            ],
        )
        return response.text or ""

    async def generate_stream(
        self,
        system_prompt: str,
        user_prompt: str,
        context: str = "",
    ) -> AsyncIterator[str]:
        user_content = self._build_user_content(user_prompt, context)
        response = await self._model.generate_content_async(
            contents=[
                {"role": "user", "parts": [{"text": f"{system_prompt}\n\n{user_content}"}]},
            ],
            stream=True,
        )
        async for chunk in response:
            if chunk.text:
                yield chunk.text

    @staticmethod
    def _build_user_content(user_prompt: str, context: str) -> str:
        if context:
            return f"{user_prompt}\n\n---\n**Relevant Code Context:**\n\n{context}"
        return user_prompt
