const msg = document.getElementById("message");
const btn = document.getElementById("connect");

btn.onclick = () => {
  msg.textContent = "Opening Google login…";

  chrome.runtime.sendMessage({ type: "AUTH" }, (res) => {
    if (chrome.runtime.lastError) {
      msg.textContent = "Extension error. Please reload.";
      return;
    }

    if (res?.success) {
      msg.textContent =
        "Connected successfully. GSC data will be shown when available.";
    } else {
      msg.textContent =
        res?.error || "Unable to connect. Please try again.";
    }
  });
};
