/**
 * servicos.js
 * * Este arquivo contém as funções compartilhadas por todos os painéis (serviços centrais).
 * É a nossa "cozinha" e "sistema de encanamento".
 */

/**
 * Mostra uma notificação temporária na tela.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de notificação ('info', 'success', 'error').
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.backgroundColor = type === 'success' ? 'var(--success-color)' : (type === 'error' ? 'var(--danger-color)' : '#333');
    toast.style.bottom = '20px';
    setTimeout(() => { toast.style.bottom = '-100px'; }, 3000);
}

/**
 * Cria a URL para o proxy de imagens.
 * @param {string} url - A URL original da imagem.
 * @returns {string} A URL do proxy.
 */
function proxyImageUrl(url) {
    if (!url || typeof url !== 'string' || url.trim() === '') return 'https://placehold.co/300x300/e2e8f0/94a3b8?text=Sem+Imagem';
    // URLs relativas para o proxy funcionam bem, pois são chamadas do mesmo domínio.
    return url.startsWith('http') ? `/facilzap-images?url=${encodeURIComponent(url)}` : `/facilzap-images?url=${encodeURIComponent('https://' + url)}`;
}

/**
 * Processa os dados de estoque da API para um formato padronizado.
 * @param {any} stockData - Os dados de estoque.
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
 * Função principal para buscar produtos na API real.
 * @param {number} page - O número da página a ser buscada.
 * @param {number} length - A quantidade de itens por página.
 * @param {string} search - O termo de busca (opcional).
 * @returns {Promise<Object>} Um objeto com os dados e se há uma próxima página.
 */
async function realApiFetch(page, length, search) {
    let relativeUrl = `/api/facilzap-proxy?page=${page}&length=${length}`;
    if (search) {
        relativeUrl += `&search=${encodeURIComponent(search)}`;
    }
    // Usa o endereço completo para evitar erros de URL
    const absoluteApiUrl = `${window.location.origin}${relativeUrl}`;
    const response = await fetch(absoluteApiUrl);
    if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
    const result = await response.json();
    return {
        data: result.data || [],
        hasNext: (result.data || []).length === length
    };
}
