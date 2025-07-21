/**
 * painel-admin.js
 * * Versão corrigida e otimizada.
 * - CORREÇÃO: Menu mobile agora funciona de forma estável.
 * - OTIMIZAÇÃO: Painel da revendedora agora usa paginação para carregamento rápido.
 */

// --- VARIÁVEIS GLOBAIS DOS PAINÉIS ---
let mockResellers = [ 
    { 
        id: 1, name: 'Ana Silva', doc: '123.456.789-00', phone: '(11) 98765-4321', email: 'ana.silva@example.com', status: 'em_analise',
        sales: [], topProducts: [] 
    }, 
    { 
        id: 2, name: 'Joana Modas LTDA', doc: '12.345.678/0001-99', phone: '(21) 99999-8888', email: 'contato@joanamodas.com', status: 'aprovado',
        sales: [
            { id: 1, date: '2025-02-15', total: 1200, items: [{productId: 3178781, quantity: 10, price: 40}, {productId: 3178782, quantity: 10, price: 35}], status: 'pago' },
            { id: 2, date: '2025-03-20', total: 1500, items: [{productId: 3178781, quantity: 15, price: 40}, {productId: 3178782, quantity: 10, price: 35}], status: 'pago' },
        ],
        topProducts: [
            { name: 'Rasteirinha Feminina Grace Rose', sold: 25 },
            { name: 'Rasteirinha Feminina  Havaiana com Strass  Ouro TPU', sold: 18 },
        ]
    }, 
];

let loadedProducts = [];
let resellerProducts = [];
let allCategories = [];
let publishedProductIds = [];
let publishedCategoryIds = [];
let resellerProductMargins = {};
let resellerProductTags = {};
let resellerActiveProductIds = [];
let resellerSettings = {};
let currentSaleItems = [];
let abandonedCarts = [];
const availableTags = ['Destaque', 'Lançamento', 'Promoção'];

// Variáveis de paginação para o Painel da Empresa
let productCurrentPage = 1;
let productIsLoading = false;
let productHasNextPage = true; 
let productSearchTerm = '';
let searchDebounceTimer;
const PRODUCTS_PER_PAGE = 20;

// OTIMIZAÇÃO: Variáveis de paginação para o Painel da Revendedora
let resellerCurrentPage = 1;
let resellerIsLoading = false;
let resellerHasNextPage = true;

// --- INICIALIZAÇÃO DOS PAINÉIS ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('empresa-view')) {
        setupViewSwitcher();
        setupEmpresaPanel();
        setupRevendedorPanel();
        // CORREÇÃO: A configuração do menu é chamada aqui para garantir que os elementos existam.
        setupMobileMenu();
        feather.replace();
    }
});

// --- LÓGICA GERAL DOS PAINÉIS ---
function setupViewSwitcher() {
    document.getElementById('show-empresa-panel').addEventListener('click', () => switchView('empresa-view'));
    document.getElementById('show-revendedor-panel').addEventListener('click', () => { 
        switchView('revendedor-view'); 
        // OTIMIZAÇÃO: Carrega apenas a primeira página ao entrar
        loadResellerProductsForPage(1); 
    });
    document.getElementById('view-catalog-btn').addEventListener('click', (e) => { 
        e.preventDefault(); 
        window.open('catalogo/index.html', '_blank');
    });
    
    document.getElementById('back-to-landing-empresa').addEventListener('click', (e) => { e.preventDefault(); switchView('landing-view'); });
    document.getElementById('back-to-landing-revendedor').addEventListener('click', (e) => { e.preventDefault(); switchView('landing-view'); });
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const view = document.getElementById(viewId);
    if (view) {
        view.classList.add('active');
        feather.replace();
    }
}

// CORREÇÃO: Lógica do menu mobile simplificada e robusta.
function setupMobileMenu() {
    const toggleEmpresa = document.getElementById('menu-toggle-empresa');
    const sidebarEmpresa = document.querySelector('#empresa-view .sidebar');
    if (toggleEmpresa && sidebarEmpresa) {
        toggleEmpresa.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebarEmpresa.classList.toggle('open');
        });
    }

    const toggleRevendedor = document.getElementById('menu-toggle-revendedor');
    const sidebarRevendedor = document.querySelector('#revendedor-view .sidebar');
    if (toggleRevendedor && sidebarRevendedor) {
        toggleRevendedor.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebarRevendedor.classList.toggle('open');
        });
    }
    
    // Fecha o menu se clicar fora
    document.body.addEventListener('click', (e) => {
        if (sidebarEmpresa && sidebarEmpresa.classList.contains('open') && !sidebarEmpresa.contains(e.target)) {
            sidebarEmpresa.classList.remove('open');
        }
        if (sidebarRevendedor && sidebarRevendedor.classList.contains('open') && !sidebarRevendedor.contains(e.target)) {
            sidebarRevendedor.classList.remove('open');
        }
    });
}


