// Global variables
let boats = [];
let autoRefresh = true;
let refreshInterval;
let alertsToday = 0;
let systemStatus = 'ONLINE';
let connectedESP8266s = [];
let emergencyAlerts = [];

// ESP8266 Configuration - Update these IPs with your actual ESP8266 devices
const ESP8266_BOATS = [
    {
        id: 'KL07B2023',
        ip: '192.168.186.149', // Replace with actual ESP8266 IP
        name: 'Boat 1',
        port: 80
    },
    {
        id: 'KL07B2024',
        ip: '192.168.1.102', // Replace with actual ESP8266 IP
        name: 'Boat 2',
        port: 80
    },
    {
        id: 'KL07B2025',
        ip: '192.168.1.103', // Replace with actual ESP8266 IP
        name: 'Boat 3',
        port: 80
    }
];

const CONTROL_STATION_CONFIG = {
    port: 80,
    endpoints: {
        boatData: '/api/boat-data',
        emergency: '/api/emergency',
        heartbeat: '/api/heartbeat'
    }
};

// Sample stations data
const stations = [
    { name: '🏛️ Thiruvananthapuram Port', distance: '12.3 km', contact: '+91-471-2345678' },
    { name: '⛵ Vizhinjam Harbor', distance: '18.7 km', contact: '+91-471-2456789' },
    { name: '🚢 Kollam Port', distance: '45.2 km', contact: '+91-474-2567890' }
];

// Initialize the application
function init() {
    console.log('Initializing Kadal Kannu Marine Safety Control System...');
    
    // Initialize boats array
    boats = [];
    
    // Start ESP8266 discovery and connection
    initializeESP8266Connections();
    
    // Set up control station server endpoints
    setupControlStationEndpoints();
    
    // Start real-time data fetching
    startRealTimeDataFetching();
    
    // Initialize display
    updateDisplay();
    updateTimestamp();
    
    console.log('System initialized successfully');
    showNotification('Kadal Kannu system initialized - Scanning for boats...', 'info');
}

// Initialize connections to ESP8266 devices
async function initializeESP8266Connections() {
    console.log('Discovering ESP8266 boat devices...');
    
    for (const espConfig of ESP8266_BOATS) {
        try {
            const isOnline = await testESP8266Connection(espConfig);
            if (isOnline) {
                connectedESP8266s.push(espConfig);
                console.log(`✅ Connected to ${espConfig.name} (${espConfig.ip})`);
                
                // Fetch initial data
                await fetchBoatDataFromESP8266(espConfig);
            } else {
                console.log(`❌ Failed to connect to ${espConfig.name} (${espConfig.ip})`);
            }
        } catch (error) {
            console.error(`Error connecting to ${espConfig.name}:`, error);
        }
    }
    
    showNotification(`Found ${connectedESP8266s.length} boat(s) online`, 'success');
    updateDisplay();
}

// Test connection to individual ESP8266
async function testESP8266Connection(espConfig) {
    try {
        const response = await fetch(`http://${espConfig.ip}:${espConfig.port}/api/status`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Fetch data from specific ESP8266
async function fetchBoatDataFromESP8266(espConfig) {
    try {
        const response = await fetch(`http://${espConfig.ip}:${espConfig.port}/api/status`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
            const data = await response.json();
            updateBoatData(data);
            return data;
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error(`Failed to fetch data from ${espConfig.name}:`, error);
        
        // Mark boat as offline if connection fails
        markBoatOffline(espConfig.id);
        return null;
    }
}

// Update boat data from ESP8266
function updateBoatData(espData) {
    const existingBoatIndex = boats.findIndex(boat => boat.id === espData.boatId);
    
    const boatData = {
        id: espData.boatId,
        name: espData.name || `Boat ${espData.boatId.slice(-4)}`,
        status: espData.sosActive ? 'alert' : (espData.gpsValid ? 'online' : 'warning'),
        coordinates: {
            lat: espData.latitude || 0,
            lng: espData.longitude || 0
        },
        lastSeen: new Date(),
        batteryLevel: espData.batteryLevel || 0,
        signalStrength: espData.signalStrength || -90,
        captain: espData.captainName || 'Unknown',
        fishingLicense: espData.fishingLicense || 'Unknown',
        gpsValid: espData.gpsValid || false,
        lastGPSTime: espData.lastGPSTime || '',
        uptime: espData.uptime || 0
    };
    
    // Handle emergency alerts
    if (espData.sosActive && espData.sosTimestamp) {
        boatData.emergency = {
            type: 'SOS',
            time: new Date(espData.sosTimestamp),
            message: 'Emergency signal from boat'
        };
        
        // Trigger emergency alert if it's new
        handleNewEmergencyAlert(boatData);
    }
    
    if (existingBoatIndex >= 0) {
        boats[existingBoatIndex] = boatData;
    } else {
        boats.push(boatData);
    }
    
    console.log(`Updated data for ${boatData.name}: ${boatData.status}`);
}

// Handle new emergency alerts
function handleNewEmergencyAlert(boatData) {
    const alertId = `${boatData.id}-${boatData.emergency.time.getTime()}`;
    
    if (!emergencyAlerts.includes(alertId)) {
        emergencyAlerts.push(alertId);
        alertsToday++;
        
        // Show emergency notification
        showNotification(
            `🚨 EMERGENCY ALERT from ${boatData.name}!\nLocation: ${boatData.coordinates.lat.toFixed(4)}°N, ${boatData.coordinates.lng.toFixed(4)}°E`,
            'emergency'
        );
        
        // Sound browser alert (if supported)
        if (typeof Audio !== 'undefined') {
            try {
                // Create emergency alert sound
                playEmergencySound();
            } catch (error) {
                console.warn('Could not play emergency sound:', error);
            }
        }
        
        // Auto-trigger emergency protocol
        activateEmergencyProtocol(boatData);
        
        console.log(`🚨 New emergency alert from ${boatData.name}`);
    }
}

// Play emergency alert sound
function playEmergencySound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create emergency siren sound
    for (let i = 0; i < 3; i++) {
        setTimeout