// Importações do Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { 
    getAuth, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { 
    getDatabase, 
    ref, 
    update, 
    get,
    set,
    onDisconnect,
    connectDatabaseEmulator,
    onValue
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';

// Chaves para armazenamento
const USUARIO_KEY = 'usuarioLogado';
const USUARIOS_KEY = 'usuarios';

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAnPLwZO5i_Ky0nBfI14gzNsRqvVMIOqdk",
    authDomain: "controle-func.firebaseapp.com",
    databaseURL: "https://controle-func-default-rtdb.firebaseio.com",
    projectId: "controle-func",
    storageBucket: "controle-func.firebasestorage.app",
    messagingSenderId: "146164640694",
    appId: "1:146164640694:web:d52beaeaa4b1b38cc76f17"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Funções auxiliares
const removeLoadingClass = () => {
    document.body.classList.remove('loading');
    document.querySelector('.loading-overlay').style.display = 'none';
};

const formatarData = (dataString) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
};

let reconnectAttempts = 0;

const handleConnectionError = (error) => {
    console.error(' Erro de conexão com o Firebase:', error);
    
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Tentativa de reconexão ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
        
        setTimeout(() => {
            console.log('Tentando reconectar...');
            // Tentar reconectar
            const connectedRef = ref(database, '.info/connected');
            onValue(connectedRef, (snap) => {
                if (snap.val() === true) {
                    console.log(' Reconectado com sucesso!');
                    reconnectAttempts = 0;
                }
            });
        }, Math.pow(2, reconnectAttempts) * 1000); // Exponential backoff
    } else {
        console.error(' Número máximo de tentativas de reconexão atingido');
        alert('Erro de conexão. Por favor, verifique sua internet e recarregue a página.');
    }
};

const setupDisconnectHandling = () => {
    const connectedRef = ref(database, '.info/connected');
    onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            console.log(' Conectado ao Firebase');
            
            // Configurar ações de desconexão
            const userStatusRef = ref(database, 'status/' + auth.currentUser.uid);
            onDisconnect(userStatusRef).set('offline');
            
            // Atualizar status para online
            set(userStatusRef, 'online');
        } else {
            console.log(' Desconectado do Firebase');
        }
    });
};

const buscarDadosUsuario = async () => {
    try {
        const user = auth.currentUser;
        if (!user) return null;

        const userRef = ref(database, 'users/' + user.uid);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            console.log('Nenhum dado encontrado para o usuário');
            return null;
        }
    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        handleConnectionError(error);
        return null;
    }
};

const calcularDiasFerias = () => {
    const dataInicioInput = document.getElementById('dataInicio');
    const dataFimInput = document.getElementById('dataFim');
    const diasFeriasInput = document.getElementById('diasFerias');
    
    if (!dataInicioInput || !dataFimInput || !diasFeriasInput) return;

    const dataInicio = new Date(dataInicioInput.value);
    const dataFim = new Date(dataFimInput.value);

    if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) {
        diasFeriasInput.value = '';
        return;
    }

    // Calcular a diferença em dias
    const diffTime = Math.abs(dataFim - dataInicio);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir o último dia

    diasFeriasInput.value = diffDays;
};

const carregarFeriados = async () => {
    try {
        const feriadosRef = ref(database, 'feriados');
        const snapshot = await get(feriadosRef);
        return snapshot.exists() ? snapshot.val() : {};
    } catch (error) {
        console.error('Erro ao carregar feriados:', error);
        handleConnectionError(error);
        return {};
    }
};

const salvarPeriodoFerias = async (dadosAtualizados) => {
    try {
        const userId = auth.currentUser.uid;
        const userRef = ref(database, 'users/' + userId);

        await update(userRef, dadosAtualizados);
        
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const dadosSalvos = snapshot.val();
            console.log('Dados salvos no Firebase:', dadosSalvos);
            return dadosSalvos;
        } else {
            throw new Error('Não foi possível recuperar os dados salvos');
        }
    } catch (error) {
        console.error('Erro ao salvar férias:', error);
        handleConnectionError(error);
        throw error;
    }
};

const atualizarSaldoFerias = () => {
    if (saldoFeriasElement) {
        const usuarioLogado = JSON.parse(localStorage.getItem(USUARIO_KEY) || '{}');
        const totalFerias = usuarioLogado.totalFerias || 30;
        const feriasUtilizadas = usuarioLogado.feriasUtilizadas || 0;
        const saldoFerias = totalFerias - feriasUtilizadas;
        
        saldoFeriasElement.textContent = `${saldoFerias} dias`;
    }
};

