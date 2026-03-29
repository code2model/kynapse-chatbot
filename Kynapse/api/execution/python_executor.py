"""
Python Code Executor Tool — Runs Python code in a sandboxed subprocess.
Returns stdout/stderr with a 10-second timeout.
"""
import subprocess
import sys
import tempfile
import os
import json


def execute_python(code: str) -> str:
    """Execute Python code safely in a subprocess and return the output."""
    try:
        # Write code to a temporary file
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.py', delete=False, encoding='utf-8'
        ) as f:
            f.write(code)
            temp_path = f.name

        try:
            result = subprocess.run(
                [sys.executable, temp_path],
                capture_output=True,
                text=True,
                timeout=10,
                cwd=tempfile.gettempdir()
            )
            
            output = ""
            if result.stdout:
                output += result.stdout
            if result.stderr:
                output += "\n[STDERR]\n" + result.stderr
            
            if not output.strip():
                output = "(No output produced)"
            
            # Cap output length
            if len(output) > 5000:
                output = output[:5000] + "\n... (output truncated at 5000 chars)"
            
            return output.strip()
        finally:
            os.unlink(temp_path)
            
    except subprocess.TimeoutExpired:
        return "Error: Code execution timed out after 10 seconds."
    except Exception as e:
        return f"Error executing Python code: {str(e)}"


if __name__ == "__main__":
    test_code = 'print("Hello from Kynapse executor!")\nprint(sum(range(100)))'
    print(execute_python(test_code))
