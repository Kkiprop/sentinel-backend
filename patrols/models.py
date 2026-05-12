# patrols/models.py

import uuid

from django.db import models
from django.conf import settings
from django.utils import timezone

User = settings.AUTH_USER_MODEL


def generate_checkpoint_qr_value():
    return f"checkpoint:{uuid.uuid4().hex}"


class Site(models.Model):
    name = models.CharField(max_length=255)
    location_name = models.CharField(max_length=255)
    latitude = models.FloatField()
    longitude = models.FloatField()
    company = models.ForeignKey('accounts.Company', on_delete=models.CASCADE, related_name="sites")

    def __str__(self):
        return self.name


class Route(models.Model):
    name = models.CharField(max_length=255)
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="routes")

    def __str__(self):
        return f"{self.name} - {self.site.name}"


class Checkpoint(models.Model):
    name = models.CharField(max_length=255)
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name="checkpoints")

    latitude = models.FloatField()
    longitude = models.FloatField()

    qr_code = models.CharField(max_length=255, unique=True, default=generate_checkpoint_qr_value, blank=True)  # Encoded value

    order = models.PositiveIntegerField()  # sequence in route

    def __str__(self):
        return f"{self.name} ({self.route.name})"


class Shift(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('missed', 'Missed'),
    )

    guard = models.ForeignKey(User, on_delete=models.CASCADE, related_name="shifts")
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="shifts")

    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)

    start_latitude = models.FloatField(null=True, blank=True)
    start_longitude = models.FloatField(null=True, blank=True)

    end_latitude = models.FloatField(null=True, blank=True)
    end_longitude = models.FloatField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    class Meta:
        ordering = ['-start_time']

    def __str__(self):
        return f"{self.guard} - {self.site} ({self.status})"
    

class PatrolLog(models.Model):
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, related_name="logs")
    checkpoint = models.ForeignKey(Checkpoint, on_delete=models.CASCADE)

    scanned_at = models.DateTimeField(default=timezone.now)

    latitude = models.FloatField()
    longitude = models.FloatField()

    checkpoint_latitude = models.FloatField(null=True, blank=True)
    checkpoint_longitude = models.FloatField(null=True, blank=True)

    is_valid = models.BooleanField(default=True)
    distance_meters = models.FloatField(null=True, blank=True)

    invalid_reason = models.CharField(max_length=255, null=True, blank=True)
    client_id = models.CharField(max_length=255, unique=True, blank=True, null=True)  # For syncing with mobile logs

    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True  )

    class Meta:
        ordering = ['-scanned_at']

    def __str__(self):
        return f"{self.shift.guard} - {self.checkpoint.name}"


class Incident(models.Model):
    INCIDENT_TYPES = (
        ('theft', 'Theft'),
        ('fire', 'Fire'),
        ('suspicious', 'Suspicious Activity'),
        ('other', 'Other'),
    )

    guard = models.ForeignKey(User, on_delete=models.CASCADE)
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, related_name="incidents")

    type = models.CharField(max_length=50, choices=INCIDENT_TYPES)
    description = models.TextField()

    image = models.ImageField(upload_to='incidents/', null=True, blank=True)
    audio = models.FileField(upload_to='incidents/audio/', null=True, blank=True)
    video = models.FileField(upload_to='incidents/video/', null=True, blank=True)
    attachment = models.FileField(upload_to='incidents/files/', null=True, blank=True)

    latitude = models.FloatField()
    longitude = models.FloatField()

    created_at = models.DateTimeField(default=timezone.now)
    client_id = models.CharField(max_length=255, unique=True, blank=True, null=True)

    def __str__(self):
        return f"{self.type} - {self.guard}"
    

class SOS(models.Model):
    guard = models.ForeignKey(User, on_delete=models.CASCADE)
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, related_name="sos_alerts")

    latitude = models.FloatField()
    longitude = models.FloatField()

    triggered_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)

    def __str__(self):
        return f"SOS - {self.guard}"
    

class GuardLocation(models.Model):
    guard = models.OneToOneField(User, on_delete=models.CASCADE)
    latitude = models.FloatField()
    longitude = models.FloatField()
    updated_at = models.DateTimeField(auto_now=True)


class ExpectedCheckpoint(models.Model):
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, related_name="expected_checkpoints")
    checkpoint = models.ForeignKey(Checkpoint, on_delete=models.CASCADE)

    expected_time = models.DateTimeField()
    scanned = models.BooleanField(default=False)


# class PatrolLog(models.Model):
#     class Meta:
#         indexes = [
#             models.Index(fields=['shift']),
#             models.Index(fields=['checkpoint']),
#             models.Index(fields=['scanned_at']),
#         ]