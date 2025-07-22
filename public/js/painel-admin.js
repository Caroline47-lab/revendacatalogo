/**
 * painel-admin.js
 * * VERSÃO CORRIGIDA E FINALIZADA
 * - Lógica de navegação refeita para garantir a funcionalidade dos botões do menu.
 * - Eventos de clique (onclick) removidos do HTML e adicionados programaticamente no JS para maior robustez.
 * - Integração da sincronização e feedback ao usuário confirmados.
 */

// --- VARIÁVEIS GLOBAIS DO PAINEL DA EMPRESA ---
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
let allCategories = new Set();
let publishedProductIds = [];
let publishedCategoryIds = [];

let productCurrentPage = 1;
let productIsLoading = false;
let productHasNextPage = true; 
let productSearchTerm = '';
let searchDebounceTimer;
const PRODUCTS_PER_PAGE = 20;

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('empresa-view')) {
        setupEventListeners();
        loadLocalData();
        updateDashboard();
        loadProductsForPage(1);
        renderResellersTable();
        feather.replace();
    }
});

// --- CONFIGURAÇÃO DE EVENTOS ---

function setupEventListeners() {
    // Navegação principal
    setupEmpresaNavigation();

    // Menu mobile
    setupMobileMenu();

    // Controles de paginação de produtos
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

    // Busca de produtos
    const searchInput = document.getElementById('product-search-input');
    searchInput.addEventListener('keyup', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            productSearchTerm = searchInput.value;
            resetAndReloadProducts();
        }, 500); 
    });

    // Botões de sincronização
    document.getElementById('reload-products-btn').addEventListener('click', resetAndReloadProducts);
    document.getElementById('test-connection-btn').addEventListener('click', testApiConnection);

    // Botões de fechar modais
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        const modalId = btn.closest('.modal-overlay').id;
        btn.addEventListener('click', () => closeModal(modalId));
    });
}

/**
 * CORREÇÃO PRINCIPAL: Lógica de navegação refeita para ser mais robusta.
 * Agora os listeners são aplicados individualmente a cada link.
 */
function setupEmpresaNavigation() {
    const navLinks = document.querySelectorAll('#empresa-nav .nav-link');
    const mainContent = document.querySelector('#empresa-view .main-content');
    const pageTitle = document.querySelector('#empresa-view .page-header h1');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // 1. Atualiza o link ativo no menu
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // 2. Atualiza o título da página
            if (pageTitle) {
                pageTitle.textContent = link.textContent.trim();
            }

            // 3. Alterna a página visível
            const pageId = link.dataset.page;
            mainContent.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const targetPage = document.getElementById(pageId);
            if (targetPage) {
                targetPage.classList.add('active');
            }

            // 4. Renderiza conteúdo específico da página, se necessário
            if (pageId === 'catalog') renderCatalogTable();
            if (pageId === 'abc-curve') renderAbcCurve();

            feather.replace();
        });
    });
}

function setupMobileMenu() {
    const toggleEmpresa = document.getElementById('menu-toggle-empresa');
    const sidebarEmpresa = document.querySelector('#empresa-view .sidebar');

    if (toggleEmpresa && sidebarEmpresa) {
        toggleEmpresa.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebarEmpresa.classList.toggle('open');
        });
    }

    document.addEventListener('click', (e) => {
        if (sidebarEmpresa && sidebarEmpresa.classList.contains('open')) {
            if (!sidebarEmpresa.contains(e.target) && !toggleEmpresa.contains(e.target)) {
                sidebarEmpresa.classList.remove('open');
            }
        }
    });
}

