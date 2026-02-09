from flask import Blueprint, request, jsonify
from services.backup_service import sqlite_backup_to_s3
import os

tasks_bp = Blueprint('tasks', __name__)

@tasks_bp.route('/tasks/backup', methods=['POST'])
def backup_database():
    auth_key = request.headers.get('Authorization')
    if auth_key != os.getenv("BACKUP_AUTH_KEY"):
        return jsonify({"error": "Unauthorized"}), 401
    
    success, message = sqlite_backup_to_s3()
    if success:
        return jsonify({"message": f"Backup successful: {message}"}), 200
    else:
        return jsonify({"error": f"Backup failed: {message}"}), 500
    