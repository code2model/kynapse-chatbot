"""
Kynapse API v2 — Advanced AI Chatbot Backend
Features: Multi-tool support, chat history, world news, tool choice modes.
"""
import json
import sys
import os
import traceback
import time
import uuid
from datetime import datetime
from typing import Optional

print("Initializing Kynapse v2 backend...", flush=True)

try:
    from dotenv import load_dotenv
    ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    load_dotenv(os.path.join(ROOT_DIR, ".env"))
    # Also load from api directory .env
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import subprocess
    import httpx
    from openai import AsyncOpenAI

    # Import tool modules
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from execution.web_search import search_web
    from execution.python_executor import execute_python
    from execution.image_generator import generate_image

    print("All imports successful!", flush=True)
except Exception as e:
    print("CRITICAL IMPORT CRASH:", flush=True)
    traceback.print_exc(file=sys.stdout)
    raise e

# ─── App Setup ───────────────────────────────────────────────────────────────

app = FastAPI(title="Kynapse API v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Models ──────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    tool_choice: str = "auto"  # "auto" | "none"
    selected_tools: list[str] = []  # empty = all tools available

class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    tools_used: list[str] = []
    tool_details: list[dict] = []  # { name, args, result, duration_ms }

class ConversationSummary(BaseModel):
    id: str
    title: str
    preview: str
    created_at: str
    updated_at: str
    message_count: int

class NewsItem(BaseModel):
    title: str
    description: str
    source: str
    url: str
    image: str
    published_at: str

# ─── In-Memory Storage ──────────────────────────────────────────────────────

conversations: dict[str, dict] = {}
# Structure: { conversation_id: { "messages": [...], "created_at": str, "updated_at": str } }

# ─── System Prompt ───────────────────────────────────────────────────────────

try:
    directive_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "directives", "chatbot_directive.md")
    with open(directive_path, "r", encoding="utf-8") as f:
        SYSTEM_PROMPT = f.read()
except FileNotFoundError:
    SYSTEM_PROMPT = "You are Kynapse, a helpful AI assistant."

# ─── OpenAI Client (Gemini) ─────────────────────────────────────────────────

api_key = os.getenv("GEMINI_API_KEY")
client = AsyncOpenAI(
    api_key=api_key,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
) if api_key else None

# ─── Tool Definitions ───────────────────────────────────────────────────────

ALL_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "calculator",
            "description": "Evaluates a mathematical expression. Use for any math computation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "The math expression to evaluate (e.g. '2 + 2 * 4', '(100 / 3) * 2.5')"
                    }
                },
                "required": ["expression"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for current information, news, facts, or any topic. Returns top results with titles and snippets.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "python_executor",
            "description": "Execute Python code to solve problems, compute data, create algorithms, or process information. Returns stdout output.",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "The Python code to execute"
                    }
                },
                "required": ["code"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "image_generator",
            "description": "Generate an image from a text description/prompt. Returns an image URL. Use when asked to create, draw, or generate images.",
            "parameters": {
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "A detailed description of the image to generate"
                    }
                },
                "required": ["prompt"]
            }
        }
    }
]

TOOL_NAME_MAP = {t["function"]["name"]: t for t in ALL_TOOLS}

# ─── Tool Execution ─────────────────────────────────────────────────────────

def execute_calculator(expression: str) -> str:
    try:
        script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "execution", "calculator.py")
        result = subprocess.run(
            [sys.executable, script_path, expression],
            capture_output=True, text=True, check=True, timeout=10
        )
        return result.stdout.strip()
    except Exception as e:
        return f"Error: {e}"

def execute_tool(tool_name: str, arguments: dict) -> str:
    """Route tool execution to the correct handler."""
    if tool_name == "calculator":
        return execute_calculator(arguments.get("expression", ""))
    elif tool_name == "web_search":
        return search_web(arguments.get("query", ""))
    elif tool_name == "python_executor":
        return execute_python(arguments.get("code", ""))
    elif tool_name == "image_generator":
        return generate_image(arguments.get("prompt", ""))
    else:
        return f"Unknown tool: {tool_name}"

