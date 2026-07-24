"""
WebSocket URL routing for the communication app.

Routes:
  ws://<host>/ws/chat/<conversation_id>/   — real-time chat in a conversation
  ws://<host>/ws/notifications/              — real-time notifications for the user
"""
from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/chat/(?P<conversation_id>\d+)/$", consumers.ChatConsumer.as_asgi()),
    re_path(r"ws/notifications/$", consumers.NotificationConsumer.as_asgi()),
]
