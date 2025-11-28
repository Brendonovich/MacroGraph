const targetOrigin = document.currentScript.getAttribute("data-target-origin");

const opener = window.opener;
opener.postMessage(location.search, targetOrigin);
window.close();
