from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve as static_serve
import os

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("products.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/", include("promotions.urls")),
]

if settings.DEBUG:
    def serve_media(request, path, **kwargs):
        full_path = os.path.join(settings.MEDIA_ROOT, path)
        if os.path.isdir(full_path):
            from django.http import Http404
            raise Http404
        return static_serve(request, path, document_root=settings.MEDIA_ROOT, **kwargs)

    urlpatterns += [
        path("media/<path:path>", serve_media, name="media"),
    ]