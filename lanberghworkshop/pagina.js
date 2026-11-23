const dialoog = document.querySelector("#film");
const video = dialoog.querySelector("video");
document.querySelector("#play").addEventListener("click", () => {
  dialoog.showModal();
  video.play().catch(() => {});
});
document.querySelector("#sluit").addEventListener("click", () => dialoog.close());
dialoog.addEventListener("click", event => {
  if (event.target === dialoog) {
    const rect = dialoog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialoog.close();
  }
});
dialoog.addEventListener("close", () => video.pause());
