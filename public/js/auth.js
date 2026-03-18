// Carica navbar e footer, poi controlla se l'utente è loggato
function initPage() {
    fetch('/components/navbar.html')
        .then(r => r.text())
        .then(html => {
            document.getElementById('navbar').innerHTML = html;
            checkAuth();
        });

    fetch('/components/footer.html')
        .then(r => r.text())
        .then(html => document.getElementById('footer').innerHTML = html);
}

// Controlla se c'è un token e aggiorna la navbar
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const payload = JSON.parse(atob(token.split('.')[1]));
    const btn = document.querySelector('.btn-login');
    btn.insertAdjacentHTML('beforebegin', `<a href="profile.html" class="navbar-text"><i class ="bi bi-gear me-1"></i></a><span class="navbar-text me-3"> ${payload.name}</span>`);


    btn.innerHTML = `<i class="bi bi-person-circle"></i> Logout`;
    btn.removeAttribute('data-bs-toggle');
    btn.removeAttribute('data-bs-target');
    btn.onclick = () => {
        localStorage.removeItem('token');
        window.location.reload();
    };
}
function showToast(message, success = true) {
    const toast = document.getElementById('toastMessage');
    toast.className = `toast align-items-center border-0 text-bg-${success ? 'success' : 'danger'}`;
    toast.querySelector('.toast-body').textContent = message;
    new bootstrap.Toast(toast).show();
}

// Avvia automaticamente al caricamento della pagina
initPage();