function closeModal(modalId) { 
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// --- LÓGICA DO PAINEL DA EMPRESA ---
function setupEmpresaPanel() {
    loadLocalData();
    setupEmpresaNavigation();
    updateDashboard();
    
    document.getElementById('prev-page-btn').addEventListener('click', () => {
        if (productCurrentPage > 1) {
            productCurrentPage--;
            loadProductsForPage(productCurrentPage);
        }
    });

    document.getElementById('next-page-btn').addEventListener('click', () => {
        if (productHasNextPage) {
            productCurrentPage++;
            loadProductsForPage(productCurrentPage);
        }
    });

    const searchInput = document.getElementById('product-search-input');
    searchInput.addEventListener('keyup', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            productSearchTerm = searchInput.value;
            resetAndReloadProducts();
        }, 500); 
    });
    
    loadProductsForPage(1);
    renderResellersTable();
    renderCategoriesTable();
}

async function loadProductsForPage(page) {
    if (productIsLoading) return;

    productIsLoading = true;
    const loader = document.getElementById('product-list-loader');
    const tbody = document.getElementById('products-table-body');
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    loader.classList.add('visible');
    tbody.innerHTML = ''; 
    pageInfo.textContent = `Carregando...`;
    prevBtn.disabled = true;
    nextBtn.disabled = true;

    try {
        const data = await realApiFetch(page, PRODUCTS_PER_PAGE, productSearchTerm);
        const productsFromPage = data.data || [];
        productHasNextPage = data.hasNext;

        if (productsFromPage.length === 0 && page === 1) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum produto encontrado.</td></tr>';
        } else {
            const processedProducts = productsFromPage.map(p => {
                const variacoes = processVariations(p.estoque);
                const estoqueTotal = variacoes.reduce((total, v) => total + v.quantidade, 0);
                const imagens = typeof p.imagem === 'string' ? p.imagem.split(',').map(url => url.trim()) : [];
                return { id: parseInt(p.id, 10), nome: p.nome || 'Nome não informado', sku: p.sku || 'N/A', preco_original: parseFloat(p.preco || 0), imagem: imagens[0] || null, imagens_adicionais: imagens, estoque_total: estoqueTotal, variacoes: variacoes, status: estoqueTotal > 0 ? 'ativo' : 'sem_estoque', categoria_nome: p.categoria_nome || 'Sem Categoria' };
            });
            
            loadedProducts = processedProducts; 
            renderProductsTable();
        }
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        showToast(`Falha ao carregar produtos: ${error.message}`, 'error');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Erro ao carregar produtos. Verifique a conexão.</td></tr>';
    } finally {
        productIsLoading = false;
        loader.classList.remove('visible');
        pageInfo.textContent = `Página ${productCurrentPage}`;
        prevBtn.disabled = productCurrentPage <= 1;
        nextBtn.disabled = !productHasNextPage;
        feather.replace();
    }
}

function resetAndReloadProducts() {
    productCurrentPage = 1;
    loadProductsForPage(productCurrentPage);
}

// CORREÇÃO: A movimentação do header foi removida para garantir a estabilidade do menu.
function setupEmpresaNavigation() {
    const navContainer = document.getElementById('empresa-nav');
    const pageTitle = document.querySelector('#empresa-view .page-header h1');
    const mainContent = document.querySelector('#empresa-view .main-content');

    navContainer.addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link');
        if (!link) return;
        e.preventDefault();
        
        const pageId = link.dataset.page;
        pageTitle.textContent = link.textContent.trim();
        
        navContainer.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        mainContent.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const page = mainContent.querySelector(`#${pageId}`);
        if (page) {
            page.classList.add('active');
        }

        if(pageId === 'abc-curve') renderAbcCurve();
        feather.replace();
    });
}

function loadLocalData() {
    // ... (função sem alterações)
}

