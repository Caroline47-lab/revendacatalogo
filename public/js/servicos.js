/**
 * servicos.js
 * Centraliza a comunicação com a API.
 * VERSÃO CORRIGIDA: Adicionada validação do API_TOKEN para evitar falhas silenciosas.
 * Agora, se o token não for configurado, um erro visível será exibido na tela.
 */

// --- CONSTANTES DA API ---
const API_BASE_URL = "https://api.facilzap.app.br/v1";
// IMPORTANTE: Substitua "SEU_TOKEN_AQUI" pelo seu token real da FacilZap.
const API_TOKEN = "SEU_TOKEN_AQUI";

/**
 * Exibe uma barra de erro global no topo da página.
 * @param {string} message A mensagem de erro a ser exibida.
 */
function showGlobalError(message) {
    let errorBanner = document.getElementById('global-error-banner');
    if (!errorBanner) {
        errorBanner = document.createElement('div');
        errorBanner.id = 'global-error-banner';
        // Estilos para tornar o banner bem visível
        errorBanner.style.backgroundColor = '#ef4444'; // Cor de perigo
        errorBanner.style.color = 'white';
        errorBanner.style.padding = '1rem';
        errorBanner.style.textAlign = 'center';
        errorBanner.style.fontWeight = 'bold';
        errorBanner.style.position = 'fixed';
        errorBanner.style.top = '0';
        errorBanner.style.left = '0';
        errorBanner.style.width = '100%';
        errorBanner.style.zIndex = '9999';
        // Adiciona o banner no início do body
        document.body.prepend(errorBanner);
    }
    errorBanner.innerHTML = message;
}

/**
 * Busca produtos da API da FacilZap de forma segura e robusta.
 * @param {number} page - O número da página a ser buscada.
 * @param {number} limit - A quantidade de itens por página.
 * @param {string} search - O termo de busca (opcional).
 * @returns {Promise<Object>} Um objeto contendo os dados dos produtos e informações de paginação.
 */
async function realApiFetch(page = 1, limit = 20, search = '') {
    // VERIFICAÇÃO CRÍTICA: Checa se o token foi alterado.
    if (API_TOKEN === "SEU_TOKEN_AQUI" || !API_TOKEN) {
        const errorMessage = 'ERRO CRÍTICO: O Token da API não foi configurado no arquivo js/servicos.js. Por favor, substitua "SEU_TOKEN_AQUI" pelo seu token real.';
        console.error(errorMessage);
        showGlobalError(errorMessage); // Mostra o erro na tela para o usuário.
        return { data: [], hasNext: false }; // Retorna vazio para não quebrar o resto do código.
    }

    const url = new URL(`${API_BASE_URL}/produtos`);
    url.searchParams.append('page', page);
    url.searchParams.append('limit', limit);
    if (search) {
        url.searchParams.append('search', search);
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`Erro na API: Status ${response.status} - ${response.statusText}`);
            // Se o erro for de autenticação, exibe uma mensagem específica.
            if (response.status === 401 || response.status === 403) {
                 showGlobalError('Erro de Autenticação: Seu Token da API é inválido ou expirou. Verifique o arquivo js/servicos.js.');
            }
            throw new Error(`Erro na API: Status ${response.status}`);
        }

        const data = await response.json();

        return {
            data: data.data || [],
            hasNext: data.hasNext || false
        };

    } catch (error) {
        console.error("Falha ao buscar dados da API:", error);
        return {
            data: [],
            hasNext: false
        };
    }
}

/**
 * Exibe uma mensagem de notificação (toast) na tela.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de toast ('success', 'error', 'info').
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.style.backgroundColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
    
    toast.style.bottom = '20px';
    setTimeout(() => {
        toast.style.bottom = '-100px';
    }, 3000);
}

// ... (outras funções de serviço, se houver)