const atualizarTabelaHistorico = () => {
    if (historicoCorpo) {
        const usuarioLogado = JSON.parse(localStorage.getItem(USUARIO_KEY) || '{}');
        const historicoFerias = usuarioLogado.historicoFerias || [];
        
        historicoCorpo.innerHTML = '';
        
        historicoFerias.forEach((periodo) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatarData(periodo.dataInicio)}</td>
                <td>${formatarData(periodo.dataFim)}</td>
                <td>${periodo.diasFerias}</td>
                <td>${periodo.status || 'Pendente'}</td>
            `;
            historicoCorpo.appendChild(tr);
        });
    }
};

const adicionarPeriodoFerias = async (event) => {
    event.preventDefault();
    console.group('Adicionar Período de Férias');
    
    try {
        const dataInicioInput = document.getElementById('dataInicio');
        const dataFimInput = document.getElementById('dataFim');
        const diasFeriasInput = document.getElementById('diasFerias');
        
        if (!dataInicioInput || !dataFimInput || !diasFeriasInput) {
            throw new Error('Campos obrigatórios não encontrados');
        }

        const dataInicio = dataInicioInput.value;
        const dataFim = dataFimInput.value;
        const diasFerias = parseInt(diasFeriasInput.value);

        if (!dataInicio || !dataFim || isNaN(diasFerias)) {
            throw new Error('Por favor, preencha todos os campos corretamente');
        }

        console.log('Dados do formulário:', { dataInicio, dataFim, diasFerias });

        // Buscar dados atuais do usuário
        const usuarioLogado = JSON.parse(localStorage.getItem(USUARIO_KEY));
        if (!usuarioLogado) {
            throw new Error('Usuário não encontrado no localStorage');
        }

        console.log('Dados do usuário:', usuarioLogado);

        // Verificar saldo de férias
        const totalFerias = usuarioLogado.totalFerias || 30;
        const feriasUtilizadas = usuarioLogado.feriasUtilizadas || 0;
        const saldoFerias = totalFerias - feriasUtilizadas;

        if (diasFerias > saldoFerias) {
            throw new Error(`Saldo de férias insuficiente. Saldo atual: ${saldoFerias} dias`);
        }

        // Preparar dados atualizados
        const historicoFerias = usuarioLogado.historicoFerias || [];
        historicoFerias.push({
            dataInicio,
            dataFim,
            diasFerias,
            status: 'Pendente',
            dataSolicitacao: new Date().toISOString()
        });

        const dadosAtualizados = {
            ...usuarioLogado,
            feriasUtilizadas: feriasUtilizadas + diasFerias,
            historicoFerias
        };

        // Salvar no Firebase
        await salvarPeriodoFerias(dadosAtualizados);

        // Atualizar localStorage
        localStorage.setItem(USUARIO_KEY, JSON.stringify(dadosAtualizados));

        // Atualizar interface
        atualizarSaldoFerias();
        atualizarTabelaHistorico();

        // Limpar formulário
        event.target.reset();

        alert('Período de férias adicionado com sucesso!');
    } catch (error) {
        console.error('Erro ao adicionar período de férias:', error);
        alert(error.message);
    }

    console.groupEnd();
};

// Event Listeners e Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard: Evento DOMContentLoaded disparado');

    // Adicionar classe para evitar FOUC
    document.body.classList.add('loading');

    // Reduzir o timeout para 5 segundos
    const pageLoadTimeout = setTimeout(() => {
        console.warn('Timeout de carregamento atingido');
        removeLoadingClass();
    }, 5000); // Reduzido para 5 segundos

    try {
        // Elementos do formulário - declare como variáveis globais
        window.adicionarFeriasForm = document.getElementById('adicionarFeriasForm');
        window.dataInicioInput = document.getElementById('dataInicio');
        window.dataFimInput = document.getElementById('dataFim');
        window.diasFeriasInput = document.getElementById('diasFerias');
        window.historicoCorpo = document.getElementById('historicoCorpo');
        window.saldoFeriasElement = document.getElementById('saldoFerias');

        // Elementos do dashboard
        const nomeUsuarioElement = document.getElementById('employee-name');
        const usernameElement = document.getElementById('employee-username');
        const emailElement = document.getElementById('employee-email');

        // Event listeners para cálculo de dias
        if (dataInicioInput && dataFimInput && diasFeriasInput) {
            dataInicioInput.addEventListener('change', calcularDiasFerias);
            dataFimInput.addEventListener('change', calcularDiasFerias);
        }

        // Event listener para o formulário
        if (adicionarFeriasForm) {
            adicionarFeriasForm.removeEventListener('submit', adicionarPeriodoFerias);
            adicionarFeriasForm.addEventListener('submit', adicionarPeriodoFerias);
        }

        // Carregar feriados
        const feriados = await carregarFeriados();
        console.log('Feriados carregados:', feriados);

        // Configurar tratamento de desconexão
        setupDisconnectHandling();

        // Inicializar interface
        atualizarSaldoFerias();
        atualizarTabelaHistorico();

        // Limpar o timeout quando tudo carregar com sucesso
        clearTimeout(pageLoadTimeout);
        removeLoadingClass();
    } catch (error) {
        console.error('Erro durante inicialização:', error);
        handleConnectionError(error);
        removeLoadingClass();
    }
});

// Observador de autenticação
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    try {
        // Carregar dados do usuário
        const usuarioFirebase = await buscarDadosUsuario() || {};
        const usuarioLocalStorage = JSON.parse(localStorage.getItem(USUARIO_KEY)) || {};

        // Mesclar dados
        const usuarioLogado = {
            ...usuarioLocalStorage,
            ...usuarioFirebase,
            uid: user.uid,
            email: user.email,
            nome: usuarioFirebase.nome || usuarioLocalStorage.nome || 'Usuário',
            username: usuarioFirebase.username || usuarioLocalStorage.username || user.email.split('@')[0]
        };

        // Atualizar localStorage
        localStorage.setItem(USUARIO_KEY, JSON.stringify(usuarioLogado));

        // Atualizar elementos do dashboard
        const nomeUsuarioElement = document.getElementById('employee-name');
        const usernameElement = document.getElementById('employee-username');
        const emailElement = document.getElementById('employee-email');

        if (nomeUsuarioElement) {
            nomeUsuarioElement.textContent = usuarioLogado.nome;
        }
        if (usernameElement) {
            usernameElement.textContent = usuarioLogado.username;
        }
        if (emailElement) {
            emailElement.textContent = usuarioLogado.email;
        }

        // Atualizar interface
        atualizarSaldoFerias();
        atualizarTabelaHistorico();

    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        handleConnectionError(error);
    }
});
