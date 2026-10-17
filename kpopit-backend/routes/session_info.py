import logging
from flask import Blueprint, jsonify
from utils.analytics import get_analytics_data, get_country_name

logger = logging.getLogger(__name__)

session_info = Blueprint('session_info', __name__)

@session_info.route("/analytics", methods=["POST"])
def init_game():
    analytics = get_analytics_data()
    country_name, flag = get_country_name(analytics.get("country"))

    logger.debug("New game session from %s %s", country_name, flag)

    return jsonify({"status": "initialized"}), 200