let token = document.currentScript.getAttribute("data-token");
let targetOrigin = document.currentScript.getAttribute("data-target-origin");

const opener = window.opener;
opener.postMessage(JSON.parse(token), targetOrigin);
// window.close();
