import asyncio
import cognee

async def main():
    result = await cognee.recall(
        "what is my favourite programming language?",
        datasets=["lifeos"]
    )

    print(result)

asyncio.run(main())