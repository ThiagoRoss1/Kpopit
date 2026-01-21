from flask import Blueprint, jsonify
from utils.dates import get_today_now
from datetime import timedelta

general_bp = Blueprint('general', __name__)

# Get reset timer for next idol
@general_bp.route("/reset-timer")
def get_reset_timer():
    """Return the time remaining until the next daily idol reset"""
    
    time = get_today_now()
    
    next_reset = time.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    
    time_remaining = next_reset - time
    
    # Convert to total seconds for easy frontend calculation
    total_seconds = int(time_remaining.total_seconds())
    
    # Break down into hours, minutes, seconds
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60

    display_keys = {
        "total_seconds": total_seconds,
        "hours": hours,
        "minutes": minutes,
        "seconds": seconds,
        "next_reset": next_reset.isoformat()
    }
    
    return jsonify(display_keys)