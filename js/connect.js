const button = document.getElementById("copyBtn");

button.addEventListener("click", async () => {

    const text =
        document.getElementById("code").innerText;

    await navigator.clipboard.writeText(text);

    button.textContent = "✅ Скопировано";
});
