const menuToggle = document.querySelector<HTMLButtonElement>(".menu-toggle");
const menu = document.getElementById("menu");
const modal = document.querySelector<HTMLDialogElement>("#modal");
const openModalButton = document.getElementById("open-modal");
const closeModalButton = document.getElementById("close-modal");

// Le bloc de vérification null reste le même
if (!menuToggle || !menu || !modal || !openModalButton || !closeModalButton) {
  throw new Error("Erreur : Un ou plusieurs éléments du DOM sont introuvables.");
}


// Traitement du cas null : on vérifie que TOUT existe avant d'ajouter des événements
if (!menuToggle || !menu || !modal || !openModalButton || !closeModalButton) {
  throw new Error("Erreur : Un ou plusieurs éléments du DOM sont introuvables.");
}

/* --- Menu --- */
menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  menu.hidden = isExpanded;
});

menu.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    menuToggle.setAttribute("aria-expanded", "false");
    menu.hidden = true;
  }
});

/* Échap ferme le menu (y compris quand le focus est sur le bouton) */
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !menu.hidden) {
    menuToggle.setAttribute("aria-expanded", "false");
    menu.hidden = true;
    menuToggle.focus();
  }
});

/* --- Modale --- */
openModalButton.addEventListener("click", () => {
  // showModal() : la modale passe en top layer, le reste devient inert,
  // Échap et le piège à focus sont gérés nativement.
  modal.showModal();
});

closeModalButton.addEventListener("click", () => {
  modal.close();
  openModalButton.focus();
});