# ─── API Endpoints ───────────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0", "api_key_configured": bool(api_key)}


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    if not client:
        return ChatResponse(
            response="Error: GEMINI_API_KEY is missing. Please add it to the `.env` file.",
            conversation_id=request.conversation_id or str(uuid.uuid4()),
            tools_used=[]
        )
    
    # Get or create conversation
    conv_id = request.conversation_id or str(uuid.uuid4())
    now = datetime.now().isoformat()
    
    if conv_id not in conversations:
        conversations[conv_id] = {
            "messages": [{"role": "system", "content": SYSTEM_PROMPT}],
            "created_at": now,
            "updated_at": now
        }
    
    conv = conversations[conv_id]
    conv["messages"].append({"role": "user", "content": request.message})
    conv["updated_at"] = now

    # Determine which tools to send
    if request.tool_choice == "none":
        tools_to_send = None
    elif request.selected_tools:
        tools_to_send = [TOOL_NAME_MAP[name] for name in request.selected_tools if name in TOOL_NAME_MAP]
        if not tools_to_send:
            tools_to_send = None
    else:
        tools_to_send = ALL_TOOLS
    
    tools_used = []
    tool_details = []

    try:
        # Build API call kwargs
        api_kwargs = {
            "model": "gemini-2.5-flash",
            "messages": conv["messages"],
        }
        if tools_to_send:
            api_kwargs["tools"] = tools_to_send
            api_kwargs["tool_choice"] = "auto"

        response = await client.chat.completions.create(**api_kwargs)
        response_message = response.choices[0].message

        # Tool call loop (supports multiple sequential calls)
        max_iterations = 5
        iteration = 0
        
        while response_message.tool_calls and iteration < max_iterations:
            iteration += 1
            conv["messages"].append(response_message)

            for tool_call in response_message.tool_calls:
                fn_name = tool_call.function.name
                args = json.loads(tool_call.function.arguments)
                
                start_time = time.time()
                result = execute_tool(fn_name, args)
                duration_ms = round((time.time() - start_time) * 1000)

                tools_used.append(fn_name)
                tool_details.append({
                    "name": fn_name,
                    "args": args,
                    "result": result[:2000] if len(result) > 2000 else result,
                    "duration_ms": duration_ms
                })

                conv["messages"].append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": fn_name,
                    "content": result,
                })

            # Follow-up call with tool results
            follow_kwargs = {
                "model": "gemini-2.5-flash",
                "messages": conv["messages"],
            }
            if tools_to_send:
                follow_kwargs["tools"] = tools_to_send

            response = await client.chat.completions.create(**follow_kwargs)
            response_message = response.choices[0].message

        final_content = response_message.content or "No response generated."

        # Store assistant reply
        conv["messages"].append({"role": "assistant", "content": final_content})

        return ChatResponse(
            response=final_content,
            conversation_id=conv_id,
            tools_used=tools_used,
            tool_details=tool_details
        )

    except Exception as e:
        error_msg = f"An error occurred: {str(e)}"
        conv["messages"].append({"role": "assistant", "content": error_msg})
        return ChatResponse(
            response=error_msg,
            conversation_id=conv_id,
            tools_used=tools_used,
            tool_details=tool_details
        )


@app.get("/api/history")
async def get_history():
    """Return list of past conversations."""
    summaries = []
    for conv_id, conv_data in conversations.items():
        msgs = conv_data["messages"]
        
        # Find first user message for title
        user_msgs = [m for m in msgs if isinstance(m, dict) and m.get("role") == "user"]
        if not user_msgs:
            continue
        
        title = user_msgs[0]["content"][:80]
        preview = user_msgs[-1]["content"][:120] if user_msgs else ""
        
        summaries.append({
            "id": conv_id,
            "title": title,
            "preview": preview,
            "created_at": conv_data["created_at"],
            "updated_at": conv_data["updated_at"],
            "message_count": len([m for m in msgs if isinstance(m, dict) and m.get("role") in ("user", "assistant")])
        })
    
    # Sort by most recent
    summaries.sort(key=lambda x: x["updated_at"], reverse=True)
    return summaries


@app.get("/api/history/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Return full conversation messages for a given ID."""
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conv = conversations[conversation_id]
    # Filter to only user/assistant messages for the frontend
    display_messages = []
    for msg in conv["messages"]:
        if isinstance(msg, dict) and msg.get("role") in ("user", "assistant"):
            display_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
    
    return {
        "id": conversation_id,
        "messages": display_messages,
        "created_at": conv["created_at"],
        "updated_at": conv["updated_at"]
    }


@app.delete("/api/history/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation from history."""
    if conversation_id in conversations:
        del conversations[conversation_id]
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Conversation not found")


@app.get("/api/news")
async def get_news():
    """Fetch top 10 world news headlines from GNews API."""
    gnews_key = os.getenv("GNEWS_API_KEY", "df615c86fb2c1da1901c057ca204cc64")
    
    try:
        async with httpx.AsyncClient(timeout=10) as http_client:
            resp = await http_client.get(
                "https://gnews.io/api/v4/top-headlines",
                params={
                    "category": "world",
                    "lang": "en",
                    "max": 10,
                    "apikey": gnews_key
                }
            )
            resp.raise_for_status()
            data = resp.json()
        
        articles = []
        for article in data.get("articles", []):
            articles.append({
                "title": article.get("title", ""),
                "description": article.get("description", ""),
                "source": article.get("source", {}).get("name", "Unknown"),
                "url": article.get("url", ""),
                "image": article.get("image", ""),
                "published_at": article.get("publishedAt", "")
            })
        
        return articles
    except Exception as e:
        print(f"News fetch error: {e}", flush=True)
        # Return fallback data so the UI doesn't break
        return [
            {
                "title": "Unable to fetch live news",
                "description": "The news service is temporarily unavailable. Please check the GNews API key configuration.",
                "source": "System",
                "url": "#",
                "image": "",
                "published_at": datetime.now().isoformat()
            }
        ]


@app.get("/api/tools")
async def get_available_tools():
    """Return list of available tools for the frontend tool selector."""
    return [
        {
            "name": "calculator",
            "label": "Calculator",
            "icon": "🧮",
            "description": "Evaluate math expressions"
        },
        {
            "name": "web_search",
            "label": "Web Search",
            "icon": "🔍",
            "description": "Search the internet"
        },
        {
            "name": "python_executor",
            "label": "Python Executor",
            "icon": "🐍",
            "description": "Run Python code"
        },
        {
            "name": "image_generator",
            "label": "Image Generator",
            "icon": "🎨",
            "description": "Create AI images"
        }
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.index:app", host="0.0.0.0", port=8000, reload=True)
