/**
 * painel-revendedora.js
 * * VERSÃO COM NOVA PÁGINA DE DESCRIÇÕES E TABELAS DE MEDIDAS
 * - Adicionada a lógica para o novo menu "Descrições".
 * - Implementado sistema para criar, editar e deletar modelos de tabelas de medidas.
 * - Implementado sistema para adicionar descrição e associar um modelo de tabela a cada produto.
 */

// --- VARIÁVEIS GLOBAIS ---
let resellerProducts = [];
let publishedProductIds = [];
let resellerProductMargins = {};
let resellerProductTags = {};
let resellerActiveProductIds = [];
let resellerSettings = {};
let resellerPromotions = {}; 
// NOVAS VARIÁVEIS
let resellerProductDescriptions = {}; // { productId: "description text" }
let resellerSizingCharts = []; // [{ id, name, headers: [], rows: [[]] }]
let resellerProductSizingChartLinks = {}; // { productId: chartId }

const availableTags = ['Lançamento', 'Promoção', 'Mais Vendido', 'Últimas Peças'];

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('revendedor-view')) {
        loadLocalDataForReseller();
        setupEventListeners();
        setupMobileMenu();
        loadAllPublishedProducts();
        feather.replace();
    }
});

// --- CONFIGURAÇÃO DE EVENTOS ---
function setupEventListeners() {
    // Navegação principal
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
        if(pageId === 'reseller-appearance') loadAppearanceSettings();
        if(pageId === 'reseller-promotions') setupPromotionsPage();
        if(pageId === 'reseller-descriptions') setupDescriptionsPage(); // NOVO
        
        feather.replace();
    });

    // Botões gerais e de promoções...
    // ... (código existente)

    // NOVOS BOTÕES
    document.getElementById('add-sizing-chart-btn').addEventListener('click', () => openSizingChartModal());
    document.getElementById('save-sizing-chart-btn').addEventListener('click', saveSizingChart);
    document.getElementById('add-sizing-chart-row-btn').addEventListener('click', () => addSizingChartRow());
    document.getElementById('add-sizing-chart-col-btn').addEventListener('click', () => addSizingChartColumn());
    document.getElementById('save-product-description-btn').addEventListener('click', saveProductDescription);
}

// ... (outras funções de setup e modais existentes)

// --- CARREGAMENTO DE DADOS ---
function loadLocalDataForReseller() {
    // ... (código existente)
    const savedPromotions = localStorage.getItem('resellerPromotions');
    if (savedPromotions) resellerPromotions = JSON.parse(savedPromotions);

    // NOVO
    const savedDescriptions = localStorage.getItem('resellerProductDescriptions');
    if (savedDescriptions) resellerProductDescriptions = JSON.parse(savedDescriptions);
    const savedSizingCharts = localStorage.getItem('resellerSizingCharts');
    if (savedSizingCharts) resellerSizingCharts = JSON.parse(savedSizingCharts);
    const savedSizingChartLinks = localStorage.getItem('resellerProductSizingChartLinks');
    if (savedSizingChartLinks) resellerProductSizingChartLinks = JSON.parse(savedSizingChartLinks);
}

// ... (loadAllPublishedProducts e outras funções de página existentes)

// --- LÓGICA DA NOVA PÁGINA DE DESCRIÇÕES ---

function setupDescriptionsPage() {
    renderSizingChartManager();
    renderProductDescriptionList();
}

function renderSizingChartManager() {
    const container = document.getElementById('sizing-charts-list');
    if (!container) return;

    if (resellerSizingCharts.length === 0) {
        container.innerHTML = `<p style="text-align: center; padding: 1rem; color: var(--text-light);">Nenhum modelo de tabela de medidas criado.</p>`;
        return;
    }

    let tableHTML = `<table class="product-table"><thead><tr><th>Nome do Modelo</th><th>Ações</th></tr></thead><tbody>`;
    resellerSizingCharts.forEach(chart => {
        tableHTML += `
            <tr>
                <td>${chart.name}</td>
                <td class="actions-cell">
                    <button class="btn" onclick="openSizingChartModal('${chart.id}')" style="padding: 0.25rem 0.5rem;" title="Editar"><i data-feather="edit"></i></button>
                    <button class="btn btn-danger" onclick="deleteSizingChart('${chart.id}')" style="padding: 0.25rem 0.5rem;" title="Excluir"><i data-feather="trash-2"></i></button>
                </td>
            </tr>
        `;
    });
    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
    feather.replace();
}

