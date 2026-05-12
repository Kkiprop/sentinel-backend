from django.urls import path

from .views import (
    StartShiftAPIView,
    EndShiftAPIView,
    CurrentShiftAPIView,
    IncidentAPIView,
    IncidentFilterOptionsAPIView,
    QRScanAPIView,
    PatrolLogFilterOptionsAPIView,
    PatrolLogsAPIView,
    DashboardAPIView,
    SiteListAPIView,
    ShiftCalendarAPIView,
    ShiftCalendarFilterOptionsAPIView,
)

urlpatterns = [
    path('shifts/start/', StartShiftAPIView.as_view()),
    path('shifts/end/', EndShiftAPIView.as_view()),
    path('shifts/current/', CurrentShiftAPIView.as_view()),
    path('shifts/', ShiftCalendarAPIView.as_view()),
    path('shifts/filters/', ShiftCalendarFilterOptionsAPIView.as_view()),
    path('scan/', QRScanAPIView.as_view()),
    path('incidents/', IncidentAPIView.as_view()),
    path('incidents/filters/', IncidentFilterOptionsAPIView.as_view()),
    path('sites/', SiteListAPIView.as_view()),
    path('patrol-logs/', PatrolLogsAPIView.as_view()),
    path('patrol-logs/filters/', PatrolLogFilterOptionsAPIView.as_view()),
    path('dashboard/', DashboardAPIView.as_view()),
]

from rest_framework.routers import DefaultRouter
from .api_views import CheckpointAdminViewSet, SiteAdminViewSet, RouteAdminViewSet, ShiftAdminViewSet

router = DefaultRouter()
router.register(r'manage/sites', SiteAdminViewSet, basename='manage-sites')
router.register(r'manage/routes', RouteAdminViewSet, basename='manage-routes')
router.register(r'manage/shifts', ShiftAdminViewSet, basename='manage-shifts')
router.register(r'manage/checkpoints', CheckpointAdminViewSet, basename='manage-checkpoints')

urlpatterns += router.urls