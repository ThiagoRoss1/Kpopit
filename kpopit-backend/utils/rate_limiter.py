from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Shared Flask-Limiter instance. Initialized with init_app(app) in app.py.
#
# Storage is in-memory: counters reset on process restart and are NOT shared
# across gunicorn workers. For a production deployment with multiple workers
# or replicas, set storage_uri to a Redis URL so limits are enforced globally.
#
# Requires ProxyFix on app.wsgi_app so get_remote_address returns the real
# client IP (X-Forwarded-For) rather than the platform proxy's address —
# otherwise every request behind the proxy shares one bucket.
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="memory://",
    strategy="fixed-window",
)