// ... (demais funções do painel da empresa sem alterações)
function renderProductsTable() {
    const tbody = document.getElementById('products-table-body');
    tbody.innerHTML = ''; 
    
    loadedProducts.forEach(p => {
        const row = tbody.insertRow();
        const isPublished = publishedProductIds.includes(p.id);
        row.innerHTML = `
            <td data-label="Imagem"><img src="${proxyImageUrl(p.imagem)}" alt="${p.nome}" class="product-image" loading="lazy" width="40" height="40" onerror="this.src='https://placehold.co/40x40/DB1472/FFFFFF?text=X'"></td>
            <td data-label="Nome">${p.nome}</td>
            <td data-label="Preço">R$ ${parseFloat(p.preco_original).toFixed(2)}</td>
            <td data-label="Status"><span class="status-badge ${p.status}">${p.status.replace('_', ' ')}</span></td>
            <td data-label="Publicar">
                <label class="toggle-switch">
                    <input type="checkbox" ${isPublished ? 'checked' : ''} onchange="togglePublished(${p.id})">
                    <span class="slider"></span>
                </label>
            </td>
            <td data-label="Ações" class="actions-cell">
                <button class="btn" style="padding: 0.25rem 0.5rem;" onclick="showProductDetails(${p.id})">
                    <i data-feather="edit-2"></i>
                </button>
            </td>
        `;
    });
    feather.replace();
}

// --- LÓGICA DO PAINEL DA REVENDEDORA ---

// OTIMIZAÇÃO: Adiciona controles de paginação ao HTML do painel da revendedora.
function addResellerPaginationControls() {
    const section = document.getElementById('reseller-products');
    if (section && !document.getElementById('reseller-pagination-controls')) {
        const paginationHTML = `
            <div id="reseller-pagination-controls" class="pagination-controls">
                <button id="reseller-prev-page-btn" class="btn btn-secondary"><i data-feather="arrow-left"></i> Anterior</button>
                <span id="reseller-page-info" class="page-info">Página 1</span>
                <button id="reseller-next-page-btn" class="btn btn-secondary">Próxima <i data-feather="arrow-right"></i></button>
            </div>
        `;
        section.insertAdjacentHTML('beforeend', paginationHTML);
        feather.replace();
    }
}

function setupRevendedorPanel() {
    addResellerPaginationControls(); // Garante que os botões existam

    const navContainer = document.getElementById('revendedor-nav');
    const pageTitle = document.getElementById('revendedor-page-title');
    const mainContent = document.querySelector('#revendedor-view .main-content');

    navContainer.addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link');
        if (!link || link.id === 'view-catalog-btn') return;
        e.preventDefault();
        
        const pageId = link.dataset.page;
        pageTitle.textContent = link.textContent.trim();
        
        navContainer.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        mainContent.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        mainContent.querySelector(`#${pageId}`).classList.add('active');
        
        if(pageId === 'reseller-products') loadResellerProductsForPage(1);
        if(pageId === 'reseller-sales') renderSalesHistory();
        if(pageId === 'abandoned-carts') renderAbandonedCartsTable();
        if(pageId === 'reseller-settings') loadResellerSettings();
        feather.replace();
    });

    document.getElementById('apply-mass-margin').addEventListener('click', applyMassMargin);
    document.getElementById('save-settings-btn').addEventListener('click', saveResellerSettings);
    
    // Paginação da Revendedora
    document.getElementById('reseller-prev-page-btn').addEventListener('click', () => {
        if (resellerCurrentPage > 1) {
            resellerCurrentPage--;
            loadResellerProductsForPage(resellerCurrentPage);
        }
    });

    document.getElementById('reseller-next-page-btn').addEventListener('click', () => {
        if (resellerHasNextPage) {
            resellerCurrentPage++;
            loadResellerProductsForPage(resellerCurrentPage);
        }
    });
}

