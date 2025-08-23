// Global variables
let boats = [];
let autoRefresh = true;
let refreshInterval;
let alertsToday = 0;
let systemStatus = 'ONLINE';

// ESP8266 Configuration - Replace with actual ESP8266 IP
const ESP8266_CONFIG = {
    baseUrl: 'http://192.168.1.100', // Replace with your ESP8266 IP
    endpoints: {
        boats: '/api/boats',
        system: '/api/system',
        emergency: '/api/emergency'
    },
    timeout: 5000
};

// Sample data structure for boats (for simulation)
const sampleBoats = [
    {
        id: 'KL07B2023',
        name: 'Boat 1',
        status: 'online',
        coordinates: { lat: 8.5241, lng: 76.9366 },
        lastSeen: new Date(),
        batteryLevel: 85,
        signalStrength: -65,
        captain: 'Ravi Kumar',
        fishingLicense: 'FL2023001'
    },
    {
        id: 'KL07B2024',
        name: 'Boat 2',
        status: 'online',
        coordinates: { lat: 8.4875, lng: 76.9485 },
        lastSeen: new Date(),
        batteryLevel: 92,
        signalStrength: -58,
        captain: 'Suresh Nair',
        fishingLicense: 'FL2023002'
    },
    {
        id: 'KL07B2025',
        name: 'Boat 3',
        status: 'alert',
        coordinates: { lat: 8.5120, lng: 76.9234 },
        lastSeen: new Date(),
        batteryLevel: 67,
        signalStrength: -72,
        captain: 'Murugan Pillai',
        fishingLicense: 'FL2023003',
        emergency: {
            type: 'SOS',
            time: new Date(),
            message: 'Emergency signal received'
        }
    }
];

// Sample stations data
const stations = [
    { name: '🏛️ Thiruvananthapuram Port', distance: '12.3 km', contact: '+91-471-2345678' },
    { name: '⛵ Vizhinjam Harbor', distance: '18.7 km', contact: '+91-471-2456789' },
    { name: '🚢 Kollam Port', distance: '45.2 km', contact: '+91-474-2567890' }
];

// Initialize the application
function init() {
    boats = [...sampleBoats];
    updateDisplay();
    startAutoRefresh();
    updateTimestamp();
    
    // Simulate some alerts for demo
    alertsToday = 1;
    
    console.log('Kadal Kannu Marine Safety Control System Initialized');
}

// Update timestamp display
function updateTimestamp() {
    const now = new Date();
    document.getElementById('timestamp').textContent = now.toLocaleString();
}

// Start auto-refresh functionality
function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    if (autoRefresh) {
        refreshInterval = setInterval(() => {
            fetchBoatData();
            updateTimestamp();
        }, 5000); // Refresh every 5 seconds
    }
}

// Toggle auto-refresh
function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
    const button = event.target;
    
    if (autoRefresh) {
        button.textContent = '📡 Auto Refresh';
        button.style.background = 'linear-gradient(45deg, #4CAF50, #8BC34A)';
        startAutoRefresh();
        showNotification('Auto-refresh enabled', 'success');
    } else {
        button.textContent = '⏸️ Paused';
        button.style.background = 'linear-gradient(45deg, #FF9800, #FFC107)';
        clearInterval(refreshInterval);
        showNotification('Auto-refresh paused', 'warning');
    }
}

// Manual refresh
function refreshData() {
    showNotification('Refreshing data...', 'info');
    fetchBoatData();
    updateTimestamp();
}

// Emergency alert function
function emergencyAlert() {
    const confirmed = confirm('🚨 EMERGENCY ALERT\n\nThis will notify Coast Guard and emergency services.\n\nProceed with emergency alert?');
    
    if (confirmed) {
        // Send emergency alert to ESP8266 and authorities
        sendEmergencyAlert();
        showNotification('🚨 Emergency alert sent to Coast Guard!', 'emergency');
        
        // Update UI to show emergency status
        document.getElementById('emergencyStatus').style.display = 'block';
        document.getElementById('emergencyStatus').innerHTML = `
            <strong>🚨 EMERGENCY PROTOCOL ACTIVATED</strong><br>
            <small style="color: #bbe1fa;">Coast Guard & Emergency Services Notified<br>
            Time: ${new Date().toLocaleTimeString()}</small>
        `;
    }
}

