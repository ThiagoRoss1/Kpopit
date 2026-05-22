let reloadScheduled = false;

export const safeReload = () => {
    if (reloadScheduled) return;
    reloadScheduled = true;
    window.location.reload();
};
