// On-page editor. It appears automatically when the page is opened from your
// computer, or on the published site when "?edit" is added to the end of the link.
// Edits only change your own copy; use "Download page" to get the updated file.
(() => {
  const enabled =
    location.protocol === "file:" || new URLSearchParams(location.search).has("edit");
  if (!enabled) return;

  const STORAGE_KEY = "my-bio-draft";
  const ALLOWED_TAGS = new Set(["STRONG", "B", "EM", "I", "SPAN", "BR"]);
  const fields = Array.from(document.querySelectorAll("[data-edit]"));
  const photo = document.getElementById("profile-photo");

  // Keep only plain text and simple formatting, with no attributes.
  function clean(html) {
    const template = document.createElement("template");
    template.innerHTML = html;
    (function walk(node) {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
          if (ALLOWED_TAGS.has(child.tagName)) {
            Array.from(child.attributes).forEach((a) => child.removeAttribute(a.name));
          } else {
            child.replaceWith(...child.childNodes);
          }
        } else if (child.nodeType !== Node.TEXT_NODE) {
          child.remove();
        }
      });
    })(template.content);
    return template.innerHTML;
  }

  function loadDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && saved.count === fields.length) return saved;
    } catch {
      // Ignore unreadable drafts.
    }
    return { count: fields.length, texts: {}, photo: null };
  }

  const draft = loadDraft();
  fields.forEach((el, i) => {
    if (i in draft.texts) el.innerHTML = clean(draft.texts[i]);
  });
  if (typeof draft.photo === "string" && draft.photo.startsWith("data:image/")) {
    photo.src = draft.photo;
  }

  // Toolbar
  const bar = document.createElement("div");
  bar.id = "editor-bar";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Page editor");

  const message = document.createElement("span");
  message.className = "editor-message";
  message.setAttribute("aria-live", "polite");

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.hidden = true;

  function makeButton(label, onClick, primary) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    if (primary) button.className = "is-primary";
    button.addEventListener("click", onClick);
    return button;
  }

  const toggle = makeButton("Edit page", () => setEditing(!isEditing()), true);
  const photoButton = makeButton("Change photo", () => fileInput.click());
  const downloadButton = makeButton("Download page", download);
  const resetButton = makeButton("Reset", reset);
  const editButtons = [photoButton, downloadButton, resetButton];

  bar.append(message, photoButton, downloadButton, resetButton, toggle, fileInput);
  document.body.append(bar);

  function isEditing() {
    return document.body.classList.contains("is-editing");
  }

  function setEditing(on) {
    document.body.classList.toggle("is-editing", on);
    fields.forEach((el) => {
      if (on) el.setAttribute("contenteditable", "true");
      else el.removeAttribute("contenteditable");
    });
    editButtons.forEach((b) => (b.hidden = !on));
    toggle.textContent = on ? "Done" : "Edit page";
    message.textContent = on
      ? "Click any text to change it. Edits are saved in this browser."
      : "";
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      message.textContent =
        "Couldn't save in this browser. Download the page to keep your edits.";
    }
  }

  document.addEventListener("input", (event) => {
    const el = event.target.closest && event.target.closest("[data-edit]");
    if (!el || !isEditing()) return;
    draft.texts[fields.indexOf(el)] = clean(el.innerHTML);
    save();
  });

  // Paste as plain text so formatting from other apps doesn't come along.
  document.addEventListener("paste", (event) => {
    if (!isEditing() || !event.target.closest || !event.target.closest("[data-edit]")) return;
    event.preventDefault();
    document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
  });

  // Enter finishes editing a field; Shift+Enter adds a line break.
  document.addEventListener("keydown", (event) => {
    if (!isEditing() || event.key !== "Enter" || event.shiftKey) return;
    if (event.target.closest && event.target.closest("[data-edit]")) {
      event.preventDefault();
      event.target.blur();
    }
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    fileInput.value = "";
    if (!file || !file.type.startsWith("image/")) return;

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Shrink large photos so they fit in browser storage and the page stays light.
      const scale = Math.min(1, 900 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      draft.photo = canvas.toDataURL("image/jpeg", 0.85);
      photo.src = draft.photo;
      save();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      message.textContent = "That file couldn't be opened as an image.";
    };
    img.src = url;
  });

  function download() {
    const clone = document.documentElement.cloneNode(true);
    const body = clone.querySelector("body");
    clone.querySelector("#editor-bar").remove();
    body.classList.remove("is-editing");
    if (!body.className) body.removeAttribute("class");
    clone.querySelectorAll("[contenteditable]").forEach((el) => el.removeAttribute("contenteditable"));
    clone.querySelectorAll(".is-explored").forEach((el) => el.classList.remove("is-explored"));
    clone.querySelectorAll('[role="tabpanel"][hidden]').forEach((el) => el.removeAttribute("hidden"));

    const blob = new Blob(["<!DOCTYPE html>\n" + clone.outerHTML], { type: "text/html" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "index.html";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);

    message.textContent =
      "Downloaded index.html. Replace the old index.html in the My-Bio folder with it.";
  }

  function reset() {
    if (!confirm("Discard the edits saved in this browser and show the page as it is in the file?")) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }

  setEditing(false);
})();
