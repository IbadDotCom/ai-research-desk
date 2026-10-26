
from ollama import AsyncClient


async def generate_answer(prompt: str) -> str:
    client = AsyncClient()

    response = await client.chat(
        model="llama3.2:1b",
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
    )

    return response["message"]["content"]
