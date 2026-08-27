const BASE_URL = 'http://127.0.0.1:20242';

// State
let currentSerial = null;
let hierarchyData = null;
let imageScaleX = 1;
let imageScaleY = 1;
let selectedNodeId = null;
let _resourceIdCounts = {};
let _contentDescCounts = {};
let _textCounts = {};
let _xpathSearchResults = [];
let _xpathSearchIndex = -1;

// DOM Elements
const elSerial = document.getElementById('device-serial');
const elImage = document.getElementById('device-screen');
const elOverlay = document.getElementById('canvas-overlay');
const elLoading = document.getElementById('loading-overlay');
const elTree = document.getElementById('hierarchy-tree');
const elPropTable = document.getElementById('property-table');
const elPropBody = document.getElementById('property-tbody');
const elNoNode = document.getElementById('no-node-selected');
const elXpathCont = document.getElementById('xpath-container');
const elXpathValue = document.getElementById('xpath-value');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentSerial = urlParams.get('serial');

    if (!currentSerial) {
        showToast('Không có số serial của thiết bị!');
        return;
    }

    elSerial.textContent = currentSerial;

    document.getElementById('btn-refresh').addEventListener('click', loadData);
    document.getElementById('btn-copy-xpath').addEventListener('click', copyXPath);
    
    let currentXPathStrategy = 'auto';
    window.xmlDoc = null;

    const trigger = document.getElementById('xpath-strategy-trigger');
    const dropdown = document.getElementById('xpath-strategy-dropdown');

    if (trigger) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dropdown.style.display === 'none') {
                dropdown.style.display = 'block';
            } else {
                dropdown.style.display = 'none';
            }
        });
        
        document.addEventListener('click', () => {
            dropdown.style.display = 'none';
        });
    }

    document.getElementById('btn-nav-task').addEventListener('click', () => sendCommand('appSwitch'));
    document.getElementById('btn-nav-home').addEventListener('click', () => sendCommand('home'));
    document.getElementById('btn-nav-back').addEventListener('click', () => sendCommand('back'));
    
    const btnPower = document.getElementById('btn-power');
    if (btnPower) {
        btnPower.addEventListener('click', () => sendCommand('power'));
    }
    
    let showBounds = true;
    const btnToggleBounds = document.getElementById('btn-toggle-bounds');
    if (btnToggleBounds) {
        btnToggleBounds.addEventListener('click', () => {
            showBounds = !showBounds;
            if (showBounds) {
                elOverlay.classList.remove('hide-lines');
                btnToggleBounds.style.color = '';
            } else {
                elOverlay.classList.add('hide-lines');
                btnToggleBounds.style.color = '#bf616a';
            }
        });
    }

    function clearAllPings() {
        const pings = document.querySelectorAll('.ping-container');
        pings.forEach(p => p.remove());
    }

    const btnClearPings = document.getElementById('btn-clear-pings');
    if (btnClearPings) {
        btnClearPings.addEventListener('click', clearAllPings);
    }

    // F5 to reload Data, Esc to clear pings
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F5') {
            e.preventDefault();
            loadData();
        } else if (e.key === 'Escape') {
            clearAllPings();
        }
    });

    // Mouse hover coordinates
    const elCanvasWrapper = document.getElementById('canvas-wrapper');
    const elHoverX = document.getElementById('hover-x');
    const elHoverY = document.getElementById('hover-y');
    
    if (elCanvasWrapper && elHoverX && elHoverY) {
        elCanvasWrapper.addEventListener('mousemove', (e) => {
            if (!hierarchyData || !imageScaleX || !imageScaleY) return;
            
            const rect = elImage.getBoundingClientRect();
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;
            
            // Check if mouse is actually inside the image bounds
            if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                const logicalX = Math.round(x / imageScaleX);
                const logicalY = Math.round(y / imageScaleY);
                elHoverX.textContent = logicalX;
                elHoverY.textContent = logicalY;
            } else {
                elHoverX.textContent = '-';
                elHoverY.textContent = '-';
            }
        });
        
        elCanvasWrapper.addEventListener('mouseleave', () => {
            elHoverX.textContent = '-';
            elHoverY.textContent = '-';
        });
        
        let isPPressed = false;
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'p') {
                isPPressed = true;
                if (e.ctrlKey) e.preventDefault(); // Prevent browser print dialog
            }
        });
        document.addEventListener('keyup', (e) => {
            if (e.key.toLowerCase() === 'p') isPPressed = false;
        });

        elCanvasWrapper.addEventListener('click', (e) => {
            if (e.ctrlKey && isPPressed) {
                e.preventDefault();
                e.stopPropagation();
                
                if (!hierarchyData || !imageScaleX || !imageScaleY) return;
                
                const rect = elImage.getBoundingClientRect();
                let x = e.clientX - rect.left;
                let y = e.clientY - rect.top;
                
                if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                    const logicalX = Math.round(x / imageScaleX);
                    const logicalY = Math.round(y / imageScaleY);
                    
                    // Allow multiple pings by not deleting the previous ones
                    const container = document.createElement('div');
                    container.className = 'ping-container';
                    // Optional: assign a unique ID if needed
                    container.id = 'ping-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                    
                    const wrapperRect = elCanvasWrapper.getBoundingClientRect();
                    const offsetX = rect.left - wrapperRect.left;
                    const offsetY = rect.top - wrapperRect.top;
                    
                    container.style.left = (offsetX + x) + 'px';
                    container.style.top = (offsetY + y) + 'px';
                    
                    const ring = document.createElement('div');
                    ring.className = 'ping-ring';
                    
                    const icon = document.createElement('i');
                    icon.className = 'fa-solid fa-location-dot ping-icon';
                    
                    const label = document.createElement('div');
                    label.className = 'ping-label';
                    label.textContent = `${logicalX}, ${logicalY}`;
                    
                    container.appendChild(ring);
                    container.appendChild(icon);
                    container.appendChild(label);
                    
                    // Append to elOverlay so it sits above image but is positioned relative to canvas wrapper
                    // Note: elOverlay parent is canvas-wrapper
                    elOverlay.appendChild(container);
                    
                    // Enable pointer events so user can interact with the ping marker
                    container.style.pointerEvents = 'auto';
                    container.style.cursor = 'pointer';
                    
                    // Remove ping on double click
                    container.addEventListener('dblclick', (ev) => {
                        ev.stopPropagation();
                        container.remove();
                    });
                }
            }
        }, true);
    }

    // Context Menu Logic
    const contextMenu = document.getElementById('context-menu');
    let contextNode = null;
    
    window.addEventListener('click', (e) => {
        if (e.target.closest('#context-menu')) {
            setTimeout(() => {
                contextMenu.style.display = 'none';
            }, 50);
            return;
        }
        contextMenu.style.display = 'none';
    }, true);
    
    window.showContextMenu = function(e, node) {
        try {
            e.preventDefault();
            contextNode = node;
            selectNode(node);
            
            contextMenu.style.display = 'block';
            let left = e.clientX;
            let top = e.clientY;
            
            // Prevent menu from going off-screen
            const menuRect = contextMenu.getBoundingClientRect();
            if (left + menuRect.width > window.innerWidth) left = window.innerWidth - menuRect.width;
            if (top + menuRect.height > window.innerHeight) top = window.innerHeight - menuRect.height;
            
            contextMenu.style.left = left + 'px';
            contextMenu.style.top = top + 'px';
        } catch (err) {
            showToast("Lỗi menu ngữ cảnh: " + err.message);
        }
    };



    document.getElementById('menu-copy-xpath').addEventListener('click', () => {
        if (contextNode && contextNode._xpath) {
            copyToClipboard(contextNode._xpath, 'Đã copy XPath đầy đủ!');
        }
    });

    document.getElementById('menu-copy-short-xpath').addEventListener('click', () => {
        if (contextNode) {
            const shortXpath = buildOptimizedRelativeXPath(contextNode);
            if (shortXpath) {
                copyToClipboard(shortXpath, 'Đã copy XPath ngắn!');
            }
        }
    });
    
    document.getElementById('menu-copy-csharp-xpath').addEventListener('click', () => {
        if (contextNode) {
            let csharpXPath = getCSharpXPath(contextNode);
            if (csharpXPath) {
                copyToClipboard(csharpXPath, 'Đã copy XPath C# (XmlNode)!');
            }
        }
    });
    
    document.getElementById('menu-tap').addEventListener('click', () => {
        if (contextNode) {
            const rect = getRect(contextNode);
            if (rect) {
                const centerX = rect.x + rect.width / 2;
                const centerY = rect.y + rect.height / 2;
                sendCommandWithParams('tap', { x: centerX, y: centerY, isPercent: false });
            }
        }
    });

