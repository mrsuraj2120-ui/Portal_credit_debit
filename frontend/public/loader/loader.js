window.showLoader = function (msg = "Loading...") {
  const box = document.getElementById("pageLoader");
  if (!box) return;

  box.querySelector(".loader-text").textContent = msg;
  box.style.display = "flex";
};

window.hideLoader = function () {
  const box = document.getElementById("pageLoader");
  if (!box) return;

  box.style.display = "none";
};
