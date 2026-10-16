import hmac
import logging
import os

from flask import Blueprint, request, jsonify
from services.backup_service import postgresql_backup_to_s3
from utils.rate_limiter import limiter

tasks_bp = Blueprint('tasks', __name__)

logger = logging.getLogger(__name__)

BEARER_PREFIX = "Bearer "


@tasks_bp.route('/tasks/backup', methods=['POST'])
@limiter.limit("3 per hour")
def backup_database():
    """Run a pg_dump → R2 backup. Called daily by .github/workflows/backup.yml.

    Expects `Authorization: Bearer <BACKUP_AUTH_KEY>`. With the key unset or empty the
    route refuses every request (500, logged as a misconfiguration)."""
    expected_key = os.getenv("BACKUP_AUTH_KEY") or ""
    if not expected_key:
        logger.error("BACKUP_AUTH_KEY is not set: /tasks/backup rejects every request")
        return jsonify({"error": "Backup is not available"}), 500

    header = request.headers.get('Authorization') or ""
    provided_key = header[len(BEARER_PREFIX):] if header.startswith(BEARER_PREFIX) else ""
    if not provided_key or not hmac.compare_digest(provided_key.encode(), expected_key.encode()):
        return jsonify({"error": "Unauthorized"}), 401

    success, filename = postgresql_backup_to_s3()
    if success:
        return jsonify({"message": "Backup successful", "file": filename}), 200
    return jsonify({"error": "Backup failed"}), 500
