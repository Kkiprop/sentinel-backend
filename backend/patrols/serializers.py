import base64
from io import BytesIO

import qrcode
from rest_framework import serializers

from .models import Checkpoint, Incident, Shift, Site, PatrolLog, Visitor
from accounts.models import User

class ShiftSerializer(serializers.ModelSerializer):

    site_name = serializers.CharField(source='site.name', read_only=True)

    class Meta:
        model = Shift
        fields = [
            'id',
            'site_name',
            'status',
            'start_time',
            'end_time',
            'start_latitude',
            'start_longitude',
            'end_latitude',
            'end_longitude',
        ]
        

class PatrolLogSyncSerializer(serializers.Serializer):
    checkpoint_qr = serializers.CharField()
    scanned_at = serializers.DateTimeField()

    latitude = serializers.FloatField()
    longitude = serializers.FloatField()


class IncidentSyncSerializer(serializers.Serializer):
    type = serializers.CharField()
    description = serializers.CharField()

    latitude = serializers.FloatField()
    longitude = serializers.FloatField()

    created_at = serializers.DateTimeField()
    client_id = serializers.CharField()


class SyncSerializer(serializers.Serializer):
    patrol_logs = PatrolLogSyncSerializer(many=True, required=False)
    incidents = IncidentSyncSerializer(many=True, required=False)


class StartShiftSerializer(serializers.Serializer):
    site_id = serializers.IntegerField()
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()


class EndShiftSerializer(serializers.Serializer):
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()


class QRScanSerializer(serializers.Serializer):

    checkpoint_qr = serializers.CharField()

    latitude = serializers.FloatField()
    longitude = serializers.FloatField()

    scanned_at = serializers.DateTimeField()

    client_id = serializers.CharField()


class IncidentCreateSerializer(serializers.Serializer):
    type = serializers.CharField()
    description = serializers.CharField()

    latitude = serializers.FloatField()
    longitude = serializers.FloatField()

    created_at = serializers.DateTimeField()
    client_id = serializers.CharField()
    image = serializers.ImageField(required=False, allow_null=True)
    audio = serializers.FileField(required=False, allow_null=True)
    video = serializers.FileField(required=False, allow_null=True)
    attachment = serializers.FileField(required=False, allow_null=True)


class IncidentSerializer(serializers.ModelSerializer):
    guard_name = serializers.SerializerMethodField()
    site_name = serializers.CharField(source='shift.site.name', read_only=True)
    shift_status = serializers.CharField(source='shift.status', read_only=True)

    class Meta:
        model = Incident
        fields = [
            'id',
            'type',
            'description',
            'latitude',
            'longitude',
            'created_at',
            'client_id',
            'image',
            'audio',
            'video',
            'attachment',
            'site_name',
            'shift_status',
            'guard_name',
        ]

    def get_guard_name(self, obj):
        full_name = obj.guard.get_full_name().strip()
        return full_name or obj.guard.email


class ShiftCalendarSerializer(serializers.ModelSerializer):
    guard_id = serializers.IntegerField(read_only=True)
    site_id = serializers.IntegerField(read_only=True)
    guard_name = serializers.SerializerMethodField()
    site_name = serializers.CharField(source='site.name', read_only=True)
    patrol_log_count = serializers.SerializerMethodField()
    incident_count = serializers.SerializerMethodField()
    duration_minutes = serializers.SerializerMethodField()

    class Meta:
        model = Shift
        fields = [
            'id',
            'guard_id',
            'guard_name',
            'site_id',
            'site_name',
            'status',
            'start_time',
            'end_time',
            'start_latitude',
            'start_longitude',
            'end_latitude',
            'end_longitude',
            'patrol_log_count',
            'incident_count',
            'duration_minutes',
        ]

    def get_guard_name(self, obj):
        full_name = obj.guard.get_full_name().strip()
        return full_name or obj.guard.email

    def get_patrol_log_count(self, obj):
        return obj.logs.count()

    def get_incident_count(self, obj):
        return obj.incidents.count()

    def get_duration_minutes(self, obj):
        if obj.start_time and obj.end_time:
            delta = obj.end_time - obj.start_time
            return round(delta.total_seconds() / 60)
        return None


class SiteSerializer(serializers.ModelSerializer):
    organisation_id = serializers.IntegerField(read_only=True)
    organisation_name = serializers.CharField(source='organisation.name', read_only=True)
    guard_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        read_only=True,
        source='guards'
    )

    class Meta:
        model = Site
        fields = [
            'id',
            'name',
            'location_name',
            'latitude',
            'longitude',
            'organisation_id',
            'organisation_name',
            'guard_ids',
        ]


class VisitorSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Visitor
        fields = [
            'id',
            'first_name',
            'last_name',
            'full_name',
            'phone_number',
            'email',
            'department',
            'check_in',
            'check_out',
        ]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class PatrolLogSerializer(serializers.ModelSerializer):
    guard_name = serializers.SerializerMethodField()
    site_name = serializers.CharField(source='shift.site.name', read_only=True)
    shift_status = serializers.CharField(source='shift.status', read_only=True)

    checkpoint_name = serializers.CharField(
        source='checkpoint.name',
        read_only=True
    )

    class Meta:
        model = PatrolLog

        fields = [
            'id',

            'checkpoint_name',

            'scanned_at',

            'latitude',
            'longitude',

            'checkpoint_latitude',
            'checkpoint_longitude',

            'distance_meters',

            'is_valid',
            'invalid_reason',

            'site_name',
            'shift_status',
            'guard_name',
        ]

    def get_guard_name(self, obj):
        full_name = obj.shift.guard.get_full_name().strip()
        return full_name or obj.shift.guard.email


class CheckpointAdminSerializer(serializers.ModelSerializer):
    site_name = serializers.CharField(source='site.name', read_only=True)
    qr_code_image = serializers.SerializerMethodField()

    class Meta:
        model = Checkpoint
        fields = [
            "id",
            "name",
            "site",
            "site_name",
            "latitude",
            "longitude",
            "order",
            "qr_code",
            "qr_code_image",
        ]
        read_only_fields = ["qr_code", "qr_code_image", "site_name"]

    def validate_latitude(self, value):
        if value < -90 or value > 90:
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_longitude(self, value):
        if value < -180 or value > 180:
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value

    def get_qr_code_image(self, obj):
        qr_image = qrcode.make(obj.qr_code)
        image_buffer = BytesIO()
        qr_image.save(image_buffer, format='PNG')
        encoded_image = base64.b64encode(image_buffer.getvalue()).decode('ascii')
        return f"data:image/png;base64,{encoded_image}"


class ShiftAdminSerializer(serializers.ModelSerializer):
    guard = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    site = serializers.PrimaryKeyRelatedField(queryset=Site.objects.all())

    class Meta:
        model = Shift
        fields = [
            "id",
            "guard",
            "site",
            "start_time",
            "end_time",
            "status",
            "start_latitude",
            "start_longitude",
            "end_latitude",
            "end_longitude",
        ]