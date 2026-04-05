// Carica navbar e footer, poi controlla se l'utente è loggato
function initPage() {
    fetch('/components/navbar.html')
        .then(r => r.text())
        .then(html => {
            document.getElementById('navbar').innerHTML = html;
            checkAuth();
        });

}

// Controlla se c'è un token e aggiorna la navbar
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const payload = JSON.parse(atob(token.split('.')[1]));

    // Menu links in base al ruolo
    const navLinks = document.getElementById('navLinks');
    if (payload.usrType === 'ristoratore') {
        navLinks.innerHTML = `
            <li class="nav-item"><a class="nav-link" href="/dashboard">Dashboard</a></li>
            <li class="nav-item"><a class="nav-link" href="/restaurants">Ristorante</a></li>
            <li class="nav-item"><a class="nav-link" href="/orders">Ordini</a></li>
            <li class="nav-item"><a class="nav-link" href="/stats">Statistiche</a></li>
        `;
    } else {
        navLinks.innerHTML = `
            <li class="nav-item"><a class="nav-link" href="/">Home</a></li>
            <li class="nav-item"><a class="nav-link" href="#menu">Menu</a></li>
        `;
    }

    const btn = document.querySelector('.btn-login');
    btn.insertAdjacentHTML('beforebegin', `<a href="/profile" class="navbar-text"><i class="bi bi-gear me-1"></i></a><span class="navbar-text me-3"> ${payload.name}</span>`);


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
