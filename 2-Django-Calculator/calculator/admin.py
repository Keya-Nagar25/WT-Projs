from django.contrib import admin

from .models import Calculation


@admin.register(Calculation)
class CalculationAdmin(admin.ModelAdmin):
    list_display = ('expression', 'result', 'created_at')
