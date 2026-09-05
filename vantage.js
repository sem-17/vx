(function () {
    fetch("/account.php/vantage-cache.css", {
        credentials: "include"
    }).catch(() => {});
})();
