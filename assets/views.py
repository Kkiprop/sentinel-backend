from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q

from .models import Asset, AssetCategory, AssetAssignment
from .serializers import AssetSerializer, AssetCategorySerializer, AssetAssignmentSerializer
from .services import (
    get_asset_stats,
    assign_asset,
    unassign_asset,
    update_asset_status,
)


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "admin"
        )


class AssetCategoryViewSet(ReadOnlyModelViewSet):
    """
    List and retrieve asset categories for the current company.
    """
    serializer_class = AssetCategorySerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        return AssetCategory.objects.filter(company=self.request.user.company)


class AssetViewSet(ModelViewSet):
    """
    Full CRUD for assets, scoped to the current company.
    """
    serializer_class = AssetSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        queryset = Asset.objects.select_related(
            'category', 'site', 'assigned_to'
        ).filter(company=self.request.user.company)

        # Filtering
        category_id = self.request.query_params.get('category_id')
        if category_id:
            queryset = queryset.filter(category_id=category_id)

        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)

        condition = self.request.query_params.get('condition')
        if condition:
            queryset = queryset.filter(condition=condition)

        site_id = self.request.query_params.get('site_id')
        if site_id:
            queryset = queryset.filter(site_id=site_id)

        assigned_to = self.request.query_params.get('assigned_to')
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(serial_number__icontains=search) |
                Q(description__icontains=search)
            )

        return queryset

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class AssetDashboardAPIView(APIView):
    """
    Returns aggregated asset metrics for the admin dashboard.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        stats = get_asset_stats(request.user.company)
        return Response(stats)


class AssetAssignmentAPIView(APIView):
    """
    Assign or unassign an asset to/from a guard.
    POST with action 'assign' and guard_id, or action 'unassign'.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, asset_id):
        try:
            asset = Asset.objects.select_related(
                'category', 'site', 'assigned_to'
            ).get(id=asset_id, company=request.user.company)
        except Asset.DoesNotExist:
            return Response(
                {"error": "Asset not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        action = request.data.get('action')

        if action == 'assign':
            guard_id = request.data.get('guard_id')
            if not guard_id:
                return Response(
                    {"error": "guard_id is required for assignment"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            from accounts.models import User
            try:
                guard = User.objects.get(
                    id=guard_id,
                    company=request.user.company,
                    role='guard'
                )
            except User.DoesNotExist:
                return Response(
                    {"error": "Guard not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            notes = request.data.get('notes', '')
            try:
                assign_asset(asset, guard, notes=notes)
            except ValueError as e:
                return Response(
                    {"error": str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )

            return Response({
                "success": True,
                "message": f"Asset assigned to {guard.get_full_name() or guard.email}",
                "asset": AssetSerializer(asset).data,
            })

        elif action == 'unassign':
            notes = request.data.get('notes', '')
            unassign_asset(asset, notes=notes)
            return Response({
                "success": True,
                "message": "Asset unassigned successfully",
                "asset": AssetSerializer(asset).data,
            })

        elif action == 'update_status':
            new_status = request.data.get('status')
            if not new_status:
                return Response(
                    {"error": "status is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            try:
                update_asset_status(asset, new_status)
            except ValueError as e:
                return Response(
                    {"error": str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response({
                "success": True,
                "message": f"Asset status updated to {asset.get_status_display()}",
                "asset": AssetSerializer(asset).data,
            })

        else:
            return Response(
                {"error": "Invalid action. Use 'assign', 'unassign', or 'update_status'."},
                status=status.HTTP_400_BAD_REQUEST
            )


class AssetAssignmentHistoryAPIView(APIView):
    """
    Returns assignment history for a specific asset or all assets.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, asset_id=None):
        company = request.user.company
        
        if asset_id:
            # Get history for specific asset
            try:
                asset = Asset.objects.get(id=asset_id, company=company)
            except Asset.DoesNotExist:
                return Response(
                    {"error": "Asset not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            assignments = AssetAssignment.objects.filter(
                asset=asset
            ).select_related('assigned_to').order_by('-assigned_at')
        else:
            # Get all assignments for company
            assignments = AssetAssignment.objects.filter(
                asset__company=company
            ).select_related('asset', 'assigned_to').order_by('-assigned_at')
        
        serializer = AssetAssignmentSerializer(assignments, many=True)
        return Response(serializer.data)


class GuardAssetAssignmentsAPIView(APIView):
    """
    Returns all assets currently assigned to a specific guard.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, guard_id=None):
        company = request.user.company
        
        if guard_id:
            # Get assets assigned to specific guard
            from accounts.models import User
            try:
                guard = User.objects.get(id=guard_id, company=company, role='guard')
            except User.DoesNotExist:
                return Response(
                    {"error": "Guard not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            assets = Asset.objects.filter(
                assigned_to=guard,
                company=company
            ).select_related('category', 'site')
        else:
            # Get all assets assigned to any guard
            assets = Asset.objects.filter(
                assigned_to__isnull=False,
                company=company
            ).select_related('category', 'site', 'assigned_to')
        
        serializer = AssetSerializer(assets, many=True)
        return Response(serializer.data)
