from django.contrib import admin
from django.urls import path, include
from api.views import hello

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/hello/", hello),
    path("api/", include("products.urls")),
]