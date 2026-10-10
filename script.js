function showCustomAlert(msg, isSuccess = true) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '12px 20px';
    toast.style.background = isSuccess ? '#00bf9a' : '#ff5252';
    toast.style.color = '#fff';
    toast.style.borderRadius = '6px';
    toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
    toast.style.zIndex = '9999';
    toast.style.transition = 'opacity 0.3s';
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

const BASE_URL = 'http://127.0.0.1:20242';

document.addEventListener('DOMContentLoaded', () => {
    fetchServerInfo();
    fetchDevices();
    initTheme();

    // Modal close handlers
    document.querySelector('.close-btn').addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('action-modal')) {
            closeModal();
        }
    });

    // Search filter for devices table
    const searchInput = document.getElementById('search-device');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#devices-list tr');
            let visibleCount = 0;
            
            rows.forEach(row => {
                if (row.querySelector('.loading-text')) return;
                
                // Get the text content of the row (excluding the hidden inputs/buttons if we want to be strict, but row.textContent is fine)
                const text = row.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    row.style.display = '';
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            });

            // Update page info
            const totalDevicesEl = document.getElementById('total-devices');
            const pageInfoEl = document.getElementById('page-info');
            if (pageInfoEl && totalDevicesEl) {
                const total = totalDevicesEl.textContent;
                pageInfoEl.textContent = visibleCount > 0 ? `1-${visibleCount} of ${total} (Filtered)` : `0 of ${total}`;
            }
        });
    }

    const btnRefresh = document.getElementById('btn-refresh-devices');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            fetchDevices();
        });
    }
});

async function fetchServerInfo() {
    try {
        const response = await fetch(`${BASE_URL}/api/info`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        document.getElementById('server-version').textContent = data.version;
        document.getElementById('server-status').textContent = 'ONLINE';
        document.getElementById('server-status').style.color = '#00bf9a';
    } catch (error) {
        console.error('Error fetching server info:', error);
        document.getElementById('server-version').textContent = 'Unknown';
        document.getElementById('server-status').textContent = 'OFFLINE';
        document.getElementById('server-status').style.color = 'var(--accent-red)';
    }
}

async function fetchDevices() {
    const devicesList = document.getElementById('devices-list');
    const totalDevicesEl = document.getElementById('total-devices');
    const pageInfoEl = document.getElementById('page-info');
    
    try {
        const response = await fetch(`${BASE_URL}/api/android/list`);
        if (!response.ok) throw new Error('Network response was not ok');
        const devices = await response.json();
        
        totalDevicesEl.textContent = devices.length;
        pageInfoEl.textContent = `1-${devices.length} of ${devices.length}`;
        
        if (devices.length === 0) {
            devicesList.innerHTML = `
                <tr>
                    <td colspan="7" class="loading-text">No devices found. Ensure ADB is connected.</td>
                </tr>
            `;
            return;
        }
        
        devicesList.innerHTML = '';
        devices.forEach((device, index) => {
            const tr = document.createElement('tr');
            
            const serial = device.serial || '';
            const deviceName = device.name || 'Unknown';
            const model = device.model || 'Unknown';
            const status = device.status || (device.enabled ? 'online' : 'offline');

            tr.innerHTML = `
                <td><input type="checkbox"></td>
                <td>${index + 1}</td>
                <td style="color: #fff;">${serial}</td>
                <td>${deviceName}</td>
                <td>${model}</td>
                <td>${status}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-edit" onclick="window.location.href='inspector?serial=' + '${serial}'">VIEW XPATH</button>
                    </div>
                </td>
            `;
            devicesList.appendChild(tr);
        });
        
    } catch (error) {
        console.error('Error fetching devices:', error);
        devicesList.innerHTML = `
            <tr>
                <td colspan="7" class="loading-text" style="color: var(--accent-red);">Error connecting to Server at ${BASE_URL}</td>
            </tr>
        `;
    }
}

function viewScreenshot(serial) {
    const modal = document.getElementById('action-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    
    title.textContent = `Screenshot - ${serial}`;
    body.innerHTML = '<div style="text-align:center;"><p style="color:var(--text-muted)">Loading screenshot...</p></div>';
    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('show'), 10);
    
    const imgUrl = `${BASE_URL}/api/android/${serial}/screenshot/0?t=${new Date().getTime()}`;
    const img = new Image();
    img.src = imgUrl;
    img.onload = () => {
        body.innerHTML = '';
        body.appendChild(img);
    };
    img.onerror = () => {
        body.innerHTML = '<p style="color:var(--accent-red)">Failed to load screenshot.</p>';
    };
}

async function viewXPath(serial) {
    const modal = document.getElementById('action-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    
    title.textContent = `XPath / XML Hierarchy - ${serial}`;
    body.innerHTML = '<div style="text-align:center;"><p style="color:var(--text-muted)">Fetching UI hierarchy XML...</p></div>';
    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('show'), 10);
    
    try {
        const response = await fetch(`${BASE_URL}/api/android/${serial}/hierarchy?format=xml`);
        if (!response.ok) throw new Error('Failed to fetch hierarchy');
        
        const xmlText = await response.text();
        
        // Escape HTML
        const escapedXml = xmlText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        body.innerHTML = `<pre>${escapedXml}</pre>`;
    } catch (error) {
        body.innerHTML = `<p style="color:var(--accent-red)">Error: ${error.message}</p>`;
    }
}

function closeModal() {
    const modal = document.getElementById('action-modal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('modal-body').innerHTML = '';
    }, 300);
}

