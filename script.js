// Collapse the hero sidebar into a top bar once the user scrolls past a small threshold.
const nav = document.getElementById("nav");
const wantTop = () => window.scrollY > window.innerHeight * 0.35;
let isTop = false;
let busy = false;

// One swap at a time; when it finishes, re-check in case the scroll position moved meanwhile.
function update() {
  if (busy || wantTop() === isTop) return;
  busy = true;
  nav.classList.add("is-swapping");
  setTimeout(() => {
    isTop = wantTop();
    nav.classList.toggle("is-top", isTop);
    setTimeout(() => {
      nav.classList.remove("is-swapping");
      busy = false;
      update();
    }, 350);
  }, 160);
}

window.addEventListener("scroll", update, { passive: true });
window.addEventListener("resize", update);
update();

// Inertial smooth scrolling: the page keeps gliding briefly after the wheel/trackpad stops.
if (typeof Lenis !== "undefined") {
  const lenis = new Lenis({ lerp: 0.07, wheelMultiplier: 1, smoothWheel: true });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.4 });
    });
  });
}
