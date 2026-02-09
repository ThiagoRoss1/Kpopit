from flask import Blueprint, request, jsonify
from utils.analytics import get_analytics_data, get_country_name

session_info = Blueprint('session_info', __name__)

@session_info.route("/analytics", methods=["POST"])
def init_game():
    analytics = get_analytics_data()
    country_name, flag = get_country_name(analytics.get("country"))

    print(f"New session from {country_name} {flag} | Device: {analytics.get('device')} | Language: {analytics.get('lang')} | Source: {analytics.get('source')} | Referrer: {analytics.get('ref')} | Browser: {analytics.get('browser')}")

    return jsonify({"status": "initialized"}), 200