function initTheme() {
    const btnToggleTheme = document.getElementById('btn-toggle-theme');
    const themeIcon = document.getElementById('theme-icon');
    
    const savedTheme = localStorage.getItem('inspector-theme');
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        if (themeIcon) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    }
    
    if (btnToggleTheme) {
        btnToggleTheme.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            let newTheme = 'dark';
            
            if (currentTheme !== 'light') {
                newTheme = 'light';
            }
            
            if (newTheme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('inspector-theme', 'light');
                if (themeIcon) {
                    themeIcon.classList.remove('fa-moon');
                    themeIcon.classList.add('fa-sun');
                }
            } else {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('inspector-theme', 'dark');
                if (themeIcon) {
                    themeIcon.classList.remove('fa-sun');
                    themeIcon.classList.add('fa-moon');
                }
            }
        });
    }
}



// Logic for ATX Direct Connect & Scan
document.addEventListener('DOMContentLoaded', () => {
    const btnConnectAtx = document.getElementById('btn-connect-atx');
    const btnScanAtx = document.getElementById('btn-scan-atx');
    const inputAtxPort = document.getElementById('atx-port');
    
    if (btnConnectAtx && inputAtxPort) {
        btnConnectAtx.addEventListener('click', async () => {
            const port = inputAtxPort.value.trim();
            if (!port) {
                showCustomAlert('Vui lòng nhập cổng ATX (ví dụ 51557)', false);
                return;
            }
            await connectToAtx(port);
        });
    }

    if (btnScanAtx) {
        btnScanAtx.addEventListener('click', async () => {
            btnScanAtx.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            btnScanAtx.disabled = true;
            
            try {
                const foundPort = await scanAtxPorts();
                if (foundPort) {
                    inputAtxPort.value = foundPort;
                    showCustomAlert('Tìm thấy ATX Agent tại cổng: ' + foundPort, true);
                    await connectToAtx(foundPort);
                } else {
                    showCustomAlert('Không tìm thấy ATX Agent nào trong dải cổng 1000-65000.', false);
                }
            } catch (err) {
                console.error(err);
            } finally {
                btnScanAtx.innerHTML = '<i class="fa-solid fa-satellite-dish"></i>';
                btnScanAtx.disabled = false;
            }
        });
    }
});