function closeModal(modalId) { 
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// --- LÓGICA DE DADOS E API ---

function loadLocalData() {
    const savedPublished = localStorage.getItem('erpPublished');
    if (savedPublished) publishedProductIds = JSON.parse(savedPublished).map(id => parseInt(id, 10));
    
    const savedPublishedCategories = localStorage.getItem('erpPublishedCategories');
    if (savedPublishedCategories) publishedCategoryIds = JSON.parse(savedPublishedCategories);
    
    const savedResellers = localStorage.getItem('erpResellers');
    if (savedResellers) mockResellers = JSON.parse(savedResellers);

    const savedTime = localStorage.getItem('erpLastSync');
    if (savedTime) updateLastSyncTime(savedTime);
}

async function loadProductsForPage(page) {
    if (productIsLoading) return;
    productIsLoading = true;

    const loader = document.getElementById('product-list-loader');
    const tbody = document.getElementById('products-table-body');
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    if(loader) loader.classList.add('visible');
    if(tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem;">Carregando produtos...</td></tr>`;
    if(pageInfo) pageInfo.textContent = `Carregando...`;
    if(prevBtn) prevBtn.disabled = true;
    if(nextBtn) nextBtn.disabled = true;

    try {
        const data = await realApiFetch(page, PRODUCTS_PER_PAGE, productSearchTerm);
        const productsFromPage = data.data || [];
        productHasNextPage = data.hasNext;

        loadedProducts = productsFromPage.map(p => {
            if (p.categoria_nome) allCategories.add(p.categoria_nome);
            const variacoes = processVariations(p.estoque);
            const estoqueTotal = variacoes.reduce((total, v) => total + v.quantidade, 0);
            const imagens = typeof p.imagem === 'string' ? p.imagem.split(',').map(url => url.trim()) : [];
            return { id: parseInt(p.id, 10), nome: p.nome || 'Nome não informado', sku: p.sku || 'N/A', preco_original: parseFloat(p.preco || 0), imagem: imagens[0] || null, imagens_adicionais: imagens, estoque_total: estoqueTotal, variacoes: variacoes, status: estoqueTotal > 0 ? 'ativo' : 'sem_estoque', categoria_nome: p.categoria_nome || 'Sem Categoria' };
        });
        
        renderProductsTable();
        if (loadedProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Nenhum produto encontrado.</td></tr>';
        }

    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        showToast(`Falha ao carregar produtos: ${error.message}`, 'error');
        if(tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem;">Erro ao carregar produtos. Verifique a conexão e o console (F12).</td></tr>`;
    } finally {
        productIsLoading = false;
        if(loader) loader.classList.remove('visible');
        if(pageInfo) pageInfo.textContent = `Página ${productCurrentPage}`;
        if(prevBtn) prevBtn.disabled = productCurrentPage <= 1;
        if(nextBtn) nextBtn.disabled = !productHasNextPage;
        renderCategoriesTable();
        feather.replace();
    }
}

function resetAndReloadProducts() {
    showToast('Sincronizando produtos...', 'info');
    productCurrentPage = 1;
    allCategories.clear();
    loadProductsForPage(productCurrentPage).then(() => {
        showToast('Produtos sincronizados com sucesso!', 'success');
        updateLastSyncTime();
    });
}

async function testApiConnection() {
    showToast('Testando conexão...', 'info');
    try {
        const response = await realApiFetch(1, 1, ''); // A função já trata a URL
        if (response.data) {
            showToast('Conexão com API OK!', 'success');
        } else {
            throw new Error('A API não retornou dados válidos.');
        }
    } catch (error) { 
        showToast(`Erro na conexão: ${error.message}`, 'error'); 
    }
}

// --- LÓGICA DE RENDERIZAÇÃO ---

function updateDashboard() {
    document.getElementById('stat-total-products').textContent = '...';
    document.getElementById('stat-active-products').textContent = '...';
    document.getElementById('stat-published-products').textContent = publishedProductIds.length;
    document.getElementById('stat-active-resellers').textContent = mockResellers.filter(r => r.status === 'aprovado').length;
}

function updateLastSyncTime(time = null) {
    const now = time || new Date().toLocaleString('pt-BR');
    const syncTimeEl = document.getElementById('last-sync-time');
    if(syncTimeEl) syncTimeEl.textContent = `Última sincronização: ${now}`;
    if(!time) localStorage.setItem('erpLastSync', now);
}

function renderProductsTable() {
    const tbody = document.getElementById('products-table-body');
    if(!tbody) return;
    tbody.innerHTML = ''; 
    
    loadedProducts.forEach(p => {
        const isPublished = publishedProductIds.includes(p.id);
        const row = tbody.insertRow();
        row.innerHTML = `
            <td data-label="Imagem"><img src="${proxyImageUrl(p.imagem)}" alt="${p.nome}" class="product-image" loading="lazy"></td>
            <td data-label="Nome">${p.nome}</td>
            <td data-label="Preço">R$ ${parseFloat(p.preco_original).toFixed(2)}</td>
            <td data-label="Status"><span class="status-badge ${p.status}">${p.status.replace('_', ' ')}</span></td>
            <td data-label="Publicar">
                <label class="toggle-switch">
                    <input type="checkbox" class="publish-toggle" data-product-id="${p.id}" ${isPublished ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </td>
            <td data-label="Ações" class="actions-cell">
                <button class="btn view-details-btn" data-product-id="${p.id}" style="padding: 0.25rem 0.5rem;"><i data-feather="edit-2"></i></button>
            </td>
        `;
    });

    tbody.querySelectorAll('.publish-toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => togglePublished(parseInt(e.target.dataset.productId)));
    });
    tbody.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', (e) => showProductDetails(parseInt(e.currentTarget.dataset.productId)));
    });
}

