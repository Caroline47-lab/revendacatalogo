/**
 * painel-admin.js
 * * Versão completa restaurada.
 * - CORREÇÃO FINAL: Função do menu mobile reescrita com uma lógica simples e segura para garantir o funcionamento sem quebrar outros botões.
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

let productCurrentPage = 1;
let productIsLoading = false;
let productHasNextPage = true; 
let productSearchTerm = '';
let searchDebounceTimer;
const PRODUCTS_PER_PAGE = 20;

// --- INICIALIZAÇÃO DOS PAINÉIS ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('empresa-view')) {
        setupViewSwitcher();
        setupEmpresaPanel();
        setupRevendedorPanel();
        setupMobileMenu();
        feather.replace();
    }
});

// --- LÓGICA GERAL DOS PAINÉIS ---
function setupViewSwitcher() {
    document.getElementById('show-empresa-panel').addEventListener('click', () => switchView('empresa-view'));
    document.getElementById('show-revendedor-panel').addEventListener('click', () => { 
        switchView('revendedor-view'); 
        loadAllPublishedProducts(); 
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

// CORREÇÃO: Função do menu mobile reescrita para ser mais simples e direta.
function setupMobileMenu() {
    const toggleEmpresa = document.getElementById('menu-toggle-empresa');
    const sidebarEmpresa = document.querySelector('#empresa-view .sidebar');
    const toggleRevendedor = document.getElementById('menu-toggle-revendedor');
    const sidebarRevendedor = document.querySelector('#revendedor-view .sidebar');

    if (toggleEmpresa && sidebarEmpresa) {
        toggleEmpresa.addEventListener('click', (e) => {
            e.stopPropagation(); // Impede que o clique se propague para outros elementos
            sidebarEmpresa.classList.toggle('open');
            if (sidebarRevendedor) sidebarRevendedor.classList.remove('open');
        });
    }

    if (toggleRevendedor && sidebarRevendedor) {
        toggleRevendedor.addEventListener('click', (e) => {
            e.stopPropagation(); // Impede que o clique se propague para outros elementos
            sidebarRevendedor.classList.toggle('open');
            if (sidebarEmpresa) sidebarEmpresa.classList.remove('open');
        });
    }

    // Listener para fechar os menus se clicar em qualquer lugar fora deles
    document.addEventListener('click', (e) => {
        // Verifica se o menu da empresa está aberto e se o clique foi fora dele e do seu botão
        if (sidebarEmpresa && sidebarEmpresa.classList.contains('open')) {
            if (!sidebarEmpresa.contains(e.target) && e.target !== toggleEmpresa && !toggleEmpresa.contains(e.target)) {
                sidebarEmpresa.classList.remove('open');
            }
        }
        // Verifica se o menu da revendedora está aberto e se o clique foi fora dele e do seu botão
        if (sidebarRevendedor && sidebarRevendedor.classList.contains('open')) {
            if (!sidebarRevendedor.contains(e.target) && e.target !== toggleRevendedor && !toggleRevendedor.contains(e.target)) {
                sidebarRevendedor.classList.remove('open');
            }
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

function setupEmpresaNavigation() {
    const navContainer = document.getElementById('empresa-nav');
    navContainer.addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link');
        if (!link) return;
        e.preventDefault();
        const pageId = link.dataset.page;
        const pageTitle = document.querySelector('#empresa-view .page-header h1');
        pageTitle.textContent = link.textContent.trim();
        navContainer.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        const mainContent = document.querySelector('#empresa-view .main-content');
        mainContent.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const page = mainContent.querySelector(`#${pageId}`);
        if (page) {
            page.classList.add('active');
            page.prepend(mainContent.querySelector('.page-header'));
        }
        if(pageId === 'abc-curve') renderAbcCurve();
        feather.replace();
    });
}

function loadLocalData() {
    const savedCategories = localStorage.getItem('erpCategories');
    if (savedCategories) allCategories = JSON.parse(savedCategories);
    const savedPublished = localStorage.getItem('erpPublished');
    if (savedPublished) {
        publishedProductIds = JSON.parse(savedPublished).map(id => parseInt(id, 10));
    }
    const savedPublishedCategories = localStorage.getItem('erpPublishedCategories');
    if (savedPublishedCategories) publishedCategoryIds = JSON.parse(savedPublishedCategories);
    const savedResellers = localStorage.getItem('erpResellers');
    if (savedResellers) mockResellers = JSON.parse(savedResellers);
    const savedMargins = localStorage.getItem('resellerMargins');
    if (savedMargins) resellerProductMargins = JSON.parse(savedMargins);
    const savedTags = localStorage.getItem('resellerProductTags');
    if (savedTags) resellerProductTags = JSON.parse(savedTags);
    const savedResellerActive = localStorage.getItem('resellerActiveProducts');
    if (savedResellerActive) {
        resellerActiveProductIds = JSON.parse(savedResellerActive).map(id => parseInt(id, 10));
    }
    const savedSettings = localStorage.getItem('resellerSettings');
    if (savedSettings) resellerSettings = JSON.parse(savedSettings);
    const savedTime = localStorage.getItem('erpLastSync');
    if (savedTime) document.getElementById('last-sync-time').textContent = `Última sincronização: ${savedTime}`;
    const savedAbandonedCarts = localStorage.getItem('abandonedCarts');
    if (savedAbandonedCarts) abandonedCarts = JSON.parse(savedAbandonedCarts);
}

async function testApiConnection() {
    showToast('Testando conexão...', 'info');
    try {
        const absoluteUrl = `${window.location.origin}/api/facilzap-proxy?page=1&length=5`;
        const response = await fetch(absoluteUrl);
        if (response.ok && (await response.json()).data) showToast('Conexão com API OK!', 'success');
        else throw new Error('Resposta inválida da API.');
    } catch (error) { showToast(`Erro na conexão: ${error.message}`, 'error'); }
}

function updateLastSyncTime() {
    const now = new Date().toLocaleString('pt-BR');
    document.getElementById('last-sync-time').textContent = `Última sincronização: ${now}`;
    localStorage.setItem('erpLastSync', now);
}

function updateDashboard() {
    document.getElementById('stat-total-products').textContent = '...';
    document.getElementById('stat-active-products').textContent = '...';
    document.getElementById('stat-published-products').textContent = publishedProductIds.length;
    document.getElementById('stat-active-resellers').textContent = mockResellers.filter(r => r.status === 'aprovado').length;
}

function renderProductsTable() {
    const tbody = document.getElementById('products-table-body');
    tbody.innerHTML = ''; 
    
    loadedProducts.forEach(p => {
        const row = tbody.insertRow();
        const isPublished = publishedProductIds.includes(p.id);
        let td;

        td = row.insertCell();
        td.dataset.label = 'Imagem';
        td.innerHTML = `<img src="${proxyImageUrl(p.imagem)}" alt="${p.nome}" class="product-image" loading="lazy" width="40" height="40" onerror="this.src='https://placehold.co/40x40/DB1472/FFFFFF?text=X'">`;

        td = row.insertCell();
        td.dataset.label = 'Nome';
        td.textContent = p.nome;

        td = row.insertCell();
        td.dataset.label = 'Preço';
        td.textContent = `R$ ${parseFloat(p.preco_original).toFixed(2)}`;

        td = row.insertCell();
        td.dataset.label = 'Status';
        td.innerHTML = `<span class="status-badge ${p.status}">${p.status.replace('_', ' ')}</span>`;

        td = row.insertCell();
        td.dataset.label = 'Publicar';
        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'toggle-switch';
        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        toggleInput.checked = isPublished;
        toggleInput.addEventListener('change', () => togglePublished(p.id));
        toggleLabel.appendChild(toggleInput);
        toggleLabel.appendChild(document.createElement('span')).className = 'slider';
        td.appendChild(toggleLabel);

        td = row.insertCell();
        td.dataset.label = 'Ações';
        td.className = 'actions-cell';
        const viewButton = document.createElement('button');
        viewButton.className = 'btn';
        viewButton.style.padding = '0.25rem 0.5rem';
        viewButton.innerHTML = `<i data-feather="edit-2"></i>`;
        viewButton.addEventListener('click', () => showProductDetails(p.id));
        td.appendChild(viewButton);
    });
    feather.replace();
}

function renderCatalogTable() {
    const tbody = document.getElementById('catalog-table-body');
    tbody.innerHTML = '';
    const publishedProducts = loadedProducts.filter(p => publishedProductIds.includes(p.id) && p.status === 'ativo');
    if (publishedProducts.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum produto publicado para revenda nesta página.</td></tr>'; return; }
    publishedProducts.forEach(p => {
        const variationsText = p.variacoes.filter(v => v.quantidade > 0).map(v => v.nome).join(', ');
        tbody.insertRow().innerHTML = `
            <td data-label="Imagem"><img src="${proxyImageUrl(p.imagem)}" alt="${p.nome}" class="product-image" loading="lazy" width="40" height="40" onerror="this.src='https://placehold.co/40x40/DB1472/FFFFFF?text=X'"></td>
            <td data-label="Nome">${p.nome}</td>
            <td data-label="Preço">R$ ${parseFloat(p.preco_original).toFixed(2)}</td>
            <td data-label="Variações">${variationsText || 'Nenhuma'}</td>
        `;
    });
}

function renderResellersTable() {
    const tbody = document.getElementById('resellers-table-body');
    tbody.innerHTML = '';
    mockResellers.forEach(r => {
        const row = tbody.insertRow();
        let td;

        td = row.insertCell();
        td.dataset.label = 'Nome';
        td.textContent = r.name;

        td = row.insertCell();
        td.dataset.label = 'Documento';
        td.textContent = r.doc;

        td = row.insertCell();
        td.dataset.label = 'Telefone';
        td.textContent = r.phone;

        td = row.insertCell();
        td.dataset.label = 'Status';
        td.innerHTML = `<span class="status-badge ${r.status}">${r.status.replace('_', ' ')}</span>`;
        
        td = row.insertCell();
        td.dataset.label = 'Ações';
        td.className = 'actions-cell';
        const actionButton = document.createElement('button');
        actionButton.className = 'btn';
        actionButton.style.padding = '0.25rem 0.5rem';

        if (r.status === 'aprovado') {
            actionButton.innerHTML = `<i data-feather="bar-chart-2"></i> Ver Detalhes`;
            actionButton.addEventListener('click', () => showResellerDetailsModal(r.id));
        } else {
            actionButton.innerHTML = `<i data-feather="edit"></i> Analisar`;
            actionButton.addEventListener('click', () => showResellerDetailsModal(r.id));
        }
        td.appendChild(actionButton);
    });
    feather.replace();
}

function renderCategoriesTable() {
    const tbody = document.getElementById('categories-table-body');
    tbody.innerHTML = '';
    if (allCategories.length === 0) {
         tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Nenhuma categoria encontrada.</td></tr>';
    }
    allCategories.forEach(categoryName => {
        const row = tbody.insertRow();
        let td;
        
        td = row.insertCell();
        td.dataset.label = "Nome da Categoria";
        td.textContent = categoryName;

        const isPublished = publishedCategoryIds.includes(categoryName);
        td = row.insertCell();
        td.dataset.label = "Publicar";
        
        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'toggle-switch';
        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        toggleInput.checked = isPublished;
        toggleInput.addEventListener('change', () => toggleCategoryPublished(categoryName));
        toggleLabel.appendChild(toggleInput);
        toggleLabel.appendChild(document.createElement('span')).className = 'slider';
        td.appendChild(toggleLabel);
    });
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
    const product = loadedProducts.find(p => p.id === parseInt(productId));
    if (!product) return;
    document.getElementById('modal-product-name').textContent = product.nome;
    document.getElementById('modal-main-image').src = proxyImageUrl(product.imagem);
    const tbody = document.getElementById('modal-variations-tbody');
    tbody.innerHTML = '';
    if (product.variacoes && product.variacoes.length > 0) {
        product.variacoes.forEach(v => {
            const row = tbody.insertRow();
            const nameCell = row.insertCell();
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'variacao_nome';
            nameSpan.textContent = v.nome; 
            nameCell.appendChild(nameSpan);

            const stockCell = row.insertCell();
            const badge = document.createElement('span');
            badge.className = `stock-badge ${v.quantidade > 0 ? 'in-stock' : 'out-of-stock'}`;
            badge.textContent = v.quantidade > 0 ? `Disponível (${v.quantidade})` : 'Esgotado';
            stockCell.appendChild(badge);
        });
    } else { tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Nenhuma variação encontrada.</td></tr>'; }
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
        const paidSales = reseller.sales.filter(s => s.status === 'pago');
        const totalSales = paidSales.reduce((sum, s) => sum + s.total, 0);
        const totalItems = reseller.topProducts.reduce((sum, p) => sum + p.sold, 0);
        const ticketMedio = totalItems > 0 ? (totalSales / totalItems) : 0;
        
        let topProductsHTML = reseller.topProducts.map(p => `<li>${p.name} <strong>(${p.sold} vendidos)</strong></li>`).join('');

        const salesByMonth = reseller.sales.reduce((acc, sale) => {
            const month = new Date(sale.date).toLocaleString('default', { month: 'short' });
            acc[month] = (acc[month] || 0) + sale.total;
            return acc;
        }, {});

        const salesChartData = Object.keys(salesByMonth).map(month => ({ month, total: salesByMonth[month] }));
        const maxSale = Math.max(...salesChartData.map(s => s.total));

        content.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><p class="stat-card-title">Vendas no Mês (Jul)</p><p class="stat-card-value">R$ ${salesByMonth['Jul']?.toFixed(2) || '0.00'}</p></div>
                <div class="stat-card"><p class="stat-card-title">Ticket Médio</p><p class="stat-card-value">R$ ${ticketMedio.toFixed(2)}</p></div>
                <div class="stat-card"><p class="stat-card-title">Total de Itens Vendidos</p><p class="stat-card-value">${totalItems}</p></div>
            </div>
            <div class="settings-section">
                <h2>Top Produtos Vendidos</h2>
                <ul class="info-list">${topProductsHTML}</ul>
            </div>
            <div class="settings-section">
                <h2>Evolução de Vendas (Últimos 6 meses)</h2>
                <div class="chart-container">
                    <div class="bar-chart">
                        ${salesChartData.map(s => `<div class="bar" style="height: ${(s.total / maxSale) * 100}%" title="R$ ${s.total.toFixed(2)}"><span class="bar-label">${s.month}</span></div>`).join('')}
                    </div>
                </div>
            </div>
        `;
    } else { // Status 'em_analise'
        content.innerHTML = `
            <ul class="info-list">
                <li><strong>Nome:</strong> <span>${reseller.name}</span></li>
                <li><strong>Documento (CPF/CNPJ):</strong> <span>${reseller.doc}</span></li>
                <li><strong>Telefone:</strong> <span>${reseller.phone}</span></li>
                <li><strong>E-mail:</strong> <span>${reseller.email}</span></li>
            </ul>
            <div class="modal-footer">
                <button class="btn btn-danger" onclick="updateResellerStatus(${reseller.id}, 'reprovado')">Reprovar</button>
                <button class="btn btn-success" onclick="updateResellerStatus(${reseller.id}, 'aprovado')">Aprovar</button>
            </div>
        `;
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

// --- LÓGICA DO PAINEL DA REVENDEDORA ---
function setupRevendedorPanel() {
    const navContainer = document.getElementById('revendedor-nav');
    navContainer.addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link');
        if (!link || link.id === 'view-catalog-btn') return;
        e.preventDefault();
        const pageId = link.dataset.page;
        const pageTitle = document.getElementById('revendedor-page-title');
        pageTitle.textContent = link.textContent.trim();
        navContainer.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        const mainContent = document.querySelector('#revendedor-view .main-content');
        mainContent.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        mainContent.querySelector(`#${pageId}`).classList.add('active');
        if(pageId === 'reseller-products') loadAllPublishedProducts();
        if(pageId === 'reseller-sales') renderSalesHistory();
        if(pageId === 'abandoned-carts') renderAbandonedCartsTable();
        if(pageId === 'reseller-settings') loadResellerSettings();
        feather.replace();
    });
    document.getElementById('apply-mass-margin').addEventListener('click', applyMassMargin);
    document.getElementById('save-settings-btn').addEventListener('click', saveResellerSettings);
    document.getElementById('logo-upload').addEventListener('change', (e) => handleImageUpload(e, 'logo-preview', 'logoUrl'));
    document.querySelectorAll('.banner-upload').forEach(input => {
        input.addEventListener('change', (e) => handleImageUpload(e, `banner-preview-${e.target.dataset.bannerId}`, `banner-${e.target.dataset.bannerId}`));
    });
    document.getElementById('add-sale-item-btn').addEventListener('click', addSaleItem);
    document.getElementById('save-sale-btn').addEventListener('click', saveSale);
    document.getElementById('sale-product-select').addEventListener('change', updateSaleVariationSelect);
    document.getElementById('generate-link-btn').addEventListener('click', generateAndCopyCatalogLink);
}

async function loadAllPublishedProducts() {
    const loader = document.getElementById('reseller-product-list-loader');
    loader.classList.add('visible');
    
    resellerProducts = []; 
    let currentPage = 1;
    let hasMore = true;

    try {
        while(hasMore) {
            const data = await realApiFetch(currentPage, 100, ''); 
            if (data.data.length === 0) {
                hasMore = false;
                break;
            }

            const publishedInPage = data.data.filter(p => publishedProductIds.includes(parseInt(p.id, 10)));
            
            if (publishedInPage.length > 0) {
                 const processed = publishedInPage.map(p => {
                    const variacoes = processVariations(p.estoque);
                    const estoqueTotal = variacoes.reduce((total, v) => total + v.quantidade, 0);
                    const imagens = typeof p.imagem === 'string' ? p.imagem.split(',').map(url => url.trim()) : [];
                    return { id: parseInt(p.id, 10), nome: p.nome || 'Nome não informado', sku: p.sku || 'N/A', preco_original: parseFloat(p.preco || 0), imagem: imagens[0] || null, imagens_adicionais: imagens, estoque_total: estoqueTotal, variacoes: variacoes, status: estoqueTotal > 0 ? 'ativo' : 'sem_estoque', categoria_nome: p.categoria_nome || 'Sem Categoria' };
                });
                resellerProducts.push(...processed);
            }
            
            hasMore = data.hasNext;
            currentPage++;
        }
    } catch (error) {
        console.error("Erro ao buscar produtos para revendedora:", error);
        showToast("Erro ao carregar seus produtos.", "error");
    } finally {
        renderResellerProductsTable(); 
        loader.classList.remove('visible');
    }
}

function renderResellerProductsTable() {
    const tbody = document.getElementById('reseller-products-table-body');
    tbody.innerHTML = '';
    
    if (resellerProducts.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhum produto publicado para você no momento.</td></tr>'; 
        return; 
    }
    
    resellerProducts.forEach(p => {
        const margin = resellerProductMargins[p.id] || 30;
        const finalPrice = parseFloat(p.preco_original) * (1 + margin / 100);
        const isActive = resellerActiveProductIds.includes(p.id);
        const row = tbody.insertRow();
        let td;

        td = row.insertCell();
        td.dataset.label = 'Imagem';
        td.innerHTML = `<img src="${proxyImageUrl(p.imagem)}" alt="${p.nome}" class="product-image" loading="lazy" width="40" height="40" onerror="this.src='https://placehold.co/40x40/DB1472/FFFFFF?text=X'">`;

        td = row.insertCell();
        td.dataset.label = 'Nome';
        td.textContent = p.nome;

        td = row.insertCell();
        td.dataset.label = 'Preço Base';
        td.textContent = `R$ ${parseFloat(p.preco_original).toFixed(2)}`;

        td = row.insertCell();
        td.dataset.label = 'Sua Margem (%)';
        td.textContent = `${margin}%`;

        td = row.insertCell();
        td.dataset.label = 'Preço Final';
        td.textContent = `R$ ${finalPrice.toFixed(2)}`;

        td = row.insertCell();
        td.dataset.label = 'Ativar';
        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'toggle-switch';
        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        toggleInput.checked = isActive;
        toggleInput.addEventListener('change', () => toggleResellerProductActive(p.id));
        toggleLabel.appendChild(toggleInput);
        toggleLabel.appendChild(document.createElement('span')).className = 'slider';
        td.appendChild(toggleLabel);

        td = row.insertCell();
        td.dataset.label = 'Ações';
        td.className = 'actions-cell';
        const editMarginButton = document.createElement('button');
        editMarginButton.className = 'btn';
        editMarginButton.style.padding = '0.25rem 0.5rem';
        editMarginButton.innerHTML = `<i data-feather="edit-2"></i>`;
        editMarginButton.title = "Editar Margem";
        editMarginButton.addEventListener('click', () => showResellerProductEditModal(p.id));
        td.appendChild(editMarginButton);

        const editTagsButton = document.createElement('button');
        editTagsButton.className = 'btn';
        editTagsButton.style.padding = '0.25rem 0.5rem';
        editTagsButton.innerHTML = `<i data-feather="tag"></i>`;
        editTagsButton.title = "Editar Tags";
        editTagsButton.addEventListener('click', () => showResellerTagsModal(p.id));
        td.appendChild(editTagsButton);
    });
    feather.replace();
}

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

function showResellerTagsModal(productId) {
    const product = resellerProducts.find(p => p.id === parseInt(productId));
    if (!product) return;
    document.getElementById('modal-tags-product-name').textContent = `Editar Tags: ${product.nome}`;
    const container = document.getElementById('tags-selection-container');
    container.innerHTML = '';
    const currentTags = resellerProductTags[productId] || [];
    availableTags.forEach(tag => {
        const isChecked = currentTags.includes(tag);
        container.innerHTML += `
            <label>
                <input type="checkbox" class="tag-checkbox" value="${tag}" ${isChecked ? 'checked' : ''}>
                ${tag}
            </label>
        `;
    });
    document.getElementById('save-reseller-tags-btn').onclick = () => saveResellerTags(productId);
    document.getElementById('reseller-tags-modal').classList.add('active');
}

function saveResellerTags(productId) {
    const selectedTags = [];
    document.querySelectorAll('#tags-selection-container .tag-checkbox:checked').forEach(checkbox => {
        selectedTags.push(checkbox.value);
    });
    resellerProductTags[productId] = selectedTags;
    localStorage.setItem('resellerProductTags', JSON.stringify(resellerProductTags));
    closeModal('reseller-tags-modal');
    showToast('Tags do produto atualizadas!', 'success');
}

function applyMassMargin() {
    const marginInput = document.getElementById('mass-margin-input');
    const newMargin = parseFloat(marginInput.value);
    if (isNaN(newMargin) || newMargin < 0) { showToast('Por favor, insira uma margem válida para aplicar em massa.', 'error'); return; }
    
    resellerProducts.forEach(p => { resellerProductMargins[p.id] = newMargin; });
    localStorage.setItem('resellerMargins', JSON.stringify(resellerProductMargins));
    renderResellerProductsTable();
    showToast(`Margem de ${newMargin}% aplicada a todos os produtos!`, 'success');
}

function handleImageUpload(event, previewElementId, settingsKey) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target.result;
        document.getElementById(previewElementId).src = imageUrl;
        resellerSettings[settingsKey] = imageUrl;
    };
    reader.readAsDataURL(file);
}

function saveResellerSettings() {
    resellerSettings.brandName = document.getElementById('brand-name-input').value;
    resellerSettings.primaryColor = document.getElementById('primary-color-input').value;
    resellerSettings.secondaryColor = document.getElementById('secondary-color-input').value;
    resellerSettings.contactPhone = document.getElementById('contact-phone-input').value;
    resellerSettings.instagram = document.getElementById('instagram-input').value;
    resellerSettings.description = document.getElementById('description-textarea').value;
    resellerSettings.topBarMsg1 = document.getElementById('top-bar-msg-1').value;
    resellerSettings.topBarMsg2 = document.getElementById('top-bar-msg-2').value;
    resellerSettings.topBarMsg3 = document.getElementById('top-bar-msg-3').value;
    resellerSettings.catalogUrlName = document.getElementById('catalog-url-name').value;
    localStorage.setItem('resellerSettings', JSON.stringify(resellerSettings));
    showToast('Configurações salvas com sucesso!', 'success');
}

function loadResellerSettings() {
    const settings = resellerSettings;
    document.getElementById('brand-name-input').value = settings.brandName || '';
    document.getElementById('primary-color-input').value = settings.primaryColor || '#DB1472';
    document.getElementById('secondary-color-input').value = settings.secondaryColor || '#F8B81F';
    document.getElementById('contact-phone-input').value = settings.contactPhone || '';
    document.getElementById('instagram-input').value = settings.instagram || '';
    document.getElementById('description-textarea').value = settings.description || '';
    document.getElementById('top-bar-msg-1').value = settings.topBarMsg1 || '';
    document.getElementById('top-bar-msg-2').value = settings.topBarMsg2 || '';
    document.getElementById('top-bar-msg-3').value = settings.topBarMsg3 || '';
    document.getElementById('catalog-url-name').value = settings.catalogUrlName || '';
    if(settings.logoUrl) document.getElementById('logo-preview').src = settings.logoUrl;
    if(settings['banner-desktop-main']) document.getElementById('banner-preview-desktop-main').src = settings['banner-desktop-main'];
    if(settings['banner-mobile-main']) document.getElementById('banner-preview-mobile-main').src = settings['banner-mobile-main'];
}

function renderSalesHistory() {
    const tbody = document.getElementById('sales-history-body');
    const reseller = mockResellers.find(r => r.id === 2);
    const sales = reseller ? reseller.sales : [];
    
    tbody.innerHTML = '';
    if (sales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhuma venda lançada.</td></tr>';
        return;
    }

    sales.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(sale => {
        const row = tbody.insertRow();
        let td;

        td = row.insertCell();
        td.dataset.label = "Data";
        td.textContent = new Date(sale.date).toLocaleDateString('pt-BR');

        td = row.insertCell();
        td.dataset.label = "Itens";
        td.textContent = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        
        td = row.insertCell();
        td.dataset.label = "Valor Total";
        td.textContent = `R$ ${sale.total.toFixed(2)}`;

        td = row.insertCell();
        td.dataset.label = "Status";
        td.innerHTML = `<span class="status-badge ${sale.status}">${sale.status}</span>`;
        
        td = row.insertCell();
        td.dataset.label = "Ações";
        td.className = "actions-cell";
        if (sale.status === 'pendente') {
            const payButton = document.createElement('button');
            payButton.className = 'btn btn-success';
            payButton.style.padding = '0.25rem 0.5rem';
            payButton.innerHTML = `<i data-feather="check"></i> Pago`;
            payButton.onclick = () => markSaleAsPaid(sale.id);
            td.appendChild(payButton);
        }
    });
    feather.replace();
}

function markSaleAsPaid(saleId) {
    const reseller = mockResellers.find(r => r.id === 2); // Simulação
    if(reseller && reseller.sales) {
        const sale = reseller.sales.find(s => s.id === saleId);
        if (sale) {
            sale.status = 'pago';
            localStorage.setItem('erpResellers', JSON.stringify(mockResellers));
            renderSalesHistory();
            showToast('Venda marcada como paga!', 'success');
        }
    }
}

function renderAbandonedCartsTable() {
    const tbody = document.getElementById('abandoned-carts-body');
    tbody.innerHTML = '';
    if (abandonedCarts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum carrinho abandonado.</td></tr>';
        return;
    }

    abandonedCarts.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(cart => {
        const row = tbody.insertRow();
        const totalValue = cart.items.reduce((sum, item) => sum + (parseFloat(item.preco_original) * (1 + (resellerProductMargins[item.id] || 30) / 100) * item.quantity), 0);
        let td;

        td = row.insertCell();
        td.dataset.label = "Data";
        td.textContent = new Date(cart.date).toLocaleDateString('pt-BR');

        td = row.insertCell();
        td.dataset.label = "Cliente";
        td.textContent = cart.customer.name;

        td = row.insertCell();
        td.dataset.label = "Telefone";
        td.textContent = cart.customer.phone;

        td = row.insertCell();
        td.dataset.label = "Itens";
        td.textContent = cart.items.reduce((sum, item) => sum + item.quantity, 0);

        td = row.insertCell();
        td.dataset.label = "Valor";
        td.textContent = `R$ ${totalValue.toFixed(2)}`;
        
        td = row.insertCell();
        td.dataset.label = "Ações";
        td.className = "actions-cell";
        const recoverButton = document.createElement('button');
        recoverButton.className = 'btn btn-success';
        recoverButton.style.padding = '0.25rem 0.5rem';
        recoverButton.innerHTML = `<i data-feather="message-square"></i> Recuperar`;
        recoverButton.onclick = () => recoverCart(cart.customer, cart.items);
        td.appendChild(recoverButton);
    });
    feather.replace();
}

function recoverCart(customer, items) {
    let message = `Olá ${customer.name}, vi que você se interessou por alguns produtos em meu catálogo. Gostaria de ajuda para finalizar seu pedido?`;
    const phone = (customer.phone || '').replace(/[^0-9]/g, '');
    if (!phone) { showToast('Número de telefone inválido.', 'error'); return; }
    
    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

function renderAbcCurve() {
    const salesByProduct = {};
    mockResellers.forEach(reseller => {
        if (reseller.sales) {
            const paidSales = reseller.sales.filter(s => s.status === 'pago');
            paidSales.forEach(sale => {
                sale.items.forEach(item => {
                    const product = loadedProducts.find(p => p.id === item.productId);
                    if (!product) return;

                    if (!salesByProduct[item.productId]) {
                        salesByProduct[item.productId] = { id: item.productId, name: product.nome, quantity: 0, revenue: 0 };
                    }
                    salesByProduct[item.productId].quantity += item.quantity;
                    salesByProduct[item.productId].revenue += item.price * item.quantity;
                });
            });
        }
    });

    const productArray = Object.values(salesByProduct);
    productArray.sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = productArray.reduce((sum, p) => sum + p.revenue, 0);
    
    const curveA = [];
    const curveB = [];
    const curveC = [];
    let cumulativeRevenue = 0;

    productArray.forEach(p => {
        cumulativeRevenue += p.revenue;
        const percentage = totalRevenue > 0 ? (cumulativeRevenue / totalRevenue) * 100 : 0;
        if (percentage <= 80) {
            curveA.push(p);
        } else if (percentage <= 95) {
            curveB.push(p);
        } else {
            curveC.push(p);
        }
    });

    const renderList = (products, containerId) => {
        const container = document.getElementById(containerId);
        if (products.length === 0) {
            container.innerHTML = '<p class="text-light">Nenhum produto nesta categoria com base nas vendas atuais.</p>';
            return;
        }
        let html = '<ul class="info-list">';
        products.forEach(p => {
            const percentageOfTotal = totalRevenue > 0 ? ((p.revenue / totalRevenue) * 100).toFixed(2) : 0;
            html += `<li><span>${p.name}</span><strong>${p.quantity} vendidos (R$ ${p.revenue.toFixed(2)}) - ${percentageOfTotal}%</strong></li>`;
        });
        html += '</ul>';
        container.innerHTML = html;
    };

    renderList(curveA, 'curve-a-list');
    renderList(curveB, 'curve-b-list');
    renderList(curveC, 'curve-c-list');
}

function generateAndCopyCatalogLink() {
    const urlName = document.getElementById('catalog-url-name').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!urlName) {
        showToast('Por favor, insira um nome para a URL da sua loja.', 'error');
        return;
    }
    
    const baseUrl = "https://c4shop.app"; 
    const finalUrl = `${baseUrl}/?loja=${urlName}`;

    const textArea = document.createElement("textarea");
    textArea.value = finalUrl;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        showToast('Link copiado para a área de transferência!', 'success');
    } catch (err) {
        showToast('Não foi possível copiar o link.', 'error');
    }
    document.body.removeChild(textArea);
}

// CORREÇÃO: Funções que estavam faltando foram adicionadas.
function addSaleItem() {
  console.log("Função addSaleItem chamada.");
  // Lógica para adicionar item à venda será implementada aqui.
}

function saveSale() {
  console.log("Função saveSale chamada.");
  // Lógica para salvar a venda será implementada aqui.
}

function updateSaleVariationSelect() {
  console.log("Função updateSaleVariationSelect chamada.");
  // Lógica para atualizar as variações do produto será implementada aqui.
}


// Função auxiliar para debug - pode ser removida em produção
function debugMenuElements() {
    console.log('=== DEBUG MENU MOBILE ===');
    console.log('Toggle Empresa:', document.getElementById('menu-toggle-empresa'));
    console.log('Sidebar Empresa:', document.querySelector('#empresa-view .sidebar'));
    console.log('Toggle Revendedor:', document.getElementById('menu-toggle-revendedor'));
    console.log('Sidebar Revendedor:', document.querySelector('#revendedor-view .sidebar'));
    console.log('========================');
}
