// Inicialização de Dados com Categorias Padrão se o localStorage estiver vazio
let categories = JSON.parse(localStorage.getItem('categories')) || [
  { id: 1, name: 'Câmeras', requiresImei: true },
  { id: 2, name: 'Rastreadores', requiresImei: true },
  { id: 3, name: 'Insumos', requiresImei: false }
];
let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
let users = JSON.parse(localStorage.getItem('users')) || [];
let history = JSON.parse(localStorage.getItem('history')) || [];

// Alternar entre Abas
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active-tab'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById(tabId).classList.add('active-tab');
  
  const activeBtn = Array.from(document.querySelectorAll('.nav-btn'))
    .find(btn => btn.getAttribute('onclick').includes(tabId));
  if (activeBtn) activeBtn.classList.add('active');

  if (tabId === 'tab-entrada') populateEntradaCategories();
  if (tabId === 'tab-saida') populateSaidaSelects();
  if (tabId === 'tab-inventario') renderInventario();
  if (tabId === 'tab-categorias') renderCategorias();
  if (tabId === 'tab-usuarios') renderUsuarios();
}

function saveData() {
  localStorage.setItem('categories', JSON.stringify(categories));
  localStorage.setItem('inventory', JSON.stringify(inventory));
  localStorage.setItem('users', JSON.stringify(users));
  localStorage.setItem('history', JSON.stringify(history));
}

// -------------------------------------------------------------
// 1. GERENCIAR CATEGORIAS
// -------------------------------------------------------------
document.getElementById('form-categoria').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('input-nome-categoria').value.trim();
  const requiresImei = document.getElementById('check-requer-imei').checked;

  if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    alert('Esta categoria já existe!');
    return;
  }

  categories.push({ id: Date.now(), name, requiresImei });
  saveData();
  document.getElementById('form-categoria').reset();
  renderCategorias();
});

