import openai

openai.api_key = "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"

resp = openai.ChatCompletion.create(
    model="google/gemini-2.0-flash",
    messages=[
        {"role": "user", "content": "Hello Gemini through OpenRouter!"}
    ]
)

print(resp)