// Fetch boat data from ESP8266
async function fetchBoatData() {
    try {
        // Uncomment and modify when connecting to actual ESP8266
        /*
        const response = await fetch(`${ESP8266_CONFIG.baseUrl}${ESP8266_CONFIG.endpoints.boats}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: ESP8266_CONFIG.timeout
        });
        
        if (response.ok) {
            const data = await response.json();
            boats = data.boats || [];
            updateConnectionStatus('online');
        } else {
            throw new Error('ESP8266 connection failed');
        }
        */
        
        // For demo purposes, simulate data updates
        simulateDataUpdates();
        updateConnectionStatus('online');
        
    } catch (error) {
        console.error('ESP8266 connection error:', error);
        updateConnectionStatus('offline');
        // Use cached/sample data in case of connection failure
        boats = [...sampleBoats];
    }
    
    updateDisplay();
}

// Simulate real-time data updates (for demo)
function simulateDataUpdates() {
    boats.forEach(boat => {
        if (boat.status === 'online') {
            // Simulate small GPS coordinate changes
            boat.coordinates.lat += (Math.random() - 0.5) * 0.001;
            boat.coordinates.lng += (Math.random() - 0.5) * 0.001;
            
            // Simulate battery level changes
            boat.batteryLevel += (Math.random() - 0.5) * 2;
            boat.batteryLevel = Math.max(20, Math.min(100, boat.batteryLevel));
            
            // Simulate signal strength changes
            boat.signalStrength += (Math.random() - 0.5) * 5;
            boat.signalStrength = Math.max(-90, Math.min(-40, boat.signalStrength));
            
            boat.lastSeen = new Date();
        }
    });
    
    // Randomly simulate network stats changes
    const networkSignal = -67 + (Math.random() - 0.5) * 10;
    const dataRate = 2.4 + (Math.random() - 0.5) * 0.8;
    
    document.getElementById('networkSignal').textContent = `${networkSignal.toFixed(0)} dBm`;
    document.getElementById('dataRate').textContent = `${dataRate.toFixed(1)} kb/s`;
}

// Update connection status
function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connectionStatus');
    const esp8266StatusElement = document.getElementById('esp8266Status');
    
    if (status === 'online') {
        statusElement.innerHTML = '🟢 Online';
        esp8266StatusElement.innerHTML = '🟢 Connected';
    } else {
        statusElement.innerHTML = '🔴 Offline';
        esp8266StatusElement.innerHTML = '🔴 Disconnected';
    }
}

// Update all display elements
function updateDisplay() {
    updateBoatList();
    updateSystemStats();
    updateRegistrationList();
    updatePositionsList();
    updateStationList();
}

// Update boat list display
function updateBoatList() {
    const boatListElement = document.getElementById('boatList');
    const deviceCountElement = document.getElementById('deviceCount');
    
    deviceCountElement.textContent = boats.length;
    
    boatListElement.innerHTML = boats.map(boat => {
        const statusClass = boat.status === 'alert' ? 'alert' : 
                           boat.status === 'warning' ? 'warning' : 
                           boat.status === 'offline' ? 'offline' : '';
        
        const statusIcon = boat.status === 'online' ? 'status-online' :
                          boat.status === 'alert' ? 'status-alert' :
                          boat.status === 'warning' ? 'status-warning' : 'status-offline';
        
        const statusText = boat.status === 'online' ? 'Online - Normal' :
                          boat.status === 'alert' ? '🚨 SOS ALERT' :
                          boat.status === 'warning' ? '⚠️ Warning' : 'Offline';
        
        return `
            <div class="boat-item ${statusClass}" onclick="toggleBoatDetails('${boat.id}')">
                <div class="boat-header">
                    <span class="boat-id">🚤 ${boat.name} - ${boat.id}</span>
                    <span class="status-indicator ${statusIcon}"></span>
                </div>
                <div class="boat-status">${statusText}</div>
                <div class="coordinates">📍 ${boat.coordinates.lat.toFixed(4)}° N, ${boat.coordinates.lng.toFixed(4)}° E</div>
                ${boat.emergency ? `
                    <div class="sos-alert">
                        ⚠️ ${boat.emergency.message.toUpperCase()} ⚠️<br>
                        <small>Time: ${boat.emergency.time.toLocaleTimeString()} IST</small>
                    </div>
                ` : ''}
                <div class="boat-details" id="details-${boat.id}">
                    <strong>Details:</strong><br>
                    Captain: ${boat.captain}<br>
                    License: ${boat.fishingLicense}<br>
                    Battery: ${Math.round(boat.batteryLevel)}%<br>
                    Signal: ${boat.signalStrength} dBm<br>
                    Last Seen: ${boat.lastSeen.toLocaleTimeString()}
                </div>
            </div>
        `;
    }).join('');
}

// Toggle boat details display
function toggleBoatDetails(boatId) {
    const detailsElement = document.getElementById(`details-${boatId}`);
    if (detailsElement) {
        detailsElement.classList.toggle('show');
    }
}

