import sys

def calculate(expression: str):
    """
    A simple deterministic execution script to evaluate math expressions.
    This acts as our Layer 3 Execution script.
    """
    try:
        # VERY basic/safe evaluation for demonstration.
        # In a real app we'd use ast.literal_eval or a math parser.
        allowed_chars = set("0123456789+-*/(). ")
        if not set(expression).issubset(allowed_chars):
            return "Error: Invalid characters in expression."
        
        result = eval(expression)
        return str(result)
    except Exception as e:
        return f"Error evaluating expression: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) > 1:
        expr = sys.argv[1]
        print(calculate(expr))
    else:
        print("Error: No expression provided.")
