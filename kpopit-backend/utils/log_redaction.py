import logging
import re

# A user token is a UUID; it can reach request logs through the legacy /<user_token> routes.
_UUID = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")

# Loggers that print request paths: the dev server and gunicorn's access log.
REQUEST_LOGGERS = ("werkzeug", "gunicorn.access")


class RedactTokensFilter(logging.Filter):
    """Masks every UUID in a log line before any handler writes it."""

    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        redacted = _UUID.sub("[token]", message)
        if redacted != message:
            record.msg, record.args = redacted, ()
        return True


def install_token_redaction() -> None:
    for name in REQUEST_LOGGERS:
        logger = logging.getLogger(name)
        if not any(isinstance(f, RedactTokensFilter) for f in logger.filters):
            logger.addFilter(RedactTokensFilter())
