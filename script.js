function selectTab(tab) {
  const tabs = tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]');
  tabs.forEach((t) => {
    const selected = t === tab;
    t.setAttribute("aria-selected", String(selected));
    t.tabIndex = selected ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !selected;
  });
}

document.querySelectorAll('[role="tablist"]').forEach((list) => {
  const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
  selectTab(tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0]);

  list.addEventListener("click", (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (!tab) return;
    selectTab(tab);
    list.closest("section").classList.add("is-explored");
  });

  list.addEventListener("keydown", (event) => {
    if (event.target.isContentEditable) return;
    const index = tabs.indexOf(document.activeElement);
    if (index !== -1 && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      selectTab(tabs[index]);
      list.closest("section").classList.add("is-explored");
      return;
    }
    const targets = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
    if (index === -1 || !(event.key in targets)) return;
    event.preventDefault();
    const next = tabs[(targets[event.key] + tabs.length) % tabs.length];
    selectTab(next);
    next.focus();
    list.closest("section").classList.add("is-explored");
  });
});

// Menu links that point at a tab panel open that tab, then scroll to its section.
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  const tab = document.querySelector(`[role="tab"][aria-controls="${link.hash.slice(1)}"]`);
  if (!tab) return;
  link.addEventListener("click", (event) => {
    event.preventDefault();
    selectTab(tab);
    tab.closest("section").scrollIntoView();
  });
});