async function sendCommandWithParams(command, bodyParams = {}) {
    try {
        elLoading.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang thực thi lệnh...';
        elLoading.style.display = 'flex';
        
        const res = await fetch(`${BASE_URL}/api/android/${currentSerial}/command/${command}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyParams)
        });
        if (!res.ok) throw new Error('Command failed');
        
        // Reload data after a brief delay to allow device to render
        elLoading.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Thiết bị đang phản hồi...';
        setTimeout(() => loadData(), 500);
    } catch (err) {
        console.error(err);
        elLoading.style.display = 'none';
        showToast('Lỗi khi gửi lệnh: ' + err.message);
    }
}

async function sendCommand(command) {
    return sendCommandWithParams(command, {});
}

    
    // Unified Search Logic (XPath + String matching)
    const elSearchNode = document.getElementById('search-node');
    const elBtnXpathPrev = document.getElementById('btn-xpath-prev');
    const elBtnXpathNext = document.getElementById('btn-xpath-next');
    const elBtnXpathTap = document.getElementById('btn-xpath-tap');
    const elXpathSearchInfo = document.getElementById('xpath-search-info');

    function updateXPathSearchUI() {
        const btnGroup = document.querySelector('.search-btn-group');
        if (_xpathSearchResults.length > 0) {
            elXpathSearchInfo.textContent = `${_xpathSearchIndex + 1}/${_xpathSearchResults.length}`;
            elBtnXpathPrev.disabled = false;
            elBtnXpathNext.disabled = false;
            if (elBtnXpathTap) elBtnXpathTap.disabled = false;
            if (btnGroup) btnGroup.style.display = 'flex';
        } else {
            elXpathSearchInfo.textContent = "";
            elBtnXpathPrev.disabled = true;
            elBtnXpathNext.disabled = true;
            if (elBtnXpathTap) elBtnXpathTap.disabled = true;
            if (btnGroup) btnGroup.style.display = 'none';
        }
    }

    function performCombinedSearch() {
        const query = elSearchNode.value.trim();
        _xpathSearchResults = [];
        _xpathSearchIndex = -1;

        // Reset all visually filtered items to visible
        document.querySelectorAll('.tree-node').forEach(uiNode => {
            uiNode.style.display = 'flex';
        });

        if (!query) {
            updateXPathSearchUI();
            return;
        }

        if (query.startsWith('/') || query.startsWith('(')) {
            // Evaluates as XPath or function
            if (!window.xmlDoc) return;
            try {
                const result = window.xmlDoc.evaluate(query, window.xmlDoc, null, XPathResult.ANY_TYPE, null);
                
                if (result.resultType === XPathResult.STRING_TYPE || 
                    result.resultType === XPathResult.NUMBER_TYPE || 
                    result.resultType === XPathResult.BOOLEAN_TYPE) {
                    
                    let val = result.resultType === XPathResult.STRING_TYPE ? result.stringValue : 
                              result.resultType === XPathResult.NUMBER_TYPE ? result.numberValue : 
                              result.booleanValue;
                              
                    showToast('Kết quả: ' + val);
                    updateXPathSearchUI();
                    return;
                }

                let node = result.iterateNext();
                while (node) {
                    let id = null;
                    if (node.nodeType === 2 && node.ownerElement) {
                        id = node.ownerElement.getAttribute('_id');
                    } else if (node.nodeType === 1) {
                        id = node.getAttribute('_id');
                    }
                    if (id) {
                        const jsNode = findNodeById(hierarchyData, id);
                        if (jsNode && !_xpathSearchResults.includes(jsNode)) {
                            _xpathSearchResults.push(jsNode);
                        }
                    }
                    node = result.iterateNext();
                }
            } catch (err) {
                // Invalid XPath, ignore
            }
        } else {
            // Normal string search (case insensitive)
            const lowerQuery = query.toLowerCase();
            function searchWalk(node) {
                if (!node) return;
                const nodeText = (node.properties?.text || '').toLowerCase();
                const nodeDesc = (node.properties?.['content-desc'] || '').toLowerCase();
                const nodeClass = (node.properties?.class || node.name || node.key || '').toLowerCase();
                const resId = (node.properties?.['resource-id'] || '').toLowerCase();
                if (nodeText.includes(lowerQuery) || nodeDesc.includes(lowerQuery) || nodeClass.includes(lowerQuery) || resId.includes(lowerQuery)) {
                    _xpathSearchResults.push(node);
                }
                if (node.children) node.children.forEach(searchWalk);
            }
            searchWalk(hierarchyData);
        }

        if (_xpathSearchResults.length === 0) {
            showToast("Không tìm thấy kết quả nào!");
            updateXPathSearchUI();
        } else {
            _xpathSearchIndex = 0;
            updateXPathSearchUI();
            selectNode(_xpathSearchResults[0]);
        }
    }

    elSearchNode.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') performCombinedSearch();
    });

    elBtnXpathPrev.addEventListener('click', () => {
        if (_xpathSearchResults.length === 0) return;
        _xpathSearchIndex = (_xpathSearchIndex - 1 + _xpathSearchResults.length) % _xpathSearchResults.length;
        updateXPathSearchUI();
        selectNode(_xpathSearchResults[_xpathSearchIndex]);
    });

    elBtnXpathNext.addEventListener('click', () => {
        if (_xpathSearchResults.length === 0) return;
        _xpathSearchIndex = (_xpathSearchIndex + 1) % _xpathSearchResults.length;
        updateXPathSearchUI();
        selectNode(_xpathSearchResults[_xpathSearchIndex]);
    });

    if (elBtnXpathTap) {
        elBtnXpathTap.addEventListener('click', () => {
            if (_xpathSearchResults.length === 0) return;
            const nodeToTap = _xpathSearchResults[_xpathSearchIndex];
            if (nodeToTap) {
                const rect = getRect(nodeToTap);
                if (rect) {
                    const centerX = rect.x + rect.width / 2;
                    const centerY = rect.y + rect.height / 2;
                    sendCommandWithParams('tap', { x: centerX, y: centerY, isPercent: false });
                }
            }
        });
    }

    // Tabs Logic
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Show target content
            const targetId = btn.getAttribute('data-tab');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.style.display = targetId === 'tab-hierarchy' ? 'flex' : 'block';
            }
        });
    });

    // Upload Modal Logic
    const btnUpload = document.getElementById('btn-upload');
    const uploadModal = document.getElementById('upload-modal');
    const btnCloseUpload = document.getElementById('btn-close-upload');
    const btnCancelUpload = document.getElementById('btn-cancel-upload');
    const btnSubmitUpload = document.getElementById('btn-submit-upload');
    
    if (btnUpload && uploadModal) {
        btnUpload.addEventListener('click', () => {
            uploadModal.style.display = 'flex';
        });
        const closeUpload = () => uploadModal.style.display = 'none';
        btnCloseUpload.addEventListener('click', closeUpload);
        btnCancelUpload.addEventListener('click', closeUpload);
        
        btnSubmitUpload.addEventListener('click', () => {
            const imgFile = document.getElementById('file-image').files[0];
            const xmlFile = document.getElementById('file-hierarchy').files[0];
            
            if (!imgFile || !xmlFile) {
                showToast("Vui lòng chọn ảnh chụp màn hình và file cấu trúc.");
                return;
            }
            
            closeUpload();
            handleOfflineUpload(imgFile, xmlFile);
        });
    }

    // Resize observer to re-draw boxes if window resizes
    window.addEventListener('resize', () => {
        if (hierarchyData && elImage.src) {
            calculateScale();
            renderBoundingBoxes(hierarchyData);
        }
    });
    
    // Add context menu to XPath input box
    elXpathValue.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (contextNode && window.showContextMenu) {
            window.showContextMenu(e, contextNode);
        }
    });

    initResizer('resizer-main', 'panel-left', 'main-container', 200, 400);
    initResizer('resizer-data', 'pane-properties', 'split-content', 200, 200);

    loadData();
});

function initResizer(resizerId, leftPaneId, containerId, minWidth, rightMargin) {
    const resizer = document.getElementById(resizerId);
    const leftPane = document.getElementById(leftPaneId);
    const container = document.getElementById(containerId);
    
    let isDragging = false;
    
    resizer.addEventListener('mousedown', (e) => {
        isDragging = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const containerRect = container.getBoundingClientRect();
        let newWidth = e.clientX - containerRect.left;
        
        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > containerRect.width - rightMargin) newWidth = containerRect.width - rightMargin;
        
        leftPane.style.width = newWidth + 'px';
        
        if (resizerId === 'resizer-main' && hierarchyData) {
            // Need a tiny delay for layout to settle, or rely on resize event
            requestAnimationFrame(() => {
                calculateScale();
                renderBoundingBoxes(hierarchyData);
            });
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        }
    });
}

async function handleOfflineUpload(imgFile, xmlFile) {
    elLoading.style.display = 'flex';
    elOverlay.innerHTML = '';
    elTree.innerHTML = '';
    selectNode(null);
    elLoading.innerHTML = '<div class="loader-pulse"></div><div class="loading-text">Đang xử lý file ngoại tuyến...</div>';
    
    try {
        // 1. Read Image
        const imgUrl = URL.createObjectURL(imgFile);
        await loadImage(imgUrl);
        
        // 2. Read Hierarchy
        const text = await xmlFile.text();
        let data = null;
        if (xmlFile.name.endsWith('.json')) {
            data = JSON.parse(text);
        } else if (xmlFile.name.endsWith('.txt')) {
            // Text file could be JSON or XML
            if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                data = JSON.parse(text);
            } else {
                data = parseXMLToJSON(text);
            }
        } else {
            // Parse XML by default
            data = parseXMLToJSON(text);
        }
        
        if (!data) throw new Error("Failed to parse hierarchy file.");
        
        // Emulate structure if it's just raw tree
        if (!data.hierarchy) {
            hierarchyData = data;
        } else {
            hierarchyData = data.hierarchy;
        }
        
        calculateScale();
        prepareHierarchyData(hierarchyData);
        
        // Disable live device actions
        document.getElementById('device-serial').textContent = 'Chế độ ngoại tuyến';
        document.getElementById('device-status-text').textContent = 'Ngoại tuyến';
        document.getElementById('device-status-text').className = 'device-status-text off';
        
    } catch (err) {
        console.error(err);
        showToast('Lỗi khi tải file ngoại tuyến: ' + err.message);
    } finally {
        elLoading.style.display = 'none';
    }
}

function parseXMLToJSON(xmlStr) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, "text/xml");
    
    function convertNode(xmlNode) {
        if (xmlNode.nodeType !== 1) return null;
        
        let obj = {
            name: xmlNode.tagName,
            properties: {}
        };
        
        for (let i = 0; i < xmlNode.attributes.length; i++) {
            const attr = xmlNode.attributes[i];
            let val = attr.value;
            if (val === 'true') val = true;
            if (val === 'false') val = false;
            obj.properties[attr.name] = val;
        }
        
        // Ensure class name is set
        if (obj.properties['class']) {
            obj.name = obj.properties['class'];
        }
        
        let children = [];
        for (let i = 0; i < xmlNode.childNodes.length; i++) {
            const childObj = convertNode(xmlNode.childNodes[i]);
            if (childObj) children.push(childObj);
        }
        if (children.length > 0) obj.children = children;
        
        return obj;
    }
    
    let root = xmlDoc.documentElement;
    if (root.tagName === 'hierarchy' && root.children.length > 0) {
        root = root.children[0];
    }
    
    return convertNode(root);
}

let nodeIdCounter = 0;

function processNode(node, parentPath, indexStr, depth) {
    node._id = 'node_' + (nodeIdCounter++);
    node._index = indexStr !== undefined ? indexStr : 0;
    node._depth = depth !== undefined ? depth : 1;
    
    // Count attributes for optimized relative xpath
    if (node.properties) {
        if (node.properties['resource-id']) {
            let resId = node.properties['resource-id'];
            _resourceIdCounts[resId] = (_resourceIdCounts[resId] || 0) + 1;
        }
        if (node.properties['content-desc']) {
            let desc = node.properties['content-desc'];
            _contentDescCounts[desc] = (_contentDescCounts[desc] || 0) + 1;
        }
        if (node.properties['text']) {
            let txt = node.properties['text'];
            _textCounts[txt] = (_textCounts[txt] || 0) + 1;
        }
    }
    
    let nodeClass = node.name || node.key || (node.properties ? node.properties.class : 'unknown');
    if (!nodeClass) nodeClass = 'node';
    
    node._xpath = parentPath + '/' + nodeClass + '[' + (node._index + 1) + ']';
    
    if (node.children) {
        const classCounts = {};
        node.children.forEach(child => {
            const cClass = child.name || child.key || (child.properties ? child.properties.class : 'unknown');
            classCounts[cClass] = 0;
        });
        
        node.children.forEach(child => {
            child._parent = node; // set parent reference
            const cClass = child.name || child.key || (child.properties ? child.properties.class : 'unknown');
            processNode(child, node._xpath, classCounts[cClass], node._depth + 1);
            classCounts[cClass]++;
        });
    }
}

function buildXMLDoc(data) {
    window.xmlDoc = document.implementation.createDocument(null, 'hierarchy', null);
    if (!data) return;
    
    function traverse(jsonNode, xmlParent) {
        if (!jsonNode) return;
        
        let nodeClass = jsonNode.properties?.class || jsonNode.name || jsonNode.key || 'node';
        nodeClass = nodeClass.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
        if (/^[0-9\.\-]/.test(nodeClass)) nodeClass = '_' + nodeClass;
        
        let el = window.xmlDoc.createElement(nodeClass);
        
        if (jsonNode.properties) {
            for (const [k, v] of Object.entries(jsonNode.properties)) {
                try {
                    let safeKey = k.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                    el.setAttribute(safeKey, v);
                } catch (e) {}
            }
        }
        el.setAttribute('_id', jsonNode._id);
        
        xmlParent.appendChild(el);
        
        if (jsonNode.children) {
            jsonNode.children.forEach(child => traverse(child, el));
        }
    }
    traverse(data, window.xmlDoc.documentElement);
}

function prepareHierarchyData(data) {
    nodeIdCounter = 0;
    _resourceIdCounts = {};
    _contentDescCounts = {};
    _textCounts = {};
    
    processNode(data, '', 0, 1);
    buildXMLDoc(data);
    const treeHtml = buildTreeHtml(data);
    elTree.innerHTML = treeHtml;
    bindTreeEvents();
    renderBoundingBoxes(data);
}

async function loadData() {
    elLoading.style.display = 'flex';
    elOverlay.innerHTML = '';
    elTree.innerHTML = '';
    selectNode(null);

    try {
        // Reset loading text
        elLoading.innerHTML = '<div class="loader-pulse"></div><div class="loading-text">Đang lấy cấu trúc giao diện...</div>';
        
        // Load Image and Hierarchy concurrently for faster performance
        const imgUrl = `${BASE_URL}/api/android/${currentSerial}/screenshot/0?t=${Date.now()}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const [_, response, screenResponse] = await Promise.all([
            loadImage(imgUrl),
            fetch(`${BASE_URL}/api/android/${currentSerial}/hierarchy?format=json`, {
                signal: controller.signal
            }),
            fetch(`${BASE_URL}/api/android/${currentSerial}/screen`).catch(() => null)
        ]);
        
        if (screenResponse && screenResponse.ok) {
            const screenStatus = await screenResponse.json();
            const statusEl = document.getElementById('device-status-text');
            if (screenStatus.is_on) {
                statusEl.textContent = 'Màn hình bật';
                statusEl.classList.remove('off');
            } else {
                statusEl.textContent = 'Màn hình tắt';
                statusEl.classList.add('off');
            }
        }
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('Lỗi lấy file JSON cấu trúc. Trạng thái: ' + response.status);
        hierarchyData = await response.json();

        // Ensure natural dimensions exist on image to calculate scale
        calculateScale();

        // Process Tree & Render
        prepareHierarchyData(hierarchyData);
        
        // Hide loading on success
        elLoading.style.display = 'none';

    } catch (err) {
        console.error(err);
        elLoading.innerHTML = `
            <div style="color: #ff5252; text-align: center; max-width: 80%; padding: 20px; background: rgba(0,0,0,0.8); border-radius: 8px;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 24px; margin-bottom: 10px;"></i>
                <div style="margin-bottom: 15px;">Lỗi: ${err.message}</div>
                <button onclick="loadData()" style="padding: 8px 16px; background: #1d8cf8; color: white; border: none; border-radius: 4px; cursor: pointer;">Thử lại</button>
            </div>
        `;
    }
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            elImage.src = src;
            resolve();
        };
        img.onerror = () => reject(new Error('Failed to load image from ' + src));
        img.src = src;
    });
}

