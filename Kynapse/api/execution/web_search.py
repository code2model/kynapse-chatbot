"""
Web Search Tool — Uses DuckDuckGo Search (free, no API key needed).
Returns top search results with title, snippet, and URL.
"""
import json

def search_web(query: str, max_results: int = 5) -> str:
    """Perform a web search and return results as JSON string."""
    try:
        from ddgs import DDGS
        
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
        
        formatted = []
        for r in results:
            formatted.append({
                "title": r.get("title", ""),
                "snippet": r.get("body", ""),
                "url": r.get("href", "")
            })
        
        return json.dumps(formatted, indent=2)
    except ImportError:
        # Fallback to old package name
        try:
            from duckduckgo_search import DDGS
            
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=max_results))
            
            formatted = []
            for r in results:
                formatted.append({
                    "title": r.get("title", ""),
                    "snippet": r.get("body", ""),
                    "url": r.get("href", "")
                })
            
            return json.dumps(formatted, indent=2)
        except Exception as e:
            return json.dumps({"error": f"Search packages not available: {str(e)}"})
    except Exception as e:
        return json.dumps({"error": f"Search failed: {str(e)}"})


if __name__ == "__main__":
    import sys
    query = sys.argv[1] if len(sys.argv) > 1 else "latest AI news"
    print(search_web(query))
