from django.db import models
from django.conf import settings
from django.utils import timezone

User = settings.AUTH_USER_MODEL


class DeviceToken(models.Model):
    """
    Stores Firebase Cloud Messaging (FCM) device tokens for push notifications.
    Each user can have multiple devices (phone, tablet).
    """
    PLATFORM_CHOICES = (
        ('android', 'Android'),
        ('ios', 'iOS'),
        ('web', 'Web'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="device_tokens")
    token = models.CharField(max_length=500, unique=True)
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES, default='android')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} ({self.get_platform_display()})"


class Notification(models.Model):
    """
    Stores notifications for users — can be triggered by system events,
    admin broadcasts, SOS alerts, incident reports, etc.
    """
    NOTIFICATION_TYPES = (
        ('broadcast', 'Broadcast'),
        ('sos_alert', 'SOS Alert'),
        ('incident', 'Incident Report'),
        ('shift_reminder', 'Shift Reminder'),
        ('missed_checkpoint', 'Missed Checkpoint'),
        ('schedule_change', 'Schedule Change'),
        ('chat_message', 'New Chat Message'),
        ('system', 'System Notification'),
    )

    PRIORITY_CHOICES = (
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES, default='system')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    title = models.CharField(max_length=255)
    body = models.TextField()
    data = models.JSONField(null=True, blank=True, help_text="Optional JSON payload with additional context")
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"[{self.get_notification_type_display()}] {self.title} - {self.user.email}"

    def mark_as_read(self):
        self.is_read = True
        self.read_at = timezone.now()
        self.save(update_fields=['is_read', 'read_at'])


class ChatConversation(models.Model):
    """
    Groups chat messages into conversations between users or broadcast channels.
    """
    participants = models.ManyToManyField(User, related_name="chat_conversations")
    title = models.CharField(max_length=255, blank=True, null=True)
    is_group = models.BooleanField(default=False)
    last_message = models.TextField(blank=True, null=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_message_at', '-updated_at']

    def __str__(self):
        return self.title or f"Conversation #{self.id}"

    @property
    def unread_count_for_user(self, user):
        """Return count of unread messages for a specific user in this conversation."""
        return self.messages.filter(
            recipient=user,
            is_read=False
        ).count()


class ChatMessage(models.Model):
    """
    Real-time chat messages between guards, supervisors, and dispatch/admin.
    """
    MESSAGE_TYPES = (
        ('text', 'Text'),
        ('image', 'Image'),
        ('file', 'File'),
        ('alert', 'Alert'),
    )

    conversation = models.ForeignKey(
        ChatConversation,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='messages'
    )
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="received_messages"
    )
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPES, default='text')
    content = models.TextField()
    attachment = models.FileField(upload_to='chat/', null=True, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.sender.email}: {self.content[:50]}"