function renderCategorias() {
  const tbody = document.getElementById('tbody-categorias');
  tbody.innerHTML = '';
  categories.forEach(cat => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${cat.name}</strong></td>
      <td>${cat.requiresImei ? 'Sim (Exige IMEI)' : 'Não'}</td>
      <td>
        <button class="btn-delete" onclick="deleteCategoria(${cat.id})">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function deleteCategoria(id) {
  if (confirm('Deseja excluir esta categoria?')) {
    categories = categories.filter(c => c.id !== id);
    saveData();
    renderCategorias();
  }
}

// -------------------------------------------------------------
// 2. ENTRADA DE PRODUTOS
// -------------------------------------------------------------
function populateEntradaCategories() {
  const select = document.getElementById('select-categoria-entrada');
  select.innerHTML = '<option value="">Selecione a Categoria...</option>';
  categories.forEach(c => {
    select.innerHTML += `<option value="${c.name}">${c.name} ${c.requiresImei ? '(Exige IMEI)' : ''}</option>`;
  });
  toggleImeiFields();
}

function toggleImeiFields() {
  const catName = document.getElementById('select-categoria-entrada').value;
  const category = categories.find(c => c.name === catName);

  const qtdGroup = document.getElementById('field-qtd-group');
  const imeiGroup = document.getElementById('field-imei-group');

  if (category && category.requiresImei) {
    qtdGroup.style.display = 'none';
    imeiGroup.style.display = 'block';
    document.getElementById('input-qtd-entrada').required = false;
    document.getElementById('input-imeis-entrada').required = true;
  } else {
    qtdGroup.style.display = 'block';
    imeiGroup.style.display = 'none';
    document.getElementById('input-qtd-entrada').required = true;
    document.getElementById('input-imeis-entrada').required = false;
  }
}

document.getElementById('form-entrada').addEventListener('submit', (e) => {
  e.preventDefault();

  const categoryName = document.getElementById('select-categoria-entrada').value;
  const category = categories.find(c => c.name === categoryName);
  const name = document.getElementById('input-nome-entrada').value.trim();
  const minQuantity = parseInt(document.getElementById('input-min-entrada').value, 10) || 0;

  if (!category) {
    alert('Selecione uma categoria válida!');
    return;
  }

  let quantity = 0;
  let newImeis = [];

  if (category.requiresImei) {
    const rawImeis = document.getElementById('input-imeis-entrada').value;
    newImeis = rawImeis.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
    
    if (newImeis.length === 0) {
      alert('Informe ao menos um IMEI válido para esta categoria!');
      return;
    }

    // Verificar duplicações globais de IMEI
    for (let item of inventory) {
      const duplicate = newImeis.find(imei => item.imeis && item.imeis.includes(imei));
      if (duplicate) {
        alert(`O IMEI "${duplicate}" já está cadastrado no sistema para o produto "${item.name}"!`);
        return;
      }
    }

    quantity = newImeis.length;
  } else {
    quantity = parseInt(document.getElementById('input-qtd-entrada').value, 10);
  }

  const itemIndex = inventory.findIndex(item => item.name.toLowerCase() === name.toLowerCase());

  if (itemIndex > -1) {
    inventory[itemIndex].quantity += quantity;
    inventory[itemIndex].minQuantity = minQuantity;
    if (category.requiresImei) {
      inventory[itemIndex].imeis = [...(inventory[itemIndex].imeis || []), ...newImeis];
    }
  } else {
    const id = inventory.length > 0 ? inventory[inventory.length - 1].id + 1 : 101;
    inventory.push({ 
      id, 
      name, 
      category: category.name,
      requiresImei: category.requiresImei,
      quantity, 
      minQuantity,
      imeis: newImeis 
    });
  }

  history.push({
    date: new Date().toLocaleString('pt-BR'),
    type: 'ENTRADA',
    name,
    quantity,
    imei: newImeis.length > 0 ? newImeis.join(', ') : '-',
    recipient: 'Almoxarifado'
  });

  saveData();
  alert(`Entrada de ${quantity} unidade(s) de "${name}" realizada com sucesso!`);
  document.getElementById('form-entrada').reset();
  toggleImeiFields();
});

// -------------------------------------------------------------
// 3. SAÍDA DE PRODUTOS
// -------------------------------------------------------------
function populateSaidaSelects() {
  const selectProduto = document.getElementById('select-produto-saida');
  const selectUsuario = document.getElementById('select-usuario-saida');

  selectProduto.innerHTML = '<option value="">Selecione o produto...</option>';
  inventory.forEach(item => {
    selectProduto.innerHTML += `<option value="${item.name}">${item.name} (${item.category}) - Disponível: ${item.quantity}</option>`;
  });

  selectUsuario.innerHTML = '<option value="">Selecione o usuário...</option>';
  users.forEach(u => {
    selectUsuario.innerHTML += `<option value="${u.name}">${u.name} (${u.sector})</option>`;
  });

  toggleSaidaImeiSelect();
}

function toggleSaidaImeiSelect() {
  const name = document.getElementById('select-produto-saida').value;
  const item = inventory.find(i => i.name === name);

  const groupQtd = document.getElementById('group-saida-qtd');
  const groupImei = document.getElementById('group-saida-imei');
  const selectImei = document.getElementById('select-imei-saida');

  if (item && item.requiresImei) {
    groupQtd.style.display = 'none';
    groupImei.style.display = 'block';

    selectImei.innerHTML = '<option value="">Selecione o IMEI...</option>';
    (item.imeis || []).forEach(imei => {
      selectImei.innerHTML += `<option value="${imei}">${imei}</option>`;
    });
  } else {
    groupQtd.style.display = 'block';
    groupImei.style.display = 'none';
  }
}

document.getElementById('form-saida').addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('select-produto-saida').value;
  const recipient = document.getElementById('select-usuario-saida').value;
  const itemIndex = inventory.findIndex(i => i.name === name);

  if (itemIndex === -1 || !recipient) {
    alert('Preencha todos os campos!');
    return;
  }

  const item = inventory[itemIndex];
  let qtyToRemove = 1;
  let imeiRemoved = '-';

  if (item.requiresImei) {
    imeiRemoved = document.getElementById('select-imei-saida').value;
    if (!imeiRemoved) {
      alert('Selecione o IMEI que está saindo!');
      return;
    }

    // Remover IMEI específico
    item.imeis = item.imeis.filter(i => i !== imeiRemoved);
    item.quantity = item.imeis.length;
  } else {
    qtyToRemove = parseInt(document.getElementById('input-qtd-saida').value, 10);
    if (item.quantity < qtyToRemove) {
      alert(`Estoque insuficiente! Saldo atual: ${item.quantity}`);
      return;
    }
    item.quantity -= qtyToRemove;
  }

  if (item.quantity <= item.minQuantity) {
    alert(`⚠️ ALERTA: O produto "${name}" atingiu o nível crítico! Restam apenas ${item.quantity} unidade(s).`);
  }

  history.push({
    date: new Date().toLocaleString('pt-BR'),
    type: 'SAÍDA',
    name,
    quantity: qtyToRemove,
    imei: imeiRemoved,
    recipient
  });

  saveData();
  alert(`Saída do produto "${name}" efetuada com sucesso!`);
  document.getElementById('form-saida').reset();
  populateSaidaSelects();
});