async function connectToAtx(port) {
    try {
        const response = await fetch(`http://127.0.0.1:${port}/info`);
        if (!response.ok) throw new Error('Cannot connect');
        const info = await response.json();
        
        const devicesList = document.getElementById('devices-list');
        if (devicesList.querySelector('.loading-text')) {
            devicesList.innerHTML = '';
        }
        
        let tr = document.getElementById(`atx-row-${port}`);
        let isNew = false;
        if (!tr) {
            tr = document.createElement('tr');
            tr.id = `atx-row-${port}`;
            isNew = true;
        }
        
        const rowsCount = devicesList.querySelectorAll('tr').length;
        const rowIndex = isNew ? rowsCount + 1 : Array.from(devicesList.children).indexOf(tr) + 1;
        
        const serial = info.serial || ('ATX-' + port);
        const deviceName = info.brand ? (info.brand.toUpperCase() + ' ' + info.model) : 'ATX Device';
        const model = info.model || 'Unknown';
        const display = info.display ? `x${info.display.height}` : '';
        const battery = info.battery ? `%` : '';

        tr.innerHTML = `
            <td><input type="checkbox"></td>
            <td>${rowIndex}</td>
            <td style="color: #fff;"><i class="fa-brands fa-android" style="color: #00bf9a; margin-right: 8px;"></i>${serial}<br><small style="color: var(--text-muted)">127.0.0.1:${port}</small></td>
            <td>${deviceName}<br><small style="color: var(--text-muted)">${display} ${battery ? '| PIN: ' + battery : ''}</small></td>
            <td>${model}</td>
            <td><span style="color: #00bf9a;"><i class="fa-solid fa-circle" style="font-size: 8px; margin-right: 5px;"></i>online</span></td>
            <td>
                <div class="action-buttons" style="justify-content: flex-end;">
                    <button class="btn-action btn-edit" onclick="window.open('inspector?port=${port}', '_blank')">VIEW XPATH</button>
                </div>
            </td>
        `;
        
        if (isNew) {
            devicesList.appendChild(tr);
            const totalDevicesEl = document.getElementById('total-devices');
            if (totalDevicesEl) {
                totalDevicesEl.textContent = parseInt(totalDevicesEl.textContent || 0) + 1;
            }
        }
    } catch (err) {
        showCustomAlert('Không thể kết nối đến ATX Agent tại cổng ' + port, false);
    }
}
}

async function checkPort(port) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 150);
        const response = await fetch(`http://127.0.0.1:${port}/info`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
            const data = await response.json();
            if (data.display || data.Display) return true;
        }
    } catch (e) {
    }
    return false;
}

async function scanAtxPorts() {
    const commonPorts = [51557, 51558, 51559, 7912];
    for (let port of commonPorts) {
        if (await checkPort(port)) return port;
    }
    
    const startPort = 1000;
    const endPort = 65000;
    const batchSize = 500;
    
    for (let p = startPort; p <= endPort; p += batchSize) {
        const promises = [];
        for (let i = 0; i < batchSize && (p + i) <= endPort; i++) {
            const port = p + i;
            if (commonPorts.includes(port)) continue;
            promises.push(checkPort(port).then(found => found ? port : null));
        }
        
        const results = await Promise.all(promises);
        const found = results.find(r => r !== null);
        if (found) return found;
    }
    return null;
}








// --- OFFLINE INSPECTOR LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const btnOffline = document.getElementById('btn-offline-inspector');
    const offlineModal = document.getElementById('offline-modal');
    const closeOffline = document.querySelector('.offline-close');
    const btnStartOffline = document.getElementById('btn-start-offline');
    const inputOfflineImg = document.getElementById('offline-image');
    const inputOfflineXml = document.getElementById('offline-xml');

    if (btnOffline && offlineModal) {
        btnOffline.addEventListener('click', () => {
            offlineModal.style.display = 'flex';
        });
        closeOffline.addEventListener('click', () => {
            offlineModal.style.display = 'none';
        });
        window.addEventListener('click', (e) => {
            if (e.target === offlineModal) offlineModal.style.display = 'none';
        });
        
        btnStartOffline.addEventListener('click', async () => {
            const imgFile = inputOfflineImg.files[0];
            const xmlFile = inputOfflineXml.files[0];
            
            if (!imgFile && !xmlFile) {
                showCustomAlert('Vui lòng chọn ít nhất ảnh hoặc file XML', false);
                return;
            }
            
            btnStartOffline.textContent = 'Đang xử lý...';
            
            try {
                if (imgFile) {
                    const imgDataUrl = await readFileAsDataURL(imgFile);
                    sessionStorage.setItem('offline_image', imgDataUrl);
                } else {
                    sessionStorage.removeItem('offline_image');
                }
                
                if (xmlFile) {
                    const xmlText = await readFileAsText(xmlFile);
                    sessionStorage.setItem('offline_xml', xmlText);
                } else {
                    sessionStorage.removeItem('offline_xml');
                }
                
                window.open('inspector?offline=true', '_blank');
                offlineModal.style.display = 'none';
            } catch (err) {
                showCustomAlert('Lỗi đọc file: ' + err.message, false);
            } finally {
                btnStartOffline.textContent = 'Mở Inspector';
            }
        });
    }
});

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}