function calculateScale() {
    const naturalW = elImage.naturalWidth;
    const naturalH = elImage.naturalHeight;
    const renderW = elImage.width;
    const renderH = elImage.height;
    
    // Some devices scale down the screenshot, so natural bounds don't match logical bounds.
    // However, the root node might not cover the full screen (e.g. missing nav bar),
    // which breaks the aspect ratio if we use both its width and height independently.
    // Therefore, we determine the scale using the dimension that is most likely to be full screen,
    // and apply uniform scaling based on the screenshot's aspect ratio.
    const rootRect = getRect(hierarchyData);
    let logicalW = naturalW;
    let logicalH = naturalH;
    
    if (rootRect && rootRect.width > 0 && rootRect.height > 0) {
        if (naturalW <= naturalH) {
            // Portrait: width is usually full screen
            logicalW = rootRect.width;
            logicalH = logicalW * (naturalH / naturalW);
        } else {
            // Landscape: height is usually full screen
            logicalH = rootRect.height;
            logicalW = logicalH * (naturalW / naturalH);
        }
    }
    
    if (logicalW > 0 && logicalH > 0) {
        imageScaleX = renderW / logicalW;
        imageScaleY = renderH / logicalH;
    }
}

function getRect(node) {
    if (node.rect) {
        return { x: node.rect.x, y: node.rect.y, width: node.rect.width, height: node.rect.height };
    }
    if (node.bounds && node.bounds.length === 4) {
        return { x: node.bounds[0], y: node.bounds[1], width: node.bounds[2] - node.bounds[0], height: node.bounds[3] - node.bounds[1] };
    }
    if (node.properties && node.properties.bounds) {
        // "[0,0][1080,1920]"
        const match = node.properties.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
        if (match) {
            const x1 = parseInt(match[1]);
            const y1 = parseInt(match[2]);
            const x2 = parseInt(match[3]);
            const y2 = parseInt(match[4]);
            return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
        }
    }
    return null;
}

