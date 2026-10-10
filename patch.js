let isControlMode = false;
let minitouchWs = null;
let currentRotation = 0; // assuming portrait for now

function coords(boundingW, boundingH, relX, relY, rotation) {
    var w, h, x, y;
    switch (rotation) {
    case 0:
        w = boundingW; h = boundingH; x = relX; y = relY;
        break;
    case 90:
        w = boundingH; h = boundingW; x = boundingH - relY; y = relX;
        break;
    case 180:
        w = boundingW; h = boundingH; x = boundingW - relX; y = boundingH - relY;
        break;
    case 270:
        w = boundingH; h = boundingW; x = relY; y = boundingW - relX;
        break;
    default:
        w = boundingW; h = boundingH; x = relX; y = relY;
    }
    return { xP: x / w, yP: y / h };
}

function initMinitouch() {
    if (!currentPort) return;
    if (minitouchWs) return;
    
    minitouchWs = new WebSocket('ws://127.0.0.1:' + currentPort + '/minitouch');
    minitouchWs.onopen = () => {
        console.log('minitouch connected');
        minitouchWs.send(JSON.stringify({ operation: 'r' }));
    };
    minitouchWs.onclose = () => {
        console.log('minitouch closed');
        minitouchWs = null;
    };
}

function setupTouchpad() {
    const element = elImage;
    
    let touchSync = (operation, event) => {
        if (!isControlMode || !minitouchWs || minitouchWs.readyState !== WebSocket.OPEN) return;
        event.preventDefault();
        
        let x = event.offsetX, y = event.offsetY;
        let w = event.target.clientWidth, h = event.target.clientHeight;
        let scaled = coords(w, h, x, y, currentRotation);
        
        minitouchWs.send(JSON.stringify({
            operation: operation, // 'u', 'd', 'm'
            index: 0,
            pressure: 0.5,
            xP: scaled.xP,
            yP: scaled.yP,
        }));
        minitouchWs.send(JSON.stringify({ operation: 'c' }));
    };

    function mouseMoveListener(event) { touchSync('m', event); }
    function mouseUpListener(event) {
        touchSync('u', event);
        element.removeEventListener('mousemove', mouseMoveListener);
        document.removeEventListener('mouseup', mouseUpListener);
    }
    function mouseDownListener(event) {
        if (!isControlMode) return;
        touchSync('d', event);
        element.addEventListener('mousemove', mouseMoveListener);
        document.addEventListener('mouseup', mouseUpListener);
    }
    
    element.addEventListener('mousedown', mouseDownListener);
}

// Add inside DOMContentLoaded
/*
    const btnToggleControl = document.getElementById('btn-toggle-control');
    if (btnToggleControl) {
        btnToggleControl.addEventListener('click', () => {
            isControlMode = !isControlMode;
            if (isControlMode) {
                btnToggleControl.style.color = '#00bf9a';
                elOverlay.style.pointerEvents = 'none';
                initMinitouch();
            } else {
                btnToggleControl.style.color = '';
                elOverlay.style.pointerEvents = 'auto';
            }
        });
        setupTouchpad();
    }
*/