function renderProductDescriptionList() {
    const tbody = document.getElementById('product-description-list-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    resellerProducts.forEach(product => {
        const description = resellerProductDescriptions[product.id] || 'Nenhuma';
        const chartId = resellerProductSizingChartLinks[product.id];
        const chart = resellerSizingCharts.find(c => c.id === chartId);
        const chartName = chart ? chart.name : 'Nenhuma';

        const row = tbody.insertRow();
        row.innerHTML = `
            <td data-label="Produto">${product.nome}</td>
            <td data-label="Descrição">${description.substring(0, 50)}${description.length > 50 ? '...' : ''}</td>
            <td data-label="Tabela de Medidas">${chartName}</td>
            <td data-label="Ações" class="actions-cell">
                <button class="btn" onclick="openProductDescriptionModal(${product.id})" style="padding: 0.25rem 0.5rem;"><i data-feather="edit"></i> Editar</button>
            </td>
        `;
    });
    feather.replace();
}

function openSizingChartModal(chartId = null) {
    const modal = document.getElementById('sizing-chart-modal');
    const title = document.getElementById('sizing-chart-modal-title');
    const nameInput = document.getElementById('sizing-chart-name');
    const editor = document.getElementById('sizing-chart-editor');
    
    modal.dataset.editingId = chartId || '';

    if (chartId) {
        const chart = resellerSizingCharts.find(c => c.id === chartId);
        if (!chart) return;
        title.textContent = "Editar Tabela de Medidas";
        nameInput.value = chart.name;
        renderSizingChartEditor(chart.headers, chart.rows);
    } else {
        title.textContent = "Criar Nova Tabela de Medidas";
        nameInput.value = '';
        // Inicia com uma tabela básica
        renderSizingChartEditor(['Tamanho', 'Comprimento (cm)'], [['34', ''], ['35', '']]);
    }
    
    openModal('sizing-chart-modal');
}

function renderSizingChartEditor(headers, rows) {
    const editor = document.getElementById('sizing-chart-editor');
    let table = `<table class="product-table"><thead><tr>`;
    headers.forEach((header, index) => {
        table += `<th><input type="text" class="search-input header-input" value="${header}" data-col-index="${index}"></th>`;
    });
    table += `<th></th></tr></thead><tbody>`;

    rows.forEach((row, rowIndex) => {
        table += `<tr>`;
        row.forEach((cell, colIndex) => {
            table += `<td><input type="text" class="search-input cell-input" value="${cell}" data-row-index="${rowIndex}" data-col-index="${colIndex}"></td>`;
        });
        table += `<td class="actions-cell"><button class="btn btn-danger btn-sm" onclick="removeSizingChartRow(this)"><i data-feather="trash-2"></i></button></td>`;
        table += `</tr>`;
    });
    table += `</tbody></table>`;
    editor.innerHTML = table;
    feather.replace();
}

function addSizingChartRow() {
    const table = document.querySelector('#sizing-chart-editor table');
    if (!table) return;
    const newRow = table.querySelector('tbody').insertRow();
    const colCount = table.querySelector('thead tr').children.length - 1;
    for (let i = 0; i < colCount; i++) {
        newRow.insertCell().innerHTML = `<input type="text" class="search-input cell-input">`;
    }
    newRow.insertCell().innerHTML = `<td class="actions-cell"><button class="btn btn-danger btn-sm" onclick="removeSizingChartRow(this)"><i data-feather="trash-2"></i></button></td>`;
    feather.replace();
}

