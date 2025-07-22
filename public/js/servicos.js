/**
 * servicos.js
 * * VERSÃO CORRIGIDA E COMPLETA
 * - Corrigido o caminho da API em realApiFetch para /api/, garantindo que os produtos sejam carregados.
 * - Implementadas as funções showToast e proxyImageUrl que estavam faltando.
 * - Adicionado tratamento de erro mais robusto.
 */

/**
 * Mostra uma notificação temporária na tela (toast).
 * @param {string} message A mensagem a ser exibida.
 * @param {string} type O tipo de notificação ('info', 'success', 'error').
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.error("Elemento #toast não encontrado no HTML.");
        return;
    }
    toast.textContent = message;
    const colors = {
        info: '#334155',
        success: '#10b981',
        error: '#ef4444'
    };
    toast.style.backgroundColor = colors[type] || colors.info;
    toast.style.bottom = '20px';
    setTimeout(() => {
        toast.style.bottom = '-100px';
    }, 3000);
}

/**
 * Cria a URL para o proxy de imagens com uma imagem de fallback.
 * @param {string} url A URL original da imagem.
 * @returns {string} A URL do proxy ou uma imagem placeholder.
 */
function proxyImageUrl(url) {
    if (!url || typeof url !== 'string' || url.trim() === '') {
        return 'https://placehold.co/40x40/e2e8f0/94a3b8?text=S/Img';
    }
    // A URL do proxy de imagens é definida no netlify.toml
    const encodedUrl = encodeURIComponent(url);
    return `/facilzap-images/${encodedUrl}`;
}

/**
 * Processa os dados de estoque da API para um formato padronizado.
 * @param {any} stockData Os dados de estoque.
 * @returns {Array} Uma lista de variações com nome e quantidade.
 */
function processVariations(stockData) {
    if (!stockData) return [];
    let data = stockData;
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { return []; }
    }
    if (Array.isArray(data)) {
        return data.map(item => ({ nome: item.variacao?.nome || 'N/A', quantidade: parseInt(item.quantidade || 0) }));
    }
    if (typeof data === 'object' && data !== null) {
        return Object.entries(data).map(([name, qty]) => ({ nome: name, quantidade: parseInt(qty) || 0 }));
    }
    if (typeof data === 'number') { return [{ nome: 'Único', quantidade: data }]; }
    return [];
}


/**
 * Função principal para buscar produtos na API real via proxy.
 * @param {number} page O número da página a ser buscada.
 * @param {number} length A quantidade de itens por página.
 * @param {string} search O termo de busca (opcional).
 * @returns {Promise<Object>} Um objeto com os dados e se há uma próxima página.
 */
async function realApiFetch(page, length, search = '') {
    // CORREÇÃO CRÍTICA: O caminho para o proxy deve ser absoluto a partir da raiz do site.
    let relativeUrl = `/api/facilzap-proxy?page=${page}&length=${length}`;
    if (search) {
        relativeUrl += `&search=${encodeURIComponent(search)}`;
    }
    try {
        const response = await fetch(relativeUrl);
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Erro na API: ${response.status} - ${errorBody}`);
        }
        const result = await response.json();
        return {
            data: Array.isArray(result.data) ? result.data : [],
            hasNext: (result.data || []).length === length
        };
    } catch (error) {
        console.error("Falha ao buscar dados da API:", error);
        showToast("Erro de conexão com a API.", "error");
        return { data: [], hasNext: false }; // Retorna um objeto seguro em caso de erro
    }
}
