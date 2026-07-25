from django.shortcuts import render

# Create your views here.
# api/views.py

from rest_framework.response import Response
from rest_framework.decorators import api_view

@api_view(["GET"])
def hello(request):
    return Response({
        "message": "Hello from Ezraa!"
    })