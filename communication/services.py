"""
Notification and push services for the communication app.

Provides:
  - send_notification(): create a DB Notification and dispatch via FCM + WebSocket
  - send_fcm_notification(): send a single FCM message to a device token
  - send_chat_notification(): convenience wrapper for chat message notifications
  - broadcast_notification(): send a notification to all users in a company
"""
import logging
import os
from typing import Any, Dict, List, Optional

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction

from .models import DeviceToken, Notification

User = get_user_model()
logger = logging.getLogger(__name__)

# FCM configuration (set via environment variables)
FCM_SERVER_KEY = os.getenv("FCM_SERVER_KEY", "")
FCM_API_URL = "https://fcm.googleapis.com/fcm/send"


# ------------------------------------------------------------------ #
#  Internal helpers                                                   #
# ------------------------------------------------------------------ #
def _get_active_tokens(user: User) -> List[str]:
    """Return all active FCM device tokens for a user."""
    return list(
        DeviceToken.objects.filter(user=user, is_active=True)
        .values_list("token", flat=True)
    )


def _send_fcm_to_token(token: str, title: str, body: str, data: Optional[Dict] = None) -> bool:
    """
    Send a single FCM message to one device token.
    Uses the legacy FCM HTTP API (simpler, no service-account JSON needed).
    Returns True on success, False on failure.
    """
    if not FCM_SERVER_KEY:
        logger.debug("FCM_SERVER_KEY not configured; skipping push delivery for token %s", token[:20])
        return False

    payload = {
        "to": token,
        "notification": {
            "title": title,
            "body": body,
            "sound": "default",
        },
        "priority": "high",
    }
    if data:
        payload["data"] = {str(k): str(v) for k, v in data.items()}

    try:
        import requests
        response = requests.post(
            FCM_API_URL,
            headers={
                "Authorization": f"key={FCM_SERVER_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=10,
        )
        if response.status_code == 200:
            return True
        logger.warning("FCM send failed (status %s): %s", response.status_code, response.text[:200])
        return False
    except Exception as exc:
        logger.warning("FCM send error: %s", exc)
        return False


def _broadcast_via_websocket(user_id: int, notification_data: Dict[str, Any]) -> None:
    """
    Push a notification to the user's WebSocket group in real time.
    The group name follows the pattern ``user_<id>``.
    """
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    group_name = f"user_{user_id}"
    try:
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "notification",
                "notification": notification_data,
            },
        )
    except Exception as exc:
        logger.warning("WebSocket broadcast failed for user %s: %s", user_id, exc)


# ------------------------------------------------------------------ #
#  Public API                                                        #
# ------------------------------------------------------------------ #
def send_notification(
    user: User,
    notification_type: str,
    title: str,
    body: str,
    data: Optional[Dict] = None,
    priority: str = "normal",
    send_push: bool = True,
) -> Notification:
    """
    Create a Notification record and optionally dispatch it via FCM and WebSocket.

    Parameters
    ----------
    user : User
        Recipient of the notification.
    notification_type : str
        One of the choices in ``Notification.NOTIFICATION_TYPES``.
    title : str
        Short title (max 255 chars).
    body : str
        Full message body.
    data : dict, optional
        Extra JSON payload stored on the notification.
    priority : str
        'low', 'normal', 'high', or 'urgent'.
    send_push : bool
        Whether to attempt FCM push delivery (default True).

    Returns
    -------
    Notification
        The created notification instance.
    """
    with transaction.atomic():
        notification = Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            body=body,
            data=data or {},
            priority=priority,
        )

    notif_data = {
        "id": notification.id,
        "notification_type": notification_type,
        "title": title,
        "body": body,
        "data": data or {},
        "priority": priority,
        "created_at": notification.created_at.isoformat(),
    }

    # WebSocket real-time push
    _broadcast_via_websocket(user.id, notif_data)

    # FCM push (best-effort)
    if send_push:
        tokens = _get_active_tokens(user)
        for token in tokens:
            _send_fcm_to_token(token, title, body, data)

    return notification


def send_chat_notification(
    sender: User,
    recipient: User,
    conversation_id: Optional[int],
    content: str,
    message_type: str = "text",
) -> Optional[Notification]:
    """
    Convenience wrapper: create a 'chat_message' notification for the recipient
    when a new chat message arrives.
    """
    if sender == recipient:
        return None

    title = sender.get_full_name().strip() or sender.email
    body = content[:200] if content else f"New {message_type} message"

    data = {
        "conversation_id": conversation_id,
        "sender_id": sender.id,
        "sender_name": title,
        "message_type": message_type,
    }

    return send_notification(
        user=recipient,
        notification_type="chat_message",
        title=title,
        body=body,
        data=data,
        priority="normal",
    )


def broadcast_notification(
    company_users: List[User],
    title: str,
    body: str,
    data: Optional[Dict] = None,
    priority: str = "normal",
) -> List[Notification]:
    """
    Send a broadcast notification to a list of users (e.g. all guards in a company).
    """
    notifications = []
    for user in company_users:
        notif = send_notification(
            user=user,
            notification_type="broadcast",
            title=title,
            body=body,
            data=data,
            priority=priority,
        )
        notifications.append(notif)
    return notifications


def send_sos_notification(
    guard: User,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    description: str = "SOS alert activated",
) -> List[Notification]:
    """
    Send an SOS alert notification to all supervisors and admins in the guard's company.
    """
    company = guard.company
    if not company:
        return []

    recipients = User.objects.filter(
        company=company,
        role__in=["admin", "supervisor"],
    )

    data = {
        "guard_id": guard.id,
        "guard_email": guard.email,
        "latitude": latitude,
        "longitude": longitude,
        "description": description,
    }

    return broadcast_notification(
        company_users=list(recipients),
        title="SOS ALERT",
        body=description,
        data=data,
        priority="urgent",
    )