// OTIMIZAÇÃO: Carrega produtos da revendedora de forma paginada.
async function loadResellerProductsForPage(page) {
    if (resellerIsLoading) return;
    resellerIsLoading = true;

    const loader = document.getElementById('reseller-product-list-loader');
    const tbody = document.getElementById('reseller-products-table-body');
    const pageInfo = document.getElementById('reseller-page-info');
    const prevBtn = document.getElementById('reseller-prev-page-btn');
    const nextBtn = document.getElementById('reseller-next-page-btn');

    loader.classList.add('visible');
    tbody.innerHTML = '';
    pageInfo.textContent = 'Carregando...';
    prevBtn.disabled = true;
    nextBtn.disabled = true;

    try {
        // Busca TODOS os produtos da API (a API não tem filtro de "publicados")
        const data = await realApiFetch(page, PRODUCTS_PER_PAGE, '');
        
        // Filtra apenas os produtos que o admin publicou
        const publishedProducts = data.data.filter(p => publishedProductIds.includes(parseInt(p.id, 10)));
        
        resellerHasNextPage = data.hasNext;

        if (publishedProducts.length === 0 && page === 1) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhum produto publicado para você no momento.</td></tr>';
        } else {
            resellerProducts = publishedProducts.map(p => {
                const variacoes = processVariations(p.estoque);
                const imagens = typeof p.imagem === 'string' ? p.imagem.split(',').map(url => url.trim()) : [];
                return { id: parseInt(p.id, 10), nome: p.nome || 'Nome não informado', preco_original: parseFloat(p.preco || 0), imagem: imagens[0] || null };
            });
            renderResellerProductsTable();
        }
    } catch (error) {
        console.error("Erro ao carregar produtos da revendedora:", error);
        showToast("Erro ao carregar seus produtos.", "error");
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Erro ao carregar produtos.</td></tr>';
    } finally {
        resellerIsLoading = false;
        loader.classList.remove('visible');
        pageInfo.textContent = `Página ${page}`;
        prevBtn.disabled = page <= 1;
        nextBtn.disabled = !resellerHasNextPage;
        feather.replace();
    }
}

function renderResellerProductsTable() {
    const tbody = document.getElementById('reseller-products-table-body');
    tbody.innerHTML = '';
    
    if (resellerProducts.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhum produto publicado para você nesta página.</td></tr>'; 
        return; 
    }
    
    resellerProducts.forEach(p => {
        const margin = resellerProductMargins[p.id] || 30;
        const finalPrice = parseFloat(p.preco_original) * (1 + margin / 100);
        const isActive = resellerActiveProductIds.includes(p.id);
        const row = tbody.insertRow();
        
        row.innerHTML = `
            <td data-label="Imagem"><img src="${proxyImageUrl(p.imagem)}" alt="${p.nome}" class="product-image" loading="lazy" width="40" height="40" onerror="this.src='https://placehold.co/40x40/DB1472/FFFFFF?text=X'"></td>
            <td data-label="Nome">${p.nome}</td>
            <td data-label="Preço Base">R$ ${parseFloat(p.preco_original).toFixed(2)}</td>
            <td data-label="Sua Margem (%)">${margin}%</td>
            <td data-label="Preço Final">R$ ${finalPrice.toFixed(2)}</td>
            <td data-label="Ativar">
                <label class="toggle-switch">
                    <input type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleResellerProductActive(${p.id})">
                    <span class="slider"></span>
                </label>
            </td>
            <td data-label="Ações" class="actions-cell">
                <button class="btn" style="padding: 0.25rem 0.5rem;" onclick="showResellerProductEditModal(${p.id})"><i data-feather="edit-2"></i></button>
                <button class="btn" style="padding: 0.25rem 0.5rem;" onclick="showResellerTagsModal(${p.id})"><i data-feather="tag"></i></button>
            </td>
        `;
    });
    feather.replace();
}

// Funções que não precisam de alteração
function toggleResellerProductActive(productId) {
    const index = resellerActiveProductIds.indexOf(productId);
    if (index > -1) resellerActiveProductIds.splice(index, 1);
    else resellerActiveProductIds.push(productId);
    localStorage.setItem('resellerActiveProducts', JSON.stringify(resellerActiveProductIds));
    showToast('Visibilidade do produto no seu catálogo atualizada!', 'success');
}

function showResellerProductEditModal(productId) {
    const product = resellerProducts.find(p => p.id === parseInt(productId));
    if (!product) return;
    document.getElementById('modal-reseller-product-name').textContent = `Editar Margem: ${product.nome}`;
    const marginInput = document.getElementById('reseller-margin-input');
    marginInput.value = resellerProductMargins[productId] || 30;
    document.getElementById('save-reseller-margin-btn').onclick = () => saveResellerMargin(productId);
    document.getElementById('reseller-product-edit-modal').classList.add('active');
}

function saveResellerMargin(productId) {
    const marginInput = document.getElementById('reseller-margin-input');
    const newMargin = parseFloat(marginInput.value);
    if (isNaN(newMargin) || newMargin < 0) { showToast('Por favor, insira uma margem válida.', 'error'); return; }
    resellerProductMargins[productId] = newMargin;
    localStorage.setItem('resellerMargins', JSON.stringify(resellerProductMargins));
    renderResellerProductsTable();
    closeModal('reseller-product-edit-modal');
    showToast('Margem do produto atualizada!', 'success');
}

// ... e assim por diante para as outras funções auxiliares que você já tem.
// Elas não precisam ser modificadas.
