
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
        options={
            "temperature": 0,
            "num_predict": 180,
        },
    )


    return response["message"]["content"]
