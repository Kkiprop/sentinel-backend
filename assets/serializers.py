from rest_framework import serializers

from .models import Asset, AssetCategory, AssetAssignment


class AssetCategorySerializer(serializers.ModelSerializer):
    asset_count = serializers.SerializerMethodField()

    class Meta:
        model = AssetCategory
        fields = [
            'id',
            'company',
            'name',
            'description',
            'is_active',
            'asset_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'created_at',
            'updated_at',
            'company',
            'asset_count',
        ]

    def get_asset_count(self, obj):
        return obj.assets.count()


class AssetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    site_name = serializers.CharField(source='site.name', read_only=True)
    guard_name = serializers.SerializerMethodField()
    is_warranty_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Asset
        fields = [
            'id',
            'company',
            'category',
            'category_name',
            'site',
            'site_name',
            'assigned_to',
            'guard_name',
            'name',
            'serial_number',
            'description',
            'status',
            'condition',
            'purchase_date',
            'purchase_price',
            'warranty_end_date',
            'is_warranty_active',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'created_at',
            'updated_at',
            'company',
            'category_name',
            'site_name',
            'guard_name',
            'is_warranty_active',
        ]

    def get_guard_name(self, obj):
        if not obj.assigned_to:
            return None
        full_name = obj.assigned_to.get_full_name().strip()
        return full_name or obj.assigned_to.email

    def validate_serial_number(self, value):
        """
        Ensure serial number uniqueness within the company.
        """
        company = self.context['request'].user.company
        queryset = Asset.objects.filter(company=company, serial_number=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                "An asset with this serial number already exists for your company."
            )
        return value


class AssetAssignmentSerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    asset_serial = serializers.CharField(source='asset.serial_number', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    assigned_to_email = serializers.CharField(source='assigned_to.email', read_only=True)
    duration = serializers.SerializerMethodField()

    class Meta:
        model = AssetAssignment
        fields = [
            'id',
            'asset',
            'asset_name',
            'asset_serial',
            'assigned_to',
            'assigned_to_name',
            'assigned_to_email',
            'assigned_at',
            'unassigned_at',
            'duration',
            'notes',
        ]
        read_only_fields = [
            'assigned_at',
            'duration',
        ]

    def get_assigned_to_name(self, obj):
        if not obj.assigned_to:
            return None
        return obj.assigned_to.get_full_name() or obj.assigned_to.email

    def get_duration(self, obj):
        """
        Calculate how long the asset was assigned.
        """
        if obj.unassigned_at:
            delta = obj.unassigned_at - obj.assigned_at
            days = delta.days
            hours = delta.seconds // 3600
            if days > 0:
                return f"{days}d {hours}h"
            return f"{hours}h"
        return "Currently assigned"
