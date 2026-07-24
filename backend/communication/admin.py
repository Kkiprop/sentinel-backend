from django.contrib import admin
from .models import DeviceToken, Notification, ChatConversation, ChatMessage


@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'platform', 'is_active', 'created_at']
    list_filter = ['platform', 'is_active', 'created_at']
    search_fields = ['user__email', 'token']
    list_select_related = ['user']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'notification_type', 'priority', 'title', 'is_read', 'created_at']
    list_filter = ['notification_type', 'priority', 'is_read', 'created_at']
    search_fields = ['user__email', 'title', 'body']
    list_select_related = ['user']
    actions = ['mark_as_read', 'mark_as_unread']

    @admin.action(description="Mark selected as read")
    def mark_as_read(self, request, queryset):
        queryset.update(is_read=True)

    @admin.action(description="Mark selected as unread")
    def mark_as_unread(self, request, queryset):
        queryset.update(is_read=False)


@admin.register(ChatConversation)
class ChatConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'is_group', 'participant_count', 'last_message_at', 'created_at']
    list_filter = ['is_group', 'created_at']
    search_fields = ['title']
    filter_horizontal = ['participants']

    def participant_count(self, obj):
        return obj.participants.count()
    participant_count.short_description = "Participants"


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'recipient', 'conversation', 'message_type', 'is_read', 'created_at']
    list_filter = ['message_type', 'is_read', 'created_at']
    search_fields = ['sender__email', 'recipient__email', 'content']
    list_select_related = ['sender', 'recipient', 'conversation']
    readonly_fields = ['created_at']
