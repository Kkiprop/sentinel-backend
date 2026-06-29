from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated, BasePermission

from .models import Checkpoint, Site, Shift, Visitor
from .serializers import CheckpointAdminSerializer, SiteSerializer, ShiftAdminSerializer, VisitorSerializer


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "admin"
        )


class SiteAdminViewSet(ModelViewSet):
    serializer_class = SiteSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        return Site.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class ShiftAdminViewSet(ModelViewSet):
    serializer_class = ShiftAdminSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Shift.objects.filter(site__company=self.request.user.company)


class CheckpointAdminViewSet(ModelViewSet):
    serializer_class = CheckpointAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        queryset = Checkpoint.objects.select_related('site').filter(site__company=self.request.user.company)
        site_id = self.request.query_params.get('site_id')
        if site_id:
            queryset = queryset.filter(site_id=site_id)
        return queryset


class VisitorAdminViewSet(ModelViewSet):
    serializer_class = VisitorSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        return Visitor.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)
