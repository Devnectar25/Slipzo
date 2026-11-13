import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import "../../styles/SelectMenu.css"

/**
 * A themed replacement for a native <select>.
 * The browser draws a native select's option list itself, so it ignores the app's styles and on narrow
 * screens it can spill outside the card. This one stays the width of its field and opens upward when
 * there is no room below (for example above the bottom navigation bar).
 *
 * options: [{ value, label }]
 * icon: a lucide icon component shown on the left, like the other .sp-* fields
 */
export function SelectMenu({ value, options, onChange, icon: Icon, ariaLabel, className = "" }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [dropUp, setDropUp] = useState(false)
  const wrapRef = useRef(null)
  const listRef = useRef(null)
  const listId = useId()

  const selectedIndex = options.findIndex((o) => String(o.value) === String(value))
  const selected = options[selectedIndex]

  const openMenu = () => {
    setActive(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }
  const choose = (i) => {
    const opt = options[i]
    if (opt && String(opt.value) !== String(value)) onChange(opt.value)
    setOpen(false)
  }

  // close on a click or tap outside
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener("pointerdown", onDown)
    return () => document.removeEventListener("pointerdown", onDown)
  }, [open])

  // open upward when the list would run past the bottom of the screen
  useLayoutEffect(() => {
    if (!open || !wrapRef.current || !listRef.current) return
    const field = wrapRef.current.getBoundingClientRect()
    const listH = listRef.current.offsetHeight
    const bottomBar = 84 // room for the mobile bottom navigation
    const below = window.innerHeight - field.bottom - bottomBar
    setDropUp(below < listH + 8 && field.top > below)
  }, [open])

  // keep the highlighted option in view
  useEffect(() => {
    if (!open || active < 0) return
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" })
  }, [open, active])

  const onKeyDown = (e) => {
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); openMenu() }
      return
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)) }
    else if (e.key === "Home") { e.preventDefault(); setActive(0) }
    else if (e.key === "End") { e.preventDefault(); setActive(options.length - 1) }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(active) }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false) }
    else if (e.key === "Tab") setOpen(false)
  }

  return (
    <div ref={wrapRef} className={`sp-select-wrap sm-wrap ${open ? "sm-open" : ""} ${className}`}>
      {Icon && <Icon size={16} className="sp-input-icon" />}
      <div
        role="combobox"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        className="sp-select sm-trigger"
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className="sm-value">{selected ? selected.label : ""}</span>
      </div>
      <ChevronDown size={15} className="sp-select-arrow sm-arrow" />

      {open && (
        <ul ref={listRef} id={listId} role="listbox" className={`sm-list ${dropUp ? "sm-up" : ""}`}>
          {options.map((o, i) => {
            const isSel = i === selectedIndex
            return (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={isSel}
                className={`sm-option ${isSel ? "selected" : ""} ${i === active ? "active" : ""}`}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(i)}
              >
                <span className="sm-option-label">{o.label}</span>
                {isSel && <Check size={15} strokeWidth={2.6} className="sm-check" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default SelectMenu
