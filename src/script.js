document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll(".nav_link");

  navLinks.forEach(function (navLink) {
    navLink.addEventListener("click", function (event) {
      event.preventDefault();

      const targetId = this.getAttribute("href");
      let targetElement = document.querySelector(targetId);

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
        });
      }
    });
  });
});
