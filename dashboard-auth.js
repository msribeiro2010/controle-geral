// Chave para armazenamento de dados do usuário
const USUARIO_KEY = 'usuarioLogado';
const USUARIOS_KEY = 'usuarios';

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
    get 
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';

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

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard: Evento DOMContentLoaded disparado');

    // Elementos do formulário
    const adicionarFeriasForm = document.getElementById('adicionarFeriasForm');
    const dataInicioInput = document.getElementById('dataInicio');
    const dataFimInput = document.getElementById('dataFim');
    const diasFeriasInput = document.getElementById('diasFerias');
    const historicoCorpo = document.getElementById('historicoCorpo');
    const saldoFeriasElement = document.getElementById('saldoFerias');

    // Função para calcular dias de férias
    function calcularDiasFerias() {
        if (!dataInicioInput.value || !dataFimInput.value) return;

        const dataInicio = new Date(dataInicioInput.value);
        const dataFim = new Date(dataFimInput.value);

        // Verificar se a data de início é anterior à data de término
        if (dataInicio > dataFim) {
            alert('A data de início deve ser anterior à data de término');
            dataInicioInput.value = '';
            dataFimInput.value = '';
            diasFeriasInput.value = '';
            return;
        }

        // Calcular dias de férias (considerando dias úteis)
        const diffTime = Math.abs(dataFim - dataInicio);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        diasFeriasInput.value = diffDays;
    }

    // Adicionar event listeners para calcular dias de férias
    if (dataInicioInput && dataFimInput && diasFeriasInput) {
        dataInicioInput.addEventListener('change', calcularDiasFerias);
        dataFimInput.addEventListener('change', calcularDiasFerias);
    }

    // Função para carregar feriados
    async function carregarFeriados() {
        try {
            const resposta = await fetch('feriados_2025.json');
            const dadosFeriados = await resposta.json();
            return dadosFeriados.feriados;
        } catch (erro) {
            console.error('Erro ao carregar feriados:', erro);
            return [];
        }
    }

    // Carregar feriados ao iniciar
    const feriados = await carregarFeriados();
    console.log('Feriados carregados:', feriados);

    // Função para buscar dados do usuário no Firebase
    async function buscarDadosUsuario() {
        try {
            const user = auth.currentUser;
            if (!user) {
                console.error('Usuário não autenticado');
                return null;
            }

            const userRef = ref(database, 'users/' + user.uid);
            const snapshot = await get(userRef);

            if (snapshot.exists()) {
                const userData = snapshot.val();
                console.log('Dados do usuário carregados do Firebase:', userData);
                return userData;
            } else {
                console.error('Dados do usuário não encontrados no Firebase');
                return null;
            }
        } catch (error) {
            console.error('Erro ao buscar dados do usuário:', error);
            return null;
        }
    }

    // Função para formatar data no padrão brasileiro
    function formatarData(dataString) {
        if (!dataString) return '';
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }

    // Observador de autenticação
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Buscar dados do usuário
        const usuarioFirebase = await buscarDadosUsuario();
        const usuarioLocalStorage = JSON.parse(localStorage.getItem(USUARIO_KEY));

        // Mesclar dados do Firebase com localStorage
        const usuarioLogado = {
            ...usuarioLocalStorage,
            ...usuarioFirebase,
            uid: user.uid,
            email: user.email
        };

        // Variáveis para controle de férias
        let totalFerias = usuarioLogado.totalFerias || 30;
        let feriasUtilizadas = usuarioLogado.feriasUtilizadas || 0;
        let historicoFerias = usuarioLogado.historicoFerias || [];

        // Atualizar localStorage
        localStorage.setItem(USUARIO_KEY, JSON.stringify(usuarioLogado));

        // Função para adicionar período de férias
        async function adicionarPeriodoFerias(event) {
            event.preventDefault();
            console.log('Adicionando período de férias');
            console.log('Dados atuais:', { 
                totalFerias, 
                feriasUtilizadas, 
                historicoFerias,
                usuarioLogado 
            });
            
            const dataInicio = dataInicioInput.value;
            const dataFim = dataFimInput.value;
            const diasFerias = parseInt(diasFeriasInput.value);

            console.log('Dados de entrada:', { dataInicio, dataFim, diasFerias });

            // Criar período formatado
            const periodo = `${formatarData(dataInicio)} a ${formatarData(dataFim)}`;

            // Verificar se já existem 3 períodos
            if (historicoFerias.length >= 3) {
                alert('Limite de 3 períodos de férias atingido.');
                return;
            }

            // Verificar se há saldo suficiente de férias
            if (diasFerias > (totalFerias - feriasUtilizadas)) {
                alert('Saldo de férias insuficiente.');
                return;
            }

            // Verificar feriados no período
            const feriadosNoPeriodo = feriados.filter(feriado => {
                const dataFeriado = new Date(feriado.data.split('/').reverse().join('-'));
                const dataInicioObj = new Date(dataInicio);
                const dataFimObj = new Date(dataFim);
                return dataFeriado >= dataInicioObj && dataFeriado <= dataFimObj;
            });

            if (feriadosNoPeriodo.length > 0) {
                const nomesFeriados = feriadosNoPeriodo.map(f => f.nome).join(', ');
                const confirmacao = confirm(`Existem feriados no período selecionado: ${nomesFeriados}. Deseja continuar?`);
                
                if (!confirmacao) {
                    return;
                }
            }

            // Adicionar período de férias
            historicoFerias.push({ 
                periodo, 
                dataInicio, 
                dataFim, 
                diasFerias 
            });
            feriasUtilizadas += diasFerias;

            console.log('Novo histórico de férias:', historicoFerias);
            console.log('Férias utilizadas:', feriasUtilizadas);

            // Atualizar dados do usuário
            usuarioLogado.feriasUtilizadas = feriasUtilizadas;
            usuarioLogado.historicoFerias = historicoFerias;

            // Atualizar localStorage
            localStorage.setItem(USUARIO_KEY, JSON.stringify(usuarioLogado));

            try {
                // Salvar no Firebase
                const userId = user.uid;
                console.log('Salvando no Firebase:', {
                    userId,
                    feriasUtilizadas,
                    historicoFerias
                });

                await update(ref(database, 'users/' + userId), {
                    feriasUtilizadas: feriasUtilizadas,
                    historicoFerias: historicoFerias
                });

                // Verificar se os dados foram salvos corretamente
                const userRef = ref(database, 'users/' + userId);
                const snapshot = await get(userRef);
                
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    console.log('Dados salvos no Firebase:', userData);
                    
                    // Comparar dados salvos com dados locais
                    const dadosCorrespondem = 
                        userData.feriasUtilizadas === feriasUtilizadas &&
                        JSON.stringify(userData.historicoFerias) === JSON.stringify(historicoFerias);
                    
                    if (!dadosCorrespondem) {
                        console.warn('Dados salvos não correspondem aos dados locais', {
                            local: { feriasUtilizadas, historicoFerias },
                            firebase: userData
                        });
                    }
                } else {
                    console.error('Não foi possível recuperar os dados salvos');
                }

                console.log('Férias salvas com sucesso no Firebase');

                // Atualizar visualização
                atualizarSaldoFerias();
                atualizarTabelaHistorico();

                // Limpar formulário
                dataInicioInput.value = '';
                dataFimInput.value = '';
                diasFeriasInput.value = '';

            } catch (error) {
                console.error('Erro ao salvar férias:', error);
                alert('Não foi possível salvar as férias. Tente novamente.');
            }
        }

        // Funções de atualização
        function atualizarSaldoFerias() {
            if (saldoFeriasElement) {
                const saldoAtual = totalFerias - feriasUtilizadas;
                saldoFeriasElement.textContent = `${saldoAtual} dias`;
                console.log('Saldo de férias atualizado:', saldoAtual);
            }
        }

        function atualizarTabelaHistorico() {
            if (historicoCorpo) {
                historicoCorpo.innerHTML = '';
                historicoFerias.forEach((entry, index) => {
                    const linha = document.createElement('tr');
                    linha.innerHTML = `
                        <td>${entry.periodo}</td>
                        <td>${entry.diasFerias} dias</td>
                        <td>
                            <button onclick="editarPeriodoFerias(${index})" class="btn-editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="excluirPeriodoFerias(${index})" class="btn-excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    historicoCorpo.appendChild(linha);
                });
                console.log('Tabela de histórico de férias atualizada');
            }
        }

        // Adicionar event listener para o formulário
        if (adicionarFeriasForm) {
            adicionarFeriasForm.removeEventListener('submit', adicionarPeriodoFerias);
            adicionarFeriasForm.addEventListener('submit', adicionarPeriodoFerias);
            console.log('Event listener de adicionar férias configurado');
        }

        // Chamar funções iniciais
        atualizarSaldoFerias();
        atualizarTabelaHistorico();
    });
});