// -------------------------------------------------------------
// 4. INVENTÁRIO COMPLETO
// -------------------------------------------------------------
function renderInventario() {
  const tbodyInventario = document.getElementById('tbody-inventario');
  const tbodyHistorico = document.getElementById('tbody-historico');
  const searchInput = document.getElementById('search-input');
  
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  tbodyInventario.innerHTML = '';
  tbodyHistorico.innerHTML = '';

  const filteredInventory = inventory.filter(item => {
    const matchName = item.name.toLowerCase().includes(searchTerm);
    const matchCategory = item.category ? item.category.toLowerCase().includes(searchTerm) : false;
    const matchImei = item.imeis ? item.imeis.some(i => i.toLowerCase().includes(searchTerm)) : false;
    return matchName || matchCategory || matchImei;
  });

  filteredInventory.forEach(item => {
    const isLow = item.quantity <= item.minQuantity;
    const tr = document.createElement('tr');
    if (isLow) tr.className = 'low-stock-row';

    const imeisFormatted = (item.imeis && item.imeis.length > 0)
      ? item.imeis.map(i => `<span class="imei-badge">${i}</span>`).join('')
      : 'N/A';

    tr.innerHTML = `
      <td>#${item.id}</td>
      <td><strong>${item.name}</strong></td>
      <td>${item.category || 'Geral'}</td>
      <td>${item.quantity}</td>
      <td>${imeisFormatted}</td>
      <td class="${isLow ? 'status-low' : 'status-ok'}">
        ${isLow ? '⚠️ Estoque Baixo' : 'OK'}
      </td>
      <td>
        <button class="btn-delete" onclick="deleteProduto(${item.id})">Excluir</button>
      </td>
    `;
    tbodyInventario.appendChild(tr);
  });

  document.getElementById('total-items').textContent = inventory.length;
  document.getElementById('total-quantity').textContent = inventory.reduce((acc, cur) => acc + cur.quantity, 0);

  const historyReversed = [...history].reverse();
  historyReversed.forEach(h => {
    const tr = document.createElement('tr');
    const typeClass = h.type === 'ENTRADA' ? 'tag-entrada' : 'tag-saida';
    tr.innerHTML = `
      <td>${h.date}</td>
      <td class="${typeClass}">${h.type}</td>
      <td>${h.name}</td>
      <td>${h.quantity}</td>
      <td>${h.imei || '-'}</td>
      <td>${h.recipient}</td>
    `;
    tbodyHistorico.appendChild(tr);
  });
}

function deleteProduto(id) {
  if (confirm('Deseja remover este produto do inventário?')) {
    inventory = inventory.filter(item => item.id !== id);
    saveData();
    renderInventario();
  }
}

// -------------------------------------------------------------
// 5. GERENCIAR USUÁRIOS
// -------------------------------------------------------------
document.getElementById('form-usuario').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('input-nome-usuario').value.trim();
  const sector = document.getElementById('input-setor-usuario').value.trim();

  users.push({ id: Date.now(), name, sector });
  saveData();

  document.getElementById('form-usuario').reset();
  renderUsuarios();
});

function renderUsuarios() {
  const tbody = document.getElementById('tbody-usuarios');
  tbody.innerHTML = '';
  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.name}</td>
      <td>${u.sector}</td>
      <td>
        <button class="btn-delete" onclick="deleteUsuario(${u.id})">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function deleteUsuario(id) {
  if (confirm('Deseja remover este usuário?')) {
    users = users.filter(u => u.id !== id);
    saveData();
    renderUsuarios();
  }
}

// Inicialização
populateEntradaCategories();