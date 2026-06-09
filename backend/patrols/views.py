from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.core.paginator import EmptyPage, Paginator
from django.db.models import Count
from .models import Incident, Shift, PatrolLog, Site
from .serializers import (
    IncidentCreateSerializer,
    IncidentSerializer,
    ShiftCalendarSerializer,
    StartShiftSerializer,
    EndShiftSerializer,
    ShiftSerializer,
    QRScanSerializer,
    SiteSerializer,
    PatrolLogSerializer,
)
from .services import (
    create_incident_report,
    start_shift,
    end_shift,
    process_qr_scan,
)


DEFAULT_HISTORY_PAGE_SIZE = 20
MAX_HISTORY_PAGE_SIZE = 100


def is_supervisor_view(user):
    return getattr(user, 'role', None) in ['admin', 'supervisor']


def get_history_page_size(request):
    raw_page_size = request.query_params.get('page_size')

    try:
        page_size = int(raw_page_size or DEFAULT_HISTORY_PAGE_SIZE)
    except (TypeError, ValueError):
        page_size = DEFAULT_HISTORY_PAGE_SIZE

    return max(1, min(page_size, MAX_HISTORY_PAGE_SIZE))


def get_history_page_number(request):
    raw_page = request.query_params.get('page')

    try:
        page_number = int(raw_page or 1)
    except (TypeError, ValueError):
        page_number = 1

    return max(1, page_number)


def paginate_serialized_data(items, request, serializer_class, serializer_kwargs=None):
    serializer_kwargs = serializer_kwargs or {}

    paginator = Paginator(
        items,
        get_history_page_size(request)
    )

    page_number = get_history_page_number(request)

    try:
        page_obj = paginator.page(page_number)
    except EmptyPage:
        page_obj = paginator.page(paginator.num_pages or 1)

    serializer = serializer_class(
        page_obj.object_list,
        many=True,
        **serializer_kwargs
    )

    return Response({
        'count': paginator.count,
        'page': page_obj.number,
        'page_size': paginator.per_page,
        'total_pages': paginator.num_pages,
        'has_next': page_obj.has_next(),
        'has_previous': page_obj.has_previous(),
        'results': serializer.data,
    })


def get_scoped_shifts(user):
    if is_supervisor_view(user):
        return Shift.objects.filter(
            guard__company=user.company
        )
    return Shift.objects.filter(
        guard=user
    )


def get_scoped_incidents(user):
    if is_supervisor_view(user):
        return Incident.objects.filter(
            guard__company=user.company
        )

    return Incident.objects.filter(
        guard=user
    )


def get_scoped_patrol_logs(user):
    if is_supervisor_view(user):
        return PatrolLog.objects.filter(
            shift__guard__company=user.company
        )

    return PatrolLog.objects.filter(
        shift__guard=user
    )


def build_history_filter_options(items, item_getters):
    values = {}

    for key in item_getters:
        values[key] = {}

    for item in items:
        for key, getter in item_getters.items():
            option = getter(item)

            if not option:
                continue

            values[key][option['value']] = option

    return {
        key: sorted(
            value_map.values(),
            key=lambda option: option['label']
        )
        for key, value_map in values.items()
    }


class StartShiftAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = StartShiftSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        try:
            shift = start_shift(
                request.user,
                serializer.validated_data
            )

            return Response({
                "message": "Shift started",
                "shift": ShiftSerializer(shift).data
            })

        except Exception as e:

            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        

class EndShiftAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = EndShiftSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        try:
            shift = end_shift(
                request.user,
                serializer.validated_data
            )

            return Response({
                "message": "Shift ended",
                "shift": ShiftSerializer(shift).data
            })

        except Exception as e:

            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class CurrentShiftAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        shift = Shift.objects.filter(
            guard=request.user,
            status='active'
        ).first()

        if not shift:
            return Response({
                "active": False
            })

        return Response({
            "active": True,
            "shift": ShiftSerializer(shift).data
        })
    

class QRScanAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = QRScanSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        try:

            patrol_log = process_qr_scan(
                request.user,
                serializer.validated_data
            )

            return Response({
                "success": True,

                "patrol_log_id": patrol_log.id,

                "is_valid": patrol_log.is_valid,

                "distance_meters":
                    patrol_log.distance_meters,

                "invalid_reason":
                    patrol_log.invalid_reason,
            })

        except Exception as e:

            return Response(
                {
                    "success": False,
                    "error": str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )


class IncidentAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        incident_type = request.query_params.get('type')
        incident_date = request.query_params.get('date')
        guard_id = request.query_params.get('guard_id')
        site_id = request.query_params.get('site_id')

        incidents = get_scoped_incidents(
            request.user
        ).select_related(
            'guard',
            'shift__site'
        )

        if incident_type:
            incidents = incidents.filter(
                type=incident_type
            )

        if incident_date:
            incidents = incidents.filter(
                created_at__date=incident_date
            )

        if guard_id and is_supervisor_view(request.user):
            incidents = incidents.filter(
                guard_id=guard_id
            )

        if site_id and is_supervisor_view(request.user):
            incidents = incidents.filter(
                shift__site_id=site_id
            )

        incidents = incidents.order_by('-created_at')

        return paginate_serialized_data(
            incidents,
            request,
            IncidentSerializer,
            serializer_kwargs={
                'context': {'request': request}
            }
        )

    def post(self, request):

        serializer = IncidentCreateSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        try:

            incident = create_incident_report(
                request.user,
                serializer.validated_data
            )

            return Response({
                "success": True,
                "incident_id": incident.id,
                "message": "Incident reported",
            })

        except Exception as e:

            return Response(
                {
                    "success": False,
                    "error": str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )


class IncidentFilterOptionsAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        incidents = get_scoped_incidents(
            request.user
        ).select_related(
            'guard',
            'shift__site'
        )

        options = build_history_filter_options(
            incidents,
            {
                'guards': lambda incident: (
                    {
                        'value': incident.guard_id,
                        'label': incident.guard.get_full_name().strip() or incident.guard.email,
                    }
                    if is_supervisor_view(request.user) else None
                ),
                'sites': lambda incident: (
                    {
                        'value': incident.shift.site_id,
                        'label': incident.shift.site.name,
                    }
                    if is_supervisor_view(request.user) else None
                ),
            }
        )

        return Response({
            'types': [
                {'value': value, 'label': label}
                for value, label in Incident.INCIDENT_TYPES
            ],
            'guards': options['guards'],
            'sites': options['sites'],
        })
        

class SiteListAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        sites = Site.objects.filter(
            company=request.user.company
        )

        serializer = SiteSerializer(
            sites,
            many=True
        )

        return Response(serializer.data)
    

class PatrolLogsAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        log_date = request.query_params.get('date')
        guard_id = request.query_params.get('guard_id')
        site_id = request.query_params.get('site_id')
        validity = request.query_params.get('validity')

        logs = get_scoped_patrol_logs(
            request.user
        ).select_related(
            'checkpoint',
            'shift__guard',
            'shift__site'
        )

        if log_date:
            logs = logs.filter(
                scanned_at__date=log_date
            )

        if validity in ['true', 'false']:
            logs = logs.filter(
                is_valid=(validity == 'true')
            )

        if site_id and is_supervisor_view(request.user):
            logs = logs.filter(
                shift__site_id=site_id
            )

        if guard_id and is_supervisor_view(request.user):
            logs = logs.filter(
                shift__guard_id=guard_id
            )

        logs = logs.order_by('-scanned_at')

        return paginate_serialized_data(
            logs,
            request,
            PatrolLogSerializer
        )


class PatrolLogFilterOptionsAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        logs = get_scoped_patrol_logs(
            request.user
        ).select_related(
            'shift__guard',
            'shift__site'
        )

        options = build_history_filter_options(
            logs,
            {
                'guards': lambda log: (
                    {
                        'value': log.shift.guard_id,
                        'label': log.shift.guard.get_full_name().strip() or log.shift.guard.email,
                    }
                    if is_supervisor_view(request.user) else None
                ),
                'sites': lambda log: (
                    {
                        'value': log.shift.site_id,
                        'label': log.shift.site.name,
                    }
                    if is_supervisor_view(request.user) else None
                ),
            }
        )

        return Response({
            'validity': [
                {'value': 'true', 'label': 'Valid'},
                {'value': 'false', 'label': 'Invalid'},
            ],
            'guards': options['guards'],
            'sites': options['sites'],
        })

        return Response(serializer.data)
    

class DashboardAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        scoped_shifts = get_scoped_shifts(request.user)
        scoped_logs = get_scoped_patrol_logs(request.user)

        active_shift = scoped_shifts.filter(
            status='active'
        ).first()

        total_logs = scoped_logs.count()

        valid_logs = scoped_logs.filter(
            is_valid=True
        ).count()

        invalid_logs = scoped_logs.filter(
            is_valid=False
        ).count()

        return Response({

            "active_shift": bool(active_shift),

            "shift_id":
                active_shift.id
                if active_shift else None,

            "total_patrol_logs": total_logs,

            "valid_patrol_logs": valid_logs,

            "invalid_patrol_logs": invalid_logs,
        })


class ShiftCalendarAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        shifts = get_scoped_shifts(request.user).select_related(
            'guard', 'site'
        ).prefetch_related('logs', 'incidents')

        year = request.query_params.get('year')
        month = request.query_params.get('month')
        shift_status = request.query_params.get('status')
        guard_id = request.query_params.get('guard_id')
        site_id = request.query_params.get('site_id')

        if year:
            try:
                shifts = shifts.filter(start_time__year=int(year))
            except (ValueError, TypeError):
                pass

        if month:
            try:
                shifts = shifts.filter(start_time__month=int(month))
            except (ValueError, TypeError):
                pass

        if shift_status:
            shifts = shifts.filter(status=shift_status)

        if guard_id and is_supervisor_view(request.user):
            try:
                shifts = shifts.filter(guard_id=int(guard_id))
            except (ValueError, TypeError):
                pass

        if site_id and is_supervisor_view(request.user):
            try:
                shifts = shifts.filter(site_id=int(site_id))
            except (ValueError, TypeError):
                pass

        shifts = shifts.order_by('-start_time')

        return paginate_serialized_data(
            shifts,
            request,
            ShiftCalendarSerializer
        )


class ShiftCalendarFilterOptionsAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        shifts = get_scoped_shifts(request.user).select_related(
            'guard', 'site'
        )

        options = build_history_filter_options(
            shifts,
            {
                'guards': lambda shift: (
                    {
                        'value': shift.guard_id,
                        'label': shift.guard.get_full_name().strip() or shift.guard.email,
                    }
                    if is_supervisor_view(request.user) else None
                ),
                'sites': lambda shift: {
                    'value': shift.site_id,
                    'label': shift.site.name,
                },
            }
        )

        return Response({
            'statuses': [
                {'value': value, 'label': label}
                for value, label in Shift.STATUS_CHOICES
            ],
            'guards': options['guards'],
            'sites': options['sites'],
        })