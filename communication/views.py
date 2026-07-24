from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework.permissions import IsAuthenticated

from .models import DeviceToken, Notification, ChatMessage, ChatConversation
from .serializers import (
    DeviceTokenSerializer,
    NotificationSerializer,
    NotificationMarkReadSerializer,
    NotificationCreateSerializer,
    ChatMessageSerializer,
    ChatMessageCreateSerializer,
    ChatConversationSerializer,
)
from .services import send_notification, send_chat_notification

User = get_user_model()


def _broadcast_ws(conversation_id, message_data):
    """Push a message to a conversation's WebSocket group."""
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"chat_{conversation_id}",
            {"type": "chat_message", "message": message_data},
        )


# ------------------------------------------------------------------ #
#  Device Token Registration                                          #
# ------------------------------------------------------------------ #
class DeviceTokenViewSet(ModelViewSet):
    """
    Register, list, and manage FCM device tokens for push notifications.
    """
    serializer_class = DeviceTokenSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DeviceToken.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)


# ------------------------------------------------------------------ #
#  Notifications                                                      #
# ------------------------------------------------------------------ #
class NotificationViewSet(ReadOnlyModelViewSet):
    """
    List and read notifications for the authenticated user.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        unread_only = self.request.query_params.get('unread_only')
        if unread_only and unread_only.lower() == 'true':
            qs = qs.filter(is_read=False)
        return qs

    def perform_destroy(self, instance):
        if instance.user == self.request.user:
            instance.delete()


class MarkNotificationsReadAPIView(APIView):
    """
    Mark one or more notifications as read.
    If no IDs provided, marks ALL as read.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = NotificationMarkReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ids = serializer.validated_data.get('ids')
        now = timezone.now()

        if ids:
            updated = Notification.objects.filter(
                user=request.user,
                id__in=ids,
                is_read=False
            ).update(is_read=True, read_at=now)
        else:
            updated = Notification.objects.filter(
                user=request.user,
                is_read=False
            ).update(is_read=True, read_at=now)

        return Response({
            'success': True,
            'marked_read': updated,
        })


