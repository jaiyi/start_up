"use strict";

const slides = Array.from(document.querySelectorAll(".slide"));
const deck = document.getElementById("deck");
const previous = document.getElementById("previous");
const next = document.getElementById("next");
const indicator = document.getElementById("page-indicator");
const fullscreen = document.getElementById("fullscreen");
let activeIndex = 0;

function fitDeck() {
  const controlsHeight = 65;
  const scale = Math.min((window.innerWidth - 24) / 1600, (window.innerHeight - controlsHeight - 16) / 900);
  deck.style.setProperty("--deck-scale", Math.max(scale, 0.1));
}

function showSlide(index) {
  activeIndex = Math.max(0, Math.min(index, slides.length - 1));
  slides.forEach((slide, position) => {
    const active = position === activeIndex;
    slide.classList.toggle("is-active", active);
    slide.setAttribute("aria-hidden", String(!active));
  });
  const number = slides[activeIndex].dataset.number;
  indicator.textContent = `${number} / ${String(slides.length - 1).padStart(2, "0")}`;
  previous.disabled = activeIndex === 0;
  next.disabled = activeIndex === slides.length - 1;
  const hash = `#${number}`;
  if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
}

function showHash() {
  const number = window.location.hash.slice(1);
  const index = slides.findIndex(slide => slide.dataset.number === number);
  showSlide(index === -1 ? 0 : index);
}

previous.addEventListener("click", () => showSlide(activeIndex - 1));
next.addEventListener("click", () => showSlide(activeIndex + 1));
fullscreen.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch (error) {
    console.warn("无法切换全屏：", error);
  }
});
document.addEventListener("keydown", event => {
  if (event.altKey || event.ctrlKey || event.metaKey || (event.target instanceof HTMLElement && (event.target.isContentEditable || /^(BUTTON|INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)))) return;
  if (["ArrowRight", "ArrowDown", " ", "PageDown"].includes(event.key)) {
    event.preventDefault();
    showSlide(activeIndex + 1);
  } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
    event.preventDefault();
    showSlide(activeIndex - 1);
  } else if (event.key === "Home") {
    event.preventDefault();
    showSlide(0);
  } else if (event.key === "End") {
    event.preventDefault();
    showSlide(slides.length - 1);
  } else if (event.key.toLowerCase() === "f") {
    fullscreen.click();
  }
});
window.addEventListener("hashchange", showHash);
window.addEventListener("resize", fitDeck);
showHash();
fitDeck();