function renderBoundingBoxes(rootNode) {
    elOverlay.innerHTML = '';
    
    function drawNode(node) {
        const rect = getRect(node);
        if (rect && rect.width > 0 && rect.height > 0) {
            const box = document.createElement('div');
            box.className = 'bounding-box';
            box.id = 'box-' + node._id;
            
            // Adjust to rendered image offset and scale
            const imgRect = elImage.getBoundingClientRect();
            const wrapperRect = elOverlay.parentElement.getBoundingClientRect();
            const offsetX = imgRect.left - wrapperRect.left;
            const offsetY = imgRect.top - wrapperRect.top;

            box.style.left = (offsetX + (rect.x * imageScaleX)) + 'px';
            box.style.top = (offsetY + (rect.y * imageScaleY)) + 'px';
            box.style.width = (rect.width * imageScaleX) + 'px';
            box.style.height = (rect.height * imageScaleY) + 'px';
            
            // Calculate area to determine z-index (Inverse Area trick)
            // Smaller boxes get higher z-index so they are always clickable when inside larger boxes.
            // This prevents parents or invisible full-screen overlays from intercepting clicks
            // on smaller UI elements like buttons or tabs.
            const area = rect.width * rect.height;
            box.style.zIndex = Math.floor(100000000 - area);

            box.addEventListener('mouseenter', () => hoverNode(node._id, true));
            box.addEventListener('mouseleave', () => hoverNode(node._id, false));
            box.addEventListener('click', (e) => {
                e.stopPropagation();
                selectNode(node);
            });
            box.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.showContextMenu) window.showContextMenu(e, node);
            });

            elOverlay.appendChild(box);
        }
        
        if (node.children) {
            node.children.forEach(drawNode);
        }
    }
    
    drawNode(rootNode);
}

