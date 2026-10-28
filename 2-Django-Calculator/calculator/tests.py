from django.test import TestCase

from .evaluator import CalcError, evaluate
from .models import Calculation


class EvaluatorTests(TestCase):
    def test_basic_operations(self):
        self.assertEqual(evaluate('2+3×4'), '14')
        self.assertEqual(evaluate('(2+3)×4'), '20')
        self.assertEqual(evaluate('10÷4'), '2.5')
        self.assertEqual(evaluate('7−10'), '-3')
        self.assertEqual(evaluate('10%3'), '1')

    def test_power_and_sqrt(self):
        self.assertEqual(evaluate('5^2'), '25')
        self.assertEqual(evaluate('√(144)'), '12')

    def test_errors(self):
        for bad in ['5÷0', '√(-4)', '2++', '__import__("os")', '']:
            with self.assertRaises(CalcError):
                evaluate(bad)


class ViewTests(TestCase):
    def test_calculation_is_saved(self):
        response = self.client.post('/', {'expression': '6×7'})
        self.assertContains(response, '= 42')
        self.assertEqual(Calculation.objects.count(), 1)

    def test_clear_history(self):
        Calculation.objects.create(expression='1+1', result='2')
        self.client.post('/clear/')
        self.assertEqual(Calculation.objects.count(), 0)
