import httpx, asyncio
async def test():
    resp = await httpx.AsyncClient().post('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=123')
    print(resp.status_code, resp.text)
asyncio.run(test())