function buildTreeHtml(node) {
    let html = '';
    const hasChildren = node.children && node.children.length > 0;
    const props = node.properties || {};
    const nodeClass = node.name || node.key || props.class || 'Node';
    const resourceId = props['resource-id'] ? `id=${props['resource-id']}` : '';
    const textStr = props.text ? `text=${props.text}` : (props['content-desc'] ? `desc=${props['content-desc']}` : '');
    
    html += `<li>`;
    html += `<div class="tree-node" id="tree-${node._id}" data-id="${node._id}">`;
    
    if (hasChildren) {
        html += `<span class="tree-toggle"><i class="fa-solid fa-caret-right"></i></span>`;
        html += `<span class="tree-icon"><i class="fa-regular fa-folder"></i></span>`;
    } else {
        html += `<span class="tree-toggle" style="visibility:hidden"><i class="fa-solid fa-caret-right"></i></span>`;
        html += `<span class="tree-icon"><i class="fa-regular fa-file"></i></span>`;
    }
    
    html += `<span class="node-class">${node._index} ${nodeClass}</span>`;
    if (resourceId) html += `<span class="node-id">${resourceId}</span>`;
    if (textStr) html += `<span class="node-attr">${textStr}</span>`;
    html += `</div>`;
    
    if (hasChildren) {
        html += `<ul>`;
        node.children.forEach(child => {
            html += buildTreeHtml(child);
        });
        html += `</ul>`;
    }
    
    html += `</li>`;
    return html;
}

function bindTreeEvents() {
    // Toggles
    document.querySelectorAll('.tree-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const nodeDiv = toggle.parentElement;
            const ul = nodeDiv.nextElementSibling;
            if (ul && ul.tagName === 'UL') {
                ul.classList.toggle('expanded');
                const icon = toggle.querySelector('i');
                const folderIcon = nodeDiv.querySelector('.tree-icon i');
                
                if (ul.classList.contains('expanded')) {
                    icon.classList.remove('fa-caret-right');
                    icon.classList.add('fa-caret-down');
                    if (folderIcon) {
                        folderIcon.classList.remove('fa-folder');
                        folderIcon.classList.add('fa-folder-open');
                    }
                } else {
                    icon.classList.remove('fa-caret-down');
                    icon.classList.add('fa-caret-right');
                    if (folderIcon) {
                        folderIcon.classList.remove('fa-folder-open');
                        folderIcon.classList.add('fa-folder');
                    }
                }
            }
        });
    });

    // Node interactions
    document.querySelectorAll('.tree-node').forEach(el => {
        el.addEventListener('mouseenter', () => hoverNode(el.dataset.id, true));
        el.addEventListener('mouseleave', () => hoverNode(el.dataset.id, false));
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const node = findNodeById(hierarchyData, el.dataset.id);
            if (node) {
                selectNode(node);
            }
        });
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const node = findNodeById(hierarchyData, el.dataset.id);
            if (node && window.showContextMenu) window.showContextMenu(e, node);
        });
    });
}

function findNodeById(root, id) {
    if (root._id === id) return root;
    if (root.children) {
        for (let child of root.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }
    }
    return null;
}

function hoverNode(id, isHover) {
    document.querySelectorAll('.bounding-box').forEach(b => b.classList.remove('hovered'));
    document.querySelectorAll('.tree-node').forEach(n => n.classList.remove('hovered'));
    
    if (isHover && id) {
        const box = document.getElementById('box-' + id);
        if (box) box.classList.add('hovered');
        
        const treeEl = document.getElementById('tree-' + id);
        if (treeEl) treeEl.classList.add('hovered');
        
        if (hierarchyData) {
            const node = findNodeById(hierarchyData, id);
            if (node) showTooltip(node, id);
        }
    } else {
        hideTooltip();
    }
}

