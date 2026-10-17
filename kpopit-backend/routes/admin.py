import logging
from flask import Blueprint, jsonify, request
from services.admin_service import AdminService, IdolConflict
from services.get_db import get_db
from utils.auth_decorators import require_admin

admin_bp = Blueprint('admin', __name__)

logger = logging.getLogger(__name__)

@admin_bp.route("/api/admin/add-idol", methods=["POST"])
@require_admin
def add_idol():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    try:
        idol_id = AdminService(conn).add_idol(cursor, data)
        return jsonify({"message": "Idol added successfully", "idol_id": idol_id}), 201
    except IdolConflict as conflict:
        body = {"error": conflict.message}
        if conflict.idol_id is not None:
            body["idol_id"] = conflict.idol_id
        return jsonify(body), 409
    except Exception:
        logger.exception("Failed to add idol")
        return jsonify({"error": "Failed to add idol"}), 500
    finally:
        cursor.close()