function renderResellersTable() {
    const tbody = document.getElementById('resellers-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    mockResellers.forEach(r => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td data-label="Nome">${r.name}</td>
            <td data-label="Documento">${r.doc}</td>
            <td data-label="Telefone">${r.phone}</td>
            <td data-label="Status"><span class="status-badge ${r.status}">${r.status.replace('_', ' ')}</span></td>
            <td data-label="Ações" class="actions-cell">
                <button class="btn analyze-reseller-btn" data-reseller-id="${r.id}" style="padding: 0.25rem 0.5rem;">
                    <i data-feather="${r.status === 'aprovado' ? 'bar-chart-2' : 'edit'}"></i>
                </button>
            </td>
        `;
    });

    tbody.querySelectorAll('.analyze-reseller-btn').forEach(button => {
        button.addEventListener('click', (e) => showResellerDetailsModal(parseInt(e.currentTarget.dataset.resellerId)));
    });
}

function renderCategoriesTable() {
    const tbody = document.getElementById('categories-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (allCategories.size === 0) {
         tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding: 2rem;">Nenhuma categoria encontrada.</td></tr>';
         return;
    }
    
    Array.from(allCategories).sort().forEach(categoryName => {
        const isPublished = publishedCategoryIds.includes(categoryName);
        const row = tbody.insertRow();
        row.innerHTML = `
            <td data-label="Nome da Categoria">${categoryName}</td>
            <td data-label="Publicar">
                <label class="toggle-switch">
                    <input type="checkbox" class="category-toggle" data-category-name="${categoryName}" ${isPublished ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </td>
        `;
    });

    tbody.querySelectorAll('.category-toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => toggleCategoryPublished(e.target.dataset.categoryName));
    });
}

function renderCatalogTable() {
    const tbody = document.getElementById('catalog-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    // Usa 'loadedProducts' pois a paginação do admin já limita o escopo
    const publishedProducts = loadedProducts.filter(p => publishedProductIds.includes(p.id) && p.status === 'ativo');
    if (publishedProducts.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem;">Nenhum produto publicado para revenda nesta página.</td></tr>'; 
        return; 
    }
    publishedProducts.forEach(p => {
        const variationsText = p.variacoes.filter(v => v.quantidade > 0).map(v => v.nome).join(', ');
        tbody.insertRow().innerHTML = `
            <td data-label="Imagem"><img src="${proxyImageUrl(p.imagem)}" alt="${p.nome}" class="product-image" loading="lazy"></td>
            <td data-label="Nome">${p.nome}</td>
            <td data-label="Preço">R$ ${parseFloat(p.preco_original).toFixed(2)}</td>
            <td data-label="Variações">${variationsText || 'Nenhuma'}</td>
        `;
    });
    feather.replace();
}

function renderAbcCurve() {
    const container = document.getElementById('abc-curve');
    if(container) {
        container.innerHTML = '<div class="placeholder-card" style="background-color: var(--card-bg); padding: 4rem 2rem; border-radius: var(--border-radius); box-shadow: var(--shadow); text-align: center; color: var(--text-light);"><p>Funcionalidade de Curva ABC em desenvolvimento.</p></div>';
    }
}


// --- LÓGICA DE AÇÕES E MODAIS ---

function togglePublished(productId) {
    const index = publishedProductIds.indexOf(productId);
    if (index > -1) {
        publishedProductIds.splice(index, 1);
    } else {
        publishedProductIds.push(productId);
    }
    localStorage.setItem('erpPublished', JSON.stringify(publishedProductIds));
    updateDashboard();
}

function toggleCategoryPublished(categoryName) {
    const index = publishedCategoryIds.indexOf(categoryName);
    if (index > -1) {
        publishedCategoryIds.splice(index, 1);
    } else {
        publishedCategoryIds.push(categoryName);
    }
    localStorage.setItem('erpPublishedCategories', JSON.stringify(publishedCategoryIds));
    showToast('Visibilidade da categoria atualizada!', 'success');
}

function showProductDetails(productId) {
    const product = loadedProducts.find(p => p.id === productId);
    if (!product) return;
    document.getElementById('modal-product-name').textContent = product.nome;
    document.getElementById('modal-main-image').src = proxyImageUrl(product.imagem);
    const tbody = document.getElementById('modal-variations-tbody');
    tbody.innerHTML = '';
    if (product.variacoes && product.variacoes.length > 0) {
        product.variacoes.forEach(v => {
            tbody.insertRow().innerHTML = `
                <td><span class="variacao_nome">${v.nome}</span></td>
                <td><span class="stock-badge ${v.quantidade > 0 ? 'in-stock' : 'out-of-stock'}">${v.quantidade > 0 ? `Disponível (${v.quantidade})` : 'Esgotado'}</span></td>
            `;
        });
    } else { 
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Nenhuma variação encontrada.</td></tr>'; 
    }
    document.getElementById('product-details-modal').classList.add('active');
    feather.replace();
}

function showResellerDetailsModal(resellerId) {
    const reseller = mockResellers.find(r => r.id === resellerId);
    if (!reseller) return;

    const modal = document.getElementById('reseller-details-modal');
    document.getElementById('modal-reseller-name').textContent = `Detalhes: ${reseller.name}`;
    const content = document.getElementById('reseller-dashboard-content');
    
    if (reseller.status === 'aprovado') {
        content.innerHTML = `<div class="placeholder-card"><p>Dashboard da revendedora aprovada (em desenvolvimento).</p></div>`;
    } else {
        content.innerHTML = `
            <ul class="info-list">
                <li><strong>Nome:</strong> <span>${reseller.name}</span></li>
                <li><strong>Documento (CPF/CNPJ):</strong> <span>${reseller.doc}</span></li>
                <li><strong>Telefone:</strong> <span>${reseller.phone}</span></li>
                <li><strong>E-mail:</strong> <span>${reseller.email}</span></li>
            </ul>
            <div class="modal-footer">
                <button class="btn btn-danger" id="reprove-btn">Reprovar</button>
                <button class="btn btn-success" id="approve-btn">Aprovar</button>
            </div>
        `;
        content.querySelector('#reprove-btn').onclick = () => updateResellerStatus(reseller.id, 'reprovado');
        content.querySelector('#approve-btn').onclick = () => updateResellerStatus(reseller.id, 'aprovado');
    }
    
    modal.classList.add('active');
    feather.replace();
}

function updateResellerStatus(resellerId, newStatus) {
    const reseller = mockResellers.find(r => r.id === resellerId);
    if(reseller) {
        reseller.status = newStatus;
        localStorage.setItem('erpResellers', JSON.stringify(mockResellers));
        renderResellersTable();
        updateDashboard();
        closeModal('reseller-details-modal');
        showToast(`Revendedora ${newStatus === 'aprovado' ? 'aprovada' : 'reprovada'}!`, 'success');
    }
}
