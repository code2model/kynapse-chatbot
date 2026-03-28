import json
import sys
import os
import traceback

print("Attempting to initialize Kynapse backend...", flush=True)

try:
    from dotenv import load_dotenv
    ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    load_dotenv(os.path.join(ROOT_DIR, ".env"))

    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import subprocess
    from openai import AsyncOpenAI
    
    print("Imports completely successful!", flush=True)
except Exception as e:
    print("CRITICAL IMPORT CRASH:", flush=True)
    traceback.print_exc(file=sys.stdout)
    raise e

app = FastAPI(title="Kynapse API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    
class ChatResponse(BaseModel):
    response: str
    tools_used: list[str] = []

# Load Directive
try:
    with open(os.path.join(ROOT_DIR, "directives/chatbot_directive.md"), "r") as f:
        SYSTEM_PROMPT = f.read()
except FileNotFoundError:
    SYSTEM_PROMPT = "You are a helpful assistant."

# Initialize OpenAI Client pointing to Gemini
api_key = os.getenv("GEMINI_API_KEY")
client = AsyncOpenAI(
    api_key=api_key,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
) if api_key else None


def execute_calculator(expression: str) -> str:
    """Invokes the local calculator python script."""
    try:
        script_path = os.path.join(ROOT_DIR, "execution/calculator.py")
        result = subprocess.run(
            [sys.executable, script_path, expression],
            capture_output=True, text=True, check=True
        )
        return result.stdout.strip()
    except Exception as e:
        return f"Error executing tool: {e}"

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "calculator",
            "description": "Evaluates a mathematical expression using the local execution tool.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "The math expression to evaluate (e.g. '2 + 2 * 4')"
                    }
                },
                "required": ["expression"]
            }
        }
    }
]

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    if not client:
        return ChatResponse(
            response="Error: GEMINI_API_KEY is missing from the `.env` file. Please add it to start chatting.",
            tools_used=[]
        )
        
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": request.message}
    ]
    
    tools_used = []
    
    try:
        # First API call
        response = await client.chat.completions.create(
            model="gemini-2.5-flash",
            messages=messages,
            tools=TOOLS,
            tool_choice="auto"
        )
        
        response_message = response.choices[0].message
        
        # Check if model wants to call a tool
        if response_message.tool_calls:
            messages.append(response_message)
            
            for tool_call in response_message.tool_calls:
                function_name = tool_call.function.name
                if function_name == "calculator":
                    args = json.loads(tool_call.function.arguments)
                    tools_used.append("calculator")
                    result = execute_calculator(args.get("expression", ""))
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": function_name,
                        "content": result,
                    })
            
            # Second API call with tool result
            second_response = await client.chat.completions.create(
                model="gemini-2.5-flash",
                messages=messages
            )
            final_content = second_response.choices[0].message.content
        else:
            final_content = response_message.content

        return ChatResponse(
            response=final_content or "No response generated.",
            tools_used=tools_used
        )
        
    except Exception as e:
        return ChatResponse(
            response=f"An error occurred during OpenAI interaction: {str(e)}",
            tools_used=tools_used
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.index:app", host="0.0.0.0", port=8000, reload=True)
