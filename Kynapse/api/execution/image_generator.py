"""
Image Generator Tool — Uses Pollinations.ai (free, no API key needed).
Generates an image URL from a text prompt.
"""
import urllib.parse


def generate_image(prompt: str, width: int = 1024, height: int = 1024) -> str:
    """Generate an image URL from a text prompt using Pollinations.ai."""
    try:
        encoded_prompt = urllib.parse.quote(prompt)
        image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&nologo=true"
        return image_url
    except Exception as e:
        return f"Error generating image: {str(e)}"


if __name__ == "__main__":
    import sys
    prompt = sys.argv[1] if len(sys.argv) > 1 else "a futuristic city at sunset"
    print(generate_image(prompt))
