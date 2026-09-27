"""
WebSocket Connection Manager.
Broadcasts live sensor streams, ML anomaly notifications, and CV updates
to all connected client browsers without requiring polling.
"""

import json
from datetime import datetime
from typing import Set, Dict, Any
from fastapi import WebSocket

class WebSocketManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        """Accepts new WebSocket client and adds to active broadcast pool."""
        await websocket.accept()
        self.active_connections.add(websocket)
        # Send initial welcome payload
        await websocket.send_json({
            "type": "connection_established",
            "message": "Connected to Aquaponics Real-Time Telemetry Stream",
            "timestamp": datetime.utcnow().isoformat()
        })

    def disconnect(self, websocket: WebSocket):
        """Removes disconnected client from pool."""
        self.active_connections.discard(websocket)

    async def broadcast(self, event_type: str, data: Any):
        """Broadcasts structured event to all active connected clients."""
        if not self.active_connections:
            return

        payload = {
            "type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data
        }

        # Convert to JSON string once to catch any non-serializable elements cleanly
        text_payload = json.dumps(payload, default=str)

        stale_connections = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(text_payload)
            except Exception:
                stale_connections.append(connection)

        for stale in stale_connections:
            self.disconnect(stale)

ws_manager = WebSocketManager()
