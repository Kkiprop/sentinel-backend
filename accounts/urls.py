from django.urls import path
from rest_framework.routers import DefaultRouter

from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

from .views import LoginAPIView, UserViewSet, CompanyViewSet, OrganisationViewSet

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"companies", CompanyViewSet, basename="company")
router.register(r"organisations", OrganisationViewSet, basename="organisation")

urlpatterns = [
    path("login/", LoginAPIView.as_view()),

    path(
        "token/refresh/",
        TokenRefreshView.as_view(),
    ),
]

urlpatterns += router.urls