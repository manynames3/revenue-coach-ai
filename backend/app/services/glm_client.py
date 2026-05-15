from openai import OpenAI

from app.config import settings


class GLMClient:
    def __init__(self):
        self.client = OpenAI(
            api_key=settings.zai_api_key,
            base_url=settings.zai_base_url,
        )
        self.model = settings.zai_model

    def chat(self, system_prompt: str, user_prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=4000,
        )
        return response.choices[0].message.content or ""
