from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DeviceTokenViewSet,
    NotificationViewSet,
    MarkNotificationsReadAPIView,
    UnreadNotificationCountAPIView,
    BroadcastNotificationAPIView,
    ChatConversationViewSet,
    ChatMessageViewSet,
    UnreadChatCountAPIView,
    MarkChatReadAPIView,
    StartConversationAPIView,
    UserSearchAPIView,
)

router = DefaultRouter()
router.register(r'devices', DeviceTokenViewSet, basename='devices')
router.register(r'notifications', NotificationViewSet, basename='notifications')
router.register(r'chat/conversations', ChatConversationViewSet, basename='chat-conversations')
router.register(r'chat/messages', ChatMessageViewSet, basename='chat-messages')

urlpatterns = [
    path('', include(router.urls)),
    path('notifications/mark-read/', MarkNotificationsReadAPIView.as_view(), name='notifications-mark-read'),
    path('notifications/unread-count/', UnreadNotificationCountAPIView.as_view(), name='notifications-unread-count'),
    path('notifications/broadcast/', BroadcastNotificationAPIView.as_view(), name='notifications-broadcast'),
    path('chat/unread-count/', UnreadChatCountAPIView.as_view(), name='chat-unread-count'),
    path('chat/mark-read/', MarkChatReadAPIView.as_view(), name='chat-mark-read'),
    path('chat/start-conversation/', StartConversationAPIView.as_view(), name='chat-start-conversation'),
    path('chat/users/', UserSearchAPIView.as_view(), name='chat-users'),
]
