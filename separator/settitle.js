addEventListener("load", (ev) => {
    const params = new URLSearchParams(window.location.search);
    let t = document.querySelector("title");
    t.textContent = `Search: ${params.get("q")}`

    let h = document.querySelector("h2");
    h.textContent = `Search: ${params.get("q")}`
})
