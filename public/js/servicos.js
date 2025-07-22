/**
 * servicos.js
 * Centraliza a comunicação com a API da FacilZap e outros serviços.
 * VERSÃO CORRIGIDA: Removido o erro de sintaxe (um '}' extra) e a função
 * realApiFetch foi tornada mais robusta para lidar com falhas na API.
 */

// --- CONSTANTES DA API ---
const API_BASE_URL = "https://api.facilzap.app.br/v1";
// IMPORTANTE: Substitua pelo seu token real. Por segurança, em produção,
// isso deveria vir de uma variável de ambiente no backend (Netlify Function).
const API_TOKEN = "SEU_TOKEN_AQUI";

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

        // Garante que a resposta sempre tenha a estrutura esperada para não quebrar o app
        return {
            data: data.data || [], // Retorna um array vazio se data.data for nulo/undefined
            hasNext: data.hasNext || false // Retorna false se hasNext for nulo/undefined
        };

    } catch (error) {
        console.error("Falha ao buscar dados da API:", error);
        // Em caso de falha na rede ou erro, retorna uma estrutura vazia
        return {
            data: [],
            hasNext: false
        };
    }
}

/**
 * Cria um proxy para as imagens para evitar problemas de CORS e otimizar o carregamento.
 * @param {string} imageUrl - A URL original da imagem.
 * @returns {string} A URL da imagem através do proxy ou um placeholder.
 */
function proxyImageUrl(imageUrl) {
    if (!imageUrl) {
        return 'https://placehold.co/300x300/e2e8f0/cccccc?text=Sem+Imagem';
    }
    // Em um ambiente de produção, isso apontaria para uma Netlify Function ou outro proxy.
    // Para desenvolvimento local, um serviço de proxy de CORS pode ser usado, mas com cuidado.
    // A URL abaixo é apenas um exemplo e pode ser instável.
    // return `https://cors-anywhere.herokuapp.com/${imageUrl}`;
    return imageUrl; // Retornando a URL original por enquanto.
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
    
    // Remove classes de tipo anteriores
    toast.classList.remove('success', 'error', 'info');

    // Adiciona a classe do tipo atual
    if (type === 'success') {
        toast.style.backgroundColor = '#10b981';
    } else if (type === 'error') {
        toast.style.backgroundColor = '#ef4444';
    } else {
        toast.style.backgroundColor = '#3b82f6';
    }
    
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// O '}' extra que quebrava o script foi removido daqui.