// Update system statistics
function updateSystemStats() {
    const activeBoats = boats.filter(boat => boat.status === 'online' || boat.status === 'warning').length;
    
    document.getElementById('activeBoats').textContent = activeBoats;
    document.getElementById('alertsToday').textContent = alertsToday;
    document.getElementById('systemStatus').textContent = systemStatus;
    document.getElementById('coverageRadius').textContent = '25 km';
}

// Update registration list
function updateRegistrationList() {
    const registrationListElement = document.getElementById('registrationList');
    
    registrationListElement.innerHTML = boats.map(boat => {
        const statusEmoji = boat.status === 'online' ? '📋' :
                           boat.status === 'alert' ? '🚨' :
                           boat.status === 'warning' ? '⚠️' : '💤';
        
        const statusText = boat.status === 'online' ? 'Active' :
                          boat.status === 'alert' ? 'Alert Status' :
                          boat.status === 'warning' ? 'Warning' : 'Offline';
        
        return `${statusEmoji} ${boat.id} - ${statusText}`;
    }).join('<br>');
}

// Update positions list
function updatePositionsList() {
    const positionsListElement = document.getElementById('positionsList');
    
    positionsListElement.innerHTML = boats.map(boat => {
        const prefix = boat.status === 'alert' ? '🚨' : 
                      boat.status === 'warning' ? '⚠️' : '';
        
        return `${prefix}${boat.name}: ${boat.coordinates.lat.toFixed(4)}°N, ${boat.coordinates.lng.toFixed(4)}°E`;
    }).join('<br>');
}

// Update station list
function updateStationList() {
    const stationListElement = document.getElementById('stationList');
    
    stationListElement.innerHTML = stations.map(station => `
        <div class="station-item" onclick="contactStation('${station.name}')">
            <span class="station-name">${station.name}</span>
            <span class="station-distance">${station.distance}</span>
        </div>
    `).join('');
}

// Contact station function
function contactStation(stationName) {
    const station = stations.find(s => s.name === stationName);
    if (station && station.contact) {
        const confirmed = confirm(`Contact ${stationName}?\n\nPhone: ${station.contact}\n\nThis will open your phone app.`);
        if (confirmed) {
            window.open(`tel:${station.contact.replace(/[^0-9+]/g, '')}`);
        }
    }
}

// Show system details
function showSystemDetails(type) {
    let message = '';
    
    switch(type) {
        case 'active':
            message = `Active Boats: ${boats.filter(b => b.status === 'online' || b.status === 'warning').length}\n\nOnline: ${boats.filter(b => b.status === 'online').length}\nWarning: ${boats.filter(b => b.status === 'warning').length}\nAlert: ${boats.filter(b => b.status === 'alert').length}`;
            break;
        case 'alerts':
            message = `Alerts Today: ${alertsToday}\n\nEmergency Calls: 1\nSystem Warnings: 0\nMaintenance Alerts: 0`;
            break;
        case 'system':
            message = `System Status: ${systemStatus}\n\nUptime: 72 hours\nMemory Usage: 45%\nCPU Load: 12%\nNetwork: Stable`;
            break;
        case 'coverage':
            message = `Coverage Radius: 25 km\n\nSignal Strength: Strong\nCoverage Area: 1,963 km²\nActive Zones: 12`;
            break;
    }
    
    alert(message);
}

// Open system map
function openSystemMap() {
    showNotification('Opening system coverage map...', 'info');
    // Here you could integrate with actual mapping service
    console.log('Opening system map with boat positions');
}

// Open live map
function openLiveMap() {
    showNotification('Opening live GPS tracking...', 'info');
    // Here you could integrate with real-time mapping
    console.log('Opening live tracking map');
}

// Send emergency alert to ESP8266 and authorities
async function sendEmergencyAlert() {
    try {
        // Uncomment when connecting to actual ESP8266
        /*
        const response = await fetch(`${ESP8266_CONFIG.baseUrl}${ESP8266_CONFIG.endpoints.emergency}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'EMERGENCY',
                timestamp: new Date().toISOString(),
                location: 'Kadal Kannu Control Station',
                boats: boats.filter(b => b.status === 'alert')
            })
        });
        */
        
        // Simulate emergency protocol
        console.log('Emergency alert sent to authorities');
        alertsToday++;
        
    } catch (error) {
        console.error('Failed to send emergency alert:', error);
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        notification.classList.add('hide-notification');
        setTimeout(() => notification.remove(), 500);
    });
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = 'notification';
    
    // Set background color based on type
    switch(type) {
        case 'success':
            notification.style.background = 'linear-gradient(45deg, #4CAF50, #8BC34A)';
            break;
        case 'warning':
            notification.style.background = 'linear-gradient(45deg, #FF9800, #FFC107)';
            break;
        case 'emergency':
            notification.style.background = 'linear-gradient(45deg, #FF5722, #FF1744)';
            break;
        case 'info':
        default:
            notification.style.background = 'linear-gradient(45deg, #2196F3, #03DAC6)';
            break;
    }
    
    notification.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 0.5rem;">${type.toUpperCase()}</div>
        <div>${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove notification after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('hide-notification');
            setTimeout(() => notification.remove(), 500);
        }
    }, 3000);
}

