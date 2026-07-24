from django.db.models import Count, Q, Sum
from django.utils import timezone

from .models import Asset, AssetCategory, AssetAssignment


def get_asset_stats(company):
    """
    Return aggregated asset metrics for the dashboard.
    """
    assets = Asset.objects.filter(company=company)

    total_assets = assets.count()

    status_counts = dict(
        assets.values_list('status').order_by('status')
        .aggregate(**{
            key: Count('id', filter=Q(status=key))
            for key in dict(Asset.STATUS_CHOICES)
        })
    )

    condition_counts = dict(
        assets.values_list('condition').order_by('condition')
        .aggregate(**{
            key: Count('id', filter=Q(condition=key))
            for key in dict(Asset.CONDITION_CHOICES)
        })
    )

    total_value = assets.aggregate(
        total=Sum('purchase_price')
    )['total'] or 0

    assets_needing_maintenance = assets.filter(
        status='maintenance'
    ).count()

    assets_out_of_warranty = assets.filter(
        warranty_end_date__lt=timezone.now().date()
    ).exclude(warranty_end_date__isnull=True).count()

    category_breakdown = list(
        AssetCategory.objects
        .filter(company=company, is_active=True)
        .annotate(asset_count=Count('assets'))
        .values('id', 'name', 'asset_count')
    )

    return {
        'total_assets': total_assets,
        'status_counts': status_counts,
        'condition_counts': condition_counts,
        'total_value': float(total_value),
        'assets_needing_maintenance': assets_needing_maintenance,
        'assets_out_of_warranty': assets_out_of_warranty,
        'category_breakdown': category_breakdown,
    }


def assign_asset(asset, user, notes=None):
    """
    Assign an asset to a guard/user and create assignment history record.
    """
    if asset.status == 'retired' or asset.status == 'lost':
        raise ValueError(
            f"Cannot assign an asset that is {asset.get_status_display().lower()}."
        )

    # Close any open assignment history records for this asset
    AssetAssignment.objects.filter(
        asset=asset,
        unassigned_at__isnull=True
    ).update(unassigned_at=timezone.now())

    # Create new assignment history record
    AssetAssignment.objects.create(
        asset=asset,
        assigned_to=user,
        notes=notes
    )

    asset.assigned_to = user
    asset.status = 'in_use'
    asset.save(update_fields=['assigned_to', 'status'])
    return asset


def unassign_asset(asset, notes=None):
    """
    Unassign an asset from its current user and update assignment history.
    """
    # Close the current assignment history record
    AssetAssignment.objects.filter(
        asset=asset,
        unassigned_at__isnull=True
    ).update(unassigned_at=timezone.now(), notes=notes)

    asset.assigned_to = None
    asset.status = 'available'
    asset.save(update_fields=['assigned_to', 'status'])
    return asset


def update_asset_status(asset, status):
    """
    Update the status of an asset.
    """
    valid_statuses = dict(Asset.STATUS_CHOICES)
    if status not in valid_statuses:
        raise ValueError(f"Invalid status: {status}")

    asset.status = status
    asset.save(update_fields=['status'])
    return asset
