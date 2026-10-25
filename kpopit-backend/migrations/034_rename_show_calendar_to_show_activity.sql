/* show_calendar toggles the public profile's activity heatmap, not the calendar feature:
   rename it show_activity. Values and defaults are kept (new accounts true, existing ones false). */

BEGIN;

ALTER TABLE user_profiles RENAME COLUMN show_calendar TO show_activity;

COMMIT;
