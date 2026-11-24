// "Fly to the list" animation: an item's picture is thrown into a list like a real object (steady sideways speed,
// gravity up-and-down, tilting along its path, a faint trail) and squashes as it lands.
// Used by Add Menu Items and by table billing. Styles: .fly-thumb in App.css.

/**
 * startEl: the picture that is thrown; to: { left, top, width, height } on screen where it lands;
 * onLand: called as it lands (straight away when the person asked for less motion).
 * Returns a function that stops a flight still in the air (onLand is then not called).
 */
export function flyThumb({ startEl, to, onLand }) {
  const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  if (reduceMotion || !to || !startEl || !startEl.isConnected || !startEl.animate) {
    onLand()
    return () => {}
  }
  let ghost = null
  let landTimer = null

  const from = startEl.getBoundingClientRect()
  const size = Math.max(40, Math.min(56, from.width || 48))

  const x0 = from.left + from.width / 2 - size / 2
  const y0 = from.top + from.height / 2 - size / 2
  const x2 = to.left + to.width / 2 - size / 2
  const y2 = to.top + to.height / 2 - size / 2
  const dist = Math.hypot(x2 - x0, y2 - y0)
  const duration = Math.round(Math.max(650, Math.min(950, 520 + dist * 0.45)))
  const apex = Math.max(70, Math.min(170, dist * 0.32)) // how high it is thrown above the straight line
  const endScale = Math.max(0.6, Math.min(1, (to.width || size) / size))

  // position at time t (0..1): steady sideways speed, gravity on the way up and down (a true parabola)
  const at = (t) => ({
    x: x0 + (x2 - x0) * t,
    y: y0 + (y2 - y0) * t - 4 * apex * t * (1 - t)
  })
  const frames = []
  const N = 36
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const { x, y } = at(t)
    const ahead = at(Math.min(1, t + 0.02))
    const tilt = Math.max(-18, Math.min(18, Math.atan2(ahead.y - y, ahead.x - x) * (180 / Math.PI) * 0.35))
    const scale = t < 0.12 ? 1 + 0.14 * (t / 0.12) : 1.14 - (1.14 - endScale) * ((t - 0.12) / 0.88)
    frames.push({ transform: `translate3d(${x}px, ${y}px, 0) rotate(${tilt}deg) scale(${scale})`, offset: t })
  }

  const makeFlyer = (extraClass) => {
    const el = document.createElement("div")
    el.className = `fly-thumb ${extraClass || ""}`
    const pic = startEl.cloneNode(true)
    pic.removeAttribute("style")
    pic.className = "fly-thumb-pic"
    el.appendChild(pic)
    Object.assign(el.style, { width: `${size}px`, height: `${size}px`, left: "0px", top: "0px" })
    document.body.appendChild(el)
    return el
  }

  // a faint trail of copies following a moment behind
  const trail = [0.32, 0.18, 0.08].map((opacity, i) => {
    const el = makeFlyer("fly-thumb-trail")
    el.style.opacity = String(opacity)
    el.animate(frames, { duration, delay: (i + 1) * 34, easing: "linear", fill: "both" })
      .finished.then(() => el.remove()).catch(() => el.remove())
    return el
  })
  ghost = makeFlyer()
  ghost._trail = trail

  // the picture left behind in the row gives a little "pick up" pop
  startEl.animate?.([{ transform: "scale(1)" }, { transform: "scale(0.86)" }, { transform: "scale(1)" }], { duration: 260, easing: "ease-out" })

  const anim = ghost.animate(frames, { duration, easing: "linear", fill: "forwards" })
  anim.onfinish = () => {
    const g = ghost
    ghost = null
    const end = `translate3d(${x2}px, ${y2}px, 0)`
    // squash on impact; the card appears under it
    g.animate([
      { transform: `${end} scale(${endScale})`, opacity: 1 },
      { transform: `${end} scale(${endScale * 1.18}, ${endScale * 0.8})`, opacity: 1, offset: 0.45 },
      { transform: `${end} scale(${endScale * 0.92}, ${endScale * 1.06})`, opacity: 0.6, offset: 0.8 },
      { transform: `${end} scale(${endScale})`, opacity: 0 }
    ], { duration: 220, easing: "ease-out", fill: "forwards" }).finished.then(() => g.remove()).catch(() => g.remove())
    landTimer = setTimeout(onLand, 70)
  }

  return () => {
    clearTimeout(landTimer)
    ghost?._trail?.forEach((el) => el.remove())
    ghost?.remove()
  }
}
