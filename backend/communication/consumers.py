"""
WebSocket consumers for real-time chat and notifications.

Authentication
--------------
The JWT access token is passed as a query-string parameter:

    ws://host/ws/chat/42/?token=<jwt>

Consumers
---------
ChatConsumer
    Joins a conversation group, receives/sends messages in real time,
    persists them to the database, and notifies participants.

NotificationConsumer
    Joins a per-user group (``user_<id>``) and receives notification
    events pushed from the server (via ``communication.services``).
"""
import json
import logging

from asgiref.sync import async_to_sync, sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .models import ChatConversation, ChatMessage
from .serializers import ChatMessageSerializer
from .services import send_chat_notification

User = get_user_model()
logger = logging.getLogger(__name__)


# ------------------------------------------------------------------ #
#  Helpers                                                            #
# ------------------------------------------------------------------ #
@database_sync_to_async
def _get_user_from_token(token: str):
    """Decode a JWT access token and return the corresponding User, or None."""
    if not token:
        return None
    try:
        access_token = AccessToken(token)
        user_id = access_token["user_id"]
        return User.objects.select_related("company").get(id=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist, KeyError):
        return None


@database_sync_to_async
def _save_message(sender, conversation, content, message_type="text"):
    """Persist a chat message and return the serialized instance."""
    message = ChatMessage.objects.create(
        conversation=conversation,
        sender=sender,
        recipient=None,  # group conversation; recipient handled per-participant
        message_type=message_type,
        content=content,
    )
    # Update conversation's last message metadata
    ChatConversation.objects.filter(id=conversation.id).update(
        last_message=content[:200],
        last_message_at=timezone.now(),
    )
    return message


# ------------------------------------------------------------------ #
#  Chat consumer                                                      #
# ------------------------------------------------------------------ #
class ChatConsumer(AsyncWebsocketConsumer):
    """
    Real-time WebSocket consumer for a single chat conversation.

    Group name: ``chat_<conversation_id>``
    """

    async def connect(self):
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.group_name = f"chat_{self.conversation_id}"
        token = self.scope["query_string"].decode("utf-8").split("token=")[-1] if b"token=" in self.scope["query_string"] else ""

        self.user = await _get_user_from_token(token)
        if self.user is None:
            await self.close(code=4001)
            return

        # Verify the user is a participant in this conversation
        is_participant = await database_sync_to_async(
            lambda: ChatConversation.objects.filter(
                id=self.conversation_id,
                participants=self.user,
            ).exists()
        )()
        if not is_participant:
            await self.close(code=4003)
            return

        # Join the conversation group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Notify group that user joined (optional presence)
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat_presence",
                "user_id": self.user.id,
                "user_name": self.user.get_full_name().strip() or self.user.email,
                "action": "joined",
            },
        )

    async def disconnect(self, code):
        # Leave the conversation group
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

        # Notify group that user left (optional presence)
        if hasattr(self, "user") and self.user:
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "chat_presence",
                    "user_id": self.user.id,
                    "user_name": self.user.get_full_name().strip() or self.user.email,
                    "action": "left",
                },
            )

    async def receive_json(self, content, **kwargs):
        """
        Handle incoming WebSocket messages.

        Expected JSON:
            {"type": "message", "content": "Hello!", "message_type": "text"}
            {"type": "read_receipt", "message_id": 42}
        """
        msg_type = content.get("type", "message")

        if msg_type == "message":
            message_content = content.get("content", "")
            message_type = content.get("message_type", "text")

            if not message_content.strip():
                return

            # Fetch the conversation instance
            conversation = await database_sync_to_async(
                lambda: ChatConversation.objects.prefetch_related("participants").get(
                    id=self.conversation_id
                )
            )()

            # Save the message
            message = await _save_message(
                sender=self.user,
                conversation=conversation,
                content=message_content,
                message_type=message_type,
            )

            # Serialize for broadcast
            serializer = ChatMessageSerializer(message, context={"request": None})
            message_data = serializer.data

            # Broadcast to all participants in the conversation
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "chat_message",
                    "message": message_data,
                },
            )

            # Send push notifications to other participants
            participants = await database_sync_to_async(
                lambda: list(conversation.participants.exclude(id=self.user.id))
            )()
            for participant in participants:
                await sync_to_async(send_chat_notification)(
                    sender=self.user,
                    recipient=participant,
                    conversation_id=self.conversation_id,
                    content=message_content,
                    message_type=message_type,
                )

        elif msg_type == "read_receipt":
            message_id = content.get("message_id")
            if message_id:
                await database_sync_to_async(
                    lambda: ChatMessage.objects.filter(
                        id=message_id,
                        conversation_id=self.conversation_id,
                        recipient=self.user,
                        is_read=False,
                    ).update(is_read=True, read_at=timezone.now())
                )()
                # Broadcast read receipt
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "chat_read_receipt",
                        "message_id": message_id,
                        "reader_id": self.user.id,
                    },
                )

    # ------------------------------------------------------------------ #
    #  Group message handlers (called by group_send)                      #
    # ------------------------------------------------------------------ #
    async def chat_message(self, event):
        await self.send_json({"type": "chat_message", "message": event["message"]})

    async def chat_presence(self, event):
        await self.send_json({"type": "presence", **{k: v for k, v in event.items() if k != "type"}})

    async def chat_read_receipt(self, event):
        await self.send_json({"type": "read_receipt", **{k: v for k, v in event.items() if k != "type"}})


# ------------------------------------------------------------------ #
#  Notification consumer                                              #
# ------------------------------------------------------------------ #
class NotificationConsumer(AsyncWebsocketConsumer):
    """
    Real-time WebSocket consumer for user notifications.

    Group name: ``user_<id>``
    """

    async def connect(self):
        token = self.scope["query_string"].decode("utf-8").split("token=")[-1] if b"token=" in self.scope["query_string"] else ""

        self.user = await _get_user_from_token(token)
        if self.user is None:
            await self.close(code=4001)
            return

        self.group_name = f"user_{self.user.id}"

        # Join the user's personal group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        """Handle incoming messages (e.g. ack)."""
        msg_type = content.get("type", "")
        if msg_type == "ack":
            # Client acknowledged receipt; no action needed
            pass
        elif msg_type == "mark_read":
            notification_id = content.get("notification_id")
            if notification_id:
                await database_sync_to_async(
                    lambda: __import__("communication.models", fromlist=["Notification"])
                    .Notification.objects.filter(
                        id=notification_id,
                        user=self.user,
                        is_read=False,
                    ).update(is_read=True, read_at=timezone.now())
                )()

    async def notification(self, event):
        """Receive a notification event from the server."""
        await self.send_json({"type": "notification", "notification": event["notification"]})
