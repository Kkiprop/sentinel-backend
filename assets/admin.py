from django.contrib import admin

from .models import Asset, AssetCategory


@admin.register(AssetCategory)
class AssetCategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'company', 'is_active', 'created_at')
    list_filter = ('company', 'is_active', 'created_at')
    search_fields = ('name', 'description', 'company__name')


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'name', 'serial_number', 'category', 'company',
        'status', 'condition', 'site', 'assigned_to', 'created_at'
    )
    list_filter = (
        'company', 'category', 'status', 'condition',
        'site', 'assigned_to', 'created_at'
    )
    search_fields = (
        'name', 'serial_number', 'description',
        'category__name', 'site__name', 'assigned_to__email'
    )
    date_hierarchy = 'created_at'
