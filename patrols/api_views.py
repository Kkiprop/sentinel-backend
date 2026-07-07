from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.views import APIView
from rest_framework.response import Response

from django.utils import timezone
from datetime import timedelta

from .models import Checkpoint, Site, Shift, Visitor, PatrolLog, GuardLocation
from .serializers import CheckpointAdminSerializer, SiteSerializer, ShiftAdminSerializer, VisitorSerializer, PatrolLogSerializer


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


class LiveTrackingAPIView(APIView):
    """
    Returns active guards with their current locations and latest patrol scans.
    Used by the admin tracking dashboard map.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        company = request.user.company
        site_id = request.query_params.get('site_id')

        # 1. Active guards with their GuardLocation
        active_shifts = Shift.objects.filter(
            guard__company=company,
            guard__role='guard',
            status='active'
        ).select_related('guard', 'site')

        if site_id:
            active_shifts = active_shifts.filter(site_id=site_id)

        guards_data = []
        for shift in active_shifts:
            try:
                guard_location = GuardLocation.objects.get(guard=shift.guard)
                location_data = {
                    'guard_id': shift.guard.id,
                    'guard_name': shift.guard.get_full_name().strip() or shift.guard.email,
                    'latitude': guard_location.latitude,
                    'longitude': guard_location.longitude,
                    'updated_at': guard_location.updated_at.isoformat(),
                    'site_name': shift.site.name,
                    'site_id': shift.site.id,
                    'shift_id': shift.id,
                    'shift_started_at': shift.start_time.isoformat(),
                }
                guards_data.append(location_data)
            except GuardLocation.DoesNotExist:
                # Guard has active shift but no location data yet
                pass

        # 2. Latest patrol scans (last 24 hours)
        logs_query = PatrolLog.objects.filter(
            shift__guard__company=company,
            scanned_at__gte=timezone.now() - timedelta(hours=24)
        ).select_related(
            'checkpoint',
            'shift__guard',
            'shift__site'
        ).order_by('-scanned_at')[:50]

        if site_id:
            logs_query = logs_query.filter(shift__site_id=site_id)

        scans_data = PatrolLogSerializer(logs_query, many=True).data

        return Response({
            'guards': guards_data,
            'scans': scans_data,
        })