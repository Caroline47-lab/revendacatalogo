/**
 * servicos.js
 * Centraliza a comunicação com a API da FacilZap e outros serviços.
 * VERSÃO CORRIGIDA: A função realApiFetch foi tornada mais robusta para lidar com
 * respostas da API e evitar que o catálogo trave.
 */

// --- CONSTANTES DA API ---
const API_BASE_URL = "https://api.facilzap.app.br/v1";
const API_TOKEN = "SEU_TOKEN_AQUI"; // IMPORTANTE: Substitua pelo seu token real

/**
 * Busca produtos da API da FacilZap de forma segura e robusta.
 * @param {number} page - O número da página a ser buscada.
 * @param {number} limit - A quantidade de itens por página.
 * @param {string} search - O termo de busca (opcional).
 * @returns {Promise<Object>} Um objeto contendo os dados dos produtos e informações de paginação.
 */
async function realApiFetch(page = 1, limit = 20, search = '') {
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
            // Se a resposta não for bem-sucedida, lança um erro com o status
            throw new Error(`Erro na API: Status ${response.status}`);
        }

        const data = await response.json();

        // CORREÇÃO: Garante que a resposta sempre tenha a estrutura esperada
        return {
            data: data.data || [], // Retorna um array vazio se data.data for nulo/undefined
            hasNext: data.hasNext || false // Retorna false se hasNext for nulo/undefined
        };

    } catch (error) {
        console.error("Falha ao buscar dados da API:", error);
        // Em caso de falha na rede ou erro, retorna uma estrutura vazia para não quebrar o app
        return {
            data: [],
            hasNext: false
        };
    }
}


/**
 * Cria um proxy para as imagens para evitar problemas de CORS e otimizar o carregamento.
 * @param {string} imageUrl - A URL original da imagem.
 * @returns {string} A URL da imagem através do proxy.
 */
function proxyImageUrl(imageUrl) {
    if (!imageUrl) {
        return 'https://placehold.co/300x300/e2e8f0/cccccc?text=Sem+Imagem';
    }
    // Em um ambiente de produção, isso apontaria para uma Netlify Function ou outro proxy.
    // Para desenvolvimento local, podemos usar um serviço de proxy de CORS.
    return `https://cors-anywhere.herokuapp.com/${imageUrl}`;
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
    toast.style.backgroundColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#333';
    
    toast.style.bottom = '20px';
    setTimeout(() => {
        toast.style.bottom = '-100px';
    }, 3000);
}
