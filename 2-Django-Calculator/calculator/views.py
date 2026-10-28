from django.shortcuts import redirect, render
from django.views.decorators.http import require_POST

from .evaluator import CalcError, evaluate
from .models import Calculation


def home(request):
    expression = ''
    result = None
    error = None

    if request.method == 'POST':
        expression = request.POST.get('expression', '')
        try:
            result = evaluate(expression)
            Calculation.objects.create(expression=expression, result=result)
        except CalcError as e:
            error = str(e)

    context = {
        'expression': expression,
        'result': result,
        'error': error,
        'history': Calculation.objects.all()[:10],
        'total': Calculation.objects.count(),
    }
    return render(request, 'calculator/home.html', context)


@require_POST
def clear_history(request):
    Calculation.objects.all().delete()
    return redirect('home')
