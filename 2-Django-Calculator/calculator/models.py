from django.db import models


class Calculation(models.Model):
    """One calculation the user performed, saved for the history panel."""
    expression = models.CharField(max_length=200)
    result = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.expression} = {self.result}"
