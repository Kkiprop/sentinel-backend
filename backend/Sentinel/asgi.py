"""
ASGI config for Sentinel project.

Supports both HTTP (Django views) and WebSocket (Django Channels) protocols.
WebSocket authentication is handled inside the consumers via JWT tokens
passed as query-string parameters.
"""

import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

from communication.routing import websocket_urlpatterns

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Sentinel.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": URLRouter(websocket_urlpatterns),
})
