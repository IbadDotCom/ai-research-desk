
import os

from dotenv import load_dotenv
from groq import AsyncGroq

load_dotenv()


async def generate_answer(prompt: str) -> str:
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise RuntimeError("GROQ_API_KEY environment variable is not set.")

    client = AsyncGroq(api_key=api_key)

    response = await client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        temperature=0,
        max_completion_tokens=180,
    )

    answer = response.choices[0].message.content
    return answer or ""
