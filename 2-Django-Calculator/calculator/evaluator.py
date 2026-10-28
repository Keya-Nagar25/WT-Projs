"""Safe expression evaluator.

Python's eval() would run any code a user types, so instead we parse the
expression into a syntax tree (ast) and only allow numbers, + - * / % **,
brackets and the sqrt() function.
"""
import ast
import math
import operator

BIN_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}

UNARY_OPS = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}


class CalcError(Exception):
    pass


def normalize(expression):
    """Convert calculator symbols into Python syntax."""
    return (expression.replace('×', '*')
                      .replace('÷', '/')
                      .replace('−', '-')
                      .replace('^', '**')
                      .replace('√', 'sqrt'))


def _eval(node):
    if isinstance(node, ast.Expression):
        return _eval(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in BIN_OPS:
        left, right = _eval(node.left), _eval(node.right)
        if isinstance(node.op, (ast.Div, ast.Mod)) and right == 0:
            raise CalcError("Cannot divide by zero")
        if isinstance(node.op, ast.Pow) and abs(right) > 100:
            raise CalcError("Exponent too large")
        return BIN_OPS[type(node.op)](left, right)
    if isinstance(node, ast.UnaryOp) and type(node.op) in UNARY_OPS:
        return UNARY_OPS[type(node.op)](_eval(node.operand))
    if (isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
            and node.func.id == 'sqrt' and len(node.args) == 1):
        value = _eval(node.args[0])
        if value < 0:
            raise CalcError("Square root of a negative number")
        return math.sqrt(value)
    raise CalcError("Invalid expression")


def evaluate(expression):
    """Return the result of the expression as a nicely formatted string."""
    expression = normalize(expression.strip())
    if not expression:
        raise CalcError("Enter an expression")
    if len(expression) > 200:
        raise CalcError("Expression too long")
    try:
        tree = ast.parse(expression, mode='eval')
    except SyntaxError:
        raise CalcError("Invalid expression")
    try:
        result = _eval(tree)
    except (OverflowError, ValueError):
        raise CalcError("Result too large")
    if isinstance(result, complex):
        raise CalcError("Invalid expression")
    if isinstance(result, float):
        if result.is_integer() and abs(result) < 1e15:
            return str(int(result))
        return f"{result:.10g}"
    return str(result)
