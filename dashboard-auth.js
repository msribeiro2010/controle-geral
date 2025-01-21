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

    // Elementos do formulário
    const adicionarFeriasForm = document.getElementById('adicionarFeriasForm');
    const dataInicioInput = document.getElementById('dataInicio');
    const dataFimInput = document.getElementById('dataFim');
    const diasFeriasInput = document.getElementById('diasFerias');
    const historicoCorpo = document.getElementById('historicoCorpo');
    const saldoFeriasElement = document.getElementById('saldoFerias');

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

        console.log('Usuário logado:', usuarioLogado);

        // Variáveis para controle de férias
        let totalFerias = usuarioLogado.totalFerias || 30;
        let feriasUtilizadas = usuarioLogado.feriasUtilizadas || 0;
        let historicoFerias = usuarioLogado.historicoFerias || [];

        // Atualizar localStorage
        localStorage.setItem(USUARIO_KEY, JSON.stringify(usuarioLogado));

        // Função para adicionar período de férias
        async function adicionarPeriodoFerias(event) {
            event.preventDefault();
            
            const dataInicio = dataInicioInput.value;
            const dataFim = dataFimInput.value;
            const diasFerias = parseInt(diasFeriasInput.value);

            console.log('Tentando adicionar férias:', { dataInicio, dataFim, diasFerias });

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
                await update(ref(database, 'users/' + userId), {
                    feriasUtilizadas: feriasUtilizadas,
                    historicoFerias: historicoFerias
                });

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

        // Log de depuração do usuário logado
        console.log('Usuário:', usuarioLogado);
        console.log('Tipo de usuário:', typeof usuarioLogado);
        console.log('Chaves do usuário:', Object.keys(usuarioLogado));

        // Verificar dados do localStorage
        console.log('Dados no localStorage:', {
            usuarioLogado: localStorage.getItem(USUARIO_KEY),
            usuarios: localStorage.getItem(USUARIOS_KEY)
        });

        // Se não estiver na página de dashboard ou não tiver usuário logado, redirecionar para login
        if (!window.location.pathname.includes('dashboard.html') || !usuarioLogado) {
            console.warn('Usuário não logado ou não está na página de dashboard');
            window.location.href = 'login.html';
            return;
        }

        // Elementos do dashboard
        const employeeNameElement = document.getElementById('employee-name');
        const employeeUsernameElement = document.getElementById('employee-username');
        const employeeEmailElement = document.getElementById('employee-email');

        // Log de depuração dos elementos
        console.log('Elemento Nome:', employeeNameElement);
        console.log('Elemento Username:', employeeUsernameElement);
        console.log('Elemento Email:', employeeEmailElement);

        // Função para preencher dados do usuário
        function preencherDadosUsuario() {
            try {
                if (employeeNameElement) {
                    console.log('Dados para nome:', {
                        nome: usuarioLogado.nome,
                        username: usuarioLogado.username
                    });
                    employeeNameElement.textContent = usuarioLogado.nome || 'Nome não disponível';
                    console.log('Nome definido para:', employeeNameElement.textContent);
                } else {
                    console.error('Elemento employee-name não encontrado');
                }

                if (employeeUsernameElement) {
                    employeeUsernameElement.textContent = usuarioLogado.username || 'Username não disponível';
                    console.log('Username definido para:', employeeUsernameElement.textContent);
                } else {
                    console.error('Elemento employee-username não encontrado');
                }

                if (employeeEmailElement) {
                    employeeEmailElement.textContent = usuarioLogado.email || 'Email não disponível';
                    console.log('Email definido para:', employeeEmailElement.textContent);
                } else {
                    console.error('Elemento employee-email não encontrado');
                }
            } catch (error) {
                console.error('Erro ao preencher dados do usuário:', error);
            }
        }

        // Tentar preencher dados imediatamente
        preencherDadosUsuario();

        // Tentar novamente após um curto intervalo
        setTimeout(preencherDadosUsuario, 100);

        // Configurar saldo de férias
        let totalFerias = usuarioLogado.totalFerias || 30;
        let feriasUtilizadas = usuarioLogado.feriasUtilizadas || 0;
        let historicoFerias = usuarioLogado.historicoFerias || [];

        console.log('Dados de Férias:', { 
            totalFerias, 
            feriasUtilizadas, 
            historicoFerias 
        });

        // Elementos de saldo de férias
        const saldoFeriasElement = document.getElementById('saldoFerias');
        const historicoCorpo = document.getElementById('historicoCorpo');

        // Elementos do formulário de adição de férias
        const adicionarFeriasForm = document.getElementById('adicionarFeriasForm');
        const dataInicioInput = document.getElementById('dataInicio');
        const dataFimInput = document.getElementById('dataFim');
        const diasFeriasInput = document.getElementById('diasFerias');

        // Atualizar saldo de férias
        function atualizarSaldoFerias() {
            if (saldoFeriasElement) {
                const saldoFerias = totalFerias - feriasUtilizadas;
                saldoFeriasElement.textContent = `${saldoFerias} dias`;
                console.log('Saldo de Férias atualizado:', saldoFeriasElement.textContent);
            } else {
                console.error('Elemento saldoFerias não encontrado');
            }
        }

        // Atualizar tabela de histórico
        function atualizarTabelaHistorico() {
            if (historicoCorpo) {
                historicoCorpo.innerHTML = '';
                historicoFerias.forEach((entry, index) => {
                    const linha = document.createElement('tr');
                    linha.dataset.periodo = entry.periodo;
                    
                    // Verificar se o período de férias contém feriados
                    const feriadosNoPeriodo = feriados.filter(feriado => {
                        const dataFeriado = new Date(feriado.data.split('/').reverse().join('-'));
                        const dataInicio = new Date(entry.dataInicio);
                        const dataFim = new Date(entry.dataFim);
                        return dataFeriado >= dataInicio && dataFeriado <= dataFim;
                    });

                    const feriadosInfo = feriadosNoPeriodo.length > 0 
                        ? `(${feriadosNoPeriodo.map(f => f.nome).join(', ')})` 
                        : '';

                    linha.innerHTML = `
                        <td>${formatarData(entry.dataInicio)} a ${formatarData(entry.dataFim)} ${feriadosInfo}</td>
                        <td>${formatarData(entry.dataInicio)}</td>
                        <td>${formatarData(entry.dataFim)}</td>
                        <td>${entry.diasFerias} dias</td>
                        <td>
                            <button class="editar-periodo" data-index="${index}">Editar</button>
                            <button class="excluir-periodo" data-index="${index}">Excluir</button>
                        </td>
                    `;
                    historicoCorpo.appendChild(linha);
                });
                console.log('Tabela de histórico atualizada');

                // Adicionar event listeners para botões de exclusão e edição
                const botoesExcluir = document.querySelectorAll('.excluir-periodo');
                const botoesEditar = document.querySelectorAll('.editar-periodo');
                
                botoesExcluir.forEach(botao => {
                    botao.addEventListener('click', excluirPeriodoFerias);
                });
                
                botoesEditar.forEach(botao => {
                    botao.addEventListener('click', editarPeriodoFerias);
                });
            } else {
                console.error('Elemento historicoCorpo não encontrado');
            }
        }

        // Função para excluir período de férias
        function excluirPeriodoFerias(event) {
            const index = event.target.dataset.index;
            
            // Confirmar exclusão
            const confirmacao = confirm('Tem certeza que deseja excluir este período de férias?');
            
            if (confirmacao) {
                // Recuperar dias de férias do período a ser excluído
                const periodoExcluido = historicoFerias[index];
                
                // Subtrair dias de férias utilizadas
                feriasUtilizadas -= periodoExcluido.diasFerias;
                
                // Remover período do histórico
                historicoFerias.splice(index, 1);

                // Atualizar dados do usuário
                usuarioLogado.feriasUtilizadas = feriasUtilizadas;
                usuarioLogado.historicoFerias = historicoFerias;

                // Atualizar localStorage
                localStorage.setItem(USUARIO_KEY, JSON.stringify(usuarioLogado));

                try {
                    // Salvar no Firebase
                    const userId = user.uid;
                    await update(ref(database, 'users/' + userId), {
                        feriasUtilizadas: feriasUtilizadas,
                        historicoFerias: historicoFerias
                    });

                    console.log('Férias salvas com sucesso no Firebase');

                    // Atualizar visualização
                    atualizarSaldoFerias();
                    atualizarTabelaHistorico();

                } catch (error) {
                    console.error('Erro ao salvar férias:', error);
                    alert('Não foi possível salvar as férias. Tente novamente.');
                }
            }
        }

        // Função para editar período de férias
        function editarPeriodoFerias(event) {
            const index = event.target.dataset.index;
            const periodoEditar = historicoFerias[index];

            // Preencher formulário com dados do período
            dataInicioInput.value = periodoEditar.dataInicio;
            dataFimInput.value = periodoEditar.dataFim;
            diasFeriasInput.value = periodoEditar.diasFerias;

            // Remover o período atual para recalcular o saldo
            historicoFerias.splice(index, 1);
            feriasUtilizadas -= periodoEditar.diasFerias;

            // Atualizar visualização
            atualizarSaldoFerias();
            atualizarTabelaHistorico();

            // Focar no formulário
            dataInicioInput.focus();
        }

        // Calcular dias de férias
        function calcularDiasFerias() {
            const dataInicio = new Date(dataInicioInput.value);
            const dataFim = new Date(dataFimInput.value);

            // Verificar se as datas são válidas
            if (dataInicio && dataFim && dataInicio <= dataFim) {
                // Calcular diferença em milissegundos
                const diferencaMs = dataFim - dataInicio;
                
                // Converter para dias, adicionando 1 para incluir o dia inicial
                const diasFerias = Math.floor(diferencaMs / (1000 * 60 * 60 * 24)) + 1;
                
                diasFeriasInput.value = diasFerias;
            } else {
                diasFeriasInput.value = '';
            }
        }

        // Adicionar event listeners para calcular dias de férias
        if (dataInicioInput && dataFimInput && diasFeriasInput) {
            dataInicioInput.addEventListener('change', calcularDiasFerias);
            dataFimInput.addEventListener('change', calcularDiasFerias);
        }

        // Formulário de adição de férias
        if (adicionarFeriasForm) {
            adicionarFeriasForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const dataInicio = dataInicioInput.value;
                const dataFim = dataFimInput.value;
                const diasFerias = parseInt(diasFeriasInput.value);

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

                // Atualizar dados do usuário
                usuarioLogado.feriasUtilizadas = feriasUtilizadas;
                usuarioLogado.historicoFerias = historicoFerias;

                // Atualizar localStorage
                localStorage.setItem(USUARIO_KEY, JSON.stringify(usuarioLogado));

                // Atualizar lista de usuários
                const usuarios = JSON.parse(localStorage.getItem(USUARIOS_KEY) || '[]');
                const usuarioIndex = usuarios.findIndex(u => u.username === usuarioLogado.username);
                
                if (usuarioIndex !== -1) {
                    usuarios[usuarioIndex] = usuarioLogado;
                    localStorage.setItem(USUARIOS_KEY, JSON.stringify(usuarios));
                }

                try {
                    // Salvar no Firebase
                    const userId = auth.currentUser.uid;
                    await update(ref(database, 'users/' + userId), {
                        feriasUtilizadas: feriasUtilizadas,
                        historicoFerias: historicoFerias
                    });

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
            });
        } else {
            console.error('Formulário de adicionar férias não encontrado');
        }

        // Chamar funções de atualização
        atualizarSaldoFerias();
        atualizarTabelaHistorico();

        // Selecionar botão de logout
        const btnLogout = document.getElementById('btnLogout');

        // Logout
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                console.log('Botão de logout clicado');
                
                // Limpar dados do usuário
                localStorage.removeItem(USUARIO_KEY);
                
                // Redirecionar para login
                window.location.href = 'login.html';
            });
        } else {
            console.error('Botão de logout não encontrado');
        }

        // Adicionar log global para capturar erros
        window.addEventListener('error', (event) => {
            console.error('Erro global capturado:', event.error);
        });
    });

    // Função para formatar data no padrão brasileiro
    function formatarData(dataString) {
        if (!dataString) return '';
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    }
});
