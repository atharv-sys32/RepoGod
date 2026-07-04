import asyncio
from typing import AsyncIterator

import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted

from app.config import settings


class LLMService:
    """Wrapper around the Google Gemini API with auto-retry on rate limits."""

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
        max_retries: int = 10,
    ) -> str:
        user_content = self._build_user_content(user_prompt, context)
        for attempt in range(max_retries):
            try:
                response = await self._model.generate_content_async(
                    contents=[
                        {"role": "user", "parts": [{"text": f"{system_prompt}\n\n{user_content}"}]},
                    ],
                )
                return response.text or ""
            except ResourceExhausted as e:
                wait = 35  # default
                if hasattr(e, 'retry_delay') and e.retry_delay:
                    wait = max(e.retry_delay.seconds, 5)
                print(f"[LLM] Rate limited, waiting {wait}s (attempt {attempt+1}/{max_retries})")
                await asyncio.sleep(wait)
        return ""

    async def generate_stream(
        self,
        system_prompt: str,
        user_prompt: str,
        context: str = "",
        max_retries: int = 10,
    ) -> AsyncIterator[str]:
        user_content = self._build_user_content(user_prompt, context)
        for attempt in range(max_retries):
            try:
                response = await self._model.generate_content_async(
                    contents=[
                        {"role": "user", "parts": [{"text": f"{system_prompt}\n\n{user_content}"}]},
                    ],
                    stream=True,
                )
                async for chunk in response:
                    if chunk.text:
                        yield chunk.text
                return
            except ResourceExhausted as e:
                wait = 35
                if hasattr(e, 'retry_delay') and e.retry_delay:
                    wait = max(e.retry_delay.seconds, 5)
                print(f"[LLM] Rate limited, waiting {wait}s (attempt {attempt+1}/{max_retries})")
                await asyncio.sleep(wait)

    @staticmethod
    def _build_user_content(user_prompt: str, context: str) -> str:
        if context:
            return f"{user_prompt}\n\n---\n**Relevant Code Context:**\n\n{context}"
        return user_prompt
