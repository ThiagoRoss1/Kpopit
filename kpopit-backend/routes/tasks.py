import hmac
import logging
import os

from flask import Blueprint, request, jsonify
from services.backup_service import postgresql_backup_to_s3
from services.account_deletion_service import AccountDeletionService
from services.auth_service import AuthService
from services import collections_service
from services.collections_service import CollectionService
from services.get_db import get_db
from utils.rate_limiter import limiter

tasks_bp = Blueprint('tasks', __name__)

logger = logging.getLogger(__name__)

BEARER_PREFIX = "Bearer "


def _bearer_matches(expected_key: str) -> bool:
    header = request.headers.get('Authorization') or ""
    provided_key = header[len(BEARER_PREFIX):] if header.startswith(BEARER_PREFIX) else ""
    return bool(provided_key) and hmac.compare_digest(provided_key.encode(), expected_key.encode())


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

    if not _bearer_matches(expected_key):
        return jsonify({"error": "Unauthorized"}), 401

    success, filename = postgresql_backup_to_s3()
    if success:
        return jsonify({"message": "Backup successful", "file": filename}), 200
    return jsonify({"error": "Backup failed"}), 500


@tasks_bp.route('/tasks/purge-deleted-accounts', methods=['POST'])
@limiter.limit("3 per hour")
def purge_deleted_accounts():
    """Delete the accounts whose 15-day deletion grace period is over. Called daily by
    .github/workflows/purge-accounts.yml with `Authorization: Bearer <ACCOUNT_PURGE_AUTH_KEY>`;
    with the key unset or empty the route refuses every request."""
    expected_key = os.getenv("ACCOUNT_PURGE_AUTH_KEY") or ""
    if not expected_key:
        logger.error("ACCOUNT_PURGE_AUTH_KEY is not set: /tasks/purge-deleted-accounts rejects every request")
        return jsonify({"error": "Purge is not available"}), 500

    if not _bearer_matches(expected_key):
        return jsonify({"error": "Unauthorized"}), 401

    connect = get_db()
    cursor = connect.cursor()
    try:
        purged = AccountDeletionService(connect, AuthService(connect)).purge_due(cursor)
        connect.commit()
        return jsonify({"message": "Purge successful", "purged": purged}), 200
    except Exception:
        connect.rollback()
        logger.exception("Account purge failed")
        return jsonify({"error": "Purge failed"}), 500
    finally:
        cursor.close()


@tasks_bp.route('/tasks/reconcile-cards', methods=['POST'])
@limiter.limit("3 per hour")
def reconcile_cards():
    """Grant every Album 1 card a failed win grant left behind. Called daily by
    .github/workflows/reconcile-cards.yml with `Authorization: Bearer <CARD_RECONCILE_AUTH_KEY>`;
    with the key unset or empty the route refuses every request."""
    expected_key = os.getenv("CARD_RECONCILE_AUTH_KEY") or ""
    if not expected_key:
        logger.error("CARD_RECONCILE_AUTH_KEY is not set: /tasks/reconcile-cards rejects every request")
        return jsonify({"error": "Reconciliation is not available"}), 500

    if not _bearer_matches(expected_key):
        return jsonify({"error": "Unauthorized"}), 401

    if not collections_service.COLLECTION_ENABLED:
        return jsonify({"message": "Collection is disabled", "reconciled": 0}), 200

    connect = get_db()
    cursor = connect.cursor()
    try:
        granted = CollectionService(connect).reconcile_cards(cursor)
        connect.commit()
        return jsonify({"message": "Reconciliation successful", "reconciled": len(granted)}), 200
    except Exception:
        connect.rollback()
        logger.exception("Card reconciliation failed")
        return jsonify({"error": "Reconciliation failed"}), 500
    finally:
        cursor.close()
