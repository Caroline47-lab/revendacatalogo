/**
 * servicos.js
 * * Este arquivo centraliza funções de serviço utilizadas em todo o sistema,
 * como a comunicação com a API, manipulação de URLs de imagem e exibição de notificações.
 * Criá-lo como um arquivo separado evita a duplicação de código entre os painéis e o catálogo.
 */

/**
 * Realiza uma requisição para a API através do proxy Netlify.
 * @param {number} page - O número da página a ser buscada.
 * @param {number} length - A quantidade de itens por página.
 * @param {string} searchTerm - (Opcional) Termo para busca de produtos.
 * @returns {Promise<object>} Os dados retornados pela API.
 */
async function realApiFetch(page = 1, length = 100, searchTerm = '') {
    // O proxy está configurado no netlify.toml para redirecionar /api/ para a função serverless.
    let apiUrl = `/api/?page=${page}&length=${length}`;
    
    // NOTA: A API do FacilZap não parece suportar um parâmetro de busca direta na URL principal.
    // A busca geralmente é feita no frontend após receber os dados.
    // Se a API suportar, o parâmetro pode ser adicionado aqui.
    // Ex: if (searchTerm) apiUrl += `&search=${encodeURIComponent(searchTerm)}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.statusText} (Status: ${response.status})`);
        }
        return await response.json();
    } catch (error) {
        console.error("Falha ao buscar dados da API:", error);
        showToast("Erro de comunicação com o servidor.", "error");
        // Retorna um objeto no formato esperado para evitar quebras no código que chama a função.
        return { data: [], hasNext: false };
    }
}

/**
 * Cria a URL correta para o proxy de imagens.
 * Isso é necessário para evitar problemas de CORS ao carregar imagens de outro domínio.
 * @param {string} originalUrl - A URL da imagem original do FacilZap.
 * @returns {string} A URL pronta para ser usada no atributo 'src' de uma tag <img>.
 */
function proxyImageUrl(originalUrl) {
    if (!originalUrl || typeof originalUrl !== 'string') {
        // Retorna uma imagem de placeholder se a URL for inválida.
        return 'https://placehold.co/300x300/e2e8f0/cccccc?text=Sem+Imagem';
    }
    // O proxy está configurado no netlify.toml para redirecionar /facilzap-images/
    return `/facilzap-images/${encodeURIComponent(originalUrl)}`;
}

/**
 * Exibe uma notificação flutuante (toast) na tela.
 * @param {string} message - A mensagem a ser exibida.
 * @param {'success'|'error'|'info'} type - O tipo de notificação (para futura estilização).
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    // Adiciona uma classe para estilização futura baseada no tipo
    toast.className = `show ${type}`; 
    
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000); // O toast desaparece após 3 segundos
}

/**
 * Processa a string de estoque da API para um formato de objeto estruturado.
 * A API FacilZap retorna o estoque como "TAMANHO=QTD;TAMANHO=QTD;".
 * @param {string|null} estoqueStr - A string de estoque da API.
 * @returns {Array<object>} Um array de objetos, cada um com { nome, quantidade }.
 */
function processVariations(estoqueStr) {
    if (!estoqueStr || typeof estoqueStr !== 'string') {
        return [];
    }
    
    return estoqueStr
        .split(';')
        .filter(item => item.includes('=')) // Garante que apenas partes válidas sejam processadas
        .map(item => {
            const [nome, quantidade] = item.split('=');
            return {
                nome: nome.trim(),
                quantidade: parseInt(quantidade, 10) || 0
            };
        });
}
