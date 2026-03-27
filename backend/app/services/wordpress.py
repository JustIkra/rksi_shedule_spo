"""WordPress integration service.

Handles publishing events to WordPress via WP REST API v2.
Uses httpx for async HTTP requests with Basic Auth.
"""

import base64
import logging
import mimetypes
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class WordPressError(Exception):
    """Raised when a WordPress API operation fails."""
    pass


class WordPressService:
    """Service for publishing events to WordPress.

    Uploads photos as WP media, then creates or updates posts
    with gallery HTML using the Elementor lightbox pattern.
    """

    CATEGORY_NAME = "План СПО РО"

    def __init__(self, domain: str, username: str, password: str, upload_dir: str):
        self.domain = domain.rstrip("/")
        self.upload_dir = Path(upload_dir)
        self._auth_header = "Basic " + base64.b64encode(
            f"{username}:{password}".encode()
        ).decode()
        self._category_id: int | None = None

    def is_configured(self) -> bool:
        return bool(self.domain and self.domain != "https://")

    def _headers(self) -> dict[str, str]:
        return {"Authorization": self._auth_header}

    async def _get_category_id(self, client: httpx.AsyncClient) -> int | None:
        """Find WP category ID by name. Caches result."""
        if self._category_id is not None:
            return self._category_id

        url = f"{self.domain}/wp-json/wp/v2/categories"
        try:
            resp = await client.get(url, headers=self._headers(), params={"per_page": 100})
            resp.raise_for_status()
            categories = resp.json()
            for cat in categories:
                if self.CATEGORY_NAME.lower() in cat["name"].lower():
                    self._category_id = cat["id"]
                    logger.info("Found WP category '%s' with id=%d", self.CATEGORY_NAME, self._category_id)
                    return self._category_id
            logger.warning("WP category '%s' not found", self.CATEGORY_NAME)
        except Exception as e:
            logger.error("Failed to fetch WP categories: %s", e)

        return None

    async def upload_media(self, client: httpx.AsyncClient, file_path: Path) -> dict[str, Any]:
        """Upload a local image file to WordPress media library.

        Args:
            client: httpx async client
            file_path: Path relative to upload_dir (e.g. '2026/03/42/original/abc.jpg')

        Returns:
            WP media response dict with 'id' and 'source_url'
        """
        full_path = self.upload_dir / file_path
        if not full_path.exists():
            raise WordPressError(f"File not found: {full_path}")

        file_name = full_path.name
        content_type = mimetypes.guess_type(file_name)[0] or "image/jpeg"

        data = full_path.read_bytes()

        url = f"{self.domain}/wp-json/wp/v2/media"
        headers = {
            **self._headers(),
            "Content-Type": content_type,
            "Content-Disposition": f"attachment; filename={file_name}",
        }

        try:
            resp = await client.post(url, content=data, headers=headers, timeout=60.0)
            resp.raise_for_status()
            result = resp.json()
            logger.info("Uploaded media '%s' -> WP id=%d", file_name, result["id"])
            return result
        except httpx.HTTPStatusError as e:
            raise WordPressError(f"WP media upload failed ({e.response.status_code}): {e.response.text}")
        except Exception as e:
            raise WordPressError(f"WP media upload error: {e}")

    @staticmethod
    def _build_gallery_html(media_items: list[dict[str, Any]], skip_first: bool = True) -> str:
        """Build Elementor lightbox gallery HTML from uploaded media.

        Args:
            media_items: List of WP media response dicts.
            skip_first: If True, skip the first item (used as featured_media/poster).
        """
        items = media_items[1:] if skip_first and len(media_items) > 1 else ([] if skip_first else media_items)
        parts = []
        for item in items:
            url = item.get("source_url", "")
            if url:
                parts.append(
                    f'<a data-elementor-open-lightbox="yes" href="{url}">'
                    f'<figure class="wp-block-image size-full">'
                    f'<img decoding="async" width="807" height="363" src="{url}" alt="" />'
                    f'</figure></a>'
                )
        return "<br>".join(parts)

    @staticmethod
    def _build_links_html(links: list) -> str:
        """Build HTML list of event links."""
        if not links:
            return ""
        items = []
        for link in links:
            title = link.title or link.url
            items.append(f'<li><a href="{link.url}" target="_blank">{title}</a></li>')
        return f"<h3>Ссылки</h3><ul>{''.join(items)}</ul>"

    @staticmethod
    def _build_content(
        description: str | None,
        links: list,
        gallery_html: str,
    ) -> str:
        """Compose full post content HTML."""
        parts = []

        if description:
            parts.append(description.replace("\n", "<br>"))

        links_html = WordPressService._build_links_html(links)
        if links_html:
            parts.append(links_html)

        if gallery_html:
            parts.append(gallery_html)

        return "<hr>".join(parts)

    async def publish_event(
        self,
        event,
        photos: list,
        links: list,
    ) -> int:
        """Publish or update a WordPress post for the given event.

        Args:
            event: Event model instance (needs .name, .description, .wp_post_id)
            photos: List of Photo model instances (needs .original_path)
            links: List of EventLink model instances (needs .url, .title)

        Returns:
            WordPress post ID
        """
        if not self.is_configured():
            raise WordPressError("WordPress not configured")

        async with httpx.AsyncClient(timeout=120.0) as client:
            # 1. Upload all photos
            media_items: list[dict[str, Any]] = []
            for photo in photos:
                try:
                    media = await self.upload_media(client, Path(photo.original_path))
                    media_items.append(media)
                except WordPressError as e:
                    logger.warning("Skipping photo %s: %s", photo.original_path, e)

            # 2. Get category ID
            category_id = await self._get_category_id(client)

            # 3. Build content
            gallery_html = self._build_gallery_html(media_items)
            content = self._build_content(event.description, links, gallery_html)

            # 4. Featured media (first photo)
            featured_media_id = media_items[0]["id"] if media_items else None

            # 5. Build post data
            post_data: dict[str, Any] = {
                "title": event.name,
                "content": content,
                "status": "publish",
            }

            if category_id is not None:
                post_data["categories"] = [category_id]

            if featured_media_id is not None:
                post_data["featured_media"] = featured_media_id

            # 6. Create or update
            if event.wp_post_id:
                # Update existing post
                url = f"{self.domain}/wp-json/wp/v2/posts/{event.wp_post_id}"
                logger.info("Updating WP post id=%d for event '%s'", event.wp_post_id, event.name)
            else:
                # Create new post
                url = f"{self.domain}/wp-json/wp/v2/posts"
                logger.info("Creating new WP post for event '%s'", event.name)

            try:
                resp = await client.post(url, json=post_data, headers=self._headers(), timeout=60.0)
                resp.raise_for_status()
                result = resp.json()
                wp_post_id = result["id"]
                logger.info("WP post published: id=%d, link=%s", wp_post_id, result.get("link", ""))
                return wp_post_id
            except httpx.HTTPStatusError as e:
                raise WordPressError(
                    f"WP post publish failed ({e.response.status_code}): {e.response.text}"
                )
            except Exception as e:
                raise WordPressError(f"WP post publish error: {e}")
