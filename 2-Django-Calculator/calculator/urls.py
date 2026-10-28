from django.urls import path

from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('clear/', views.clear_history, name='clear_history'),
]