function showTooltip(node, id) {
    const tooltip = document.getElementById('node-tooltip');
    if (!tooltip) return;
    
    const props = node.properties || {};
    const nodeClass = props.class || node.name || node.key || 'Node';
    const rect = getRect(node);
    const boundsStr = rect ? `${rect.width}×${rect.height}` : '';
    
    document.getElementById('tt-class').textContent = nodeClass;
    document.getElementById('tt-bounds').textContent = boundsStr;
    
    const tbody = document.getElementById('tt-body');
    tbody.innerHTML = '';
    
    const toShow = [
        { k: 'index', v: node._index },
        { k: 'text', v: props.text },
        { k: 'resource-id', v: props['resource-id'] },
        { k: 'content-desc', v: props['content-desc'] },
        { k: 'enabled', v: props.enabled }
    ];
    
    toShow.forEach(p => {
        if (p.v !== undefined && p.v !== null && p.v !== '') {
            const row = document.createElement('div');
            row.className = 'tt-row';
            row.innerHTML = `<span class="tt-key">${p.k}</span><span class="tt-val">${p.v}</span>`;
            tbody.appendChild(row);
        }
    });
    
    tooltip.style.display = 'block';
    positionTooltip(id);
}

function positionTooltip(id) {
    const tooltip = document.getElementById('node-tooltip');
    const box = document.getElementById('box-' + id);
    if (!tooltip || !box || tooltip.style.display === 'none') return;
    
    const boxRect = box.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // The arrow is positioned at left: 20px, with width 12px -> center is at 26px.
    // To make the arrow tip exactly touch the top-left corner of the box:
    let left = boxRect.left - 26;
    
    // The arrow protrudes by 6px (bottom: -6px).
    // To make the arrow tip exactly touch the top edge of the box:
    let top = boxRect.top - tooltipRect.height - 6;
    
    if (top < 0) {
        // Position below the box if not enough space above
        top = boxRect.bottom + 6;
        tooltip.classList.add('arrow-top');
    } else {
        tooltip.classList.remove('arrow-top');
    }
    
    // Prevent tooltip from going off-screen horizontally
    if (left < 5) left = 5;
    if (left + tooltipRect.width > window.innerWidth - 5) {
        left = window.innerWidth - tooltipRect.width - 5;
    }
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

function hideTooltip() {
    const tooltip = document.getElementById('node-tooltip');
    if (tooltip) tooltip.style.display = 'none';
}

function selectNode(node) {
    const contextMenu = document.getElementById('context-menu');
    if (contextMenu) contextMenu.style.display = 'none';
    
    document.querySelectorAll('.bounding-box').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.tree-node').forEach(n => n.classList.remove('selected'));
    selectedNodeId = node ? node._id : null;

    if (!node) {
        elNoNode.style.display = 'block';
        elPropTable.style.display = 'none';
        elXpathValue.value = '';
        return;
    }

    // Highlight
    const box = document.getElementById('box-' + node._id);
    if (box) box.classList.add('selected');
    const treeEl = document.getElementById('tree-' + node._id);
    if (treeEl) {
        treeEl.classList.add('selected');
        
        // expand parent
        let parentUl = treeEl.parentElement.parentElement;
        while(parentUl && parentUl.tagName === 'UL') {
            if (parentUl.id === 'hierarchy-tree') break;
            
            parentUl.classList.add('expanded');
            let parentLi = parentUl.parentElement;
            if (parentLi && parentLi.tagName === 'LI') {
                const toggleBtn = parentLi.querySelector(':scope > .tree-node .tree-toggle i');
                if (toggleBtn) {
                    toggleBtn.classList.remove('fa-caret-right');
                    toggleBtn.classList.add('fa-caret-down');
                }
                const folderIcon = parentLi.querySelector(':scope > .tree-node .tree-icon i');
                if (folderIcon && folderIcon.classList.contains('fa-folder')) {
                    folderIcon.classList.remove('fa-folder');
                    folderIcon.classList.add('fa-folder-open');
                }
                parentUl = parentLi.parentElement;
            } else {
                break;
            }
        }
        
        // Wait a frame for expansion to render, then scroll
        requestAnimationFrame(() => {
            treeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    // Show properties
    elNoNode.style.display = 'none';
    elPropTable.style.display = 'table';
    elPropBody.innerHTML = '';
    
    const props = node.properties || {};
    const toShow = [
        { k: 'activity', v: props.activity || '' },
        { k: 'index', v: node._index },
        { k: 'text', v: props.text || '' },
        { k: 'resource-id', v: props['resource-id'] || '' },
        { k: 'class', v: props.class || node.name || node.key },
        { k: 'package', v: props.package || '' },
        { k: 'content-desc', v: props['content-desc'] || '' },
        { k: 'checkable', v: props.checkable },
        { k: 'checked', v: props.checked },
        { k: 'clickable', v: props.clickable },
        { k: 'enabled', v: props.enabled },
        { k: 'focusable', v: props.focusable },
        { k: 'focused', v: props.focused },
        { k: 'scrollable', v: props.scrollable },
        { k: 'long-clickable', v: props['long-clickable'] },
        { k: 'password', v: props.password },
        { k: 'selected', v: props.selected },
        { k: 'visible-to-user', v: props['visible-to-user'] },
        { k: 'bounds', v: props.bounds || JSON.stringify(getRect(node)) }
    ];

    toShow.forEach(p => {
        const tr = document.createElement('tr');
        
        const tdKey = document.createElement('td');
        tdKey.textContent = p.k;
        
        const tdVal = document.createElement('td');
        const strVal = p.v !== undefined ? String(p.v) : '';
        tdVal.textContent = strVal;
        if (strVal) {
            tdVal.style.cursor = 'pointer';
            tdVal.title = 'Click to copy';
            tdVal.addEventListener('click', () => {
                copyToClipboard(strVal, `Copied ${p.k}`);
            });
        }
        
        tr.appendChild(tdKey);
        tr.appendChild(tdVal);
        elPropBody.appendChild(tr);
    });

    updateXPath(node);
}

function getMatchingNodes(propName, propValue, nodeClass) {
    if (!hierarchyData) return [];
    let matches = [];
    function traverse(n) {
        if (!n) return;
        const props = n.properties || {};
        const nClass = props.class || n.name || n.key || '*';
        
        let matchClass = (nodeClass === '*' || nClass === nodeClass);
        let matchProp = false;
        
        if (propName === 'class') {
            matchProp = true;
        } else if (propName === 'absolute') {
            matchProp = false; // absolute is unique
        } else {
            matchProp = (props[propName] === propValue);
        }
        
        if (matchClass && matchProp) matches.push(n);
        if (n.children) n.children.forEach(traverse);
    }
    traverse(hierarchyData);
    return matches;
}

function getClassSiblingIndex(node) {
    if (!node || !node._parent) return 1;
    let index = 1;
    const myClass = node.properties?.class || node.name || node.key || 'node';
    for (const child of node._parent.children) {
        if (child === node) break;
        const childClass = child.properties?.class || child.name || child.key || 'node';
        if (childClass === myClass) {
            index++;
        }
    }
    return index;
}

function buildOptimizedRelativeXPath(node) {
    if (!node) return "";
    const nodeClass = node.properties?.class || node.name || node.key || 'node';
    if (nodeClass === 'hierarchy') return "/hierarchy";

    let current = node;
    let uniqueAncestor = null;
    let baseXpath = null;

    while (current && current.name !== 'hierarchy' && current.key !== 'hierarchy' && current._parent) {
        const props = current.properties || {};
        
        const resId = props['resource-id'];
        if (resId && !resId.includes('(name removed)')) {
            if (_resourceIdCounts[resId] === 1) {
                uniqueAncestor = current;
                baseXpath = `//*[@resource-id="${resId}"]`;
                break;
            }
        }
        
        const desc = props['content-desc'];
        if (desc) {
            if (_contentDescCounts[desc] === 1) {
                uniqueAncestor = current;
                baseXpath = `//*[@content-desc="${desc}"]`;
                break;
            }
        }
        
        const textVal = props['text'];
        if (textVal) {
            if (_textCounts[textVal] === 1) {
                uniqueAncestor = current;
                baseXpath = `//*[@text="${textVal}"]`;
                break;
            }
        }
        
        current = current._parent;
    }

    if (uniqueAncestor && baseXpath) {
        const pathNodes = [];
        let temp = node;
        while (temp && temp !== uniqueAncestor) {
            pathNodes.unshift(temp);
            temp = temp._parent;
        }
        
        let relativePath = baseXpath;
        for (const pathNode of pathNodes) {
            const index = getClassSiblingIndex(pathNode);
            const nClass = pathNode.properties?.class || pathNode.name || pathNode.key || 'node';
            relativePath += `/${nClass}[${index}]`;
        }
        return relativePath;
    }

    return node._xpath;
}

function getCSharpXPath(node) {
    if (!node) return '';
    let rawPath = buildOptimizedRelativeXPath(node);
    let parts = rawPath.split('/').filter(Boolean);
    
    // If it is a long path without any unique attribute anchor, truncate it to last 3 nodes
    if (!rawPath.includes('*[@') && parts.length > 3) {
        parts = parts.slice(-3);
    }
    
    let csharpParts = parts.map(part => {
        if (!part) return '';
        if (part.startsWith('*')) return part;
        let bIdx = part.indexOf('[');
        let cls = bIdx === -1 ? part : part.substring(0, bIdx);
        let idx = bIdx === -1 ? '' : part.substring(bIdx);
        if (cls === 'hierarchy') return '';
        return `node[@class='${cls}']${idx}`;
    }).filter(Boolean);
    
    let res = csharpParts.join('/');
    if (!res.startsWith('//') && res.startsWith('/')) {
        res = '/' + res;
    } else if (!res.startsWith('/')) {
        res = '//' + res;
    }
    return res;
}

function evaluateXPath(query) {
    if (!window.xmlDoc) return [];
    try {
        const result = window.xmlDoc.evaluate(query, window.xmlDoc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        const matches = [];
        for (let i = 0; i < result.snapshotLength; i++) {
            const xmlNode = result.snapshotItem(i);
            const id = xmlNode.getAttribute('_id');
            if (id) {
                const jsNode = findNodeById(hierarchyData, id);
                if (jsNode) matches.push(jsNode);
            }
        }
        return matches;
    } catch (e) {
        return [];
    }
}

window.currentXPathStrategy = 'auto';

function updateXPath(node) {
    const props = node.properties || {};
    const nodeClass = props.class || node.name || node.key || '*';
    const options = [];
    
    // 1. auto
    let autoXPath = '';
    let autoMatches = [];
    
    let resIdMatches = props['resource-id'] && !props['resource-id'].includes('(name removed)') ? getMatchingNodes('resource-id', props['resource-id'], nodeClass) : [];
    let descMatches = props['content-desc'] ? getMatchingNodes('content-desc', props['content-desc'], nodeClass) : [];
    let textMatches = props.text ? getMatchingNodes('text', props.text, nodeClass) : [];

    if (resIdMatches.length === 1) {
        autoXPath = `//${nodeClass}[@resource-id="${props['resource-id']}"]`;
        autoMatches = resIdMatches;
    } else if (descMatches.length === 1) {
        autoXPath = `//${nodeClass}[@content-desc="${props['content-desc']}"]`;
        autoMatches = descMatches;
    } else if (textMatches.length === 1) {
        autoXPath = `//${nodeClass}[@text="${props.text}"]`;
        autoMatches = textMatches;
    } else {
        // Fallback to relative if possible
        const relPath = buildOptimizedRelativeXPath(node);
        const relMatches = relPath ? evaluateXPath(relPath) : [];
        if (relMatches.length === 1) {
            autoXPath = relPath;
            autoMatches = relMatches;
        } else {
            // Absolute path
            autoXPath = node._xpath;
            autoMatches = [node];
        }
    }
    options.push({ strategy: 'auto', label: 'auto', xpath: autoXPath, matches: autoMatches });
    
    // 2. id
    if (props['resource-id']) {
        options.push({
            strategy: 'resource-id', label: 'id',
            xpath: `//${nodeClass}[@resource-id="${props['resource-id']}"]`,
            matches: getMatchingNodes('resource-id', props['resource-id'], nodeClass)
        });
        options.push({
            strategy: 'resource-id-*', label: 'id (*)',
            xpath: `//*[@resource-id="${props['resource-id']}"]`,
            matches: getMatchingNodes('resource-id', props['resource-id'], '*')
        });
    }
    
    // 3. desc
    if (props['content-desc']) {
        options.push({
            strategy: 'content-desc', label: 'desc',
            xpath: `//${nodeClass}[@content-desc="${props['content-desc']}"]`,
            matches: getMatchingNodes('content-desc', props['content-desc'], nodeClass)
        });
        options.push({
            strategy: 'content-desc-*', label: 'desc (*)',
            xpath: `//*[@content-desc="${props['content-desc']}"]`,
            matches: getMatchingNodes('content-desc', props['content-desc'], '*')
        });
    }
    
    // 4. text
    if (props.text) {
        options.push({
            strategy: 'text', label: 'text',
            xpath: `//${nodeClass}[@text="${props.text}"]`,
            matches: getMatchingNodes('text', props.text, nodeClass)
        });
        options.push({
            strategy: 'text-*', label: 'text (*)',
            xpath: `//*[@text="${props.text}"]`,
            matches: getMatchingNodes('text', props.text, '*')
        });
    }
    
    // 5. class
    options.push({
        strategy: 'class', label: 'class',
        xpath: `//${nodeClass}`,
        matches: getMatchingNodes('class', nodeClass, nodeClass)
    });
    
    // 6. relative
    const relativeXPath = buildOptimizedRelativeXPath(node);
    if (relativeXPath && relativeXPath !== node._xpath) {
        options.push({
            strategy: 'relative', label: 'relative',
            xpath: relativeXPath,
            matches: evaluateXPath(relativeXPath)
        });
    }

    // 7. absolute
    options.push({
        strategy: 'absolute', label: 'absolute',
        xpath: node._xpath,
        matches: [node]
    });

    // 8. C# XPath (optimized)
    let csharpXPath = getCSharpXPath(node);

    options.push({
        strategy: 'csharp', label: 'C# XPath',
        xpath: csharpXPath,
        matches: [node]
    });

    const dropdown = document.getElementById('xpath-strategy-dropdown');
    dropdown.innerHTML = '';
    
    const availableStrategies = options.map(o => o.strategy);
    if (!availableStrategies.includes(window.currentXPathStrategy)) {
        window.currentXPathStrategy = 'auto';
    }
    
    const labelSpan = document.getElementById('xpath-strategy-label');
    labelSpan.textContent = window.currentXPathStrategy === 'resource-id' ? 'id' : (window.currentXPathStrategy === 'content-desc' ? 'desc' : window.currentXPathStrategy);
    
    let selectedOption = options.find(o => o.strategy === window.currentXPathStrategy);
    if (!selectedOption) selectedOption = options[0];

    options.forEach(opt => {
        const div = document.createElement('div');
        div.className = `xpath-option ${opt.strategy === window.currentXPathStrategy ? 'active' : ''}`;
        div.innerHTML = `
            <div class="xpath-option-label">${opt.label}</div>
            <div class="xpath-option-value" title='${opt.xpath}'>${opt.xpath.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
            <div class="xpath-option-badge">${opt.matches.length}</div>
        `;
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            window.currentXPathStrategy = opt.strategy;
            dropdown.style.display = 'none';
            updateXPath(node);
        });
        dropdown.appendChild(div);
    });
    
    let finalXPath = selectedOption.xpath;
    let selectedIndex = 1;
    if (selectedOption.matches.length > 1) {
        selectedIndex = selectedOption.matches.findIndex(n => n._id === node._id) + 1;
        if (selectedIndex < 1) selectedIndex = 1;
        finalXPath = `(${finalXPath})[${selectedIndex}]`;
    }
    
    elXpathValue.value = finalXPath;
    
    // Tạo hiệu ứng flash và tự động focus bôi đen để copy
    elXpathValue.classList.remove('flash-highlight');
    void elXpathValue.offsetWidth; // force reflow để reset animation
    elXpathValue.classList.add('flash-highlight');
    elXpathValue.select();

    // Render match grid
    let grid = document.getElementById('xpath-match-grid');
    if (!grid) {
        grid = document.createElement('div');
        grid.id = 'xpath-match-grid';
        grid.className = 'xpath-match-grid';
        document.getElementById('xpath-container').appendChild(grid);
    }
    
    if (selectedOption.matches.length > 1) {
        grid.style.display = 'flex';
        grid.innerHTML = '';
        selectedOption.matches.forEach((matchNode, i) => {
            const btn = document.createElement('div');
            btn.className = `match-btn ${i + 1 === selectedIndex ? 'active' : ''}`;
            btn.textContent = i + 1;
            btn.addEventListener('click', () => {
                selectNode(matchNode);
            });
            grid.appendChild(btn);
        });
    } else {
        grid.style.display = 'none';
        grid.innerHTML = '';
    }
}

function copyXPath() {
    const text = elXpathValue.value;
    if (text) {
        copyToClipboard(text, 'Copied XPath');
    }
}

function showToast(message) {
    const toast = document.getElementById('toast-message');
    if (!toast) return;
    toast.innerHTML = `<i class="fa-solid fa-check-circle" style="margin-right:8px;"></i> ${message}`;
    toast.classList.add('show');
    
    // Clear any existing timeout
    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    
    toast.timeoutId = setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

function copyToClipboard(text, successMessage) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        showToast(successMessage || 'Copied to clipboard');
    }).catch(err => {
        console.error('Copy failed', err);
        showToast('Failed to copy');
    });
}

function initResizers() {
    // Main resizer (between left canvas and right panel)
    const resizerMain = document.getElementById('resizer-main');
    const panelLeft = document.getElementById('panel-left');
    if (resizerMain && panelLeft) {
        let isResizing = false;
        resizerMain.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
            e.preventDefault(); // Prevent text selection
        });
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            // Limit min and max width
            let newWidth = e.clientX;
            if (newWidth < 300) newWidth = 300;
            if (newWidth > window.innerWidth - 400) newWidth = window.innerWidth - 400;
            panelLeft.style.width = newWidth + 'px';
            panelLeft.style.flex = 'none'; // Ensure width takes precedence
        });
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = 'default';
            }
        });
    }

    // Data resizer (between properties and hierarchy tree)
    const resizerData = document.getElementById('resizer-data');
    const paneProps = document.getElementById('pane-properties');
    if (resizerData && paneProps) {
        let isResizingProps = false;
        resizerData.addEventListener('mousedown', (e) => {
            isResizingProps = true;
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isResizingProps) return;
            // The resizer is inside the right panel, so its position is relative to panelLeft
            const panelLeftWidth = panelLeft ? panelLeft.offsetWidth : 0;
            // We also need to account for the resizer-main width (6px)
            const rightPanelStartX = panelLeftWidth + 6;
            
            let newWidth = e.clientX - rightPanelStartX;
            if (newWidth < 250) newWidth = 250;
            
            // Limit max width (pane-tree needs min 250)
            const maxPropsWidth = window.innerWidth - rightPanelStartX - 250 - 6; // 6 is resizer-data width
            if (newWidth > maxPropsWidth) newWidth = maxPropsWidth;
            
            paneProps.style.width = newWidth + 'px';
        });
        document.addEventListener('mouseup', () => {
            if (isResizingProps) {
                isResizingProps = false;
                document.body.style.cursor = 'default';
            }
        });
    }
}

// Initialize resizers on script load
document.addEventListener('DOMContentLoaded', () => {
    initResizers();
    initTheme();
});

function initTheme() {
    const btnToggleTheme = document.getElementById('btn-toggle-theme');
    const themeIcon = document.getElementById('theme-icon');
    
    // Check saved theme
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
            
            // Optional: redraw canvas if colors depend on theme
            if (window.drawBoundingBoxes) {
                drawBoundingBoxes(window.hierarchyData);
            }
        });
    }
}
