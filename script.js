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

