// Chave para armazenamento de dados do usuário
let USUARIO_KEY = 'usuarioLogado';
let USUARIOS_KEY = 'usuarios';

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
    set
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';

// Configuração do Firebase
let firebaseConfig = {
    apiKey: "AIzaSyAnPLwZO5i_Ky0nBfI14gzNsRqvVMIOqdk",
    authDomain: "controle-func.firebaseapp.com",
    databaseURL: "https://controle-func-default-rtdb.firebaseio.com",
    projectId: "controle-func",
    storageBucket: "controle-func.firebasestorage.app",
    messagingSenderId: "146164640694",
    appId: "1:146164640694:web:d52beaeaa4b1b38cc76f17"
};

// Inicializar Firebase
let app = initializeApp(firebaseConfig);
let auth = getAuth(app);
let database = getDatabase(app);

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard: Evento DOMContentLoaded disparado');

    // Adicionar classe para evitar FOUC (Flash of Unstyled Content)
    document.body.classList.add('loading');

    // Função para remover classe de carregamento
    function removeLoadingClass() {
        document.body.classList.remove('loading');
        window.removeEventListener('load', removeLoadingClass);
    }

    // Adicionar listener para remoção da classe de carregamento
    window.addEventListener('load', removeLoadingClass);

    // Elementos do formulário
    let adicionarFeriasForm = document.getElementById('adicionarFeriasForm');
    let dataInicioInput = document.getElementById('dataInicio');
    let dataFimInput = document.getElementById('dataFim');
    let diasFeriasInput = document.getElementById('diasFerias');
    let historicoCorpo = document.getElementById('historicoCorpo');
    let saldoFeriasElement = document.getElementById('saldoFerias');

    // Elementos do dashboard
    const nomeUsuarioElement = document.getElementById('employee-name');
    const usernameElement = document.getElementById('employee-username');
    const emailElement = document.getElementById('employee-email');

    // Função para calcular dias de férias
    function calcularDiasFerias() {
        if (!dataInicioInput.value || !dataFimInput.value) return;

        let dataInicio = new Date(dataInicioInput.value);
        let dataFim = new Date(dataFimInput.value);

        // Verificar se a data de início é anterior à data de término
        if (dataInicio > dataFim) {
            alert('A data de início deve ser anterior à data de término');
            dataInicioInput.value = '';
            dataFimInput.value = '';
            diasFeriasInput.value = '';
            return;
        }

        // Calcular dias de férias (considerando dias úteis)
        let diffTime = Math.abs(dataFim - dataInicio);
        let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

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
            let resposta = await fetch('feriados_2025.json');
            let dadosFeriados = await resposta.json();
            return dadosFeriados.feriados;
        } catch (erro) {
            console.error('Erro ao carregar feriados:', erro);
            return [];
        }
    }

    // Carregar feriados ao iniciar
    let feriados = await carregarFeriados();
    console.log('Feriados carregados:', feriados);

    // Função para buscar dados do usuário no Firebase
    async function buscarDadosUsuario() {
        try {
            let user = auth.currentUser;
            if (!user) {
                console.error('Usuário não autenticado');
                return null;
            }

            let userRef = ref(database, 'users/' + user.uid);
            let snapshot = await get(userRef);

            if (snapshot.exists()) {
                let userData = snapshot.val();
                console.log('Dados do usuário carregados do Firebase:', userData);
                
                // Garantir que dados básicos existam
                return {
                    nome: userData.nome || 'Usuário',
                    username: userData.username || user.email.split('@')[0],
                    email: user.email,
                    uid: user.uid,
                    totalFerias: userData.totalFerias || 30,
                    feriasUtilizadas: userData.feriasUtilizadas || 0,
                    historicoFerias: userData.historicoFerias || []
                };
            } else {
                console.warn('Dados do usuário não encontrados no Firebase, criando perfil padrão');
                
                // Criar perfil padrão se não existir
                const perfilPadrao = {
                    nome: 'Usuário',
                    username: user.email.split('@')[0],
                    email: user.email,
                    uid: user.uid,
                    totalFerias: 30,
                    feriasUtilizadas: 0,
                    historicoFerias: []
                };

                // Salvar perfil padrão no Firebase
                await set(userRef, perfilPadrao);

                return perfilPadrao;
            }
        } catch (error) {
            console.error('Erro ao buscar dados do usuário:', error);
            return null;
        }
    }

    // Função para formatar data no padrão DD/MM/YYYY
    function formatarData(dataString) {
        if (!dataString) return 'Data inválida';
        const [ano, mes, dia] = dataString.split('-');
        return `${dia}/${mes}/${ano}`;
    }

    // Observador de autenticação
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        console.log('Usuário autenticado:', user);

        // Buscar dados do usuário
        let usuarioFirebase = await buscarDadosUsuario() || {};
        let usuarioLocalStorage = JSON.parse(localStorage.getItem(USUARIO_KEY)) || {};

        // Mesclar dados do Firebase com localStorage
        let usuarioLogado = {
            ...usuarioLocalStorage,
            ...usuarioFirebase,
            uid: user.uid,
            email: user.email,
            nome: usuarioFirebase.nome || usuarioLocalStorage.nome || 'Usuário',
            username: usuarioFirebase.username || usuarioLocalStorage.username || user.email.split('@')[0]
        };

        console.log('Usuário logado:', usuarioLogado);

        // Atualizar elementos do dashboard
        if (nomeUsuarioElement) {
            nomeUsuarioElement.textContent = usuarioLogado.nome || 'Nome não disponível';
            console.log('Nome do usuário atualizado:', nomeUsuarioElement.textContent);
        } else {
            console.error('Elemento nomeUsuario não encontrado');
        }

        if (usernameElement) {
            usernameElement.textContent = usuarioLogado.username || 'Username não disponível';
            console.log('Username atualizado:', usernameElement.textContent);
        } else {
            console.error('Elemento username não encontrado');
        }

        if (emailElement) {
            emailElement.textContent = usuarioLogado.email || 'Email não disponível';
            console.log('Email atualizado:', emailElement.textContent);
        } else {
            console.error('Elemento email não encontrado');
        }

        // Variáveis para controle de férias
        let totalFerias = usuarioLogado.totalFerias || 30;
        let feriasUtilizadas = usuarioLogado.feriasUtilizadas || 0;
        let historicoFerias = usuarioLogado.historicoFerias || [];

        // Função para adicionar período de férias
        function adicionarPeriodoFerias(event) {
            event.preventDefault();
            
            console.group('🏖️ Adicionar Período de Férias');
            console.log('Evento recebido:', event);

            // Verificar se os elementos existem
            if (!dataInicioInput || !dataFimInput || !diasFeriasInput) {
                console.error('🚨 Elementos de input não encontrados', {
                    dataInicioInput,
                    dataFimInput,
                    diasFeriasInput
                });
                alert('Erro: Elementos do formulário não encontrados.');
                console.groupEnd();
                return;
            }
            
            const dataInicio = dataInicioInput.value;
            const dataFim = dataFimInput.value;
            const diasFerias = parseInt(diasFeriasInput.value);

            console.log('📅 Dados de entrada:', { 
                dataInicio, 
                dataFim, 
                diasFerias 
            });

            // Validações
            if (!dataInicio || !dataFim || isNaN(diasFerias)) {
                console.error('🚫 Dados inválidos');
                alert('Por favor, preencha todos os campos corretamente.');
                console.groupEnd();
                return;
            }

            console.log('Estado atual:', { 
                totalFerias, 
                feriasUtilizadas, 
                historicoFerias 
            });

            // Criar período formatado
            const periodo = `${formatarData(dataInicio)} a ${formatarData(dataFim)}`;

            // Verificar se já existem 3 períodos
            if (historicoFerias.length >= 3) {
                console.warn('Limite de períodos atingido');
                alert('Limite de 3 períodos de férias atingido.');
                console.groupEnd();
                return;
            }

            // Verificar se há saldo suficiente de férias
            if (diasFerias > (totalFerias - feriasUtilizadas)) {
                console.warn('Saldo de férias insuficiente');
                alert('Saldo de férias insuficiente.');
                console.groupEnd();
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
                    console.warn('Adição de férias cancelada pelo usuário');
                    console.groupEnd();
                    return;
                }
            }

            // Adicionar período de férias
            const novoPeriodo = { 
                periodo: `${formatarData(dataInicio)} a ${formatarData(dataFim)}`, 
                dataInicio, 
                dataFim, 
                diasFerias 
            };
            historicoFerias.push(novoPeriodo);
            feriasUtilizadas += diasFerias;

            console.log('Novo período adicionado:', novoPeriodo);
            console.log('Histórico de férias atualizado:', historicoFerias);
            console.log('Férias utilizadas:', feriasUtilizadas);

            // Preparar dados para salvar
            const dadosAtualizados = {
                totalFerias,
                feriasUtilizadas,
                historicoFerias
            };

            // Salvar no Firebase
            const userId = user.uid;
            const userRef = ref(database, 'users/' + userId);

            update(userRef, dadosAtualizados)
                .then(async () => {
                    // Verificar se os dados foram salvos
                    const snapshot = await get(userRef);
                    if (snapshot.exists()) {
                        const dadosSalvos = snapshot.val();
                        console.log('Dados salvos no Firebase:', dadosSalvos);

                        // Atualizar usuário logado
                        usuarioLogado.feriasUtilizadas = feriasUtilizadas;
                        usuarioLogado.historicoFerias = historicoFerias;
                        localStorage.setItem(USUARIO_KEY, JSON.stringify(usuarioLogado));

                        // Atualizar visualização
                        atualizarSaldoFerias();
                        atualizarTabelaHistorico();

                        // Limpar formulário
                        dataInicioInput.value = '';
                        dataFimInput.value = '';
                        diasFeriasInput.value = '';

                        console.log('Férias salvas com sucesso');
                        console.groupEnd();
                    } else {
                        throw new Error('Não foi possível recuperar os dados salvos');
                    }
                })
                .catch(error => {
                    console.error('Erro ao salvar férias:', error);
                    alert('Não foi possível salvar as férias. Tente novamente.');
                    console.groupEnd();
                });
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
                console.log('Histórico de férias a ser renderizado:', historicoFerias);
                
                historicoFerias.forEach((entry, index) => {
                    console.log('Renderizando entrada:', entry);
                    const linha = document.createElement('tr');
                    
                    // Formatar datas para exibição
                    const dataInicioFormatada = formatarData(entry.dataInicio);
                    const dataFimFormatada = formatarData(entry.dataFim);

                    linha.innerHTML = `
                        <td>${entry.periodo}</td>
                        <td>${dataInicioFormatada}</td>
                        <td>${dataFimFormatada}</td>
                        <td>${entry.diasFerias} dias</td>
                        <td>
                            <button onclick="editarPeriodoFerias(${index})" class="btn-editar">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button onclick="excluirPeriodoFerias(${index})" class="btn-excluir">
                                <i class="fas fa-trash"></i> Excluir
                            </button>
                        </td>
                    `;
                    historicoCorpo.appendChild(linha);
                });
                console.log('Tabela de histórico de férias atualizada');
            } else {
                console.error('Elemento historicoCorpo não encontrado');
            }
        }

        // Adicionar event listener para o formulário
        if (adicionarFeriasForm) {
            adicionarFeriasForm.removeEventListener('submit', adicionarPeriodoFerias);
            adicionarFeriasForm.addEventListener('submit', adicionarPeriodoFerias);
            console.log('Event listener de adicionar férias configurado');
            console.log('Formulário:', adicionarFeriasForm);
            console.log('Inputs:', {
                dataInicio: dataInicioInput,
                dataFim: dataFimInput,
                diasFerias: diasFeriasInput
            });
        } else {
            console.error('Formulário de férias não encontrado');
        }

        // Chamar funções iniciais
        atualizarSaldoFerias();
        atualizarTabelaHistorico();
    });
});
