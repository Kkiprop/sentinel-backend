from django.db import models
from django.conf import settings
from django.utils import timezone


class AssetCategory(models.Model):
    """
    Categories for grouping assets (e.g. Weapons, Vehicles, Radios, Equipment).
    """
    company = models.ForeignKey(
        'accounts.Company',
        on_delete=models.CASCADE,
        related_name="asset_categories"
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        unique_together = ['company', 'name']

    def __str__(self):
        return self.name


class Asset(models.Model):
    """
    Tracks physical security assets owned by a company.
    """
    STATUS_CHOICES = (
        ('available', 'Available'),
        ('in_use', 'In Use'),
        ('maintenance', 'Maintenance'),
        ('retired', 'Retired'),
        ('lost', 'Lost / Stolen'),
    )

    CONDITION_CHOICES = (
        ('new', 'New'),
        ('excellent', 'Excellent'),
        ('good', 'Good'),
        ('fair', 'Fair'),
        ('poor', 'Poor'),
    )

    company = models.ForeignKey(
        'accounts.Company',
        on_delete=models.CASCADE,
        related_name="assets"
    )
    category = models.ForeignKey(
        AssetCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assets"
    )
    site = models.ForeignKey(
        'patrols.Site',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assets"
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_assets"
    )

    name = models.CharField(max_length=255)
    serial_number = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='good')

    purchase_date = models.DateField(null=True, blank=True)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    warranty_end_date = models.DateField(null=True, blank=True)

    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['company', 'category']),
            models.Index(fields=['company', 'assigned_to']),
        ]

    def __str__(self):
        return f"{self.name} ({self.serial_number})"

    @property
    def is_warranty_active(self):
        if not self.warranty_end_date:
            return False
        return timezone.now().date() <= self.warranty_end_date


class AssetAssignment(models.Model):
    """
    Tracks assignment history for assets.
    """
    asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        related_name="assignment_history"
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="asset_assignments"
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    unassigned_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True, help_text="Reason for assignment/unassignment")

    class Meta:
        ordering = ['-assigned_at']
        indexes = [
            models.Index(fields=['asset', 'assigned_at']),
            models.Index(fields=['assigned_to', 'assigned_at']),
        ]

    def __str__(self):
        if self.assigned_to:
            return f"{self.asset.name} assigned to {self.assigned_to.get_full_name() or self.assigned_to.email}"
        return f"{self.asset.name} unassigned"
