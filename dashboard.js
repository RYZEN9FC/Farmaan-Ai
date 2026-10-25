// Show as many upcoming pendencies as fit the card, then let the visible rows share the height evenly.
(function () {
  const list = document.querySelector(".pend");
  if (!list) return;
  const items = Array.from(list.children);

  function fit() {
    items.forEach((li) => (li.style.display = ""));
    list.classList.add("is-measuring");            // natural row heights while we measure
    const avail = list.clientHeight;
    let n = items.length;
    while (n > 1 && list.scrollHeight > avail + 1) items[--n].style.display = "none";
    list.classList.remove("is-measuring");
  }

  let raf;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); };
  window.addEventListener("resize", schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  fit();
})();
