<script src="https://cdn.firebase.com/libs/firebase/9.1.3/firebase-app.js"></script>
<script src="https://cdn.firebase.com/libs/firebase/9.1.3/firebase-auth.js"></script>
<script src="https://cdn.firebase.com/libs/firebase/9.1.3/firebase-database.js"></script>

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyDQrfasdfsadfasdfasdfasdfasdfasdf",
        authDomain: "sistema-ferias-2025.firebaseapp.com",
        projectId: "sistema-ferias-2025",
        storageBucket: "sistema-ferias-2025.appspot.com",
        messagingSenderId: "123456789",
        appId: "1:123456789:web:abcdefghijklmnop"
    };

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const database = firebase.database();

    const loginForm = document.getElementById('loginForm');
    const registroForm = document.getElementById('registroForm');
    const loginToggle = document.getElementById('loginToggle');
    const registroToggle = document.getElementById('registroToggle');
    const loginContainer = document.getElementById('login-container');
    const registroContainer = document.getElementById('registro-container');
    const loginMensagem = document.getElementById('login-mensagem');
    const registroMensagem = document.getElementById('registro-mensagem');

    loginToggle.addEventListener('click', () => {
        loginContainer.style.display = 'block';
        registroContainer.style.display = 'none';
    });

    registroToggle.addEventListener('click', () => {
        loginContainer.style.display = 'none';
        registroContainer.style.display = 'block';
    });

    // Registro de novo usuário
    registroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('registroNome').value;
        const email = document.getElementById('registroEmail').value;
        const senha = document.getElementById('registroSenha').value;
        const confirmarSenha = document.getElementById('confirmarSenha').value;

        if (senha !== confirmarSenha) {
            registroMensagem.textContent = 'Senhas não conferem';
            registroMensagem.style.color = 'red';
            return;
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, senha);
            const user = userCredential.user;

            // Salvar dados adicionais do usuário no Realtime Database
            const userRef = database.ref('users/' + user.uid);
            userRef.set({
                nome: nome,
                email: email,
                totalFerias: 30,
                feriasUtilizadas: 0,
                historicoFerias: []
            });

            registroMensagem.textContent = 'Registro realizado com sucesso!';
            registroMensagem.style.color = 'green';

            // Limpar formulário
            registroForm.reset();
        } catch (error) {
            registroMensagem.textContent = 'Erro ao registrar usuário. Tente novamente.';
            console.error('Erro de registro:', error);
        }
    });

    // Login de usuário
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const senha = document.getElementById('loginSenha').value;

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, senha);
            const user = userCredential.user;

            // Buscar dados adicionais do usuário no Realtime Database
            const userRef = database.ref('users/' + user.uid);
            userRef.once('value').then((snapshot) => {
                const userData = snapshot.val();
                localStorage.setItem('usuarioLogado', JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    nome: userData.nome,
                    totalFerias: userData.totalFerias,
                    feriasUtilizadas: userData.feriasUtilizadas,
                    historicoFerias: userData.historicoFerias
                }));
                window.location.href = 'dashboard.html';
            });

        } catch (error) {
            loginMensagem.textContent = 'Credenciais inválidas. Tente novamente.';
            console.error('Erro de login:', error);
        }
    });
});
