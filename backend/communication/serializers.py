from rest_framework import serializers
from .models import DeviceToken, Notification, ChatMessage, ChatConversation


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = ['id', 'token', 'platform', 'is_active', 'created_at']
        read_only_fields = ['id', 'is_active', 'created_at']

    def validate_platform(self, value):
        valid = ['android', 'ios', 'web']
        if value not in valid:
            raise serializers.ValidationError(f"Platform must be one of: {', '.join(valid)}")
        return value


class NotificationSerializer(serializers.ModelSerializer):
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'priority', 'title', 'body',
            'data', 'is_read', 'read_at', 'created_at', 'time_ago'
        ]
        read_only_fields = ['id', 'is_read', 'read_at', 'created_at', 'time_ago']

    def get_time_ago(self, obj):
        from django.utils import timezone
        delta = timezone.now() - obj.created_at
        if delta.days > 0:
            return f"{delta.days}d ago"
        if delta.seconds >= 3600:
            return f"{delta.seconds // 3600}h ago"
        if delta.seconds >= 60:
            return f"{delta.seconds // 60}m ago"
        return "just now"


class NotificationMarkReadSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(), required=False)


class NotificationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating notifications (admin broadcast, etc.)."""
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of user IDs to send to. If omitted and company is set, sends to all users in that company."
    )
    company_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'priority', 'title', 'body',
            'data', 'user_ids', 'company_id', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'conversation', 'sender', 'sender_name', 'recipient',
            'message_type', 'content', 'attachment', 'is_read',
            'read_at', 'created_at', 'time_ago'
        ]
        read_only_fields = [
            'id', 'sender', 'sender_name', 'is_read', 'read_at',
            'created_at', 'time_ago'
        ]

    def get_sender_name(self, obj):
        return obj.sender.get_full_name().strip() or obj.sender.email

    def get_time_ago(self, obj):
        from django.utils import timezone
        delta = timezone.now() - obj.created_at
        if delta.days > 0:
            return f"{delta.days}d ago"
        if delta.seconds >= 3600:
            return f"{delta.seconds // 3600}h ago"
        if delta.seconds >= 60:
            return f"{delta.seconds // 60}m ago"
        return "just now"


class ChatMessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = [
            'conversation', 'recipient', 'message_type', 'content', 'attachment'
        ]


class ChatConversationSerializer(serializers.ModelSerializer):
    participant_names = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()
    messages_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatConversation
        fields = [
            'id', 'participants', 'participant_names', 'title', 'is_group',
            'last_message', 'last_message_at', 'unread_count',
            'last_message_preview', 'messages_count', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'last_message', 'last_message_at', 'unread_count',
            'last_message_preview', 'messages_count', 'created_at', 'updated_at'
        ]

    def get_participant_names(self, obj):
        return [
            {
                'id': u.id,
                'name': u.get_full_name().strip() or u.email,
                'role': u.role,
            }
            for u in obj.participants.all()
        ]

    def get_unread_count(self, obj):
        user = self.context.get('request').user
        return ChatMessage.objects.filter(
            conversation=obj,
            recipient=user,
            is_read=False
        ).count()

    def get_last_message_preview(self, obj):
        if obj.last_message:
            return obj.last_message[:100]
        return None

    def get_messages_count(self, obj):
        return obj.messages.count()