class UnreadNotificationCountAPIView(APIView):
    """
    Returns the count of unread notifications for the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()
        return Response({'unread_count': count})


class BroadcastNotificationAPIView(APIView):
    """
    Admin-only endpoint to send a broadcast notification to users
    (either specific user IDs or all users in a company).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Only admins can broadcast
        if request.user.role != 'admin':
            return Response(
                {'error': 'Only admins can send broadcast notifications'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = NotificationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        notification_type = serializer.validated_data['notification_type']
        priority = serializer.validated_data.get('priority', 'normal')
        title = serializer.validated_data['title']
        body = serializer.validated_data['body']
        data = serializer.validated_data.get('data') or {}
        user_ids = serializer.validated_data.get('user_ids')
        company_id = serializer.validated_data.get('company_id')

        # Determine target users
        if user_ids:
            target_users = User.objects.filter(id__in=user_ids)
        elif company_id:
            target_users = User.objects.filter(company_id=company_id)
        else:
            # Default to all users in the admin's company
            target_users = User.objects.filter(company=request.user.company)

        notifications = []
        for user in target_users:
            notif = send_notification(
                user=user,
                notification_type=notification_type,
                title=title,
                body=body,
                data=data,
                priority=priority,
            )
            notifications.append(NotificationSerializer(notif).data)

        return Response({
            'success': True,
            'sent_count': len(notifications),
            'notifications': notifications,
        }, status=status.HTTP_201_CREATED)


# ------------------------------------------------------------------ #
#  Chat Conversations                                                 #
# ------------------------------------------------------------------ #
class ChatConversationViewSet(ModelViewSet):
    """
    List, create, and manage chat conversations.
    """
    serializer_class = ChatConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatConversation.objects.filter(
            participants=self.request.user
        ).prefetch_related('participants')

    def perform_create(self, serializer):
        conversation = serializer.save()
        conversation.participants.add(self.request.user)

    @action(detail=True, methods=['post'], url_path='add-participants')
    def add_participants(self, request, pk=None):
        conversation = self.get_object()
        user_ids = request.data.get('user_ids', [])
        if not user_ids:
            return Response(
                {'error': 'user_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        users = User.objects.filter(id__in=user_ids)
        conversation.participants.add(*users)
        return Response({'success': True, 'added': users.count()})

    @action(detail=True, methods=['post'], url_path='remove-participant')
    def remove_participant(self, request, pk=None):
        conversation = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        conversation.participants.remove(user_id)
        return Response({'success': True})


class StartConversationAPIView(APIView):
    """
    Start a new conversation with one or more users.
    POST with participant_ids (list of user IDs) and optional title.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        participant_ids = request.data.get('participant_ids', [])
        title = request.data.get('title', '')
        is_group = request.data.get('is_group', False)

        if not participant_ids:
            return Response(
                {'error': 'participant_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Ensure the current user is a participant
        all_ids = list(set([request.user.id] + list(participant_ids)))
        participants = User.objects.filter(id__in=all_ids)

        conversation = ChatConversation.objects.create(
            title=title if title else None,
            is_group=bool(is_group),
        )
        conversation.participants.add(*participants)

        serializer = ChatConversationSerializer(
            conversation,
            context={'request': request}
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class UserSearchAPIView(APIView):
    """
    Search for users within the same company (for starting conversations).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '')
        company = request.user.company

        users = User.objects.filter(company=company)
        if query:
            users = users.filter(
                Q(email__icontains=query) |
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query)
            )

        results = [
            {
                'id': u.id,
                'email': u.email,
                'name': u.get_full_name().strip() or u.email,
                'role': u.role,
            }
            for u in users.exclude(id=request.user.id)[:20]
        ]

        return Response(results)


# ------------------------------------------------------------------ #
#  Chat Messages                                                      #
# ------------------------------------------------------------------ #
class ChatMessageViewSet(ModelViewSet):
    """
    List and send chat messages within a conversation.
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return ChatMessageCreateSerializer
        return ChatMessageSerializer

    def get_queryset(self):
        qs = ChatMessage.objects.all()
        conversation_id = self.request.query_params.get('conversation')
        if conversation_id:
            qs = qs.filter(
                conversation_id=conversation_id,
                conversation__participants=self.request.user
            )
        else:
            qs = qs.filter(
                Q(sender=self.request.user) | Q(recipient=self.request.user)
            )
        return qs.select_related('sender', 'recipient', 'conversation')

    def perform_create(self, serializer):
        message = serializer.save(sender=self.request.user)

        # Update the conversation's last message metadata
        if message.conversation:
            ChatConversation.objects.filter(
                id=message.conversation_id
            ).update(
                last_message=message.content[:200],
                last_message_at=timezone.now()
            )

        # Serialize for WebSocket broadcast
        message_data = ChatMessageSerializer(message, context={'request': self.request}).data

        # Broadcast to conversation WebSocket group (if conversation exists)
        if message.conversation_id:
            _broadcast_ws(message.conversation_id, message_data)

        # Send notification to recipient (for direct messages)
        if message.recipient and message.recipient != self.request.user:
            send_chat_notification(
                sender=self.request.user,
                recipient=message.recipient,
                conversation_id=message.conversation_id,
                content=message.content,
                message_type=message.message_type,
            )

        # For group conversations, notify all other participants
        if message.conversation_id:
            other_participants = message.conversation.participants.exclude(
                id=self.request.user.id
            )
            for participant in other_participants:
                if message.recipient != participant:
                    send_chat_notification(
                        sender=self.request.user,
                        recipient=participant,
                        conversation_id=message.conversation_id,
                        content=message.content,
                        message_type=message.message_type,
                    )


class UnreadChatCountAPIView(APIView):
    """
    Returns total unread chat messages for the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = ChatMessage.objects.filter(
            recipient=request.user,
            is_read=False
        ).count()
        return Response({'unread_count': count})


class MarkChatReadAPIView(APIView):
    """
    Mark all messages in a conversation as read.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        conversation_id = request.data.get('conversation_id')
        if not conversation_id:
            return Response(
                {'error': 'conversation_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        now = timezone.now()
        updated = ChatMessage.objects.filter(
            conversation_id=conversation_id,
            recipient=request.user,
            is_read=False
        ).update(is_read=True, read_at=now)

        return Response({
            'success': True,
            'marked_read': updated,
        })
