from django.contrib import admin

from .models import (
	Site,
	Route,
	Checkpoint,
	Shift,
	PatrolLog,
	Incident,
	SOS,
	GuardLocation,
	ExpectedCheckpoint,
)


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
	list_display = ('id', 'type', 'guard', 'shift', 'created_at')
	list_filter = ('type', 'created_at')
	search_fields = ('description', 'guard__email', 'client_id')


# Register all patrols models with default ModelAdmin
admin.site.register(Site)
admin.site.register(Route)
admin.site.register(Checkpoint)
admin.site.register(Shift)
admin.site.register(PatrolLog)
admin.site.register(SOS)
admin.site.register(GuardLocation)
admin.site.register(ExpectedCheckpoint)