function addSizingChartColumn() {
    const table = document.querySelector('#sizing-chart-editor table');
    if (!table) return;
    table.querySelector('thead tr').insertBefore(document.createElement('th'), table.querySelector('thead tr').lastChild).innerHTML = `<input type="text" class="search-input header-input" value="Nova Medida">`;
    Array.from(table.querySelector('tbody').rows).forEach(row => {
        row.insertBefore(document.createElement('td'), row.lastChild).innerHTML = `<input type="text" class="search-input cell-input">`;
    });
}

function removeSizingChartRow(button) {
    button.closest('tr').remove();
}

function saveSizingChart() {
    const modal = document.getElementById('sizing-chart-modal');
    const chartId = modal.dataset.editingId;
    const name = document.getElementById('sizing-chart-name').value.trim();
    if (!name) {
        showToast("O nome do modelo não pode ser vazio.", "error");
        return;
    }

    const headers = Array.from(document.querySelectorAll('.header-input')).map(input => input.value);
    const rows = [];
    document.querySelectorAll('#sizing-chart-editor tbody tr').forEach(tr => {
        const rowData = Array.from(tr.querySelectorAll('.cell-input')).map(input => input.value);
        rows.push(rowData);
    });

    if (chartId) {
        const index = resellerSizingCharts.findIndex(c => c.id === chartId);
        resellerSizingCharts[index] = { ...resellerSizingCharts[index], name, headers, rows };
    } else {
        resellerSizingCharts.push({ id: `chart_${Date.now()}`, name, headers, rows });
    }

    localStorage.setItem('resellerSizingCharts', JSON.stringify(resellerSizingCharts));
    showToast("Modelo de tabela salvo com sucesso!", "success");
    closeModal('sizing-chart-modal');
    renderSizingChartManager();
}

function deleteSizingChart(chartId) {
    resellerSizingCharts = resellerSizingCharts.filter(c => c.id !== chartId);
    // Desvincula esta tabela de qualquer produto
    for (const productId in resellerProductSizingChartLinks) {
        if (resellerProductSizingChartLinks[productId] === chartId) {
            delete resellerProductSizingChartLinks[productId];
        }
    }
    localStorage.setItem('resellerSizingCharts', JSON.stringify(resellerSizingCharts));
    localStorage.setItem('resellerProductSizingChartLinks', JSON.stringify(resellerProductSizingChartLinks));
    showToast("Modelo de tabela excluído.", "success");
    renderSizingChartManager();
    renderProductDescriptionList();
}

function openProductDescriptionModal(productId) {
    const modal = document.getElementById('product-description-modal');
    const product = resellerProducts.find(p => p.id === productId);
    if (!product) return;

    modal.dataset.editingId = productId;
    document.getElementById('product-description-modal-title').textContent = `Editar: ${product.nome}`;
    document.getElementById('product-description-textarea').value = resellerProductDescriptions[productId] || '';

    const select = document.getElementById('product-sizing-chart-select');
    select.innerHTML = '<option value="">Nenhuma</option>';
    resellerSizingCharts.forEach(chart => {
        const option = document.createElement('option');
        option.value = chart.id;
        option.textContent = chart.name;
        select.appendChild(option);
    });
    select.value = resellerProductSizingChartLinks[productId] || '';

    openModal('product-description-modal');
}

function saveProductDescription() {
    const modal = document.getElementById('product-description-modal');
    const productId = modal.dataset.editingId;
    const description = document.getElementById('product-description-textarea').value;
    const chartId = document.getElementById('product-sizing-chart-select').value;

    resellerProductDescriptions[productId] = description;
    if (chartId) {
        resellerProductSizingChartLinks[productId] = chartId;
    } else {
        delete resellerProductSizingChartLinks[productId];
    }

    localStorage.setItem('resellerProductDescriptions', JSON.stringify(resellerProductDescriptions));
    localStorage.setItem('resellerProductSizingChartLinks', JSON.stringify(resellerProductSizingChartLinks));
    showToast("Descrição salva com sucesso!", "success");
    closeModal('product-description-modal');
    renderProductDescriptionList();
}

// --- Funções auxiliares e de outras páginas ---
// ... (resto do código JS existente)
