import asyncio
import json
from typing import Any, Optional


class EventBroadcaster:
    """In-process pub/sub so SSE clients see new findings/alerts the moment
    they happen, from either the request thread or a background scan thread."""

    def __init__(self) -> None:
        self._subscribers: list[asyncio.Queue] = []
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def subscribe(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=200)
        self._subscribers.append(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        if queue in self._subscribers:
            self._subscribers.remove(queue)

    def publish(self, event: dict[str, Any]) -> None:
        if self._loop is None:
            return
        payload = json.dumps(event, default=str)

        def _fan_out() -> None:
            for queue in list(self._subscribers):
                try:
                    queue.put_nowait(payload)
                except asyncio.QueueFull:
                    pass

        self._loop.call_soon_threadsafe(_fan_out)


broadcaster = EventBroadcaster()
