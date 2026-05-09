// Carica navbar e footer, poi controlla se l'utente è loggato
function initPage() {
    fetch('/components/navbar.html')
        .then(r => r.text())
        .then(html => {
            document.getElementById('navbar').innerHTML = html;
            checkAuth();

            const nav = document.querySelector('nav.navbar');
            document.documentElement.style.setProperty('--navbar-height', nav.offsetHeight + 'px');

            document.getElementById('loginModal').querySelector('form').addEventListener('submit', async (e) => {
                e.preventDefault();

                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;

                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    localStorage.setItem('token', data.token);
                    if (data.user.usrType === 'ristoratore') {
                        window.location.href = '/dashboard';
                    } else {
                        window.location.reload();
                    }
                } else {
                    showToast(data.error, false);
                }
            });
        });
}

// Controlla se c'è un token e mostra/nasconde gli elementi in base al ruolo
function checkAuth() {
    const token = localStorage.getItem('token');
    const role = token
        ? JSON.parse(atob(token.split('.')[1])).usrType
        : 'guest';

    // Toggle visibilità di ogni elemento con data-role
    document.querySelectorAll('[data-role]').forEach(el => {
        const allowed = el.dataset.role.split(',').map(s => s.trim());
        el.style.display = allowed.includes(role) ? '' : 'none';
    });

    // Personalizza l'area utente in alto a destra
    const authBtn = document.getElementById('authButton');
    if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        document.getElementById('userName').textContent = payload.name;

        // Bottone diventa "Logout"
        authBtn.innerHTML = '<i class="bi bi-person-circle"></i> Logout';
        authBtn.removeAttribute('data-bs-toggle');
        authBtn.removeAttribute('data-bs-target');
        authBtn.onclick = () => {
            localStorage.removeItem('token');
            localStorage.removeItem('cart');
            window.location.reload();
        };
    }
}

function showToast(message, success = true) {
    const toast = document.getElementById('toastMessage');
    toast.className = `toast align-items-center border-0 text-bg-${success ? 'success' : 'danger'}`;
    toast.querySelector('.toast-body').textContent = message;
    new bootstrap.Toast(toast).show();
}

// Avvia automaticamente al caricamento della pagina
initPage();
