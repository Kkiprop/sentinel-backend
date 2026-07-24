from django.urls import path, include
from rest_framework.routers import DefaultRouter

from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

from .views import (
    LoginAPIView, UserViewSet, CompanyViewSet, OrganisationViewSet,
    CompanyProfileAPIView, BillingPlanViewSet,
    MySubscriptionAPIView, SubscribeAPIView, CancelSubscriptionAPIView,
    BillingHistoryAPIView,
)

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"companies", CompanyViewSet, basename="company")
router.register(r"organisations", OrganisationViewSet, basename="organisation")
router.register(r"billing-plans", BillingPlanViewSet, basename="billing-plans")

urlpatterns = [
    path("login/", LoginAPIView.as_view()),
    path("token/refresh/", TokenRefreshView.as_view()),

    # Company profile
    path("profile/", CompanyProfileAPIView.as_view(), name="company-profile"),

    # Subscription management
    path("subscription/", MySubscriptionAPIView.as_view(), name="my-subscription"),
    path("subscription/subscribe/", SubscribeAPIView.as_view(), name="subscribe"),
    path("subscription/cancel/", CancelSubscriptionAPIView.as_view(), name="cancel-subscription"),
    path("billing-history/", BillingHistoryAPIView.as_view(), name="billing-history"),
]

urlpatterns += router.urls