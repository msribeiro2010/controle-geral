// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDQrfasdfsadfasdfasdfasdfasdfasdf",
    authDomain: "sistema-ferias-2025.firebaseapp.com",
    projectId: "sistema-ferias-2025",
    storageBucket: "sistema-ferias-2025.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdefghijklmnop"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();
