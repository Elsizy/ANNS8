document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".back-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "index.html"; // página padrão caso não exista histórico
      }
    });
  });
});
