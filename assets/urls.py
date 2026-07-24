from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AssetCategoryViewSet,
    AssetViewSet,
    AssetDashboardAPIView,
    AssetAssignmentAPIView,
)

router = DefaultRouter()
router.register(r'categories', AssetCategoryViewSet, basename='asset-categories')
router.register(r'', AssetViewSet, basename='asset')

urlpatterns = [
    path('dashboard/', AssetDashboardAPIView.as_view(), name='asset-dashboard'),
    path('<int:asset_id>/assignment/', AssetAssignmentAPIView.as_view(), name='asset-assignment'),
]

urlpatterns += router.urls
