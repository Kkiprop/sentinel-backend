from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated, BasePermission

from .models import Checkpoint, Site, Route, Shift
from .serializers import CheckpointAdminSerializer, SiteSerializer, RouteSerializer, ShiftAdminSerializer


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "admin"
        )


class SiteAdminViewSet(ModelViewSet):
    queryset = Site.objects.all()
    serializer_class = SiteSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]


class RouteAdminViewSet(ModelViewSet):
    queryset = Route.objects.all()
    serializer_class = RouteSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]


class ShiftAdminViewSet(ModelViewSet):
    queryset = Shift.objects.all()
    serializer_class = ShiftAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]


class CheckpointAdminViewSet(ModelViewSet):
    queryset = Checkpoint.objects.select_related('route', 'route__site').all()
    serializer_class = CheckpointAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