// ESP8266 Integration Functions
const ESP8266Integration = {
    // Test connection to ESP8266
    testConnection: async function() {
        try {
            const response = await fetch(`${ESP8266_CONFIG.baseUrl}/status`, {
                method: 'GET',
                timeout: ESP8266_CONFIG.timeout
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    },
    
    // Send command to ESP8266
    sendCommand: async function(command, data = {}) {
        try {
            const response = await fetch(`${ESP8266_CONFIG.baseUrl}/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ command, data }),
                timeout: ESP8266_CONFIG.timeout
            });
            
            return await response.json();
        } catch (error) {
            console.error('ESP8266 command failed:', error);
            return null;
        }
    },
    
    // Get system status from ESP8266
    getSystemStatus: async function() {
        try {
            const response = await fetch(`${ESP8266_CONFIG.baseUrl}${ESP8266_CONFIG.endpoints.system}`);
            return await response.json();
        } catch (error) {
            console.error('Failed to get system status:', error);
            return null;
        }
    }
};

// WebSocket connection for real-time updates (optional)
let websocket = null;

function initWebSocket() {
    // Uncomment when ESP8266 supports WebSocket
    /*
    websocket = new WebSocket(`ws://${ESP8266_CONFIG.baseUrl.replace('http://', '')}/ws`);
    
    websocket.onopen = function(event) {
        console.log('WebSocket connected to ESP8266');
        showNotification('Real-time connection established', 'success');
    };
    
    websocket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        handleRealTimeUpdate(data);
    };
    
    websocket.onclose = function(event) {
        console.log('WebSocket disconnected');
        showNotification('Real-time connection lost', 'warning');
        
        // Attempt to reconnect after 5 seconds
        setTimeout(initWebSocket, 5000);
    };
    
    websocket.onerror = function(error) {
        console.error('WebSocket error:', error);
    };
    */
}

// Handle real-time updates from WebSocket
function handleRealTimeUpdate(data) {
    switch(data.type) {
        case 'BOAT_UPDATE':
            updateBoatData(data.boat);
            break;
        case 'EMERGENCY_ALERT':
            handleEmergencyUpdate(data);
            break;
        case 'SYSTEM_STATUS':
            updateSystemStatus(data.status);
            break;
    }
    
    updateDisplay();
}

// Update individual boat data
function updateBoatData(updatedBoat) {
    const index = boats.findIndex(boat => boat.id === updatedBoat.id);
    if (index !== -1) {
        boats[index] = { ...boats[index], ...updatedBoat };
    } else {
        boats.push(updatedBoat);
    }
}

// Handle emergency updates
function handleEmergencyUpdate(emergencyData) {
    alertsToday++;
    showNotification(`🚨 Emergency Alert: ${emergencyData.message}`, 'emergency');
    
    // Update boat status if emergency is from a specific boat
    if (emergencyData.boatId) {
        const boat = boats.find(b => b.id === emergencyData.boatId);
        if (boat) {
            boat.status = 'alert';
            boat.emergency = emergencyData;
        }
    }
}

// Update system status
function updateSystemStatus(status) {
    systemStatus = status.toUpperCase();
    document.getElementById('systemStatus').textContent = systemStatus;
    
    if (status === 'OFFLINE') {
        document.getElementById('systemStatus').style.color = '#FF5722';
    } else if (status === 'WARNING') {
        document.getElementById('systemStatus').style.color = '#FF9800';
    } else {
        document.getElementById('systemStatus').style.color = '#4CAF50';
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey || event.metaKey) {
        switch(event.key) {
            case 'r':
                event.preventDefault();
                refreshData();
                break;
            case 'e':
                event.preventDefault();
                emergencyAlert();
                break;
            case 's':
                event.preventDefault();
                toggleAutoRefresh();
                break;
        }
    }
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    init();
    
    // Initialize WebSocket connection (uncomment when ready)
    // initWebSocket();
    
    // Set up periodic timestamp updates
    setInterval(updateTimestamp, 1000);
    
    console.log('Kadal Kannu Marine Safety Control System Ready');
    showNotification('System initialized successfully', 'success');
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    if (websocket) {
        websocket.close();
    }
});